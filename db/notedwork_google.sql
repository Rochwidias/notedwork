-- notedwork Google integration — jalankan di Supabase Dashboard → SQL Editor.
-- Token terenkripsi (AES-GCM) di app layer; RLS deny_all, akses via service_role.

CREATE TABLE IF NOT EXISTS notedwork_google_tokens (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_ms BIGINT NOT NULL,
    scope TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notedwork_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES notedwork_google_tokens(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notedwork_sessions_user ON notedwork_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_notedwork_sessions_expires ON notedwork_sessions(expires_at);

ALTER TABLE notedwork_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notedwork_sessions ENABLE ROW LEVEL SECURITY;

-- Deny_all: tidak ada policy → anon/authenticated tidak bisa baca/tulis.
-- Service_role melewati RLS, dipakai server via SUPABASE_SERVICE_ROLE_KEY_NOTEDWORK.
