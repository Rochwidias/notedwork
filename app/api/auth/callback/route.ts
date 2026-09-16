import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { saveTokensFromCode } from "@/lib/google";
import { createSession } from "@/lib/session";

const STATE_COOKIE = "notedwork_oauth_state";
const VERIFIER_COOKIE = "notedwork_oauth_verifier";

function fail(msg: string): Response {
  const url = new URL("/", process.env.APP_URL ?? "http://localhost:3000");
  url.searchParams.set("auth", "gagal");
  url.searchParams.set("pesan", msg);
  return Response.redirect(url);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return fail("ditolak-google");
  const code = q.get("code");
  const state = q.get("state");
  if (!code || !state) return fail("param-kurang");

  const jar = await cookies();
  const wantState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);
  if (!wantState || !verifier || wantState !== state) return fail("state-tidak-cocok");

  try {
    const { userId } = await saveTokensFromCode(code, verifier);
    try {
      await createSession(userId);
    } catch (e) {
      console.error("[auth/callback] buat-sesi-gagal:", e instanceof Error ? e.message : e);
      return fail("buat-sesi-gagal");
    }
    const url = new URL("/", process.env.APP_URL ?? req.nextUrl.origin);
    url.searchParams.set("auth", "ok");
    return Response.redirect(url);
  } catch (e) {
    console.error("[auth/callback] simpan-token-gagal:", e instanceof Error ? e.message : e);
    return fail("simpan-token-gagal");
  }
}
