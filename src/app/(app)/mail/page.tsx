"use client";
import Image from "next/image";
import { useApp } from "@/components/AppProvider";
import SubHeader from "@/components/SubHeader";
import { startGoogleSignIn } from "@/components/GoogleSignInButton";
import { LinkIcon, PersonIcon, TasksIcon, TrashIcon } from "@/components/icons";
import { mailDateTag } from "@/lib/dates";

export default function MailPage() {
  const app = useApp();
  const { s, lang, mails, mailStatus, today } = app;

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

      {mailStatus === "reconnect" && (
        <div className="notice-card">
          <Image className="notice-dog" src="/images/amigo-headset.webp" alt="" width={228} height={320} />
          <h3>{s.reconnectTitle}</h3>
          <p>{s.reconnectBody}</p>
          <button className="pill-btn" onClick={() => startGoogleSignIn("/mail")}>{s.reconnectBtn}</button>
        </div>
      )}

      {(mailStatus === "not_configured" || mailStatus === "gmail_failed" || mailStatus === "unauthorized") && (
        <div className="notice-card">
          <p>{mailStatus === "not_configured" ? s.mailNotConfigured : s.mailFailed}</p>
          <button className="pill-btn secondary" onClick={() => app.reloadMail()}>{s.retry}</button>
        </div>
      )}

      {mailStatus === "ok" && mails.length === 0 && <div className="empty-note">{s.noMails}</div>}

      {mailStatus === "ok" &&
        mails.map((m) => (
          <div key={m.id} className={`mail-card${m.important ? " important" : ""}${m.unread ? " unread" : ""}`}>
            {m.important && <span className="important-sticker">{s.importantStickerText}</span>}
            <div className="mail-row1">
              <span className="mail-tag">{mailDateTag(m.date, today, s, lang)}</span>
              <span className="mail-from" title={m.fromEmail}>{m.from}</span>
            </div>
            <div className="mail-subject">{m.subject}</div>
            <div className="mail-preview">{m.snippet}</div>
            <div className="mail-actions">
              <button className="mail-action" onClick={() => app.openMail(m)}>
                <LinkIcon /><span>{s.actOpen}</span>
              </button>
              <button className={`mail-action${m.important ? " on" : ""}`} onClick={() => app.toggleImportant(m.id)} aria-pressed={m.important}>
                <PersonIcon /><span>{s.actImportant}</span>
              </button>
              <button className="mail-action" onClick={() => app.mailToTask(m)}>
                <TasksIcon /><span>{s.actTask}</span>
              </button>
              <button className="mail-action" onClick={() => app.hideMail(m.id)}>
                <TrashIcon /><span>{s.actHide}</span>
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
