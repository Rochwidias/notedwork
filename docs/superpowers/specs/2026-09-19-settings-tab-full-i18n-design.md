# Design: Tab Pengaturan + Translate Full ID/EN

Tanggal: 2026-09-19. Status: disetujui pemilik (4 bagian, pendekatan A sekali jalan).

## Latar & tujuan

1. Mode bahasa (ID/EN) sekarang cuma mencakup TopBar, Catatan, sheet Tambah & Note.
   Target: **semua page** ikut translate — 5 view lama + Pengaturan, semua sheet form,
   toast, nama hari/bulan, dan teks legal (Kredit/Privasi/Syarat).
2. Halaman Profil diganti **halaman Pengaturan** sebagai **tab keenam** navigasi
   (sidebar desktop + tabbar HP), berisi pindahan isi Profil: login Google, galeri
   tema/warna, notifikasi, koneksi, Info, Tentang.
3. Tombol gear ⚙ di sebelah tombol **+ Tambah** di halaman Catatan → lompat ke Pengaturan.

Keputusan pemilik (Q&A brainstorming): halaman Pengaturan baru (bukan reuse Profil),
tab keenam (bukan view tersembunyi), Profil diganti total, legal ikut diterjemahkan EN,
pendekatan A (sekali jalan, satu implementasi).

## Bagian 1 — Navigasi & rute Pengaturan

- `lib/types.ts`: `ViewName` `"profil"` rename → `"settings"`. Tanpa alias ganda.
- `components/ProfileView.tsx` → `components/SettingsView.tsx`: pindah seluruh isi
  (Akun/login, Galeri Tema + warna, notifikasi, koneksi, Info, Tentang).
  Section id `v-profil` → `v-settings`. Komponen di-rename `SettingsView`.
- `components/AppNav.tsx`: `MAIN_TABS` tambah `{ id: "settings", Icon: IconGear,
  labelKey: "nav.settings" }` sebagai tab keenam. Icon-only di HP otomatis via CSS
  `.tabbar .tab .lbl{display:none}` yang sudah ada; sidebar desktop tampil label teks.
  Estimasi muat: 6 ikon × ~60px pada viewport 360px (sebelumnya 5 × 69px).
- `components/TopBar.tsx`: avatar `onProfile` → buka Settings. Key `topbar.profile`
  → `topbar.settings` ("Pengaturan" / "Settings").
- `components/NotedworkApp.tsx`: semua `go("profil")` / `view === "profil"` → `"settings"`.
- Key baru: `nav.settings` ("Pengaturan" / "Settings").

## Bagian 2 — Tombol gear di halaman Catatan

- `components/NotesView.tsx`: tambah `icon-btn` `IconGear` di `.view-head`, di sebelah
  tombol `+ Tambah`. Prop baru `onOpenSettings: () => void` (pola sama seperti
  `onAdd`/`onEdit` — tanpa import silang), diisi `() => go("settings")` dari
  `NotedworkApp`.
- Aksesibilitas: `title` + `aria-label` dari key baru `notes.settings`
  ("Pengaturan" / "Settings") — ikut translate.
- Styling: pakai class `icon-btn` yang sudah ada di `app/globals.css`; tanpa CSS baru
  yang berat.

## Bagian 3 — Cakupan translate full

Pola: tiap view/sheet ambil `t` lewat hook `useLang()` langsung (semua komponen client
di dalam `LangProvider`). `NotesView` yang oper `t` via props dibiarkan apa adanya.
`t()` fallback ke ID bila key EN belum ada — tidak ada teks kosong selama pengerjaan.

| Area | File | Key group |
|---|---|---|
| Hari Ini (sapaan, strip hari, pengingat, email penting) | `components/HariIni.tsx` | `home.*` |
| Email (judul, cari, kosong, status) | `components/EmailView.tsx` | `email.*` |
| Tugas (judul, kosong, aksi) | `components/TasksView.tsx` | `tasks.*` |
| Kalender (judul, hari/bulan, kosong) | `components/CalendarView.tsx` | `cal.*` |
| Pengaturan (ex-Profil: akun, tema, warna, notif, koneksi, info, tentang) | `components/SettingsView.tsx` | `settings.*` |
| Sheet Jadwal/Tugas/Email/Rutin (label, placeholder, validasi, tombol) | `components/Sheets.tsx` | `sched.*`, `task.*`, `mail.*`, `routine.*` |
| Sheet Info (judul Kredit/Privasi/Syarat + tombol Buka) | `components/Sheets.tsx` | `info.*` |
| Toast & string lain di shell | `components/NotedworkApp.tsx` | `toast.*` |
| Nama hari & bulan | `lib/dates.ts` | helper `dayNames(lang)`, `monthNames(lang)` (array sudah di file ini; tanpa key i18n baru) |
| Isi legal Kredit/Privasi/Syarat versi EN | `lib/legal.ts` | konten EN penuh |

- Estimasi ~100–130 key baru; parity ID=EN wajib, dicek otomatis oleh repro test.
- Non-goal (YAGNI): plural rules, format tanggal locale penuh, restrukturisasi i18n
  ke nested object, fitur pengaturan baru di luar pindahan Profil.

## Bagian 4 — Testing & rollout

- Repro test baru `tests/repro-settings-i18n.mjs`, didaftarkan di `npm test`:
  (a) parity key ID=EN; (b) tab keenam settings render + gear di Catatan render +
  aria-label benar; (c) scan sisa hardcode Indonesia saat mode EN pada view/sheet
  yang sudah dicakup.
- Verifikasi standar: `npm test` PASS, `tsc` clean, `eslint` tanpa issue baru.
- Cek visual Playwright: tiap tab (6) + sheet form dalam mode EN lalu balik ID,
  0 console error, screenshot arsip di `.playwright-mcp/`.
- Rollout: satu commit `feat(settings,i18n): tab Pengaturan + translate full`,
  push `main` → Vercel auto-deploy. Tanpa perubahan API/env — deploy aman.

## Risiko & mitigasi

- Tabbar HP 6 ikon sempit → sudah icon-only; verifikasi visual 360px wajib.
- Rename `profil` → `settings` menyentuh banyak file → grep semua referensi
  (`profil`, `Profile`, `onProfile`, `v-profil`) sebelum/sesudah; `tsc` menangkap sisa.
- Terjemahan legal EN ditulis manual → review pemilik pada spec/plan; isi ID tidak diubah.
