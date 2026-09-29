"use client";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import { startGoogleSignIn } from "./GoogleSignInButton";
import { addDays } from "@/lib/dates";
import { SHORTCUT_NAME, sendToReminders } from "@/lib/reminders";

/** Highlight the literal values the user has to type in the Shortcuts app. */
function withCode(text: string) {
  return text.split(/(Amigo Reminder|\btitle\b|\bdue\b)/).map((part, i) =>
    i % 2 ? <code key={i}>{part}</code> : part,
  );
}

export default function SettingsSheet() {
  const app = useApp();
  const { s, lang, dark, demo, sheet, userEmail, mailStatus, remindersOn, today } = app;
  const close = () => app.openSheet(null);

  return (
    <BottomSheet open={sheet === "settings"} onClose={close} title={s.settingsTitle} closeLabel={s.close}>
      <div className="settings-row">
        <span className="settings-label">{s.darkModeLabel}</span>
        <label className="switch">
          <input type="checkbox" checked={dark} onChange={(e) => app.setDark(e.target.checked)} />
          <span className="switch-track" />
        </label>
      </div>

      <div className="settings-row">
        <span className="settings-label">{s.emailLabel}</span>
        {demo ? (
          <span className="soon-badge">{s.demoMode}</span>
        ) : mailStatus === "reconnect" || mailStatus === "not_configured" || app.calStatus === "reconnect" ? (
          <span className="settings-value">
            {mailStatus === "reconnect" || app.calStatus === "reconnect" ? (
              <button className="link-btn" onClick={() => startGoogleSignIn("/")}>{s.reconnectGoogleBtn}</button>
            ) : (
              <span className="soon-badge">{s.emailSoon}</span>
            )}
          </span>
        ) : (
          <span className="settings-value" dir="ltr">
            {userEmail ?? ""} <span className="soon-badge">{s.connected}</span>
          </span>
        )}
      </div>

      <div className="settings-row">
        <span className="settings-label">{s.langLabel}</span>
        <div className="lang-toggle">
          <button className={lang === "he" ? "active" : ""} onClick={() => app.setLang("he")}>עברית</button>
          <button className={lang === "en" ? "active" : ""} onClick={() => app.setLang("en")}>English</button>
        </div>
      </div>

      <div className="settings-block">
        <div className="settings-top">
          <div>
            <div className="settings-label">{s.remindersLabel}</div>
            <div className="settings-sub">{s.remindersSub}</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={remindersOn} onChange={(e) => app.setRemindersOn(e.target.checked)} />
            <span className="switch-track" />
          </label>
        </div>
        <details className="guide">
          <summary>{s.remindersGuideTitle}</summary>
          <ol>
            {s.remindersGuide.map((step, i) => <li key={i}>{withCode(step)}</li>)}
          </ol>
          <div className="guide-actions">
            <button
              className="pill-btn secondary"
              onClick={() => sendToReminders(s.remindersTestTitle, addDays(today, 1), "09:00", true)}
            >
              {s.remindersTest}
            </button>
            <span className="settings-sub" dir="ltr">{SHORTCUT_NAME}</span>
          </div>
          <p className="settings-sub" style={{ paddingBottom: 10 }}>{s.remindersIosOnly}</p>
        </details>
      </div>

      {!demo && (
        <div className="settings-row">
          <span className="settings-label" />
          <form action="/auth/signout" method="post">
            <button type="submit" className="link-btn">{s.signOut}</button>
          </form>
        </div>
      )}
    </BottomSheet>
  );
}
