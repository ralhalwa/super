import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";

type Member = {
  user_id: number;
  full_name: string;
  nickname?: string;
  email: string;
  role: string; // admin/supervisor/student
  role_in_board: string;
  added_at: string;
};

type User = {
  id: number;
  full_name: string;
  nickname?: string;
  email: string;
  role: string;
};

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).slice(0, 2);
  const v = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return v || "U";
}
function displayNick(nickname?: string, email?: string) {
  const n = (nickname || "").trim();
  if (n) return n;

  const e = (email || "").trim();
  if (!e) return "";
  return e.split("@")[0]; // fallback: before @
}
function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CrownIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7l5 6 4-8 4 8 5-6v12H3V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RolePill({ role }: { role: string }) {
  const r = (role || "").toLowerCase();

  if (r === "admin") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-extrabold text-violet-700">
        <span className="grid place-items-center">
          <CrownIcon />
        </span>
        admin
      </span>
    );
  }

  if (r === "supervisor") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700">
        <span className="grid place-items-center">
          <UsersIcon />
        </span>
        supervisor
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
      <span className="grid place-items-center">
        <UsersIcon />
      </span>
      student
    </span>
  );
}

function BoardRolePill({ roleInBoard }: { roleInBoard: string }) {
  const r = (roleInBoard || "").toLowerCase();
  if (r === "owner") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-800">
        owner
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-700">
      {r || "member"}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-extrabold text-slate-900">
      {children}
    </span>
  );
}

function RowCard({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition hover:-translate-y-[1px] hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-[0_16px_32px_rgba(59,130,246,0.10)]">
      <div className="min-w-0">{left}</div>
      {right ? <div className="flex flex-none items-center gap-2">{right}</div> : null}
    </div>
  );
}

export default function BoardMembersPage() {
  const nav = useNavigate();
  const { boardId } = useParams();
  const boardID = Number(boardId);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "supervisor">("all");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  async function loadMembers() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/board-members?board_id=${boardID}`);
      setMembers(res);
    } catch (e: any) {
      setErr(e.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!boardID || Number.isNaN(boardID)) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardID]);

  async function searchUsers() {
    setMsg("");
    setErr("");
    setSearching(true);
    try {
      const url = `/admin/eligible-users?board_id=${boardID}&role=${encodeURIComponent(
        roleFilter
      )}&q=${encodeURIComponent(q)}`;
      const res = await apiFetch(url);
      setResults(res);
    } catch (e: any) {
      setErr(e.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function addMember(userId: number) {
    setMsg("");
    setErr("");
    try {
      await apiFetch("/admin/board-members", {
        method: "POST",
        body: JSON.stringify({
          board_id: boardID,
          user_id: userId,
          role_in_board: "member",
        }),
      });
      setMsg("Member added.");
      setResults([]);
      setQ("");
      await loadMembers();
    } catch (e: any) {
      setErr(e.message || "Failed to add member");
    }
  }

  const subtitle = useMemo(() => {
    if (loading) return "Loading…";
    return `Board #${boardID} • ${members.length} member(s)`;
  }, [loading, boardID, members.length]);

  return (
    <AdminLayout
      active="supervisors"
      title="Board Members"
      subtitle={subtitle}
      right={
        <div className="flex items-center gap-2">
          <button
            className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-900 transition hover:border-violet-200 hover:bg-violet-50"
            onClick={() => nav(-1)}
          >
            Back
          </button>
        </div>
      }
    >
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.95fr]">
        {/* Left */}
        <div className="grid gap-4">
          <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900">Add members</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">
                  Search by name or email, then add to this board.
                </div>
              </div>
              <Pill>Add</Pill>
            </div>

            <div className="h-3" />

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-[0_10px_25px_rgba(15,23,42,0.06)] min-w-[220px]">
                <span className="text-slate-500">
                  <SearchIcon />
                </span>
                <input
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Search ..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (q.trim() && !searching) searchUsers();
                    }
                  }}
                />
              </div>

              <button
                className="h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-400 px-4 text-sm font-black text-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-70"
                onClick={searchUsers}
                disabled={searching || q.trim().length < 2}
              >
                {searching ? "Searching..." : "Search"}
              </button>

              <button
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:bg-slate-50"
                type="button"
                onClick={() => {
                  setQ("");
                  setResults([]);
                  setErr("");
                  setMsg("");
                }}
                disabled={searching && !q.trim()}
              >
                Clear
              </button>

              <select
                className="h-11 w-[170px] rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-900 outline-none focus:ring-4 focus:ring-violet-200"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
              >
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="supervisor">Supervisors</option>
              </select>

              <div className="ml-auto whitespace-nowrap text-xs font-bold text-slate-500">
                Tip: type at least 2 characters
              </div>
            </div>

            {err ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {err}
              </div>
            ) : null}

            {msg ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                {msg}
              </div>
            ) : null}

            <div className="h-4" />

            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">Results</div>
              <Pill>{results.length}</Pill>
            </div>

            <div className="h-2.5" />

            {results.length === 0 ? (
              <div className="text-sm font-semibold text-slate-500">Search results will appear here.</div>
            ) : (
              <div className="grid gap-2.5">
                {results.map((u) => (
                  <RowCard
                    key={u.id}
                    left={
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-slate-200 bg-slate-50 font-black text-slate-800">
                          {initials(u.full_name)}
                        </div>

                        <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">{u.full_name}</div>

<div className="mt-0.5 truncate text-xs font-extrabold text-slate-500">
  {displayNick(u.nickname, u.email)}
</div>

<div className="mt-1 flex flex-wrap items-center gap-2">
  <span className="inline-flex min-w-0 items-center gap-2 truncate text-xs font-bold text-slate-500">
    <MailIcon /> <span className="truncate">{u.email}</span>
  </span>

  <RolePill role={u.role} />
</div>
                        </div>
                      </div>
                    }
                    right={
                      <>
                        <button
                          className="inline-flex h-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100"
                          onClick={() => addMember(u.id)}
                          title="Add to board"
                        >
                          Add
                        </button>
                        <span className="text-xl font-black text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-400">
                          ›
                        </span>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right */}
        <div className="grid gap-4">
          <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900">Current members</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">
                  People who can access this board.
                </div>
              </div>
              <Pill>{loading ? "…" : members.length}</Pill>
            </div>

            <div className="h-3" />

            {loading ? (
              <div className="text-sm font-semibold text-slate-500">Loading…</div>
            ) : members.length === 0 ? (
              <div className="text-sm font-semibold text-slate-500">No members yet.</div>
            ) : (
              <div className="grid gap-2.5">
                {members.map((m) => (
                  <RowCard
                    key={m.user_id}
                    left={
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-slate-200 bg-slate-50 font-black text-slate-800">
                          {initials(m.full_name)}
                        </div>

                        <div className="min-w-0">
                          {/* <div className="truncate text-sm font-black text-slate-900">{m.full_name}</div> */}

                          <div className="truncate text-sm font-black text-slate-900">{m.full_name}</div>

<div className="mt-0.5 truncate text-xs font-extrabold text-slate-500">
  {displayNick(m.nickname, m.email)}
</div>

<div className="mt-1 flex flex-wrap items-center gap-2">
  <span className="inline-flex min-w-0 items-center gap-2 truncate text-xs font-bold text-slate-500">
    <MailIcon /> <span className="truncate">{m.email}</span>
  </span>

  <RolePill role={m.role} />
  <BoardRolePill roleInBoard={m.role_in_board} />
</div>
                        </div>
                      </div>
                    }
                    right={
                      <span className="text-xl font-black text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-400">
                        ›
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </AdminLayout>
  );
}