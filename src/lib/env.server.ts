import "server-only";

function clean(v: string | undefined): string {
  const s = (v ?? "").trim();
  if (!s || s.includes("<") || /^your[-_]/i.test(s) || /placeholder/i.test(s)) return "";
  return s;
}

export const SUPABASE_SECRET_KEY = clean(
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
export const GOOGLE_CLIENT_ID = clean(process.env.GOOGLE_CLIENT_ID);
export const GOOGLE_CLIENT_SECRET = clean(process.env.GOOGLE_CLIENT_SECRET);
export const TOKEN_ENCRYPTION_KEY = clean(process.env.TOKEN_ENCRYPTION_KEY);
export const GMAIL_QUERY =
  clean(process.env.GMAIL_QUERY) || "in:inbox newer_than:14d -category:promotions -category:social";

export const ALLOWED_EMAILS = (clean(process.env.ALLOWED_EMAILS) || "23roei23@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && ALLOWED_EMAILS.includes(email.toLowerCase());
}

/** Everything the server needs to store and use the Google refresh token. */
export function gmailServerConfigured(): boolean {
  return !!(SUPABASE_SECRET_KEY && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && TOKEN_ENCRYPTION_KEY);
}
