import { readFileSync } from "node:fs";
// Tombol bahasa TopBar segmented ID/EN + tak ada label hardcode di tombol & note-sheet.
const topbar = readFileSync("components/TopBar.tsx", "utf8");
const sheets = readFileSync("components/Sheets.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
// NoteSheet saja (Sched/Task/Mail sheet lain masih full-ID — scope terpisah).
const noteBlock = sheets.slice(sheets.indexOf("export function NoteSheet"), sheets.indexOf("export function RoutineSheet"));
const checks = [
  ["lang-btn segmented ID", topbar.includes('className="icon-btn lang-btn"') && topbar.includes(">ID<")],
  ["lang-btn segmented EN", topbar.includes(">EN<")],
  ["lang aktif ikut lang", topbar.includes('lang === "id" ? "on" : "off"') && topbar.includes('lang === "en" ? "on" : "off"')],
  ["aria bahasa via t()", topbar.includes('aria-label={lang === "id" ? t("topbar.langToEn") : t("topbar.langToId")}')],
  ["tema via t()", topbar.includes('title={t("topbar.theme")}') && topbar.includes('t("topbar.themeToLight")') && topbar.includes('t("topbar.themeToDark")')],
  ["avatar via t()", topbar.includes('t("topbar.settings")') && topbar.includes('t("topbar.connect")')],
  ["tagline via t()", topbar.includes('t("topbar.tagline")')],
  ["tanpa hardcode ID di TopBar", !topbar.includes("Ganti tema") && !topbar.includes("Mode terang") && !topbar.includes("Koneksi Google") && !topbar.includes("lang.toUpperCase()")],
  ["note-sheet simpan via t()", sheets.includes('t("notes.saving")') && sheets.includes('t("notes.saveChanges")')],
  ["tanpa hardcode simpan di NoteSheet", !noteBlock.includes("Simpan perubahan") && !noteBlock.includes("Menyimpan")],
  ["css lang-btn + redup", css.includes(".icon-btn.lang-btn") && css.includes(".lang-tag .off")],
];
let fail = 0;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`), ok || fail++;
process.exit(fail ? 1 : 0);
