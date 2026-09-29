import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../env";

const PUBLIC_PATHS = ["/login", "/auth"];

/** Refreshes the Supabase session cookie and guards app pages. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANT: getClaims() validates the JWT (refreshing an expired access token with the refresh
  // token and writing the new cookies through setAll); don't run code between client creation and this call.
  const { data, error } = await supabase.auth.getClaims();
  const hasSessionCookie = request.cookies.getAll().some((c) => /^sb-.+-auth-token/.test(c.name));
  // A flaky mobile network / Supabase hiccup is NOT a sign-out: keep the cookies and let the page load.
  const transient = !!error && hasSessionCookie && isTransientAuthError(error);
  const signedIn = !!data?.claims?.sub || transient;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  const isApi = path.startsWith("/api/");

  // Already signed in (e.g. the home-screen icon was saved on /login) → straight into the app.
  if (signedIn && !transient && path === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }

  if (!signedIn && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path !== "/") url.searchParams.set("next", path);
    return withCookies(NextResponse.redirect(url), response);
  }
  return response;
}

/** Copy refreshed/cleared auth cookies onto a redirect so they aren't lost. */
function withCookies(redirect: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

/** Network errors / 5xx from Supabase Auth – the session itself is still fine. */
export function isTransientAuthError(error: { name?: string; status?: number }): boolean {
  const n = error.name;
  return n === "AuthRetryableFetchError" || n === "AuthUnknownError" || (n === "AuthApiError" && (error.status ?? 0) >= 500);
}
