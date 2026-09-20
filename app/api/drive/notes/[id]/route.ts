import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { trashNoteFile } from "@/lib/drive";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  const { id } = await ctx.params;
  if (!id) return Response.json({ error: "ID kosong" }, { status: 400 });
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
