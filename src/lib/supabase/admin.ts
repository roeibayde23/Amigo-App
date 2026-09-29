import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../env";
import { SUPABASE_SECRET_KEY } from "../env.server";

/** Service-role client. Bypasses RLS – use ONLY on the server, only for google_tokens. */
export function createAdminSupabase() {
  if (!SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
