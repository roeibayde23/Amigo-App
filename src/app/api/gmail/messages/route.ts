import { GMAIL_SCOPE } from "@/lib/env";
import { inboxUnreadCount, listRecentInbox } from "@/lib/google/gmail";
import { apiJson, withGoogle } from "@/lib/google/route";

export const dynamic = "force-dynamic";

/** GET /api/gmail/messages – recent inbox (metadata only) + unread count, merged with mail_state. */
export async function GET() {
  return withGoogle([GMAIL_SCOPE], async ({ token, supabase, email }) => {
    const [messages, inboxUnread] = await Promise.all([listRecentInbox(token), inboxUnreadCount(token)]);

    // Per-user UI state (important / hidden) – RLS limits this to the user's own rows.
    const ids = messages.map((m) => m.id);
    const { data: states } = ids.length
      ? await supabase.from("mail_state").select("gmail_message_id, important, hidden").in("gmail_message_id", ids)
      : { data: [] };
    const byId = new Map((states ?? []).map((s) => [s.gmail_message_id as string, s]));
    const merged = messages
      .map((m) => ({ ...m, important: !!byId.get(m.id)?.important, hidden: !!byId.get(m.id)?.hidden }))
      .filter((m) => !m.hidden);

    return apiJson({
      ok: true,
      messages: merged,
      unreadCount: merged.filter((m) => m.unread).length,
      inboxUnread,
      email,
    });
  });
}
