"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "../supabase/client";
import { senderKey, type SenderPrefs } from "../mailPriority";
import type { ApiFail, CalEvent, EventInput, MailApiResponse, Recur, Task } from "../types";
import {
  readLocalSenderPrefs,
  RepoError,
  writeLocalSenderPref,
  type MailLoad,
  type MailPatch,
  type NewEvent,
  type NewTask,
  type Repo,
} from "./repo";

// Live mode:
//  • tasks, mail choices, sender answers, settings → Supabase (RLS: own rows only)
//  • events → the user's primary Google Calendar, via our /api/calendar routes
//  • mail → Gmail, via /api/gmail/messages

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
  due_date?: string | null;
  due_time?: string | null;
};

const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

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
    dueDate: r.due_date ?? null,
    dueTime: hm(r.due_time),
  };
}

function taskToRow(t: Partial<Task>, withDue: boolean): Partial<TaskRow> {
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
  if (withDue) {
    if (t.dueDate !== undefined) row.due_date = t.dueDate || null;
    if (t.dueTime !== undefined) row.due_time = t.dueTime || null;
  }
  return row;
}

type PgErr = { message: string; code?: string } | null;
/** Column/table from migration 0002 missing (PostgREST schema cache / Postgres codes). */
const isMissingSchema = (e: PgErr) =>
  !!e && (["PGRST204", "PGRST205", "42703", "42P01"].includes(e.code ?? "") || /could not find|does not exist/i.test(e.message));

function check<T>(res: { data: T; error: PgErr }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "content-type": "application/json" } : undefined,
    });
  } catch {
    throw new RepoError("google_failed", "network");
  }
  const body = (await res.json().catch(() => null)) as (T & { ok: true }) | ApiFail | null;
  if (!body) throw new RepoError("google_failed", `HTTP ${res.status}`);
  if (!body.ok) throw new RepoError(body.error, body.reason);
  return body as T;
}

function eventInput(e: NewEvent | CalEvent, repeat?: Recur | null): EventInput {
  return {
    title: e.title,
    date: e.date,
    start: e.start,
    end: e.end,
    color: e.color,
    endDate: e.endDate ?? null,
    repeat: repeat ?? null,
  };
}

export function createLiveRepo(userId: string): Repo {
  const sb: SupabaseClient = getBrowserSupabase();
  let hasDueCols = true; // flips to false if migration 0002 isn't applied yet
  let hasPrefsTable = true;

  return {
    mode: "live",

    async listTasks() {
      const data = check(await sb.from("tasks").select("*").order("created_at", { ascending: false }));
      const rows = data as TaskRow[];
      if (rows.length && !("due_date" in rows[0])) hasDueCols = false;
      return rows.map(rowToTask);
    },
    async addTask(t: NewTask) {
      let res = await sb.from("tasks").insert({ ...taskToRow(t, hasDueCols), user_id: userId }).select().single();
      if (res.error && hasDueCols && isMissingSchema(res.error)) {
        hasDueCols = false;
        res = await sb.from("tasks").insert({ ...taskToRow(t, false), user_id: userId }).select().single();
      }
      const task = rowToTask(check(res) as TaskRow);
      // keep the due date in the UI for this session even if the DB can't store it yet
      return hasDueCols ? task : { ...task, dueDate: t.dueDate ?? null, dueTime: t.dueTime ?? null };
    },
    async updateTask(id, patch) {
      let res = await sb.from("tasks").update(taskToRow(patch, hasDueCols)).eq("id", id);
      if (res.error && hasDueCols && isMissingSchema(res.error)) {
        hasDueCols = false;
        res = await sb.from("tasks").update(taskToRow(patch, false)).eq("id", id);
      }
      check(res);
    },
    async deleteTask(id) {
      check(await sb.from("tasks").delete().eq("id", id));
    },

    async listEvents(_s, _today, from, to) {
      const q = new URLSearchParams({ from, to });
      const body = await api<{ events: CalEvent[] }>(`/api/calendar/events?${q}`);
      return body.events;
    },
    async addEvent(e: NewEvent) {
      const body = await api<{ event: CalEvent }>("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify(eventInput(e, e.repeat)),
      });
      return body.event;
    },
    async updateEvent(id, _patch, full) {
      const body = await api<{ event: CalEvent }>(`/api/calendar/events/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(eventInput(full)),
      });
      return body.event;
    },
    async deleteEvent(id) {
      await api(`/api/calendar/events/${encodeURIComponent(id)}`, { method: "DELETE" });
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

    async loadSenderPrefs() {
      const local = readLocalSenderPrefs();
      if (!hasPrefsTable) return local;
      const { data, error } = await sb.from("mail_sender_prefs").select("sender_email, important");
      if (error) {
        if (isMissingSchema(error)) hasPrefsTable = false;
        return local;
      }
      const out: SenderPrefs = { ...local };
      for (const r of data ?? []) out[senderKey(r.sender_email as string)] = !!r.important;
      return out;
    },
    async setSenderPref(email, important) {
      const key = senderKey(email);
      writeLocalSenderPref(key, important); // always keep a local copy (works before migration 0002)
      if (!hasPrefsTable) return;
      const res =
        important === null
          ? await sb.from("mail_sender_prefs").delete().eq("sender_email", key)
          : await sb
              .from("mail_sender_prefs")
              .upsert({ user_id: userId, sender_email: key, important }, { onConflict: "user_id,sender_email" });
      if (res.error) {
        if (isMissingSchema(res.error)) hasPrefsTable = false;
        else throw new Error(res.error.message);
      }
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
