import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE, GOOGLE_SCOPES } from "@/lib/env";
import { gmailServerConfigured, isAllowedEmail } from "@/lib/env.server";
import { grantedScopesOf, saveRefreshToken } from "@/lib/google/tokens";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeNext(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

function baseUrl(request: NextRequest): string {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV !== "development" && forwardedHost) return `https://${forwardedHost}`;
  return origin;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const base = baseUrl(request);
  const fail = (reason: string) => NextResponse.redirect(`${base}/auth/error?reason=${encodeURIComponent(reason)}`);

  if (DEMO_MODE) return NextResponse.redirect(`${base}/`);

  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (oauthError) return fail(oauthError);

  const code = url.searchParams.get("code");
  if (!code) return fail("missing_code");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || !data.user) return fail("exchange_failed");

  const email = data.user.email ?? "";
  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return fail("not_allowed");
  }

  // provider_refresh_token is ONLY available right here – Supabase does not store it.
  const refreshToken = data.session.provider_refresh_token;
  if (refreshToken && gmailServerConfigured()) {
    try {
      // Store the scopes Google actually granted (the user can untick boxes on the consent screen).
      const providerToken = data.session.provider_token;
      const granted = (providerToken && (await grantedScopesOf(providerToken))) || GOOGLE_SCOPES.join(" ");
      await saveRefreshToken(data.user.id, email, refreshToken, granted);
    } catch (e) {
      console.error("[auth/callback] could not store Google token:", e instanceof Error ? e.message : e);
    }
  } else if (!refreshToken) {
    console.warn("[auth/callback] Google returned no refresh token (check access_type=offline & prompt=consent)");
  } else {
    console.warn("[auth/callback] Gmail server secrets missing – refresh token not stored");
  }

  return NextResponse.redirect(`${base}${safeNext(url.searchParams.get("next"))}`);
}
