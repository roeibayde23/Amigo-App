"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import { CalendarIcon, TasksIcon } from "./icons";
import { classify, type Classified } from "@/lib/classify";
import { addDays, addMinutes, shortDate } from "@/lib/dates";
import { COLORS } from "@/lib/types";

type Phase = "listening" | "thinking" | "confirm" | "added";

/** Simulated voice capture: the user types, Amigo classifies into task / event, user confirms. */
export default function MicSheet() {
  const { sheet } = useApp();
  return sheet === "mic" ? <MicBody /> : null;
}

function MicBody() {
    const app = useApp();
    const { s, lang, today } = app;
    const [phase, setPhase] = useState<Phase>("listening");
    const [text, setText] = useState("");
    const [pending, setPending] = useState<Classified | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const close = () => app.openSheet(null);

    useEffect(() => {
      const id = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }, [phase]);

    function process() {
      const v = text.trim();
      if (!v) return;
      setPhase("thinking");
      setTimeout(() => {
        setPending(classify(v, s, lang));
        setPhase("confirm");
      }, 1100);
    }

    async function confirm() {
      if (!pending) return;
      if (pending.type === "event") {
        const start = pending.time || null;
        await app.addEvent({
          title: pending.title,
          date: pending.tomorrow ? addDays(today, 1) : today,
          start,
          end: start ? addMinutes(start, 30) : null,
          color: COLORS[0],
        });
      } else {
        await app.addTask({ title: pending.title, recur: null });
      }
      setPhase("added");
      setTimeout(close, 1000);
    }

    function retry() {
      setPending(null);
      setText("");
      setPhase("listening");
    }

    const when = pending
      ? [pending.tomorrow ? shortDate(addDays(today, 1), s, lang) : "", pending.time].filter(Boolean).join(" · ")
      : "";

    return (
      <BottomSheet open onClose={close} title={s.micTitle} closeLabel={s.close}>
        <div className="mic-stage">
          <div className="mic-avatar">
            <Image src="/images/amigo-headset.webp" alt="" width={228} height={320} />
          </div>
          <p className="mic-status">
            {phase === "listening" ? s.micListening : phase === "thinking" ? s.micThinking : ""}
          </p>
          {phase === "listening" && (
            <>
              <div className="wave-row" aria-hidden>
                {Array.from({ length: 7 }, (_, i) => <span key={i} />)}
              </div>
              <div className="mic-input-row">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && process()}
                  aria-label={s.micTitle}
                />
              </div>
              <button className="mic-stop-btn" onClick={process} aria-label={s.micSend}>
                <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            </>
          )}
          {phase === "listening" && <p className="mic-hint">{s.micHint}</p>}
          {phase === "confirm" && pending && (
            <div className="confirm-card" style={{ display: "block" }}>
              <div className="confirm-type">
                {pending.type === "event" ? <CalendarIcon sw={2} /> : <TasksIcon sw={2} />}
                <span>{pending.type === "event" ? s.detectedEvent : s.detectedTask}</span>
              </div>
              <div className="confirm-title">{pending.title}</div>
              {pending.type === "event" && when && <div className="confirm-time">{when}</div>}
              <div className="confirm-actions">
                <button className="confirm-add" onClick={confirm}>{s.addBtn}</button>
                <button className="confirm-cancel" onClick={retry}>{s.cancelBtn}</button>
              </div>
            </div>
          )}
          {phase === "added" && <div className="mic-added" style={{ display: "block" }}>{s.micAdded}</div>}
        </div>
      </BottomSheet>
    );
  }
