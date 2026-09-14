import { cookies } from "next/headers";
import { authUrl, codeChallenge, newCodeVerifier, newState } from "@/lib/google";

const STATE_COOKIE = "notedwork_oauth_state";
const VERIFIER_COOKIE = "notedwork_oauth_verifier";

export async function GET() {
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
