"use client";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import EventSheet from "@/components/EventSheet";
import SubHeader from "@/components/SubHeader";
import { CheckIcon, ChevronLeft, ChevronRight, PencilIcon, PlusIcon } from "@/components/icons";
import { addDays, shortDate, weekdayOf } from "@/lib/dates";
import type { CalEvent } from "@/lib/types";

export default function CalendarPage() {
  const app = useApp();
  const { s, lang, today, now, events, ready } = app;
  const [picked, setPicked] = useState<string | null>(null);
  const viewed = picked ?? today;
  const [editing, setEditing] = useState<CalEvent | "new" | null>(null);

  const list = events
    .filter((e) => e.date === viewed)
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  const isToday = viewed === today;
  const rtl = lang === "he";
  // Outward-pointing arrows: start side = next day (as in the prototype), end side = previous day.
  const StartArrow = rtl ? ChevronRight : ChevronLeft;
  const EndArrow = rtl ? ChevronLeft : ChevronRight;

  return (
    <div className="view active">
      <SubHeader>
        <div className="daynav">
          <button className="daynav-arrow" onClick={() => setPicked(addDays(viewed, 1))} aria-label={s.nextDay}>
            <StartArrow />
          </button>
          <span className="daynav-pill" suppressHydrationWarning>{shortDate(viewed, s, lang)}</span>
          <button className="daynav-arrow" onClick={() => setPicked(addDays(viewed, -1))} aria-label={s.prevDay}>
            <EndArrow />
          </button>
        </div>
      </SubHeader>

      <div className="daylabel-row">
        <span className="daylabel" suppressHydrationWarning>{s.days[weekdayOf(viewed)]}</span>
        {ready && <span className="daycount">{s.dayCount(list.length)}</span>}
      </div>

      <div className="timeline">
        {ready && list.length === 0 && <div className="empty-note">🗓️</div>}
        {list.map((ev, idx) => {
          const past = isToday && !!ev.end && ev.end <= now;
          return (
            <div className="timeline-item" key={ev.id}>
              <div className="tl-dot-col">
                <div className="tl-dot" style={{ background: ev.color }} />
                {idx < list.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-card" style={{ borderInlineStartColor: ev.color }}>
                <button className="tl-edit" onClick={() => setEditing(ev)} aria-label={s.eventEditTitle}>
                  <PencilIcon />
                </button>
                <div className="tl-body">
                  <div className="tl-title">{ev.title}</div>
                  <div className="tl-time">{(ev.start ?? "") + (ev.end ? "–" + ev.end : "")}</div>
                </div>
                {past && <span className="tl-check"><CheckIcon sw={2.5} /></span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fab">
        <button onClick={() => setEditing("new")}>
          <PlusIcon />
          <span>{s.addEventLabel}</span>
        </button>
      </div>

      {editing && (
        <EventSheet
          event={editing === "new" ? null : editing}
          defaultDate={viewed}
          onClose={() => setEditing(null)}
          onSaved={(date) => setPicked(date)}
        />
      )}
    </div>
  );
}
