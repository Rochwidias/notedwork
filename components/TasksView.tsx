"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { Routine, Task } from "@/lib/types";
import { PRIO, fmtDateID, isOverdue, taskBadge } from "@/lib/dates";
import { IconCheck, IconPencil, IconPlus, IconX } from "./icons";

type Filter = "all" | "active" | "late" | "done";

const FILTERS: [Filter, string][] = [
  ["all", "Semua"],
  ["active", "Aktif"],
  ["late", "Telat"],
  ["done", "Selesai"],
];

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

  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((t) => !t.done).length,
      late: tasks.filter((t) => isOverdue(t)).length,
      done: tasks.filter((t) => t.done).length,
    }),
    [tasks]
  );

  const courses = useMemo(() => [...new Set(routines.map((r) => r.course))], [routines]);

  const list = useMemo(() => {
    const l = tasks.filter((t) =>
      filter === "all" ? true : filter === "active" ? !t.done : filter === "done" ? t.done : isOverdue(t)
    );
    l.sort((a, b) => Number(a.done) - Number(b.done) || (a.date + a.time).localeCompare(b.date + b.time));
    return l;
  }, [tasks, filter]);

  return (
    <section className="view active" id="v-tugas">
      <div className="greet">
        Tugas<small>{preview ? "Mode pratinjau — data contoh, tersimpan lokal di perangkatmu" : "Gmail & Kalender asli — deadline ikut muncul di Kalender & Dashboard"}</small>
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
          list.map((t) => {
            const b = taskBadge(t);
            const p = PRIO[t.prio] ?? PRIO.sedang;
            const onKey = (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(t.id);
              }
            };
            return (
              <div
                key={t.id}
                className={`trow${t.done ? " done" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${t.title} — ${t.done ? "selesai" : "aktif"}. Ketuk untuk ubah status.`}
                onClick={() => onToggle(t.id)}
                onKeyDown={onKey}
              >
                <button
                  className="check"
                  title="Tandai selesai"
                  aria-label={t.done ? "Buka lagi" : "Tandai selesai"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(t.id);
                  }}
                >
                  {t.done ? <IconCheck size={15} /> : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div className="tt">{t.title}</div>
                  <div className="tm">
                    {t.matkul} • {fmtDateID(t.date)} • {t.time}
                    {t.note ? ` • ${t.note}` : ""}
                  </div>
                  <div className="tags">
                    <span className={`tag ${p[1]}`}>{p[0]}</span>
                    <span className={`tag ${b.cls}`}>{b.txt}</span>
                  </div>
                </div>
                <button
                  className="del del-ic"
                  title="Ubah"
                  aria-label={`Ubah ${t.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(t.id);
                  }}
                >
                  <IconPencil size={14} />
                </button>
                <button
                  className="del del-ic"
                  title="Hapus"
                  aria-label={`Hapus ${t.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                >
                  <IconX size={14} />
                </button>
                <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, flex: "none" }}>›</span>
              </div>
            );
          })
        ) : (
          <div className="empty">Tidak ada tugas di sini.</div>
        )}
      </div>
      <button className="btn primary block btn-ic" onClick={onAdd} style={{ marginTop: 6 }}>
        <IconPlus size={16} />
        Tambah tugas
      </button>
    </section>
  );
}
