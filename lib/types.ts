export interface MailFile {
  name: string;
  size: string;
}

export interface Mail {
  id: string;
  from: string;
  email: string;
  subj: string;
  prev: string;
  body: string;
  time: string;
  tag: string;
  files: MailFile[];
  /** Status UNREAD langsung dari label Gmail (undefined = tidak diketahui). */
  unread?: boolean;
  /** Bintang Gmail (label STARRED) — boolean, bukan substring di tag. */
  starred?: boolean;
}

export interface Sched {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm mulai
  /** hh:mm selesai, same-day, opsional — kosong = sekilas (end == start). */
  endTime?: string;
  /** Seharian dari Google Calendar (start.date tanpa dateTime). */
  allDay?: boolean;
  /** Jam selesai lewat tengah malam (end <= start → tanggal end +1 hari). */
  overnight?: boolean;
  note: string;
  color: string;
  /** Menit pengingat sebelum mulai; opsional, default 15, 0 = mati. */
  reminderMin?: number;
}

export interface Routine {
  id: string;
  course: string;
  day: number; // 1=Senin … 7=Minggu
  start: string;
  end: string;
  room: string;
  lect: string;
  color: string;
}

export type Prio = "tinggi" | "sedang" | "rendah";

export interface Task {
  id: string;
  matkul: string;
  title: string;
  date: string;
  time: string;
  prio: Prio;
  note: string;
  done: boolean;
  /** Menit pengingat sebelum deadline; opsional, default 15, 0 = mati. */
  reminderMin?: number;
}

/** Layar utama: beranda (Hari Ini) + email + tugas + kalender + catatan + profil. */
export type ViewName = "beranda" | "email" | "tugas" | "kalender" | "catatan" | "profil";

/** Target navigasi: pindah view, atau buka sheet tambah jadwal. */
export type NavTarget = ViewName | "tambah";

export type Theme = "dark" | "light" | "auto";

export interface ComposePreset {
  to: string;
  subj: string;
  body: string;
}
