"use client";

interface Props {
  connected: boolean;
  email: string | null;
  updatedAt: string | null;
  onLogout: () => void;
  onProfile: () => void;
}

export default function GoogleConnect({ connected, email, updatedAt, onLogout, onProfile }: Props) {
  return (
    <section className="view active" id="v-mcp">
      <div className="greet">
        Koneksi Google<small>Gmail &amp; Kalender asli — {connected ? "terhubung" : "belum tersambung"}</small>
      </div>
      <div className="card">
        <h2>📡 Status</h2>
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
            <button className="btn soft" onClick={onProfile}>
              ← Profil
            </button>
          </div>
        ) : (
          <a className="btn primary block" href="/api/auth/login" style={{ marginTop: 12, textDecoration: "none", textAlign: "center", display: "block" }}>
            Login dengan Google
          </a>
        )}
      </div>
      <div className="card">
        <h2>🧩 Cara kerja</h2>
        <div className="flow">
          <div className="box">
            <b>📱 Aplikasi ini</b>Email • Tugas • Jadwal rutin • Kalender. Token TIDAK disimpan di sini.
          </div>
          <div className="arrow">
            ↓ <small>fetch /api/…</small> ↓
          </div>
          <div className="box">
            <b>🖥️ Server notedwork</b>Menyimpan token OAuth terenkripsi &amp; meneruskan ke Google.
          </div>
          <div className="arrow">
            ↓ <small>HTTPS</small> ↓
          </div>
          <div className="box">
            <b>🔌 Gmail + Google Calendar</b>baca • kirim • arsip • tambah/hapus event
          </div>
        </div>
        <div className="code">
          GET&nbsp; /api/gmail/list &nbsp;# 50 email terbaru
          <br />
          GET&nbsp; /api/calendar/events &nbsp;# event kalender utama
          <br />
          POST /api/gmail/send &nbsp;&nbsp;# kirim email (teks)
        </div>
      </div>
    </section>
  );
}
