"use client";
import { useState } from "react";
import { GOOGLE_SCOPES, SITE_URL } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Starts Supabase Google OAuth: Gmail read-only + Calendar events + Tasks, offline access (refresh token). */
export async function startGoogleSignIn(next?: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
  const redirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const { error } = await getBrowserSupabase().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: GOOGLE_SCOPES.join(" "),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
}

export default function GoogleSignInButton({ next, label }: { next?: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        className="login-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await startGoogleSignIn(next);
          } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
            setBusy(false);
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/>
        </svg>
        <span>{busy ? "…" : label}</span>
      </button>
      {err && <p className="login-note">{err}</p>}
    </>
  );
}
