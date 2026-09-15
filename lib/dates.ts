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

export const RCOL = ["#00cfff", "#22c55e", "#f59e0b", "#7c5cff", "#ec4899", "#ef4444"];
export const SCHED_COLORS = ["#22c55e", "#00cfff", "#f59e0b", "#7c5cff", "#ec4899", "#ef4444"];

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
