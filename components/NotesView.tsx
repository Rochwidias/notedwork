"use client";

import type { Note } from "@/lib/types";
import { IconPlus, IconPencil, IconTrash } from "./icons";

interface NotesViewProps {
  notes: Note[];
  t: (key: string) => string;
  onAdd: () => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string, title: string) => void;
}

export default function NotesView({ notes, t, onAdd, onEdit, onDelete }: NotesViewProps) {
  return (
    <section aria-label={t("notes.title")}>
      <div className="view-head">
        <h1>{t("notes.title")}</h1>
        <button type="button" className="btn primary" onClick={onAdd} aria-label={t("notes.add")}>
          + {t("notes.add")}
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="empty">
          <p>{t("notes.empty")}</p>
          <p className="hint">{t("notes.emptyHint")}</p>
        </div>
      ) : (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className="card">
              <div className="t">{n.title}</div>
              <div className="s">{n.body}</div>
              <div className="row-actions">
                <button type="button" className="edit del-ic" onClick={() => onEdit(n)} aria-label={`${t("notes.edit")}: ${n.title}`}>
                  <IconPencil size={15} />
                </button>
                <button type="button" className="del del-ic" onClick={() => onDelete(n.id, n.title)} aria-label={`${t("notes.delete")}: ${n.title}`}>
                  <IconTrash size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
