<div align="center">

# 📝 notedwork

**Dashboard email & jadwal kuliah mahasiswa. Coba tanpa login (mode pratinjau) atau hubungkan Google untuk data asli.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

**🔗 Live: [notedwork.vercel.app](https://notedwork.vercel.app)**

</div>

---

## ✨ Fitur

- 🏠 Dashboard — sapaan akun, prioritas tugas, 3 stat, email terbaru, tugas mendesak, agenda
- ✉️ Email — Gmail asli via OAuth (list/search 50 per halaman, balas/teruskan/bintang/arsip)
- 📝 Tugas — milik sendiri per akun (filter Semua / Aktif / Telat / Selesai)
- 📅 Kalender — Google Calendar asli + jadwal rutin mingguan milik sendiri
- 👤 Profil — akun Google/tamu, pengaturan tema + warna + notif, Kredit/Privasi/Syarat, keluar
- 🔌 Koneksi Google — status OAuth, login/logout
- 🌙 Tema gelap (default) / terang + warna aksen pilihan user, tersimpan di `localStorage`
- 📲 PWA — manifest + service worker, bisa Add to Home Screen

👀 Mode pratinjau — tanpa login semua tab bisa dibuka dengan data contoh berlabel jelas; tombol login tetap menonjol. Tugas/rutin tamu tersimpan lokal (`notedwork.tasks:preview`) dan terhapus saat keluar preview.
🔒 Login Google — ganti data contoh dengan Gmail & Kalender aslimu.
Token OAuth terenkripsi di server (Supabase).

---

## 🧰 Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS + CSS global (port dari preview) |
| **Font** | Poppins + JetBrains Mono via `next/font` |
| **PWA** | `app/manifest.ts` + `public/sw.js` |
| **Deploy** | Vercel |

---

## 🚀 Cara Menjalankan

```bash
# 1. Clone
git clone https://github.com/<username>/notedwork.git
cd notedwork

# 2. Install
npm install

# 3. Jalan lokal
npm run dev      # → http://localhost:3000
npm run build    # production build
npm run start    # jalankan production build
npm run lint     # cek lint
```

Tidak perlu `.env` untuk mode pratinjau (tanpa login). Untuk data Google asli, isi secret berikut.

---

## 📁 Struktur Project

```
├── app/
│   ├── layout.tsx         # RootLayout + font + metadata + viewport
│   ├── globals.css        # Tailwind + design token notedwork
│   ├── page.tsx           # Entry → <NotedworkApp/>
│   ├── loading.tsx        # Loading spinner
│   ├── not-found.tsx      # 404
│   ├── icon.tsx           # Favicon N (ikut warna default cyan)
│   ├── apple-icon.tsx     # Apple touch icon
│   ├── manifest.ts        # PWA manifest
│   ├── robots.ts          # robots + sitemap ref
│   ├── sitemap.ts         # sitemap (/)
│   └── api/               # Route handlers: auth/*, gmail/*, calendar/*, health
├── components/
│   ├── NotedworkApp.tsx   # Shell + state + navigasi + toast + preview
│   ├── ThemeProvider.tsx  # Tema data-theme + accent + localStorage notedwork.theme
│   ├── TopBar.tsx         # Header + toggle tema + avatar akun
│   ├── AppNav.tsx         # Sidebar (desktop) + TabBar (mobile) + FAB
│   ├── Dashboard.tsx      # Ringkasan akun
│   ├── EmailView.tsx      # Daftar + detail Gmail
│   ├── TasksView.tsx      # Daftar tugas milik sendiri
│   ├── CalendarView.tsx   # Kalender + agenda + rutin
│   ├── ProfileView.tsx    # Akun + pengaturan + Kredit/Privasi/Syarat
│   ├── GoogleConnect.tsx  # Status koneksi Google + login/logout
│   ├── LoginGate.tsx      # Ajakan login (+ tombol preview)
│   └── Sheets.tsx         # Sheet jadwal / email / tugas / rutin / info
├── lib/
│   ├── types.ts           # Tipe Mail/Sched/Routine/Task
│   ├── data.ts            # LS keys notedwork.* + migrasi rocha.* + kunci preview/accent
│   ├── preview.ts         # Data contoh mode pratinjau
│   ├── legal.ts           # Teks Kredit/Privasi/Syarat (ID)
│   ├── dates.ts           # Helper tanggal + badge
│   ├── store.ts           # Hook useLocalStorage
│   ├── session.ts         # Sesi cookie → user
│   ├── crypto.ts          # Enkripsi token (AES-GCM)
│   ├── google.ts          # OAuth + token Google
│   ├── gmail.ts           # API Gmail
│   ├── calendar.ts        # API Google Calendar
│   ├── remote.ts          # Client fetch /api/*
│   └── supabaseAdmin.ts   # Supabase server-only
└── public/
    ├── icon.svg           # Ikon N
    └── sw.js              # Service worker app-shell
```

---

## 🔐 Catatan

- Token OAuth hanya di server (`/api/*`, terenkripsi AES-GCM di Supabase) — tidak pernah ke client.
- Tugas & rutin milik masing-masing akun (`notedwork.tasks:<email>`, `notedwork.routine:<email>`) — mulai kosong; tamu preview pakai `notedwork.tasks:preview`.
- Kunci lama `rocha.*` otomatis dimigrasi sekali ke `notedwork.*` (`notedwork.v3migrated`).
- Butuh env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` (base64 32 byte),
  `SUPABASE_URL_NOTEDWORK`, `SUPABASE_SERVICE_ROLE_KEY_NOTEDWORK`, `APP_URL`. Lihat `.env.example`.

---

## 📄 Lisensi

Proyek pribadi © **Rochwidias**.
