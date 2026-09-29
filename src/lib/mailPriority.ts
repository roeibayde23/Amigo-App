import type { Mail } from "./types";

/**
 * Mail priority heuristic (pure, unit-tested).
 *
 *   + Gmail IMPORTANT label (+2), starred (+3), user's own "important" flag (always urgent)
 *   + urgent keywords in the subject: דחוף / urgent / deadline / תשלום / … (+3; milder ones like אישור / reminder +1)
 *   + looks like a real person (no newsletter headers, no no-reply style address) (+2)
 *   − newsletters / automated senders (−3), Promotions / Social / Forums tabs (−2), Updates (−1)
 *   ± remembered answer for this sender ("זה חשוב?" yes → always urgent, no → always low)
 *
 * score ≥ 4 → urgent · 1…3 → uncertain (ask "זה חשוב?") · ≤ 0 → low
 */
export type MailLevel = "urgent" | "normal" | "low";
export type SenderPrefs = Record<string, boolean>; // sender email (lowercase) → important?

export type Priority = {
  level: MailLevel;
  score: number;
  keyword: boolean; // urgent keyword hit → badge says "דחוף" instead of "חשוב"
  ask: boolean; // uncertain and we don't know the sender yet
};

/** Strong signals → +3 and the red "דחוף" badge. */
const KEYWORDS = [
  "דחוף", "בהקדם", "מיידי", "דדליין", "תאריך אחרון", "עד היום", "תשלום", "לתשלום", "חוב", "חשבונית",
  "פיגור", "תזכורת אחרונה", "התראה אחרונה", "נדרשת פעולה", "פעולה נדרשת", "קנס", "התראת אבטחה",
  "urgent", "asap", "deadline", "overdue", "payment", "invoice", "final notice", "action required",
  "immediately", "past due", "security alert",
];
/** Mild signals → +1. */
const SOFT_KEYWORDS = ["אישור", "תזכורת", "חשוב", "ביטול", "עד מחר", "reminder", "important", "confirm", "cancel", "due"];
const AUTOMATED_LOCAL = /^(no-?reply|do-?not-?reply|donotreply|notifications?|notify|alerts?|news(letter)?|mailer(-daemon)?|marketing|promo(tions)?|info|updates?|support|hello|team|billing|service|bounce|postmaster|system|automated|digest)([+._-].*)?$/i;
const AUTOMATED_DOMAIN = /(^|\.)(mailchimp|sendgrid|mcsv|amazonses|mailgun|hubspot|substack|linkedin|facebookmail|mail\.instagram|youtube|medium|quora|pinterest|twitter|x)\.(com|net|io)$/i;

export const senderKey = (email: string) => email.trim().toLowerCase();

export function isAutomatedSender(m: Pick<Mail, "fromEmail" | "bulk">): boolean {
  if (m.bulk) return true;
  const email = senderKey(m.fromEmail);
  if (!email.includes("@")) return false;
  const [local, domain] = email.split("@");
  return AUTOMATED_LOCAL.test(local) || AUTOMATED_DOMAIN.test(domain);
}

const hit = (subject: string, words: string[]) => {
  const s = subject.toLowerCase();
  return words.some((k) => (/^[a-z ]+$/.test(k) ? new RegExp(`\\b${k}\\b`).test(s) : s.includes(k)));
};
export const hasUrgentKeyword = (subject: string) => hit(subject, KEYWORDS);

export function scoreMail(m: Mail, prefs: SenderPrefs = {}): Priority {
  const keyword = hasUrgentKeyword(m.subject);
  const pref = m.fromEmail ? prefs[senderKey(m.fromEmail)] : undefined;
  let score = 0;
  if (m.gmailImportant) score += 2;
  if (m.starred) score += 3;
  if (keyword) score += 3;
  else if (hit(m.subject, SOFT_KEYWORDS)) score += 1;
  const automated = isAutomatedSender(m);
  score += automated ? -3 : 2;
  if (m.category === "PROMOTIONS" || m.category === "SOCIAL" || m.category === "FORUMS") score -= 2;
  if (m.category === "UPDATES") score -= 1;

  if (m.important || pref === true) return { level: "urgent", score: Math.max(score, 10), keyword, ask: false };
  if (pref === false) return { level: "low", score: Math.min(score, -10), keyword, ask: false };
  if (score >= 4) return { level: "urgent", score, keyword, ask: false };
  if (score <= 0) return { level: "low", score, keyword, ask: false };
  return { level: "normal", score, keyword, ask: !!m.fromEmail };
}

/** Split into sections, newest first inside each. */
export function groupMail(mails: Mail[], prefs: SenderPrefs) {
  const out: Record<MailLevel, { mail: Mail; p: Priority }[]> = { urgent: [], normal: [], low: [] };
  for (const mail of mails) {
    const p = scoreMail(mail, prefs);
    out[p.level].push({ mail, p });
  }
  for (const k of Object.keys(out) as MailLevel[]) out[k].sort((a, b) => b.mail.date.localeCompare(a.mail.date));
  return out;
}
