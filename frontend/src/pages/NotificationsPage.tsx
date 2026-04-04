import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../lib/auth";
import { useNotifications, type NotificationItem } from "../lib/notifications";
import { getNotificationTone } from "../lib/notificationTheme";

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateGroup(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function kindLabel(kind: string) {
  return kind.replaceAll("_", " ");
}

export default function NotificationsPage() {
  const nav = useNavigate();
  const { isAdmin } = useAuth();
  const { items, loading, error, isRecent } = useNotifications();
  const latestItem = items[0] || null;
  const groupedItems = useMemo(() => {
    const groups: Array<{ label: string; items: NotificationItem[] }> = [];
    const lookup = new Map<string, NotificationItem[]>();

    for (const item of items) {
      const label = formatDateGroup(item.created_at);
      if (!lookup.has(label)) {
        const list: NotificationItem[] = [];
        lookup.set(label, list);
        groups.push({ label, items: list });
      }
      lookup.get(label)!.push(item);
    }

    return groups;
  }, [items]);

  return (
    <AdminLayout
      active="notifications"
      title="Notifications"
      subtitle="Meeting reminders, schedule changes, and updates in one place."
    >
      {error ? (
        <div className="mb-5 rounded-[18px] border border-red-200 bg-[linear-gradient(180deg,#fff5f5,#fff0f0)] px-4 py-3 text-[13px] font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(109,94,252,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.08),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#fafbff_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center rounded-full border border-[#6d5efc]/14 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8b7fff] shadow-sm">
                {isAdmin ? "Admin feed" : "Personal inbox"}
              </div>
              <div className="mt-3 text-[24px] font-black tracking-[-0.04em] text-slate-900">
                {isAdmin ? "Important meeting activity" : "Your notifications"}
              </div>
              <div className="mt-2 max-w-[680px] text-[13px] font-semibold leading-6 text-slate-500">
                {isAdmin
                  ? "Bookings, reschedules, attendance changes, room notices, reminders, and outcome notes."
                  : "Reminders, reschedules, and meeting updates for your boards."}
              </div>
            </div>
          </div>

              <div className="mt-5 flex flex-wrap items-stretch gap-2.5">
            <InlineStat label="Total" value={items.length} tone="slate" />
            <InlineStat label="New" value={items.filter((item) => isRecent(item.id)).length} tone="violet" />
            {latestItem ? (
              <div className="min-w-0 flex-1 rounded-[18px] border border-slate-200 bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Latest</div>
                <div className="mt-1 truncate text-[13px] font-black text-slate-800">{latestItem.title}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">{formatDate(latestItem.created_at)}</div>
              </div>
            ) : null}
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-4 py-3">
            <div>
              <div className="text-[13px] font-black text-slate-900">Recent notifications</div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Everything new appears here automatically.</div>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
              {items.length} items
            </div>
          </div>

          {loading ? (
            <div className="grid gap-2.5 px-4 py-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-[96px] animate-pulse rounded-[20px] border border-slate-200 bg-[linear-gradient(90deg,#fafbff,#eef2f7,#fafbff)]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-[340px] place-items-center px-4 py-6">
              <div className="max-w-[420px] text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(109,94,252,0.14),_transparent_55%),#ffffff] shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#8b7fff]" fill="none" aria-hidden="true">
                    <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="mt-5 text-[20px] font-black text-slate-900">
                  No notifications yet
                </div>
                <div className="mt-2 text-[13px] font-semibold leading-6 text-slate-500">
                  {isAdmin
                    ? "Important meeting activity will show here as supervisors and students use the system."
                    : "Meeting reminders, reschedules, and status updates will show up here as your boards become active."}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-3">
              {groupedItems.map((group) => (
                <section key={group.label} className="mb-4 last:mb-0">
                  <div className="sticky top-0 z-[1] mb-2 rounded-[16px] border border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {group.label}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {group.items.map((item) => (
                      <NotificationCard
                        key={item.id}
                        item={item}
                        isNew={isRecent(item.id)}
                        showRecipient={false}
                        onOpen={() => nav(item.link || "/notifications")}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </section>
    </AdminLayout>
  );
}

function NotificationCard({
  item,
  isNew,
  onOpen,
  showRecipient,
}: {
  item: NotificationItem;
  isNew: boolean;
  onOpen: () => void;
  showRecipient: boolean;
}) {
  const tone = getNotificationTone(item);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={item.title}
      className={`group relative overflow-hidden rounded-[20px] border px-4 py-3.5 transition ${tone.row} ${
        isNew
          ? "border-amber-200 bg-[linear-gradient(180deg,#fffdf5,#fff8e8)] shadow-[0_14px_28px_rgba(245,158,11,0.12)]"
          : item.is_read
          ? "border-transparent bg-transparent"
          : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fbfcff)] shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
      }`}
    >
      <div className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full ${tone.dot}`} />
      <div className="pl-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2.5">
              <div className={`mt-0.5 grid h-9 w-9 place-items-center rounded-[14px] border ${tone.iconWrap}`}>
                {tone.icon}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-black tracking-[-0.015em] text-slate-900">{item.title}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
                  <span>{formatDate(item.created_at)}</span>
                  {showRecipient ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                      {(item.user_name || "Unknown user")}{item.user_login ? ` · @${item.user_login}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isNew ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                New
              </span>
            ) : null}
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tone.accent}`}>
              {tone.label}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tone.badge}`}>
              {kindLabel(item.kind)}
            </span>
          </div>
        </div>

        <div className="mt-3 pr-2 text-[12px] font-semibold leading-6 text-slate-700">
          {item.body}
        </div>
      </div>
    </article>
  );
}

function InlineStat({ label, value, tone }: { label: string; value: number; tone: "slate" | "violet" | "emerald" }) {
  const toneClass =
    tone === "violet"
      ? "border-[#6d5efc]/16 bg-[linear-gradient(180deg,#ffffff,#f7f5ff)] text-[#6d5efc]"
      : tone === "emerald"
        ? "border-emerald-200 bg-[linear-gradient(180deg,#f2fff8,#def7ea)] text-emerald-700"
        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] text-slate-700";
  return (
    <div className={`rounded-[16px] border px-3.5 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-1 text-[17px] font-black tracking-[-0.03em]">{value}</div>
    </div>
  );
}
