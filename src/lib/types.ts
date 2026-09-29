export type Lang = "he" | "en";

export type Recur =
  | { freq: "daily" }
  | { freq: "weekly"; weekdays: number[] } // 0 = Sunday
  | { freq: "monthly"; monthDay: number };

export type Task = {
  id: string;
  title: string;
  done: boolean;
  recur: Recur | null;
  lastDoneOn: string | null; // recurring tasks: YYYY-MM-DD of last completion
  sourceGmailId: string | null;
  createdAt: string;
  dueDate?: string | null; // YYYY-MM-DD
  dueTime?: string | null; // HH:MM
};

export type CalEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (start date, Europe/Prague)
  start: string | null; // HH:MM, null = all-day
  end: string | null; // HH:MM
  color: string;
  endDate?: string | null; // last day for multi-day events
  allDay?: boolean;
  recurring?: boolean; // instance of a recurring Google series
  link?: string | null; // Google Calendar web link
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
  important: boolean; // user's manual "important" flag (mail_state)
  gmailImportant?: boolean;
  starred?: boolean;
  category?: string | null;
  bulk?: boolean;
};

/** Error codes returned by our API routes (UI maps them to Hebrew/English messages). */
export type ApiError =
  | "demo"
  | "unauthorized"
  | "not_configured"
  | "reconnect"
  | "api_disabled"
  | "not_found"
  | "bad_request"
  | "google_failed"
  | "gmail_failed";

export type MailError = ApiError;

export type ApiFail = { ok: false; error: ApiError; reason?: string };

export type MailApiResponse =
  | { ok: true; messages: (Mail & { hidden: boolean })[]; unreadCount: number; inboxUnread: number; email: string | null }
  | ApiFail;

export type EventInput = {
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  color?: string;
  endDate?: string | null;
  repeat?: Recur | null;
};

export const COLORS = ["#D96C5A", "#8B5CF6", "#4FA3D1", "#4CAF7D", "#E0A93E", "#D6699A"] as const;
/** Colour shown for Google events that use the calendar's default colour. */
export const DEFAULT_EVENT_COLOR = "#B8874A";
