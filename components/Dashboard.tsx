"use client";

import type { Mail, NavTarget, Routine, Sched, Task } from "@/lib/types";
import { DAYS, fmtDateID, taskBadge, todayStr, weekdayOf } from "@/lib/dates";

interface Props {
  mails: Mail[];
  schedules: Sched[];
  routines: Routine[];
  tasks: Task[];
  email: string | null;
  go: (v: NavTarget) => void;
  onCompose: () => void;
}

export default function Dashboard({ mails, schedules, routines, tasks, email, go, onCompose }: Props) {
  const ts = todayStr();
  const unread = mails.filter((m) => m.unread).length;
  const todayRoutines = routines.filter((r) => r.day === weekdayOf(ts));
  const todayCount = todayRoutines.length + schedules.filter((s) => s.date === ts).length;
  const active = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const urg = active[0];
  const todayLine = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const name = email ? email.split("@")[0] : "di sana";

  const next = [
    ...todayRoutines.map((r) => ({
      title: `${r.course} (${r.start}–${r.end})`,
      sub: `${DAYS[r.day - 1]} • Ruang ${r.room || "-"}`,
      color: r.color,
    })),
    ...schedules
      .filter((s) => s.date >= ts)
      .slice(0, 4)
      .map((s) => ({ title: s.title, sub: `${fmtDateID(s.date)} • ${s.time}`, color: s.color || "#22c55e" })),
  ].slice(0, 4);

  return (
    <section className="view active" id="v-dashboard">
      <div className="greet">
        Halo, {name} 👋<small>{todayLine}</small>
      </div>
      <div className="hero">
        <b>🎓 Semangat kuliah hari ini!</b>
        <p>
          {urg
            ? `Prioritas: ${urg.matkul} — ${urg.title} (${taskBadge(urg).txt}).`
            : "Tidak ada tugas aktif. Nikmati harimu! 🎉"}
        </p>
      </div>
      <div className="stats">
        <button className="stat" onClick={() => go("email")}>
          <span className="tag-pill">Email</span>
          <div className="num">{unread}</div>
          <div className="lbl">belum dibaca</div>
        </button>
        <button className="stat" onClick={() => go("kalender")}>
          <span className="tag-pill">Kuliah hari ini</span>
          <div className="num">{todayCount}</div>
          <div className="lbl">matkul &amp; agenda</div>
        </button>
        <button className="stat" onClick={() => go("tugas")}>
          <span className="tag-pill">Tugas aktif</span>
          <div className="num">{active.length}</div>
          <div className="lbl">belum selesai</div>
        </button>
      </div>
      <div className="dash-grid">
        <div>
          <div className="card">
            <h2>📬 Email terbaru</h2>
            <div>
              {mails.length === 0 && <div className="empty">📭 Kotak masuk kosong.</div>}
              {mails.slice(0, 3).map((m) => (
                <div className="row" key={m.id}>
                  <span
                    className="dot"
                    style={{ background: m.unread ? "var(--brand)" : "var(--line)" }}
                  />
                  <div>
                    <div className="t">{m.subj}</div>
                    <div className="s">{m.from}</div>
                  </div>
                  <div className="time">{m.time}</div>
                </div>
              ))}
            </div>
            <button className="btn soft block" onClick={() => go("email")} style={{ marginTop: 10 }}>
              Lihat semua email
            </button>
          </div>
          <div className="card">
            <div className="card-head">
              <h2>⏰ Tugas mendesak</h2>
              <button className="link" onClick={() => go("tugas")}>
                Semua →
              </button>
            </div>
            <div>
              {active.slice(0, 3).map((t) => {
                const b = taskBadge(t);
                return (
                  <div className="row" key={t.id}>
                    <span
                      className="dot"
                      style={{
                        background:
                          t.prio === "tinggi" ? "var(--red)" : t.prio === "sedang" ? "var(--amber)" : "var(--green)",
                      }}
                    />
                    <div>
                      <div className="t">{t.title}</div>
                      <div className="s">
                        {t.matkul} • {fmtDateID(t.date)}
                      </div>
                    </div>
                    <div className="time">
                      <span className={`tag ${b.cls}`}>{b.txt}</span>
                    </div>
                  </div>
                );
              })}
              {active.length === 0 && <div className="empty">🎉 Semua tugas selesai!</div>}
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <h2>🗓️ Agenda terdekat</h2>
            <div>
              {next.map((s, i) => (
                <div className="row" key={i}>
                  <span className="dot" style={{ background: s.color }} />
                  <div>
                    <div className="t">{s.title}</div>
                    <div className="s">{s.sub}</div>
                  </div>
                </div>
              ))}
              {next.length === 0 && <div className="empty">Belum ada agenda. Tambahkan jadwal pertama 👇</div>}
            </div>
          </div>
          <div className="quick">
            <button className="btn primary" onClick={onCompose}>
              ✉️ Tulis Email
            </button>
            <button className="btn ghost" onClick={() => go("tambah")}>
              ➕ Tambah Jadwal
            </button>
          </div>
          <button className="banner" onClick={() => go("mcp")}>
            <span style={{ fontSize: 24 }}>🔌</span>
            <span>
              <span className="t">Koneksi Google aktif</span>
              <br />
              <span className="s">Gmail &amp; Kalender tersambung →</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
