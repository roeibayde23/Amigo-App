import "server-only";
import { APP_TIMEZONE } from "../env";
import { addDays } from "../dates";
import type { CalEvent, EventInput } from "../types";
import { googleFetch } from "./api";
import { calToGoogleEvent, googleEventToCal, type GEvent } from "./mapping";

const BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/** Events of the primary calendar overlapping [from, to] (YYYY-MM-DD, inclusive), expanded instances. */
export async function listEvents(token: string, from: string, to: string): Promise<CalEvent[]> {
  const out: CalEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    const q = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      timeZone: APP_TIMEZONE,
      // one day of slack on both sides; the UI filters by local date
      timeMin: `${addDays(from, -1)}T00:00:00Z`,
      timeMax: `${addDays(to, 2)}T00:00:00Z`,
    });
    if (pageToken) q.set("pageToken", pageToken);
    const res = await googleFetch<{ items?: GEvent[]; nextPageToken?: string }>(token, `${BASE}?${q}`);
    for (const ev of res.items ?? []) {
      const mapped = googleEventToCal(ev, APP_TIMEZONE);
      if (mapped && (mapped.endDate ?? mapped.date) >= from && mapped.date <= to) out.push(mapped);
    }
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export async function createEvent(token: string, input: EventInput): Promise<CalEvent> {
  const ev = await googleFetch<GEvent>(token, BASE, {
    method: "POST",
    body: JSON.stringify(calToGoogleEvent(input, APP_TIMEZONE)),
  });
  return googleEventToCal(ev, APP_TIMEZONE)!;
}

export async function updateEvent(token: string, id: string, input: EventInput): Promise<CalEvent> {
  const body = calToGoogleEvent(input, APP_TIMEZONE);
  delete body.recurrence; // editing a single occurrence; series rules are left untouched
  const ev = await googleFetch<GEvent>(token, `${BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return googleEventToCal(ev, APP_TIMEZONE)!;
}

export async function deleteEvent(token: string, id: string): Promise<void> {
  await googleFetch<void>(token, `${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
