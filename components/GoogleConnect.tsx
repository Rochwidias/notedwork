"use client";

import { IconArrowLeft, IconSignal } from "./icons";

interface Props {
  connected: boolean;
  email: string | null;
  updatedAt: string | null;
  onLogout: () => void;
  onProfile: () => void;
}

export default function GoogleConnect({ connected, email, updatedAt, onLogout, onProfile }: Props) {
  return (
    <section className="view active" id="v-koneksi">
      <div className="greet">
        Koneksi Google<small>{connected ? "Gmail & Kalender asli — terhubung" : "Mode pratinjau — data contoh. Bukan data aslimu."}</small>
      </div>
      <div className="card">
        <h2>
          <span className="h-ic">
            <IconSignal size={15} />
          </span>
          Status
        </h2>
        <div className="row">
          <span className="dot" style={{ background: connected ? "var(--green)" : "var(--amber)" }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="t" style={{ overflowWrap: "anywhere" }}>{connected ? `Terhubung sebagai ${email}` : "Belum tersambung (mode pratinjau)"}</div>
            <div className="s">
              {connected
                ? `Sync diam-diam tiap buka tab${updatedAt ? ` • diperbarui ${updatedAt}` : ""}`
                : "Kamu melihat data contoh. Login sekali — email & jadwal asli langsung tampil di aplikasi."}
            </div>
          </div>
        </div>
        {connected ? (
          <div className="btn-pair">
            <button className="btn ghost" onClick={onLogout}>
              Keluar
            </button>
            <button className="btn soft btn-ic" onClick={onProfile}>
              <IconArrowLeft size={15} />
              Profil
            </button>
          </div>
        ) : (
          <a className="btn primary block" href="/api/auth/login" style={{ marginTop: 12, textDecoration: "none", textAlign: "center", display: "block" }}>
            Login dengan Google
          </a>
        )}
      </div>
    </section>
  );
}
