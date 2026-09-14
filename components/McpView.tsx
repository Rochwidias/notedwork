"use client";

interface Props {
  onCopy: () => void;
  onProfile: () => void;
}

export default function McpView({ onCopy, onProfile }: Props) {
  return (
    <section className="view active" id="v-mcp">
      <div className="greet">
        Koneksi MCP<small>Rencana sambungan Gmail &amp; Kalender — belum aktif</small>
      </div>
      <div className="card">
        <h2>📡 Status</h2>
        <div className="row">
          <span className="dot" style={{ background: "var(--amber)" }} />
          <div>
            <div className="t">Mode gambaran</div>
            <div className="s">Aplikasi memakai data contoh. MCP disiapkan strukturnya, backend menyusul.</div>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>🧩 Arsitektur rencana</h2>
        <div className="flow">
          <div className="box">
            <b>📱 Aplikasi (file ini)</b>Email • Tugas • Jadwal rutin • Kalender. Token TIDAK disimpan di sini.
          </div>
          <div className="arrow">
            ↓ <small>fetch /api/…</small> ↓
          </div>
          <div className="box">
            <b>
              🖥️ Backend bridge <small>(nanti)</small>
            </b>
            Menyimpan token OAuth &amp; meneruskan ke MCP Gmail / Calendar.
          </div>
          <div className="arrow">
            ↓ <small>MCP tools</small> ↓
          </div>
          <div className="box">
            <b>🔌 MCP Gmail + Google Calendar</b>gmail.read • calendar.list <small>(kirim email tahap berikut)</small>
          </div>
        </div>
        <div className="code">
          GET&nbsp; /api/emails &nbsp;# daftar email kampus
          <br />
          GET&nbsp; /api/events &nbsp;# jadwal &amp; deadline
          <br />
          POST /api/send &nbsp;&nbsp;# (tahap berikut)
        </div>
      </div>
      <div className="card">
        <h2>✅ Langkah berikut (saat siap)</h2>
        <ol className="steps">
          <li>
            Buat OAuth Google &amp; aktifkan Gmail + Calendar API <small>— gratis</small>
          </li>
          <li>
            Jalankan MCP server Gmail/Calendar <small>— di laptop/server</small>
          </li>
          <li>
            Buat backend kecil (Vercel/Cloudflare gratis) <small>— token aman di server</small>
          </li>
          <li>
            Ganti <b>dataProvider</b> di kode ke{" "}
            <span className="code" style={{ display: "inline", padding: "2px 8px" }}>
              fetch(&apos;/api/emails&apos;)
            </span>
          </li>
        </ol>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <button className="btn ghost" onClick={onCopy}>
            📋 Salin endpoint
          </button>
          <button className="btn soft" onClick={onProfile}>
            ← Profil
          </button>
        </div>
      </div>
    </section>
  );
}
