import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useConfirm } from "../lib/useConfirm";

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
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type BoardRow = {
  id: number;
  name: string;
  description: string;
  supervisor_name: string;
};

type BoardMember = {
  user_id: number;
  full_name: string;
  role: string;
  role_in_board: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatTimeRange(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function PencilIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 10v6M14 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function titleForRole(role: string) {
  if (role === "admin") return "Meetings";
  if (role === "supervisor") return "My Meetings";
  return "My Calendar";
}

function subtitleForRole(role: string) {
  if (role === "admin") return "All supervisor bookings in one smooth calendar view.";
  if (role === "supervisor") return "Schedule meetings for your own boards and review upcoming sessions.";
  return "Meetings from the boards you belong to.";
}

export default function MeetingsCalendarPage() {
  const { role, isAdmin, isSupervisor } = useAuth();
  const canCreate = isAdmin || isSupervisor;
  const canManage = isAdmin || isSupervisor;
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [selectedBoardFilter, setSelectedBoardFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(toLocalDateInput());
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingMeetingID, setDeletingMeetingID] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [editingMeetingID, setEditingMeetingID] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    board_id: "",
    title: "",
    location: "",
    notes: "",
    date: toLocalDateInput(),
    start_time: "10:00",
    end_time: "11:00",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meetingsRes, boardsRes] = await Promise.all([
        apiFetch("/admin/meetings"),
        apiFetch("/admin/all-boards"),
      ]);
      setMeetings(Array.isArray(meetingsRes) ? meetingsRes : []);
      setBoards(Array.isArray(boardsRes) ? boardsRes : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load meetings");
      setMeetings([]);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!showComposer || !form.board_id) {
      setBoardMembers([]);
      return;
    }
    let cancelled = false;
    apiFetch(`/admin/board-members?board_id=${form.board_id}`)
      .then((res) => {
        if (!cancelled) setBoardMembers(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (!cancelled) setBoardMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showComposer, form.board_id]);

  const boardOptions = useMemo(() => {
    const seen = new Map<number, BoardRow>();
    boards.forEach((board) => seen.set(board.id, board));
    meetings.forEach((meeting) => {
      if (!seen.has(meeting.board_id)) {
        seen.set(meeting.board_id, {
          id: meeting.board_id,
          name: meeting.board_name,
          description: "",
          supervisor_name: meeting.supervisor_name,
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [boards, meetings]);

  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((meeting) => selectedBoardFilter === "all" || String(meeting.board_id) === selectedBoardFilter)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [meetings, selectedBoardFilter]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, MeetingRow[]>();
    filteredMeetings.forEach((meeting) => {
      const key = dateKey(new Date(meeting.starts_at));
      const bucket = map.get(key) || [];
      bucket.push(meeting);
      map.set(key, bucket);
    });
    return map;
  }, [filteredMeetings]);

  const selectedDayMeetings = useMemo(() => {
    return meetingsByDay.get(selectedDate) || [];
  }, [meetingsByDay, selectedDate]);

  const monthDays = useMemo(() => {
    const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const next = new Date(start);
      next.setDate(start.getDate() + i);
      days.push(next);
    }
    return days;
  }, [currentMonth]);

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = filteredMeetings.filter((meeting) => new Date(meeting.ends_at).getTime() >= now).length;
    const thisMonth = filteredMeetings.filter((meeting) => sameMonth(new Date(meeting.starts_at), currentMonth)).length;
    const supervisedBoards = new Set(filteredMeetings.map((meeting) => meeting.board_id)).size;
    return { total: filteredMeetings.length, upcoming, thisMonth, supervisedBoards };
  }, [filteredMeetings, currentMonth]);

  async function createMeeting(e: FormEvent) {
    e.preventDefault();
    if (!form.board_id) {
      setError("Choose a board first.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const startsAt = new Date(`${form.date}T${form.start_time}`);
      const endsAt = new Date(`${form.date}T${form.end_time}`);
      await apiFetch(editingMeetingID ? "/admin/meetings/update" : "/admin/meetings", {
        method: "POST",
        body: JSON.stringify({
          meeting_id: editingMeetingID,
          board_id: Number(form.board_id),
          title: form.title.trim(),
          location: form.location.trim(),
          notes: form.notes.trim(),
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        }),
      });
      setShowComposer(false);
      setEditingMeetingID(null);
      setForm({
        board_id: form.board_id,
        title: "",
        location: "",
        notes: "",
        date: form.date,
        start_time: "10:00",
        end_time: "11:00",
      });
      setSelectedDate(form.date);
      setCurrentMonth(new Date(`${form.date}T00:00:00`));
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Failed to create meeting");
    } finally {
      setSaving(false);
    }
  }

  function startCreateMeeting() {
    setEditingMeetingID(null);
    setForm({
      board_id: "",
      title: "",
      location: "",
      notes: "",
      date: selectedDate,
      start_time: "10:00",
      end_time: "11:00",
    });
    setShowComposer(true);
  }

  function startEditMeeting(meeting: MeetingRow) {
    const start = new Date(meeting.starts_at);
    const end = new Date(meeting.ends_at);
    setEditingMeetingID(meeting.id);
    setForm({
      board_id: String(meeting.board_id),
      title: meeting.title,
      location: meeting.location,
      notes: meeting.notes || "",
      date: toLocalDateInput(start),
      start_time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      end_time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    });
    setShowComposer(true);
  }

  async function deleteMeeting(meeting: MeetingRow) {
    if (deletingMeetingID !== null) return;
    const ok = await confirm({
      title: "Delete meeting",
      message: `Delete "${meeting.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingMeetingID(meeting.id);
    setError("");
    try {
      await apiFetch("/admin/meetings/delete", {
        method: "POST",
        body: JSON.stringify({ meeting_id: meeting.id }),
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Failed to delete meeting");
    } finally {
      setDeletingMeetingID(null);
    }
  }

  function closeComposer() {
    setShowComposer(false);
    setEditingMeetingID(null);
  }

  return (
    <>
      {confirmDialog}
      <AdminLayout
        active={isAdmin ? "meetings" : "boards"}
        title={titleForRole(role)}
        subtitle={subtitleForRole(role)}
        right={
          canCreate ? (
            <button
              type="button"
              onClick={startCreateMeeting}
              className="h-10 rounded-[14px] border border-amber-300 bg-gradient-to-br from-amber-400 to-orange-400 px-4 text-[13px] font-black text-white shadow-[0_14px_34px_rgba(245,158,11,0.24)] transition hover:-translate-y-[1px]"
            >
              Book Meeting
            </button>
          ) : null
        }
      >
      {error ? (
        <div className="mb-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_32%),linear-gradient(135deg,#ffffff,#fff8eb)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.18em] text-amber-700">Calendar view</div>
              <div className="mt-2 text-[26px] font-black tracking-[-0.03em] text-slate-900">{monthLabel(currentMonth)}</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-600">
                {canCreate ? "Book sessions by board, location, and time." : "All meetings are grouped by your boards."}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-700"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(toLocalDateInput(now));
                }}
                className="h-10 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-700"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          <StatCard label="Total" value={stats.total} tone="amber" />
          <StatCard label="Upcoming" value={stats.upcoming} tone="emerald" />
          <StatCard label="This month" value={stats.thisMonth} tone="violet" />
          <StatCard label="Boards" value={stats.supervisedBoards} tone="slate" />
        </div>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={selectedBoardFilter}
          onChange={(e) => setSelectedBoardFilter(e.target.value)}
          className="h-11 min-w-[220px] rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-amber-300"
        >
          <option value="all">All boards</option>
          {boardOptions.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
        <div className="rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-600">
          {role === "supervisor" ? "Minimum target: one meeting per supervisor." : "Calendar updates live from current bookings."}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="mb-3 grid grid-cols-7 gap-2">
            {monthDays.slice(0, 7).map((day) => (
              <div key={day.toISOString()} className="px-2 py-1 text-[12px] font-black uppercase tracking-[0.12em] text-slate-400">
                {dayLabel(day)}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-8 text-center text-[14px] font-semibold text-slate-500">
              Loading calendar...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const key = dateKey(day);
                const dayMeetings = meetingsByDay.get(key) || [];
                const isCurrent = key === selectedDate;
                const isInMonth = sameMonth(day, currentMonth);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={[
                      "min-h-[132px] rounded-[18px] border p-2.5 text-left transition",
                      isCurrent
                        ? "border-amber-300 bg-amber-50 shadow-[0_14px_34px_rgba(245,158,11,0.16)]"
                        : "border-slate-200 bg-slate-50 hover:border-amber-200 hover:bg-white",
                      isInMonth ? "text-slate-900" : "text-slate-400 opacity-70",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-black">{day.getDate()}</span>
                      {dayMeetings.length ? (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">
                          {dayMeetings.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      {dayMeetings.slice(0, 3).map((meeting) => (
                        <div key={meeting.id} className="rounded-[12px] bg-white/90 px-2 py-1.5 shadow-sm">
                          <div className="truncate text-[11px] font-black text-slate-900">{meeting.title}</div>
                          <div className="truncate text-[10px] font-semibold text-slate-500">
                            {new Date(meeting.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                      {dayMeetings.length > 3 ? (
                        <div className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">
                          +{dayMeetings.length - 3} more
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.14em] text-slate-400">Selected day</div>
              <div className="mt-1 text-[22px] font-black tracking-[-0.03em] text-slate-900">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentMonth(new Date(`${e.target.value}T00:00:00`));
              }}
              className="h-10 rounded-[12px] border border-slate-200 bg-slate-50 px-3 text-[12px] font-bold text-slate-700"
            />
          </div>

          <div className="mt-4 space-y-3">
            {selectedDayMeetings.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <div className="text-[14px] font-black text-slate-700">No meetings on this day</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-500">
                  {canCreate ? "Open Book Meeting to schedule one." : "Check another board or date."}
                </div>
              </div>
            ) : (
              selectedDayMeetings.map((meeting) => (
                <article key={meeting.id} className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fbfcff)] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-black text-slate-900">{meeting.title}</div>
                      <div className="mt-1 text-[12px] font-semibold text-slate-500">{meeting.board_name}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">
                        {meeting.supervisor_name}
                      </div>
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditMeeting(meeting)}
                            title="Edit meeting"
                            aria-label="Edit meeting"
                            className="grid h-8 w-8 place-items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMeeting(meeting)}
                            disabled={deletingMeetingID === meeting.id}
                            title={deletingMeetingID === meeting.id ? "Deleting..." : "Delete meeting"}
                            aria-label={deletingMeetingID === meeting.id ? "Deleting meeting" : "Delete meeting"}
                            className="grid h-8 w-8 place-items-center rounded-full border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <BinIcon />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <MetaPill label="Time" value={formatTimeRange(meeting.starts_at, meeting.ends_at)} />
                    <MetaPill label="Location" value={meeting.location} />
                    <MetaPill label="Booked by" value={meeting.created_by_name} />
                    {meeting.notes ? <MetaPill label="Notes" value={meeting.notes} /> : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>

      {showComposer ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4" onClick={closeComposer}>
          <div
            className="w-full max-w-[760px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[24px] font-black tracking-[-0.03em] text-slate-900">
                  {editingMeetingID ? "Edit meeting" : "Book a meeting"}
                </div>
                <div className="mt-1 text-[13px] font-semibold text-slate-500">
                  Choose the board, day, time, and place. Students will see it in their calendar automatically.
                </div>
              </div>
              <button
                type="button"
                onClick={closeComposer}
                className="h-10 rounded-[12px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-black text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="grid gap-4" onSubmit={createMeeting}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Board">
                  <select
                    required
                    value={form.board_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, board_id: e.target.value }))}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-amber-300"
                  >
                    <option value="">Choose board</option>
                    {boardOptions.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Meeting title">
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-amber-300"
                    placeholder="Weekly check-in"
                  />
                </Field>

                <Field label="Date">
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-amber-300"
                  />
                </Field>

                <Field label="Location">
                  <input
                    required
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-amber-300"
                    placeholder="Lab 2 / Zoom / Classroom 4"
                  />
                </Field>

                <Field label="Start time">
                  <input
                    required
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-amber-300"
                  />
                </Field>

                <Field label="End time">
                  <input
                    required
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none focus:border-amber-300"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[96px] w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] font-semibold text-slate-800 outline-none focus:border-amber-300"
                  placeholder="Agenda, things to prepare, or a meeting link."
                />
              </Field>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-400">Board members</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {boardMembers.length === 0 ? (
                    <span className="text-[13px] font-semibold text-slate-500">Select a board to preview its members.</span>
                  ) : (
                    boardMembers.map((member) => (
                      <span
                        key={member.user_id}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-slate-700"
                      >
                        {member.full_name}
                        <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{member.role}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-12 rounded-[14px] border border-amber-300 bg-gradient-to-br from-amber-400 to-orange-400 px-5 text-[13px] font-black text-white shadow-[0_16px_34px_rgba(245,158,11,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : editingMeetingID ? "Update meeting" : "Save meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      </AdminLayout>
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" | "violet" | "slate" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "violet"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-[20px] border px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] ${toneClass}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.12em]">{label}</div>
      <div className="mt-2 text-[28px] font-black tracking-[-0.04em]">{value}</div>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
