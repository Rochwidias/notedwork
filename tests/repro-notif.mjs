import { readFileSync } from "node:fs";

const fail = (name) => (console.log(`FAIL ${name}`), 1);
const pass = (name) => (console.log(`PASS ${name}`), 0);
let code = 0;
const check = (name, ok) => (code |= (ok ? pass(name) : fail(name)));

const i18n = readFileSync("lib/i18n.ts", "utf8");
const app = readFileSync("components/NotedworkApp.tsx", "utf8");
const settings = readFileSync("components/SettingsView.tsx", "utf8");

// 1. Jalur tembak notifikasi terekstrak & dipakai dua arah
check("fireReminderAlert ada", app.includes("fireReminderAlert"));
check("tick interval pakai fireReminderAlert", /dueReminders[\s\S]{0,800}fireReminderAlert|fireReminderAlert[\s\S]{0,200}dueReminders/.test(app) && app.includes("setInterval"));
check("test path pakai fireReminderAlert", app.includes("testNotif") || app.includes("onTestNotif"));

// 2. SettingsView: tombol Tes + prop
check("SettingsView prop onTestNotif", settings.includes("onTestNotif"));
check("SettingsView tombol tes", settings.includes("settings.testNotif"));
check("App teruskan onTestNotif", app.includes("onTestNotif"));

// 3. i18n id+en
for (const k of ["settings.testNotif", "settings.testNotifSample"])
  check(`i18n punya ${k} (id+en)`, i18n.includes(`"${k}"`) && i18n.indexOf(`"${k}"`) !== i18n.lastIndexOf(`"${k}"`));

process.exit(code);
