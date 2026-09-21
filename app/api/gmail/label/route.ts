import { getSessionUser } from "@/lib/session";
import { labelMail, type LabelAction } from "@/lib/gmail";
import { hitRateLimit, tooMany, validGoogleId } from "@/lib/ratelimit";

const ALLOWED = new Set<LabelAction>(["star", "unstar", "read", "unread", "archive"]);

export async function POST(req: Request) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  if (!hitRateLimit(`gmail-label:${userId}`, 120)) return tooMany();
  let body: { id?: string; act?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Body bukan JSON" }, { status: 400 });
  }
  const id = validGoogleId(body.id ?? "");
  if (!id || !body.act || !ALLOWED.has(body.act as LabelAction))
    return Response.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  try {
    await labelMail(userId, id, body.act as LabelAction);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED")
      return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Ubah label gagal" }, { status: 502 });
  }
}
