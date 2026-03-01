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

export default function SupervisorsPage() {
  const nav = useNavigate();
  const [data, setData] = useState<SupervisorRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch("/admin/supervisors");
      setData(res);
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="Supervisors & Files"
      subtitle="Each supervisor automatically has a File. Next we’ll create Boards inside these files."
      showLogout
      right={
        <>
          <button className="btn" onClick={() => nav("/admin")}>
            Back
          </button>
          <button className="btn primary" onClick={load}>
            Refresh
          </button>
        </>
      }
    >
      <div className="glass" style={{ padding: 16 }}>
        {loading && <div style={{ color: "var(--muted)" }}>Loading...</div>}
        {err && <div className="noteBad" style={{ marginBottom: 10 }}>{err}</div>}

        <table className="table">
          <thead>
            <tr>
              <th>Supervisor</th>
              <th>Email</th>
              <th>File ID</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.supervisor_user_id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{s.full_name}</div>
                  <div style={{ color: "var(--muted2)", fontSize: 12 }}>
                    user_id: {s.supervisor_user_id}
                  </div>
                </td>
                <td style={{ color: "var(--muted)" }}>{s.email}</td>
                <td>
                  <span className="badge">#{s.file_id}</span>
                </td>
                <td style={{ color: "var(--muted)" }}>{s.created_at}</td>
              </tr>
            ))}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  No supervisors yet. Go back and create one from Admin Dashboard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}