import type { ReactNode } from "react";
import type { NotificationItem } from "./notifications";

type NotificationTone = {
  dot: string;
  badge: string;
  iconWrap: string;
  row: string;
  accent: string;
  toast: string;
  icon: ReactNode;
  label: string;
};

function CalendarPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12v5M9.5 14.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CalendarMoveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 15h8M13 12l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarCancelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M9 13l6 6M15 13l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="m9 15 2.3 2.3L16 12.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M4 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.5 11a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 19a4 4 0 0 0-3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function baseTone(overrides: Partial<NotificationTone>): NotificationTone {
  return {
    dot: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    iconWrap: "border-sky-200 bg-sky-50 text-sky-700",
    row: "hover:border-sky-200/80 hover:bg-sky-50/30",
    accent: "text-sky-700",
    toast: "border-sky-200 bg-[linear-gradient(180deg,#f8fdff,#eef8ff)]",
    icon: <BellIcon />,
    label: "Update",
    ...overrides,
  };
}

export function getNotificationTone(item: Pick<NotificationItem, "kind" | "title" | "body" | "link">): NotificationTone {
  const kind = item.kind.toLowerCase();
  const title = item.title.toLowerCase();
  const body = item.body.toLowerCase();

  if (kind === "meeting_created") {
    return baseTone({
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-800",
      iconWrap: "border-amber-200 bg-amber-50 text-amber-700",
      row: "hover:border-amber-200 hover:bg-amber-50/40",
      accent: "text-amber-700",
      toast: "border-amber-200 bg-[linear-gradient(180deg,#fffaf0,#fff3d8)]",
      icon: <CalendarPlusIcon />,
      label: "Booked",
    });
  }

  if (kind === "meeting_room_notice") {
    return baseTone({
      dot: "bg-orange-500",
      badge: "border-orange-200 bg-orange-50 text-orange-800",
      iconWrap: "border-orange-200 bg-orange-50 text-orange-700",
      row: "hover:border-orange-200 hover:bg-orange-50/40",
      accent: "text-orange-700",
      toast: "border-orange-200 bg-[linear-gradient(180deg,#fff8f1,#ffe9d6)]",
      icon: <CalendarPlusIcon />,
      label: "Room notice",
    });
  }

  if (kind === "meeting_updated") {
    return baseTone({
      dot: "bg-blue-500",
      badge: "border-blue-200 bg-blue-50 text-blue-800",
      iconWrap: "border-blue-200 bg-blue-50 text-blue-700",
      row: "hover:border-blue-200 hover:bg-blue-50/40",
      accent: "text-blue-700",
      toast: "border-blue-200 bg-[linear-gradient(180deg,#f7fbff,#eaf3ff)]",
      icon: <CalendarMoveIcon />,
      label: "Rescheduled",
    });
  }

  if (kind === "meeting_status" && (title.includes("cancel") || body.includes("cancel"))) {
    return baseTone({
      dot: "bg-rose-500",
      badge: "border-rose-200 bg-rose-50 text-rose-800",
      iconWrap: "border-rose-200 bg-rose-50 text-rose-700",
      row: "hover:border-rose-200 hover:bg-rose-50/40",
      accent: "text-rose-700",
      toast: "border-rose-200 bg-[linear-gradient(180deg,#fff7f8,#ffe7eb)]",
      icon: <CalendarCancelIcon />,
      label: "Canceled",
    });
  }

  if (kind === "meeting_status" && (title.includes("complete") || body.includes("complete"))) {
    return baseTone({
      dot: "bg-emerald-500",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
      iconWrap: "border-emerald-200 bg-emerald-50 text-emerald-700",
      row: "hover:border-emerald-200 hover:bg-emerald-50/40",
      accent: "text-emerald-700",
      toast: "border-emerald-200 bg-[linear-gradient(180deg,#f2fff8,#dff7ea)]",
      icon: <CalendarCheckIcon />,
      label: "Completed",
    });
  }

  if (kind === "meeting_participant") {
    return baseTone({
      dot: "bg-fuchsia-500",
      badge: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
      iconWrap: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
      row: "hover:border-fuchsia-200 hover:bg-fuchsia-50/40",
      accent: "text-fuchsia-700",
      toast: "border-fuchsia-200 bg-[linear-gradient(180deg,#fff9ff,#f8eaff)]",
      icon: <UsersIcon />,
      label: "Participants",
    });
  }

  if (kind === "meeting_reminder") {
    return baseTone({
      dot: "bg-violet-500",
      badge: "border-violet-200 bg-violet-50 text-violet-800",
      iconWrap: "border-violet-200 bg-violet-50 text-violet-700",
      row: "hover:border-violet-200 hover:bg-violet-50/40",
      accent: "text-violet-700",
      toast: "border-violet-200 bg-[linear-gradient(180deg,#faf7ff,#f1eaff)]",
      icon: <BellIcon />,
      label: "Reminder",
    });
  }

  return baseTone({});
}
