// Real speech-to-text smoke test with the fixture "פגישה עם מאיה מחר ב-9" (uses a real key, never prints it).
// usage: npx tsx --conditions=react-server tests/voice/smoke-real.mjs [keyfile] [audio]
//   keyfile default: /home/box/amigo-secrets/gemini_api_key
import { readFileSync } from "node:fs";

const keyFile = process.argv[2] || "/home/box/amigo-secrets/gemini_api_key";
const audioFile = process.argv[3] || new URL("./fixtures/maya-tomorrow-9.m4a", import.meta.url).pathname;
let key = "";
try {
  key = readFileSync(keyFile, "utf8").trim();
} catch {
  console.error(`no key file at ${keyFile}`);
  process.exit(2);
}
if (/groq/i.test(keyFile)) process.env.GROQ_API_KEY = key;
else if (/openai/i.test(keyFile)) process.env.OPENAI_API_KEY = key;
else process.env.GEMINI_API_KEY = key;

const { transcribe } = await import("../../src/lib/voice/transcribe.server.ts");
const { classify } = await import("../../src/lib/classify.ts");
const { STRINGS } = await import("../../src/lib/i18n.ts");
const today = "2026-09-29";
const t0 = Date.now();
const r = await transcribe({
  audio: new Uint8Array(readFileSync(audioFile)),
  mime: audioFile.endsWith(".webm") ? "audio/webm" : "audio/mp4",
  lang: "he",
  today,
});
const parsed = r.parsed ?? classify(r.transcript, STRINGS.he, "he", today);
console.log(JSON.stringify({ provider: r.provider, ms: Date.now() - t0, transcript: r.transcript, parsed, fromModel: !!r.parsed }, null, 1));
const ok = parsed.type === "event" && parsed.date === "2026-09-30" && parsed.time === "09:00" && /מאיה/.test(parsed.title);
console.log(ok ? "PASS  event 'פגישה עם מאיה' on 2026-09-30 at 09:00" : "FAIL  unexpected parse");
process.exit(ok ? 0 : 1);
