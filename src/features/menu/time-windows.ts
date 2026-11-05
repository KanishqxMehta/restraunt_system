export function getKolkataMinute(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return (
    Number(parts.find((p) => p.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  );
}

export function isItemInTimeWindow(
  fromMinute: number | null | undefined,
  toMinute: number | null | undefined,
  now: Date,
): boolean {
  if (fromMinute == null || toMinute == null) {
    return true;
  }
  if (fromMinute === 0 && toMinute === 1440) {
    return true;
  }
  if (fromMinute === toMinute) {
    return false;
  }
  const minute = getKolkataMinute(now);
  return fromMinute < toMinute
    ? minute >= fromMinute && minute < toMinute
    : minute >= fromMinute || minute < toMinute;
}

export function formatMinuteToTime(minute: number | null | undefined): string {
  if (minute == null) return "--:--";
  const hours = Math.floor(minute / 60) % 24;
  const mins = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatTimeWindow(
  fromMinute: number | null | undefined,
  toMinute: number | null | undefined,
): string {
  if (fromMinute == null || toMinute == null) {
    return "All day";
  }
  if (fromMinute === 0 && toMinute === 1440) {
    return "All day";
  }
  return `${formatMinuteToTime(fromMinute)} – ${formatMinuteToTime(toMinute)}`;
}

export function parseTimeToMinute(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  if (!trimmed) return null;
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
