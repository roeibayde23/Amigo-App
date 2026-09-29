import { APP_TIMEZONE } from "./env";

/**
 * iPhone Reminders via Apple Shortcuts.
 * Amigo opens  shortcuts://run-shortcut?name=Amigo%20Reminder&input=text&text=<JSON>
 * and the user's "Amigo Reminder" shortcut turns the JSON into a reminder:
 *   {"title":"להתקשר לבנק","due":"2026-09-30 09:00","iso":"2026-09-30T09:00:00+02:00","notes":"Amigo"}
 * "due" is local time (Europe/Prague) in a format Shortcuts reliably turns into a date;
 * it is "" when the task has no date. Date-only tasks get a 09:00 alert. "iso" is the same moment
 * in ISO-8601 with offset (for anyone building a fancier shortcut).
 */
export const SHORTCUT_NAME = "Amigo Reminder";
export const DEFAULT_ALERT_TIME = "09:00";
const PREF_KEY = "amigo_reminders";

export type ReminderPayload = { title: string; due: string; iso: string; notes: string };

/** "+02:00" – offset of `tz` at the given local date/time. */
export function tzOffset(date: string, time: string, tz: string = APP_TIMEZONE): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .formatToParts(guess)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const mt = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!mt) return "+00:00";
  return `${mt[1]}${mt[2].padStart(2, "0")}:${mt[3] ?? "00"}`;
}

export function reminderPayload(title: string, dueDate?: string | null, dueTime?: string | null): ReminderPayload {
  let due = "";
  let iso = "";
  if (dueDate) {
    const t = dueTime || DEFAULT_ALERT_TIME;
    due = `${dueDate} ${t}`;
    iso = `${dueDate}T${t}:00${tzOffset(dueDate, t)}`;
  }
  return { title: title.trim(), due, iso, notes: "Amigo" };
}

export function shortcutUrl(p: ReminderPayload, name: string = SHORTCUT_NAME): string {
  return (
    `shortcuts://run-shortcut?name=${encodeURIComponent(name)}` +
    `&input=text&text=${encodeURIComponent(JSON.stringify(p))}`
  );
}

/** iPhone / iPad (incl. iPadOS that reports itself as a Mac). */
export function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function remindersEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "0"; // default on
  } catch {
    return true;
  }
}
export function setRemindersEnabled(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

/**
 * Hand a new task to the iOS Shortcut. Call synchronously inside the tap handler (Safari only
 * follows custom-scheme navigations that come from a user gesture). Returns true if launched.
 */
export function sendToReminders(title: string, dueDate?: string | null, dueTime?: string | null, force = false): boolean {
  if (typeof window === "undefined") return false;
  if (!force && (!remindersEnabled() || !isAppleMobile())) return false;
  const url = shortcutUrl(reminderPayload(title, dueDate, dueTime));
  (window as unknown as { __amigoLastShortcut?: string }).__amigoLastShortcut = url; // for tests / debugging
  window.location.href = url;
  return true;
}
