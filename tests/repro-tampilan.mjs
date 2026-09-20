import { readFileSync } from "node:fs";

const fail = (name) => (console.log(`FAIL ${name}`), 1);
const pass = (name) => (console.log(`PASS ${name}`), 0);
let code = 0;
const check = (name, ok) => (code |= (ok ? pass(name) : fail(name)));

const i18n = readFileSync("lib/i18n.ts", "utf8");
const data = readFileSync("lib/data.ts", "utf8");
const theme = readFileSync("components/ThemeProvider.tsx", "utf8");
const settings = readFileSync("components/SettingsView.tsx", "utf8");

// 1. Kunci localStorage per mode (ikut pola ACCENT_KEY)
for (const k of ["INK_DARK_KEY", "INK_LIGHT_KEY", "BG_DARK_KEY", "BG_LIGHT_KEY"])
  check(`data.ts exports ${k}`, data.includes(`export const ${k}`));
check("kunci ink dark scoped notedwork.", data.includes("notedwork.inkDark"));
check("kunci ink light scoped notedwork.", data.includes("notedwork.inkLight"));
check("kunci bg dark scoped notedwork.", data.includes("notedwork.bgDark"));
check("kunci bg light scoped notedwork.", data.includes("notedwork.bgLight"));

// 2. ThemeProvider expose ink/bg + apply ke CSS vars
for (const fn of ["ink", "setInk", "bg", "setBg"])
  check(`ThemeProvider expose ${fn}`, theme.includes(fn));
check("apply --ink custom", theme.includes("--ink"));
check("--muted diturunkan dari ink", theme.includes("--muted") && theme.includes("color-mix"));
check("turunan --card dari bg custom", theme.includes("--card"));

// 3. SettingsView: row warna font + warna latar dinamis per mode
check("Settings row warna font", settings.includes("settings.fontColor"));
check("Settings row warna latar", settings.includes("settings.bgColor"));
check("label dinamis per mode", settings.includes("settings.forMode"));

// 4. i18n paritas id/en untuk key tampilan baru
for (const k of [
  "settings.fontColor",
  "settings.fontColorSub",
  "settings.bgColor",
  "settings.bgColorSub",
  "settings.forMode",
]) {
  const inId = i18n.includes(`"${k}"`);
  check(`i18n punya ${k} (id+en)`, inId && i18n.indexOf(`"${k}"`) !== i18n.lastIndexOf(`"${k}"`));
}

// 5. Preset selaras palet logo
check("preset font kertas logo", settings.includes("#F8FAFC") || theme.includes("#F8FAFC"));
check("preset bg navy logo", settings.includes("#0A0C10") || theme.includes("#0A0C10"));

process.exit(code);
