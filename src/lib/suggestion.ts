import type { CalEvent, Mail, Task } from "./types";
import { addDays } from "./dates";
import { scoreMail, type SenderPrefs } from "./mailPriority";
import { isTaskDone } from "./recurrence";

export type Suggestion =
  | { kind: "event"; event: CalEvent }
  | { kind: "mail"; mail: Mail }
  | { kind: "task"; task: Task }
  | { kind: "none" };

/**
 * The dashboard's "most urgent next thing":
 * next timed event today → urgent mail → task due today/overdue → next event this week →
 * any open task → unread mail → all clear.
 */
export function pickSuggestion(
  events: CalEvent[],
  mails: Mail[],
  tasks: Task[],
  today: string,
  now: string,
  prefs: SenderPrefs = {},
): Suggestion {
  const byStart = (a: CalEvent, b: CalEvent) => (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? ""));
  const todayNext = events.filter((e) => e.date === today && !!e.start && !e.allDay && e.start >= now).sort(byStart);
  if (todayNext.length) return { kind: "event", event: todayNext[0] };

  const urgent = mails
    .filter((m) => scoreMail(m, prefs).level === "urgent")
    .sort((a, b) => Number(b.unread) - Number(a.unread) || b.date.localeCompare(a.date));
  if (urgent.length) return { kind: "mail", mail: urgent[0] };

  const open = tasks.filter((t) => !isTaskDone(t, today));
  const dueNow = open.filter((t) => !!t.dueDate && t.dueDate <= today).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  if (dueNow.length) return { kind: "task", task: dueNow[0] };

  const week = addDays(today, 7);
  const soon = events.filter((e) => e.date > today && e.date <= week).sort(byStart);
  if (soon.length) return { kind: "event", event: soon[0] };

  if (open.length) return { kind: "task", task: open[0] };

  const unread = mails.find((m) => m.unread && scoreMail(m, prefs).level !== "low");
  if (unread) return { kind: "mail", mail: unread };

  return { kind: "none" };
}
