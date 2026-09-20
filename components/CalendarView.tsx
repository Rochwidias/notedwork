"use client";

import { useMemo, useState } from "react";
import type { Routine, Sched, Task } from "@/lib/types";
import { dayNames, monthNames, dowInitials, fmtDateID, fmtSchedRange, taskBadge, todayStr, weekdayOf } from "@/lib/dates";
import { useLang } from "./LangProvider";
import {
  IconAlarm,
  IconBook,
  IconCalendarDays,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconGear,
  IconPencil,
  IconPlus,
  IconTrash,
} from "./icons";

interface Props {
  schedules: Sched[];
  routines: Routine[];
  tasks: Task[];
  selDate: string;
  onSelectDate: (iso: string) => void;
  onEditSched: (id: string) => void;
  onDeleteSched: (id: string, title: string) => void;
  onDeleteRoutine: (id: string, title: string) => void;
  onAddSched: () => void;
  onManageRoutine: () => void;
  preview?: boolean;
  onToggleTask?: (id: string) => void;
}

export default function CalendarView({
  schedules,
  routines,
  tasks,
  selDate,
  onSelectDate,
  onEditSched,
  onDeleteSched,
  onDeleteRoutine,
  onAddSched,
  onManageRoutine,
  preview,
  onToggleTask,
}: Props) {
  const { lang, t } = useLang();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const y = cursor.getFullYear();
  const mo = cursor.getMonth();
  const first = (new Date(y, mo, 1).getDay() + 6) % 7; // Senin=0
  const days = new Date(y, mo + 1, 0).getDate();
  const prevDays = new Date(y, mo, 0).getDate();

  const oSet = useMemo(() => new Set(schedules.map((s) => s.date)), [schedules]);
  const tSet = useMemo(
    () => new Set(tasks.filter((t) => !t.done).map((t) => t.date)),
    [tasks]
  );
  const rDays = useMemo(() => new Set(routines.map((r) => r.day)), [routines]);

  const cells: { key: string; label: number; iso: string | null; dim: boolean }[] = [];
  for (let i = first - 1; i >= 0; i--)
    cells.push({ key: `p${i}`, label: prevDays - i, iso: null, dim: true });
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key: iso, label: d, iso, dim: false });
  }
  const tail = (7 - ((first + days) % 7)) % 7;
  for (let d = 1; d <= tail; d++) cells.push({ key: `n${d}`, label: d, iso: null, dim: true });

  const ts = todayStr();
  const offToday = selDate !== ts;

  const wd = weekdayOf(selDate);
  const dayRoutines = routines
    .filter((x) => x.day === wd)
    .sort((a, b) => a.start.localeCompare(b.start));
  const daySched = schedules
    .filter((s) => s.date === selDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const dayTasks = tasks.filter((x) => x.date === selDate);
  const dayEmpty = dayRoutines.length + daySched.length + dayTasks.length === 0;

  // Agenda terdekat 7 hari ke depan — hanya dipakai saat tanggal pilihan kosong.
  // ISO yyyy-mm-dd bisa dibandingkan leksikografis.
  const upcoming = useMemo(() => {
    const end = new Date(selDate + "T00:00:00");
    end.setDate(end.getDate() + 7);
    const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    return schedules
      .filter((s) => s.date > selDate && s.date <= endIso)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [schedules, selDate]);

  const routineList = routines.slice().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));

  return (
    <section className="view active" id="v-kalender">
      <div className="greet">
        {t("nav.calendar")}<small>{preview ? t("cal.previewSub") : t("cal.liveSub")}</small>
      </div>
      <div className="cal-wrap">
      <div className="cal">
        <div className="cal-head">
          <button
            className="nav-btn"
            aria-label={t("cal.prevMonth")}
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          >
            <IconChevronLeft size={16} />
          </button>
          <b>
            {monthNames(lang)[mo]} {y}
          </b>
          <button
            className="nav-btn"
            aria-label={t("cal.nextMonth")}
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          >
            <IconChevronRight size={16} />
          </button>
        </div>
        <div className="grid">
          {dowInitials(lang).map((d, i) => (
            <div className="dow" key={i}>
              {d}
            </div>
          ))}
          {cells.map((c) => {
            if (!c.iso)
              return (
                <button key={c.key} type="button" className="day dim" tabIndex={-1} disabled aria-hidden="true">
                  {c.label}
                </button>
              );
            const cls = ["day"];
            if (c.iso === ts) cls.push("today");
            if (c.iso === selDate) cls.push("sel");
            const dots: string[] = [];
            if (rDays.has(weekdayOf(c.iso))) dots.push("var(--brand)");
            if (oSet.has(c.iso)) dots.push("#22c55e");
            if (tSet.has(c.iso)) dots.push("#ef4444");
            return (
              <button key={c.key} type="button" className={cls.join(" ")} onClick={() => onSelectDate(c.iso as string)}>
                {c.label}
                {dots.length > 0 && (
                  <span className="dots">
                    {dots.map((col) => (
                      <i key={col} style={{ background: col }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span>
            <i className="dot" style={{ background: "var(--brand)" }} />
            {t("cal.routine")}
          </span>
          <span>
            <i className="dot" style={{ background: "#22c55e" }} />
            {t("cal.agenda")}
          </span>
          <span>
            <i className="dot" style={{ background: "#ef4444" }} />
            {t("cal.deadline")}
          </span>
        </div>
      </div>
      <div className="card agenda">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconCalendarDays size={15} />
            </span>
            {t("cal.agenda")} • {fmtDateID(selDate, lang)}
          </h2>
          {offToday && (
            <button className="link link-ic" onClick={() => onSelectDate(ts)} aria-label={t("cal.backToday")}>
              {t("cal.today")} <span aria-hidden="true">›</span>
            </button>
          )}
        </div>
        <div>
          {dayRoutines.map((x) => (
            <div className="row" key={x.id}>
              <span className="dot" style={{ background: x.color || "var(--brand)" }} />
              <div>
                <div className="t">
                  {x.course} <span className="pill blue" style={{ margin: 0 }}>{t("cal.routine")}</span>
                </div>
                <div className="s">
                  {x.start}–{x.end}
                  {x.room ? ` • ${t("cal.room")} ${x.room}` : ""}
                  {x.lect ? ` • ${x.lect}` : ""}
                </div>
              </div>
            </div>
          ))}
          {daySched.map((s) => (
            <div className="row" key={s.id}>
              <span className="dot" style={{ background: s.color || "#22c55e" }} />
              <div>
                <div className="t">
                  {s.title} <span style={{ color: "var(--muted)", fontWeight: 500 }}>• {fmtSchedRange(s, lang)}</span>
                </div>
                {s.note && <div className="s">{s.note}</div>}
              </div>
              <button className="edit del-ic" aria-label={`${t("common.edit")} ${s.title}`} onClick={() => onEditSched(s.id)}>
                <IconPencil size={15} />
              </button>
              <button className="del del-ic" aria-label={`${t("common.delete")} ${s.title}`} onClick={() => onDeleteSched(s.id, s.title)}>
                <IconTrash size={15} />
              </button>
            </div>
          ))}
          {dayTasks.map((x) => {
            const b = taskBadge(x, lang);
            const toggle = () => onToggleTask?.(x.id);
            return (
              <div
                className="row"
                key={x.id}
                role="button"
                tabIndex={0}
                aria-label={`${x.title}${t("common.tapToComplete")}`}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="dot" style={{ background: "#ef4444" }} />
                <div>
                  <div className="t row-ic">
                    <IconAlarm size={14} />
                    {x.title} {x.done && <IconCheck size={14} />} <span className={`tag ${b.cls}`}>{b.txt}</span>
                  </div>
                  <div className="s">
                    {x.matkul}{t("cal.deadlineAt")}{x.time}
                  </div>
                </div>
                <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
              </div>
            );
          })}
          {dayEmpty && (
            <div className="empty">
              {t("cal.emptyDate")}
              <br />
              {upcoming.length ? t("cal.upcoming7") : t("cal.enjoyDay")}
            </div>
          )}
          {dayEmpty &&
            upcoming.map((s) => {
              const jump = () => onSelectDate(s.date);
              return (
                <div
                  className="row"
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.title} • ${fmtDateID(s.date, lang)}`}
                  onClick={jump}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      jump();
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <span className="dot" style={{ background: s.color || "#22c55e" }} />
                  <div>
                    <div className="t">
                      {s.title}{" "}
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>• {fmtSchedRange(s, lang)}</span>
                    </div>
                    <div className="s">{fmtDateID(s.date, lang)}</div>
                  </div>
                  <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
                </div>
              );
            })}
        </div>
        <button className="btn primary block btn-ic" onClick={onAddSched} style={{ marginTop: 10 }}>
          <IconPlus size={16} />
          {t("cal.addSched")}
        </button>
      </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconBook size={15} />
            </span>
            {t("cal.weeklyRoutine")}
          </h2>
        </div>
        <div>
          {routineList.length ? (
            routineList.map((r) => (
              <div className="row" key={r.id}>
                <span className="dot" style={{ background: r.color || "var(--brand)" }} />
                <div>
                  <div className="t">{r.course}</div>
                  <div className="s">
                    {dayNames(lang)[r.day - 1]} • {r.start}–{r.end}
                    {r.room ? ` • ${t("cal.room")} ${r.room}` : ""}
                    {r.lect ? ` • ${r.lect}` : ""}
                  </div>
                </div>
                <button className="del del-ic" aria-label={`${t("common.delete")} ${r.course}`} onClick={() => onDeleteRoutine(r.id, r.course)}>
                  <IconTrash size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty">{t("cal.noRoutine")}</div>
          )}
        </div>
        <button className="btn ghost block btn-ic" onClick={onManageRoutine} style={{ marginTop: 10 }}>
          <IconGear size={15} />
          {t("cal.manageRoutine")}
        </button>
      </div>
    </section>
  );
}
