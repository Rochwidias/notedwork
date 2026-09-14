import type { Sched } from "./types";
import { googleFetch } from "./google";

const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary";

interface GEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const COLORS = ["#00cfff", "#22c55e", "#f59e0b", "#7c5cff", "#ec4899", "#ef4444"];

function splitDateTime(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const [d, t] = iso.split("T");
  return { date: d ?? "", time: (t ?? "").slice(0, 5) };
}

function toSched(e: GEvent, i: number): Sched | null {
  const startIso = e.start?.dateTime ?? e.start?.date;
  if (!startIso || !e.id) return null;
  const { date, time } = splitDateTime(startIso);
  const allDay = !!e.start?.date && !e.start?.dateTime;
  return {
    id: `g:${e.id}`,
    title: e.summary || "(tanpa judul)",
    date,
    time: allDay ? "00:00" : time || "00:00",
    note: [e.location, e.description].filter(Boolean).join(" • ").slice(0, 140),
    color: COLORS[i % COLORS.length],
  };
}

export async function listEvents(userId: string, timeMin: string, timeMax: string): Promise<Sched[]> {
  const p = new URLSearchParams({
    timeMin: `${timeMin}T00:00:00+07:00`,
    timeMax: `${timeMax}T23:59:59+07:00`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const res = await googleFetch(userId, `${CAL}/events?${p.toString()}`);
  if (!res.ok) throw new Error("Calendar list gagal: " + res.status);
  const j = (await res.json()) as { items?: GEvent[] };
  return (j.items ?? []).map(toSched).filter((s): s is Sched => s !== null);
}

export async function createEvent(
  userId: string,
  v: { title: string; date: string; time: string; note: string }
): Promise<Sched> {
  const res = await googleFetch(userId, `${CAL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: v.title,
      description: v.note || undefined,
      start: { dateTime: `${v.date}T${v.time}:00+07:00`, timeZone: "Asia/Jakarta" },
      end: { dateTime: `${v.date}T${v.time}:00+07:00`, timeZone: "Asia/Jakarta" },
    }),
  });
  if (!res.ok) throw new Error("Calendar create gagal: " + res.status);
  const e = (await res.json()) as GEvent;
  return (
    toSched(e, 0) ?? { id: `g:${e.id ?? Date.now()}`, title: v.title, date: v.date, time: v.time, note: v.note, color: COLORS[0] }
  );
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const res = await googleFetch(userId, `${CAL}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 410) throw new Error("Calendar delete gagal: " + res.status);
}
