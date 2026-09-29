"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEMO_MODE } from "@/lib/env";
import { STRINGS, type Strings } from "@/lib/i18n";
import { zonedNow } from "@/lib/dates";
import { togglePatch, isTaskDone } from "@/lib/recurrence";
import { demoRepo } from "@/lib/data/demo";
import { createLiveRepo } from "@/lib/data/live";
import type { NewEvent, NewTask, Repo } from "@/lib/data/repo";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { CalEvent, Lang, Mail, MailError, Task } from "@/lib/types";

type MailStatus = "loading" | "ok" | MailError;
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
  mails: Mail[];
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
  addTask(t: Omit<NewTask, "done" | "lastDoneOn" | "sourceGmailId"> & Partial<NewTask>): Promise<void>;
  toggleTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  addEvent(e: NewEvent): Promise<void>;
  updateEvent(id: string, patch: Partial<CalEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  reloadMail(): Promise<void>;
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
  const [mails, setMails] = useState<Mail[]>([]);
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
      try {
        const [t, e] = await Promise.all([repo.listTasks(strings), repo.listEvents(strings, today)]);
        if (cancelled) return;
        setTasks(t);
        setEvents(e);
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setReady(true);
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

  const value = useMemo<Ctx>(() => {
    const today = clock.date;
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
      mails,
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
      async addTask(t) {
        if (!repo) return;
        try {
          const task = await repo.addTask({ done: false, lastDoneOn: null, sourceGmailId: null, ...t });
          setTasks((prev) => [task, ...prev]);
        } catch (e) {
          fail(e);
        }
      },
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
        if (!repo) return;
        try {
          const ev = await repo.addEvent(e);
          setEvents((prev) => [...prev, ev]);
        } catch (err) {
          fail(err);
        }
      },
      async updateEvent(id, patch) {
        if (!repo) return;
        const before = events;
        setEvents((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
        try {
          await repo.updateEvent(id, patch);
        } catch (err) {
          setEvents(before);
          fail(err);
        }
      },
      async deleteEvent(id) {
        if (!repo) return;
        const before = events;
        setEvents((prev) => prev.filter((x) => x.id !== id));
        try {
          await repo.deleteEvent(id);
        } catch (err) {
          setEvents(before);
          fail(err);
        }
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
        if (!repo) return;
        try {
          const task = await repo.addTask({
            title: m.subject.slice(0, 300),
            done: false,
            recur: null,
            lastDoneOn: null,
            sourceGmailId: DEMO_MODE ? null : m.id,
          });
          setTasks((prev) => [task, ...prev]);
          showToast(STRINGS[lang].addedToTasksToast);
        } catch (e) {
          fail(e);
        }
      },
    };
  }, [lang, s, dark, ready, clock, tasks, events, mails, mailStatus, unreadCount, userEmail, sheet, toast, repo, showToast, fail, loadMail]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
