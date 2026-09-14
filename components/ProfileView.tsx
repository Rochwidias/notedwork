"use client";

import { useTheme } from "./ThemeProvider";

interface Props {
  notif: boolean;
  onToggleNotif: () => void;
  onWipe: () => void;
  onMcp: () => void;
}

export default function ProfileView({ notif, onToggleNotif, onWipe, onMcp }: Props) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <section className="view active" id="v-profil">
      <div className="greet">
        Profil<small>Data contoh — tersimpan lokal di perangkat</small>
      </div>
      <div className="card">
        <div className="profile-head">
          <div className="profile-ava">RW</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Rochwidias</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>NIM 2024001234 • Informatika</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>rochwidias@student.univ.ac.id</div>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>⚙️ Pengaturan</h2>
        <div className="set-row">
          <div>
            <div className="t">🌙 Mode gelap</div>
            <div className="s">Nyaman di kelas &amp; hemat baterai</div>
          </div>
          <button
            className="switch"
            role="switch"
            aria-checked={dark ? "true" : "false"}
            aria-label="Mode gelap"
            onClick={toggle}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="t">🔔 Pengingat jadwal</div>
            <div className="s">Contoh saja di tahap gambaran</div>
          </div>
          <button
            className="switch"
            role="switch"
            aria-checked={notif ? "true" : "false"}
            aria-label="Pengingat jadwal"
            onClick={onToggleNotif}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="t">🔌 Koneksi MCP</div>
            <div className="s">Belum tersambung (tahap rencana)</div>
          </div>
          <button className="link" style={{ marginLeft: "auto" }} onClick={onMcp}>
            Lihat →
          </button>
        </div>
      </div>
      <div className="card">
        <h2>💾 Data perangkat</h2>
        <div className="set-row">
          <div>
            <div className="t">Kembalikan ke contoh awal</div>
            <div className="s">Hapus semua buatanmu &amp; muat ulang data contoh</div>
          </div>
          <button className="btn danger" style={{ marginLeft: "auto", padding: "10px 16px" }} onClick={onWipe}>
            Reset
          </button>
        </div>
      </div>
      <div className="card">
        <h2>ℹ️ Tentang</h2>
        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
          Rocha v0.3 (gambaran lengkap) — email, tugas, jadwal rutin &amp; kalender untuk mahasiswa.
          <br />
          Bisa dipasang ke layar utama iPhone.
        </div>
      </div>
    </section>
  );
}
