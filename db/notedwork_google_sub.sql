-- notedwork V4: identitas stabil — kolom google_sub + rename aman (ON UPDATE CASCADE).
-- Jalankan di Supabase Dashboard → SQL Editor. Idempotent (aman dijalankan ulang).

-- 1. Kolom google_sub (nullable agar baris lama tak gagal; diisi saat login berikutnya).
ALTER TABLE notedwork_google_tokens
  ADD COLUMN IF NOT EXISTS google_sub TEXT;

-- 2. Unique parsial agar satu akun Google tak bisa menempati dua baris email.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notedwork_google_tokens_sub
  ON notedwork_google_tokens(google_sub) WHERE google_sub IS NOT NULL;

-- 3. FK sesi ikut pindah saat email primer diganti (rename PK user_id).
ALTER TABLE notedwork_sessions
  DROP CONSTRAINT IF EXISTS notedwork_sessions_user_id_fkey;
ALTER TABLE notedwork_sessions
  ADD CONSTRAINT notedwork_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES notedwork_google_tokens(user_id)
  ON UPDATE CASCADE ON DELETE CASCADE;
