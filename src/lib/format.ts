export function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Human-friendly length of time from a whole number of minutes.
 * 45 → "45m", 135 → "2h 15m", 2043 → "1d 10h".
 */
export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(Math.abs(totalMinutes)));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) {
    const m = minutes % 60;
    return m ? `${Math.floor(minutes / 60)}h ${m}m` : `${minutes / 60}h`;
  }
  const h = Math.floor((minutes % 1440) / 60);
  return `${Math.floor(minutes / 1440)}d ${h}h`;
}

/**
 * Live timer text from milliseconds. Keeps seconds precision while the
 * value is under an hour, then drops to coarser units so it stays short.
 * 125000 → "2m 05s", 3_900_000 → "1h 05m", 1.5 days → "1d 12h".
 */
export function formatElapsed(ms: number): string {
  const seconds = Math.floor(Math.abs(ms) / 1000);
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1440) {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
}
