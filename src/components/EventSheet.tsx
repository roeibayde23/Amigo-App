"use client";
import { useState } from "react";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import { COLORS, type CalEvent } from "@/lib/types";

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

  async function save() {
    const t = title.trim();
    if (!t) return;
    const d = date || defaultDate;
    const e = end && start && end < start ? start : end; // keep end ≥ start (DB constraint)
    const payload = { title: t, date: d, start: start || null, end: e || null, color };
    if (event) await app.updateEvent(event.id, payload);
    else await app.addEvent(payload);
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
        <button className="btn-save" onClick={save}>{s.saveBtn}</button>
      </div>
      {event && <button className="btn-delete" onClick={remove}>{s.deleteEventBtn}</button>}
    </BottomSheet>
  );
}
