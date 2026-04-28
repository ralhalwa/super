import { useEffect, useMemo, useState, type ReactNode } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";

type BoardRow = {
  id: number;
  name: string;
  description: string;
  supervisor_name: string;
  created_at: string;
  lists_count: number;
  cards_count: number;
};

type BoardFull = {
  board_id: number;
  name: string;
  lists: { id: number; title: string }[];
  cards: {
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date: string;
    list_id: number;
  }[];
};

type UserRow = {
  id: number;
  full_name: string;
  role: "student" | "supervisor";
  cohort?: string;
  assigned_boards?: string[];
};

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
};

type MeetingRow = {
  id: number;
  board_id: number;
  board_name: string;
  supervisor_id: number;
  supervisor_name: string;
  created_by: number;
  created_by_name: string;
  title: string;
  location: string;
  notes: string;
  status: "scheduled" | "completed" | "canceled";
  outcome_notes: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type OverdueCard = {
  boardID: number;
  boardName: string;
  supervisor: string;
  cardID: number;
  cardTitle: string;
  dueDate: string;
  daysOverdue: number;
  priority: string;
};

type SupervisorStats = {
  supervisor: string;
  boards: number;
  cards: number;
  done: number;
  overdue: number;
  completionPct: number;
};

type ComplianceRow = {
  supervisor: string;
  meetings: number;
  status: "on_track" | "missing";
};

const PROJECT_MODULES = [
  {
    module: "Go",
    projects: ["go-reloaded", "ascii-art", "ascii-art-web", "groupie-tracker", "lem-in", "forum"],
  },
  {
    module: "JavaScript",
    projects: ["make-your-game", "real-time-forum", "graphql", "social-network", "mini-framework", "bomberman-dom"],
  },
  {
    module: "Rust",
    projects: ["smart-road", "filler", "rt", "localhost", "multiplayer-fps", "0-shell"],
  },
];

const PROJECT_LOOKUP = PROJECT_MODULES.flatMap((group) =>
  group.projects.map((project) => ({ module: group.module, project }))
).sort((a, b) => b.project.length - a.project.length);

function normalizeCohort(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "No cohort";
  const match = raw.match(/(\d+)/);
  if (match) return `Cohort ${Number(match[1])}`;
  return raw;
}

function projectLabel(project: string) {
  return project
    .split("-")
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function inferProject(boardName: string) {
  const normalized = String(boardName || "").trim().toLowerCase();
  if (!normalized) return null;
  return PROJECT_LOOKUP.find(({ project }) => {
    const escaped = project.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|-)${escaped}($|-)`).test(normalized);
  }) || null;
}

function toDateOnly(v: string) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDate(v: string) {
  const d = toDateOnly(v);
  if (!d) return "No date";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function normalizePriority(v: string) {
  const p = String(v || "").trim().toLowerCase();
  if (p === "urgent" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

export default function AdminReportsPage() {
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [boardDetails, setBoardDetails] = useState<Record<number, BoardFull>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [meetingFilter, setMeetingFilter] = useState({
    boardId: "all",
    supervisor: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [projectFilter, setProjectFilter] = useState({
    cohort: "all",
    module: "all",
    project: "all",
  });

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [boardsRes, usersRes, supsRes, meetingsRes] = await Promise.all([
        apiFetch("/admin/all-boards"),
        apiFetch("/admin/users?role=all&q="),
        apiFetch("/admin/supervisors"),
        apiFetch("/admin/meetings"),
      ]);

      const boardRows: BoardRow[] = Array.isArray(boardsRes) ? boardsRes : [];
      setBoards(boardRows);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setSupervisors(Array.isArray(supsRes) ? supsRes : []);
      setMeetings(Array.isArray(meetingsRes) ? meetingsRes : []);

      const fullRes = await Promise.all(
        boardRows.map(async (b) => {
          const full = await apiFetch(`/admin/board?board_id=${b.id}`);
          return [b.id, full] as const;
        })
      );
      const nextDetails: Record<number, BoardFull> = {};
      for (const [id, full] of fullRes) nextDetails[id] = full;
      setBoardDetails(nextDetails);
    } catch (e: any) {
      setErr(e?.message || "Failed to load reports data");
      setBoards([]);
      setUsers([]);
      setSupervisors([]);
      setMeetings([]);
      setBoardDetails({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const analytics = useMemo(() => {
    const allCards = boards.flatMap((b) => boardDetails[b.id]?.cards || []);
    const allLists = boards.flatMap((b) => boardDetails[b.id]?.lists || []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let done = 0;
    let open = 0;
    const overdueCards: OverdueCard[] = [];
    const priority = { urgent: 0, high: 0, medium: 0, low: 0 };

    for (const board of boards) {
      const cards = boardDetails[board.id]?.cards || [];
      for (const c of cards) {
        const status = String(c.status || "").toLowerCase();
        if (status === "done") done += 1;
        else open += 1;
        priority[normalizePriority(c.priority)] += 1;

        const due = toDateOnly(c.due_date);
        if (due && status !== "done" && due < today) {
          overdueCards.push({
            boardID: board.id,
            boardName: board.name,
            supervisor: board.supervisor_name,
            cardID: c.id,
            cardTitle: c.title,
            dueDate: c.due_date,
            daysOverdue: Math.max(1, daysBetween(today, due)),
            priority: normalizePriority(c.priority),
          });
        }
      }
    }

    const supervisorStatsMap = new Map<string, SupervisorStats>();
    for (const board of boards) {
      const key = board.supervisor_name || "Unknown";
      if (!supervisorStatsMap.has(key)) {
        supervisorStatsMap.set(key, {
          supervisor: key,
          boards: 0,
          cards: 0,
          done: 0,
          overdue: 0,
          completionPct: 0,
        });
      }
      const row = supervisorStatsMap.get(key)!;
      row.boards += 1;
      const cards = boardDetails[board.id]?.cards || [];
      row.cards += cards.length;
      for (const c of cards) {
        const status = String(c.status || "").toLowerCase();
        if (status === "done") row.done += 1;
        const due = toDateOnly(c.due_date);
        if (due && status !== "done" && due < today) row.overdue += 1;
      }
    }

    const supervisorStats = [...supervisorStatsMap.values()]
      .map((s) => ({
        ...s,
        completionPct: s.cards > 0 ? Math.round((s.done / s.cards) * 100) : 0,
      }))
      .sort((a, b) => b.overdue - a.overdue || b.cards - a.cards);

    const students = users.filter((u) => u.role === "student").length;
    const supervisorsCount = users.filter((u) => u.role === "supervisor").length || supervisors.length;
    const cardsTotal = allCards.length;
    const listsTotal = allLists.length;
    const completionPct = cardsTotal > 0 ? Math.round((done / cardsTotal) * 100) : 0;

    const lowActivityBoards = boards
      .map((b) => {
        const cards = boardDetails[b.id]?.cards || [];
        const activeCards = cards.filter((c) => String(c.status || "").toLowerCase() !== "done").length;
        return {
          ...b,
          activeCards,
          cardsTotal: cards.length,
        };
      })
      .sort((a, b) => a.activeCards - b.activeCards || a.cardsTotal - b.cardsTotal)
      .slice(0, 5);

    overdueCards.sort((a, b) => b.daysOverdue - a.daysOverdue || (b.priority === "urgent" ? 1 : 0));

    return {
      boardsTotal: boards.length,
      listsTotal,
      cardsTotal,
      done,
      open,
      overdue: overdueCards.length,
      completionPct,
      students,
      supervisors: supervisorsCount,
      priority,
      overdueCards: overdueCards.slice(0, 8),
      supervisorStats: supervisorStats.slice(0, 8),
      lowActivityBoards,
    };
  }, [boards, boardDetails, users, supervisors.length]);

  const meetingSupervisorOptions = useMemo(
    () => [...new Set(boards.map((board) => board.supervisor_name).filter(Boolean))].sort(),
    [boards]
  );
  const meetingBoardOptions = useMemo(() => {
    if (meetingFilter.supervisor === "all") return [];
    return boards
      .filter((board) => board.supervisor_name === meetingFilter.supervisor)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [boards, meetingFilter.supervisor]);

  useEffect(() => {
    if (meetingFilter.supervisor === "all" && meetingFilter.boardId !== "all") {
      setMeetingFilter((prev) => ({ ...prev, boardId: "all" }));
      return;
    }
    if (
      meetingFilter.boardId !== "all" &&
      !meetingBoardOptions.some((board) => String(board.id) === meetingFilter.boardId)
    ) {
      setMeetingFilter((prev) => ({ ...prev, boardId: "all" }));
    }
  }, [meetingBoardOptions, meetingFilter.boardId, meetingFilter.supervisor]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      if (meetingFilter.boardId !== "all" && String(meeting.board_id) !== meetingFilter.boardId) return false;
      if (meetingFilter.supervisor !== "all" && meeting.supervisor_name !== meetingFilter.supervisor) return false;
      const start = new Date(meeting.starts_at);
      if (meetingFilter.dateFrom) {
        const from = new Date(`${meetingFilter.dateFrom}T00:00:00`);
        if (start < from) return false;
      }
      if (meetingFilter.dateTo) {
        const to = new Date(`${meetingFilter.dateTo}T23:59:59`);
        if (start > to) return false;
      }
      return true;
    });
  }, [meetings, meetingFilter]);

  const meetingAnalytics = useMemo(() => {
    const now = new Date();
    const todayKey = now.toDateString();
    const roomCounts = new Map<string, number>();

    let scheduled = 0;
    let completed = 0;
    let canceled = 0;
    let today = 0;
    let upcoming = 0;

    for (const meeting of filteredMeetings) {
      const startsAt = new Date(meeting.starts_at);
      if (meeting.status === "scheduled") scheduled += 1;
      if (meeting.status === "completed") completed += 1;
      if (meeting.status === "canceled") canceled += 1;
      if (startsAt.toDateString() === todayKey) today += 1;
      if (meeting.status === "scheduled" && startsAt >= now) upcoming += 1;
      const room = (meeting.location || "Unknown").trim();
      roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
    }

    const mostUsedRooms = [...roomCounts.entries()]
      .map(([room, count]) => ({ room, count }))
      .sort((a, b) => b.count - a.count || a.room.localeCompare(b.room))
      .slice(0, 5);

    const supervisorsInScope = [...new Set(
      boards
        .filter((board) => meetingFilter.boardId === "all" || String(board.id) === meetingFilter.boardId)
        .filter((board) => meetingFilter.supervisor === "all" || board.supervisor_name === meetingFilter.supervisor)
        .map((board) => board.supervisor_name)
        .filter(Boolean)
    )];

    const complianceSource = filteredMeetings.filter((meeting) => {
      if (meetingFilter.dateFrom || meetingFilter.dateTo) return true;
      const date = new Date(meeting.starts_at);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const meetingsPerSupervisor = new Map<string, number>();
    for (const meeting of complianceSource) {
      if (meeting.status === "canceled") continue;
      meetingsPerSupervisor.set(meeting.supervisor_name, (meetingsPerSupervisor.get(meeting.supervisor_name) || 0) + 1);
    }

    const compliance: ComplianceRow[] = supervisorsInScope
      .map((supervisor) => {
        const meetingsCount = meetingsPerSupervisor.get(supervisor) || 0;
        return {
          supervisor,
          meetings: meetingsCount,
          status: (meetingsCount > 0 ? "on_track" : "missing") as ComplianceRow["status"],
        };
      })
      .sort((a, b) => a.meetings - b.meetings || a.supervisor.localeCompare(b.supervisor));

    return {
      total: filteredMeetings.length,
      scheduled,
      completed,
      canceled,
      today,
      upcoming,
      mostUsedRooms,
      compliance,
      recent: filteredMeetings
        .slice()
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
        .slice(0, 6),
    };
  }, [filteredMeetings, boards, meetingFilter]);

  const projectAnalytics = useMemo(() => {
    const studentRows = users.filter((user) => String(user.role || "").toLowerCase() === "student");
    const counts = new Map<string, Map<string, { count: number; module: string; project: string }>>();
    const seenStudentProject = new Set<string>();

    for (const student of studentRows) {
      const cohort = normalizeCohort(student.cohort || "");
      for (const boardName of student.assigned_boards || []) {
        const inferred = inferProject(boardName);
        if (!inferred) continue;
        if (projectFilter.cohort !== "all" && cohort !== projectFilter.cohort) continue;
        if (projectFilter.module !== "all" && inferred.module !== projectFilter.module) continue;
        if (projectFilter.project !== "all" && inferred.project !== projectFilter.project) continue;

        const uniqueKey = `${student.id}:${cohort}:${inferred.project}`;
        if (seenStudentProject.has(uniqueKey)) continue;
        seenStudentProject.add(uniqueKey);

        if (!counts.has(cohort)) counts.set(cohort, new Map());
        const cohortMap = counts.get(cohort)!;
        const current = cohortMap.get(inferred.project) || { count: 0, module: inferred.module, project: inferred.project };
        current.count += 1;
        cohortMap.set(inferred.project, current);
      }
    }

    const rows = Array.from(counts.entries())
      .map(([cohort, projectMap]) => {
        const projects = Array.from(projectMap.values()).sort((a, b) => b.count - a.count || a.project.localeCompare(b.project));
        return {
          cohort,
          projects,
          total: projects.reduce((sum, item) => sum + item.count, 0),
        };
      })
      .sort((a, b) => {
        const aNum = Number(a.cohort.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
        const bNum = Number(b.cohort.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
        return aNum - bNum || a.cohort.localeCompare(b.cohort);
      });

    const cohortOptions = Array.from(new Set(studentRows.map((student) => normalizeCohort(student.cohort || "")))).sort((a, b) => {
      const aNum = Number(a.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
      const bNum = Number(b.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
      return aNum - bNum || a.localeCompare(b);
    });
    const moduleOptions = PROJECT_MODULES.map((group) => group.module);
    const projectOptions = PROJECT_MODULES
      .filter((group) => projectFilter.module === "all" || group.module === projectFilter.module)
      .flatMap((group) => group.projects.map((project) => ({ module: group.module, project })));
    const maxCount = Math.max(1, ...rows.flatMap((row) => row.projects.map((project) => project.count)));
    const activeProjects = rows.reduce((sum, row) => sum + row.projects.length, 0);

    return {
      rows,
      cohortOptions,
      moduleOptions,
      projectOptions,
      maxCount,
      activeProjects,
      trackedTalents: seenStudentProject.size,
    };
  }, [projectFilter, users]);

  return (
    <AdminLayout
      active="reports"
      title="Reports"
      subtitle="Workspace analytics, meeting compliance, and operational clarity."
      right={
        <button
          type="button"
          onClick={load}
          className="h-10 rounded-[14px] border border-slate-200 bg-slate-50 px-3 font-extrabold text-slate-900 transition hover:border-[#6d5efc]/25 hover:bg-[#f2f5ff]"
        >
          Refresh
        </button>
      }
    >
      {err ? (
        <div className="mb-3 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[18px] border border-slate-200 bg-white p-4 text-[14px] font-semibold text-slate-500">
          Building reports...
        </div>
      ) : (
        <div className="reports-page grid gap-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <ReportKpi label="Completion" value={`${analytics.completionPct}%`} detail={`${analytics.done}/${analytics.cardsTotal || 0} done`} tone="violet" />
            <ReportKpi label="Overdue" value={analytics.overdue} detail="open cards" tone={analytics.overdue > 0 ? "danger" : "good"} />
            <ReportKpi label="Boards" value={analytics.boardsTotal} detail={`${analytics.listsTotal} lists`} />
            <ReportKpi label="Talents" value={analytics.students} detail={`${analytics.supervisors} supervisors`} />
            <ReportKpi label="Meetings" value={meetingAnalytics.total} detail={`${meetingAnalytics.completed} completed`} tone="blue" />
            <ReportKpi label="Upcoming" value={meetingAnalytics.upcoming} detail={`${meetingAnalytics.today} today`} tone="good" />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <ReportPanel eyebrow="Workspace" title="Delivery health">
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <DonutMeter value={analytics.completionPct} label="Complete" />
                <div className="grid content-center gap-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Mini label="Done" value={analytics.done} />
                    <Mini label="Open" value={analytics.open} />
                    <Mini label="Cards" value={analytics.cardsTotal} />
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                      <span>Priority mix</span>
                      <span>{analytics.cardsTotal} cards</span>
                    </div>
                    <div className="space-y-3">
                      <PriorityBar label="Urgent" value={analytics.priority.urgent} tone="urgent" total={analytics.cardsTotal} />
                      <PriorityBar label="High" value={analytics.priority.high} tone="high" total={analytics.cardsTotal} />
                      <PriorityBar label="Medium" value={analytics.priority.medium} tone="medium" total={analytics.cardsTotal} />
                      <PriorityBar label="Low" value={analytics.priority.low} tone="low" total={analytics.cardsTotal} />
                    </div>
                  </div>
                </div>
              </div>
            </ReportPanel>

            <ReportPanel eyebrow="Meetings" title="Operations lens">
              <div className="grid gap-3 lg:grid-cols-2">
                <ReportField label="Supervisor">
                  <select
                    value={meetingFilter.supervisor}
                    onChange={(e) => setMeetingFilter((prev) => ({ ...prev, supervisor: e.target.value, boardId: "all" }))}
                    className="h-11 rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none transition focus:border-[#6d5efc]/30 focus:bg-white"
                  >
                    <option value="all">All supervisors</option>
                    {meetingSupervisorOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </ReportField>
                <ReportField label="Board">
                  <select
                    value={meetingFilter.boardId}
                    onChange={(e) => setMeetingFilter((prev) => ({ ...prev, boardId: e.target.value }))}
                    disabled={meetingFilter.supervisor === "all"}
                    className="h-11 rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none transition focus:border-[#6d5efc]/30 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="all">{meetingFilter.supervisor === "all" ? "Pick supervisor first" : "All supervisor boards"}</option>
                    {meetingBoardOptions.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
                  </select>
                </ReportField>
                <ReportField label="From">
                  <input
                    type="date"
                    value={meetingFilter.dateFrom}
                    onChange={(e) => setMeetingFilter((prev) => ({ ...prev, dateFrom: e.target.value }))}
                    className="h-11 rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none transition focus:border-[#6d5efc]/30 focus:bg-white"
                  />
                </ReportField>
                <ReportField label="To">
                  <input
                    type="date"
                    value={meetingFilter.dateTo}
                    onChange={(e) => setMeetingFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
                    className="h-11 rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none transition focus:border-[#6d5efc]/30 focus:bg-white"
                  />
                </ReportField>
              </div>
              <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-2 sm:grid-cols-4">
                  <Mini label="Scheduled" value={meetingAnalytics.scheduled} />
                  <Mini label="Completed" value={meetingAnalytics.completed} />
                  <Mini label="Canceled" value={meetingAnalytics.canceled} />
                  <Mini label="Rooms" value={meetingAnalytics.mostUsedRooms.length} />
                </div>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]">
                  <SegmentBar value={meetingAnalytics.scheduled} total={Math.max(meetingAnalytics.total, 1)} className="bg-[#8f83ff]" />
                  <SegmentBar value={meetingAnalytics.completed} total={Math.max(meetingAnalytics.total, 1)} className="bg-emerald-400" />
                  <SegmentBar value={meetingAnalytics.canceled} total={Math.max(meetingAnalytics.total, 1)} className="bg-rose-400" />
                </div>
              </div>
            </ReportPanel>
          </section>

          <ReportPanel eyebrow="Cohorts" title="Project distribution">
            <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
              <div className="grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                <ReportField label="Cohort">
                  <select
                    value={projectFilter.cohort}
                    onChange={(e) => setProjectFilter((prev) => ({ ...prev, cohort: e.target.value }))}
                    className="h-10 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-800 outline-none"
                  >
                    <option value="all">All cohorts</option>
                    {projectAnalytics.cohortOptions.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}
                  </select>
                </ReportField>
                <ReportField label="Module">
                  <select
                    value={projectFilter.module}
                    onChange={(e) => setProjectFilter((prev) => ({ ...prev, module: e.target.value, project: "all" }))}
                    className="h-10 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-800 outline-none"
                  >
                    <option value="all">All modules</option>
                    {projectAnalytics.moduleOptions.map((module) => <option key={module} value={module}>{module}</option>)}
                  </select>
                </ReportField>
                <ReportField label="Project">
                  <select
                    value={projectFilter.project}
                    onChange={(e) => setProjectFilter((prev) => ({ ...prev, project: e.target.value }))}
                    className="h-10 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-800 outline-none"
                  >
                    <option value="all">All projects</option>
                    {projectAnalytics.projectOptions.map((item) => (
                      <option key={`${item.module}:${item.project}`} value={item.project}>{projectLabel(item.project)}</option>
                    ))}
                  </select>
                </ReportField>
                <div className="grid grid-cols-2 gap-2">
                  <InsightRow label="Cohorts" value={projectAnalytics.rows.length} />
                  <InsightRow label="Links" value={projectAnalytics.trackedTalents} />
                </div>
              </div>

              <div className="min-h-[280px] overflow-hidden rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3">
                {projectAnalytics.rows.length === 0 ? (
                  <div className="grid h-[280px] place-items-center text-center text-[13px] font-bold text-slate-500">No project data for this filter.</div>
                ) : (
                  <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {projectAnalytics.rows.map((row) => (
                      <div key={row.cohort} className="grid gap-3 rounded-[16px] border border-slate-200 bg-white p-3 lg:grid-cols-[140px_minmax(0,1fr)]">
                        <div>
                          <div className="text-[15px] font-black text-slate-950">{row.cohort}</div>
                          <div className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{row.total} links</div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                          {row.projects.map((project) => (
                            <ProjectTile
                              key={`${row.cohort}:${project.project}`}
                              count={project.count}
                              max={projectAnalytics.maxCount}
                              module={project.module}
                              project={project.project}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ReportPanel>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <ReportPanel eyebrow="Meetings" title="Room pressure">
              <div className="grid gap-3">
                {meetingAnalytics.mostUsedRooms.length === 0 ? (
                  <EmptyState label="No room usage yet." />
                ) : meetingAnalytics.mostUsedRooms.map((row, index) => {
                  const width = Math.max(18, Math.round((row.count / Math.max(meetingAnalytics.mostUsedRooms[0]?.count || 1, 1)) * 100));
                  return (
                    <RankBar key={row.room} rank={index + 1} label={row.room} value={`${row.count} bookings`} width={width} />
                  );
                })}
              </div>
            </ReportPanel>

            <ReportPanel eyebrow="Meetings" title="Supervisor compliance">
              <div className="grid max-h-[390px] gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {meetingAnalytics.compliance.length === 0 ? (
                  <EmptyState label="No supervisors in this scope." />
                ) : meetingAnalytics.compliance.map((row) => (
                  <div key={row.supervisor} className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-black text-slate-900">{row.supervisor}</div>
                        <div className="mt-0.5 text-[11px] font-bold text-slate-500">{row.meetings} meetings</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${row.status === "on_track" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
                        {row.status === "on_track" ? "On track" : "Missing"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ReportPanel>
          </section>

          <ReportPanel eyebrow="Action Queue" title="What needs attention">
            <div className="grid gap-4 xl:grid-cols-3">
              <ActionList title="Overdue risk" empty="No overdue cards right now.">
                {analytics.overdueCards.map((card) => (
                  <ActionItem
                    key={card.cardID}
                    title={card.cardTitle}
                    meta={`${card.boardName} • ${card.supervisor}`}
                    badge={`${card.daysOverdue}d late`}
                    danger
                    footer={`${formatDate(card.dueDate)} • ${card.priority}`}
                  />
                ))}
              </ActionList>

              <ActionList title="Workload balance" empty="No supervisor data yet.">
                {analytics.supervisorStats.map((supervisor) => (
                  <ActionItem
                    key={supervisor.supervisor}
                    title={supervisor.supervisor}
                    meta={`${supervisor.boards} boards • ${supervisor.cards} cards`}
                    badge={`${supervisor.completionPct}%`}
                    footer={`${supervisor.done}/${supervisor.cards || 0} done • ${supervisor.overdue} overdue`}
                    progress={supervisor.completionPct}
                    danger={supervisor.overdue > 0}
                  />
                ))}
              </ActionList>

              <ActionList title="Low activity" empty="No board data yet.">
                {analytics.lowActivityBoards.map((board) => (
                  <ActionItem
                    key={board.id}
                    title={board.name}
                    meta={board.supervisor_name}
                    badge={`${board.activeCards}/${board.cardsTotal || 0}`}
                    footer="active cards"
                    progress={board.cardsTotal > 0 ? Math.round((board.activeCards / board.cardsTotal) * 100) : 0}
                  />
                ))}
              </ActionList>
            </div>
          </ReportPanel>
        </div>
      )}
    </AdminLayout>
  );
}

function ReportPanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <SectionEyebrow label={eyebrow} />
          <div className="mt-1 text-[22px] font-black tracking-[-0.03em] text-slate-950">{title}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReportKpi({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "violet" | "blue" | "good" | "danger";
}) {
  const toneClass =
    tone === "violet"
      ? "border-[#6d5efc]/18 bg-[#f7f5ff]"
      : tone === "blue"
        ? "border-sky-200 bg-sky-50/70"
        : tone === "good"
          ? "border-emerald-200 bg-emerald-50/70"
          : tone === "danger"
            ? "border-red-200 bg-red-50/70"
            : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[18px] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${toneClass}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-[28px] font-black tracking-[-0.05em] text-slate-950">{value}</div>
      <div className="mt-1 text-[12px] font-bold text-slate-500">{detail}</div>
    </div>
  );
}

function DonutMeter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="grid place-items-center rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5">
      <div
        className="relative h-[180px] w-[180px] rounded-full"
        style={{ background: `conic-gradient(#6d5efc 0% ${pct}%, #e9edf5 ${pct}% 100%)` }}
      >
        <div className="absolute inset-[24px] grid place-items-center rounded-full border border-slate-200 bg-white text-center">
          <div>
            <div className="text-[38px] font-black tracking-[-0.05em] text-slate-950">{pct}%</div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectTile({
  count,
  max,
  module,
  project,
}: {
  count: number;
  max: number;
  module: string;
  project: string;
}) {
  const width = Math.max(12, Math.round((count / Math.max(max, 1)) * 100));
  const moduleClass =
    module === "Rust"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : module === "JavaScript"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
  const barClass =
    module === "Rust"
      ? "from-orange-500 to-amber-400"
      : module === "JavaScript"
        ? "from-sky-500 to-cyan-400"
        : "from-emerald-500 to-teal-400";

  return (
    <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[12px] font-black text-slate-950">{projectLabel(project)}</div>
          <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${moduleClass}`}>
            {module}
          </span>
        </div>
        <div className="text-[18px] font-black tracking-[-0.04em] text-slate-950">{count}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full bg-gradient-to-r ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-bold text-slate-500">
      {label}
    </div>
  );
}

function RankBar({
  rank,
  label,
  value,
  width,
}: {
  rank: number;
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-[11px] font-black text-white">{rank}</span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-black text-slate-950">{label}</div>
            <div className="text-[11px] font-bold text-slate-500">{value}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-gradient-to-r from-[#6d5efc] to-[#8f83ff]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ActionList({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 text-[14px] font-black text-slate-950">{title}</div>
      <div className="grid max-h-[430px] gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {hasItems ? children : <EmptyState label={empty} />}
      </div>
    </div>
  );
}

function ActionItem({
  title,
  meta,
  badge,
  footer,
  progress,
  danger = false,
}: {
  title: string;
  meta: string;
  badge: string;
  footer: string;
  progress?: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black text-slate-950">{title}</div>
          <div className="mt-1 truncate text-[11px] font-bold text-slate-500">{meta}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${danger ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {badge}
        </span>
      </div>
      <div className="mt-2 text-[11px] font-bold text-slate-500">{footer}</div>
      {typeof progress === "number" ? (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${danger ? "bg-gradient-to-r from-red-400 to-rose-400" : "bg-gradient-to-r from-[#6d5efc] to-[#8f83ff]"}`} style={{ width: `${Math.max(6, Math.min(100, progress))}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function SegmentBar({ value, total, className }: { value: number; total: number; className: string }) {
  const width = total > 0 ? `${(value / total) * 100}%` : "0%";
  return <div className={`${className} h-full transition-all duration-500`} style={{ width }} />;
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-[14px] font-black text-slate-900">{value}</div>
    </div>
  );
}

function PriorityBar({
  label,
  value,
  tone,
  total,
}: {
  label: string;
  value: number;
  tone: "urgent" | "high" | "medium" | "low";
  total: number;
}) {
  const toneClass =
    tone === "urgent"
      ? "text-red-700"
      : tone === "high"
        ? "text-orange-700"
        : tone === "medium"
          ? "text-[#4f46e5]"
          : "text-emerald-700";
  const barClass =
    tone === "urgent"
      ? "from-red-500 to-red-400"
      : tone === "high"
        ? "from-orange-500 to-amber-400"
        : tone === "medium"
          ? "from-[#6d5efc] to-[#8f83ff]"
          : "from-emerald-500 to-emerald-400";
  const width = total > 0 ? Math.max(8, Math.round((value / total) * 100)) : 8;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[12px] font-black">
        <span className={toneClass}>{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-500`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="truncate text-right text-[12px] font-black text-slate-900">{value}</span>
    </div>
  );
}

function SectionEyebrow({ label }: { label: string }) {
  return (
    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5b50d6]">
      {label}
    </div>
  );
}

function ReportField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
