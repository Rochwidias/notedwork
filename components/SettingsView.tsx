"use client";

import { useState } from "react";
import { DEFAULT_ACCENT, ACCENT_PRESETS, useTheme } from "./ThemeProvider";
import { InfoSheet, type InfoSheetId } from "./Sheets";
import {
  IconArrowRight,
  IconBell,
  IconDoc,
  IconEye,
  IconGear,
  IconInfo,
  IconMoon,
  IconPalette,
  IconPlug,
  IconShield,
  IconStar,
  IconUser,
} from "./icons";

interface Props {
  connected: boolean;
  email: string | null;
  notif: boolean;
  onToggleNotif: () => void;
  onLogout: () => void;
  preview: boolean;
  guestName: string;
  onGuestName: (v: string) => void;
  onExitPreview: () => void;
}

export default function SettingsView({
  connected,
  email,
  notif,
  onToggleNotif,
  onLogout,
  preview,
  guestName,
  onGuestName,
  onExitPreview,
}: Props) {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const initial = (email?.trim()?.[0] ?? "").toUpperCase();
  const [info, setInfo] = useState<InfoSheetId>(null);

  return (
    <section className="view active" id="v-settings">
      <div className="greet">
        Profil<small>{connected ? "Akun Google yang tersambung" : "Mode pratinjau — data contoh"}</small>
      </div>

      {/* ── Akun ── */}
      <div className="card">
        <h2>
          <span className="h-ic">
            <IconUser size={15} />
          </span>
          Akun
        </h2>
        <div className="profile-head">
          <div className="profile-ava">
            {connected && initial ? initial : <IconEye size={24} />}
          </div>
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
          <div className="btn-pair" style={{ marginTop: 14 }}>
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

      {/* ── Galeri Tema ── */}
      <div className="card">
        <h2>
          <span className="h-ic">
            <IconGear size={15} />
          </span>
          Galeri Tema
        </h2>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconMoon size={14} />
              Tampilan
            </div>
            <div className="s">Terang, gelap, atau ikut sistem</div>
          </div>
        </div>
        <div className="chips" role="group" aria-label="Mode tampilan" style={{ paddingBottom: 8 }}>
          {(["light", "dark", "auto"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`chip${theme === m ? " on" : ""}`}
              aria-pressed={theme === m}
              onClick={() => setTheme(m)}
            >
              {m === "light" ? "Terang" : m === "dark" ? "Gelap" : "Otomatis"}
            </button>
          ))}
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconPalette size={14} />
              Warna tampilan
            </div>
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
              color: "#fff",
            }}
          >
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <IconPalette size={16} />
            </span>
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
            <div className="t row-ic">
              <IconBell size={14} />
              Pengingat jadwal
            </div>
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
            <div className="t row-ic">
              <IconPlug size={14} />
              Koneksi Google
            </div>
            <div className="s">{connected ? `Tersambung sebagai ${email}` : preview ? "Mode pratinjau — data contoh" : "Belum tersambung"}</div>
          </div>
          {connected ? (
            <button className="btn danger" style={{ marginLeft: "auto", padding: "10px 16px" }} onClick={onLogout}>
              Keluar
            </button>
          ) : (
            <a
              className="link link-ic"
              style={{ marginLeft: "auto", textDecoration: "none" }}
              href="/api/auth/login"
            >
              Login dengan Google
              <IconArrowRight size={14} />
            </a>
          )}
        </div>
      </div>

      {/* ── Info: Kredit / Privasi / Syarat ── */}
      <div className="card">
        <h2>
          <span className="h-ic">
            <IconInfo size={15} />
          </span>
          Info
        </h2>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconStar size={14} />
              Kredit
            </div>
            <div className="s">Pembuat &amp; teknologi notedwork</div>
          </div>
          <button className="link link-ic" style={{ marginLeft: "auto" }} onClick={() => setInfo("credit")}>
            Buka
            <IconArrowRight size={14} />
          </button>
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconShield size={14} />
              Privasi
            </div>
            <div className="s">Data apa yang disimpan &amp; di mana</div>
          </div>
          <button className="link link-ic" style={{ marginLeft: "auto" }} onClick={() => setInfo("privacy")}>
            Buka
            <IconArrowRight size={14} />
          </button>
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconDoc size={14} />
              Syarat
            </div>
            <div className="s">Aturan pakai aplikasi ini</div>
          </div>
          <button className="link link-ic" style={{ marginLeft: "auto" }} onClick={() => setInfo("terms")}>
            Buka
            <IconArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="card">
        <h2>
          <span className="h-ic">
            <IconInfo size={15} />
          </span>
          Tentang
        </h2>
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
