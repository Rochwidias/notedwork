# Spec: Integrasi Google (Gmail + Calendar) — notedwork / Rocha v2

Tanggal: 2026-09-14. Status: disetujui user, siap implementasi.

## 1. Ringkasan keputusan (hasil brainstorming)

- Transport: Google OAuth 2.0 + REST langsung (tanpa MCP server eksternal). Halaman "MCP" diganti jadi "Koneksi Google" yang beneran jalan.
- Login: tiap pengunjung pakai akun Google-nya sendiri, sekali klik "Login Google".
- Scope v1: baca + tulis penuh (kirim/balas email, tambah/hapus event kalender).
- Token: terenkripsi (AES-GCM, key `GOOGLE_TOKEN_KEY`) di Supabase `notedwork_google_tokens`, RLS deny_all, akses via service_role di server.
- Session: httpOnly cookie (bukan localStorage — anti XSS).
- Refresh: proaktif (refresh jika sisa < 5 menit). Gagal refresh → putus + suruh login ulang (tanpa retry).
- OAuth: Authorization Code + PKCE + state anti-CSRF wajib.
- Scope Google sekaligus di awal: gmail.readonly, gmail.send, gmail.modify, calendar.readonly, calendar.events.
- Email: 50 terbaru + tombol "Muat lagi" (pageToken). Kirim teks saja (tanpa lampiran di v1). Hapus = arsip (remove INBOX), tanpa hapus permanen.
- Kalender: primary saja. Tugas tetap lokal (tanpa Classroom API).
- Login → Email + jadwal/agenda ganti total ke data Google (contoh/lokal disembunyikan). Logout/putus → balik ke lokal.
- Sync diam-diam tiap buka tab + teks kecil status ("Terhubung sebagai x • diperbarui HH:MM").
- Biaya: Rp 0 (Google gratis, Supabase free tier, Vercel free tier).

## 2. Arsitektur

Browser → Next.js Route Handlers (`/api/auth/*`, `/api/gmail/*`, `/api/calendar/*`) → Google APIs.
Token & session di Supabase. Browser tidak pernah pegang token Google.

## 3. Env (server-only, via Vercel env + `.env.local` dev)

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` (32 byte base64),
`SUPABASE_URL_NOTEDWORK`, `SUPABASE_SERVICE_ROLE_KEY_NOTEDWORK`, `APP_URL`.
`.env.example` diupdate tanpa nilai asli.

## 4. Database (Supabase SQL)

- `notedwork_google_tokens` (user_id PK text, email, access_token, refresh_token, expiry_ms bigint, scope, updated_at) + RLS deny_all.
- `notedwork_sessions` (id PK text session acak, user_id, created_at, expires_at).
- Service_role key hanya di server.

## 5. File yang dibuat/diubah

- Baru: `lib/google.ts` (OAuth URL, tukar code, refresh, fetch wrapper + refresh proaktif),
  `lib/session.ts` (session cookie httpOnly + Supabase), `lib/crypto.ts` (AES-GCM),
  `lib/supabaseAdmin.ts` (service_role client), `app/api/auth/login|callback|logout|status/route.ts`,
  `app/api/gmail/list|detail|send|label/route.ts`, `app/api/calendar/events/route.ts`
  (+ `app/api/calendar/events/[id]/route.ts`), `components/GoogleConnect.tsx`,
  `db/notedwork_google.sql`, docs ini.
- Ubah: `components/McpView.tsx` → status koneksi beneran + tombol login/logout,
  `components/EmailView.tsx` (sumber data remote + muat lagi), `components/CalendarView.tsx`
  (event Google), `components/RochaApp.tsx` (state connected + fallback lokal),
  `.env.example`, `package.json` (tanpa dep baru — pakai fetch + WebCrypto bawaan).

## 6. Verifikasi

`npx tsc --noEmit`, `npm run lint`, Grep "TODO(MCP)" tersisa, test manual:
login → email/jadwal asli tampil → kirim/balas → tambah/hapus jadwal →
logout → balik lokal → revoke di Google → status putus + banner login ulang.
