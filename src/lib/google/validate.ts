import "server-only";
import { BadRequest } from "./route";
import type { EventInput, Recur } from "../types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function recur(v: unknown): Recur | null {
  if (v == null) return null;
  const r = v as Recur;
  if (r.freq === "daily") return { freq: "daily" };
  if (r.freq === "weekly" && Array.isArray(r.weekdays) && r.weekdays.length && r.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))
    return { freq: "weekly", weekdays: r.weekdays };
  if (r.freq === "monthly" && Number.isInteger(r.monthDay) && r.monthDay >= 1 && r.monthDay <= 31)
    return { freq: "monthly", monthDay: r.monthDay };
  throw new BadRequest("invalid recurrence");
}

export function parseEventInput(b: Partial<EventInput>): EventInput {
  const title = String(b.title ?? "").trim().slice(0, 300);
  if (!title) throw new BadRequest("title required");
  if (!b.date || !DATE.test(b.date)) throw new BadRequest("date must be YYYY-MM-DD");
  const start = b.start ? String(b.start) : null;
  const end = b.end ? String(b.end) : null;
  if (start && !TIME.test(start)) throw new BadRequest("start must be HH:MM");
  if (end && !TIME.test(end)) throw new BadRequest("end must be HH:MM");
  if (b.endDate && !DATE.test(b.endDate)) throw new BadRequest("endDate must be YYYY-MM-DD");
  return { title, date: b.date, start, end, color: b.color, endDate: b.endDate ?? null, repeat: recur(b.repeat) };
}
