import { CALENDAR_SCOPE } from "@/lib/env";
import { deleteEvent, updateEvent } from "@/lib/google/calendar";
import { apiJson, readJson, withGoogle } from "@/lib/google/route";
import { parseEventInput } from "@/lib/google/validate";
import type { EventInput } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/calendar/events/:id – edit (a single occurrence for recurring events). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withGoogle([CALENDAR_SCOPE], async ({ token }) => {
    const input = parseEventInput(await readJson<Partial<EventInput>>(req));
    return apiJson({ ok: true, event: await updateEvent(token, id, input) });
  });
}

/** DELETE /api/calendar/events/:id */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return withGoogle([CALENDAR_SCOPE], async ({ token }) => {
    await deleteEvent(token, id);
    return apiJson({ ok: true });
  });
}
