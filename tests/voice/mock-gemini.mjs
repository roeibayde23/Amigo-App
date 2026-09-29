// Fake Gemini generateContent endpoint (no real key). Checks the request Amigo sends and answers like
// Gemini would for the fixture recording "פגישה עם מאיה מחר ב-9".
import http from "node:http";
export const gem = { mode: "ok", last: null };
const answer = (today) => {
  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return { transcript: "פגישה עם מאיה מחר ב-9", type: "event", title: "פגישה עם מאיה", date: d.toISOString().slice(0, 10), time: "09:00" };
};
http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const url = new URL(req.url, "http://x");
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (url.pathname === "/__mode") { gem.mode = url.searchParams.get("m"); return send(200, {}); }
  if (url.pathname === "/__last") return send(200, gem.last ?? {});
  const m = url.pathname.match(/^\/v1beta\/models\/([^/:]+):generateContent$/);
  if (!m || req.method !== "POST") return send(404, { error: { message: "not found" } });
  const model = decodeURIComponent(m[1]);
  if (gem.mode === "retired" && model === "gemini-flash-latest") return send(404, { error: { message: `models/${model} is not found` } });
  if (gem.mode === "slow") await new Promise((r) => setTimeout(r, 2500));
  if (gem.mode === "busy") return send(429, { error: { message: "Resource has been exhausted" } });
  const body = JSON.parse(Buffer.concat(chunks).toString());
  const parts = body.contents?.[0]?.parts ?? [];
  const prompt = parts.find((p) => p.text)?.text ?? "";
  const audio = parts.find((p) => p.inlineData)?.inlineData;
  const today = prompt.match(/Today is (\d{4}-\d{2}-\d{2})/)?.[1];
  gem.last = {
    model,
    keyHeader: !!req.headers["x-goog-api-key"],
    keyInUrl: url.searchParams.has("key"),
    mimeType: audio?.mimeType,
    audioBytes: audio ? Buffer.from(audio.data, "base64").length : 0,
    today,
    jsonMode: body.generationConfig?.responseMimeType === "application/json" && !!body.generationConfig?.responseSchema,
  };
  if (!req.headers["x-goog-api-key"]) return send(403, { error: { message: "API key missing" } });
  if (!audio?.data) return send(400, { error: { message: "no audio" } });
  const out = gem.mode === "silence" ? { transcript: "", type: "", title: "", date: "", time: "" } : answer(today);
  send(200, { candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(out) }] } }] });
}).listen(54322, () => console.log("mock gemini on :54322"));
