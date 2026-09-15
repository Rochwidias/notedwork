"use client";

import { useMemo, useState } from "react";
import type { Routine, Sched, Task } from "@/lib/types";
import { DAYS, MONTHS, fmtDateID, taskBadge, todayStr, weekdayOf } from "@/lib/dates";

interface Props {
  schedules: Sched[];
  routines: Routine[];
  tasks: Task[];
  selDate: string;
  onSelectDate: (iso: string) => void;
  onDeleteSched: (id: string) => void;
  onDeleteRoutine: (id: string) => void;
  onAddSched: () => void;
  onManageRoutine: () => void;
  preview?: boolean;
}

export default function CalendarView({
  schedules,
  routines,
  tasks,
  selDate,
  onSelectDate,
  onDeleteSched,
  onDeleteRoutine,
  onAddSched,
  onManageRoutine,
  preview,
}: Props) {
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

  const wd = weekdayOf(selDate);
  const dayRoutines = routines
    .filter((x) => x.day === wd)
    .sort((a, b) => a.start.localeCompare(b.start));
  const daySched = schedules.filter((s) => s.date === selDate);
  const dayTasks = tasks.filter((x) => x.date === selDate);
  const routineList = routines.slice().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));

  return (
    <section className="view active" id="v-kalender">
      <div className="greet">
        Kalender kuliah<small>{preview ? "Data contoh — login untuk Google Calendar aslimu" : "Ketuk tanggal untuk melihat matkul, agenda & deadline"}</small>
      </div>
      <div className="cal">
        <div className="cal-head">
          <button
            className="nav-btn"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          >
            ‹
          </button>
          <b>
            {MONTHS[mo]} {y}
          </b>
          <button
            className="nav-btn"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>
        <div className="grid">
          {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
            <div className="dow" key={i}>
              {d}
            </div>
          ))}
          {cells.map((c) => {
            if (!c.iso)
              return (
                <button key={c.key} className="day dim" tabIndex={-1}>
                  {c.label}
                </button>
              );
            const cls = ["day"];
            if (c.iso === todayStr()) cls.push("today");
            if (c.iso === selDate) cls.push("sel");
            const dots: string[] = [];
            if (rDays.has(weekdayOf(c.iso))) dots.push("#00cfff");
            if (oSet.has(c.iso)) dots.push("#22c55e");
            if (tSet.has(c.iso)) dots.push("#ef4444");
            return (
              <button key={c.key} className={cls.join(" ")} onClick={() => onSelectDate(c.iso as string)}>
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
            <i className="dot" style={{ background: "#00cfff" }} />
            Rutin
          </span>
          <span>
            <i className="dot" style={{ background: "#22c55e" }} />
            Agenda
          </span>
          <span>
            <i className="dot" style={{ background: "#ef4444" }} />
            Deadline
          </span>
        </div>
      </div>
      <div className="card">
        <h2>Agenda • {fmtDateID(selDate)}</h2>
        <div>
          {dayRoutines.map((x) => (
            <div className="row" key={x.id}>
              <span className="dot" style={{ background: x.color || "#00cfff" }} />
              <div>
                <div className="t">
                  {x.course} <span className="pill blue" style={{ margin: 0 }}>Rutin</span>
                </div>
                <div className="s">
                  {x.start}–{x.end}
                  {x.room ? ` • Ruang ${x.room}` : ""}
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
                  {s.title} <span style={{ color: "var(--muted)", fontWeight: 500 }}>• {s.time}</span>
                </div>
                {s.note && <div className="s">{s.note}</div>}
              </div>
              <button className="del" style={{ marginLeft: "auto" }} onClick={() => onDeleteSched(s.id)}>
                Hapus
              </button>
            </div>
          ))}
          {dayTasks.map((x) => {
            const b = taskBadge(x);
            return (
              <div className="row" key={x.id}>
                <span className="dot" style={{ background: "#ef4444" }} />
                <div>
                  <div className="t">
                    ⏰ {x.title} {x.done ? "✅" : ""} <span className={`tag ${b.cls}`}>{b.txt}</span>
                  </div>
                  <div className="s">
                    {x.matkul} • deadline {x.time}
                  </div>
                </div>
              </div>
            );
          })}
          {dayRoutines.length + daySched.length + dayTasks.length === 0 && (
            <div className="empty">
              🎉 Tidak ada agenda di tanggal ini.
              <br />
              Nikmati harimu!
            </div>
          )}
        </div>
        <button className="btn primary block" onClick={onAddSched} style={{ marginTop: 10 }}>
          ➕ Tambah jadwal di tanggal ini
        </button>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>📚 Jadwal rutin mingguan</h2>
        </div>
        <div>
          {routineList.length ? (
            routineList.map((r) => (
              <div className="row" key={r.id}>
                <span className="dot" style={{ background: r.color || "#00cfff" }} />
                <div>
                  <div className="t">{r.course}</div>
                  <div className="s">
                    {DAYS[r.day - 1]} • {r.start}–{r.end}
                    {r.room ? ` • Ruang ${r.room}` : ""}
                    {r.lect ? ` • ${r.lect}` : ""}
                  </div>
                </div>
                <button className="del" style={{ marginLeft: "auto" }} onClick={() => onDeleteRoutine(r.id)}>
                  Hapus
                </button>
              </div>
            ))
          ) : (
            <div className="empty">Belum ada jadwal rutin.</div>
          )}
        </div>
        <button className="btn ghost block" onClick={onManageRoutine} style={{ marginTop: 10 }}>
          ⚙️ Kelola jadwal rutin
        </button>
      </div>
    </section>
  );
}
