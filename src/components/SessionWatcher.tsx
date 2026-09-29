"use client";
import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * On /login: if a session already exists (e.g. the Google sign-in finished in iOS's in-app
 * browser sheet of the home-screen app, or in another tab), go straight into the app.
 * Re-checks whenever the page becomes visible again.
 */
export default function SessionWatcher({ next }: { next?: string }) {
  useEffect(() => {
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    let done = false;
    const check = async () => {
      if (done || document.visibilityState === "hidden") return;
      const { data } = await getBrowserSupabase().auth.getSession();
      if (data.session && !done) {
        done = true;
        window.location.replace(target);
      }
    };
    void check();
    const onVis = () => void check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [next]);
  return null;
}
