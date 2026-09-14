import type { Mail, Routine, Sched, Task } from "./types";
import { offsetDate } from "./dates";

export const LS = {
  sched: "rocha.schedules",
  read: "rocha.readMail",
  star: "rocha.star",
  arch: "rocha.arch",
  del: "rocha.del",
  tasks: "rocha.tasks",
  routine: "rocha.routine",
  theme: "rocha.theme",
  notif: "rocha.notif",
} as const;

export const SAMPLE_MAIL: Mail[] = [
  {
    id: "m1",
    from: "Bu Ratna (Dosen)",
    email: "ratna@univ.ac.id",
    subj: "Pengumuman: UTS Pemrograman Web dimajukan",
    prev: "UTS dimajukan ke Senin depan, materi sampai modul 6. Bawa KTM…",
    body: "Halo semuanya,\n\nUTS Pemrograman Web dimajukan ke Senin depan pukul 09.00 di Lab 2. Materi sampai modul 6. Jangan lupa bawa KTM.\n\nTerima kasih,\nBu Ratna (contoh)",
    time: "08:12",
    tag: "Akademik",
    files: [
      { name: "Modul-1-6.pdf", size: "2,4 MB" },
      { name: "Kisi-kisi-UTS.pdf", size: "310 KB" },
    ],
  },
  {
    id: "m2",
    from: "Pak Budi (Dosen)",
    email: "budi@univ.ac.id",
    subj: "Tugas modul 6 + dataset praktikum",
    prev: "Kerjakan latihan modul 6, dataset terlampir. Kumpul sebelum Jumat 23:59…",
    body: "Halo,\n\nKerjakan latihan modul 6 (3 query + 1 laporan). Dataset praktikum terlampir. Kumpulkan via e-learning sebelum Jumat 23:59.\n\n- Pak Budi (contoh)",
    time: "07:40",
    tag: "Tugas",
    files: [
      { name: "Dataset-Latihan.sql", size: "56 KB" },
      { name: "Modul-6.pdf", size: "1,8 MB" },
    ],
  },
  {
    id: "m3",
    from: "Akademik FTI",
    email: "akademik@univ.ac.id",
    subj: "Jadwal pengisian KRS semester genap dibuka",
    prev: "Pengisian KRS dibuka 16–20 September via portal. Konsultasi ke dosen wali…",
    body: "Yth. Mahasiswa,\n\nPengisian KRS semester genap dibuka 16–20 September via portal akademik. Silakan konsultasi dengan dosen wali sebelum submit.\n\n(Email contoh untuk tampilan.)",
    time: "Kemarin",
    tag: "KRS",
    files: [{ name: "Panduan-KRS.pdf", size: "890 KB" }],
  },
  {
    id: "m4",
    from: "UKM Robotik",
    email: "robotik@ukm.univ.ac.id",
    subj: "Open recruitment anggota baru 2026 🤖",
    prev: "Yuk gabung! Divisi programming, mekanik, dan desain. Pendaftaran s.d. Jumat…",
    body: "Halo!\n\nUKM Robotik membuka pendaftaran anggota baru. Divisi: programming, mekanik, desain. Pendaftaran sampai Jumat via link sekretariat.\n\n(Email contoh.)",
    time: "Kemarin",
    tag: "UKM",
    files: [{ name: "Formulir-Pendaftaran.pdf", size: "120 KB" }],
  },
  {
    id: "m5",
    from: "Perpustakaan",
    email: "perpus@univ.ac.id",
    subj: "Buku 'Basis Data' jatuh tempo besok",
    prev: "Buku yang Anda pinjam jatuh tempo besok. Perpanjang via aplikasi…",
    body: "Halo,\n\nBuku 'Basis Data Lanjut' yang Anda pinjam jatuh tempo besok. Perpanjang via aplikasi perpustakaan atau datang ke meja sirkulasi.\n\n(Email contoh.)",
    time: "2 hari lalu",
    tag: "Perpus",
    files: [],
  },
  {
    id: "m6",
    from: "Kemahasiswaan",
    email: "beasiswa@univ.ac.id",
    subj: "Beasiswa PPA: berkas kurang transkrip",
    prev: "Berkas Anda kurang transkrip semester terakhir. Lengkapi sebelum 25 Sept…",
    body: "Yth. Rochwidias,\n\nBerkas pengajuan Beasiswa PPA kurang: transkrip semester terakhir. Lengkapi sebelum 25 September ke bagian kemahasiswaan.\n\n(Email contoh.)",
    time: "3 hari lalu",
    tag: "Beasiswa",
    files: [{ name: "Syarat-Beasiswa-PPA.pdf", size: "1,1 MB" }],
  },
];

export function seedSchedules(): Sched[] {
  return [
    { id: "s1", title: "Seminar proposal", date: offsetDate(1), time: "10:00", note: "Aula FTI", color: "#22c55e" },
    { id: "s2", title: "Rapat UKM Robotik", date: offsetDate(3), time: "16:00", note: "Sekretariat UKM", color: "#ec4899" },
    { id: "s3", title: "Perpanjang buku perpus", date: offsetDate(4), time: "12:00", note: "Aplikasi perpustakaan", color: "#ef4444" },
  ];
}

/* Hari: 1=Senin … 6=Sabtu */
export const SAMPLE_ROUTINE: Routine[] = [
  { id: "r1", course: "Pemrograman Web", day: 1, start: "09:00", end: "10:40", room: "Lab 2", lect: "Bu Ratna", color: "#00cfff" },
  { id: "r2", course: "Basis Data", day: 1, start: "13:00", end: "14:40", room: "3A", lect: "Pak Budi", color: "#22c55e" },
  { id: "r3", course: "Matematika Diskrit", day: 2, start: "10:30", end: "12:10", room: "1B", lect: "Bu Sinta", color: "#7c5cff" },
  { id: "r4", course: "Pemrograman Web (Praktikum)", day: 3, start: "09:00", end: "10:40", room: "Lab 2", lect: "Bu Ratna", color: "#00cfff" },
  { id: "r5", course: "Bahasa Inggris", day: 5, start: "08:00", end: "09:40", room: "1C", lect: "Ms. Dewi", color: "#f59e0b" },
];

export function seedTasks(): Task[] {
  return [
    { id: "t1", matkul: "Basis Data", title: "Laporan modul 6", date: offsetDate(1), time: "23:59", prio: "tinggi", note: "Kumpul via e-learning", done: false },
    { id: "t2", matkul: "Pemrograman Web", title: "Project UTS: landing page", date: offsetDate(3), time: "23:59", prio: "tinggi", note: "HTML+CSS, min 3 halaman", done: false },
    { id: "t3", matkul: "Matematika Diskrit", title: "Latihan soal himpunan", date: offsetDate(0), time: "21:00", prio: "sedang", note: "No. 1–10", done: false },
    { id: "t4", matkul: "Bahasa Inggris", title: "Essay 300 kata", date: offsetDate(5), time: "23:59", prio: "rendah", note: "Tema: technology", done: false },
    { id: "t5", matkul: "Sistem Operasi", title: "Resume Bab 3", date: offsetDate(-1), time: "23:59", prio: "sedang", note: "", done: true },
  ];
}
