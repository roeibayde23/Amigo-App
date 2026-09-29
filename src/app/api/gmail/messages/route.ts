import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/env";
import { gmailServerConfigured } from "@/lib/env.server";
import { GmailAuthError, inboxUnreadCount, listRecentInbox } from "@/lib/google/gmail";
import { getGoogleAccessToken, invalidateAccessToken, ReconnectRequiredError } from "@/lib/google/tokens";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MailApiResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

function json(body: MailApiResponse, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  if (DEMO_MODE) return json({ ok: false, error: "demo" }, 400);

  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);
  if (!gmailServerConfigured()) return json({ ok: false, error: "not_configured" }, 503);

  try {
    let token = await getGoogleAccessToken(user.id);
    let messages, inboxUnread;
    try {
      [messages, inboxUnread] = await Promise.all([listRecentInbox(token), inboxUnreadCount(token)]);
    } catch (e) {
      if (!(e instanceof GmailAuthError)) throw e;
      invalidateAccessToken(user.id); // cached token revoked – retry once with a fresh one
      token = await getGoogleAccessToken(user.id);
      [messages, inboxUnread] = await Promise.all([listRecentInbox(token), inboxUnreadCount(token)]);
    }

    // Merge per-user UI state (important / hidden) – RLS limits this to the user's own rows.
    const ids = messages.map((m) => m.id);
    const { data: states } = ids.length
      ? await supabase.from("mail_state").select("gmail_message_id, important, hidden").in("gmail_message_id", ids)
      : { data: [] };
    const byId = new Map((states ?? []).map((s) => [s.gmail_message_id as string, s]));

    const merged = messages
      .map((m) => ({ ...m, important: !!byId.get(m.id)?.important, hidden: !!byId.get(m.id)?.hidden }))
      .filter((m) => !m.hidden);

    return json({
      ok: true,
      messages: merged,
      unreadCount: merged.filter((m) => m.unread).length,
      inboxUnread,
      email: user.email ?? null,
    });
  } catch (e) {
    if (e instanceof ReconnectRequiredError) return json({ ok: false, error: "reconnect", reason: e.reason }, 409);
    console.error("[gmail] failed:", e instanceof Error ? e.message : e);
    return json({ ok: false, error: "gmail_failed" }, 502);
  }
}
