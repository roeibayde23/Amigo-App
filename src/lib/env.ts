// Public (browser-safe) configuration. NEXT_PUBLIC_* values are inlined at build time,
// so they must be referenced literally.

function clean(v: string | undefined): string {
  const s = (v ?? "").trim();
  // Treat obvious placeholders as "not set".
  if (!s || s.includes("<") || /^your[-_]/i.test(s) || /placeholder/i.test(s)) return "";
  return s;
}

export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = clean(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
export const SITE_URL = clean(process.env.NEXT_PUBLIC_SITE_URL);
export const APP_TIMEZONE = clean(process.env.NEXT_PUBLIC_APP_TIMEZONE) || "Europe/Prague";

/** Demo mode = no Supabase config (or explicitly forced). UI runs on mock data in localStorage. */
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "1" || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY;

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
