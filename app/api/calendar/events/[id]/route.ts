import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { deleteEvent } from "@/lib/calendar";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  let { id } = await ctx.params;
  // ID internal diawali "g:" — kupas sebelum dikirim ke Google.
  if (id.startsWith("g:")) id = id.slice(2);
  if (!id) return Response.json({ error: "ID kosong" }, { status: 400 });
  try {
    await deleteEvent(userId, id);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED")
      return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Calendar delete gagal" }, { status: 502 });
  }
}
