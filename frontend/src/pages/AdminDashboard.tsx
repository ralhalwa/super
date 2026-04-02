import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
  email: string;
  file_id: number;
  created_at: string;
};

type BoardRow = {
  id: number;
  cards_count: number;
};

type SupervisorActivity = {
  active?: {
    count: number;
    percentage: number;
  };
  inactive?: {
    count: number;
    percentage: number;
  };
  total?: number;
};

function PieChart({ activePercent }: { activePercent: number }) {
  const pct = Math.max(0, Math.min(100, activePercent));
  const angle = (pct / 100) * 360;

  return (
    <div
      className="relative h-[220px] w-[220px] flex-none rounded-full"
      style={{
        background:
          pct <= 0
            ? "#fde2e2"
            : pct >= 100
            ? "#dff7e8"
            : `conic-gradient(#22c55e 0deg ${angle}deg, #f87171 ${angle}deg 360deg)`,
      }}
    >
      <div className="absolute inset-[28px] grid place-items-center rounded-full border border-slate-200 bg-white text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div>
          <div className="text-[42px] font-black tracking-[-0.04em] text-slate-900">{pct}%</div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Active</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold text-slate-500">{label}</div>
          <div className="mt-1.5 text-2xl font-black text-slate-900">{value}</div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-slate-200 bg-slate-50">
          {icon}
        </div>
      </div>
      {subtitle ? <div className="mt-2 text-[13px] text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

export default function AdminDashboard() {
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [boardsCount, setBoardsCount] = useState(0);
  const [cardsCount, setCardsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [supervisorActivity, setSupervisorActivity] = useState<SupervisorActivity | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardStats() {
      setStatsLoading(true);
      try {
        const [sups, students, boards, activity] = await Promise.all([
          apiFetch("/admin/supervisors"),
          apiFetch("/admin/users?role=student&q="),
          apiFetch("/admin/all-boards"),
          apiFetch("/admin/dashboard/supervisor-activity"),
        ]);

        if (!mounted) return;
        setSupervisors(Array.isArray(sups) ? sups : []);
        setStudentCount(Array.isArray(students) ? students.length : 0);
        const boardRows = Array.isArray(boards) ? (boards as BoardRow[]) : [];
        setBoardsCount(boardRows.length);
        setCardsCount(boardRows.reduce((sum, board) => sum + (board.cards_count || 0), 0));
        setSupervisorActivity(activity || null);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setSupervisors([]);
        setStudentCount(0);
        setBoardsCount(0);
        setCardsCount(0);
        setSupervisorActivity(null);
      } finally {
        if (mounted) setStatsLoading(false);
      }
    }

    void loadDashboardStats();
    return () => {
      mounted = false;
    };
  }, []);

  const totalSupervisors = supervisors.length;
  const activeSupervisorPercent = supervisorActivity?.active?.percentage || 0;

  return (
    <AdminLayout active="dashboard" title="Admin Dashboard" subtitle="Manage users and supervise the system.">
      <section className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Supervisors"
          value={statsLoading ? "..." : totalSupervisors}
          icon={<span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_0_rgba(37,99,235,0.25)] animate-[admPulse_1.5s_ease-in-out_infinite]" />}
        />
        <StatCard
          label="Students"
          value={statsLoading ? "..." : studentCount}
          icon={
            <div className="flex h-11 w-11 items-end justify-center gap-1 px-2">
              <span className="h-2.5 w-1.5 rounded bg-emerald-500 animate-bounce [animation-duration:1.1s]" />
              <span className="h-4 w-1.5 rounded bg-emerald-500 animate-bounce [animation-duration:1.1s] [animation-delay:.12s]" />
              <span className="h-3 w-1.5 rounded bg-emerald-500 animate-bounce [animation-duration:1.1s] [animation-delay:.24s]" />
            </div>
          }
        />
        <StatCard
          label="Boards"
          value={statsLoading ? "..." : boardsCount}
          icon={
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="3" stroke="#2563eb" strokeWidth="2" />
              <path d="M8 9h8M8 13h8M8 17h5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Cards"
          value={statsLoading ? "..." : cardsCount}
          icon={
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
              <rect x="6" y="5" width="12" height="14" rx="2.5" stroke="#f59e0b" strokeWidth="2" />
              <path d="M9 9h6M9 13h6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Admin"
          value="System"
          subtitle="You're managing the platform"
          icon={<span className="h-[18px] w-[18px] rounded-full border-2 border-slate-300 border-t-violet-500 animate-spin" />}
        />
      </section>

      <section className="mt-3.5">
        <div className="grid justify-start">
          <div className="relative h-[500px] w-[500px] max-w-full rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.06)] max-[760px]:h-auto">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-slate-500">Supervisor Activity</div>
                <div className="mt-1.5 text-[18px] font-black text-slate-900">This week</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-slate-200 bg-slate-50">
                <span className="h-[18px] w-[18px] rounded-full bg-[conic-gradient(#22c55e_0deg_220deg,#f87171_220deg_360deg)]" />
              </div>
            </div>

            <div className="flex min-h-[360px] items-center justify-center max-[760px]:min-h-[280px]">
              <PieChart activePercent={statsLoading ? 0 : activeSupervisorPercent} />
            </div>

            <div className="absolute bottom-5 right-5 flex items-center gap-6 text-right">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Active</span>
              </div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span>Inactive</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
