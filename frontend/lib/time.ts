// Time and date helpers. Times are "HH:MM" strings, dates are "YYYY-MM-DD".

// Must match WORK_START / WORK_END in backend/app/scheduling.py.
export const WORK_START = "09:00";
export const WORK_END = "18:00";
export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 18 * 60;
export const WORKING_MINUTES = DAY_END_MIN - DAY_START_MIN;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// Built from local date parts on purpose: toISOString() is UTC, so in India it
// would still return yesterday's date until 05:30 in the morning.
export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDate(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatDateLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function dayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === shiftDate(today, 1)) return "Tomorrow";
  if (iso === shiftDate(today, -1)) return "Yesterday";
  return formatDateShort(iso);
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
