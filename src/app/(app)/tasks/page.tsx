"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import RecurringTaskSheet from "@/components/RecurringTaskSheet";
import SubHeader from "@/components/SubHeader";
import { CheckIcon, FileIcon, PlusIcon, RepeatIcon, TrashIcon } from "@/components/icons";
import { classify } from "@/lib/classify";
import { addDays, shortDate } from "@/lib/dates";
import { isTaskDone, recurLabel } from "@/lib/recurrence";

export default function TasksPage() {
  const app = useApp();
  const { s, lang, tasks, today, ready, openTaskCount } = app;
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [recurOpen, setRecurOpen] = useState(false);
  const [text, setText] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    if (quickAdd) inputRef.current?.focus();
  }, [quickAdd]);

  function add() {
    const v = text.trim();
    if (!v) return;
    // "להתקשר לבנק מחר ב-10" → title "להתקשר לבנק", due tomorrow 10:00
    const parsed = classify(v, s, lang, today);
    const hasWhen = !!parsed.date || !!parsed.time;
    const dueDate = parsed.date ?? (parsed.time ? today : null);
    setText("");
    setQuickAdd(false);
    // synchronous call inside the tap → may open the iPhone Reminders shortcut
    void app.addTask({
      title: hasWhen ? parsed.title : v,
      recur: null,
      dueDate,
      dueTime: parsed.time || null,
    });
  }

  function dueTag(date: string, time: string | null | undefined, done: boolean) {
    const label = date === today ? s.dueToday : date === addDays(today, 1) ? s.dueTomorrow : shortDate(date, s, lang);
    const cls = done ? "" : date < today ? " overdue" : date === today ? " today" : "";
    return <span className={`task-due${cls}`}>{`${label}${time ? " · " + time : ""}`}</span>;
  }

  return (
    <div className="view active">
      <SubHeader />
      <div className="tasks-head-row">
        <div className="new-task-wrap" ref={wrapRef}>
          <button className="new-task-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
            <PlusIcon />
            <span>{s.newTaskBtnLabel}</span>
          </button>
          <div className={`new-task-menu${menuOpen ? " open" : ""}`}>
            <button onClick={() => { setMenuOpen(false); setQuickAdd(true); }}>
              <FileIcon /><span>{s.regularTaskLabel}</span>
            </button>
            <button onClick={() => { setMenuOpen(false); setRecurOpen(true); }}>
              <RepeatIcon /><span>{s.recurringTaskLabel}</span>
            </button>
          </div>
        </div>
        <div className="tasks-head-title">
          <div className="tasksPageTitle">{s.tasksPageTitle}</div>
          {ready && <div className="tasksPageSub">{s.tasksPageSub(openTaskCount)}</div>}
        </div>
      </div>

      {quickAdd && (
        <div className="add-row">
          <input
            ref={inputRef}
            type="text"
            value={text}
            placeholder={s.addPlaceholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button onClick={add} aria-label={s.addBtn}>+</button>
        </div>
      )}

      <div>
        {ready && tasks.length === 0 && <div className="empty-note">{s.emptyTasks}</div>}
        {tasks.map((t) => {
          const done = isTaskDone(t, today);
          return (
            <div className="task-row-card" key={t.id}>
              <button className="task-del" onClick={() => app.deleteTask(t.id)} aria-label="delete">
                <TrashIcon />
              </button>
              <span className="task-text" style={done ? { color: "var(--ink-soft)", textDecoration: "line-through" } : undefined}>
                {t.title}
              </span>
              {!t.recur && t.dueDate && dueTag(t.dueDate, t.dueTime, done)}
              {t.recur && (
                <span className="task-recurring" title={recurLabel(t.recur, s)}>
                  {s.recurringTag} <span className="task-recurring-detail">· {recurLabel(t.recur, s)}</span>
                </span>
              )}
              <button
                className="task-check"
                onClick={() => app.toggleTask(t.id)}
                style={done ? { background: "var(--gold)" } : undefined}
                aria-pressed={done}
                aria-label={t.title}
              >
                <CheckIcon style={done ? { opacity: 1, stroke: "var(--paper)" } : { opacity: 0 }} />
              </button>
            </div>
          );
        })}
      </div>

      {recurOpen && <RecurringTaskSheet onClose={() => setRecurOpen(false)} />}
    </div>
  );
}
