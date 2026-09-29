import { addDays, weekdayOf } from "./dates";
import type { Strings } from "./i18n";
import type { Lang } from "./types";

/** Result of the "voice" parser: what to create, its title, and when. */
export type Classified = {
  type: "event" | "task";
  title: string;
  time: string; // HH:MM or ""
  date: string | null; // YYYY-MM-DD, null = no date (tasks only)
};

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const EN_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
// Longest first so "אחת עשרה" wins over "אחת".
const HE_NUMS: [string, number][] = [
  ["אחת עשרה", 11], ["אחד עשרה", 11], ["שתים עשרה", 12], ["שתיים עשרה", 12],
  ["אחת", 1], ["שתיים", 2], ["שתים", 2], ["שלוש", 3], ["ארבע", 4], ["חמש", 5], ["שש", 6],
  ["שבע", 7], ["שמונה", 8], ["תשע", 9], ["עשר", 10],
];
const HE_PM = ["בערב", "בלילה", "בצהריים", "אחה\"צ", "אחר הצהריים", "אחרי הצהריים"];
const END = "(?=$|[\\s.,!?])"; // word end (\b does not work for Hebrew letters)

function nextWeekday(today: string, wd: number): string {
  const diff = (wd - weekdayOf(today) + 7) % 7 || 7; // "on Tuesday" said on a Tuesday → next week
  return addDays(today, diff);
}

function to24(hour: number, qualifier: string, lang: Lang): number {
  const q = qualifier.toLowerCase();
  if (lang === "en") {
    if (q === "pm" && hour < 12) return hour + 12;
    if (q === "am" && hour === 12) return 0;
    if (!q && hour >= 1 && hour <= 6) return hour + 12; // "at 3" → 15:00
    return hour;
  }
  if (HE_PM.includes(qualifier) && hour < 12) return hour + 12;
  if (!qualifier && hour >= 1 && hour <= 6) return hour + 12; // "ב-3" → 15:00 (daytime guess)
  return hour;
}

type Found = { match: string; value: string };

function findTime(text: string, lang: Lang): Found | null {
  const pad = (h: number, m: number) => `${String(Math.min(h, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  if (lang === "he") {
    const qual = `(?:\\s*(${HE_PM.join("|")}|בבוקר))?`;
    // digits: "ב-9", "ב9:30", "בשעה 21:00", "ב 7 בערב"
    let m = text.match(new RegExp(`(?:^|\\s)(?:בשעה|ב-?)\\s*(\\d{1,2})(?::(\\d{2}))?(\\s*וחצי|\\s*ורבע)?${qual}${END}`));
    if (m) {
      const add = m[3]?.includes("חצי") ? 30 : m[3]?.includes("רבע") ? 15 : 0;
      return { match: m[0], value: pad(to24(Number(m[1]), m[4] ?? "", lang), Number(m[2] ?? 0) + add) };
    }
    // words: "בתשע", "בשעה שמונה וחצי בערב"
    const words = HE_NUMS.map(([w]) => w).join("|");
    m = text.match(new RegExp(`(?:^|\\s)(?:בשעה\\s*|ב-?)(${words})(\\s*וחצי|\\s*ורבע)?${qual}${END}`));
    if (m) {
      const n = HE_NUMS.find(([w]) => w === m![1])![1];
      const add = m[2]?.includes("חצי") ? 30 : m[2]?.includes("רבע") ? 15 : 0;
      return { match: m[0], value: pad(to24(n, m[3] ?? "", lang), add) };
    }
    // bare "21:30"
    m = text.match(/(?:^|\s)(\d{1,2}):(\d{2})(?=$|[\s.,!?])/);
    if (m) return { match: m[0], value: pad(Number(m[1]), Number(m[2])) };
    return null;
  }
  let m = text.match(/\bat\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i) ?? text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m) return { match: m[0], value: pad(to24(Number(m[1]), m[3] ?? "", lang), Number(m[2] ?? 0)) };
  m = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) return { match: m[0], value: pad(Number(m[1]), Number(m[2])) };
  return null;
}

function findDate(text: string, lang: Lang, today: string): Found | null {
  if (lang === "he") {
    const rel: [RegExp, number][] = [
      [new RegExp(`(?:^|\\s)מחרתיים${END}`), 2],
      [new RegExp(`(?:^|\\s)(?:ל|עד )?מחר${END}`), 1],
      [new RegExp(`(?:^|\\s)(?:היום|הערב|הלילה)${END}`), 0],
    ];
    for (const [re, n] of rel) {
      const m = text.match(re);
      if (m) return { match: m[0], value: addDays(today, n) };
    }
    const m = text.match(new RegExp(`(?:^|\\s)(?:ב|ל)?יום\\s+(${HE_DAYS.join("|")})${END}|(?:^|\\s)(?:ב|ל)שבת${END}`));
    if (m) return { match: m[0], value: nextWeekday(today, m[1] ? HE_DAYS.indexOf(m[1]) : 6) };
    const d = text.match(/(?:^|\s)(?:ב-?)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=$|[\s,!?])/);
    if (d) return { match: d[0], value: explicitDate(d, today) };
    return null;
  }
  const rel: [RegExp, number][] = [
    [/\bday after tomorrow\b/i, 2],
    [/\btomorrow\b/i, 1],
    [/\b(today|tonight)\b/i, 0],
  ];
  for (const [re, n] of rel) {
    const m = text.match(re);
    if (m) return { match: m[0], value: addDays(today, n) };
  }
  const m = text.match(new RegExp(`\\b(?:on\\s+|next\\s+)?(${EN_DAYS.join("|")})\\b`, "i"));
  if (m) return { match: m[0], value: nextWeekday(today, EN_DAYS.indexOf(m[1].toLowerCase())) };
  return null;
}

function explicitDate(d: RegExpMatchArray, today: string): string {
  const [ty] = today.split("-").map(Number);
  const day = Number(d[1]), month = Number(d[2]);
  let year = d[3] ? Number(d[3].length === 2 ? `20${d[3]}` : d[3]) : ty;
  let iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!d[3] && iso < today) {
    year += 1; // "5/1" said in September → next January
    iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return iso;
}

const EN_TODO = /^(?:please\s+)?(?:remind me|call|phone|buy|pay|send|email|text|order|pick up|book|renew|cancel|finish|submit)\b|remind me/i;

/** First meaningful word is an infinitive ("להתקשר", "לקנות", "לשלם") or it's a "תזכיר לי" request. */
function isHebrewTodo(text: string, s: Strings): boolean {
  if (/(^|\s)(תזכיר|תזכירי|להזכיר)(\s|$)/.test(text)) return true;
  let rest = text;
  for (const w of s.stripWords) rest = rest.replace(new RegExp(`(^|\\s)${w}(?=$|\\s)`, "g"), " ");
  const first = rest.trim().split(/\s+/)[0] ?? "";
  return /^ל[א-ת]{3,}$/.test(first) && !/^(לפגוש|להיפגש|לפגישה|ליומן)$/.test(first);
}

/**
 * Parse a spoken/typed request, e.g. "פגישה עם מאיה מחר ב-9" → event tomorrow 09:00,
 * "להתקשר לבנק מחר" → task due tomorrow.
 */
export function classify(raw: string, s: Strings, lang: Lang, today: string): Classified {
  const text = raw.trim().replace(/\s+/g, " ");
  let rest = text;
  const time = findTime(rest, lang);
  if (time) rest = rest.replace(time.match, " ");
  const date = findDate(rest, lang, today);
  if (date) rest = rest.replace(date.match, " ");

  const hasEventWord = s.eventWords.some((w) => text.toLowerCase().includes(w.toLowerCase()));
  // "להתקשר לבנק מחר ב-10" / "תזכיר לי…" / "call the bank at 10" → a to-do with a reminder time
  const taskHint = lang === "he" ? isHebrewTodo(text, s) : EN_TODO.test(text);
  const type: Classified["type"] = hasEventWord || (time && !taskHint) ? "event" : "task";

  for (const w of s.stripWords) rest = rest.replace(new RegExp(`(^|\\s)${w}(?=$|\\s)`, "gi"), " ");
  let title = rest.replace(/\s{2,}/g, " ").replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, "").trim();
  if (!title) title = text;
  if (lang === "en") title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    type,
    title,
    time: time?.value ?? "",
    date: date?.value ?? (type === "event" ? today : null),
  };
}
