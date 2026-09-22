import type { Prio, Sched, Task } from "./types";
import type { Lang } from "./i18n";

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

export const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DOW3_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const DOW3_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DOW1_ID = ["S", "S", "R", "K", "J", "S", "M"];
export const DOW1_EN = ["M", "T", "W", "T", "F", "S", "S"];
export function dayNames(lang: Lang): string[] { return lang === "en" ? DAYS_EN : DAYS; }
export function monthNames(lang: Lang): string[] { return lang === "en" ? MONTHS_EN : MONTHS; }
export function dow3(lang: Lang): string[] { return lang === "en" ? DOW3_EN : DOW3_ID; }
export function dowInitials(lang: Lang): string[] { return lang === "en" ? DOW1_EN : DOW1_ID; }
export function prioLabel(p: Prio, lang: Lang): string {
  if (lang === "en") return p === "tinggi" ? "High" : p === "sedang" ? "Medium" : "Low";
  return PRIO[p][0];
}

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

export function fmtDateID(iso: string, lang: Lang = "id"): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Rentang jam agenda: "Seharian" (all-day) · "10:00–11:30 · besok" (overnight) · "10:00–11:30" · "10:00". */
export function fmtSchedRange(s: Sched, lang: Lang = "id"): string {
  if (s.allDay) return (lang === "en" ? "All day" : "Seharian");
  if (s.overnight && s.endTime && /^\d{2}:\d{2}$/.test(s.endTime)) {
    return `${s.time}–${s.endTime} · ${lang === "en" ? "tomorrow" : "besok"}`;
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

/**
 * Level urgensi deadline berdasar selisih hari kalender (date - today):
 * H-1 ke bawah (besok, hari ini, telat) = red; H-2 = amber; H-3 ke atas = green.
 * Dipakai pill indikator di kotak Tugas Terdekat (kelas CSS .pill.red/.amber/.green).
 */
export function urgencyLevel(dateIso: string, todayIso: string): "red" | "amber" | "green" {
  const d = new Date(dateIso + "T00:00:00").getTime();
  const t = new Date(todayIso + "T00:00:00").getTime();
  if (!Number.isFinite(d) || !Number.isFinite(t)) return "green";
  const diff = Math.round((d - t) / 864e5);
  if (diff <= 1) return "red";
  if (diff === 2) return "amber";
  return "green";
}

export function taskBadge(t: Task, lang: Lang = "id"): { txt: string; cls: string } {
  const en = lang === "en";
  if (t.done) return { txt: (en ? "Done" : "Selesai"), cls: "lo" };
  const dl = new Date(t.date + "T" + (t.time || "23:59") + ":00");
  const now = new Date();
  const diff = dl.getTime() - now.getTime();
  if (diff < 0) {
    const d = Math.ceil(-diff / 864e5);
    return { txt: d <= 1 ? (en ? "Late!" : "Telat!") : (en ? `Late ${d} days` : `Telat ${d} hari`), cls: "over" };
  }
  const days = Math.floor(diff / 864e5);
  if (days === 0) return { txt: (en ? "Today • " : "Hari ini • ") + t.time, cls: "hi" };
  if (days === 1) return { txt: (en ? "Tomorrow • " : "Besok • ") + t.time, cls: "md" };
  return { txt: (en ? `${days} days left` : `Sisa ${days} hari`), cls: "due" };
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