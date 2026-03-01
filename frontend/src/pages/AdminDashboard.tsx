import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiFetch } from "../lib/api";

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
  email: string;
  file_id: number;
  created_at: string;
};

export default function AdminDashboard() {
  const nav = useNavigate();

  // Create user form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"supervisor" | "student">("supervisor");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Dashboard data (simple for now)
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  async function loadSupervisors() {
    setStatsLoading(true);
    try {
      const res = await apiFetch("/admin/supervisors");
      setSupervisors(res);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadSupervisors();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);

    try {
      const data = await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });

      setMsg(`${role === "supervisor" ? "Supervisor" : "Student"} created successfully.`);
      setFullName("");
      setEmail("");
      setPassword("");

      // refresh stats if supervisor created
      if (role === "supervisor") {
        await loadSupervisors();
      }
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  const totalSupervisors = supervisors.length;

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle="Manage users, supervisors, and workspaces."
      showLogout
      right={
        <button className="btn primary" onClick={() => nav("/admin/supervisors")}>
          Supervisors
        </button>
      }
    >
      <div className="grid2">
        {/* Left: Create user */}
        <div className="glass" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Create User</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                Add supervisors and students to your system.
              </div>
            </div>
            <span className="badge">Users</span>
          </div>

          <div style={{ height: 14 }} />

          <form onSubmit={createUser} style={{ display: "grid", gap: 12 }}>
            <input
              className="input"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              className="input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <select className="select" value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="supervisor">Supervisor</option>
                <option value="student">Student</option>
              </select>

              <input
                className="input"
                placeholder="Temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {err && <div className="noteBad" style={{ fontSize: 13 }}>{err}</div>}
            {msg && <div className="noteGood" style={{ fontSize: 13 }}>{msg}</div>}

            <button className="btn primary" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </form>
        </div>

        {/* Right: Stats + Quick actions */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* Stats */}
          <div className="glass" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Overview</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                  System snapshot
                </div>
              </div>
              <span className="badge">Live</span>
            </div>

            <div style={{ height: 14 }} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>Supervisors</div>
                <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>
                  {statsLoading ? "…" : totalSupervisors}
                </div>
              </div>

              <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>Workspaces</div>
                <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>
                  {statsLoading ? "…" : totalSupervisors}
                </div>
              </div>
            </div>

            <div style={{ height: 12 }} />

            <button className="btn" onClick={loadSupervisors} style={{ width: "100%" }}>
              Refresh Overview
            </button>
          </div>

          {/* Quick actions */}
          <div className="glass" style={{ padding: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Quick Actions</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
              Jump to common admin actions.
            </div>

            <div style={{ height: 14 }} />

            <div style={{ display: "grid", gap: 10 }}>
              <button className="btn" onClick={() => nav("/admin/supervisors")} style={{ width: "100%" }}>
                Manage Supervisors
              </button>

              {/* Coming soon buttons — disabled to look real */}
              <button className="btn" disabled style={{ width: "100%", opacity: 0.55 }}>
                Manage Boards (coming soon)
              </button>
              <button className="btn" disabled style={{ width: "100%", opacity: 0.55 }}>
                Reports & Analytics (coming soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}