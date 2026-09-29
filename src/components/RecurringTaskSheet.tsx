"use client";
import { useState } from "react";
import { useApp } from "./AppProvider";
import BottomSheet from "./BottomSheet";
import type { Recur } from "@/lib/types";

type Freq = Recur["freq"];

export default function RecurringTaskSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { s } = app;
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<Freq>("weekly");
  const [days, setDays] = useState<number[]>([0]);
  const [monthDay, setMonthDay] = useState(1);

  function toggleDay(i: number) {
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  }

  async function save() {
    const title = name.trim();
    if (!title) return;
    if (freq === "weekly" && days.length === 0) return;
    const recur: Recur =
      freq === "daily" ? { freq } : freq === "weekly" ? { freq, weekdays: [...days].sort() } : { freq, monthDay };
    await app.addTask({ title, recur });
    onClose();
  }

  const freqs: [Freq, string][] = [
    ["monthly", s.freqMonthly],
    ["weekly", s.freqWeekly],
    ["daily", s.freqDaily],
  ];

  return (
    <BottomSheet open onClose={onClose} title={s.recurringNewTitle} closeLabel={s.close}>
      <div className="field">
        <label htmlFor="rec-name">{s.lblRecurringName}</label>
        <input id="rec-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>{s.lblFrequency}</label>
        <div className="pill-row">
          {freqs.map(([f, label]) => (
            <button key={f} className={`pill-opt${freq === f ? " selected" : ""}`} onClick={() => setFreq(f)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {freq === "weekly" && (
        <div className="field">
          <label>{s.lblWeekDays}</label>
          <div className="pill-row">
            {s.weekDaysShort.map((lbl, i) => (
              <button key={i} className={`pill-opt${days.includes(i) ? " selected" : ""}`} onClick={() => toggleDay(i)}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}
      {freq === "monthly" && (
        <div className="field">
          <label htmlFor="monthDaySelect">{s.lblMonthDay}</label>
          <select id="monthDaySelect" value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
      )}
      <div className="sheet-actions">
        <button className="btn-cancel" onClick={onClose}>{s.cancelSheetBtn}</button>
        <button className="btn-save" onClick={save}>{s.saveRecurringBtn}</button>
      </div>
    </BottomSheet>
  );
}
