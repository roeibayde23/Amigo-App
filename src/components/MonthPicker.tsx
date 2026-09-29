"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "./icons";
import { daysInMonth, weekdayOf } from "@/lib/dates";
import type { Strings } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const ym = (d: string) => d.slice(0, 7);
function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Mini month calendar popover: Sunday-first, RTL in Hebrew, month arrows, dots on days with events. */
export default function MonthPicker({
  value,
  today,
  eventDates,
  s,
  lang,
  onPick,
  onClose,
  top,
}: {
  value: string;
  today: string;
  eventDates: Set<string>;
  s: Strings;
  lang: Lang;
  onPick: (date: string) => void;
  onClose: () => void;
  /** viewport y (px) where the popover starts – just under the date button */
  top: number;
}) {
  const [month, setMonth] = useState(ym(value));
  const first = `${month}-01`;
  const lead = weekdayOf(first); // 0 = Sunday → first column
  const n = daysInMonth(first);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);
  const [y, m] = month.split("-").map(Number);
  const rtl = lang === "he";
  // RTL: the previous month sits on the right (start), the next month on the left (end).
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return (
    <>
      <div className="mp-backdrop" onClick={onClose} aria-hidden />
      <div className="mp" role="dialog" aria-label={s.pickDate} style={{ top }}>
        <div className="mp-head">
          <button className="mp-arrow" onClick={() => setMonth(shiftMonth(month, -1))} aria-label={s.prevMonth}>
            <PrevIcon />
          </button>
          <span className="mp-title">{`${s.months[m - 1]} ${y}`}</span>
          <button className="mp-arrow" onClick={() => setMonth(shiftMonth(month, 1))} aria-label={s.nextMonth}>
            <NextIcon />
          </button>
        </div>
        <div className="mp-grid mp-wd">
          {s.weekDaysShort.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mp-grid">
          {cells.map((d, i) =>
            d ? (
              <button
                key={d}
                className={`mp-day${d === value ? " sel" : ""}${d === today ? " today" : ""}`}
                onClick={() => onPick(d)}
                aria-pressed={d === value}
              >
                {Number(d.slice(8))}
                {eventDates.has(d) && <i className="mp-dot" />}
              </button>
            ) : (
              <span key={`e${i}`} />
            ),
          )}
        </div>
        {value !== today || ym(today) !== month ? (
          <button className="mp-today" onClick={() => onPick(today)}>{s.goToday}</button>
        ) : null}
      </div>
    </>
  );
}
