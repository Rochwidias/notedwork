import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { deleteEvent, updateEvent } from "@/lib/calendar";

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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  let { id } = await ctx.params;
  // ID internal diawali "g:" — kupas sebelum dikirim ke Google.
  if (id.startsWith("g:")) id = id.slice(2);
  if (!id) return Response.json({ error: "ID kosong" }, { status: 400 });
  let v: { title?: string; date?: string; time?: string; endTime?: string; note?: string };
  try {
    v = (await req.json()) as typeof v;
  } catch {
    return Response.json({ error: "Body bukan JSON" }, { status: 400 });
  }
  if (!v.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "") || !/^\d{2}:\d{2}$/.test(v.time ?? ""))
    return Response.json({ error: "Judul/tanggal/jam tidak valid" }, { status: 400 });
  // endTime opsional same-day: bila diisi wajib hh:mm dan setelah jam mulai.
  const endTime = (v.endTime ?? "").trim();
  if (endTime) {
    if (!/^\d{2}:\d{2}$/.test(endTime) || endTime <= (v.time as string))
      return Response.json({ error: "Jam selesai harus setelah jam mulai" }, { status: 400 });
  }
  try {
    const event = await updateEvent(userId, id, {
      title: v.title.trim().slice(0, 80),
      date: v.date as string,
      time: v.time as string,
      ...(endTime ? { endTime } : {}),
      note: (v.note ?? "").slice(0, 140),
    });
    return Response.json({ event });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED")
      return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Calendar update gagal" }, { status: 502 });
  }
}
