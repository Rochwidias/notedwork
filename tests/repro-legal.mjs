// RED test (TDD): halaman legal publik + baris hak cipta.
// Harus GAGAL sebelum implementasi, PASS sesudahnya.
import { readFileSync } from "node:fs";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); failures++; }
}

function tryRead(url) {
  try {
    return readFileSync(new URL(url, import.meta.url), "utf8");
  } catch {
    return null;
  }
}

const privasi = tryRead("../app/privasi/page.tsx");
const syarat = tryRead("../app/syarat/page.tsx");
const settings = tryRead("../components/SettingsView.tsx") ?? "";
const i18n = tryRead("../lib/i18n.ts") ?? "";
const sitemap = tryRead("../app/sitemap.ts") ?? "";
const robots = tryRead("../app/robots.ts") ?? "";

// 1. Route publik /privasi dari LEGAL (bukan hardcode bebas).
check("app/privasi/page.tsx ada", privasi != null, "file tidak ada");
check(
  "privasi render dari LEGAL.privacy",
  !!privasi && /LEGAL/.test(privasi) && /privacy/.test(privasi),
  "tidak render dari LEGAL.privacy"
);
check(
  "privasi publik (tanpa cek sesi)",
  !!privasi && !/getSessionUser|NOT_CONNECTED/.test(privasi),
  "ada auth check di halaman publik"
);
check(
  "privasi export metadata",
  !!privasi && /export const metadata|generateMetadata/.test(privasi),
  "tanpa metadata"
);

// 2. Route publik /syarat.
check("app/syarat/page.tsx ada", syarat != null, "file tidak ada");
check(
  "syarat render dari LEGAL.terms",
  !!syarat && /LEGAL/.test(syarat) && /terms/.test(syarat),
  "tidak render dari LEGAL.terms"
);

// 3. Baris © di Pengaturan → Tentang.
check(
  "SettingsView: render settings.copyright",
  /settings\.copyright/.test(settings),
  "tidak ada settings.copyright di SettingsView"
);
check(
  "i18n: settings.copyright ID+EN",
  /"settings\.copyright"/.test(i18n),
  "key settings.copyright belum ada"
);

// 4. Sitemap + robots.
check(
  "sitemap: ada /privasi + /syarat",
  sitemap.includes("/privasi") && sitemap.includes("/syarat"),
  "sitemap belum mencakup halaman legal"
);
check(
  "robots: tidak blokir /privasi",
  !/Disallow.*privasi/.test(robots),
  "robots memblokir /privasi"
);

console.log(failures ? `\n${failures} check(s) FAILED (fitur belum ada)` : "\nSemua checks PASS");
process.exit(failures ? 1 : 0);
