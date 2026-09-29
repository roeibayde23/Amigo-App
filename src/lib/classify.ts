import type { Strings } from "./i18n";
import type { Lang } from "./types";

export type Classified = { type: "event" | "task"; title: string; time: string; tomorrow: boolean };

/** Port of the prototype's simulated "voice" parser (+ "מחר"/"tomorrow"). */
export function classify(raw: string, s: Strings, lang: Lang): Classified {
  const text = raw.trim();
  let isEvent = s.eventWords.some((w) => text.toLowerCase().includes(w.toLowerCase()));
  let time = "";
  const re = lang === "he"
    ? /ב-?\s*(\d{1,2})(:(\d{2}))?\s*(בבוקר|בערב|בצהריים|בלילה)?/
    : /at\s*(\d{1,2})(:(\d{2}))?\s*(am|pm)?/i;
  const m = text.match(re);
  if (m) {
    isEvent = true;
    let hour = parseInt(m[1], 10);
    const minutes = m[3] || "00";
    const ampm = (m[4] || "").toLowerCase();
    if (lang === "he") {
      if ((ampm === s.ampmEvening || ampm === s.ampmNight || ampm === "בצהריים") && hour < 12) hour += 12;
    } else {
      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
    }
    hour = Math.min(hour, 23);
    time = String(hour).padStart(2, "0") + ":" + minutes;
  }
  const tomorrow = s.tomorrowWords.some((w) => text.toLowerCase().includes(w.toLowerCase()));

  let title = text;
  if (m) title = title.replace(m[0], " ");
  for (const w of [...s.stripWords, ...s.tomorrowWords]) title = title.replace(new RegExp(w, "gi"), " ");
  title = title.replace(/\s{2,}/g, " ").trim();
  if (!title) title = text;
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return { type: isEvent ? "event" : "task", title, time, tomorrow };
}
