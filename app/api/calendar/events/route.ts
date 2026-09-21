import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createEvent, listEvents } from "@/lib/calendar";
import { resolveTimeZone } from "@/lib/dates";
import { hitRateLimit, tooMany } from "@/lib/ratelimit";

function disconnected(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : "";
  return msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED";
}

/** Validasi tanggal kalender asli: tolak 2026-13-99 (komponen Date harus sama). */
function validCalendarDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function parseReminder(v: unknown): number | null {
  if (v == null || v === "") return 15;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1440) return null;
  return Math.floor(n);
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  if (!hitRateLimit(`cal-list:${userId}`, 60)) return tooMany();
  const q = req.nextUrl.searchParams;
  const timeMin = q.get("timeMin") ?? new Date().toISOString().slice(0, 10);
  const timeMax =
    q.get("timeMax") ??
    new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  if (!validCalendarDate(timeMin) || !validCalendarDate(timeMax))
    return Response.json({ error: "Format tanggal salah" }, { status: 400 });
  const tz = resolveTimeZone(q.get("tz"));
  try {
    const events = await listEvents(userId, timeMin, timeMax, tz);
    return Response.json({ events });
  } catch (e) {
    if (disconnected(e)) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Calendar list gagal" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  if (!hitRateLimit(`cal-create:${userId}`, 30)) return tooMany();
  let v: { title?: string; date?: string; time?: string; endTime?: string; note?: string; reminderMin?: unknown; tz?: unknown };
  try {
    v = (await req.json()) as typeof v;
  } catch {
    return Response.json({ error: "Body bukan JSON" }, { status: 400 });
  }
  if (!v.title?.trim() || !validCalendarDate(v.date ?? "") || !/^\d{2}:\d{2}$/.test(v.time ?? ""))
    return Response.json({ error: "Judul/tanggal/jam tidak valid" }, { status: 400 });
  // endTime hanya cek format: BOLEH <= time (= overnight, tanggal end +1 hari).
  const endTime = (v.endTime ?? "").trim();
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime))
    return Response.json({ error: "Format jam selesai salah" }, { status: 400 });
  const reminderMin = parseReminder(v.reminderMin);
  if (reminderMin == null)
    return Response.json({ error: "Pengingat harus 0–1440 menit" }, { status: 400 });
  const tz = resolveTimeZone(typeof v.tz === "string" ? v.tz : undefined);
  try {
    const event = await createEvent(
      userId,
      {
        title: v.title.trim().slice(0, 80),
        date: v.date as string,
        time: v.time as string,
        ...(endTime ? { endTime } : {}),
        note: (v.note ?? "").slice(0, 140),
      },
      reminderMin,
      tz
    );
    return Response.json({ event });
  } catch (e) {
    if (disconnected(e)) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Calendar create gagal" }, { status: 502 });
  }
}
