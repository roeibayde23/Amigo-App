"use client";
// Microphone recording for voice input: getUserMedia + MediaRecorder (iPhone Safari/home-screen app
// records audio/mp4 AAC, Chrome/Android audio/webm Opus). A Web Audio analyser drives the live level
// meter and stops automatically after the speaker goes quiet. The audio is transcribed server-side
// (/api/voice), because the browser speech API is missing/unreliable in iOS home-screen apps and Hebrew.

export type MicErrorCode = "unsupported" | "insecure" | "denied" | "no_mic" | "busy_mic" | "failed";
export class MicError extends Error {
  constructor(public code: MicErrorCode, message: string = code) {
    super(message);
  }
}

export type Recorded = { blob: Blob; mime: string; ms: number; peak: number; meter: boolean };
export type Recording = {
  mime: string;
  /** Finish and get the audio. */
  stop(): Promise<Recorded>;
  /** Throw the recording away (sheet closed, user started typing). */
  cancel(): void;
};

type Opts = {
  onLevel?: (level: number, ms: number) => void; // level 0..1, called ~15×/s
  onAutoStop?: () => void; // silence after speech, or max length reached
  maxMs?: number;
};

const MIME_PREFS = ["audio/mp4", "audio/mp4;codecs=mp4a.40.2", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
const SPEECH_LEVEL = 0.07; // RMS×4 above this counts as speech
const SILENCE_MS = 1700; // stop this long after the last speech…
const MIN_MS = 1200; // …but never before this

let sharedCtx: AudioContext | null = null;

function newCtx(): AudioContext | null {
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const C = w.AudioContext ?? w.webkitAudioContext;
  try {
    return C ? new C() : null;
  } catch {
    return null;
  }
}

/** Call synchronously inside a tap: iPhone only lets an AudioContext run if it was started by a gesture. */
export function primeAudio() {
  if (typeof window === "undefined") return;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = newCtx();
  sharedCtx?.resume().catch(() => {});
}

/** Can this browser record at all (secure context + getUserMedia + MediaRecorder)? */
export function canRecord(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

function pickMime(): string {
  const MR = window.MediaRecorder;
  if (typeof MR.isTypeSupported !== "function") return "";
  return MIME_PREFS.find((m) => MR.isTypeSupported(m)) ?? "";
}

function micError(e: unknown): MicError {
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return new MicError("denied");
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return new MicError("no_mic");
  if (name === "NotReadableError" || name === "AbortError" || name === "TrackStartError") return new MicError("busy_mic");
  return new MicError("failed", (e as Error)?.message ?? String(e));
}

export async function startRecording(opts: Opts = {}): Promise<Recording> {
  if (typeof window === "undefined") throw new MicError("unsupported");
  if (!window.isSecureContext) throw new MicError("insecure");
  if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") throw new MicError("unsupported");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (e) {
    throw micError(e);
  }

  const wanted = pickMime();
  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(stream, wanted ? { mimeType: wanted, audioBitsPerSecond: 64000 } : undefined);
  } catch {
    try {
      rec = new MediaRecorder(stream);
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      throw micError(e);
    }
  }
  const mime = rec.mimeType || wanted || "audio/mp4";
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  // Level meter + silence detection (best effort – recording works without it).
  const started = performance.now();
  let peak = 0;
  let meter = false;
  let heard = false;
  let lastLoud = started;
  let raf = 0;
  let auto = false;
  let ctx: AudioContext | null = null;
  let ownCtx = false;
  try {
    ctx = sharedCtx && sharedCtx.state !== "closed" ? sharedCtx : newCtx();
    ownCtx = ctx !== sharedCtx;
    await ctx?.resume().catch(() => {});
    if (ctx) {
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      let lastEmit = 0;
      const tick = () => {
        const now = performance.now();
        const ms = now - started;
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        if (ctx!.state === "running") meter = true;
        peak = Math.max(peak, level);
        if (level > SPEECH_LEVEL) {
          heard = true;
          lastLoud = now;
        }
        if (now - lastEmit > 66) {
          lastEmit = now;
          opts.onLevel?.(level, ms);
        }
        if (!auto && meter && heard && ms > MIN_MS && now - lastLoud > SILENCE_MS) {
          auto = true;
          opts.onAutoStop?.();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
  } catch {
    /* no meter */
  }
  // Timer + hard limit also run without a working meter.
  const maxMs = opts.maxMs ?? 30_000;
  const timer = setInterval(() => {
    const ms = performance.now() - started;
    if (!meter) opts.onLevel?.(0, ms);
    if (!auto && ms >= maxMs) {
      auto = true;
      opts.onAutoStop?.();
    }
  }, 250);

  let finished = false;
  const cleanup = () => {
    finished = true;
    cancelAnimationFrame(raf);
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop()); // turns the iPhone's orange mic dot off
    if (ownCtx) ctx?.close().catch(() => {});
  };

  rec.start();

  return {
    mime,
    stop() {
      return new Promise<Recorded>((resolve, reject) => {
        if (finished) return reject(new MicError("failed", "already stopped"));
        const ms = performance.now() - started;
        const done = () => {
          cleanup();
          resolve({ blob: new Blob(chunks, { type: mime }), mime, ms, peak, meter });
        };
        rec.onstop = done;
        rec.onerror = () => {
          cleanup();
          reject(new MicError("failed", "recorder error"));
        };
        try {
          if (rec.state === "inactive") done();
          else {
            rec.stop();
          }
        } catch {
          done();
        }
        setTimeout(() => !finished && done(), 3000); // safety net if onstop never fires
      });
    },
    cancel() {
      if (finished) return;
      rec.ondataavailable = null;
      rec.onstop = null;
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        /* ignore */
      }
      cleanup();
    },
  };
}
