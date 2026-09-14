"use client";

import type { NavTarget, ViewName } from "@/lib/types";

const TABS: { id: ViewName; icon: string; label: string }[] = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "email", icon: "✉️", label: "Email" },
  { id: "tugas", icon: "📝", label: "Tugas" },
  { id: "kalender", icon: "📅", label: "Kalender" },
  { id: "profil", icon: "👤", label: "Profil" },
];

export function Sidebar({ view, go }: { view: ViewName; go: (v: NavTarget) => void }) {
  return (
    <nav className="sidebar" aria-label="Navigasi utama">
      <div className="cap">MENU</div>
      {TABS.map((t) => (
        <button key={t.id} className={`tab${view === t.id ? " active" : ""}`} onClick={() => go(t.id)}>
          <span className="ic">{t.icon}</span>
          {t.label}
        </button>
      ))}
      <div className="cap">RENCANA</div>
      <button className={`tab${view === "mcp" ? " active" : ""}`} onClick={() => go("mcp")}>
        <span className="ic">🔌</span>Koneksi MCP
      </button>
      <button className="tab" onClick={() => go("tambah")}>
        <span className="ic">➕</span>Tambah Jadwal
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
            <span className="ic">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Fab({ onAdd }: { onAdd: () => void }) {
  return (
    <button className="fab" onClick={onAdd} title="Tambah jadwal">
      +
    </button>
  );
}
