# notedwork → APK (sideload, via Capacitor) — Design Spec

Tanggal: 2026-09-26
Status: disetujui user 2026-09-26 ("gas") — lanjut ke implementation plan
Repo web: `C:\Project\notedwork` (Next.js 16 + React 19 + Supabase + Tailwind)
Live URL: `https://notedwork.vercel.app`
Target: APK debug sideload (bagi via WA/GDrive), diuji di AVD Android Studio (`D:\android.studio`)
Wrapper (baju Android): `D:\project-app\notedwork.app\apk\` — subfolder BARU, dibedakan dari
repo web (`C:\Project\notedwork`) dan dari CLI lama (`Main.kt` / `jalan.bat` / `notedwork.jar`
di `D:\project-app\notedwork.app\` — jangan diutak-atik, biarin jalan seperti sekarang).

## 1. Tujuan & batasan

- Tujuan: web notedwork (dashboard Email & Jadwal Mahasiswa, login Google) bisa di-install
  sebagai APK Android tanpa daftar Play Store ($25).
- Bukan tujuan (eksplisit di luar scope): publish Play Store, offline penuh,
  push notification native, tulis ulang native Kotlin/Compose.
- Prinsip malas: web tetap jalan online di Vercel; APK cuma "baju" full-screen.
  Update isi web (tampilan/fitur/bug) otomatis kecermin di APK tanpa build ulang.
  Build APK ulang hanya bila yang berubah: nama app, ikon launcher, splash, permission.

## 2. Arsitektur: "baju online, isi cache lokal"

- Wrapper: Capacitor — `capacitor.config.ts` dengan `server.url = https://notedwork.vercel.app`
  (bukan bundel statis; `next export` ditolak karena OAuth callback + cookie httpOnly butuh server).
- Offline = mode baca lokal, bukan offline penuh:
  - `public/sw.js` (network-first HTML, stale-while-revalidate aset) → app shell tetap kebuka.
  - `localStorage` di `components/NotedworkApp.tsx` (jadwal/tugas/catatan) → data lokal kebaca offline.
  - Online-only: login Google, Gmail, Calendar, sync Drive, session Supabase (butuh server).

## 3. Komponen: hanya 3 yang disentuh

1. Wrapper standalone di `D:\project-app\notedwork.app\apk\` (folder BARU, repo web tak disentuh):
   `package.json` + `capacitor.config.ts` dengan `appId: app.notedwork`,
   `appName: notedwork`, `server.url = https://notedwork.vercel.app`,
   `server.cleartext: false`. `npx cap add android` dijalankan DI folder `apk\`
   sehingga hasilnya `apk\android\` — bukan di dalam repo web.
2. `public/sw.js` (UBAH kecil): tambah fallback offline rapi. Sekarang fallback cuma
   `caches.match("/")` yang bisa tampil polos tanpa CSS bila HTML basi (kasus deploy baru).
3. `components/NotedworkApp.tsx` + `lib/remote.ts` (UBAH kecil): status online/offline jujur —
   banner "mode offline", tombol sync Gmail/Calendar/Drive disabled saat `NOT_CONNECTED`,
   data lokal tetap bisa diedit.

## 4. Data flow

- Online: buka app → SW ambil HTML terbaru (network-first) → React mount →
  `remote.ts` fetch `/api/*` → data segar → localStorage ke-refresh.
- Offline: SW sajikan cache → React mount dari cache → fetch `/api/*` gagal →
  `NOT_CONNECTED` → tampil data localStorage terakhir + banner offline.
- Internet balik: refresh / buka ulang → otomatis segar (tak perlu install ulang).

## 5. Error handling (3 kasus)

1. Buka pertama kali TANPA internet (cache kosong): halaman offline rapi, bukan putih polos.
2. Login Google diblok bila di WebView dalam (403 Google): OAuth dibuka via browser sistem
   (Custom Tab), bukan WebView dalam.
3. Session Supabase kedaluwarsa saat offline: tetap baca lokal, sync ditunda sampai online.

## 6. Security notes (eksisting, jangan dilonggarkan)

- CSP di `next.config.ts`, `X-Frame-Options: DENY`, session cookie httpOnly + Supabase —
  semua tetap. Wrapper tak boleh minta `cleartext` / melonggarkan CSP.
- `redirectUri()` di `lib/google.ts` memakai `APP_URL` → pastikan tetap
  `https://notedwork.vercel.app/api/auth/callback` (tak berubah oleh wrapper).

## 7. Testing (tanpa build dulu → build belakangan)

1. Chrome desktop: DevTools → Network → Offline → reload → data lokal kebuka + banner muncul.
2. Online kembali → refresh → data segar.
3. Baru setelah user confirm: `npx cap add android` dengan output ke
   `D:\project-app\notedwork.app\apk\` → buka di Android Studio →
   Build APK debug → install di AVD → cek ikon, splash, tombol back, login via Custom Tab.

## 8. Upgrade path (ponytail)

- Ceiling saat ini: 1 wrapper, 1 URL live, sideload manual.
- Upgrade bila perlu: Play Store ($25, TWA/AAB + signing), push native
  (@capacitor/push-notifications), offline tulis-penuh (antrean sync di `remote.ts`).
