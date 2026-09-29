"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import EventSheet from "@/components/EventSheet";
import MonthPicker from "@/components/MonthPicker";
import ReconnectGoogleCard from "@/components/ReconnectGoogleCard";
import SubHeader from "@/components/SubHeader";
import { CheckIcon, ChevronLeft, ChevronRight, PencilIcon, PlusIcon } from "@/components/icons";
import { addDays, shortDate, weekdayOf } from "@/lib/dates";
import type { CalEvent } from "@/lib/types";

export default function CalendarPage() {
  const app = useApp();
  const { s, lang, today, now, events, ready, calStatus } = app;
  const [picked, setPicked] = useState<string | null>(null);
  const viewed = picked ?? today;
  const [editing, setEditing] = useState<CalEvent | "new" | null>(null);
  const [monthTop, setMonthTop] = useState<number | null>(null);
  const monthOpen = monthTop !== null;
  const setMonthOpen = (open: boolean) => setMonthTop(open ? monthTop : null);
  const { ensureEvents } = app;

  // Load more of Google Calendar when jumping outside the fetched window.
  useEffect(() => {
    ensureEvents(viewed);
  }, [viewed, ensureEvents]);

  const eventDates = useMemo(() => new Set(events.map((e) => e.date)), [events]);
  const list = events
    .filter((e) => e.date <= viewed && (e.endDate ?? e.date) >= viewed)
    .sort((a, b) => Number(!a.allDay && !!a.start) - Number(!b.allDay && !!b.start) || (a.start ?? "").localeCompare(b.start ?? ""));
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
          <button
            className="daynav-pill"
            onClick={(e) => setMonthTop(monthOpen ? null : e.currentTarget.getBoundingClientRect().bottom + 8)}
            aria-expanded={monthOpen}
            aria-label={s.pickDate}
            suppressHydrationWarning
          >
            {shortDate(viewed, s, lang)} <span className="caret" aria-hidden>▾</span>
          </button>
          <button className="daynav-arrow" onClick={() => setPicked(addDays(viewed, -1))} aria-label={s.prevDay}>
            <EndArrow />
          </button>
          {monthOpen && (
            <MonthPicker
              value={viewed}
              today={today}
              eventDates={eventDates}
              s={s}
              lang={lang}
              onPick={(d) => {
                setPicked(d);
                setMonthOpen(false);
              }}
              onClose={() => setMonthOpen(false)}
              top={monthTop ?? 0}
            />
          )}
        </div>
      </SubHeader>

      {!app.demo && calStatus === "reconnect" && <ReconnectGoogleCard next="/calendar" compact />}
      {!app.demo && (calStatus === "api_disabled" || calStatus === "google_failed" || calStatus === "not_configured") && (
        <div className="notice-card compact cal-note">
          <p>{calStatus === "api_disabled" ? s.gApiDisabled : s.gFailed}</p>
          <button className="pill-btn secondary" onClick={() => app.reloadEvents()}>{s.retry}</button>
        </div>
      )}

      <div className="daylabel-row">
        <span className="daylabel" suppressHydrationWarning>{s.days[weekdayOf(viewed)]}</span>
        {ready && <span className="daycount">{s.dayCount(list.length)}</span>}
      </div>

      <div className="timeline">
        {ready && calStatus === "loading" && <div className="loading-note">{s.loading}</div>}
        {ready && calStatus !== "loading" && list.length === 0 && <div className="empty-note">🗓️</div>}
        {list.map((ev, idx) => {
          const allDay = ev.allDay || !ev.start;
          const past = isToday && !allDay && !!ev.end && ev.end <= now;
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
                  <div className="tl-time">
                    {allDay ? <span className="tl-allday">{s.allDay}</span> : (ev.start ?? "") + (ev.end ? "–" + ev.end : "")}
                    {ev.recurring && <span className="tl-repeat" aria-label={s.repeatLabel}>🔁</span>}
                  </div>
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
