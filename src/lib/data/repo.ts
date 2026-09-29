import type { Strings } from "../i18n";
import type { SenderPrefs } from "../mailPriority";
import type { ApiError, CalEvent, Mail, MailError, Recur, Task } from "../types";

export type NewTask = Omit<Task, "id" | "createdAt">;
export type NewEvent = Omit<CalEvent, "id"> & { repeat?: Recur | null };
export type MailPatch = { important?: boolean; hidden?: boolean };

export type MailLoad =
  | { status: "ok"; mails: Mail[]; unreadCount: number; email: string | null }
  | { status: "error"; error: MailError };

/** Thrown by repos so the UI can show the right (Hebrew) message / reconnect card. */
export class RepoError extends Error {
  constructor(
    public code: ApiError,
    public reason?: string,
  ) {
    super(reason ? `${code}: ${reason}` : code);
  }
}

/** Same interface for demo (localStorage) and live (Supabase + Google) data. */
export interface Repo {
  mode: "demo" | "live";
  listTasks(s: Strings): Promise<Task[]>;
  addTask(t: NewTask): Promise<Task>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  /** Events overlapping [from, to] (YYYY-MM-DD). Live: primary Google Calendar. */
  listEvents(s: Strings, today: string, from: string, to: string): Promise<CalEvent[]>;
  addEvent(e: NewEvent): Promise<CalEvent>;
  updateEvent(id: string, patch: Partial<CalEvent>, full: CalEvent): Promise<CalEvent>;
  deleteEvent(id: string): Promise<void>;
  loadMail(s: Strings): Promise<MailLoad>;
  setMailState(id: string, patch: MailPatch): Promise<void>;
  markMailOpened(id: string): Promise<void>;
  loadSenderPrefs(): Promise<SenderPrefs>;
  setSenderPref(email: string, important: boolean | null): Promise<void>;
  savePrefs(p: { lang?: string; dark?: boolean }): Promise<void>;
  loadPrefs(): Promise<{ lang: string; dark: boolean } | null>;
}

/** Browser-local sender answers (demo mode, or live before migration 0002 is applied). */
const LOCAL_PREFS = "amigo_sender_prefs_v1";
export function readLocalSenderPrefs(): SenderPrefs {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PREFS) ?? "{}") as SenderPrefs;
  } catch {
    return {};
  }
}
export function writeLocalSenderPref(email: string, important: boolean | null) {
  const all = readLocalSenderPrefs();
  if (important === null) delete all[email];
  else all[email] = important;
  try {
    localStorage.setItem(LOCAL_PREFS, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}
