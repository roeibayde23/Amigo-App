// Voice route checks against a dev server on :3100 (see README). usage: node tests/voice/run-tests.mjs gemini|whisper
import { readFileSync } from "node:fs";
import { session } from "../auth/mock-gotrue.mjs";
const MODE = process.argv[2] || "gemini";
if (MODE === "gemini") await import("./mock-gemini.mjs");
const BASE = "http://localhost:3100";
const now = () => Math.floor(Date.now() / 1000);
const COOKIE = `sb-localhost-auth-token=base64-${Buffer.from(JSON.stringify(session(now() + 3000, "rt-valid"))).toString("base64url")}`;
const TODAY = "2026-09-29";
const m4a = readFileSync(new URL("./fixtures/maya-tomorrow-9.m4a", import.meta.url));
const webm = readFileSync(new URL("./fixtures/maya-tomorrow-9.webm", import.meta.url));
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };
const gem = (m) => fetch(`http://localhost:54322/__mode?m=${m}`);
const last = () => fetch("http://localhost:54322/__last").then((r) => r.json());

async function post(bytes, type, cookie = COOKIE) {
  const form = new FormData();
  form.append("audio", new File([bytes], type.includes("webm") ? "speech.webm" : "speech.m4a", { type }));
  form.append("lang", "he");
  form.append("today", TODAY);
  const r = await fetch(`${BASE}/api/voice`, { method: "POST", body: form, headers: { cookie } });
  return { status: r.status, json: await r.json().catch(() => null) };
}

let r = await fetch(`${BASE}/api/voice`, { headers: { cookie: COOKIE } }).then(async (x) => ({ status: x.status, json: await x.json() }));
check(`GET /api/voice → configured (${MODE})`, r.status === 200 && r.json.configured === true, JSON.stringify(r.json));
r = await fetch(`${BASE}/api/voice`, { method: "POST", body: new FormData() });
check("signed out → 401 (no transcription for strangers)", r.status === 401, `status ${r.status}`);

// iPhone recording (audio/mp4 AAC) of "פגישה עם מאיה מחר ב-9"
r = await post(m4a, "audio/mp4");
console.log("      reply:", JSON.stringify(r.json));
if (MODE === "gemini") {
  const p = r.json?.parsed;
  check("iPhone m4a → 200 with transcript", r.status === 200 && r.json.transcript === "פגישה עם מאיה מחר ב-9");
  check("parsed: event 'פגישה עם מאיה' tomorrow (2026-09-30) 09:00", p?.type === "event" && p.title === "פגישה עם מאיה" && p.date === "2026-09-30" && p.time === "09:00", JSON.stringify(p));
  const L = await last();
  check("sent as audio/mp4, all bytes, JSON mode, today in prompt", L.mimeType === "audio/mp4" && L.audioBytes === m4a.length && L.jsonMode && L.today === TODAY, JSON.stringify(L));
  check("API key sent in header, never in the URL", L.keyHeader && !L.keyInUrl);
  r = await post(webm, "audio/webm;codecs=opus");
  check("Chrome webm → audio/webm", r.status === 200 && (await last()).mimeType === "audio/webm");
  await gem("retired");
  r = await post(m4a, "audio/mp4");
  check("retired model (404) → falls back to next model", r.status === 200 && /gemini-2\.5-flash/.test(r.json?.provider), r.json?.provider);
  await gem("busy");
  r = await post(m4a, "audio/mp4");
  check("rate limit → 429 voice_busy (UI: 'try again in a minute')", r.status === 429 && r.json?.error === "voice_busy", `status ${r.status}`);
  await gem("silence");
  r = await post(m4a, "audio/mp4");
  check("no speech in recording → 422 no_speech", r.status === 422 && r.json?.error === "no_speech", `status ${r.status}`);
  await gem("ok");
} else {
  // real speech-to-text (local Whisper large-v3-turbo behind the Groq/OpenAI code path) + Amigo's parser
  const { classify } = await import("../../src/lib/classify.ts");
  const { STRINGS } = await import("../../src/lib/i18n.ts");
  const parse = (t) => classify(t, STRINGS.he, "he", TODAY);
  check("iPhone m4a → 200 with a Hebrew transcript", r.status === 200 && /[א-ת]/.test(r.json?.transcript ?? ""), r.json?.transcript);
  console.log("      parsed:", JSON.stringify(parse(r.json?.transcript ?? "")));
  const w = await fetch("http://127.0.0.1:54323/").then((x) => x.json());
  const c = w.calls.at(-1);
  check("sent as speech.m4a, language he, bearer auth", c?.filename === "speech.m4a" && c.language === "he" && c.auth, JSON.stringify({ ...c, text: undefined }));
  r = await post(webm, "audio/webm;codecs=opus");
  console.log("      reply:", JSON.stringify(r.json));
  const p = parse(r.json?.transcript ?? "");
  console.log("      parsed:", JSON.stringify(p));
  check("Chrome webm → 200 with a Hebrew transcript", r.status === 200 && /[א-ת]/.test(r.json?.transcript ?? ""), r.json?.transcript);
  check("transcript parses to an event tomorrow at 09:00", p.type === "event" && p.date === "2026-09-30" && p.time === "09:00");
}
r = await post(Buffer.alloc(100), "audio/mp4");
check("empty recording → 422 no_speech", r.status === 422 && r.json?.error === "no_speech", `status ${r.status}`);

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
