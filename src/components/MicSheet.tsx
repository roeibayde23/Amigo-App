"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import { CalendarIcon, TasksIcon } from "./icons";
import { barkFinished } from "@/lib/bark";
import { classify, type Classified } from "@/lib/classify";
import { addMinutes, shortDate } from "@/lib/dates";
import type { Strings } from "@/lib/i18n";
import { canRecord, MicError, startRecording, type Recording } from "@/lib/recorder";
import {
  abortSpeech,
  setSpeechFinalHandler,
  speechServerSnapshot,
  speechSnapshot,
  speechSubscribe,
  startSpeech,
  stopSpeech,
} from "@/lib/speech";
import { sendVoice, voiceStatus } from "@/lib/voice/client";
import { COLORS } from "@/lib/types";

type Phase = "idle" | "recording" | "processing" | "confirm" | "saving" | "added";
/** server = record audio → /api/voice (works in iPhone home-screen apps); browser = Web Speech API; type = keyboard only. */
type Mode = "server" | "browser" | "type";
type Err =
  | "denied" | "no_mic" | "busy_mic" | "unsupported" | "insecure" | "failed"
  | "no_speech" | "busy" | "offline" | "no_answer";

const BARS = [0.45, 0.8, 0.6, 1, 0.65, 0.85, 0.5];

/**
 * Smart recording. Tap the dog → bark → Amigo listens ("מקשיב..." with a live level + timer, tap to
 * finish or it stops by itself after you go quiet) → "מעבד..." → the parsed request with one confirm tap.
 * Events go to Google Calendar, tasks to Amigo + iPhone Reminders. Typing always works as a fallback.
 */
export default function MicSheet() {
  const { sheet } = useApp();
  return sheet === "mic" ? <MicBody /> : null;
}

function MicBody() {
  const app = useApp();
  const router = useRouter();
  const { s, lang, today } = app;
  const speech = useSyncExternalStore(speechSubscribe, speechSnapshot, speechServerSnapshot);
  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [heard, setHeard] = useState("");
  const [err, setErr] = useState<Err | null>(null);
  const [level, setLevel] = useState(0);
  const [ms, setMs] = useState(0);
  const [pending, setPending] = useState<Classified | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<Recording | null>(null);
  const alive = useRef(true);
  const busy = useRef(false); // getUserMedia in flight

  const cancelAll = useCallback(() => {
    recRef.current?.cancel();
    recRef.current = null;
    abortSpeech();
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelAll();
    };
  }, [cancelAll]);

  const close = useCallback(() => {
    cancelAll();
    app.openSheet(null);
  }, [app, cancelAll]);

  const showParsed = useCallback(
    (raw: string, parsed: Classified | null) => {
      const v = raw.trim();
      if (!v) return;
      setText(v);
      setHeard(v);
      setPending(parsed ?? classify(v, s, lang, today));
      setPhase("confirm");
    },
    [s, lang, today],
  );

  // Typed text / Web Speech transcript → local parser.
  const process = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (!v) return;
      cancelAll();
      setErr(null);
      setHeard("");
      setText(v);
      setPhase("processing");
      setTimeout(() => {
        if (!alive.current) return;
        setPending(classify(v, s, lang, today));
        setPhase("confirm");
      }, 450);
    },
    [s, lang, today, cancelAll],
  );

  // ---------- server mode: MediaRecorder → /api/voice ----------
  const finishRecording = useCallback(async () => {
    const r = recRef.current;
    if (!r) return;
    recRef.current = null;
    setPhase("processing");
    let out;
    try {
      out = await r.stop();
    } catch {
      if (alive.current) {
        setErr("failed");
        setPhase("idle");
      }
      return;
    }
    if (!alive.current) return;
    // Meter says it was silent the whole time → don't bother the server.
    if (out.meter && out.peak < 0.02) {
      setErr("no_speech");
      setPhase("idle");
      return;
    }
    const reply = await sendVoice(out.blob, out.mime, lang, today);
    if (!alive.current) return;
    if (reply.ok) return showParsed(reply.transcript, reply.parsed);
    setPhase("idle");
    if (reply.error === "unauthorized") return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (reply.error === "voice_unconfigured" || reply.error === "demo") {
      setMode(speechSnapshot().supported ? "browser" : "type");
      return setErr(speechSnapshot().supported ? null : "unsupported");
    }
    setErr(
      reply.error === "no_speech" ? "no_speech"
        : reply.error === "voice_busy" ? "busy"
          : reply.error === "offline" ? "offline"
            : "failed",
    );
  }, [lang, today, showParsed, router]);

  const finishRef = useRef(finishRecording);
  useEffect(() => {
    finishRef.current = finishRecording;
  }, [finishRecording]);

  const beginRecording = useCallback(async () => {
    if (busy.current || recRef.current) return;
    busy.current = true;
    setErr(null);
    setText("");
    setHeard("");
    setLevel(0);
    setMs(0);
    try {
      const r = await startRecording({
        onLevel: (l, t) => {
          setLevel(l);
          setMs(t);
        },
        onAutoStop: () => finishRef.current(),
      });
      if (!alive.current) return r.cancel();
      recRef.current = r;
      setPhase("recording");
    } catch (e) {
      if (!alive.current) return;
      setErr(e instanceof MicError ? e.code : "failed");
      setPhase("idle");
    } finally {
      busy.current = false;
    }
  }, []);

  // ---------- pick the mode, then auto-start once the bark has finished ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [st] = await Promise.all([canRecord() ? voiceStatus() : Promise.resolve(null), barkFinished()]);
      if (cancelled) return;
      const m: Mode = st?.configured && canRecord() ? "server" : speechSnapshot().supported ? "browser" : "type";
      setMode(m);
      if (m === "server") beginRecording();
      else if (m === "browser") startSpeech(lang);
      else setErr(canRecord() ? null : "unsupported");
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, beginRecording]);

  // Web Speech final transcript → parse.
  useEffect(() => {
    setSpeechFinalHandler((t) => {
      process(t);
      setHeard(t);
    });
    return () => setSpeechFinalHandler(null);
  }, [process]);

  // Typing fallback: focus the field when there is no voice at all.
  useEffect(() => {
    if (mode !== "type" || phase !== "idle") return;
    const id = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(id);
  }, [mode, phase]);

  function talk() {
    setText("");
    setErr(null);
    if (mode === "server") beginRecording(); // from a tap → mic prompt allowed everywhere
    else startSpeech(lang);
  }

  function confirm() {
    if (!pending || phase === "saving") return;
    setPhase("saving");
    const done = (ok: boolean) => {
      if (!ok) return setPhase("confirm");
      setPhase("added");
      setTimeout(() => app.openSheet(null), 900);
    };
    if (pending.type === "event") {
      const start = pending.time || null;
      app
        .addEvent({
          title: pending.title,
          date: pending.date ?? today,
          start,
          end: start ? addMinutes(start, 60) : null,
          allDay: !start,
          color: COLORS[0],
        })
        .then(done);
    } else {
      // must run synchronously inside this tap: it may open the iPhone Reminders shortcut
      app.addTask({ title: pending.title, dueDate: pending.date, dueTime: pending.time || null }).then(done);
    }
  }

  function retry() {
    setPending(null);
    setText("");
    setHeard("");
    setErr(null);
    setPhase("idle");
  }

  const browserListening = mode === "browser" && speech.listening;
  const browserErr: Err | null =
    mode !== "browser" || speech.listening ? null
      : speech.error === "not-allowed" || speech.error === "service-not-allowed" ? "denied"
        : speech.error === "no-speech" ? "no_speech"
          : speech.error === "no-answer" || speech.error === "start-failed" ? "no_answer"
            : speech.error === "audio-capture" ? "no_mic"
              : speech.error === "network" ? "offline"
                : null;
  const shownErr = err ?? browserErr;

  const when = pending
    ? [pending.date ? (pending.date === today ? s.today : shortDate(pending.date, s, lang)) : "", pending.time]
        .filter(Boolean)
        .join(" · ") || (pending.type === "event" ? `${s.today} · ${s.allDay}` : s.noDate)
    : "";

  let status = "";
  if (phase === "processing") status = s.micProcessing;
  else if (phase === "recording") status = s.micRecording;
  else if (phase === "idle") {
    if (browserListening) status = s.micSpeakNow;
    else if (shownErr) status = errText(shownErr, s);
    else if (mode === null) status = "";
    else status = mode === "type" ? s.micTypeHint : s.micVoiceHint;
  }
  const clock = `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  const listening = phase === "recording" || browserListening;

  return (
    <BottomSheet open onClose={close} title={s.micTitle} closeLabel={s.close}>
      <div className="mic-stage">
        <div className={`mic-avatar${listening ? " listening" : ""}`}>
          <Image src="/images/amigo-headset.webp" alt="" width={228} height={320} />
        </div>
        <p className={`mic-status${shownErr && phase === "idle" ? " error" : ""}`} role="status" aria-live="polite">
          {status}
        </p>

        {phase === "recording" && (
          <>
            <div className="wave-row live" aria-hidden>
              {BARS.map((f, i) => (
                <span key={i} style={{ height: `${6 + Math.round(Math.min(1, level * 1.6) * 26 * f)}px` }} />
              ))}
            </div>
            <div className="mic-timer" aria-hidden>{clock}</div>
            <button className="mic-stop-btn" onClick={() => finishRef.current()} aria-label={s.micTapToStop}>
              <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            </button>
            <div className="mic-stop-label">{s.micTapToStop}</div>
          </>
        )}

        {phase === "processing" && (
          <div className="wave-row" aria-hidden>
            {BARS.map((_, i) => <span key={i} />)}
          </div>
        )}

        {phase === "idle" && (
          <>
            {browserListening && (
              <div className="wave-row" aria-hidden>
                {BARS.map((_, i) => <span key={i} />)}
              </div>
            )}
            <div className="mic-input-row">
              <input
                ref={inputRef}
                type="text"
                value={browserListening ? speech.interim : text}
                placeholder={browserListening ? "" : s.micExample}
                onChange={(e) => {
                  if (speech.listening) abortSpeech();
                  setText(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && process(text)}
                enterKeyHint="send"
                aria-label={s.micTitle}
              />
            </div>
            {browserListening ? (
              <button className="mic-stop-btn" onClick={() => stopSpeech()} aria-label={s.micTapToStop}>
                <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            ) : text.trim() ? (
              <button className="mic-stop-btn" onClick={() => process(text)} aria-label={s.micSend}>
                <svg viewBox="0 0 24 24"><path d="M3 11.5 20 4l-7.5 17-2.2-7.3z" /></svg>
              </button>
            ) : mode && mode !== "type" ? (
              <button className="mic-talk-btn" onClick={talk}>{shownErr ? s.micTryAgain : s.micTapToTalk}</button>
            ) : null}
          </>
        )}

        {(phase === "confirm" || phase === "saving") && pending && (
          <div className="confirm-card" style={{ display: "block" }}>
            {heard && <div className="confirm-heard">{s.micHeard} ״{heard}״</div>}
            <div className="confirm-type">
              {pending.type === "event" ? <CalendarIcon sw={2} /> : <TasksIcon sw={2} />}
              <span>{pending.type === "event" ? s.detectedEvent : s.detectedTask}</span>
              <button
                className="confirm-switch"
                onClick={() =>
                  setPending({
                    ...pending,
                    type: pending.type === "event" ? "task" : "event",
                    date: pending.type === "task" ? (pending.date ?? today) : pending.date,
                  })
                }
              >
                {pending.type === "event" ? s.switchToTask : s.switchToEvent}
              </button>
            </div>
            <div className="confirm-title">{pending.title}</div>
            <div className="confirm-time">{when}</div>
            <div className="confirm-actions">
              <button className="confirm-add" onClick={confirm} disabled={phase === "saving"}>
                {phase === "saving" ? s.loading : s.addBtn}
              </button>
              <button className="confirm-cancel" onClick={retry} disabled={phase === "saving"}>{s.cancelBtn}</button>
            </div>
          </div>
        )}
        {phase === "added" && <div className="mic-added" style={{ display: "block" }}>{s.micAdded}</div>}
      </div>
    </BottomSheet>
  );
}

function errText(e: Err, s: Strings): string {
  switch (e) {
    case "denied": return s.micErrDenied;
    case "no_mic": return s.micErrNoMic;
    case "busy_mic": return s.micErrBusyMic;
    case "unsupported":
    case "insecure": return s.micErrUnsupported;
    case "no_speech": return s.micNoSpeech;
    case "busy": return s.micErrBusy;
    case "offline": return s.micErrOffline;
    case "no_answer": return s.micErrNoAnswer;
    default: return s.micErrFailed;
  }
}
