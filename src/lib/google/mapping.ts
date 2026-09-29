// Pure mapping helpers between Amigo models and Google Calendar / Google Tasks JSON.
// No server-only imports, so they can be unit-tested directly.
import { addDays, addMinutes, zonedNow } from "../dates";
import { COLORS, DEFAULT_EVENT_COLOR, type CalEvent, type EventInput, type Recur } from "../types";

// ---------- recurrence <-> RRULE ----------
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function recurToRRule(r: Recur): string {
  switch (r.freq) {
    case "daily":
      return "RRULE:FREQ=DAILY";
    case "weekly":
      return `RRULE:FREQ=WEEKLY;BYDAY=${[...r.weekdays].sort((a, b) => a - b).map((d) => BYDAY[d]).join(",")}`;
    case "monthly":
      // 31 → last day of every month (otherwise Google skips shorter months)
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${r.monthDay >= 31 ? -1 : r.monthDay}`;
  }
}

export function rruleToRecur(rule: string): Recur | null {
  const body = rule.replace(/^RRULE:/i, "");
  const parts = Object.fromEntries(
    body.split(";").map((kv) => {
      const [k, v = ""] = kv.split("=");
      return [k.toUpperCase(), v.toUpperCase()];
    }),
  );
  if (parts.INTERVAL && parts.INTERVAL !== "1") return null; // unsupported (every 2 weeks etc.)
  if (parts.FREQ === "DAILY") return { freq: "daily" };
  if (parts.FREQ === "WEEKLY") {
    const days = (parts.BYDAY ?? "").split(",").map((d) => BYDAY.indexOf(d.slice(-2))).filter((d) => d >= 0);
    return days.length ? { freq: "weekly", weekdays: days } : null;
  }
  if (parts.FREQ === "MONTHLY" && parts.BYMONTHDAY) {
    const n = Number(parts.BYMONTHDAY);
    return { freq: "monthly", monthDay: n === -1 ? 31 : n };
  }
  return null;
}

// ---------- colours ----------
// Amigo palette → Google event colorId (Google has 11 fixed event colours).
const TO_GOOGLE: Record<string, string> = {
  "#D96C5A": "6", // coral  → Tangerine
  "#8B5CF6": "3", // purple → Grape
  "#4FA3D1": "7", // blue   → Peacock
  "#4CAF7D": "2", // green  → Sage
  "#E0A93E": "5", // amber  → Banana
  "#D6699A": "4", // pink   → Flamingo
};
const FROM_GOOGLE: Record<string, string> = {
  "1": COLORS[1], "2": COLORS[3], "3": COLORS[1], "4": COLORS[5], "5": COLORS[4], "6": COLORS[0],
  "7": COLORS[2], "8": COLORS[2], "9": COLORS[2], "10": COLORS[3], "11": COLORS[0],
};
export const colorToGoogle = (hex?: string | null) => (hex ? TO_GOOGLE[hex.toUpperCase()] : undefined);
export const googleToColor = (id?: string | null) => (id && FROM_GOOGLE[id]) || DEFAULT_EVENT_COLOR;

// ---------- Calendar ----------
export type GEventTime = { date?: string; dateTime?: string; timeZone?: string };
export type GEvent = {
  id: string;
  status?: string;
  summary?: string;
  colorId?: string;
  htmlLink?: string;
  start?: GEventTime;
  end?: GEventTime;
  recurringEventId?: string;
  recurrence?: string[];
  attendees?: { self?: boolean; responseStatus?: string }[];
};

export function googleEventToCal(ev: GEvent, tz: string): CalEvent | null {
  if (ev.status === "cancelled" || !ev.start) return null;
  if (ev.attendees?.some((a) => a.self && a.responseStatus === "declined")) return null;
  const base = {
    id: ev.id,
    title: ev.summary?.trim() || "(ללא כותרת)",
    color: googleToColor(ev.colorId),
    recurring: !!(ev.recurringEventId || ev.recurrence?.length),
    link: ev.htmlLink ?? null,
  };
  if (ev.start.date) {
    const lastDay = ev.end?.date ? addDays(ev.end.date, -1) : ev.start.date;
    return { ...base, date: ev.start.date, start: null, end: null, allDay: true, endDate: lastDay > ev.start.date ? lastDay : null };
  }
  if (!ev.start.dateTime) return null;
  const s = zonedNow(new Date(ev.start.dateTime), tz);
  const e = ev.end?.dateTime ? zonedNow(new Date(ev.end.dateTime), tz) : s;
  return { ...base, date: s.date, start: s.hm, end: e.hm, allDay: false, endDate: e.date > s.date ? e.date : null };
}

/** Body for events.insert / events.patch. Times are wall-clock in `tz` (Europe/Prague). */
export function calToGoogleEvent(input: EventInput, tz: string): Record<string, unknown> {
  const body: Record<string, unknown> = { summary: input.title };
  if (input.start) {
    const end = input.end && input.end >= input.start ? input.end : addMinutes(input.start, 60);
    const endDay = input.endDate && input.endDate > input.date ? input.endDate : input.date;
    body.start = { dateTime: `${input.date}T${input.start}:00`, timeZone: tz };
    body.end = { dateTime: `${endDay}T${end}:00`, timeZone: tz };
  } else {
    const last = input.endDate && input.endDate > input.date ? input.endDate : input.date;
    body.start = { date: input.date };
    body.end = { date: addDays(last, 1) }; // all-day end date is exclusive
  }
  const colorId = colorToGoogle(input.color);
  if (colorId) body.colorId = colorId;
  if (input.repeat) body.recurrence = [recurToRRule(input.repeat)];
  return body;
}
