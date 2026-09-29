"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEMO_MODE } from "@/lib/env";
import { STRINGS, type Strings } from "@/lib/i18n";
import { addDays, zonedNow } from "@/lib/dates";
import { togglePatch, isTaskDone } from "@/lib/recurrence";
import { demoRepo } from "@/lib/data/demo";
import { createLiveRepo } from "@/lib/data/live";
import { RepoError, type NewEvent, type NewTask, type Repo } from "@/lib/data/repo";
import { senderKey, type SenderPrefs } from "@/lib/mailPriority";
import { remindersEnabled, sendToReminders, setRemindersEnabled } from "@/lib/reminders";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { ApiError, CalEvent, Lang, Mail, MailError, Task } from "@/lib/types";

type MailStatus = "loading" | "ok" | MailError;
type CalStatus = "loading" | "ok" | ApiError;
type Range = { from: string; to: string };
export type TaskDraft = Pick<Task, "title"> & Partial<Omit<NewTask, "title">>;
/** Initial window of events fetched from Google (the calendar page widens it on demand). */
const INITIAL_BACK = 31;
const INITIAL_AHEAD = 92;
type Sheet = "mic" | "settings" | null;

type Ctx = {
  lang: Lang;
  s: Strings;
  dark: boolean;
  demo: boolean;
  ready: boolean;
  today: string;
  now: string; // HH:MM in app timezone
  hour: number;
  tasks: Task[];
  events: CalEvent[];
  calStatus: CalStatus;
  mails: Mail[];
  senderPrefs: SenderPrefs;
  remindersOn: boolean;
  mailStatus: MailStatus;
  unreadCount: number;
  openTaskCount: number;
  userEmail: string | null;
  sheet: Sheet;
  toast: string | null;
  setLang(l: Lang): void;
  setDark(on: boolean): void;
  openSheet(s: Sheet): void;
  showToast(msg: string): void;
  /** Saves to Amigo (Supabase / demo) and – if enabled on iPhone – opens the Reminders shortcut.
   *  Call straight from a tap handler (the shortcut launch needs the user gesture). */
  addTask(t: TaskDraft): Promise<boolean>;
  toggleTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  addEvent(e: NewEvent): Promise<boolean>;
  updateEvent(id: string, patch: Partial<CalEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  ensureEvents(date: string): void;
  reloadEvents(): Promise<void>;
  reloadMail(): Promise<void>;
  setSenderPref(m: Mail, important: boolean): Promise<void>;
  setRemindersOn(on: boolean): void;
  toggleImportant(id: string): Promise<void>;
  hideMail(id: string): Promise<void>;
  openMail(m: Mail): void;
  mailToTask(m: Mail): Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export default function AppProvider({
  children,
  initialLang,
  initialDark,
  hasPrefCookie,
}: {
  children: ReactNode;
  initialLang: Lang;
  initialDark: boolean;
  hasPrefCookie: boolean;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [dark, setDarkState] = useState(initialDark);
  const [clock, setClock] = useState(() => zonedNow());
  const [repo, setRepo] = useState<Repo | null>(DEMO_MODE ? demoRepo : null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calStatus, setCalStatus] = useState<CalStatus>("loading");
  const rangeRef = useRef<Range | null>(null);
  const [mails, setMails] = useState<Mail[]>([]);
  const [senderPrefs, setSenderPrefs] = useState<SenderPrefs>({});
  const [remindersOn, setRemindersOnState] = useState(true);
  const [mailStatus, setMailStatus] = useState<MailStatus>("loading");
  const [unreadCount, setUnreadCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const s = STRINGS[lang];

  // Clock in Europe/Prague (or NEXT_PUBLIC_APP_TIMEZONE), ticking every 30s.
  useEffect(() => {
    const id = setInterval(() => setClock(zonedNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // Resolve the live repo (needs the signed-in user id).
  useEffect(() => {
    if (DEMO_MODE) return;
    let cancelled = false;
    getBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled || !data.user) return;
        setUserEmail(data.user.email ?? null);
        setRepo(createLiveRepo(data.user.id));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMail = useCallback(
    async (r: Repo) => {
      const res = await r.loadMail(STRINGS[lang]);
      if (res.status === "ok") {
        setMails(res.mails);
        setUnreadCount(res.unreadCount);
        if (res.email) setUserEmail(res.email);
        setMailStatus("ok");
      } else {
        setMails([]);
        setUnreadCount(0);
        setMailStatus(res.error);
      }
    },
    [lang],
  );

  // Initial data load.
  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    (async () => {
      const strings = STRINGS[initialLang];
      const today = zonedNow().date;
      const range = { from: addDays(today, -INITIAL_BACK), to: addDays(today, INITIAL_AHEAD) };
      setRemindersOnState(remindersEnabled());
      const [t, e, p] = await Promise.allSettled([
        repo.listTasks(strings),
        repo.listEvents(strings, today, range.from, range.to),
        repo.loadSenderPrefs(),
      ]);
      if (cancelled) return;
      if (t.status === "fulfilled") setTasks(t.value);
      else console.error(t.reason);
      if (e.status === "fulfilled") {
        rangeRef.current = range;
        setEvents(e.value);
        setCalStatus("ok");
      } else {
        console.error(e.reason);
        setCalStatus(e.reason instanceof RepoError ? e.reason.code : "google_failed");
      }
      if (p.status === "fulfilled") setSenderPrefs(p.value);
      setReady(true);
      if (!hasPrefCookie) {
        const prefs = await repo.loadPrefs().catch(() => null);
        if (prefs && !cancelled) {
          applyLang(prefs.lang === "en" ? "en" : "he");
          applyDark(prefs.dark);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, initialLang, hasPrefCookie]);

  // Mail (demo text follows the UI language).
  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    repo.loadMail(STRINGS[lang]).then((res) => {
      if (cancelled) return;
      if (res.status === "ok") {
        setMails(res.mails);
        setUnreadCount(res.unreadCount);
        if (res.email) setUserEmail(res.email);
        setMailStatus("ok");
      } else {
        setMails([]);
        setUnreadCount(0);
        setMailStatus(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repo, lang]);

  function applyLang(l: Lang) {
    setLangState(l);
    const root = document.documentElement;
    root.setAttribute("lang", l);
    root.setAttribute("dir", l === "he" ? "rtl" : "ltr");
    setCookie("amigo_lang", l);
  }
  function applyDark(on: boolean) {
    setDarkState(on);
    document.documentElement.classList.toggle("dark", on);
    setCookie("amigo_dark", on ? "1" : "0");
  }

  const fail = useCallback(
    (err: unknown) => {
      console.error(err);
      showToast(STRINGS[lang].dataError);
    },
    [lang, showToast],
  );

  /** Google Calendar write failed → Hebrew toast; a reconnect need also flips the calendar card. */
  const gFail = useCallback(
    (err: unknown) => {
      console.error(err);
      const st = STRINGS[lang];
      const code = err instanceof RepoError ? err.code : null;
      if (code === "reconnect" || code === "unauthorized") {
        setCalStatus("reconnect");
        showToast(st.gReconnectToast);
      } else if (code === "api_disabled") showToast(st.gApiDisabled);
      else if (code === "not_found") showToast(st.gNotFound);
      else showToast(DEMO_MODE ? st.dataError : st.gSaveFailed);
    },
    [lang, showToast],
  );

  /** Merge-fetch events for a window (used when the calendar jumps outside what's loaded). */
  const fetchRange = useCallback(
    async (r: Repo, range: Range, replace: boolean) => {
      try {
        const list = await r.listEvents(STRINGS[lang], zonedNow().date, range.from, range.to);
        setEvents((prev) => {
          if (replace) return list;
          const inRange = (e: CalEvent) => (e.endDate ?? e.date) >= range.from && e.date <= range.to;
          const ids = new Set(list.map((e) => e.id));
          return [...prev.filter((e) => !inRange(e) && !ids.has(e.id)), ...list];
        });
        setCalStatus("ok");
      } catch (err) {
        console.error(err);
        setCalStatus(err instanceof RepoError ? err.code : "google_failed");
      }
    },
    [lang],
  );

  const value = useMemo<Ctx>(() => {
    const today = clock.date;
    const addTask = async (t: TaskDraft): Promise<boolean> => {
      if (!repo) return false;
      const draft: NewTask = {
        done: false,
        recur: null,
        lastDoneOn: null,
        sourceGmailId: null,
        dueDate: null,
        dueTime: null,
        ...t,
      };
      // Launch the iOS Shortcut synchronously (still inside the tap); the insert below is already
      // on the wire before Safari switches to the Shortcuts app.
      const save = repo.addTask(draft);
      const sent = remindersOn && sendToReminders(draft.title, draft.dueDate, draft.dueTime);
      try {
        const task = await save;
        setTasks((prev) => [task, ...prev]);
        showToast(sent ? STRINGS[lang].sentToReminders : STRINGS[lang].savedTasksToast);
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    };
    return {
      lang,
      s,
      dark,
      demo: DEMO_MODE,
      ready,
      today,
      now: clock.hm,
      hour: clock.hour,
      tasks,
      events,
      calStatus,
      mails,
      senderPrefs,
      remindersOn,
      mailStatus,
      unreadCount,
      openTaskCount: tasks.filter((t) => !isTaskDone(t, today)).length,
      userEmail,
      sheet,
      toast,
      setLang(l) {
        applyLang(l);
        repo?.savePrefs({ lang: l }).catch(() => {});
      },
      setDark(on) {
        applyDark(on);
        repo?.savePrefs({ dark: on }).catch(() => {});
      },
      openSheet: setSheet,
      showToast,
      addTask,
      async toggleTask(id) {
        const task = tasks.find((x) => x.id === id);
        if (!repo || !task) return;
        const patch = togglePatch(task, today);
        setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
        try {
          await repo.updateTask(id, patch);
        } catch (e) {
          setTasks((prev) => prev.map((x) => (x.id === id ? task : x)));
          fail(e);
        }
      },
      async deleteTask(id) {
        if (!repo) return;
        const before = tasks;
        setTasks((prev) => prev.filter((x) => x.id !== id));
        try {
          await repo.deleteTask(id);
        } catch (e) {
          setTasks(before);
          fail(e);
        }
      },
      async addEvent(e) {
        if (!repo) return false;
        try {
          const ev = await repo.addEvent(e);
          if (e.repeat && rangeRef.current) await fetchRange(repo, rangeRef.current, false);
          else setEvents((prev) => [...prev.filter((x) => x.id !== ev.id), ev]);
          showToast(repo.mode === "live" ? STRINGS[lang].savedCalendarToast : STRINGS[lang].savedDemoEvent);
          return true;
        } catch (err) {
          gFail(err);
          return false;
        }
      },
      async updateEvent(id, patch) {
        const old = events.find((x) => x.id === id);
        if (!repo || !old) return;
        const before = events;
        const full = { ...old, ...patch };
        setEvents((prev) => prev.map((x) => (x.id === id ? full : x)));
        try {
          const saved = await repo.updateEvent(id, patch, full);
          setEvents((prev) => prev.map((x) => (x.id === id ? saved : x)));
          if (repo.mode === "demo" && old.recurring && rangeRef.current) await fetchRange(repo, rangeRef.current, true);
        } catch (err) {
          setEvents(before);
          gFail(err);
        }
      },
      async deleteEvent(id) {
        if (!repo) return;
        const before = events;
        const old = events.find((x) => x.id === id);
        setEvents((prev) => prev.filter((x) => x.id !== id));
        try {
          await repo.deleteEvent(id);
          if (repo.mode === "demo" && old?.recurring && rangeRef.current) await fetchRange(repo, rangeRef.current, true);
        } catch (err) {
          setEvents(before);
          gFail(err);
        }
      },
      ensureEvents(date) {
        const r = rangeRef.current;
        if (!repo || !r || (date >= r.from && date <= r.to)) return;
        const next = { from: date < r.from ? addDays(date, -31) : r.from, to: date > r.to ? addDays(date, 62) : r.to };
        rangeRef.current = next;
        void fetchRange(repo, date < r.from ? { from: next.from, to: r.from } : { from: r.to, to: next.to }, false);
      },
      async reloadEvents() {
        if (!repo) return;
        setCalStatus("loading");
        const range = rangeRef.current ?? { from: addDays(today, -INITIAL_BACK), to: addDays(today, INITIAL_AHEAD) };
        rangeRef.current = range;
        await fetchRange(repo, range, true);
      },
      async reloadMail() {
        if (!repo) return;
        setMailStatus("loading");
        await loadMail(repo);
      },
      async toggleImportant(id) {
        const m = mails.find((x) => x.id === id);
        if (!repo || !m) return;
        setMails((prev) => prev.map((x) => (x.id === id ? { ...x, important: !m.important } : x)));
        try {
          await repo.setMailState(id, { important: !m.important });
        } catch (err) {
          setMails((prev) => prev.map((x) => (x.id === id ? m : x)));
          fail(err);
        }
      },
      async hideMail(id) {
        const m = mails.find((x) => x.id === id);
        if (!repo || !m) return;
        const before = mails;
        setMails((prev) => prev.filter((x) => x.id !== id));
        if (m.unread) setUnreadCount((n) => Math.max(0, n - 1));
        try {
          await repo.setMailState(id, { hidden: true });
        } catch (err) {
          setMails(before);
          fail(err);
        }
      },
      openMail(m) {
        const url = DEMO_MODE
          ? "https://mail.google.com/"
          : `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(m.threadId)}`;
        window.open(url, "_blank", "noopener");
        if (m.unread) {
          setMails((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: false } : x)));
          setUnreadCount((n) => Math.max(0, n - 1));
          repo?.markMailOpened(m.id).catch(() => {});
        }
      },
      async mailToTask(m) {
        await addTask({
          title: (m.subject || m.from).slice(0, 300),
          sourceGmailId: DEMO_MODE ? null : m.id,
        });
      },
      async setSenderPref(m, important) {
        if (!repo || !m.fromEmail) return;
        const key = senderKey(m.fromEmail);
        const before = senderPrefs;
        setSenderPrefs((p) => ({ ...p, [key]: important }));
        const st = STRINGS[lang];
        showToast(important ? st.senderImportantToast(m.from) : st.senderLowToast(m.from));
        try {
          await repo.setSenderPref(key, important);
        } catch (err) {
          setSenderPrefs(before);
          fail(err);
        }
      },
      setRemindersOn(on) {
        setRemindersEnabled(on);
        setRemindersOnState(on);
      },
    };
  }, [lang, s, dark, ready, clock, tasks, events, calStatus, mails, senderPrefs, remindersOn, mailStatus, unreadCount, userEmail, sheet, toast, repo, showToast, fail, gFail, fetchRange, loadMail]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
