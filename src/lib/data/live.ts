"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "../supabase/client";
import type { CalEvent, MailApiResponse, Recur, Task } from "../types";
import type { MailLoad, MailPatch, NewEvent, NewTask, Repo } from "./repo";

type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  recur_freq: "daily" | "weekly" | "monthly" | null;
  recur_weekdays: number[] | null;
  recur_month_day: number | null;
  last_done_on: string | null;
  source_gmail_id: string | null;
  created_at: string;
};
type EventRow = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  color: string;
};

function rowToTask(r: TaskRow): Task {
  let recur: Recur | null = null;
  if (r.recur_freq === "daily") recur = { freq: "daily" };
  if (r.recur_freq === "weekly") recur = { freq: "weekly", weekdays: r.recur_weekdays ?? [] };
  if (r.recur_freq === "monthly") recur = { freq: "monthly", monthDay: r.recur_month_day ?? 1 };
  return {
    id: r.id,
    title: r.title,
    done: r.done,
    recur,
    lastDoneOn: r.last_done_on,
    sourceGmailId: r.source_gmail_id,
    createdAt: r.created_at,
  };
}

function taskToRow(t: Partial<Task>): Partial<TaskRow> {
  const row: Partial<TaskRow> = {};
  if (t.title !== undefined) row.title = t.title;
  if (t.done !== undefined) row.done = t.done;
  if (t.lastDoneOn !== undefined) row.last_done_on = t.lastDoneOn;
  if (t.sourceGmailId !== undefined) row.source_gmail_id = t.sourceGmailId;
  if (t.recur !== undefined) {
    row.recur_freq = t.recur?.freq ?? null;
    row.recur_weekdays = t.recur?.freq === "weekly" ? t.recur.weekdays : null;
    row.recur_month_day = t.recur?.freq === "monthly" ? t.recur.monthDay : null;
  }
  return row;
}

const hm = (t: string | null) => (t ? t.slice(0, 5) : null);
const rowToEvent = (r: EventRow): CalEvent => ({
  id: r.id,
  title: r.title,
  date: r.event_date,
  start: hm(r.start_time),
  end: hm(r.end_time),
  color: r.color,
});
function eventToRow(e: Partial<CalEvent>): Partial<EventRow> {
  const row: Partial<EventRow> = {};
  if (e.title !== undefined) row.title = e.title;
  if (e.date !== undefined) row.event_date = e.date;
  if (e.start !== undefined) row.start_time = e.start || null;
  if (e.end !== undefined) row.end_time = e.end || null;
  if (e.color !== undefined) row.color = e.color;
  return row;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createLiveRepo(userId: string): Repo {
  const sb: SupabaseClient = getBrowserSupabase();
  return {
    mode: "live",

    async listTasks() {
      const data = check(await sb.from("tasks").select("*").order("created_at", { ascending: false }));
      return (data as TaskRow[]).map(rowToTask);
    },
    async addTask(t: NewTask) {
      const data = check(await sb.from("tasks").insert({ ...taskToRow(t), user_id: userId }).select().single());
      return rowToTask(data as TaskRow);
    },
    async updateTask(id, patch) {
      check(await sb.from("tasks").update(taskToRow(patch)).eq("id", id));
    },
    async deleteTask(id) {
      check(await sb.from("tasks").delete().eq("id", id));
    },

    async listEvents() {
      const data = check(
        await sb.from("events").select("*").order("event_date").order("start_time", { nullsFirst: true }),
      );
      return (data as EventRow[]).map(rowToEvent);
    },
    async addEvent(e: NewEvent) {
      const data = check(await sb.from("events").insert({ ...eventToRow(e), user_id: userId }).select().single());
      return rowToEvent(data as EventRow);
    },
    async updateEvent(id, patch) {
      check(await sb.from("events").update(eventToRow(patch)).eq("id", id));
    },
    async deleteEvent(id) {
      check(await sb.from("events").delete().eq("id", id));
    },

    async loadMail(): Promise<MailLoad> {
      try {
        const res = await fetch("/api/gmail/messages", { cache: "no-store" });
        const body = (await res.json()) as MailApiResponse;
        if (!body.ok) return { status: "error", error: body.error };
        return {
          status: "ok",
          mails: body.messages.map(({ hidden: _h, ...m }) => m),
          unreadCount: body.unreadCount,
          email: body.email,
        };
      } catch {
        return { status: "error", error: "gmail_failed" };
      }
    },
    async setMailState(id, patch: MailPatch) {
      check(
        await sb
          .from("mail_state")
          .upsert({ user_id: userId, gmail_message_id: id, ...patch }, { onConflict: "user_id,gmail_message_id" }),
      );
    },
    async markMailOpened() {
      /* read state comes from Gmail itself on next refresh */
    },
    async savePrefs(p) {
      const row: Record<string, unknown> = {};
      if (p.lang) row.lang = p.lang;
      if (p.dark !== undefined) row.dark_mode = p.dark;
      await sb.from("profiles").update(row).eq("id", userId);
    },
    async loadPrefs() {
      const { data } = await sb.from("profiles").select("lang, dark_mode").eq("id", userId).maybeSingle();
      return data ? { lang: data.lang as string, dark: !!data.dark_mode } : null;
    },
  };
}
