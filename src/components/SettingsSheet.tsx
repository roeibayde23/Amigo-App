"use client";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import { startGoogleSignIn } from "./GoogleSignInButton";

export default function SettingsSheet() {
  const app = useApp();
  const { s, lang, dark, demo, sheet, userEmail, mailStatus } = app;
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
        ) : mailStatus === "reconnect" || mailStatus === "not_configured" ? (
          <span className="settings-value">
            {mailStatus === "reconnect" ? (
              <button className="link-btn" onClick={() => startGoogleSignIn("/mail")}>{s.reconnectBtn}</button>
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
