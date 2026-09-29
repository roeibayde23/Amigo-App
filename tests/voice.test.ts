import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/lib/classify";
import { STRINGS } from "../src/lib/i18n";
import { baseMime, buildVoicePrompt, extFor, geminiMime, normalizeVoiceJson } from "../src/lib/voice/parse";

const TODAY = "2026-09-29"; // Tuesday

test("voice: Gemini JSON answer → event tomorrow 09:00", () => {
  const raw = JSON.stringify({ transcript: "פגישה עם מאיה מחר ב-9", type: "event", title: "פגישה עם מאיה", date: "2026-09-30", time: "09:00" });
  assert.deepEqual(normalizeVoiceJson(raw, TODAY), {
    transcript: "פגישה עם מאיה מחר ב-9",
    parsed: { type: "event", title: "פגישה עם מאיה", date: "2026-09-30", time: "09:00" },
  });
});

test("voice: tolerant parsing (code fences, 9:00, event without date → today, bad fields dropped)", () => {
  const r = normalizeVoiceJson('```json\n{"transcript":"ארוחה עם אמא","type":"event","title":"ארוחה עם אמא","date":"","time":"9:00"}\n```', TODAY);
  assert.deepEqual(r.parsed, { type: "event", title: "ארוחה עם אמא", date: TODAY, time: "09:00" });
  const t = normalizeVoiceJson({ transcript: "לקנות חלב", type: "task", title: "לקנות חלב", date: "tomorrow", time: "25:99" }, TODAY);
  assert.deepEqual(t.parsed, { type: "task", title: "לקנות חלב", date: null, time: "" });
});

test("voice: empty / unusable answers", () => {
  assert.deepEqual(normalizeVoiceJson('{"transcript":"","type":"","title":"","date":"","time":""}', TODAY), { transcript: "", parsed: null });
  assert.deepEqual(normalizeVoiceJson("not json", TODAY), { transcript: "", parsed: null });
  // transcript but no type → client falls back to the local parser
  assert.deepEqual(normalizeVoiceJson({ transcript: "שלום", type: "maybe" }, TODAY), { transcript: "שלום", parsed: null });
});

test("voice: transcript-only fallback parses the same request locally", () => {
  const r = classify("פגישה עם מאיה מחר ב-9", STRINGS.he, "he", TODAY);
  assert.deepEqual(r, { type: "event", title: "פגישה עם מאיה", date: "2026-09-30", time: "09:00" });
});

test("voice: iPhone/Chrome recording formats", () => {
  assert.equal(baseMime("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
  assert.equal(geminiMime("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
  assert.equal(geminiMime("audio/x-m4a"), "audio/mp4");
  assert.equal(geminiMime("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(extFor("audio/mp4"), "m4a");
  assert.equal(extFor("audio/webm;codecs=opus"), "webm");
  assert.equal(baseMime(""), "audio/mp4");
});

test("voice: prompt carries today's date and weekday", () => {
  const p = buildVoicePrompt("he", TODAY, 2, "20:40");
  assert.match(p, /2026-09-29 \(Tuesday\)/);
  assert.match(p, /ב-9 = 09:00/);
});
