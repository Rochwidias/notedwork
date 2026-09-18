"use client";

import type { ComponentType } from "react";
import type { NavTarget, ViewName } from "@/lib/types";
import { IconCalendar, IconHome, IconMail, IconTask, IconPlus } from "./icons";

type IconComp = ComponentType<{ size?: number; className?: string }>;

const MAIN_TABS: { id: Exclude<ViewName, "profil">; Icon: IconComp; label: string }[] = [
  { id: "beranda", Icon: IconHome, label: "Hari Ini" },
  { id: "email", Icon: IconMail, label: "Email" },
  { id: "tugas", Icon: IconTask, label: "Tugas" },
  { id: "kalender", Icon: IconCalendar, label: "Kalender" },
  { id: "catatan", Icon: IconNote, label: "Catatan" },
];

export function Sidebar({ view, go }: { view: ViewName; go: (v: NavTarget) => void }) {
  return (
    <nav className="sidebar" aria-label="Navigasi utama">
      <div className="cap">MENU</div>
      {MAIN_TABS.map((t) => (
        <button key={t.id} className={`tab${view === t.id ? " active" : ""}`} onClick={() => go(t.id)}>
          <span className="ic">
            <t.Icon size={20} />
          </span>
          {t.label}
        </button>
      ))}
      <div className="cap">TAMBAH</div>
      <button className="tab" onClick={() => go("tambah")}>
        <span className="ic">
          <IconPlus size={20} />
        </span>
        Tambah Baru
      </button>
    </nav>
  );
}

export function TabBar({ view, go }: { view: ViewName; go: (v: NavTarget) => void }) {
  return (
    <nav className="tabbar" aria-label="Navigasi utama">
      <div className="tabbar-inner">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${view === t.id ? " active" : ""}`}
            aria-current={view === t.id ? "page" : undefined}
            onClick={() => go(t.id)}
          >
            <span className="ic">
              <t.Icon size={20} />
            </span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Fab({ onAdd }: { onAdd: () => void }) {
  return (
    <button className="fab" onClick={onAdd} title="Tambah baru" aria-label="Tambah baru">
      <IconPlus size={26} />
    </button>
  );
}
