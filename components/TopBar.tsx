"use client";

import { useTheme } from "./ThemeProvider";

export default function TopBar({ onProfile }: { onProfile: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="logo">R</div>
        <div>
          <div className="brand-name">Rocha</div>
          <div className="brand-sub">Email &amp; Jadwal mahasiswa</div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={toggle} title="Ganti tema">
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          <button className="avatar" onClick={onProfile} title="Profil">
            RW
          </button>
        </div>
      </div>
    </header>
  );
}
