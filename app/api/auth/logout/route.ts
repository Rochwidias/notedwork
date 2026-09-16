import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import { revokeGoogle } from "@/lib/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { destroySession } from "@/lib/session";

function originAllowed(req: Request): boolean {
  // Login memakai cookie (tanpa CSRF token): tolak POST lintas-origin.
  // SameSite=lax menutup sebagian besar vektor (cookie tak ikut pada POST
  // lintas-situs); cek Origin + Sec-Fetch-Site menutup sisanya bila perilaku
  // cookie berubah. Tanpa Origin (form klasik) → tolak kecuali Sec-Fetch-Site
  // menyebut same-origin.
  const origin = req.headers.get("origin");
  const appOrigin = (() => {
    try {
      return new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
    } catch {
      return null;
    }
  })();
  // Same-origin dinamis (lolos di preview deployment / port dev yang beda APP_URL),
  // di samping APP_URL kanonis bila sama.
  const reqOrigin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return null;
    }
  })();
  if (origin) {
    try {
      const o = new URL(origin).origin;
      if (o === reqOrigin) return true;
      return appOrigin != null && o === appOrigin;
    } catch {
      return false;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const referer = req.headers.get("referer");
  if (referer && appOrigin) {
    try {
      return new URL(referer).origin === appOrigin;
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(req: Request) {
  if (!originAllowed(req)) return Response.json({ error: "Origin tidak valid" }, { status: 403 });
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  let userId: string | null = null;
  if (sessionId && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("notedwork_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .limit(1)
      .single<{ user_id: string }>();
    userId = data?.user_id ?? null;
  }
  if (userId) {
    try {
      await revokeGoogle(userId);
    } catch {
      /* abaikan */
    }
  }
  await destroySession();
  return Response.json({ ok: true });
}
