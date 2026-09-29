"use client";
import { useState } from "react";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import { addMinutes, dayOfMonth, weekdayOf } from "@/lib/dates";
import { COLORS, type CalEvent, type Recur } from "@/lib/types";

type RepeatKind = "none" | "daily" | "weekly" | "monthly";

export default function EventSheet({
  event,
  defaultDate,
  onClose,
  onSaved,
}: {
  event: CalEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const app = useApp();
  const { s } = app;
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [start, setStart] = useState(event?.start ?? "");
  const [end, setEnd] = useState(event?.end ?? "");
  const [color, setColor] = useState<string>(event?.color ?? COLORS[0]);
  const [repeat, setRepeat] = useState<RepeatKind>("none");
  const [saving, setSaving] = useState(false);

  async function save() {
    const t = title.trim();
    if (!t || saving) return;
    const d = date || defaultDate;
    let e = end && start && end < start ? start : end; // keep end ≥ start
    if (start && !e) e = addMinutes(start, 60);
    const payload = { title: t, date: d, start: start || null, end: start ? e || null : null, color, allDay: !start };
    setSaving(true);
    if (event) {
      await app.updateEvent(event.id, { ...payload, endDate: event.allDay && !start ? event.endDate : null });
    } else {
      const rec: Recur | null =
        repeat === "daily"
          ? { freq: "daily" }
          : repeat === "weekly"
            ? { freq: "weekly", weekdays: [weekdayOf(d)] }
            : repeat === "monthly"
              ? { freq: "monthly", monthDay: dayOfMonth(d) }
              : null;
      const ok = await app.addEvent({ ...payload, repeat: rec, recurring: !!rec });
      if (!ok) return setSaving(false);
    }
    onSaved(d);
    onClose();
  }

  async function remove() {
    if (event) await app.deleteEvent(event.id);
    onClose();
  }

  return (
    <BottomSheet open onClose={onClose} title={event ? s.eventEditTitle : s.eventNewTitle} closeLabel={s.close}>
      <div className="field">
        <label htmlFor="ev-name">{s.lblName}</label>
        <input id="ev-name" type="text" value={title} placeholder={s.namePlaceholder} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ev-date">{s.lblDate}</label>
        <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="ev-start">{s.lblStart}</label>
          <input id="ev-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ev-end">{s.lblEnd}</label>
          <input id="ev-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      {!start && <p className="field-hint">{s.noTimeHint}</p>}
      {!event && (
        <div className="field">
          <label htmlFor="ev-repeat">{s.repeatLabel}</label>
          <select id="ev-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatKind)}>
            <option value="none">{s.repeatNone}</option>
            <option value="daily">{s.freqDaily}</option>
            <option value="weekly">{s.freqWeekly}</option>
            <option value="monthly">{s.freqMonthly}</option>
          </select>
        </div>
      )}
      {event?.recurring && <p className="field-hint">{s.recurringInstance}</p>}
      <div className="field">
        <label>{s.lblColor}</label>
        <div className="color-row">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-dot${c === color ? " selected" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
              aria-pressed={c === color}
            />
          ))}
        </div>
      </div>
      <div className="sheet-actions">
        <button className="btn-cancel" onClick={onClose}>{s.cancelSheetBtn}</button>
        <button className="btn-save" onClick={save} disabled={saving}>{saving ? s.loading : s.saveBtn}</button>
      </div>
      {event && <button className="btn-delete" onClick={remove}>{s.deleteEventBtn}</button>}
      {event?.link && (
        <a className="field-link" href={event.link} target="_blank" rel="noopener noreferrer">{s.openInGoogle} ↗</a>
      )}
    </BottomSheet>
  );
}
