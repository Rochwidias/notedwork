import { decryptText, encryptText, randomToken } from "./crypto";
import { supabaseAdmin } from "./supabaseAdmin";

// Scope sekaligus di awal (keputusan desain): baca+tulis Gmail & Calendar.
export const GOOGLE_SCOPES = [
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
  // Sinkron via node:crypto agar route tetap sederhana (server-only).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
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

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Ambil profil Gmail gagal: " + res.status);
  const j = (await res.json()) as { emailAddress?: string };
  if (!j.emailAddress) throw new Error("Profil Gmail tanpa email");
  return j.emailAddress;
}

export async function saveTokensFromCode(code: string, verifier: string): Promise<{ userId: string; email: string }> {
  if (!supabaseAdmin) throw new Error("Supabase belum dikonfigurasi");
  const tok = await exchangeCode(code, verifier);
  if (!tok.refresh_token) throw new Error("Google tidak memberi refresh_token (coba login ulang)");
  const email = await fetchGoogleEmail(tok.access_token);
  const userId = email.toLowerCase();
  const { error } = await supabaseAdmin.from("notedwork_google_tokens").upsert(
    {
      user_id: userId,
      email,
      access_token: await encryptText(tok.access_token),
      refresh_token: await encryptText(tok.refresh_token),
      expiry_ms: Date.now() + tok.expires_in * 1000,
      scope: tok.scope ?? GOOGLE_SCOPES,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error("Simpan token gagal: " + error.message);
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
