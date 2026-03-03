import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import "../admin.css";

type User = { id: number; full_name: string; email: string; role: string };

type Role = "supervisor" | "student";

function RoleIcon({ role }: { role: Role }) {
  if (role === "supervisor") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12.5l1.8 1.8L15.8 9.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l10 5-10 5L2 8l10-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M22 8v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function initialsOf(name: string) {
  const n = (name || "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map(p => (p[0] || "").toUpperCase()).join("") || "?";
}

export default function AssignPage() {
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [assigned, setAssigned] = useState<User[]>([]);

  const [selectedSup, setSelectedSup] = useState<User | null>(null);

  const [supQ, setSupQ] = useState("");
  const [stuQ, setStuQ] = useState("");

  const [selectedStuIds, setSelectedStuIds] = useState<Set<number>>(new Set());

  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function loadBase() {
    setErr("");
    try {
      const [sups, studs] = await Promise.all([
        apiFetch("/admin/assign/supervisors"),
        apiFetch("/admin/assign/students"),
      ]);
      setSupervisors(sups || []);
      setStudents(studs || []);
      // ❗ no default supervisor
      setSelectedSup(null);
      setAssigned([]);
      setSelectedStuIds(new Set());
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    }
  }

  async function loadAssigned(supervisorId: number) {
    setErr("");
    setOk("");
    setLoadingAssigned(true);
    try {
      const res = await apiFetch(`/admin/assign/list?supervisor_id=${supervisorId}`);
      setAssigned(res || []);
    } catch (e: any) {
      setErr(e.message || "Failed to load assigned students");
      setAssigned([]);
    } finally {
      setLoadingAssigned(false);
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (selectedSup) {
      loadAssigned(selectedSup.id);
      setSelectedStuIds(new Set());
    }
  }, [selectedSup?.id]);

  const assignedIds = useMemo(() => new Set(assigned.map(a => a.id)), [assigned]);

  // Search works for supervisors AND students
  const visibleSupervisors = useMemo(() => {
    const q = supQ.trim().toLowerCase();
    return supervisors.filter(s => {
      if (!q) return true;
      return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [supervisors, supQ]);

  const visibleStudents = useMemo(() => {
    const q = stuQ.trim().toLowerCase();
    return students
      .filter(s => !assignedIds.has(s.id))
      .filter(s => {
        if (!q) return true;
        return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      });
  }, [students, assignedIds, stuQ]);

  function toggleStudent(id: number) {
    setSelectedStuIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedStuIds(prev => {
      const next = new Set(prev);
      visibleStudents.forEach(s => next.add(s.id));
      return next;
    });
  }

  function clearSelected() {
    setSelectedStuIds(new Set());
  }

  async function addSelected() {
    if (!selectedSup) {
      setErr("Select a supervisor first.");
      return;
    }
    if (selectedStuIds.size === 0) return;

    setSaving(true);
    setErr("");
    setOk("");

    const supId = selectedSup.id;
    const ids = Array.from(selectedStuIds);

    try {
      // bulk assign by calling the existing single-assign endpoint in parallel
      await Promise.all(
        ids.map(studentId =>
          apiFetch("/admin/assign", {
            method: "POST",
            body: JSON.stringify({ supervisor_id: supId, student_id: studentId }),
          })
        )
      );

      await loadAssigned(supId);
      setSelectedStuIds(new Set());
      setOk(`Assigned ${ids.length} student(s).`);
    } catch (e: any) {
      setErr(e.message || "Failed to assign selected students");
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(studentId: number) {
    if (!selectedSup) return;
    setErr("");
    setOk("");
    try {
      await apiFetch("/admin/assign/remove", {
        method: "POST",
        body: JSON.stringify({ supervisor_id: selectedSup.id, student_id: studentId }),
      });
      await loadAssigned(selectedSup.id);
    } catch (e: any) {
      setErr(e.message || "Failed to unassign");
    }
  }

  const addDisabled = !selectedSup || selectedStuIds.size === 0 || saving;

  return (
    <AdminLayout
      active="assign"
      title="Assign students"
      subtitle="Select a supervisor, then assign multiple students at once."
      right={
        <button className="admPrimaryBtn" disabled={addDisabled} onClick={addSelected}>
          {saving ? "Adding..." : `Add Selected (${selectedStuIds.size})`}
        </button>
      }
    >
      <div className="assignPage">
        {err && <div className="admAlert admAlertBad" style={{ marginBottom: 12 }}>{err}</div>}
        {ok && <div className="admAlert admAlertGood" style={{ marginBottom: 12 }}>{ok}</div>}

        <div className="assignGrid3">
          {/* ===================== Column 1: Supervisors ===================== */}
          <section className="assignCard">
            <div className="assignHead">
              <div>
                <div className="assignTitle">Supervisors</div>
                <div className="assignSub">{supervisors.length} total</div>
              </div>
            </div>

            <input
              className="assignInput"
              placeholder="Search supervisors by name/email..."
              value={supQ}
              onChange={(e) => setSupQ(e.target.value)}
            />

            {!selectedSup ? (
              <div className="assignHint">
                No supervisor selected. Pick one to view assignments.
              </div>
            ) : (
              <div className="assignSelectedPill">
                Selected: <b>{selectedSup.full_name}</b>
              </div>
            )}

            <div className="assignList">
              {visibleSupervisors.map((s) => {
                const active = selectedSup?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`userRow ${active ? "isActive" : ""}`}
                    onClick={() => setSelectedSup(s)}
                  >
                    <div className="userAvatar">{initialsOf(s.full_name)}</div>

                    <div className="userMain">
                      <div className="userName">{s.full_name}</div>
                      <div className="userMeta">
                        <span className="rolePill sup">
                          <RoleIcon role="supervisor" /> supervisor
                        </span>
                        <span className="userEmail">{s.email}</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {visibleSupervisors.length === 0 && (
                <div className="assignEmpty">No supervisors found.</div>
              )}
            </div>
          </section>

          {/* ===================== Column 2: Available Students ===================== */}
          <section className="assignCard">
            <div className="assignHead">
              <div>
                <div className="assignTitle">Available students</div>
                <div className="assignSub">Select students, then Add Selected.</div>
              </div>

              <div className="assignHeadRight">
                <button className="btnSmall" type="button" onClick={selectAllVisible} disabled={!selectedSup || visibleStudents.length === 0}>
                  Select all
                </button>
                <button className="btnSmall" type="button" onClick={clearSelected} disabled={selectedStuIds.size === 0}>
                  Clear
                </button>
              </div>
            </div>

            <input
              className="assignInput"
              placeholder="Search students by name/email..."
              value={stuQ}
              onChange={(e) => setStuQ(e.target.value)}
              disabled={!selectedSup}
            />

            {!selectedSup ? (
              <div className="assignHint">
                Select a supervisor first to enable student selection.
              </div>
            ) : (
              <div className="assignList">
                {visibleStudents.map((s) => {
                  const checked = selectedStuIds.has(s.id);
                  return (
                    <div key={s.id} className={`checkRow ${checked ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(s.id)}
                      />

                      <div className="userAvatar sm">{initialsOf(s.full_name)}</div>

                      <div className="userMain">
                        <div className="userName">{s.full_name}</div>
                        <div className="userMeta">
                          <span className="rolePill stu">
                            <RoleIcon role="student" /> student
                          </span>
                          <span className="userEmail">{s.email}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {visibleStudents.length === 0 && (
                  <div className="assignEmpty">No available students.</div>
                )}
              </div>
            )}
          </section>

          {/* ===================== Column 3: Assigned Students ===================== */}
          <section className="assignCard">
            <div className="assignHead">
              <div>
                <div className="assignTitle">Assigned</div>
                <div className="assignSub">
                  {selectedSup ? `Assigned to ${selectedSup.full_name}` : "Select supervisor to view assigned"}
                </div>
              </div>

              {selectedSup && (
                <span className="countPill">{assigned.length}</span>
              )}
            </div>

            {!selectedSup ? (
              <div className="assignHint">Pick a supervisor first.</div>
            ) : loadingAssigned ? (
              <div className="assignHint">Loading...</div>
            ) : (
              <div className="assignList">
                {assigned.map((s) => (
                  <div key={s.id} className="assignedRow">
                    <div className="rowLeft">
                      <div className="userAvatar sm">{initialsOf(s.full_name)}</div>
                      <div className="userMain">
                        <div className="userName">{s.full_name}</div>
                        <div className="userMeta">
                          <span className="rolePill stu">
                            <RoleIcon role="student" /> student
                          </span>
                          <span className="userEmail">{s.email}</span>
                        </div>
                      </div>
                    </div>

                    <button className="btnSmall btnDanger" type="button" onClick={() => removeStudent(s.id)}>
                      Remove
                    </button>
                  </div>
                ))}

                {assigned.length === 0 && (
                  <div className="assignEmpty">No students assigned yet.</div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}