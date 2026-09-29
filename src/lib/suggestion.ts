import type { CalEvent, Mail, Task } from "./types";
import { isTaskDone } from "./recurrence";

export type Suggestion =
  | { kind: "event"; event: CalEvent }
  | { kind: "mail"; mail: Mail }
  | { kind: "task"; task: Task }
  | { kind: "none" };

/** Same priority as the prototype: next event → important (or unread) mail → open task → all clear. */
export function pickSuggestion(events: CalEvent[], mails: Mail[], tasks: Task[], today: string, now: string): Suggestion {
  const upcoming = events
    .filter((e) => e.date > today || (e.date === today && (e.start ?? "") >= now))
    .sort((a, b) => (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? "")));
  if (upcoming.length) return { kind: "event", event: upcoming[0] };

  const mail = mails.find((m) => m.important) ?? mails.find((m) => m.unread);
  if (mail) return { kind: "mail", mail };

  const open = tasks.find((t) => !isTaskDone(t, today));
  if (open) return { kind: "task", task: open };

  return { kind: "none" };
}
