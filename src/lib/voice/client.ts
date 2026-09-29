"use client";
import type { Classified } from "../classify";
import { DEMO_MODE } from "../env";
import type { ApiError } from "../types";

export type VoiceStatus = { configured: boolean; provider: string | null };
export type VoiceReply =
  | { ok: true; transcript: string; parsed: Classified | null; provider: string }
  | { ok: false; error: ApiError | "offline" };

let status: Promise<VoiceStatus | null> | null = null;

/** Is server-side speech-to-text available? Cached; call early (e.g. on the home screen) so the mic starts fast. */
export function voiceStatus(): Promise<VoiceStatus | null> {
  if (DEMO_MODE) return Promise.resolve({ configured: false, provider: null });
  status ??= fetch("/api/voice", { cache: "no-store" })
    .then(async (r) => {
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        status = null; // retry next time
        return null;
      }
      return { configured: !!j.configured, provider: j.provider ?? null };
    })
    .catch(() => {
      status = null;
      return null;
    });
  return status;
}

export async function sendVoice(blob: Blob, mime: string, lang: "he" | "en", today: string): Promise<VoiceReply> {
  const form = new FormData();
  const ext = mime.includes("webm") ? "webm" : mime.includes("ogg") ? "ogg" : "m4a";
  form.append("audio", new File([blob], `speech.${ext}`, { type: mime }));
  form.append("lang", lang);
  form.append("today", today);
  let res: Response;
  try {
    res = await fetch("/api/voice", { method: "POST", body: form, signal: AbortSignal.timeout(35_000) });
  } catch {
    return { ok: false, error: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "voice_failed" };
  }
  const j = await res.json().catch(() => null);
  if (res.ok && j?.ok) return { ok: true, transcript: j.transcript ?? "", parsed: j.parsed ?? null, provider: j.provider ?? "" };
  return { ok: false, error: (j?.error as ApiError) ?? "voice_failed" };
}
