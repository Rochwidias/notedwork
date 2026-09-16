// RED test (TDD): menu rata kiri konsisten + navigasi 4 tab + baris keyboard-accessible.
// Jalankan: node tests/repro-menu-kiri.mjs
// Harus GAGAL sebelum fix, PASS sesudah fix.
import { readFileSync } from "node:fs";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); failures++; }
}

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const nav = readFileSync(new URL("../components/AppNav.tsx", import.meta.url), "utf8");
const tasks = readFileSync(new URL("../components/TasksView.tsx", import.meta.url), "utf8");
const sheets = readFileSync(new URL("../components/Sheets.tsx", import.meta.url), "utf8");
const profile = readFileSync(new URL("../components/ProfileView.tsx", import.meta.url), "utf8");

const block = (sel) => {
  const m = css.match(new RegExp(sel + "\\s*\\{[^}]*\\}"));
  return m ? m[0] : "";
};

// 1. Navigasi: 4 tab utama (Hari Ini, Email, Tugas, Kalender); Profil via avatar, bukan tab.
check(
  "TabBar grid 4 kolom",
  /repeat\(4/.test(block("\\.tabbar-inner")),
  "masih repeat(5"
);
check(
  "AppNav TABS tepat 4 item",
  (nav.match(/id:\s*"(beranda|email|tugas|kalender)"/g) || []).length === 4,
  `dapat ${(nav.match(/id:\s*"(beranda|email|tugas|kalender)"/g) || []).length}`
);
check(
  "AppNav TABS tanpa profil",
  !/id:\s*"profil"/.test(nav),
  "TABS masih berisi profil"
);

// 2. Sidebar rata kiri (reset warisan base .tab yang tengah).
check(
  "sidebar .tab justify flex-start",
  /justify-content\s*:\s*flex-start/.test(block("\\.sidebar\\s+\\.tab")),
  ".sidebar .tab masih center"
);
check(
  "sidebar active tanpa garis tengah-bawah",
  /content\s*:\s*none/.test(block("\\.sidebar\\s+\\.tab\\.active::after")),
  "::after 24px left:50% masih hidup"
);
check(
  "sidebar active bar kiri",
  /\.sidebar\s+\.tab\.active::before/.test(css),
  "tidak ada ::before bar kiri"
);

// 3. Judul bulan kalender rata kiri.
check(
  "cal-head flex-start",
  /justify-content\s*:\s*flex-start/.test(block("\\.cal-head")),
  ".cal-head masih space-between tengah"
);
check(
  "cal-head tanpa margin auto",
  !/margin-(left|right)\s*:\s*auto/.test(block("\\.cal-head")),
  ".cal-head masih margin auto"
);

// 4. Baris top-aligned kiri (acuan: .trow yang sudah flex-start).
check(
  ".row flex-start",
  /align-items\s*:\s*flex-start/.test(block("\\.row")),
  ".row masih center"
);
check(
  ".erow flex-start",
  /align-items\s*:\s*flex-start/.test(block("\\.erow")),
  ".erow masih center"
);
check(
  ".set-row flex-start",
  /align-items\s*:\s*flex-start/.test(block("\\.set-row")),
  ".set-row masih center"
);
check(
  ".legend tanpa margin auto",
  !/margin-(left|right)\s*:\s*auto/.test(block("\\.legend")),
  ".legend masih margin auto"
);

// 5. Sheet: handle kiri + aksi tunggal full-width (tanpa <span/> kanan).
check(
  "grab rata kiri",
  !/margin\s*:\s*0\s+auto/.test(block("\\.grab")),
  ".grab masih margin auto tengah"
);
check(
  "actions tunggal satu kolom",
  /\.actions-single/.test(css),
  "tidak ada .actions-single"
);
check(
  "Sheets tanpa placeholder <span/>",
  !/<span\s*\/>/.test(sheets),
  "masih ada <span/> pendorong tombol ke kanan"
);

// 6. Tugas: baris keyboard-accessible + affordance ›.
check("TasksView role=button", /role="button"/.test(tasks), "tanpa role");
check("TasksView tabIndex", /tabIndex/.test(tasks), "tanpa tabIndex");
check("TasksView onKeyDown", /onKeyDown/.test(tasks), "tanpa onKeyDown");
check("TasksView affordance ›", /›/.test(tasks), "tanpa ›");

// 7. Profil: seksi Galeri Tema.
check(
  "ProfileView Galeri Tema",
  /Galeri Tema/.test(profile),
  'masih berjudul "Pengaturan"'
);

console.log(failures ? `\n${failures} check(s) FAILED (bug terreproduksi)` : "\nSemua checks PASS");
process.exit(failures ? 1 : 0);
