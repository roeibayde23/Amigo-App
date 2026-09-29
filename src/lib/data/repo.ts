import type { Strings } from "../i18n";
import type { CalEvent, Mail, MailError, Task } from "../types";

export type NewTask = Omit<Task, "id" | "createdAt">;
export type NewEvent = Omit<CalEvent, "id">;
export type MailPatch = { important?: boolean; hidden?: boolean };

export type MailLoad =
  | { status: "ok"; mails: Mail[]; unreadCount: number; email: string | null }
  | { status: "error"; error: MailError };

/** Same interface for demo (localStorage) and live (Supabase + Gmail) data. */
export interface Repo {
  mode: "demo" | "live";
  listTasks(s: Strings): Promise<Task[]>;
  addTask(t: NewTask): Promise<Task>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  listEvents(s: Strings, today: string): Promise<CalEvent[]>;
  addEvent(e: NewEvent): Promise<CalEvent>;
  updateEvent(id: string, patch: Partial<CalEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  loadMail(s: Strings): Promise<MailLoad>;
  setMailState(id: string, patch: MailPatch): Promise<void>;
  markMailOpened(id: string): Promise<void>;
  savePrefs(p: { lang?: string; dark?: boolean }): Promise<void>;
  loadPrefs(): Promise<{ lang: string; dark: boolean } | null>;
}
