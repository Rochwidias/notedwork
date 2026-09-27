# notedwork APK Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bungkus `https://notedwork.vercel.app` jadi APK debug sideload yang tinggal di `D:\project-app\notedwork.app\apk\`, bisa di-install di AVD dan dibuka offline sebagai mode baca lokal.

**Architecture:** Folder `apk\` standalone berisi `package.json` + `capacitor.config.ts` dengan `server.url` ke URL live (bukan bundel statis — OAuth + cookie httpOnly butuh server). `npx cap add android` dijalankan DI dalam `apk\` sehingga native project lahir sebagai `apk\android\`. Repo web `C:\Project\notedwork` TIDAK disentuh di plan ini.

**Tech Stack:** Node 24 (terpasang v24.19.0), Capacitor 7 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android` versi sama), Android SDK di `C:\Users\ASUS\AppData\Local\Android\Sdk`, Java dari `D:\android.studio\jbr`, Gradle wrapper bawaan scaffold.

**Spec:** `C:\Project\notedwork\docs\superpowers\specs\2026-09-26-notedwork-apk-design.md`

## Global Constraints

- JANGAN ubah `C:\Project\notedwork` (repo web) — tanpa kecuali di plan ini.
- JANGAN ubah `D:\project-app\notedwork.app\Main.kt`, `jalan.bat`, `notedwork.jar` (CLI lama biarin jalan).
- Semua file baru/barang build tinggal di `D:\project-app\notedwork.app\apk\`.
- `server.cleartext` tetap `false`; tidak ada pelonggaran security (CSP/cookie milik web, tak tersentuh).
- `apk\` bukan git repo — tidak ada commit untuk Task 1–3; yang di-commit hanya spec + plan ini di repo `C:\Project\notedwork`.
- Tiap task berakhir dengan deliverable yang bisa dites independen.

## Review Focus

- Buka pertama kali TANPA internet (cache kosong) → yang diharapkan: halaman fallback rapi, bukan putih polos. (Diuji manual Task 3, step AVD-offline.)
- Login Google dibuka di WebView dalam → yang diharapkan: Google menolak (403) — JANGAN dianggap bug wrapper; solusinya (Custom Tab) butuh ubahan web = follow-up plan, bukan plan ini.
- Tombol back Android → yang diharapkan: kembali di history web, bukan langsung tutup app. (Cek manual Task 3.)
- Deploy baru web saat app dibuka dari cache → yang diharapkan: HTML terbaru diambil (network-first milik `sw.js` web, tak tersentuh plan ini).
- Session Supabase kedaluwarsa → yang diharapkan: app tetap kebuka (shell + data lokal), sync gagal jujur. (Perilaku web eksisting, tak diubah plan ini.)

---

### Task 1: Scaffold folder wrapper + config Capacitor

**Files:**
- Create: `D:\project-app\notedwork.app\apk\package.json`
- Create: `D:\project-app\notedwork.app\apk\capacitor.config.ts`
- Create: `D:\project-app\notedwork.app\apk\www\index.html`
- Create: `D:\project-app\notedwork.app\apk\check-config.mjs`
- Test: `D:\project-app\notedwork.app\apk\check-config.mjs` (self-check gaya `tests/repro-*.mjs` repo web)

**Interfaces:**
- Consumes: nothing (task pertama).
- Produces: `capacitor.config.ts` mengekspor `CapacitorConfig` dengan `appId "app.notedwork"`, `appName "notedwork"`, `webDir "www"`, `server.url "https://notedwork.vercel.app"`, `server.cleartext false` — dipakai Task 2 (`npx cap add android` membaca config ini).

- [ ] **Step 1: Tulis `package.json`**

```json
{
  "name": "notedwork-apk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "check": "node check-config.mjs"
  },
  "dependencies": {
    "@capacitor/android": "^7.4.0",
    "@capacitor/cli": "^7.4.0",
    "@capacitor/core": "^7.4.0"
  }
}
```

- [ ] **Step 2: Tulis `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.notedwork",
  appName: "notedwork",
  webDir: "www",
  server: {
    url: "https://notedwork.vercel.app",
    cleartext: false,
  },
};

export default config;
```

- [ ] **Step 3: Tulis `www/index.html` (fallback lokal; tak dipakai saat online karena `server.url` menang)**

```html
<!doctype html>
<html lang="id">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>notedwork</title>
  <body style="background:#0A0C10;color:#fff;font-family:sans-serif;text-align:center;padding-top:30vh">
    <h1>notedwork</h1>
    <p>Butuh koneksi pertama kali untuk memuat aplikasi.</p>
  </body>
</html>
```

- [ ] **Step 4: Tulis self-check `check-config.mjs`**

```js
import { existsSync, readFileSync } from "node:fs";

let code = 0;
const check = (name, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) code = 1;
};

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const cfg = readFileSync("capacitor.config.ts", "utf8");

check("dep @capacitor/core ada", !!pkg.dependencies?.["@capacitor/core"]);
check("dep @capacitor/cli ada", !!pkg.dependencies?.["@capacitor/cli"]);
check("dep @capacitor/android ada", !!pkg.dependencies?.["@capacitor/android"]);
check('appId "app.notedwork"', cfg.includes('"app.notedwork"'));
check('appName "notedwork"', cfg.includes('"notedwork"'));
check("server.url live Vercel", cfg.includes("https://notedwork.vercel.app"));
check("cleartext false", /cleartext:\s*false/.test(cfg));
check('webDir "www"', cfg.includes('"www"'));
check("www/index.html ada", existsSync("www/index.html"));

process.exit(code);
```

- [ ] **Step 5: Jalankan check, harapkan FAIL (file config belum dibaca tooling — yang penting skrip jalan)**

Run: `cd "D:\project-app\notedwork.app\apk" && node check-config.mjs`
Expected: semua PASS (file baru ditulis tangan agar lolos; FAIL di sini berarti typo — betulkan sebelum lanjut).

- [ ] **Step 6: `npm install` lalu ulang check**

Run: `cd "D:\project-app\notedwork.app\apk" && npm install && node check-config.mjs`
Expected: PASS semua + `node_modules/@capacitor/cli` ada. (`apk\` bukan git repo — tidak ada commit.)

---

### Task 2: Generate proyek Android (`cap add android`)

**Files:**
- Create: `D:\project-app\notedwork.app\apk\android\` (di-generate, bukan ditulis tangan)
- Create: `D:\project-app\notedwork.app\apk\check-android.mjs`
- Test: `D:\project-app\notedwork.app\apk\check-android.mjs`

**Interfaces:**
- Consumes: `capacitor.config.ts` dari Task 1 (appId, appName, server.url).
- Produces: `apk\android\` proyek Gradle dengan `applicationId "app.notedwork"` + permission INTERNET — dipakai Task 3 (`gradlew assembleDebug`).

- [ ] **Step 1: Tulis self-check `check-android.mjs` (dulu, sebelum generate — TDD)**

```js
import { existsSync, readFileSync } from "node:fs";

let code = 0;
const check = (name, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) code = 1;
};

check("android/ ada", existsSync("android"));
check("android/app/build.gradle ada", existsSync("android/app/build.gradle"));
check("AndroidManifest ada", existsSync("android/app/src/main/AndroidManifest.xml"));

const manifest = existsSync("android/app/src/main/AndroidManifest.xml")
  ? readFileSync("android/app/src/main/AndroidManifest.xml", "utf8")
  : "";
check("permission INTERNET", manifest.includes("android.permission.INTERNET"));

const gradle = existsSync("android/app/build.gradle")
  ? readFileSync("android/app/build.gradle", "utf8")
  : "";
check('applicationId "app.notedwork"', gradle.includes('"app.notedwork"'));

process.exit(code);
```

- [ ] **Step 2: Jalankan check, harapkan FAIL**

Run: `cd "D:\project-app\notedwork.app\apk" && node check-android.mjs`
Expected: FAIL (folder `android/` belum ada — ini penanda merah yang benar).

- [ ] **Step 3: Generate (minimal, tanpa edit manual hasil generate)**

Run: `cd "D:\project-app\notedwork.app\apk" && npx cap add android`
Expected: selesai tanpa error, folder `android/` muncul.

- [ ] **Step 4: Jalankan check, harapkan PASS**

Run: `cd "D:\project-app\notedwork.app\apk" && node check-android.mjs`
Expected: PASS semua. Bila `applicationId` FAIL (template Capacitor kadang pakai `namespace` dari `android/variables.gradle`), baca file yang disebut error-nya, sesuaikan SATU baris check ke lokasi sebenarnya — jangan edit hasil generate.

- [ ] **Step 5: Verifikasi baca-manusia (tanpa ubah): buka `android/app/src/main/AndroidManifest.xml`, pastikan tak ada `usesCleartextTraffic="true"`**

Run: cari string `usesCleartextTraffic` di `apk\android\` — harapkan tidak ketemu.
(`apk\` bukan git repo — tidak ada commit.)

---

### Task 3: Build APK debug + smoke test di AVD

**Files:**
- Create: `D:\project-app\notedwork.app\apk\android\local.properties` (Lokal saja — berisi path SDK mesin ini, JANGAN disebar)
- Create: `D:\project-app\notedwork.app\apk\notedwork-debug.apk` (COPY dari output build — file yang dibagi via WA/GDrive)
- Test: manual checklist AVD di bawah (emulator tak bisa diassert skrip — checklist ini penggantinya)

**Interfaces:**
- Consumes: `apk\android\` dari Task 2.
- Produces: `apk\notedwork-debug.apk` siap bagi. Tak ada konsumen kode berikutnya.

- [ ] **Step 1: Tulis `local.properties` (SDK mesin ini, ditemukan 2026-09-26)**

```
sdk.dir=C\:\\Users\\ASUS\\AppData\\Local\\Android\\Sdk
```

(Catatan: garis miring ganda itu format Gradle yang benar, bukan typo.)

- [ ] **Step 2: Build APK debug**

Run:
```powershell
cd "D:\project-app\notedwork.app\apk\android"
$env:JAVA_HOME = "D:\android.studio\jbr"
.\gradlew assembleDebug
```
Expected: `BUILD SUCCESSFUL`, file lahir di `android\app\build\outputs\apk\debug\app-debug.apk`.

- [ ] **Step 3: Copy hasil build ke folder bagi**

Run:
```powershell
copy "D:\project-app\notedwork.app\apk\android\app\build\outputs\apk\debug\app-debug.apk" "D:\project-app\notedwork.app\apk\notedwork-debug.apk"
```
Expected: `notedwork-debug.apk` ada di `apk\` — INI file yang dibagi via WA/GDrive.

- [ ] **Step 4: Nyalakan AVD + install (satu perintah per baris, tunggu tiap baris selesai)**

```powershell
C:\Users\ASUS\AppData\Local\Android\Sdk\emulator\emulator.exe -list-avds
C:\Users\ASUS\AppData\Local\Android\Sdk\emulator\emulator.exe -avd "NAMA_AVD_DARI_BARIS_ATAS"
C:\Users\ASUS\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r "D:\project-app\notedwork.app\apk\notedwork-debug.apk"
```
Expected: `Success` di baris terakhir. (Ganti `NAMA_AVD_DARI_BARIS_ATAS` dengan nama asli — bukan placeholder, dibaca dari output baris 1.)

- [ ] **Step 5: Smoke checklist di AVD (centang satu-satu, manual)**

```
- [ ] Ikon "notedwork" muncul di drawer, dibuka full-screen (tanpa address bar)
- [ ] Halaman notedwork.vercel.app tampil + bisa login Google
- [ ] Tombol back Android kembali di history web (tidak langsung tutup)
- [ ] Matikan internet emulator (Extended controls → Cellular → Data status: Denied),
    buka ulang app → shell + data lokal tampil ATAU halaman fallback rapi (bukan putih polos)
- [ ] Nyalakan internet lagi → refresh → data segar
```

- [ ] **Step 6: Commit spec + plan (repo web — satu-satunya commit plan ini)**

```bash
git -C "C:/Project/notedwork" add docs/superpowers/specs/2026-09-26-notedwork-apk-design.md docs/superpowers/plans/2026-09-26-notedwork-apk.md
git -C "C:/Project/notedwork" commit -m "docs: spec + plan wrapper APK notedwork (Capacitor sideload)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```
(Dilakukan di branch aktif `feat/wizard-tanpa-review`; JANGAN push tanpa diminta.)

---

## Follow-up (BUKAN plan ini — plan terpisah setelah APK jalan)

- **Web readiness** (`sw.js` fallback offline rapi + banner "mode offline" di `NotedworkApp.tsx`/`remote.ts`): ubah repo web, ikut gaya `tests/repro-*.mjs` + `npm test`. Itu plan tersendiri.
- **Login via Custom Tab** (`@capacitor/browser` + ubahan web): bila login Google 403 di WebView dalam.
- **Rilis**: Play Store ($25, AAB + signing), ikon/splash final, versioning `versionCode`.
