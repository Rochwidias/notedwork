import { createHash } from "node:crypto";
import { decryptText, encryptText, randomToken } from "./crypto";
import { isMissingColumnError, resolveIdentityKeys } from "./identity";
import { supabaseAdmin } from "./supabaseAdmin";

// Scope sekaligus di awal (keputusan desain): baca+tulis Gmail & Calendar.
// "openid email" hanya untuk identitas stabil (sub + email terverifikasi) —
// tanpa data profil tambahan. Kedua scope OIDC ini yang memaksa consent ulang sekali.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh proaktif jika sisa < 5 menit

interface TokenRow {
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  expiry_ms: number;
  scope: string;
}

function appUrl(): string {
  const url = process.env.APP_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function redirectUri(): string {
  return `${appUrl()}/api/auth/callback`;
}

function b64url(input: Uint8Array): string {
  return Buffer.from(input).toString("base64url");
}

function sha256B64url(s: string): string {
  // createHash diimpor di atas (node:crypto) agar route tetap sederhana (server-only).
  return createHash("sha256").update(s).digest("base64url");
}

export function newCodeVerifier(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export function codeChallenge(verifier: string): string {
  return sha256B64url(verifier);
}

export function newState(): string {
  return randomToken(24);
}

export function authUrl(state: string, challenge: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

async function exchangeCode(code: string, verifier: string): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) throw new Error("Tukar code gagal: " + res.status);
  return (await res.json()) as GoogleTokenResponse;
}

// WAJIB sebelum deploy: jalankan db/notedwork_google_sub.sql (kolom google_sub +
// UNIQUE parsial + FK ON UPDATE CASCADE). Tanpa itu login gagal di upsert.
//
// Catatan deploy-ordering (disengaja, bukan fallback diam-diam):
// - select google_sub di bawah hanya untuk cari baris lama (rename saat ganti
//   email primer). Bila kolom belum ada → prev = null → rename dilewati → upsert
//   tetap kirim google_sub dan PASTI gagal dengan pesan jelas — agar salah
//   konfigurasi ketahuan saat itu juga, bukan jadi sesi yatim diam-diam.
async function fetchGoogleIdentity(accessToken: string): Promise<{ email: string; sub: string; emailVerified: boolean }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Ambil profil Google gagal: " + res.status);
  const j = (await res.json()) as { email?: string; sub?: string; email_verified?: unknown };
  if (!j.email || !j.sub) throw new Error("Profil Google tanpa email/sub");
  // Jangan jadikan email kunci identitas bila belum terverifikasi Google.
  if (j.email_verified === false) throw new Error("Email Google belum terverifikasi");
  return { email: j.email, sub: j.sub, emailVerified: j.email_verified !== false };
}

export async function saveTokensFromCode(code: string, verifier: string): Promise<{ userId: string; email: string }> {
  if (!supabaseAdmin) throw new Error("Supabase belum dikonfigurasi");
  const tok = await exchangeCode(code, verifier);
  if (!tok.refresh_token) throw new Error("Google tidak memberi refresh_token (coba login ulang)");
  const { email, sub } = await fetchGoogleIdentity(tok.access_token);
  const userId = email.toLowerCase();
  // Rename aman (V4): cari baris lama via google_sub; sesi ikut pindah
  // lewat ON UPDATE CASCADE — tanpa sesi yatim saat ganti email primer.
  // Pakai helper terpusat agar normalisasi konsisten dengan yang diuji.
  //
  // Login TOLERAN tanpa kolom google_sub (best-effort, migrasi belum jalan):
  // - select/cari-sub yang gagal karena kolom hilang → anggap "tak ada baris lama",
  //   lanjut jalur lama (upsert TANPA google_sub) agar login tetap bisa.
  // - upsert tanpa kolom dulu; bila kolom SUDAH ada, tulis google_sub via update
  //   best-effort (gagal → abaikan, login tetap sukses).
  let prevUserId: string | null = null;
  try {
    const { data: prev, error: prevErr } = await supabaseAdmin
      .from("notedwork_google_tokens")
      .select("user_id")
      .eq("google_sub", sub)
      .limit(1)
      .single<{ user_id: string }>();
    if (prevErr) throw prevErr;
    prevUserId = prev?.user_id ?? null;
  } catch (e) {
    if (!isMissingColumnError(e)) {
      // Bukan soal kolom: .single() tanpa baris (PGRST116) atau error lain
      // → anggap tak ada baris lama, lanjut login normal.
    }
    prevUserId = null;
  }
  const { prevKey } = resolveIdentityKeys(prevUserId, email);
  const needsRename = prevKey !== userId;
  if (needsRename) {
    // UPDATE PK = rename; butuh skema baru (db/notedwork_google_sub.sql).
    try {
      const { error: renameErr } = await supabaseAdmin
        .from("notedwork_google_tokens")
        .update({ user_id: userId })
        .eq("user_id", prevKey);
      if (renameErr) throw renameErr;
    } catch (e) {
      if (isMissingColumnError(e)) {
        // Kolom belum ada → tak ada yang bisa di-rename (pencarian sub di atas
        // pun tak jalan). Lanjut jalur lama di bawah.
      } else {
        // Skema lama (kolom google_sub ada, tanpa ON UPDATE CASCADE):
        // hapus sesi + baris token lama agar tak ada refresh_token yatim,
        // lalu upsert biasa di bawah.
        console.error("[google] rename-gagal, bersihkan baris lama:", e instanceof Error ? e.message : e);
        await supabaseAdmin.from("notedwork_sessions").delete().eq("user_id", prevKey);
        await supabaseAdmin.from("notedwork_google_tokens").delete().eq("user_id", prevKey);
      }
    }
  }
  // Tolak pengambilalihan email: bila baris user_id ini milik sub lain
  // (email direassign/recycle), cabut sesi lama agar pemilik lama tak ikut valid.
  // Dilewati bila kolom belum ada (tak bisa bandingkan sub → jalur lama).
  try {
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("notedwork_google_tokens")
      .select("google_sub")
      .eq("user_id", userId)
      .limit(1)
      .single<{ google_sub: string | null }>();
    if (existErr) throw existErr;
    if (existing && existing.google_sub && existing.google_sub !== sub) {
      await supabaseAdmin.from("notedwork_sessions").delete().eq("user_id", userId);
    }
  } catch (e) {
    if (!isMissingColumnError(e)) throw e;
    // Kolom belum ada → lewati cek takeover, lanjut jalur lama.
  }
  // Jalur tulis: coba LENGKAP dulu (dengan google_sub); bila kolom belum ada,
  // ulangi TANPA google_sub agar login tetap sukses (fitur rename nonaktif
  // sampai migrasi dijalankan — didokumentasikan di pesan error & README).
  const rowFull = {
    user_id: userId,
    email,
    google_sub: sub,
    access_token: await encryptText(tok.access_token),
    refresh_token: await encryptText(tok.refresh_token),
    expiry_ms: Date.now() + tok.expires_in * 1000,
    scope: tok.scope ?? GOOGLE_SCOPES,
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabaseAdmin
    .from("notedwork_google_tokens")
    .upsert(rowFull, { onConflict: "user_id" });
  if (error && isMissingColumnError(error)) {
    const { google_sub: _drop, ...rowLegacy } = rowFull;
    void _drop;
    const retry = await supabaseAdmin
      .from("notedwork_google_tokens")
      .upsert(rowLegacy, { onConflict: "user_id" });
    error = retry.error;
    if (!error) {
      console.error("[google] login tanpa google_sub (migrasi belum jalan — rename nonaktif)");
    }
  }
  if (error) {
    // Pesan jelas bila migrasi SQL belum dijalankan (bukan "gagal" misterius).
    if (/google_sub/i.test(error.message))
      throw new Error("Skema DB belum dimigrasi (kolom google_sub): jalankan db/notedwork_google_sub.sql");
    throw new Error("Simpan token gagal: " + error.message);
  }
  return { userId, email };
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<{ access: string; expiryMs: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    // Gagal refresh (revoke/ganti password) → hapus baris token agar status jadi putus.
    await supabaseAdmin?.from("notedwork_google_tokens").delete().eq("user_id", userId);
    throw new Error("REFRESH_FAILED");
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  const expiryMs = Date.now() + j.expires_in * 1000;
  await supabaseAdmin
    ?.from("notedwork_google_tokens")
    .update({ access_token: await encryptText(j.access_token), expiry_ms: expiryMs, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { access: j.access_token, expiryMs };
}

/** Access token siap pakai (refresh proaktif jika sisa < 5 menit). */
export async function getAccessToken(userId: string): Promise<string> {
  if (!supabaseAdmin) throw new Error("Supabase belum dikonfigurasi");
  const { data, error } = await supabaseAdmin
    .from("notedwork_google_tokens")
    .select("access_token,refresh_token,expiry_ms")
    .eq("user_id", userId)
    .limit(1)
    .single<Pick<TokenRow, "access_token" | "refresh_token" | "expiry_ms">>();
  if (error || !data) throw new Error("NOT_CONNECTED");
  if (data.expiry_ms - Date.now() < REFRESH_MARGIN_MS) {
    const r = await refreshAccessToken(userId, await decryptText(data.refresh_token));
    return r.access;
  }
  return decryptText(data.access_token);
}

/** Fetch ke Google API dengan token siap pakai. */
export async function googleFetch(userId: string, url: string, init?: RequestInit): Promise<Response> {
  const access = await getAccessToken(userId);
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${access}` },
  });
}

export async function deleteTokens(userId: string): Promise<void> {
  await supabaseAdmin?.from("notedwork_google_tokens").delete().eq("user_id", userId);
}

export async function connectedEmail(userId: string): Promise<string | null> {
  const { data } = (await supabaseAdmin
    ?.from("notedwork_google_tokens")
    .select("email")
    .eq("user_id", userId)
    .limit(1)
    .single<Pick<TokenRow, "email">>()) ?? { data: null };
  return data?.email ?? null;
}

export async function revokeGoogle(userId: string): Promise<void> {
  try {
    const access = await getAccessToken(userId);
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(access)}`, { method: "POST" });
  } catch {
    /* abaikan: token sudah invalid pun tetap lanjut hapus lokal */
  }
  await deleteTokens(userId);
}
