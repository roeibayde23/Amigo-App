"use client";
import Image from "next/image";
import { useApp } from "./AppProvider";
import { startGoogleSignIn } from "./GoogleSignInButton";

/** One-time re-consent for the new Google Calendar permission (or an expired token). */
export default function ReconnectGoogleCard({
  next = "/",
  compact = false,
  kind = "calendar",
}: {
  next?: string;
  compact?: boolean;
  kind?: "calendar" | "mail";
}) {
  const { s } = useApp();
  const title = kind === "mail" ? s.reconnectTitle : s.reconnectGoogleTitle;
  const body = kind === "mail" ? s.reconnectBody : s.reconnectGoogleBody;
  return (
    <div className={`notice-card${compact ? " compact" : ""}`}>
      {!compact && <Image className="notice-dog" src="/images/amigo-headset.webp" alt="" width={228} height={320} />}
      <h3>{title}</h3>
      <p>{body}</p>
      <button className="pill-btn" onClick={() => startGoogleSignIn(next)}>{s.reconnectGoogleBtn}</button>
    </div>
  );
}
