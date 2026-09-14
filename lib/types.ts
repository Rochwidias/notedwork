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
}

export interface Sched {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm
  note: string;
  color: string;
}

export interface Routine {
  id: string;
  course: string;
  day: number; // 1=Senin … 6=Sabtu
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
}

export type ViewName = "dashboard" | "email" | "tugas" | "kalender" | "profil" | "mcp";

/** Target navigasi: pindah view, atau buka sheet tambah jadwal. */
export type NavTarget = ViewName | "tambah";

export type Theme = "dark" | "light";

export interface ComposePreset {
  to: string;
  subj: string;
  body: string;
}
