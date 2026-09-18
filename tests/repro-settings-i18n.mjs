import { readFileSync } from "node:fs";
const nav = readFileSync("components/AppNav.tsx", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const notesView = readFileSync("components/NotesView.tsx", "utf8");
const dates = readFileSync("lib/dates.ts", "utf8");
const hari = readFileSync("components/HariIni.tsx", "utf8");
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
];
let fail = 0;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`), ok || fail++;
process.exit(fail ? 1 : 0);
