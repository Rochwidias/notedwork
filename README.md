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

- 🏠 Dashboard — sapaan, prioritas tugas, 3 stat, email terbaru, tugas mendesak, agenda
- ✉️ Email — filter Semua / Belum dibaca / ★ / Arsip / Sampah + label, search, balas/teruskan/bintang/arsip/hapus
- 📝 Tugas — filter Semua / Aktif / Telat / Selesai, badge deadline, tambah/hapus/selesai
- 📅 Kalender — grid bulanan, dot rutin/agenda/deadline, agenda per tanggal, jadwal rutin mingguan
- 👤 Profil — pengaturan tema & notif, reset data, tentang
- 🔌 MCP — halaman rencana integrasi (belum aktif)
- 🌙 Tema gelap (default) / terang, tersimpan di `localStorage`
- 📲 PWA — manifest + service worker, bisa Add to Home Screen

Data v1 lokal di perangkat (`localStorage` key `rocha.*`), tanpa backend.

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
│   ├── TopBar.tsx         # Header + toggle tema + avatar
│   ├── AppNav.tsx         # Sidebar (desktop) + TabBar (mobile) + FAB
│   ├── Dashboard.tsx      # Ringkasan
│   ├── EmailView.tsx      # Daftar + detail email
│   ├── TasksView.tsx      # Daftar tugas
│   ├── CalendarView.tsx   # Kalender + agenda + rutin
│   ├── ProfileView.tsx    # Profil + pengaturan + reset
│   ├── McpView.tsx        # Rencana MCP
│   └── Sheets.tsx         # Sheet jadwal / email / tugas / rutin
├── lib/
│   ├── types.ts           # Tipe Mail/Sched/Routine/Task
│   ├── data.ts            # Data contoh + seed + LS keys
│   ├── dates.ts           # Helper tanggal + badge
│   └── store.ts           # Hook useLocalStorage
└── public/
    ├── icon.svg           # Ikon R flat cyan
    ├── manifest.webmanifest
    └── sw.js              # Service worker app-shell
```

---

## 🔐 Catatan

- Token OAuth **jangan** taruh di client. Kalau nanti sambung Gmail, taruh di server (`/api/*`).
- `dataProvider` di preview diganti prop/state React di `RochaApp` — satu pintu data tetap dijaga.

---

## 📄 Lisensi

Proyek pribadi © **Rochwidias**.
