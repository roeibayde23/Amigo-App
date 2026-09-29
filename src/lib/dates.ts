import { APP_TIMEZONE } from "./env";
import type { Strings } from "./i18n";
import type { Lang } from "./types";

type Parts = { date: string; hm: string; hour: number };

/** Current date/time in the app timezone (Europe/Prague by default), independent of the device/server zone. */
export function zonedNow(now: Date = new Date(), tz: string = APP_TIMEZONE): Parts {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, hour: Number(p.hour) };
}

export function dateInTz(iso: string, tz: string = APP_TIMEZONE): string {
  return zonedNow(new Date(iso), tz).date;
}

function parse(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

export function addDays(dateStr: string, n: number): string {
  const { y, m, d } = parse(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(dateStr: string): number {
  const { y, m, d } = parse(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysInMonth(dateStr: string): number {
  const { y, m } = parse(dateStr);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function dayOfMonth(dateStr: string): number {
  return parse(dateStr).d;
}

/** "יום שלישי, 29 בספטמבר" / "Tuesday, September 29" */
export function longDate(dateStr: string, s: Strings, lang: Lang): string {
  const { m, d } = parse(dateStr);
  const wd = s.days[weekdayOf(dateStr)];
  return lang === "he" ? `${wd}, ${d} ב${s.months[m - 1]}` : `${wd}, ${s.months[m - 1]} ${d}`;
}

/** "29 בספטמבר" / "September 29" */
export function shortDate(dateStr: string, s: Strings, lang: Lang): string {
  const { m, d } = parse(dateStr);
  return lang === "he" ? `${d} ב${s.months[m - 1]}` : `${s.months[m - 1]} ${d}`;
}

export type GreetKey = "night" | "morning" | "noon" | "evening" | "late";
export function greetingKey(hour: number): GreetKey {
  return hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "noon" : hour < 21 ? "evening" : "late";
}

export function mailDateTag(iso: string, today: string, s: Strings, lang: Lang): string {
  const d = dateInTz(iso);
  if (d === today) return s.today;
  if (d === addDays(today, -1)) return s.yesterday;
  return shortDate(d, s, lang);
}

export function addMinutes(hm: string, minutes: number): string {
  const [h, m] = hm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
