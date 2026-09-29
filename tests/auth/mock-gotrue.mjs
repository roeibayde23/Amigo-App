// Minimal fake Supabase Auth + PostgREST for testing Amigo's session refresh (no real secrets).
import http from "node:http";
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
export const jwt = (exp, sid = "s1") =>
  `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: "u1", aud: "authenticated", role: "authenticated", email: "23roei23@gmail.com", exp, iat: exp - 3600, session_id: sid })}.sig`;
const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "23roei23@gmail.com", app_metadata: { provider: "google" }, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" };
export const state = { mode: "ok", used: new Set(), active: new Set(["rt-1", "rt-valid"]), calls: [] };
let n = 1;
const now = () => Math.floor(Date.now() / 1000);
export const session = (exp, rt) => ({ access_token: jwt(exp), refresh_token: rt, expires_in: 3600, expires_at: exp, token_type: "bearer", user });

http.createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  const url = new URL(req.url, "http://x");
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  state.calls.push(`${req.method} ${url.pathname}${url.search}`);
  if (url.pathname === "/__state") return send(200, { calls: state.calls, used: [...state.used] });
  if (url.pathname === "/__mode") { state.mode = url.searchParams.get("m"); state.calls = []; return send(200, { mode: state.mode }); }
  if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "refresh_token") {
    if (state.mode === "down") return send(503, { message: "upstream unavailable" });
    const { refresh_token } = JSON.parse(body || "{}");
    if (state.used.has(refresh_token)) return send(400, { code: 400, error_code: "refresh_token_already_used", msg: "Invalid Refresh Token: Already Used" });
    if (!state.active.has(refresh_token)) return send(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" });
    state.active.delete(refresh_token); state.used.add(refresh_token);
    const rt = `rt-${++n}`; state.active.add(rt);
    return send(200, session(now() + 3600, rt));
  }
  if (url.pathname === "/auth/v1/user") {
    const tok = (req.headers.authorization || "").replace(/^Bearer /, "");
    try {
      const p = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString());
      if (p.exp > now()) return send(200, user);
    } catch {}
    return send(403, { code: 403, error_code: "bad_jwt", msg: "invalid JWT: token is expired" });
  }
  if (url.pathname.endsWith("/.well-known/jwks.json")) return send(200, { keys: [] });
  if (url.pathname.startsWith("/rest/v1/")) return send(200, []); // no rows (e.g. google_tokens) 
  send(404, { msg: "not mocked " + url.pathname });
}).listen(54321, () => console.log("mock gotrue on :54321"));
