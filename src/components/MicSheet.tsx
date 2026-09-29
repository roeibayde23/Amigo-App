"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import { CalendarIcon, TasksIcon } from "./icons";
import { barkFinished } from "@/lib/bark";
import { classify, type Classified } from "@/lib/classify";
import { addMinutes, shortDate } from "@/lib/dates";
import {
  abortSpeech,
  setSpeechFinalHandler,
  speechServerSnapshot,
  speechSnapshot,
  speechSubscribe,
  startSpeech,
  stopSpeech,
} from "@/lib/speech";
import { COLORS } from "@/lib/types";

type Phase = "listening" | "thinking" | "confirm" | "saving" | "added";

/**
 * Smart recording: real speech recognition where the browser supports it (Web Speech API,
 * he-IL / en-US – Chrome, Edge, Android, iPhone Safari), typing everywhere else.
 * Amigo classifies the request into an event (→ Google Calendar) or a task
 * (→ Amigo tasks + iPhone Reminders), and saves it with one confirm tap.
 */
export default function MicSheet() {
  const { sheet } = useApp();
  return sheet === "mic" ? <MicBody /> : null;
}

function MicBody() {
  const app = useApp();
  const { s, lang, today } = app;
  const speech = useSyncExternalStore(speechSubscribe, speechSnapshot, speechServerSnapshot);
  const [phase, setPhase] = useState<Phase>("listening");
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Classified | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => {
    abortSpeech();
    app.openSheet(null);
  }, [app]);

  const process = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (!v) return;
      abortSpeech();
      setText(v);
      setPhase("thinking");
      setTimeout(() => {
        setPending(classify(v, s, lang, today));
        setPhase("confirm");
      }, 650);
    },
    [s, lang, today],
  );

  // Final transcript → classify.
  useEffect(() => {
    setSpeechFinalHandler((t) => process(t));
    return () => setSpeechFinalHandler(null);
  }, [process]);

  // Auto-start listening once the bark has finished (so the mic doesn't cut the bark off on iPhone).
  useEffect(() => {
    if (!speechSnapshot().supported) return;
    let cancelled = false;
    barkFinished().then(() => {
      if (!cancelled) startSpeech(lang);
    });
    return () => {
      cancelled = true;
      abortSpeech();
    };
  }, [lang]);

  // Typing fallback: focus the field when there is no speech recognition.
  useEffect(() => {
    if (phase !== "listening" || speech.supported) return;
    const id = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(id);
  }, [phase, speech.supported]);

  function talk() {
    setText("");
    startSpeech(lang); // from a tap → allowed everywhere
  }

  function stopOrSend() {
    if (speech.listening) stopSpeech(); // result arrives through the final handler
    else process(text);
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
    setPhase("listening");
  }

  const when = pending
    ? [pending.date ? (pending.date === today ? s.today : shortDate(pending.date, s, lang)) : "", pending.time]
        .filter(Boolean)
        .join(" · ") || (pending.type === "event" ? `${s.today} · ${s.allDay}` : s.noDate)
    : "";

  let status = "";
  if (phase === "thinking") status = s.micThinking;
  else if (phase === "listening") {
    if (speech.listening) status = s.micSpeakNow;
    else if (speech.error === "not-allowed" || speech.error === "service-not-allowed") status = s.micNoPermission;
    else if (speech.error === "no-speech") status = s.micNoSpeech;
    else status = speech.supported ? s.micVoiceHint : s.micTypeHint;
  }

  return (
    <BottomSheet open onClose={close} title={s.micTitle} closeLabel={s.close}>
      <div className="mic-stage">
        <div className="mic-avatar">
          <Image src="/images/amigo-headset.webp" alt="" width={228} height={320} />
        </div>
        <p className="mic-status" aria-live="polite">{status}</p>
        {phase === "listening" && (
          <>
            {speech.listening && (
              <div className="wave-row" aria-hidden>
                {Array.from({ length: 7 }, (_, i) => <span key={i} />)}
              </div>
            )}
            <div className="mic-input-row">
              <input
                ref={inputRef}
                type="text"
                value={speech.listening ? speech.interim : text}
                placeholder={speech.listening ? "" : s.micExample}
                onChange={(e) => {
                  if (speech.listening) abortSpeech();
                  setText(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && process(text)}
                aria-label={s.micTitle}
              />
            </div>
            {speech.listening || text.trim() || !speech.supported ? (
              <button className="mic-stop-btn" onClick={stopOrSend} aria-label={s.micSend}>
                <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            ) : (
              <button className="mic-talk-btn" onClick={talk}>{s.micTapToTalk}</button>
            )}
          </>
        )}
        {(phase === "confirm" || phase === "saving") && pending && (
          <div className="confirm-card" style={{ display: "block" }}>
            <div className="confirm-type">
              {pending.type === "event" ? <CalendarIcon sw={2} /> : <TasksIcon sw={2} />}
              <span>{pending.type === "event" ? s.detectedEvent : s.detectedTask}</span>
              <button
                className="confirm-switch"
                onClick={() => setPending({ ...pending, type: pending.type === "event" ? "task" : "event" })}
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
