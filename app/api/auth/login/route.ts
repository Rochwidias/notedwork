import { cookies } from "next/headers";
import { authUrl, codeChallenge, newCodeVerifier, newState } from "@/lib/google";
import { clientIp, hitRateLimit, tooMany } from "@/lib/ratelimit";

const STATE_COOKIE = "notedwork_oauth_state";
const VERIFIER_COOKIE = "notedwork_oauth_verifier";

export async function GET(req: Request) {
  // Anti bruteforce login: maks 20/menit per IP.
  if (!hitRateLimit(`login:${clientIp(req)}`, 20)) return tooMany();
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return Response.json({ error: "Google OAuth belum dikonfigurasi" }, { status: 500 });
  }
  const state = newState();
  const verifier = newCodeVerifier();
  const challenge = codeChallenge(verifier);
  const jar = await cookies();
  const opt = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  jar.set(STATE_COOKIE, state, opt);
  jar.set(VERIFIER_COOKIE, verifier, opt);
  return Response.redirect(authUrl(state, challenge));
}
