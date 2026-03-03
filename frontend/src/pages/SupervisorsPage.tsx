import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import AdminLayout from "../components/AdminLayout";
import "../admin.css";

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
  email: string;
  file_id: number;
  created_at: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M21 21l-4.3-4.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16v12H4V6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SupervisorsPage() {
  const nav = useNavigate();

  const [data, setData] = useState<SupervisorRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter(
      (s) => s.full_name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
    );
  }, [data, q]);

  const subtitle = useMemo(() => {
    if (loading) return "Loading…";
    if (q.trim()) return `${filtered.length} result(s)`;
    return `${data.length} supervisor(s)`;
  }, [loading, filtered.length, data.length, q]);

  return (
    <AdminLayout
      active="supervisors"
      title="Supervisors"
      subtitle={subtitle}
      right={
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="admGhostBtn" onClick={() => nav("/admin")}>
            Back
          </button>
          {/* <button className="admPrimaryBtn" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button> */}
        </div>
      }
    >
      {/* Search */}
      <div className="admCard" style={{ marginBottom: 14 }}>
        <div className="admCardTitleRow" style={{ marginBottom: 0 }}>
          <div>
            <div className="admCardTitle">Directory</div>
            <div className="admMuted">Search by name or email, then open the workspace.</div>
          </div>

          <div className="admSearch" style={{ minWidth: 380 }}>
            <span className="admSearchIcon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              className="admSearchInput"
              placeholder="Search supervisors…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* List (more “dashboard-y” than plain table) */}
      <div className="admCard">
        {err && (
          <div className="admAlert admAlertBad" style={{ marginBottom: 12 }}>
            {err}
          </div>
        )}

        {loading ? (
          <div className="admMuted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="admMuted">No supervisors found.</div>
        ) : (
          <div className="admDirGrid">
            {filtered.map((s) => (
              <button
                key={s.supervisor_user_id}
                className="admDirRow"
                onClick={() => nav(`/admin/files/${s.file_id}`)}
                title="Open workspace"
              >
                <div className="admDirLeft">
                  <div className="admAvatar" aria-hidden="true">
                    {initials(s.full_name)}
                  </div>

                  <div className="admDirText">
                    <div className="admDirName">{s.full_name}</div>

                    <div className="admDirMeta">
                      <span className="admMetaPill">
                        <MailIcon /> {s.email}
                      </span>

                      <span className="admMetaPill">
                        <FolderIcon /> Workspace
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admDirRight" aria-hidden="true">
                  <span className="admOpenPill">Open</span>
                  <span className="admChevron">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Paste-friendly CSS (move to admin.css later) */}
      <style>{`
        /* Avatar (white theme) */
        .admAvatar{
          width: 40px; height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,0.14);
          background: rgba(15,23,42,0.05);
          display:grid;
          place-items:center;
          font-weight: 950;
          color: rgba(15,23,42,0.85);
          flex: 0 0 40px;
        }

        /* Directory grid */
        .admDirGrid{
          display: grid;
          gap: 10px;
        }

        .admDirRow{
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,0.10);
          background: #fff;
          box-shadow: 0 10px 26px rgba(15,23,42,0.06);
          padding: 12px;
          cursor: pointer;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          text-align: left;
          transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease, background .14s ease;
        }
        .admDirRow:hover{
          transform: translateY(-1px);
          border-color: rgba(59,130,246,0.18);
          box-shadow: 0 16px 32px rgba(59,130,246,0.10);
          background: rgba(59,130,246,0.02);
        }
        .admDirRow:active{
          transform: translateY(0px);
          box-shadow: 0 10px 24px rgba(15,23,42,0.06);
        }

        .admDirLeft{
          display:flex;
          align-items:center;
          gap: 12px;
          min-width: 0;
        }

        .admDirText{
          min-width: 0;
          display:grid;
          gap: 6px;
        }

        .admDirName{
          font-weight: 950;
          color: rgba(15,23,42,0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admDirMeta{
          display:flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .admMetaPill{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(15,23,42,0.03);
          color: rgba(15,23,42,0.70);
          font-size: 12px;
          font-weight: 700;
          max-width: 100%;
        }
        .admMetaPill svg{ flex: 0 0 auto; }
        .admMetaPill{
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admDirRight{
          display:flex;
          align-items:center;
          gap: 10px;
          flex: 0 0 auto;
        }

        .admOpenPill{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(59,130,246,0.18);
          background: rgba(59,130,246,0.06);
          color: rgba(37,99,235,0.92);
          font-weight: 900;
          font-size: 12px;
        }

        .admChevron{
          font-size: 22px;
          color: rgba(15,23,42,0.35);
          transition: transform .14s ease, color .14s ease;
        }
        .admDirRow:hover .admChevron{
          transform: translateX(2px);
          color: rgba(37,99,235,0.75);
        }

        /* Search icon compatibility */
        .admSearchIcon svg{ display:block; }
      `}</style>
    </AdminLayout>
  );
}