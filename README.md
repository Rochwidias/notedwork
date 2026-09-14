<div align="center">

# 📝 notedwork — Rocha

**Dashboard email & jadwal kuliah mahasiswa. Rewrite React dari preview `index.html`.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

**🔗 Live: [notedwork.vercel.app](https://notedwork.vercel.app)**

</div>

---

## ✨ Fitur (parity dengan preview)

- 🏠 Dashboard — sapaan akun, prioritas tugas, 3 stat, email terbaru, tugas mendesak, agenda
- ✉️ Email — Gmail asli via OAuth (list/search 50 per halaman, balas/teruskan/bintang/arsip)
- 📝 Tugas — milik sendiri per akun, mulai kosong (filter Semua / Aktif / Telat / Selesai)
- 📅 Kalender — Google Calendar asli + jadwal rutin mingguan milik sendiri
- 👤 Profil — akun Google yang tersambung, pengaturan tema & notif, keluar
- 🔌 Koneksi Google — status OAuth, login/logout
- 🌙 Tema gelap (default) / terang, tersimpan di `localStorage`
- 📲 PWA — manifest + service worker, bisa Add to Home Screen

🔒 Wajib login Google — sebelum login semua view kosong + ajakan login.
Tanpa data contoh di bundle. Token OAuth terenkripsi di server (Supabase).

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

Tidak perlu `.env` untuk v1 (tidak ada secret).

---

## 📁 Struktur Project

```
├── app/
│   ├── layout.tsx         # RootLayout + font + metadata + viewport
│   ├── globals.css        # Tailwind + design token Rocha (flat, tanpa gradient)
│   ├── page.tsx           # Entry → <RochaApp/>
│   ├── loading.tsx        # Loading spinner
│   ├── not-found.tsx      # 404
│   ├── icon.tsx           # Favicon R flat cyan
│   ├── apple-icon.tsx     # Apple touch icon flat cyan
│   ├── manifest.ts        # PWA manifest
│   ├── robots.ts          # robots + sitemap ref
│   ├── sitemap.ts         # sitemap (/)
│   └── api/health/        # GET health check
├── components/
│   ├── RochaApp.tsx       # Shell + state + navigasi + toast
│   ├── ThemeProvider.tsx  # Tema data-theme + localStorage rocha.theme
│   ├── TopBar.tsx         # Header + toggle tema + avatar akun
│   ├── AppNav.tsx         # Sidebar (desktop) + TabBar (mobile) + FAB
│   ├── Dashboard.tsx      # Ringkasan akun
│   ├── EmailView.tsx      # Daftar + detail Gmail
│   ├── TasksView.tsx      # Daftar tugas milik sendiri
│   ├── CalendarView.tsx   # Kalender + agenda + rutin
│   ├── ProfileView.tsx    # Profil akun + pengaturan
│   ├── GoogleConnect.tsx  # Status koneksi Google + login/logout
│   ├── LoginGate.tsx      # Empty-state ajakan login
│   └── Sheets.tsx         # Sheet jadwal / email / tugas / rutin
├── lib/
│   ├── types.ts           # Tipe Mail/Sched/Routine/Task
│   ├── data.ts            # LS keys + cleanup data lama
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
    ├── icon.svg           # Ikon R flat cyan
    ├── manifest.webmanifest
    └── sw.js              # Service worker app-shell
```

---

## 🔐 Catatan

- Token OAuth hanya di server (`/api/*`, terenkripsi AES-GCM di Supabase) — tidak pernah ke client.
- Tugas & rutin milik masing-masing akun (`rocha.tasks:<email>`, `rocha.routine:<email>`) — mulai kosong.
- Pengunjung dengan data contoh era lama otomatis dibersihkan sekali (`rocha.v2cleaned`).
- Butuh env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` (base64 32 byte),
  `SUPABASE_URL_NOTEDWORK`, `SUPABASE_SERVICE_ROLE_KEY_NOTEDWORK`, `APP_URL`. Lihat `.env.example`.

---

## 📄 Lisensi

Proyek pribadi © **Rochwidias**.
