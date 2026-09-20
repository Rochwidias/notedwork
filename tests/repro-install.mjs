import { existsSync, readFileSync } from "node:fs";

const fail = (name) => (console.log(`FAIL ${name}`), 1);
const pass = (name) => (console.log(`PASS ${name}`), 0);
let code = 0;
const check = (name, ok) => (code |= (ok ? pass(name) : fail(name)));

const i18n = readFileSync("lib/i18n.ts", "utf8");
const sheets = readFileSync("components/Sheets.tsx", "utf8");
const app = readFileSync("components/NotedworkApp.tsx", "utf8");
const manifest = readFileSync("app/manifest.ts", "utf8");

// 1. i18n: namespace install.* harus ada & paritas id/en
const keysOf = (src, lang) => {
  const block = src.split(`${lang}: {`)[1]?.split("\n  },")[0] ?? "";
  return [...block.matchAll(/"(install\.[a-zA-Z0-9]+)"/g)].map((m) => m[1]).sort();
};
const idKeys = keysOf(i18n, "id");
const enKeys = keysOf(i18n, "en");
check("i18n install.* ada di id (>=15 key)", idKeys.length >= 15);
check(
  "i18n install.* paritas id/en",
  idKeys.length > 0 && JSON.stringify(idKeys) === JSON.stringify(enKeys)
);

// 2. Sheets.tsx: InstallSheet reuse Shell + 3 tab platform
check("Sheets exports InstallSheet", sheets.includes("export function InstallSheet"));
check("InstallSheet pakai Shell", /InstallSheet[\s\S]{0,600}Shell id="ovInstall"/.test(sheets));
for (const tab of ["android", "iphone", "laptop"])
  check(`InstallSheet tab ${tab}`, sheets.includes(`"${tab}"`) || sheets.includes(`'${tab}'`));

// 3. NotedworkApp: entry di bawah banner + auto-hide + sheet terpasang
check('SheetId kenal "install"', sheets.includes('"install"'));
check("entry install di bawah banner pratinjau", app.indexOf("banner.previewSub") < app.indexOf("install.entryTitle"));
check("capture beforeinstallprompt", app.includes("beforeinstallprompt"));
check("deteksi standalone (installed)", app.includes("display-mode: standalone"));
check("dismiss persist notedwork.installDismissed", app.includes("notedwork.installDismissed"));
check("InstallSheet dirender", app.includes("<InstallSheet"));
check("setSheet install dibuka", app.includes('setSheet("install")'));

// 4. Manifest + ikon installable
check("manifest icon 192", manifest.includes("192x192") && manifest.includes("icon-192"));
check("manifest icon 512", manifest.includes("512x512") && manifest.includes("icon-512"));
check("public/icon-192.png ada", existsSync("public/icon-192.png"));
check("public/icon-512.png ada", existsSync("public/icon-512.png"));

process.exit(code ? 1 : 0);
