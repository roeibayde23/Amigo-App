export type Lang = "he" | "en";

export type Recur =
  | { freq: "daily" }
  | { freq: "weekly"; weekdays: number[] } // 0 = Sunday
  | { freq: "monthly"; monthDay: number };

export type Task = {
  id: string;
  title: string;
  done: boolean; // one-off tasks
  recur: Recur | null;
  lastDoneOn: string | null; // recurring: YYYY-MM-DD of last completion
  sourceGmailId: string | null;
  createdAt: string;
};

export type CalEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string | null; // HH:MM
  end: string | null; // HH:MM
  color: string;
};

export type Mail = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string; // ISO
  unread: boolean;
  important: boolean;
};

export type MailError = "demo" | "unauthorized" | "not_configured" | "reconnect" | "gmail_failed";

export type MailApiResponse =
  | { ok: true; messages: (Mail & { hidden: boolean })[]; unreadCount: number; inboxUnread: number; email: string | null }
  | { ok: false; error: MailError; reason?: string };

export const COLORS = ["#D96C5A", "#8B5CF6", "#4FA3D1", "#4CAF7D", "#E0A93E", "#D6699A"] as const;
