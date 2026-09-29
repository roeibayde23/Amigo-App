import "server-only";
import { GMAIL_QUERY } from "../env.server";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailAuthError extends Error {}

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string; // ISO
  unread: boolean;
};

async function gmailFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 401) throw new GmailAuthError("Gmail rejected the access token");
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

export function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || m[2], email: m[2].trim() };
  return { name: raw.trim(), email: raw.trim() };
}

type ListResp = { messages?: { id: string; threadId: string }[] };
type MsgResp = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function listRecentInbox(accessToken: string, max = 15): Promise<GmailMessage[]> {
  const q = encodeURIComponent(GMAIL_QUERY);
  const list = await gmailFetch<ListResp>(`/messages?maxResults=${max}&q=${q}`, accessToken);
  const ids = list.messages ?? [];
  const msgs = await mapLimit(ids, 5, (m) =>
    gmailFetch<MsgResp>(
      `/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      accessToken,
    ),
  );
  return msgs
    .map((m) => {
      const h = (name: string) =>
        m.payload?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase())?.value ?? "";
      const from = parseFrom(h("From"));
      return {
        id: m.id,
        threadId: m.threadId,
        from: from.name,
        fromEmail: from.email,
        subject: h("Subject") || "(ללא נושא)",
        snippet: decodeEntities(m.snippet ?? ""),
        date: new Date(Number(m.internalDate ?? Date.now())).toISOString(),
        unread: (m.labelIds ?? []).includes("UNREAD"),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function inboxUnreadCount(accessToken: string): Promise<number> {
  const label = await gmailFetch<{ messagesUnread?: number }>(`/labels/INBOX`, accessToken);
  return label.messagesUnread ?? 0;
}
