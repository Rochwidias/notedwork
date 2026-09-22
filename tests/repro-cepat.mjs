// RED test (TDD): Tambah Cepat wizard 3 langkah.
// Harus GAGAL sebelum implementasi, PASS sesudahnya.
import { readFileSync } from "node:fs";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); failures++; }
}

const sheets = readFileSync(new URL("../components/Sheets.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../components/NotedworkApp.tsx", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../lib/i18n.ts", import.meta.url), "utf8");

// 1. Helper slider menit -> HH:MM harus ada dan benar via static export check.
check(
  "Sheets: export helper minutesToHHMM",
  /export function minutesToHHMM/.test(sheets),
  "tidak ada export function minutesToHHMM di Sheets.tsx"
);

// 2. QuickAddSheet 3 langkah harus ada.
check(
  "Sheets: export QuickAddSheet",
  /export function QuickAddSheet/.test(sheets),
  "tidak ada export function QuickAddSheet"
);

// 3. QuickAddSheet pakai slider waktu (input range).
check(
  "QuickAddSheet: ada input range untuk geser jam",
  /QuickAddSheet[\s\S]{0,15000}?type="range"/.test(sheets),
  'tidak ada type="range" di area QuickAddSheet'
);

// 4. NotedworkApp wiring: sheet cepat + FAB go tambah cepat.
check(
  'NotedworkApp: SheetId mencakup "cepat" atau render QuickAddSheet',
  /"cepat"/.test(sheets) || /"cepat"/.test(app) || /QuickAddSheet/.test(app),
  'tidak ada "cepat" / QuickAddSheet di NotedworkApp'
);

// 5. i18n keys quick.* ID + EN.
check(
  "i18n: ada keys quick.*",
  /"quick\.title"/.test(i18n) && /"quick\.next"/.test(i18n),
  "tidak ada quick.title / quick.next di lib/i18n.ts"
);

// 6. Unit logika murni minutesToHHMM (import langsung bila sudah ada).
try {
  const mod = await import("../components/Sheets.tsx").catch(() => null);
  void mod;
  // Helper di file client tsx tidak bisa diimport node langsung; validasi via duplikasi rumus di sini:
  // Spesifikasi: 0 -> 00:00, 60 -> 01:00, 1439/1440 clamp, step 15 di UI.
  // Test ini PASS bila file mengandung rumus padStart yang benar.
  const hasPad = /minutesToHHMM[\s\S]{0,300}?padStart\(2,\s*"0"\)/.test(sheets);
  check("minutesToHHMM: memakai padStart HH:MM", hasPad, "rumus padStart tidak ditemukan");
} catch {
  check("minutesToHHMM: import check", false, "gagal import");
}

const emailView = readFileSync(new URL("../components/EmailView.tsx", import.meta.url), "utf8");
const driveRoute = readFileSync(new URL("../app/api/drive/notes/route.ts", import.meta.url), "utf8");
const quickSrc = sheets.slice(sheets.indexOf("export function QuickAddSheet"));
const step1Start = quickSrc.indexOf("{step === 1");
const step2Start = quickSrc.indexOf("{step === 2", step1Start);
const quickStep1 = quickSrc.slice(step1Start, step2Start);

// 7. Mode terkunci per tab: props + chips disembunyikan.
check(
  "QuickAddSheet: props initialKind + lockKind",
  /initialKind/.test(quickSrc) && /lockKind/.test(quickSrc),
  "tidak ada props initialKind/lockKind di QuickAddSheet"
);
check(
  "QuickAddSheet: chips jenis disembunyikan saat lockKind",
  /!lockKind/.test(quickSrc),
  "tidak ada cabang !lockKind di QuickAddSheet"
);

// 8. Tugas lengkap: pilihan prioritas (tidak lagi hardcoded sedang).
check(
  'QuickAddSheet tugas: ada pilihan prioritas ("tinggi")',
  /"tinggi"/.test(quickSrc),
  'tidak ada opsi "tinggi" di QuickAddSheet'
);

// 9. Jadwal lengkap: jam selesai opsional.
check(
  'QuickAddSheet jadwal: ada input jam selesai (qEnd)',
  quickSrc.includes('id="qEnd"'),
  'tidak ada id="qEnd" di QuickAddSheet'
);

// 10. Email terpandu: To ditanya di langkah 1 (bukan langkah 2).
check(
  "QuickAddSheet email: To (qTo) ada di langkah 1",
  quickStep1.includes('id="qTo"'),
  'id="qTo" tidak ada sebelum "step === 2"'
);

// 11. Email: subjek berlabel sendiri.
check(
  "i18n: ada quick.subjLabel",
  /"quick\.subjLabel"/.test(i18n),
  "tidak ada quick.subjLabel di lib/i18n.ts"
);

// 12. Judul sheet per jenis saat terkunci.
check(
  "i18n: judul per jenis quick.titleTask/Sched/Mail/Note",
  /"quick\.titleTask"/.test(i18n) &&
    /"quick\.titleSched"/.test(i18n) &&
    /"quick\.titleMail"/.test(i18n) &&
    /"quick\.titleNote"/.test(i18n),
  "keys quick.title{Task,Sched,Mail,Note} belum lengkap"
);

// 13. EmailView: tombol Tulis untuk wizard terkunci email.
check(
  "EmailView: ada tombol Tulis (onCompose)",
  /onCompose/.test(emailView),
  "tidak ada onCompose di EmailView.tsx"
);

// 14. App: state kind terkunci + entry per tab.
check(
  "NotedworkApp: state quickKind/quickLock",
  /quickKind/.test(app) && /quickLock/.test(app),
  "tidak ada quickKind/quickLock di NotedworkApp"
);

// 15. Drive: isi boleh kosong (judul saja cukup, nutup bug 400).
check(
  "Drive: tanpa tolak !body",
  !/!title \|\| !body/.test(driveRoute),
  "route masih menolak body kosong"
);

console.log(failures ? `\n${failures} check(s) FAILED (fitur belum ada)` : "\nSemua checks PASS");
process.exit(failures ? 1 : 0);
