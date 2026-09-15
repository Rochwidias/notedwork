"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import type { Mail, NavTarget, Routine, Sched, Task } from "@/lib/types";
import { DAYS, fmtDateID, fmtSchedRange, taskBadge, todayStr as getToday, weekdayOf } from "@/lib/dates";
import {
  IconBell,
  IconCalendarDays,
  IconInbox,
  IconMail,
  IconPlus,
  IconTask,
} from "./icons";

interface Props {
  mails: Mail[];
  schedules: Sched[];
  routines: Routine[];
  tasks: Task[];
  email: string | null;
  preview?: boolean;
  guestName?: string;
  go: (v: NavTarget) => void;
  onOpenMail: (id: string) => void;
  onToggleTask: (id: string) => void;
  onSelectDate: (iso: string) => void;
  todayStr: string;
  onAdd: () => void;
}

const CHEV: CSSProperties = { color: "var(--muted)", fontWeight: 800, flex: "none" };

/** Props keyboard untuk baris role=button: Enter/Spasi = klik. */
function onKey(action: () => void): (e: KeyboardEvent) => void {
  return (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };
}

/** Normalisasi prop todayStr menjadi "yyyy-mm-dd"; fallback ke hari ini. */
function normToday(v: unknown): string {
  try {
    if (typeof v === "function") {
      const r = (v as () => unknown)();
      if (typeof r === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r)) return r;
    } else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return v;
    }
  } catch {
    /* abaikan */
  }
  return getToday();
}

/** Epoch ms untuk iso "yyyy-mm-dd" + hm "hh:mm" lokal; null bila tak valid. */
function isoTime(iso: string, hm: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !/^\d{2}:\d{2}$/.test(hm)) return null;
  const t = new Date(`${iso}T${hm}:00`).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Label hitung mundur: "45 mnt lagi", "2 jam 10 mnt lagi", "Besok", "3 hari lagi". */
function fmtCountdown(diffMs: number): string {
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return "Sebentar lagi";
  if (mins < 60) return `${mins} mnt lagi`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  if (h < 24) return r ? `${h} jam ${r} mnt lagi` : `${h} jam lagi`;
  const d = Math.floor(h / 24);
  return d <= 1 ? "Besok" : `${d} hari lagi`;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Geser tanggal kalender; setDate aman untuk overflow 29-31 ke bulan pendek. */
function addDaysISO(iso: string, n: number): string {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Jam deadline: time kosong = akhir hari (konsisten dgn lib/dates). */
function validHM(t: Task): string {
  return /^\d{2}:\d{2}$/.test(t.time) ? t.time : "23:59";
}

interface Ev {
  title: string;
  sub: string;
  at: number;
}

export default function HariIni({
  mails = [],
  schedules = [],
  routines = [],
  tasks = [],
  email = null,
  preview = false,
  guestName = "",
  go = () => undefined,
  onOpenMail = () => undefined,
  onToggleTask = () => undefined,
  onSelectDate = () => undefined,
  todayStr = "",
  onAdd = () => undefined,
}: Props) {
  const ts = normToday(todayStr as unknown);
  const nowMs = new Date().getTime();
  const wd = weekdayOf(ts);

  const todayLine = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const name = email ? email.split("@")[0] : guestName?.trim() || "di sana";
  const goKal = () => go("kalender");

  /* (a) kejadian terdekat yang belum lewat: rutin hari ini + agenda + deadline. */
  const cands: Ev[] = [];
  for (const r of routines) {
    if (r.day !== wd) continue;
    const at = isoTime(ts, r.start);
    if (at == null) continue;
    cands.push({
      title: r.course,
      sub: `${r.start}–${r.end}${r.room ? ` • Ruang ${r.room}` : ""}`,
      at,
    });
  }
  for (const s of schedules) {
    if (s.date < ts) continue;
    const at = isoTime(s.date, s.time);
    if (at == null) continue;
    cands.push({ title: s.title, sub: `${fmtDateID(s.date)} • ${fmtSchedRange(s)}`, at });
  }
  for (const t of tasks) {
    if (t.done || t.date < ts) continue;
    const hm = validHM(t);
    const at = isoTime(t.date, hm);
    if (at == null) continue;
    cands.push({ title: t.title, sub: `${t.matkul} • ${fmtDateID(t.date)} • ${hm}`, at });
  }
  cands.sort((a, b) => a.at - b.at);
  const upcoming = cands.find((e) => e.at >= nowMs) ?? null;

  /* Fallback: tugas telat paling mendesak bila tak ada yang akan datang. */
  const overdue = tasks
    .filter((t) => !t.done)
    .map((t) => ({ t, at: isoTime(t.date, validHM(t)) }))
    .filter((x): x is { t: Task; at: number } => x.at != null && x.at < nowMs)
    .sort((a, b) => a.at - b.at)[0];

  const hero = upcoming
    ? { label: fmtCountdown(upcoming.at - nowMs), title: upcoming.title, sub: upcoming.sub }
    : overdue
      ? { label: taskBadge(overdue.t).txt, title: overdue.t.title, sub: `${overdue.t.matkul} • ${fmtDateID(overdue.t.date)}` }
      : null;

  /* (b) 3 terpenting: tugas aktif dengan deadline paling dekat (time kosong = 23:59, konsisten isOverdue). */
  const top3 = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.date + (a.time || "23:59")).localeCompare(b.date + (b.time || "23:59")))
    .slice(0, 3);

  /* (c) strip Senin–Minggu minggu berjalan. */
  const monday = addDaysISO(ts, -(wd - 1));
  const week = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));

  /* (d) email penting: belum dibaca, max 3. */
  const important = mails.filter((m) => m.unread).slice(0, 3);

  return (
    <section className="view active" id="v-beranda">
      <div className="greet">
        Hari Ini
        <small>
          {todayLine} • Halo, {name}
          {preview ? " — Mode pratinjau (data contoh)" : ""}
        </small>
      </div>

      {/* (a) kartu pengingat */}
      <div
        className="hero"
        role="button"
        tabIndex={0}
        aria-label={hero ? `Pengingat: ${hero.label}, ${hero.title}. Buka kalender.` : "Tidak ada pengingat. Buka kalender."}
        onClick={goKal}
        onKeyDown={onKey(goKal)}
        style={{ cursor: "pointer" }}
      >
        {hero ? (
          <>
            <b>
              <span className="h-ic">
                <IconBell size={16} />
              </span>
              {hero.label}: {hero.title}
            </b>
            <p>{hero.sub}</p>
            <p style={{ fontWeight: 700 }}>
              Lihat kalender <span aria-hidden="true">›</span>
            </p>
          </>
        ) : (
          <>
            <b>
              <span className="h-ic">
                <IconBell size={16} />
              </span>
              Tidak ada pengingat berikutnya
            </b>
            <p>Belum ada agenda atau deadline. Nikmati harimu!</p>
            <p style={{ fontWeight: 700 }}>
              Lihat kalender <span aria-hidden="true">›</span>
            </p>
          </>
        )}
      </div>

      {/* (b) 3 terpenting */}
      <div className="card">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconTask size={15} />
            </span>
            3 Terpenting
          </h2>
          <button className="link link-ic" onClick={() => go("tugas")}>
            Semua <span aria-hidden="true">›</span>
          </button>
        </div>
        <div>
          {top3.map((t, i) => {
            const b = taskBadge(t);
            const toggle = () => onToggleTask(t.id);
            return (
              <div
                key={t.id}
                className="trow"
                role="button"
                tabIndex={0}
                aria-label={`${i + 1}. ${t.title}. Ketuk untuk tandai selesai.`}
                onClick={toggle}
                onKeyDown={onKey(toggle)}
              >
                <span className="pill blue" aria-hidden="true" style={{ margin: 0 }}>
                  {i + 1}
                </span>
                <button
                  className="check"
                  title="Tandai selesai"
                  aria-label={`Tandai selesai: ${t.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div className="tt">{t.title}</div>
                  <div className="tm">
                    {t.matkul} • {fmtDateID(t.date)}
                    {t.time ? ` • ${t.time}` : ""}
                  </div>
                  <div className="tags">
                    <span className={`tag ${b.cls}`}>{b.txt}</span>
                  </div>
                </div>
                <span aria-hidden="true" style={CHEV}>
                  ›
                </span>
              </div>
            );
          })}
          {top3.length === 0 && <div className="empty">Semua tugas selesai. Nikmati harimu!</div>}
        </div>
      </div>

      {/* (c) strip minggu */}
      <div className="card">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconCalendarDays size={15} />
            </span>
            Minggu ini
          </h2>
          <button className="link link-ic" onClick={goKal}>
            Kalender <span aria-hidden="true">›</span>
          </button>
        </div>
        <div className="chips">
          {week.map((iso, i) => {
            const isToday = iso === ts;
            const pick = () => {
              onSelectDate(iso);
              go("kalender");
            };
            return (
              <button
                key={iso}
                className={`chip${isToday ? " on" : ""}`}
                onClick={pick}
                aria-label={fmtDateID(iso)}
                aria-current={isToday ? "date" : undefined}
              >
                {DAYS[i].slice(0, 3)} • {Number(iso.slice(8, 10))}
              </button>
            );
          })}
        </div>
      </div>

      {/* (d) email penting */}
      <div className="card">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconMail size={15} />
            </span>
            Email penting
          </h2>
          <button className="link link-ic" onClick={() => go("email")}>
            Semua <span aria-hidden="true">›</span>
          </button>
        </div>
        <div>
          {important.map((m) => {
            const open = () => onOpenMail(m.id);
            return (
              <div
                key={m.id}
                className="row"
                role="button"
                tabIndex={0}
                aria-label={`Buka email: ${m.subj}`}
                onClick={open}
                onKeyDown={onKey(open)}
                style={{ cursor: "pointer" }}
              >
                <span className="dot" style={{ background: "var(--brand)" }} />
                <div>
                  <div className="t">{m.subj}</div>
                  <div className="s">{m.from}</div>
                </div>
                <div className="time">{m.time}</div>
                <span aria-hidden="true" style={CHEV}>
                  ›
                </span>
              </div>
            );
          })}
          {important.length === 0 && (
            <div className="empty">
              <span className="empty-ic">
                <IconInbox size={22} />
              </span>
              Kotak masuk beres. Tidak ada email penting.
            </div>
          )}
        </div>
        <button className="btn soft block" onClick={() => go("email")} style={{ marginTop: 10 }}>
          Lihat semua email <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* (e) tambah konsisten: sheet pilihan dibuka induk via onAdd */}
      <button className="btn primary block btn-ic" onClick={onAdd} style={{ marginTop: 12 }}>
        <IconPlus size={16} />
        Tambah
      </button>
    </section>
  );
}
