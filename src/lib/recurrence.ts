import { addDays, dayOfMonth, daysInMonth, weekdayOf } from "./dates";
import type { Strings } from "./i18n";
import type { Recur, Task } from "./types";

/** Is a recurring task scheduled on this date? (monthly day 31 → last day of shorter months) */
export function isDueOn(recur: Recur, date: string): boolean {
  switch (recur.freq) {
    case "daily":
      return true;
    case "weekly":
      return recur.weekdays.includes(weekdayOf(date));
    case "monthly":
      return dayOfMonth(date) === Math.min(recur.monthDay, daysInMonth(date));
  }
}

/** Most recent occurrence on or before `today` (searches up to ~1 year back). */
export function currentOccurrence(recur: Recur, today: string): string | null {
  for (let i = 0; i < 370; i++) {
    const d = addDays(today, -i);
    if (isDueOn(recur, d)) return d;
  }
  return null;
}

/**
 * FIX (prototype bug #1): recurring tasks now reset automatically.
 * A recurring task is "done" only if it was completed on/after its current occurrence;
 * when the next occurrence arrives it becomes open again.
 */
export function isTaskDone(task: Task, today: string): boolean {
  if (!task.recur) return task.done;
  if (!task.lastDoneOn) return false;
  const occ = currentOccurrence(task.recur, today);
  return !!occ && task.lastDoneOn >= occ;
}

/** Patch to apply when the user taps the checkbox. */
export function togglePatch(task: Task, today: string): Partial<Task> {
  if (!task.recur) return { done: !task.done };
  return { lastDoneOn: isTaskDone(task, today) ? null : today };
}

export function recurLabel(recur: Recur, s: Strings): string {
  switch (recur.freq) {
    case "daily":
      return s.recurDaily;
    case "weekly":
      return s.recurWeekly(
        [...recur.weekdays].sort((a, b) => a - b).map((d) => s.weekDaysShort[d]).join(","),
      );
    case "monthly":
      return s.recurMonthly(recur.monthDay);
  }
}
