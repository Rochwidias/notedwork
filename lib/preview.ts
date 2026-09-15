"use client";

import type { Mail, Routine, Sched, Task } from "./types";
import { RCOL, todayStr } from "./dates";

/** Identitas tampilan tamu — label saja, jangan dipakai sebagai suffix kunci (pakai GUEST_SUFFIX). */
export const PREVIEW_EMAIL = "tamu@contoh.id";

/** Satu string prompt login untuk semua aksi tulis yang diblokir di preview. */
export const PREVIEW_LOGIN_HINT = "Login dengan Google untuk memakai data aslimu";

function isoPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const SAMPLE_MAILS: Mail[] = [
  {
    id: "pv-mail-1",
    from: "Bagian Akademik",
    email: "akademik@contoh.id",
    subj: "Jadwal pengisian KRS semester genap",
    prev: "Pengisian KRS dibuka mulai Senin depan melalui portal akademik…",
    body: "Halo mahasiswa,\n\nPengisian KRS semester genap dibuka mulai Senin depan pukul 08.00 melalui portal akademik. Pastikan konsultasi dengan dosen wali sebelum submit.\n\nTerima kasih.",
    time: "08.30",
    tag: "Contoh",
    files: [],
    unread: true,
  },
  {
    id: "pv-mail-2",
    from: "Dosen Basis Data",
    email: "dosen@contoh.id",
    subj: "Reminder: Laporan modul 6 dikumpulkan Jumat",
    prev: "Jangan lupa laporan modul 6 beserta screenshot hasil query…",
    body: "Halo semua,\n\nJangan lupa laporan modul 6 (JOIN + subquery) dikumpulkan Jumat pukul 23.59. Sertakan screenshot hasil query dan kesimpulan.\n\nSalam.",
    time: "Kemarin",
    tag: "Contoh",
    files: [{ name: "panduan-laporan.pdf", size: "240 KB" }],
    unread: true,
    starred: true,
  },
  {
    id: "pv-mail-3",
    from: "Himpunan Mahasiswa",
    email: "hima@contoh.id",
    subj: "Open recruitment panitia seminar nasional",
    prev: "Dibutuhkan 20 panitia divisi acara, humas, dan konsumsi…",
    body: "Halo teman-teman,\n\nHIMA membuka rekrutmen panitia seminar nasional. Divisi: acara, humas, konsumsi, dokumentasi. Pendaftaran via formulir terlampir.\n\nDitunggu partisipasinya!",
    time: "Senin",
    tag: "Contoh",
    files: [],
    unread: false,
  },
  {
    id: "pv-mail-4",
    from: "Perpustakaan Kampus",
    email: "perpus@contoh.id",
    subj: "Buku yang Anda pinjam jatuh tempo 3 hari lagi",
    prev: "Mohon kembalikan atau perpanjang masa pinjam sebelum tanggal…",
    body: "Yth. peminjam,\n\nBuku yang Anda pinjam jatuh tempo 3 hari lagi. Perpanjangan bisa dilakukan sekali via aplikasi perpustakaan.\n\nTerima kasih.",
    time: "Minggu lalu",
    tag: "Contoh",
    files: [],
    unread: false,
  },
  {
    id: "pv-mail-5",
    from: "Kakak Tingkat",
    email: "kating@contoh.id",
    subj: "Tips lolos asistensi praktikum",
    prev: "Fokus ke konsep pointer dan struktur data, latihan soal tahun lalu…",
    body: "Halo dek,\n\nSedikit tips buat asistensi praktikum minggu depan: fokus ke pointer + struktur data, kerjakan soal tahun lalu, dan jangan begadang H-1.\n\nSemangat!",
    time: "2 minggu lalu",
    tag: "Contoh",
    files: [{ name: "kumpulan-soal.zip", size: "1,2 MB" }],
    unread: false,
    starred: true,
  },
  {
    id: "pv-mail-6",
    from: "Google AI Studio",
    email: "noreply@google.com",
    subj: "Google AI Studio — Gemini 3.8 Flash",
    prev: "Model reasoning & coding terbaru: coba di AI Studio, lihat harga…",
    body: "Google AI Studio\n\n[Try in AI Studio](https://example.com/studio) — model reasoning & coding terbaru.\n\n- Long-horizon software engineering\n- Autonomous agents\n- Tunable thinking level\n\n[TABLE]\n[R][H]Model | [H]Input | [H]Output\n[R]Gemini 3.8 Flash | $0.75* | $3.75*\n[R]Lainnya | $5.00 | $25.00\n[/TABLE]\n\nContoh pakai:\n\n[PRE]\nfrom google import genai\nclient = genai.Client()\nprint(\"halo\")\n[/PRE]\n\nLihat [dokumentasi lengkap](https://example.com/docs) atau kunjungi www.contoh.id untuk info.\n\n* Harga promo berakhir 31 Desember 2026.\n© 2026 Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA\n\nThis email was sent to kamu@contoh.id because you signed up to receive emails about Google AI. If you do not wish to receive these emails, please unsubscribe.",
    time: "4 Sep",
    tag: "Contoh",
    files: [],
    unread: true,
  },
];

export function sampleScheds(): Sched[] {
  const ts = todayStr();
  return [
    { id: "pv-sched-1", title: "Seminar proposal skripsi", date: ts, time: "10:00", endTime: "11:30", note: "Ruang sidang 2", color: "#22c55e" },
    { id: "pv-sched-2", title: "Bimbingan dosen wali", date: isoPlus(1), time: "13:00", note: "Bawa draft KRS", color: "#00cfff" },
    { id: "pv-sched-3", title: "Presentasi kelompok PBO", date: isoPlus(3), time: "09:40", endTime: "10:30", note: "Slide + demo", color: "#7c5cff" },
  ];
}

export function sampleTasks(): Task[] {
  return [
    { id: "pv-task-1", matkul: "Basis Data", title: "Laporan modul 6 (JOIN + subquery)", date: todayStr(), time: "23:59", prio: "tinggi", note: "Sertakan screenshot", done: false },
    { id: "pv-task-2", matkul: "PBO", title: "Revisi class diagram kelompok", date: isoPlus(1), time: "17:00", prio: "sedang", note: "", done: false },
    { id: "pv-task-3", matkul: "Agama", title: "Rangkuman bab 4", date: isoPlus(-2), time: "12:00", prio: "rendah", note: "", done: true },
  ];
}

export function sampleRoutines(): Routine[] {
  return [
    { id: "pv-routine-1", course: "Basis Data", day: 1, start: "08:00", end: "10:30", room: "2A", lect: "Bu Sari", color: RCOL[0] },
    { id: "pv-routine-2", course: "Pemrograman Web", day: 3, start: "13:00", end: "15:30", room: "Lab 1", lect: "Pak Andi", color: RCOL[1] },
    { id: "pv-routine-3", course: "Sistem Operasi", day: 5, start: "10:00", end: "12:30", room: "3B", lect: "Bu Rina", color: RCOL[3] },
  ];
}
