"use client";
import { COLORS, type CalEvent, type Mail, type Task } from "../types";
import type { MailLoad, MailPatch, NewEvent, NewTask, Repo } from "./repo";

// Demo mode: everything lives in this browser's localStorage (v2 keys, not the prototype's).
const TASKS = "amigo_demo_tasks_v2";
const EVENTS = "amigo_demo_events_v2";
const MAIL = "amigo_demo_mail_state_v2";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

type DemoMailState = Record<string, { important?: boolean; hidden?: boolean; opened?: boolean }>;

export const demoRepo: Repo = {
  mode: "demo",

  async listTasks(s) {
    const stored = read<Task[]>(TASKS);
    if (stored) return stored;
    const now = Date.now();
    const seeded: Task[] = s.defaultTasks.map((d, i) => ({
      id: uid(),
      title: d.text,
      done: !!d.done,
      recur: d.recurring ? { freq: "monthly", monthDay: 1 } : null,
      lastDoneOn: null,
      sourceGmailId: null,
      createdAt: new Date(now - i * 1000).toISOString(),
    }));
    write(TASKS, seeded);
    return seeded;
  },
  async addTask(t: NewTask) {
    const task: Task = { ...t, id: uid(), createdAt: new Date().toISOString() };
    write(TASKS, [task, ...(read<Task[]>(TASKS) ?? [])]);
    return task;
  },
  async updateTask(id, patch) {
    write(TASKS, (read<Task[]>(TASKS) ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)));
  },
  async deleteTask(id) {
    write(TASKS, (read<Task[]>(TASKS) ?? []).filter((t) => t.id !== id));
  },

  async listEvents(s, today) {
    const stored = read<CalEvent[]>(EVENTS);
    if (stored) return stored;
    const seeded: CalEvent[] = s.defaultEvents.map((d) => ({
      id: uid(),
      title: d.title,
      date: today,
      start: d.time,
      end: d.endTime,
      color: COLORS[d.color % COLORS.length],
    }));
    write(EVENTS, seeded);
    return seeded;
  },
  async addEvent(e: NewEvent) {
    const ev: CalEvent = { ...e, id: uid() };
    write(EVENTS, [...(read<CalEvent[]>(EVENTS) ?? []), ev]);
    return ev;
  },
  async updateEvent(id, patch) {
    write(EVENTS, (read<CalEvent[]>(EVENTS) ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)));
  },
  async deleteEvent(id) {
    write(EVENTS, (read<CalEvent[]>(EVENTS) ?? []).filter((e) => e.id !== id));
  },

  async loadMail(s): Promise<MailLoad> {
    const state = read<DemoMailState>(MAIL) ?? {};
    const now = Date.now();
    const mails: Mail[] = s.demoMail
      .map((m, i) => {
        const id = `demo-${i + 1}`; // stable ids (prototype used array positions)
        const st = state[id] ?? {};
        return {
          id,
          threadId: id,
          from: m.from,
          fromEmail: "",
          subject: m.subject,
          snippet: m.preview,
          date: new Date(now - (i + 1) * 45 * 60_000).toISOString(),
          unread: i < 2 && !st.opened, // demo: two unread, one already read
          important: !!st.important,
          hidden: !!st.hidden,
        };
      })
      .filter((m) => !m.hidden)
      .map(({ hidden: _hidden, ...m }) => m);
    return { status: "ok", mails, unreadCount: mails.filter((m) => m.unread).length, email: null };
  },
  async setMailState(id, patch: MailPatch) {
    const state = read<DemoMailState>(MAIL) ?? {};
    state[id] = { ...state[id], ...patch };
    write(MAIL, state);
  },
  async markMailOpened(id) {
    const state = read<DemoMailState>(MAIL) ?? {};
    state[id] = { ...state[id], opened: true };
    write(MAIL, state);
  },
  async savePrefs() {
    /* demo: prefs live in cookies only */
  },
  async loadPrefs() {
    return null;
  },
};
