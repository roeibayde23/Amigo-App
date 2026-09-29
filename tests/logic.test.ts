import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/lib/classify";
import { STRINGS } from "../src/lib/i18n";
import { groupMail, hasUrgentKeyword, isAutomatedSender, scoreMail } from "../src/lib/mailPriority";
import { reminderPayload, shortcutUrl, tzOffset } from "../src/lib/reminders";
import { calToGoogleEvent, googleEventToCal, recurToRRule, rruleToRecur } from "../src/lib/google/mapping";
import { isTaskDone, togglePatch } from "../src/lib/recurrence";
import { pickSuggestion } from "../src/lib/suggestion";
import type { Mail, Recur, Task } from "../src/lib/types";

const he = STRINGS.he, en = STRINGS.en;
const TODAY = "2026-09-29"; // Tuesday

test("classify: Hebrew event with tomorrow + time", () => {
  const r = classify("תקבע לי פגישה עם שי מחר ב-9", he, "he", TODAY);
  assert.equal(r.type, "event");
  assert.equal(r.date, "2026-09-30");
  assert.equal(r.time, "09:00");
  assert.equal(r.title, "פגישה עם שי");
});
test("classify: Hebrew task with date only", () => {
  const r = classify("להתקשר לבנק מחר", he, "he", TODAY);
  assert.equal(r.type, "task");
  assert.equal(r.date, "2026-09-30");
  assert.equal(r.time, "");
  assert.equal(r.title, "להתקשר לבנק");
});
test("classify: to-dos with a time stay tasks", () => {
  const a = classify("להתקשר לבנק מחר ב-10", he, "he", TODAY);
  assert.deepEqual([a.type, a.date, a.time, a.title], ["task", "2026-09-30", "10:00", "להתקשר לבנק"]);
  const b = classify("תזכיר לי לקנות חלב היום ב-18:00", he, "he", TODAY);
  assert.deepEqual([b.type, b.date, b.time], ["task", TODAY, "18:00"]);
  assert.equal(classify("לפגוש את דנה מחר ב-8", he, "he", TODAY).type, "event");
  assert.equal(classify("Call mom tomorrow at 6pm", en, "en", TODAY).type, "task");
});
test("classify: Hebrew number words + evening", () => {
  const r = classify("ארוחת ערב עם דנה ביום חמישי בשמונה וחצי בערב", he, "he", TODAY);
  assert.equal(r.type, "event");
  assert.equal(r.date, "2026-10-01");
  assert.equal(r.time, "20:30");
});
test("classify: English", () => {
  const r = classify("Meeting with Shai tomorrow at 3pm", en, "en", TODAY);
  assert.deepEqual([r.type, r.date, r.time, r.title], ["event", "2026-09-30", "15:00", "Meeting with Shai"]);
  const t = classify("buy milk", en, "en", TODAY);
  assert.deepEqual([t.type, t.date], ["task", null]);
});

const mail = (p: Partial<Mail>): Mail => ({
  id: p.id ?? "m", threadId: "t", from: "X", fromEmail: "x@gmail.com", subject: "", snippet: "",
  date: "2026-09-29T08:00:00Z", unread: true, important: false, ...p,
});

test("mail priority: keywords, automated, prefs", () => {
  assert.ok(hasUrgentKeyword("תשלום ועד בית — תזכורת"));
  assert.ok(hasUrgentKeyword("URGENT: server down"));
  assert.ok(!hasUrgentKeyword("תמונות מהטיול"));
  assert.ok(!hasUrgentKeyword("Produced by the team")); // "due" only as a whole word
  assert.ok(isAutomatedSender({ fromEmail: "no-reply@bank.co.il" }));
  assert.ok(isAutomatedSender({ fromEmail: "dana@gmail.com", bulk: true }));
  assert.ok(!isAutomatedSender({ fromEmail: "dana@gmail.com" }));

  assert.equal(scoreMail(mail({ subject: "דחוף — חוזה" })).level, "urgent");
  assert.equal(scoreMail(mail({ subject: "20% הנחה", fromEmail: "news@wolt.com", bulk: true, category: "PROMOTIONS" })).level, "low");
  const plain = scoreMail(mail({ subject: "תמונות מהטיול", fromEmail: "Dana@Gmail.com" }));
  assert.equal(plain.level, "normal");
  assert.ok(plain.ask);
  assert.equal(scoreMail(mail({ subject: "תמונות", fromEmail: "Dana@Gmail.com" }), { "dana@gmail.com": true }).level, "urgent");
  assert.equal(scoreMail(mail({ subject: "דחוף", fromEmail: "dana@gmail.com" }), { "dana@gmail.com": false }).level, "low");
  assert.equal(scoreMail(mail({ subject: "x", fromEmail: "no-reply@x.com", important: true })).level, "urgent");
  const g = groupMail([mail({ id: "a", subject: "דחוף" }), mail({ id: "b", subject: "hi" })], {});
  assert.deepEqual([g.urgent.length, g.normal.length, g.low.length], [1, 1, 0]);
});

test("reminders: payload + shortcut URL", () => {
  assert.equal(tzOffset("2026-09-30", "09:00", "Europe/Prague"), "+02:00");
  assert.equal(tzOffset("2026-12-01", "09:00", "Europe/Prague"), "+01:00");
  const p = reminderPayload("להתקשר לבנק", "2026-09-30", null);
  assert.deepEqual(p, { title: "להתקשר לבנק", due: "2026-09-30 09:00", iso: "2026-09-30T09:00:00+02:00", notes: "Amigo" });
  assert.equal(reminderPayload("x").due, "");
  const url = shortcutUrl(p);
  assert.ok(url.startsWith("shortcuts://run-shortcut?name=Amigo%20Reminder&input=text&text="));
  const text = decodeURIComponent(url.split("&text=")[1]);
  assert.deepEqual(JSON.parse(text), p);
});

test("calendar mapping: RRULE round-trip + timed/all-day events", () => {
  const rules: Recur[] = [{ freq: "daily" }, { freq: "weekly", weekdays: [0, 2] }, { freq: "monthly", monthDay: 15 }];
  for (const r of rules) {
    assert.deepEqual(rruleToRecur(recurToRRule(r)), r);
  }
  const body = calToGoogleEvent({ title: "פגישה", date: "2026-09-30", start: "09:00", end: "10:00", color: "#D96C5A" }, "Europe/Prague") as {
    start: { dateTime: string; timeZone: string };
  };
  assert.equal(body.start.dateTime, "2026-09-30T09:00:00");
  assert.equal(body.start.timeZone, "Europe/Prague");
  const ev = googleEventToCal(
    { id: "g1", summary: "Trip", start: { date: "2026-10-02" }, end: { date: "2026-10-05" } },
    "Europe/Prague",
  )!;
  assert.deepEqual([ev.date, ev.endDate, ev.allDay, ev.start], ["2026-10-02", "2026-10-04", true, null]);
});

test("recurring tasks reset on the next occurrence", () => {
  const t: Task = { id: "1", title: "rent", done: false, recur: { freq: "monthly", monthDay: 1 }, lastDoneOn: null, sourceGmailId: null, createdAt: "" };
  const done = { ...t, ...togglePatch(t, "2026-09-01") };
  assert.ok(isTaskDone(done, "2026-09-29"));
  assert.ok(!isTaskDone(done, "2026-10-01"));
});

test("suggestion prefers upcoming event, then urgent mail", () => {
  const ev = { id: "e", title: "x", date: TODAY, start: "18:00", end: "19:00", color: "#000" };
  assert.equal(pickSuggestion([ev], [], [], TODAY, "12:00").kind, "event");
  assert.equal(pickSuggestion([ev], [mail({ subject: "דחוף" })], [], TODAY, "20:00").kind, "mail");
});
