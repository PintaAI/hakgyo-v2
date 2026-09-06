export function canOpenModule(access: string) {
  return access === "AVAILABLE" || access === "COMPLETED";
}

export function meetingState(
  meeting: { startsAt: Date; durationMinutes: number; status: string },
  now = Date.now(),
) {
  if (meeting.status === "CANCELLED" || meeting.status === "ENDED")
    return "ended";
  const start = meeting.startsAt.getTime();
  if (now >= start + meeting.durationMinutes * 60_000) return "ended";
  if (meeting.status === "STARTED" || now >= start) return "live";
  return now >= start - 10 * 60_000 ? "joining" : "upcoming";
}

export function safeExternalUrl(value: string, kind: "zoom" | "whatsapp") {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    const allowed =
      kind === "zoom"
        ? host === "zoom.us" ||
          host.endsWith(".zoom.us") ||
          host === "zoom.com" ||
          host.endsWith(".zoom.com")
        : host === "chat.whatsapp.com";
    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

export function dateLabel(date: Date) {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function achievementLabel(code: string) {
  if (code === "FIRST_ACTIVITY") return "First step";
  const [kind, count] = code.split("_");
  if (kind === "STREAK") return `${count}-day streak`;
  if (kind === "XP") return `${count} XP earned`;
  return code.replaceAll("_", " ").toLowerCase();
}
