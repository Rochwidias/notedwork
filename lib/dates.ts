import type { Prio, Task } from "./types";

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

export function offsetDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  );
}

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

export function isOverdue(t: Task): boolean {
  if (t.done) return false;
  return t.date + t.time < todayStr() + nowHM();
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
