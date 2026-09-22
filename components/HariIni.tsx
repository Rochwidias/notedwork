"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import type { Mail, NavTarget, Routine, Sched, Task } from "@/lib/types";
import { dow3, fmtDateID, fmtSchedRange, taskBadge, todayStr as getToday, urgencyLevel, weekdayOf } from "@/lib/dates";
import { useLang } from "./LangProvider";
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

/** Label hitung mundur terlokalisasi via key home.* (fungsi t dioper dari komponen). */
function fmtCountdown(diffMs: number, t: (key: string) => string): string {
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return t("home.dueSoon");
  if (mins < 60) return t("home.inMin").replace("{n}", String(mins));
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  if (h < 24) return r ? t("home.inHours").replace("{h}", String(h)).replace("{m}", String(r)) : t("home.inHoursEven").replace("{h}", String(h));
  const d = Math.floor(h / 24);
  return d <= 1 ? t("home.tomorrow") : t("home.inDays").replace("{d}", String(d));
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
function validHM(task: Task): string {
  return /^\d{2}:\d{2}$/.test(task.time) ? task.time : "23:59";
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
  // Ambil bahasa aktif + fungsi translate dari provider.
  const { lang, t } = useLang();
  const ts = normToday(todayStr as unknown);
  const nowMs = new Date().getTime();
  const wd = weekdayOf(ts);

  // Hydration-safe: toLocaleDateString beda antara server & client (React #418).
  // Render placeholder saat SSR, isi tanggal asli setelah mount.
  const [todayLine, setTodayLine] = useState(ts);
  useEffect(() => {
    setTodayLine(
      new Date().toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, [lang]);
  const name = email ? email.split("@")[0] : guestName?.trim() || t("home.guestName");
  const goKal = () => go("kalender");

  /* (a) kejadian terdekat yang belum lewat: rutin hari ini + agenda + deadline. */
  const cands: Ev[] = [];
  for (const r of routines) {
    if (r.day !== wd) continue;
    const at = isoTime(ts, r.start);
    if (at == null) continue;
    cands.push({
      title: r.course,
      sub: `${r.start}–${r.end}${r.room ? ` • ${t("home.room")} ${r.room}` : ""}`,
      at,
    });
  }
  for (const s of schedules) {
    if (s.date < ts) continue;
    const at = isoTime(s.date, s.time);
    if (at == null) continue;
    cands.push({ title: s.title, sub: `${fmtDateID(s.date, lang)} • ${fmtSchedRange(s, lang)}`, at });
  }
  for (const task of tasks) {
    if (task.done || task.date < ts) continue;
    const hm = validHM(task);
    const at = isoTime(task.date, hm);
    if (at == null) continue;
    cands.push({ title: task.title, sub: `${task.matkul} • ${fmtDateID(task.date, lang)} • ${hm}`, at });
  }
  cands.sort((a, b) => a.at - b.at);
  const upcoming = cands.find((e) => e.at >= nowMs) ?? null;

  /* Fallback: tugas telat paling mendesak bila tak ada yang akan datang. */
  const overdue = tasks
    .filter((task) => !task.done)
    .map((task) => ({ task, at: isoTime(task.date, validHM(task)) }))
    .filter((x): x is { task: Task; at: number } => x.at != null && x.at < nowMs)
    .sort((a, b) => a.at - b.at)[0];

  const hero = upcoming
    ? { label: fmtCountdown(upcoming.at - nowMs, t), title: upcoming.title, sub: upcoming.sub }
    : overdue
      ? { label: taskBadge(overdue.task, lang).txt, title: overdue.task.title, sub: `${overdue.task.matkul} • ${fmtDateID(overdue.task.date, lang)}` }
      : null;

  /* (b) agenda kompak 7 hari ke depan (jadwal saja, max 4) — ganti top3. */
  const next7 = schedules
    .filter((s) => s.date >= ts && s.date <= addDaysISO(ts, 7))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 4);

  /* (b2) tugas terdekat: belum selesai + hari ini ke depan, max 3 kotak. */
  const nearTasks = tasks
    .filter((task) => !task.done && task.date >= ts)
    .sort((a, b) => (a.date + validHM(a)).localeCompare(b.date + validHM(b)))
    .slice(0, 3);
  const goTasks = () => go("tugas");

  /* (c) strip Senin–Minggu minggu berjalan. */
  const monday = addDaysISO(ts, -(wd - 1));
  const week = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));

  /* (d) email penting: belum dibaca, max 3. */
  const important = mails.filter((m) => m.unread).slice(0, 3);

  return (
    <section className="view active" id="v-beranda">
      <div className="greet">
        {t("home.title")}
        <small>
          {todayLine} • {t("home.hello")}, {name}
          {preview ? t("home.previewSuffix") : ""}
        </small>
      </div>

      {/* (a) kartu pengingat — slim: pill CTA di dalam kartu agar beranda muat 1 layar */}
      <div
        className="hero slim"
        role="button"
        tabIndex={0}
        aria-label={hero ? `${t("home.reminderPrefix")}: ${hero.label}, ${hero.title}. ${t("home.openCalendar")}` : t("home.reminderAriaNone")}
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
            <span className="cta">
              {t("home.viewCalendar")} <span aria-hidden="true">›</span>
            </span>
          </>
        ) : (
          <>
            <b>
              <span className="h-ic">
                <IconBell size={16} />
              </span>
              {t("home.noReminder")}
            </b>
            <p>{t("home.noReminderSub")}</p>
            <span className="cta">
              {t("home.viewCalendar")} <span aria-hidden="true">›</span>
            </span>
          </>
        )}
      </div>

      {/* (b) agenda 7 hari — baris kompak tanpa kartu per-baris agar muat 1 layar */}
      <div className="card mini">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconCalendarDays size={15} />
            </span>
            {t("home.next7")}
          </h2>
          <button className="link link-ic" onClick={goKal}>
            {t("nav.calendar")} <span aria-hidden="true">›</span>
          </button>
        </div>
        <div>
          {next7.map((s) => {
            const pick = () => {
              onSelectDate(s.date);
              goKal();
            };
            return (
              <div
                key={s.id}
                className="erow"
                role="button"
                tabIndex={0}
                aria-label={`${s.title}, ${fmtDateID(s.date, lang)}`}
                onClick={pick}
                onKeyDown={onKey(pick)}
              >
                <span className="dot" style={{ background: s.color || "#22c55e" }} />
                <div>
                  <div className="tt">{s.title}</div>
                  <div className="ss">{fmtDateID(s.date, lang)} • {fmtSchedRange(s, lang)}</div>
                </div>
                <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
              </div>
            );
          })}
          {next7.length === 0 && <div className="empty">{t("home.next7empty")}</div>}
        </div>
      </div>

      {/* (b2) tugas terdekat — max 3 kotak di bawah agenda 7 hari */}
      <div className="card mini">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconTask size={15} />
            </span>
            {t("home.nearTasks")}
          </h2>
          <button className="link link-ic" onClick={goTasks}>
            {t("nav.tasks")} <span aria-hidden="true">›</span>
          </button>
        </div>
        <div>
          {nearTasks.map((task) => {
            const hm = validHM(task);
            const badge = taskBadge(task, lang);
            return (
              <div
                key={task.id}
                className="erow"
                role="button"
                tabIndex={0}
                aria-label={`${task.title}, ${fmtDateID(task.date, lang)}`}
                onClick={goTasks}
                onKeyDown={onKey(goTasks)}
              >
                <span className="dot" style={{ background: "var(--brand)" }} />
                <div>
                  <div className="tt">{task.title}</div>
                  <div className="ss">{task.matkul} • {fmtDateID(task.date, lang)} • {hm}</div>
                </div>
                <div className="tm"><span className={`pill ${urgencyLevel(task.date, ts)}`}>{badge.txt}</span></div>
              </div>
            );
          })}
          {nearTasks.length === 0 && <div className="empty">{t("home.nearTasksEmpty")}</div>}
        </div>
      </div>

      {/* (c) strip minggu — 7 chip sebaris tanpa scroll horizontal */}
      <div className="card mini">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconCalendarDays size={15} />
            </span>
            {t("home.thisWeek")}
          </h2>
          <button className="link link-ic" onClick={goKal}>
            {t("nav.calendar")} <span aria-hidden="true">›</span>
          </button>
        </div>
        <div className="wstrip">
          {week.map((iso, i) => {
            const isToday = iso === ts;
            const pick = () => {
              onSelectDate(iso);
              go("kalender");
            };
            return (
              <button
                key={iso}
                className={`wchip${isToday ? " on" : ""}`}
                onClick={pick}
                aria-label={fmtDateID(iso, lang)}
                aria-current={isToday ? "date" : undefined}
              >
                {dow3(lang)[i]}
                <span className="dn">{Number(iso.slice(8, 10))}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* (d) email penting — max 2 baris kompak */}
      <div className="card mini">
        <div className="card-head">
          <h2>
            <span className="h-ic">
              <IconMail size={15} />
            </span>
            {t("home.emailImportant")}
          </h2>
          <button className="link link-ic" onClick={() => go("email")}>
            {t("common.all")} <span aria-hidden="true">›</span>
          </button>
        </div>
        <div>
          {important.slice(0, 2).map((m) => {
            const open = () => onOpenMail(m.id);
            return (
              <div
                key={m.id}
                className="erow"
                role="button"
                tabIndex={0}
                aria-label={`${t("home.openMail")}${m.subj}`}
                onClick={open}
                onKeyDown={onKey(open)}
              >
                <span className="dot" style={{ background: "var(--brand)" }} />
                <div>
                  <div className="tt">{m.subj}</div>
                  <div className="ss">{m.from}</div>
                </div>
                <div className="tm">{m.time}</div>
              </div>
            );
          })}
          {important.length === 0 && (
            <div className="empty">
              <span className="empty-ic">
                <IconInbox size={22} />
              </span>
              {t("home.inboxClear")}
            </div>
          )}
        </div>
      </div>

      {/* (e) tambah konsisten: sheet pilihan dibuka induk via onAdd */}
      <button className="btn primary block btn-ic" onClick={onAdd} style={{ marginTop: 8 }}>
        <IconPlus size={16} />
        {t("notes.add")}
      </button>
    </section>
  );
}
