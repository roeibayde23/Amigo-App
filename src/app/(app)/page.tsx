"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import ReconnectGoogleCard from "@/components/ReconnectGoogleCard";
import { BulbIcon, CalendarIcon, MailIcon, TasksIcon } from "@/components/icons";
import { greetingKey, shortDate } from "@/lib/dates";
import { playBark, preloadBark } from "@/lib/bark";
import { pickSuggestion } from "@/lib/suggestion";

export default function DashboardPage() {
  const app = useApp();
  const { s, lang, hour, ready, today, now } = app;
  const router = useRouter();
  const [barking, setBarking] = useState(false);
  const [greetHello, greetSub] = s.greet[greetingKey(hour)];

  useEffect(() => preloadBark(), []);

  function dogTap() {
    playBark(); // real audio file, started inside the tap (required by iPhone Safari)
    setBarking(true);
    setTimeout(() => setBarking(false), 420);
    app.openSheet("mic");
  }

  const sug = pickSuggestion(app.events, app.mails, app.tasks, today, now, app.senderPrefs);
  const sugData =
    sug.kind === "event"
      ? { href: "/calendar", Icon: CalendarIcon, label: s.suggestEventLabel, title: sug.event.title,
          meta: (sug.event.date === today ? "" : shortDate(sug.event.date, s, lang) + (sug.event.start ? " · " : "")) + (sug.event.start ?? (sug.event.date === today ? s.allDay : "")) }
      : sug.kind === "mail"
        ? { href: "/mail", Icon: MailIcon, label: s.suggestMailLabel, title: sug.mail.subject, meta: sug.mail.from }
        : sug.kind === "task"
          ? { href: "/tasks", Icon: TasksIcon, label: s.suggestTaskLabel, title: sug.task.title, meta: "" }
          : { href: null, Icon: BulbIcon, label: "", title: s.suggestNone, meta: s.suggestNoneMeta };

  return (
    <div className="view active">
      <div className="greeting">
        <h1 suppressHydrationWarning>
          {greetHello} <span className="name">{s.name}</span> 👋
        </h1>
        <p suppressHydrationWarning>{greetSub}</p>
      </div>

      <div className="hero">
        <button className={`dog-wrap${barking ? " bark" : ""}`} onClick={dogTap} aria-label={s.micTitle}>
          <Image src="/images/amigo-dog.webp" alt="Amigo" width={389} height={460} priority />
        </button>
      </div>

      <div className="menu">
        <button className="menu-btn" onClick={() => router.push("/mail")}>
          {ready && <span className="badge">{app.unreadCount}</span>}
          <div className="menu-icon"><MailIcon /></div>
          <span>{s.menuMail}</span>
        </button>
        <button className="menu-btn" onClick={() => router.push("/calendar")}>
          <div className="menu-icon"><CalendarIcon /></div>
          <span>{s.menuCal}</span>
        </button>
        <button className="menu-btn" onClick={() => router.push("/tasks")}>
          {ready && <span className="badge">{app.openTaskCount}</span>}
          <div className="menu-icon"><TasksIcon /></div>
          <span>{s.menuTasks}</span>
        </button>
      </div>

      {ready && !app.demo && app.calStatus === "reconnect" && <ReconnectGoogleCard next="/" compact />}

      {ready && (
        <button className="suggest-card" onClick={() => sugData.href && router.push(sugData.href)}>
          <div className="suggest-icon"><sugData.Icon sw={2} /></div>
          <div className="suggest-body">
            {sugData.label && <div className="suggest-label">{sugData.label}</div>}
            <div className="suggest-title">{sugData.title}</div>
            {sugData.meta && <div className="suggest-meta">{sugData.meta}</div>}
          </div>
        </button>
      )}
    </div>
  );
}
