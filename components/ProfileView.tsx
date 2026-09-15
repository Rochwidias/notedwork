"use client";

import { useState } from "react";
import { DEFAULT_ACCENT, useTheme } from "./ThemeProvider";
import { InfoSheet, type InfoSheetId } from "./Sheets";

interface Props {
  connected: boolean;
  email: string | null;
  notif: boolean;
  onToggleNotif: () => void;
  onLogout: () => void;
  onMcp: () => void;
  preview: boolean;
  guestName: string;
  onGuestName: (v: string) => void;
  onExitPreview: () => void;
}

const ACCENT_PRESETS = ["#00CFFF", "#7C5CFF", "#16A34A", "#D97706", "#EC4899", "#EF4444"];

export default function ProfileView({
  connected,
  email,
  notif,
  onToggleNotif,
  onLogout,
  onMcp,
  preview,
  guestName,
  onGuestName,
  onExitPreview,
}: Props) {
  const { theme, toggle, accent, setAccent } = useTheme();
  const dark = theme === "dark";
  const initial = (email?.trim()?.[0] ?? "").toUpperCase();
  const [info, setInfo] = useState<InfoSheetId>(null);

  return (
    <section className="view active" id="v-profil">
      <div className="greet">
        Profil<small>{connected ? "Akun Google yang tersambung" : "Mode pratinjau — data contoh"}</small>
      </div>

      {/* ── Akun ── */}
      <div className="card">
        <h2>👤 Akun</h2>
        <div className="profile-head">
          <div className="profile-ava">{connected && initial ? initial : "👀"}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {connected ? (
              <>
                <div style={{ fontWeight: 800, fontSize: 17, overflowWrap: "anywhere" }}>{email}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <span className="dot" style={{ background: "var(--green)", display: "inline-block", marginRight: 6 }} />
                  Login via Google
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Mode tamu</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <span className="dot" style={{ background: "var(--amber)", display: "inline-block", marginRight: 6 }} />
                  Pratinjau dengan data contoh
                </div>
              </>
            )}
          </div>
        </div>
        {!connected && (
          <>
            <label className="f" htmlFor="guestName">Nama tampilan</label>
            <input
              className="f"
              id="guestName"
              maxLength={30}
              placeholder="cth: Budi"
              value={guestName}
              onChange={(e) => onGuestName(e.target.value)}
            />
          </>
        )}
        {connected ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <button className="btn soft" onClick={onMcp}>
              Kelola koneksi →
            </button>
            <button className="btn danger" onClick={onLogout}>
              Keluar
            </button>
          </div>
        ) : (
          <>
            <a
              className="btn primary block"
              href="/api/auth/login"
              style={{ marginTop: 14, textDecoration: "none", textAlign: "center", display: "block" }}
            >
              Hubungkan Google
            </a>
            <button className="btn ghost block" onClick={onExitPreview} style={{ marginTop: 8 }}>
              Keluar dari pratinjau (hapus data tamu)
            </button>
          </>
        )}
      </div>

      {/* ── Pengaturan ── */}
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
            <div className="t">🎨 Warna tampilan</div>
            <div className="s">Aksen tombol, badge &amp; logo — pilihanmu, tersimpan di perangkat</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "2px 0 8px" }}>
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              title={c}
              aria-label={`Warna ${c}`}
              aria-pressed={accent.toUpperCase() === c}
              onClick={() => setAccent(c)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: c,
                border: accent.toUpperCase() === c ? "3px solid var(--ink)" : "1px solid var(--line)",
                cursor: "pointer",
                flex: "none",
              }}
            />
          ))}
          <label
            title="Warna custom"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
              border: "1px solid var(--line)",
              cursor: "pointer",
              flex: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 16 }}>🎨</span>
            <input
              type="color"
              aria-label="Warna custom"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
            />
          </label>
          {accent.toUpperCase() !== DEFAULT_ACCENT && (
            <button className="link" onClick={() => setAccent(DEFAULT_ACCENT)}>
              Reset
            </button>
          )}
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
            <div className="s">{connected ? `Tersambung sebagai ${email}` : preview ? "Mode pratinjau — belum tersambung" : "Belum tersambung"}</div>
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

      {/* ── Info: Kredit / Privasi / Syarat ── */}
      <div className="card">
        <h2>ℹ️ Info</h2>
        <div className="set-row">
          <div>
            <div className="t">⭐ Kredit</div>
            <div className="s">Pembuat &amp; teknologi notedwork</div>
          </div>
          <button className="link" style={{ marginLeft: "auto" }} onClick={() => setInfo("credit")}>
            Buka →
          </button>
        </div>
        <div className="set-row">
          <div>
            <div className="t">🔏 Privasi</div>
            <div className="s">Data apa yang disimpan &amp; di mana</div>
          </div>
          <button className="link" style={{ marginLeft: "auto" }} onClick={() => setInfo("privacy")}>
            Buka →
          </button>
        </div>
        <div className="set-row">
          <div>
            <div className="t">📜 Syarat</div>
            <div className="s">Aturan pakai aplikasi ini</div>
          </div>
          <button className="link" style={{ marginLeft: "auto" }} onClick={() => setInfo("terms")}>
            Buka →
          </button>
        </div>
      </div>

      <div className="card">
        <h2>ℹ️ Tentang</h2>
        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
          notedwork — email, tugas &amp; kalender untuk mahasiswa.
          <br />
          Bisa dipasang ke layar utama HP.
        </div>
      </div>

      <InfoSheet id={info} onClose={() => setInfo(null)} />
    </section>
  );
}
