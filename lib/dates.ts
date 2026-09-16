import type { Prio, Sched, Task } from "./types";

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const PRIO: Record<Prio, [string, string]> = {
  tinggi: ["Tinggi", "hi"],
  sedang: ["Sedang", "md"],
  rendah: ["Rendah", "lo"],
};

export const RCOL = ["#D97706", "#16a34a", "#b45309", "#7c5cff", "#ec4899", "#dc2626"];
export const SCHED_COLORS = ["#16a34a", "#D97706", "#b45309", "#7c5cff", "#ec4899", "#dc2626"];

export function todayStr(): string {
  const d = new Date();
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  );
}

export function nowHM(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/** Senin=1 … Minggu=7 */
export function weekdayOf(iso: string): number {
  const d = new Date(iso + "T00:00:00");
  return ((d.getDay() + 6) % 7) + 1;
}

export function fmtDateID(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Rentang jam agenda: "Seharian" (all-day) · "10:00–11:30 · besok" (overnight) · "10:00–11:30" · "10:00". */
export function fmtSchedRange(s: Sched): string {
  if (s.allDay) return "Seharian";
  if (s.overnight && s.endTime && /^\d{2}:\d{2}$/.test(s.endTime)) {
    return `${s.time}–${s.endTime} · besok`;
  }
  if (s.endTime && /^\d{2}:\d{2}$/.test(s.endTime) && s.endTime !== s.time) {
    return `${s.time}–${s.endTime}`;
  }
  return s.time;
}

export function isOverdue(t: Task): boolean {
  if (t.done) return false;
  // time kosong = akhir hari (konsisten dgn taskBadge yang default "23:59").
  // Tanpa ini, "2026-09-16" + "" < "2026-09-1614:30" selalu true → false-overdue.
  const hm = /^\d{2}:\d{2}$/.test(t.time) ? t.time : "23:59";
  return t.date + hm < todayStr() + nowHM();
}

export function taskBadge(t: Task): { txt: string; cls: string } {
  if (t.done) return { txt: "Selesai", cls: "lo" };
  const dl = new Date(t.date + "T" + (t.time || "23:59") + ":00");
  const now = new Date();
  const diff = dl.getTime() - now.getTime();
  if (diff < 0) {
    const d = Math.ceil(-diff / 864e5);
    return { txt: d <= 1 ? "Telat!" : "Telat " + d + " hari", cls: "over" };
  }
  const days = Math.floor(diff / 864e5);
  if (days === 0) return { txt: "Hari ini • " + t.time, cls: "hi" };
  if (days === 1) return { txt: "Besok • " + t.time, cls: "md" };
  return { txt: "Sisa " + days + " hari", cls: "due" };
}

const ESC_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Jendela kalender anti-overflow: from = tanggal 1 (back bulan lalu),
 * to = hari terakhir (fwd bulan depan). Konstruktor new Date(y, m, 1)/(y, m, 0)
 * tak pernah melompat bulan seperti setMonth dari tanggal 29–31.
 */
export function monthWindow(back = 1, fwd = 2, now: Date = new Date()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + fwd + 1, 0);
  return { from: toISODate(from), to: toISODate(to) };
}

/** ID unik lokal: prefix + base36 waktu + acak (anti-kembar Date.now() murni). */
export function uid(prefix = "id"): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Zona default app (WIB) — dipakai bila browser/server tak memberi zona valid. */
export const DEFAULT_TZ = "Asia/Jakarta";

/** Validasi zona IANA; fallback DEFAULT_TZ bila tak dikenal/kosong. */
export function resolveTimeZone(tz?: string | null): string {
  if (!tz) return DEFAULT_TZ;
  try {
    // Lempar RangeError bila zona tak dikenal — tanpa membuat Date.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** Offset menit zona tz pada satu instant UTC (satu-pass, cukup untuk boundary). */
function offsetMinutesAt(zone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second ?? "0")
  );
  return Math.round((asUTC - utcMs) / 60000);
}

/**
 * Offset "+HH:MM" zona tz pada tanggal/waktu dinding tertentu (DST-aware,
 * dua iterasi agar tepat di sekitar transisi DST).
 */
export function tzOffsetString(tz: string, date: string, time: string): string {
  const zone = resolveTimeZone(tz);
  const guess = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(guess)) return "+07:00";
  const off1 = offsetMinutesAt(zone, guess);
  const off = offsetMinutesAt(zone, guess - off1 * 60000);
  const sign = off < 0 ? "-" : "+";
  const abs = Math.abs(off);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}${String(abs % 60).padStart(2, "0")}`.replace(
    /^([+-]\d{2})(\d{2})$/,
    "$1:$2"
  );
}