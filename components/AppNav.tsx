"use client";

import type { ComponentType } from "react";
import type { NavTarget, ViewName } from "@/lib/types";
import { IconCalendar, IconHome, IconMail, IconPlug, IconPlus, IconTask, IconUser } from "./icons";

type IconComp = ComponentType<{ size?: number; className?: string }>;

const TABS: { id: ViewName; Icon: IconComp; label: string }[] = [
  { id: "dashboard", Icon: IconHome, label: "Dashboard" },
  { id: "email", Icon: IconMail, label: "Email" },
  { id: "tugas", Icon: IconTask, label: "Tugas" },
  { id: "kalender", Icon: IconCalendar, label: "Kalender" },
  { id: "profil", Icon: IconUser, label: "Profil" },
];

export function Sidebar({ view, go }: { view: ViewName; go: (v: NavTarget) => void }) {
  return (
    <nav className="sidebar" aria-label="Navigasi utama">
      <div className="cap">MENU</div>
      {TABS.map((t) => (
        <button key={t.id} className={`tab${view === t.id ? " active" : ""}`} onClick={() => go(t.id)}>
          <span className="ic">
            <t.Icon size={20} />
          </span>
          {t.label}
        </button>
      ))}
      <div className="cap">RENCANA</div>
      <button className={`tab${view === "koneksi" ? " active" : ""}`} onClick={() => go("koneksi")}>
        <span className="ic">
          <IconPlug size={20} />
        </span>
        Koneksi Google
      </button>
      <button className="tab" onClick={() => go("tambah")}>
        <span className="ic">
          <IconPlus size={20} />
        </span>
        Tambah Jadwal
      </button>
    </nav>
  );
}

export function TabBar({ view, go }: { view: ViewName; go: (v: NavTarget) => void }) {
  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${view === t.id ? " active" : ""}`} onClick={() => go(t.id)}>
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
    <button className="fab" onClick={onAdd} title="Tambah jadwal" aria-label="Tambah">
      <IconPlus size={26} />
    </button>
  );
}
