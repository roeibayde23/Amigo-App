import { CALENDAR_SCOPE } from "@/lib/env";
import { addDays, zonedNow } from "@/lib/dates";
import { createEvent, listEvents } from "@/lib/google/calendar";
import { apiJson, BadRequest, readJson, withGoogle } from "@/lib/google/route";
import { parseEventInput } from "@/lib/google/validate";
import type { EventInput } from "@/lib/types";

export const dynamic = "force-dynamic";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD – primary Google Calendar. */
export async function GET(req: Request) {
  return withGoogle([CALENDAR_SCOPE], async ({ token }) => {
    const url = new URL(req.url);
    const today = zonedNow().date;
    const from = url.searchParams.get("from") ?? addDays(today, -7);
    const to = url.searchParams.get("to") ?? addDays(today, 60);
    if (!DATE.test(from) || !DATE.test(to) || to < from) throw new BadRequest("invalid range");
    return apiJson({ ok: true, from, to, events: await listEvents(token, from, to) });
  });
}

/** POST /api/calendar/events – create (optionally recurring) event. */
export async function POST(req: Request) {
  return withGoogle([CALENDAR_SCOPE], async ({ token }) => {
    const input = parseEventInput(await readJson<Partial<EventInput>>(req));
    return apiJson({ ok: true, event: await createEvent(token, input) }, 201);
  });
}
