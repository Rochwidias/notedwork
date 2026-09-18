import { readFileSync } from "node:fs";
const nav = readFileSync("components/AppNav.tsx", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const notesView = readFileSync("components/NotesView.tsx", "utf8");
const checks = [
  ["tab settings keenam", /id:\s*"settings"/.test(nav) && nav.includes('labelKey: "nav.settings"')],
  ["tanpa profil di nav", !/id:\s*"profil"/.test(nav)],
  ["ViewName settings", types.includes('"settings"') && !types.includes('"profil"')],
  ["sidebar via t()", nav.includes('t("nav.menu"') || nav.includes("t('nav.menu'")],
  ["notes gear ke settings", notesView.includes("onOpenSettings") && notesView.includes("IconGear") && notesView.includes('t("notes.settings")')],
  ["notes gear wiring", readFileSync("components/NotedworkApp.tsx", "utf8").includes('go("settings")') && readFileSync("components/NotedworkApp.tsx", "utf8").includes("onOpenSettings")],
];
let fail = 0;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`), ok || fail++;
process.exit(fail ? 1 : 0);
