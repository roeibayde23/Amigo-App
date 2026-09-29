"use client";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import SubHeader from "@/components/SubHeader";
import ReconnectGoogleCard from "@/components/ReconnectGoogleCard";
import { EyeOffIcon, StarIcon, TasksIcon } from "@/components/icons";
import { mailTime } from "@/lib/dates";
import { groupMail, type Priority } from "@/lib/mailPriority";
import type { Mail } from "@/lib/types";

export default function MailPage() {
  const app = useApp();
  const { s, mails, mailStatus, senderPrefs } = app;
  const [showLow, setShowLow] = useState(false);
  const groups = groupMail(mails, senderPrefs);

  return (
    <div className="view active">
      <SubHeader />
      <div className="mailhead-row">
        <span className="mailhead-icon">📩</span>
        <span className="mailhead-title">{s.mailHeadTitle}</span>
        {mailStatus === "ok" && (
          <span className="demo-pill" style={{ marginInlineStart: "auto" }}>{s.mailCount(mails.length)}</span>
        )}
      </div>

      {mailStatus === "loading" && <div className="loading-note">{s.loading}</div>}
      {mailStatus === "reconnect" && <ReconnectGoogleCard next="/mail" kind="mail" />}
      {(mailStatus === "not_configured" || mailStatus === "gmail_failed" || mailStatus === "unauthorized" ||
        mailStatus === "google_failed" || mailStatus === "api_disabled") && (
        <div className="notice-card">
          <p>{mailStatus === "not_configured" ? s.mailNotConfigured : s.mailFailed}</p>
          <button className="pill-btn secondary" onClick={() => app.reloadMail()}>{s.retry}</button>
        </div>
      )}

      {mailStatus === "ok" && mails.length === 0 && <div className="empty-note">{s.noMails}</div>}

      {mailStatus === "ok" && groups.urgent.length > 0 && (
        <section className="mail-section urgent">
          <h2 className="mail-section-title">
            <span>🔥 {s.mailUrgent}</span>
            <span className="mail-section-count">{groups.urgent.length}</span>
          </h2>
          {groups.urgent.map(({ mail, p }) => <MailRow key={mail.id} m={mail} p={p} />)}
        </section>
      )}

      {mailStatus === "ok" && groups.normal.length > 0 && (
        <section className="mail-section">
          {groups.urgent.length > 0 && <h2 className="mail-section-title"><span>{s.mailOthers}</span></h2>}
          {groups.normal.map(({ mail, p }) => <MailRow key={mail.id} m={mail} p={p} />)}
        </section>
      )}

      {mailStatus === "ok" && groups.low.length > 0 && (
        <section className="mail-section low">
          <button className="mail-low-toggle" onClick={() => setShowLow((v) => !v)} aria-expanded={showLow}>
            {showLow ? s.hideLow : s.showLow(groups.low.length)}
          </button>
          {showLow && groups.low.map(({ mail, p }) => <MailRow key={mail.id} m={mail} p={p} />)}
        </section>
      )}
    </div>
  );
}

function MailRow({ m, p }: { m: Mail; p: Priority }) {
  const app = useApp();
  const { s, today } = app;
  return (
    <div className={`mail-row${m.unread ? " unread" : ""}${p.level === "urgent" ? " urgent" : ""}`}>
      <button className="mail-main" onClick={() => app.openMail(m)} title={m.fromEmail}>
        <span className="mail-line1">
          {m.unread && <span className="mail-dot" aria-hidden />}
          <span className="mail-sender">{m.from}</span>
          {p.level === "urgent" && (
            <span className={`mail-badge${p.keyword ? " hot" : ""}`}>{p.keyword ? s.badgeUrgent : s.badgeImportant}</span>
          )}
          <span className="mail-time" suppressHydrationWarning>{mailTime(m.date, today, s)}</span>
        </span>
        <span className="mail-subj">{m.subject || "—"}</span>
      </button>
      <div className="mail-icons">
        <button
          className={`mail-icon${m.important ? " on" : ""}`}
          onClick={() => app.toggleImportant(m.id)}
          aria-pressed={m.important}
          aria-label={s.actImportant}
          title={s.actImportant}
        >
          <StarIcon />
        </button>
        <button className="mail-icon" onClick={() => app.mailToTask(m)} aria-label={s.actTask} title={s.actTask}>
          <TasksIcon />
        </button>
        <button className="mail-icon" onClick={() => app.hideMail(m.id)} aria-label={s.actHide} title={s.actHide}>
          <EyeOffIcon />
        </button>
      </div>
      {p.ask && (
        <div className="mail-ask">
          <span>{s.askImportant}</span>
          <button onClick={() => app.setSenderPref(m, true)}>{s.yes}</button>
          <button onClick={() => app.setSenderPref(m, false)}>{s.no}</button>
        </div>
      )}
    </div>
  );
}
