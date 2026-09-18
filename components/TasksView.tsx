"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { Routine, Task } from "@/lib/types";
import { PRIO, fmtDateID, isOverdue, prioLabel, taskBadge } from "@/lib/dates";
import { useLang } from "./LangProvider";
import { IconCheck, IconPencil, IconPlus, IconX } from "./icons";

type Filter = "all" | "active" | "late" | "done";

interface Props {
  tasks: Task[];
  routines: Routine[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  preview?: boolean;
}

export default function TasksView({ tasks, routines, onToggle, onDelete, onAdd, onEdit, preview }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  // Ambil bahasa aktif + fungsi translate dari provider.
  const { lang, t } = useLang();

  const FILTERS: [Filter, string][] = [
    ["all", t("common.all")],
    ["active", t("tasks.filterActive")],
    ["late", t("tasks.filterOverdue")],
    ["done", t("tasks.filterDone")],
  ];

  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((task) => !task.done).length,
      late: tasks.filter((task) => isOverdue(task)).length,
      done: tasks.filter((task) => task.done).length,
    }),
    [tasks]
  );

  const courses = useMemo(() => [...new Set(routines.map((r) => r.course))], [routines]);

  const list = useMemo(() => {
    const l = tasks.filter((task) =>
      filter === "all" ? true : filter === "active" ? !task.done : filter === "done" ? task.done : isOverdue(task)
    );
    l.sort((a, b) => Number(a.done) - Number(b.done) || (a.date + a.time).localeCompare(b.date + b.time));
    return l;
  }, [tasks, filter]);

  return (
    <section className="view active" id="v-tugas">
      <div className="greet">
        {t("tasks.title")}<small>{preview ? t("tasks.previewSub") : t("tasks.liveSub")}</small>
      </div>
      <div className="chips" style={{ marginTop: 12 }}>
        {FILTERS.map(([v, l]) => (
          <button key={v} className={`chip${filter === v ? " on" : ""}`} onClick={() => setFilter(v)}>
            {l} ({counts[v]})
          </button>
        ))}
      </div>
      <datalist id="matkulList">
        {courses.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div style={{ marginTop: 4 }}>
        {list.length ? (
          list.map((task) => {
            const b = taskBadge(task, lang);
            const p = PRIO[task.prio] ?? PRIO.sedang;
            const pLabel = prioLabel(task.prio in PRIO ? task.prio : "sedang", lang);
            const onKey = (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(task.id);
              }
            };
            return (
              <div
                key={task.id}
                className={`trow${task.done ? " done" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${task.title} — ${task.done ? t("tasks.stateDone") : t("tasks.stateActive")}${t("tasks.tapToToggle")}`}
                onClick={() => onToggle(task.id)}
                onKeyDown={onKey}
              >
                <button
                  className="check"
                  title={t("common.markDone")}
                  aria-label={task.done ? t("tasks.reopen") : t("common.markDone")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(task.id);
                  }}
                >
                  {task.done ? <IconCheck size={15} /> : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div className="tt">{task.title}</div>
                  <div className="tm">
                    {task.matkul} • {fmtDateID(task.date, lang)} • {task.time}
                    {task.note ? ` • ${task.note}` : ""}
                  </div>
                  <div className="tags">
                    <span className={`tag ${p[1]}`}>{pLabel}</span>
                    <span className={`tag ${b.cls}`}>{b.txt}</span>
                  </div>
                </div>
                <button
                  className="del del-ic"
                  title={t("common.edit")}
                  aria-label={`${t("common.edit")} ${task.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task.id);
                  }}
                >
                  <IconPencil size={14} />
                </button>
                <button
                  className="del del-ic"
                  title={t("common.delete")}
                  aria-label={`${t("common.delete")} ${task.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                >
                  <IconX size={14} />
                </button>
                <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, flex: "none" }}>›</span>
              </div>
            );
          })
        ) : (
          <div className="empty">{t("tasks.emptyHere")}</div>
        )}
      </div>
      <button className="btn primary block btn-ic" onClick={onAdd} style={{ marginTop: 6 }}>
        <IconPlus size={16} />
        {t("tasks.addTask")}
      </button>
    </section>
  );
}
