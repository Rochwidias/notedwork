import { readFileSync } from "node:fs";
const nav = readFileSync("components/AppNav.tsx", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const notesView = readFileSync("components/NotesView.tsx", "utf8");
const dates = readFileSync("lib/dates.ts", "utf8");
const hari = readFileSync("components/HariIni.tsx", "utf8");
const emailV = readFileSync("components/EmailView.tsx", "utf8");
const tasksV = readFileSync("components/TasksView.tsx", "utf8");
const calV = readFileSync("components/CalendarView.tsx", "utf8");
const sheets = readFileSync("components/Sheets.tsx", "utf8");
const schedBlock = sheets.slice(sheets.indexOf("export function SchedSheet"), sheets.indexOf("export function MailSheet"));
const taskBlock = sheets.slice(sheets.indexOf("export function TaskSheet"), sheets.indexOf("export function RoutineSheet"));
const mailBlock = sheets.slice(sheets.indexOf("export function MailSheet"), sheets.indexOf("export function TaskSheet"));
const routineBlock = sheets.slice(sheets.indexOf("export function RoutineSheet"));
const settingsV = readFileSync("components/SettingsView.tsx", "utf8");
const shell = readFileSync("components/NotedworkApp.tsx", "utf8");
const checks = [
  ["tab settings keenam", /id:\s*"settings"/.test(nav) && nav.includes('labelKey: "nav.settings"')],
  ["tanpa profil di nav", !/id:\s*"profil"/.test(nav)],
  ["ViewName settings", types.includes('"settings"') && !types.includes('"profil"')],
  ["sidebar via t()", nav.includes('t("nav.menu"') || nav.includes("t('nav.menu'")],
  ["notes gear ke settings", notesView.includes("onOpenSettings") && notesView.includes("IconGear") && notesView.includes('t("notes.settings")')],
  ["notes gear wiring", readFileSync("components/NotedworkApp.tsx", "utf8").includes('go("settings")') && readFileSync("components/NotedworkApp.tsx", "utf8").includes("onOpenSettings")],
  ["dates helper EN", dates.includes('"Monday"') && dates.includes('"January"') && dates.includes('"Mon"') && dates.includes('"All day"') && dates.includes("en-US")],
  ["dates helper export", ["dayNames", "monthNames", "dow3", "dowInitials", "prioLabel"].every((f) => dates.includes(`export function ${f}`))],
  ["dates fmt lang param", dates.includes("fmtDateID(iso: string, lang") && dates.includes("fmtSchedRange(s: Sched, lang") && dates.includes("taskBadge(t: Task, lang")],
  ["hariini useLang", hari.includes("useLang()")],
  ["hariini tanpa hardcode", !hari.includes("Tidak ada pengingat") && !hari.includes("3 Terpenting") && !hari.includes("Minggu ini") && !hari.includes("Email penting") && !hari.includes("DOW3 = [") && !hari.includes("Halo, {name}") && !hari.includes(" • Ruang ") && !hari.includes("mnt lagi")],
  ["emailview useLang", emailV.includes("useLang()")],
  ["emailview tanpa hardcode", !emailV.includes("Belum dibaca") && !emailV.includes("Cari email") && !emailV.includes("Muat lagi") && !emailV.includes("Arsipkan") && !emailV.includes("Kembali ke daftar") && !emailV.includes("Tandai belum dibaca") && !emailV.includes("Beri bintang") && !emailV.includes("Tanpa label")],
  ["tasksview useLang", tasksV.includes("useLang()")],
  ["tasksview tanpa hardcode", !tasksV.includes("Tidak ada tugas") && !tasksV.includes("Tambah tugas") && !tasksV.includes('"Aktif"') && !tasksV.includes('"Telat"') && !tasksV.includes("Ketuk untuk ubah status") && !tasksV.includes("tersimpan lokal")],
  ["calendar useLang", calV.includes("useLang()")],
  ["calendar tanpa hardcode", !calV.includes("Bulan sebelumnya") && !calV.includes("Jadwal rutin mingguan") && !calV.includes("Tidak ada agenda") && !calV.includes("Kelola jadwal rutin") && !calV.includes("MONTHS[") && !calV.includes("DAYS[")],
  ["sched/task useLang", schedBlock.includes("useLang()") && taskBlock.includes("useLang()")],
  ["sched tanpa hardcode", !schedBlock.includes("Ubah Jadwal") && !schedBlock.includes("Tambah Jadwal") && !schedBlock.includes("Isi judul dulu") && !schedBlock.includes("Jam selesai")],
  ["task tanpa hardcode", !taskBlock.includes("Ubah Tugas") && !taskBlock.includes("Mata kuliah") && !taskBlock.includes("Dikosongkan = akhir hari") && !taskBlock.includes("Prioritas")],
  ["reminder values", sheets.includes("REMINDER_VALUES") && !sheets.includes("REMINDER_OPTIONS")],
  ["mail/routine useLang", mailBlock.includes("useLang()") && routineBlock.includes("useLang()")],
  ["mail tanpa hardcode", !mailBlock.includes("Tulis Email") && !mailBlock.includes("Kepada") && !mailBlock.includes("Mengirim") && !mailBlock.includes("Terkirim langsung")],
  ["routine tanpa hardcode", !routineBlock.includes("Kelola Jadwal Rutin") && !routineBlock.includes("Mata kuliah") && !routineBlock.includes("Jadwal buatanmu (") && !routineBlock.includes("Menambah")],
  ["settings useLang", settingsV.includes("useLang()")],
  ["settings tanpa hardcode", !settingsV.includes("Galeri Tema") && !settingsV.includes("Hubungkan Google") && !settingsV.includes("Akun Google yang tersambung") && !settingsV.includes("Nama tampilan") && !settingsV.includes("Warna tampilan") && !settingsV.includes("Terang, gelap") && !settingsV.includes("Login dengan Google") && !settingsV.includes("Keluar dari pratinjau") && !settingsV.includes("Tersambung sebagai") && !settingsV.includes("Pembuat &") && !settingsV.includes(">Profil<")],
  ["shell toast via t()", shell.includes('t("toast.taskDone")') && shell.includes('t("toast.schedSaved")') && shell.includes('t("toast.archived")') && shell.includes('t("toast.connected")')],
  ["shell tanpa hardcode", !shell.includes('"Tugas selesai!"') && !shell.includes('"Diarsipkan"') && !shell.includes('"Jadwal tersimpan"') && !shell.includes('"Terhubung ke Google"') && !shell.includes('"Keluar dari pratinjau?') && !shell.includes("PREVIEW_LOGIN_HINT") && !shell.includes('"Mode pratinjau — data contoh"') && !shell.includes('"Login dengan Google"')],
];
let fail = 0;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`), ok || fail++;
process.exit(fail ? 1 : 0);
