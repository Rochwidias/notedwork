import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createEvent, listEvents } from "@/lib/calendar";

function disconnected(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : "";
  return msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED";
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const timeMin = q.get("timeMin") ?? new Date().toISOString().slice(0, 10);
  const timeMax =
    q.get("timeMax") ??
    new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(timeMin) || !/^\d{4}-\d{2}-\d{2}$/.test(timeMax))
    return Response.json({ error: "Format tanggal salah" }, { status: 400 });
  try {
    const events = await listEvents(userId, timeMin, timeMax);
    return Response.json({ events });
  } catch (e) {
    if (disconnected(e)) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Calendar list gagal" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  let v: { title?: string; date?: string; time?: string; note?: string };
  try {
    v = (await req.json()) as typeof v;
  } catch {
    return Response.json({ error: "Body bukan JSON" }, { status: 400 });
  }
  if (!v.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "") || !/^\d{2}:\d{2}$/.test(v.time ?? ""))
    return Response.json({ error: "Judul/tanggal/jam tidak valid" }, { status: 400 });
  try {
    const event = await createEvent(userId, {
      title: v.title.trim().slice(0, 80),
      date: v.date as string,
      time: v.time as string,
      note: (v.note ?? "").slice(0, 140),
    });
    return Response.json({ event });
  } catch (e) {
    if (disconnected(e)) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Calendar create gagal" }, { status: 502 });
  }
}
