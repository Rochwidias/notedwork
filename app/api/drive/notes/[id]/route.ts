import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { trashNoteFile } from "@/lib/drive";
import { hitRateLimit, tooMany, validGoogleId } from "@/lib/ratelimit";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  if (!hitRateLimit(`drive-del:${userId}`, 30)) return tooMany();
  const { id: rawId } = await ctx.params;
  const id = validGoogleId(rawId);
  if (!id) return Response.json({ error: "ID tidak valid" }, { status: 400 });
  try {
    await trashNoteFile(userId, id);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED")
      return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Hapus dokumen gagal" }, { status: 502 });
  }
}
