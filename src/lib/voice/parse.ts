// Pure helpers for voice capture (no server/browser APIs → unit-testable).
import type { Classified } from "../classify";
import type { Lang } from "../types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** What the transcription step returns to the browser. `parsed` is null when only a transcript is available. */
export type VoiceResult = { transcript: string; parsed: Classified | null; provider: string };

/** Strip codec parameters: "audio/mp4;codecs=mp4a.40.2" → "audio/mp4". */
export function baseMime(mime: string | null | undefined): string {
  return (mime || "").split(";")[0].trim().toLowerCase() || "audio/mp4";
}

/** MIME type as Gemini expects it (iPhone MediaRecorder → audio/mp4 AAC, Chrome → audio/webm Opus). */
export function geminiMime(mime: string): string {
  const m = baseMime(mime);
  if (m === "audio/x-m4a" || m === "audio/m4a") return "audio/mp4";
  if (m === "video/mp4") return "audio/mp4";
  if (m === "video/webm") return "audio/webm";
  if (m === "audio/mpeg3" || m === "audio/x-mp3") return "audio/mp3";
  return m;
}

/** File extension for Whisper-style APIs, which sniff the format from the file name. */
export function extFor(mime: string): string {
  const m = baseMime(mime);
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "m4a"; // audio/mp4, audio/aac, audio/x-m4a
}

/** Instruction for one-call "transcribe + understand" (Gemini). */
export function buildVoicePrompt(lang: Lang, today: string, weekday: number, nowHm: string): string {
  return [
    "You are the voice input of Amigo, a personal assistant app. The audio is one short spoken request,",
    `usually in Hebrew${lang === "en" ? " or English (the user's UI language is English)" : " (sometimes English)"}.`,
    `Today is ${today} (${EN_DAYS[weekday]}), current time ${nowHm}, time zone Europe/Prague. Week starts on Sunday.`,
    "Return JSON only:",
    '- transcript: exact transcription in the spoken language (Hebrew script for Hebrew). Write numbers as digits ("ב-9", not "בתשע"). If there is no intelligible speech, return "" for every field.',
    '- type: "event" for anything that happens at a time or place, alone or with people (פגישה, תור, שיחה עם מישהו בשעה מסוימת, ארוחה, יום הולדת, אימון, טיסה);',
    '  "task" for to-dos and reminders (להתקשר, לקנות, לשלם, לשלוח, "תזכיר לי", "צריך ל…").',
    '- title: a short title in the spoken language without the date/time words and without filler like "תקבע לי" / "תוסיף", e.g. "פגישה עם מאיה".',
    '- date: YYYY-MM-DD resolved from today (היום, מחר, מחרתיים, "ביום שלישי" = the next Tuesday after today, "ב-5/10" = 5 October), or "" if no date was said.',
    '- time: HH:MM 24-hour, or "" if no time was said. Hebrew hours with no בבוקר/בערב: 7–11 → morning (ב-9 = 09:00), 12 → 12:00, 1–6 → afternoon (ב-3 = 15:00). "וחצי" = :30, "ורבע" = :15.',
  ].join("\n");
}

export const VOICE_SCHEMA = {
  type: "OBJECT",
  properties: {
    transcript: { type: "STRING" },
    type: { type: "STRING", enum: ["event", "task", ""] },
    title: { type: "STRING" },
    date: { type: "STRING" },
    time: { type: "STRING" },
  },
  required: ["transcript", "type", "title", "date", "time"],
  propertyOrdering: ["transcript", "type", "title", "date", "time"],
} as const;

/** Validate a model's JSON answer. Returns the transcript plus a parsed request (or null if unusable). */
export function normalizeVoiceJson(raw: unknown, today: string): { transcript: string; parsed: Classified | null } {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    const txt = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      obj = JSON.parse(txt);
    } catch {
      return { transcript: "", parsed: null };
    }
  } else if (raw && typeof raw === "object") obj = raw as Record<string, unknown>;
  if (!obj) return { transcript: "", parsed: null };

  const str = (k: string) => (typeof obj![k] === "string" ? (obj![k] as string).trim() : "");
  const transcript = str("transcript");
  const type = str("type");
  const title = str("title") || transcript;
  let date: string | null = DATE.test(str("date")) ? str("date") : null;
  let time = str("time");
  if (/^\d:\d\d$/.test(time)) time = "0" + time;
  if (!TIME.test(time)) time = "";
  if (!transcript || (type !== "event" && type !== "task") || !title) return { transcript, parsed: null };
  if (type === "event" && !date) date = today;
  return { transcript, parsed: { type, title, date, time } };
}
