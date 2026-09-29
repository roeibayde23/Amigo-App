import { session } from "./mock-gotrue.mjs";
const BASE = "http://localhost:3100";
const now = () => Math.floor(Date.now() / 1000);
const cookieFor = (s) => `sb-localhost-auth-token=base64-${Buffer.from(JSON.stringify(s)).toString("base64url")}`;
const mode = (m) => fetch(`http://localhost:54321/__mode?m=${m}`);
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };
async function get(path, cookie) {
  const r = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  const setCookies = r.headers.getSetCookie();
  return { status: r.status, location: r.headers.get("location"), setCookies, body: await r.text() };
}
const authCookies = (sc) => sc.filter((c) => c.startsWith("sb-localhost-auth-token"));
const decode = (sc) => {
  const c = authCookies(sc).find((x) => /=base64-/.test(x));
  return c ? JSON.parse(Buffer.from(c.split("=base64-")[1].split(";")[0], "base64url").toString()) : null;
};

// 1. access token expired (1h passed), refresh token valid → proxy refreshes and writes new cookies
await mode("ok");
let r = await get("/", cookieFor(session(now() - 60, "rt-1")));
const fresh = decode(r.setCookies);
check("expired access token → page loads (200), not /login", r.status === 200, `status ${r.status} ${r.location ?? ""}`);
check("refreshed session written back as cookie", !!fresh && fresh.refresh_token !== "rt-1", fresh ? `new refresh token ${fresh.refresh_token}` : "no cookie");
const maxAge = authCookies(r.setCookies)[0]?.match(/Max-Age=(\d+)/i)?.[1];
check("cookie is persistent (Max-Age 400 days), SameSite=Lax, Path=/", maxAge === String(400 * 86400) && /SameSite=Lax/i.test(authCookies(r.setCookies)[0]) && /Path=\//.test(authCookies(r.setCookies)[0]), `Max-Age=${maxAge}`);

// 2. the new cookie keeps working afterwards (no second refresh needed)
r = await get("/calendar", cookieFor(fresh));
check("next request with refreshed cookie → 200", r.status === 200, `status ${r.status}`);

// 3. API route with an expired token: refreshed in the proxy, route sees the user (409 reconnect Google, never 401)
r = await get("/api/calendar/events", cookieFor(session(now() - 60, fresh.refresh_token)));
check("API with expired access token → user still recognised", r.status === 409 && /reconnect/.test(r.body), `status ${r.status} ${r.body}`);
check("Google problem does not clear the Amigo session", !authCookies(r.setCookies).some((c) => /Max-Age=0/i.test(c)));

// 4. Supabase Auth unreachable while refreshing → NOT a sign-out
await mode("down");
r = await get("/", cookieFor(session(now() - 60, "rt-valid")));
check("auth server down → page still loads (no redirect to /login)", r.status === 200, `status ${r.status} ${r.location ?? ""}`);
check("auth server down → cookies are kept", !authCookies(r.setCookies).some((c) => /Max-Age=0/i.test(c)));
r = await get("/api/gmail/messages", cookieFor(session(now() - 60, "rt-valid")));
check("auth server down → API says 503 (try again), not 401", r.status === 503, `status ${r.status} ${r.body}`);
await mode("ok");

// 5. signed in + /login (home-screen icon saved on /login) → straight into the app
r = await get("/login", cookieFor(session(now() + 3000, "rt-valid")));
check("signed-in user opening /login → redirected to /", r.status === 307 && new URL(r.location, BASE).pathname === "/", `${r.status} ${r.location}`);
r = await get("/login?next=%2Fmail", cookieFor(session(now() + 3000, "rt-valid")));
check("…honours ?next=", r.status === 307 && new URL(r.location, BASE).pathname === "/mail", `${r.status} ${r.location}`);

// 6. genuinely revoked refresh token → login (expected)
r = await get("/", cookieFor(session(now() - 60, "rt-1"))); // rt-1 was rotated in step 1 (beyond reuse window in this mock)
check("revoked refresh token → /login (correct)", r.status === 307 && /\/login/.test(r.location ?? ""), `${r.status} ${r.location}`);

// 7. no cookie at all → /login, and /login renders
r = await get("/tasks", "");
check("signed out → /login?next=/tasks", r.status === 307 && /\/login\?next=%2Ftasks/.test(r.location ?? ""), r.location ?? "");
r = await get("/login", "");
check("/login renders when signed out", r.status === 200);
r = await get("/manifest.webmanifest", "");
check("manifest served with start_url / and standalone", r.status === 200 && /"start_url":"\/"/.test(r.body) && /standalone/.test(r.body), `status ${r.status}`);
r = await get("/apple-touch-icon.png", "");
check("apple-touch-icon.png served (was 404)", r.status === 200, `status ${r.status}`);

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
