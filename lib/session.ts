import { cookies } from "next/headers";
import { randomToken } from "./crypto";
import { supabaseAdmin } from "./supabaseAdmin";

export const SESSION_COOKIE = "notedwork_session";
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 hari

interface DbSession {
  id: string;
  user_id: string;
  expires_at: string;
}

export async function createSession(userId: string): Promise<string> {
  if (!supabaseAdmin) throw new Error("Supabase belum dikonfigurasi");
  const id = randomToken(32);
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error } = await supabaseAdmin.from("notedwork_sessions").insert({
    id,
    user_id: userId,
    expires_at: expires,
  });
  if (error) throw new Error("Gagal membuat sesi: " + error.message);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return id;
}

export async function getSessionUser(): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const { data, error } = await supabaseAdmin
    .from("notedwork_sessions")
    .select("id,user_id,expires_at")
    .eq("id", id)
    .limit(1)
    .single<DbSession>();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("notedwork_sessions").delete().eq("id", id);
    return null;
  }
  return data.user_id;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (id && supabaseAdmin) {
    await supabaseAdmin.from("notedwork_sessions").delete().eq("id", id);
  }
}
