// Penjadwal notifikasi sistem Android (lapis 2 dari pengingat in-app).
//
// - Hanya jalan di platform native (Capacitor). Di browser laptop fungsi
//   resync/test jadi no-op agar alur web tidak berubah.
// - Sumber: tugas (belum selesai) + jadwal kalender + rutin mingguan,
//   memakai reminderMin per item (default 3 jam, 0 = mati).
// - ID notifikasi stabil (hash dari id item) supaya edit/hapus bisa
//   batalkan & jadwal ulang tanpa notif ganda.
// - Resync = cancel milik kita yang basi + schedule ulang (maks 60 terdekat).
// - Batas platform: reboot menghapus alarm AlarmManager, jadi resync
//   dipanggil tiap buka app + tiap data berubah (lihat NotedworkApp).

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Routine, Sched, Task } from "./types";
import { DEFAULT_REMINDER_MIN } from "./reminders";

const CHANNEL_ID = "pengingat";
const TRACK_KEY = "notedwork.notifIds";
const MAX_SCHEDULED = 60;
/** Rutin tak punya reminderMin sendiri: ingatkan 60 mnt sebelum mulai. */
const ROUTINE_REMINDER_MIN = 60;

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function fnvId(ns: string, key: string): number {
  let h = 0x811c9dc5;
  const s = ns + ":" + key;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 2147483646 + 1;
}

/** Jam acara lokal dari "yyyy-mm-dd" + "hh:mm" (kosong = 23:59, ikut reminders.ts). */
function parseLocal(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const hm = /^\d{2}:\d{2}$/.test(time) ? time : "23:59";
  const at = new Date(date + "T" + hm + ":00");
  return Number.isNaN(at.getTime()) ? null : at;
}

function whenLabel(at: Date, now: Date): string {
  const m = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60000));
  if (m < 60) return `${m} mnt lagi`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lagi`;
  return `${Math.floor(h / 24)} hari lagi`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface Wanted {
  id: number;
  title: string;
  body: string;
  at: Date;
  go: "tugas" | "kalender";
}

function collect(tasks: Task[], scheds: Sched[], routines: Routine[], now: Date): Wanted[] {
  const out: Wanted[] = [];
  for (const t of tasks) {
    if (t.done) continue;
    const min = t.reminderMin ?? DEFAULT_REMINDER_MIN;
    if (!Number.isFinite(min) || min <= 0) continue;
    const at = parseLocal(t.date, t.time);
    if (!at) continue;
    const fire = new Date(at.getTime() - min * 60000);
    if (fire.getTime() <= now.getTime() + 10000) continue;
    out.push({
      id: fnvId("task", t.id),
      title: t.title || "Tugas",
      body: `Tugas${t.matkul ? ` ${t.matkul}` : ""} • ${whenLabel(at, now)} (${hhmm(at)})`,
      at: fire,
      go: "tugas",
    });
  }
  for (const s of scheds) {
    const min = s.reminderMin ?? DEFAULT_REMINDER_MIN;
    if (!Number.isFinite(min) || min <= 0) continue;
    const at = parseLocal(s.date, s.time);
    if (!at) continue;
    const fire = new Date(at.getTime() - min * 60000);
    if (fire.getTime() <= now.getTime() + 10000) continue;
    out.push({
      id: fnvId("sched", s.id),
      title: s.title || "Jadwal",
      body: `Jadwal • ${whenLabel(at, now)} (${hhmm(at)})`,
      at: fire,
      go: "kalender",
    });
  }
  for (const r of routines) {
    if (!Number.isInteger(r.day) || r.day < 1 || r.day > 7) continue;
    if (!/^\d{2}:\d{2}$/.test(r.start)) continue;
    const jsDay = r.day % 7; // 1=Senin..7=Minggu -> 1..6,0
    let pick: Date | null = null;
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      if (d.getDay() !== jsDay) continue;
      const at = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        Number(r.start.slice(0, 2)),
        Number(r.start.slice(3, 5)),
        0
      );
      if (at.getTime() > now.getTime() + 10000) {
        pick = at;
        break;
      }
    }
    if (!pick) continue;
    const fire = new Date(pick.getTime() - ROUTINE_REMINDER_MIN * 60000);
    if (fire.getTime() <= now.getTime() + 10000) continue;
    out.push({
      id: fnvId("routine", r.id),
      title: r.course || "Kuliah",
      body: `Kelas mulai ${whenLabel(pick, now)} (${hhmm(pick)}${r.room ? ` • ${r.room}` : ""})`,
      at: fire,
      go: "kalender",
    });
  }
  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  return out.slice(0, MAX_SCHEDULED);
}

function readTracked(): number[] {
  try {
    const raw = localStorage.getItem(TRACK_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is number => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

function saveTracked(ids: number[]): void {
  try {
    localStorage.setItem(TRACK_KEY, JSON.stringify(ids));
  } catch {
    /* abaikan: mode privat */
  }
}

async function ensureReady(): Promise<boolean> {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Pengingat Jadwal",
      description: "Pengingat tugas, jadwal, dan rutin kuliah notedwork.",
      importance: 4,
      vibration: true,
    });
    const cur = await LocalNotifications.checkPermissions();
    let display = cur.display;
    if (display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      display = req.display;
    }
    return display === "granted";
    // Catatan Android 12+: alarm tepat-waktu butuh izin "Alarms & reminders".
    // Bila belum diberi, sistem menurunkan ke alarm tak-tepat (tetap bunyi,
    // bisa meleset beberapa menit) — tanpa crash.
  } catch {
    return false;
  }
}

/**
 * Sinkronkan notifikasi sistem dengan data terkini. Panggil tiap buka app
 * dan tiap data berubah. Kembalikan jumlah yang dijadwalkan (0 di web / mati).
 */
export async function resyncNotif(opts: {
  enabled: boolean;
  tasks: Task[];
  scheds: Sched[];
  routines: Routine[];
}): Promise<number> {
  if (!isNative()) return 0;
  const tracked = readTracked();
  try {
    if (!opts.enabled) {
      if (tracked.length) {
        await LocalNotifications.cancel({ notifications: tracked.map((id) => ({ id })) });
      }
      saveTracked([]);
      return 0;
    }
    if (!(await ensureReady())) return 0;
    const now = new Date();
    const wanted = collect(opts.tasks, opts.scheds, opts.routines, now);
    if (tracked.length) {
      await LocalNotifications.cancel({ notifications: tracked.map((id) => ({ id })) });
    }
    if (wanted.length) {
      await LocalNotifications.schedule({
        notifications: wanted.map((w) => ({
          title: w.title,
          body: w.body,
          id: w.id,
          channelId: CHANNEL_ID,
          smallIcon: "ic_stat_notif",
          schedule: { at: w.at, allowWhileIdle: true },
          extra: { go: w.go },
        })),
      });
    }
    saveTracked(wanted.map((w) => w.id));
    return wanted.length;
  } catch {
    return 0;
  }
}

/** Batalkan semua notifikasi milik app (dipakai saat saklar dimatikan). */
export async function cancelAllNotif(): Promise<void> {
  if (!isNative()) return;
  try {
    const tracked = readTracked();
    if (tracked.length) {
      await LocalNotifications.cancel({ notifications: tracked.map((id) => ({ id })) });
    }
  } catch {
    /* abaikan */
  }
  saveTracked([]);
}

/** Notifikasi uji 5 detik ke depan (dipakai tombol Tes di Pengaturan). */
export async function testNotifNative(sample: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    if (!(await ensureReady())) return false;
    const id = fnvId("test", "ping");
    await LocalNotifications.cancel({ notifications: [{ id }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Tes pengingat notedwork",
          body: sample,
          id,
          channelId: CHANNEL_ID,
          smallIcon: "ic_stat_notif",
          schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

let tapWired = false;
/** Arahkan tap notifikasi ke view app (sekali per sesi). */
export function wireNotifTap(go: (v: "tugas" | "kalender") => void): void {
  if (!isNative() || tapWired) return;
  tapWired = true;
  void LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
    const target = (e.notification?.extra as { go?: unknown } | undefined)?.go;
    if (target === "tugas" || target === "kalender") go(target);
  });
}
