import { createClient } from "@supabase/supabase-js";

// Server-only: akses tabel notedwork_* yang RLS-nya deny_all.
// JANGAN pernah import file ini dari komponen client.
const supabaseUrl = process.env.SUPABASE_URL_NOTEDWORK;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_NOTEDWORK;

export const supabaseAdmin =
  supabaseUrl && supabaseKey && supabaseUrl.startsWith("http")
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;
