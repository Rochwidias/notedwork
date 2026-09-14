"use client";

import { useTheme } from "./ThemeProvider";

interface Props {
  connected: boolean;
  email: string | null;
  notif: boolean;
  onToggleNotif: () => void;
  onLogout: () => void;
  onMcp: () => void;
}

export default function ProfileView({ connected, email, notif, onToggleNotif, onLogout, onMcp }: Props) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const initial = (email?.trim()?.[0] ?? "").toUpperCase();
  return (
    <section className="view active" id="v-profil">
      <div className="greet">
        Profil<small>{connected ? "Akun Google yang tersambung" : "Kamu belum login"}</small>
      </div>
      <div className="card">
        <div className="profile-head">
          <div className="profile-ava">{connected && initial ? initial : "👤"}</div>
          <div>
            {connected ? (
              <>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{email}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Login via Google</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Belum login</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Login untuk memakai email, tugas &amp; kalendermu
                </div>
              </>
            )}
          </div>
        </div>
        {!connected && (
          <a
            className="btn primary block"
            href="/api/auth/login"
            style={{ marginTop: 14, textDecoration: "none", textAlign: "center", display: "block" }}
          >
            Login dengan Google
          </a>
        )}
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
            <div className="s">Notifikasi pengingat dari aplikasi</div>
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
            <div className="t">🔌 Koneksi Google</div>
            <div className="s">{connected ? `Tersambung sebagai ${email}` : "Belum tersambung"}</div>
          </div>
          <button className="link" style={{ marginLeft: "auto" }} onClick={onMcp}>
            Lihat →
          </button>
        </div>
        {connected && (
          <div className="set-row">
            <div>
              <div className="t">Keluar dari Google</div>
              <div className="s">Putus koneksi &amp; hapus sesi di perangkat ini</div>
            </div>
            <button className="btn danger" style={{ marginLeft: "auto", padding: "10px 16px" }} onClick={onLogout}>
              Keluar
            </button>
          </div>
        )}
      </div>
      <div className="card">
        <h2>ℹ️ Tentang</h2>
        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
          Rocha — email, tugas &amp; kalender untuk mahasiswa.
          <br />
          Bisa dipasang ke layar utama HP.
        </div>
      </div>
    </section>
  );
}
