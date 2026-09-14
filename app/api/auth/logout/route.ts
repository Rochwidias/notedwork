import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import { revokeGoogle } from "@/lib/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { destroySession } from "@/lib/session";

export async function POST() {
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
