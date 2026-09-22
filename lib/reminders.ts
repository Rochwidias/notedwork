// Pengingat jadwal & tugas — fungsi murni, tanpa React.
// Dipakai kartu hitung mundur + banner/bunyi di NotedworkApp.

export interface ReminderItem {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm (kosong = akhir hari 23:59)
  kind: "sched" | "task";
  /** Menit sebelum acara; 0 = mati. */
  reminderMin: number;
}

/** Default bila Sched/Task.reminderMin tak diisi: 3 jam (0 = mati disengaja). */
export const DEFAULT_REMINDER_MIN = 180;

/** Toleransi kecocokan pengingat: ±60 detik. */
const DUE_TOLERANCE_MS = 60_000;

/** Jam acara sebagai Date lokal; null bila tanggal/time rusak. */
function eventAt(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Time kosong ikut konvensi repo (isOverdue/taskBadge): akhir hari.
  const hm = /^\d{2}:\d{2}$/.test(time) ? time : "23:59";
  const at = new Date(date + "T" + hm + ":00");
  return Number.isNaN(at.getTime()) ? null : at;
}

/** Kejadian hari ini/besok terdekat yang belum lewat; null bila tak ada. */
export function nextReminder(
  items: ReminderItem[],
  now: Date,
): { item: ReminderItem; at: Date; minsLeft: number } | null {
  // Batas atas: tengah malam lusa (besok masih ikut).
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 2);
  let best: { item: ReminderItem; at: Date } | null = null;
  for (const item of items) {
    const at = eventAt(item.date, item.time);
    if (!at) continue;
    if (at.getTime() < now.getTime()) continue; // sudah lewat
    if (at.getTime() >= end.getTime()) continue; // lusa ke atas
    if (!best || at.getTime() < best.at.getTime()) best = { item, at };
  }
  if (!best) return null;
  const minsLeft = Math.floor((best.at.getTime() - now.getTime()) / 60_000);
  return { item: best.item, at: best.at, minsLeft };
}

/** Label hitung mundur: "sekarang" | "45 mnt lagi" | "2 jam lagi" | "besok". */
export function formatCountdown(minsLeft: number): string {
  if (!Number.isFinite(minsLeft) || minsLeft <= 0) return "sekarang";
  if (minsLeft < 60) return minsLeft + " mnt lagi";
  if (minsLeft < 24 * 60) return Math.floor(minsLeft / 60) + " jam lagi";
  return "besok";
}

/** Pengingat yang tiba (momen acara − reminderMin, toleransi ±60 detik). */
export function dueReminders(items: ReminderItem[], now: Date): ReminderItem[] {
  const t = now.getTime();
  return items.filter((it) => {
    if (!Number.isFinite(it.reminderMin) || it.reminderMin <= 0) return false; // 0 = mati
    const at = eventAt(it.date, it.time);
    if (!at) return false;
    const fire = at.getTime() - it.reminderMin * 60_000;
    return Math.abs(t - fire) <= DUE_TOLERANCE_MS;
  });
}
