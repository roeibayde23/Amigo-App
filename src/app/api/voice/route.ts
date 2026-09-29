import { DEMO_MODE } from "@/lib/env";
import { apiError, apiJson } from "@/lib/google/route";
import { isTransientAuthError } from "@/lib/supabase/proxy";
import { createServerSupabase } from "@/lib/supabase/server";
import { transcribe, VoiceError, voiceProvider } from "@/lib/voice/transcribe.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel request body limit is 4.5 MB (~8 min of iPhone AAC)
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function signedIn(): Promise<Response | null> {
  if (DEMO_MODE) return apiError("demo", 400);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (!data?.user && error && isTransientAuthError(error)) return apiError("voice_failed", 503, "auth_unavailable");
  if (!data?.user) return apiError("unauthorized", 401);
  return null;
}

/** GET /api/voice – is server-side speech-to-text available? */
export async function GET() {
  const denied = await signedIn();
  if (denied) return denied;
  const provider = voiceProvider();
  return apiJson({ ok: true, configured: !!provider, provider });
}

/** POST /api/voice (multipart: audio, lang, today) – transcribe + understand a short spoken request. */
export async function POST(req: Request) {
  const denied = await signedIn();
  if (denied) return denied;
  if (!voiceProvider()) return apiError("voice_unconfigured", 503);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("bad_request", 400, "expected multipart form data");
  }
  const file = form.get("audio");
  if (!(file instanceof Blob)) return apiError("bad_request", 400, "missing audio");
  if (file.size > MAX_BYTES) return apiError("bad_request", 413, "recording too long");
  if (file.size < 800) return apiError("no_speech", 422, "empty recording");
  const lang = form.get("lang") === "en" ? "en" : "he";
  const today = String(form.get("today") ?? "");

  try {
    const result = await transcribe({
      audio: new Uint8Array(await file.arrayBuffer()),
      mime: file.type || "audio/mp4",
      lang,
      today: DATE.test(today) ? today : undefined,
    });
    if (!result.transcript) return apiError("no_speech", 422);
    return apiJson({ ok: true, ...result });
  } catch (e) {
    if (e instanceof VoiceError) {
      console.error("[voice]", e.code, e.message);
      if (e.code === "busy") return apiError("voice_busy", 429);
      if (e.code === "unconfigured") return apiError("voice_unconfigured", 503);
      if (e.code === "bad_audio") return apiError("bad_request", 400, "unsupported audio");
      return apiError("voice_failed", 502);
    }
    console.error("[voice] failed:", e instanceof Error ? e.message : e);
    return apiError("voice_failed", 502);
  }
}
