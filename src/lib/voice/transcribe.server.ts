import "server-only";
import { weekdayOf, zonedNow } from "../dates";
import type { Lang } from "../types";
import { buildVoicePrompt, extFor, geminiMime, normalizeVoiceJson, VOICE_SCHEMA, type VoiceResult } from "./parse";

function clean(v: string | undefined): string {
  const s = (v ?? "").trim();
  if (!s || s.includes("<") || /^your[-_]/i.test(s) || /placeholder/i.test(s)) return "";
  return s;
}

const GEMINI_API_KEY = clean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
const GEMINI_BASE = clean(process.env.GEMINI_API_BASE) || "https://generativelanguage.googleapis.com";
const GEMINI_MODELS = (clean(process.env.GEMINI_MODEL) || "gemini-flash-latest,gemini-2.5-flash,gemini-2.0-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const GROQ_API_KEY = clean(process.env.GROQ_API_KEY);
const OPENAI_API_KEY = clean(process.env.OPENAI_API_KEY);
const WHISPER_BASE = clean(process.env.WHISPER_API_BASE);

export type VoiceProvider = "gemini" | "groq" | "openai";

/** Which speech-to-text is configured (Gemini preferred: transcript + parsed request in one call). */
export function voiceProvider(): VoiceProvider | null {
  if (GEMINI_API_KEY) return "gemini";
  if (GROQ_API_KEY) return "groq";
  if (OPENAI_API_KEY) return "openai";
  return null;
}

export class VoiceError extends Error {
  constructor(
    public code: "unconfigured" | "busy" | "failed" | "bad_audio",
    message: string,
  ) {
    super(message);
  }
}

type Input = { audio: Uint8Array; mime: string; lang: Lang; today?: string };

export async function transcribe({ audio, mime, lang, today }: Input): Promise<VoiceResult> {
  const provider = voiceProvider();
  if (!provider) throw new VoiceError("unconfigured", "no speech-to-text key configured");
  const now = zonedNow();
  const day = today ?? now.date;
  if (provider === "gemini") return gemini(audio, mime, lang, day, now.hm);
  const text = await whisper(provider, audio, mime, lang);
  return { transcript: text, parsed: null, provider };
}

async function gemini(audio: Uint8Array, mime: string, lang: Lang, today: string, hm: string): Promise<VoiceResult> {
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: buildVoicePrompt(lang, today, weekdayOf(today), hm) },
          { inlineData: { mimeType: geminiMime(mime), data: Buffer.from(audio).toString("base64") } },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: VOICE_SCHEMA },
  });
  let last = "";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      // key in a header, never in the URL (URLs end up in logs)
      headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body,
      signal: AbortSignal.timeout(25_000),
    });
    if (res.status === 404) {
      last = `model ${model} not found`;
      continue; // retired/renamed model → try the next one
    }
    if (res.status === 429) throw new VoiceError("busy", "gemini rate limit");
    const json = (await res.json().catch(() => null)) as GeminiResponse | null;
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      if (res.status === 400 && /audio|mime|format|inline/i.test(msg)) throw new VoiceError("bad_audio", msg);
      throw new VoiceError("failed", `gemini ${res.status}: ${msg.slice(0, 200)}`);
    }
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const { transcript, parsed } = normalizeVoiceJson(text, today);
    return { transcript, parsed, provider: `gemini:${model}` };
  }
  throw new VoiceError("failed", last || "no gemini model available");
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

async function whisper(provider: "groq" | "openai", audio: Uint8Array, mime: string, lang: Lang): Promise<string> {
  const base = WHISPER_BASE || (provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");
  const key = provider === "groq" ? GROQ_API_KEY : OPENAI_API_KEY;
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(audio)], { type: mime }), `speech.${extFor(mime)}`);
  form.append("model", provider === "groq" ? "whisper-large-v3-turbo" : "whisper-1");
  form.append("language", lang === "he" ? "he" : "en");
  form.append("response_format", "json");
  const res = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 429) throw new VoiceError("busy", `${provider} rate limit`);
  const json = (await res.json().catch(() => null)) as { text?: string; error?: { message?: string } } | null;
  if (!res.ok) throw new VoiceError("failed", `${provider} ${res.status}: ${(json?.error?.message ?? "").slice(0, 200)}`);
  return (json?.text ?? "").trim();
}
