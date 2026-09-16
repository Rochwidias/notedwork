import type { Sched } from "./types";
import { googleFetch } from "./google";
import { resolveTimeZone, tzOffsetString } from "./dates";

const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary";

interface GEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

const COLORS = ["#D97706", "#16a34a", "#b45309", "#7c5cff", "#ec4899", "#dc2626"];

function splitDateTime(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const [d, t] = iso.split("T");
  return { date: d ?? "", time: (t ?? "").slice(0, 5) };
}

function toSched(e: GEvent, i: number): Sched | null {
  const startIso = e.start?.dateTime ?? e.start?.date;
  if (!startIso || !e.id) return null;
  const { date, time } = splitDateTime(startIso);
  // Event seharian Google: start.date tanpa dateTime → allDay.
  const allDay = !!e.start?.date && !e.start?.dateTime;
  // end beda tanggal (end.date > start.date) → overnight: jam end + flag.
  // endTime same-day seperti sebelumnya (end == start/all-day → undefined).
  let endTime: string | undefined;
  let overnight = false;
  if (e.end?.dateTime) {
    const e2 = splitDateTime(e.end.dateTime);
    if (e2.date > date && e2.time) {
      endTime = e2.time;
      overnight = true;
    } else if (e2.date === date && e2.time && e2.time !== (allDay ? "00:00" : time)) {
      endTime = e2.time;
    }
  }
  const rawReminder = e.extendedProperties?.private?.notedworkReminderMin;
  const reminderNum = rawReminder != null && rawReminder !== "" ? Number(rawReminder) : NaN;
  return {
    id: `g:${e.id}`,
    title: e.summary || "(tanpa judul)",
    date,
    time: allDay ? "00:00" : time || "00:00",
    ...(endTime ? { endTime } : {}),
    ...(allDay ? { allDay: true } : {}),
    ...(overnight ? { overnight: true } : {}),
    note: [e.location, e.description].filter(Boolean).join(" • ").slice(0, 140),
    color: COLORS[i % COLORS.length],
    ...(Number.isFinite(reminderNum) ? { reminderMin: reminderNum } : {}),
  };
}

export async function listEvents(
  userId: string,
  timeMin: string,
  timeMax: string,
  tz?: string
): Promise<Sched[]> {
  const zone = resolveTimeZone(tz);
  const p = new URLSearchParams({
    timeMin: `${timeMin}T00:00:00${tzOffsetString(zone, timeMin, "00:00")}`,
    timeMax: `${timeMax}T23:59:59${tzOffsetString(zone, timeMax, "23:59")}`,
    timeZone: zone,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const res = await googleFetch(userId, `${CAL}/events?${p.toString()}`);
  if (!res.ok) throw new Error("Calendar list gagal: " + res.status);
  const j = (await res.json()) as { items?: GEvent[] };
  return (j.items ?? []).map(toSched).filter((s): s is Sched => s !== null);
}

export interface EventInput {
  title: string;
  date: string;
  time: string;
  /** hh:mm selesai, opsional — kosong = sekilas (end == start); <= time = overnight (besok). */
  endTime?: string;
  note: string;
  /** Menit pengingat sebelum mulai; opsional, default 15, 0 = mati. */
  reminderMin?: number;
}

/** Tambah hari ke iso yyyy-mm-dd (aritmetika Date aman, lintas bulan/tahun). */
function addDaysISO(iso: string, n: number): string {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eventPayload(v: EventInput, reminderMin?: number, tz?: string) {
  const zone = resolveTimeZone(tz);
  const endValid = v.endTime && /^\d{2}:\d{2}$/.test(v.endTime) ? v.endTime : null;
  // end <= start = overnight: tanggal end +1 hari (diterima, bukan ditolak).
  const endDate = endValid && endValid <= v.time ? addDaysISO(v.date, 1) : v.date;
  const end = endValid ?? v.time;
  return {
    summary: v.title,
    description: v.note || undefined,
    start: { dateTime: `${v.date}T${v.time}:00${tzOffsetString(zone, v.date, v.time)}`, timeZone: zone },
    end: { dateTime: `${endDate}T${end}:00${tzOffsetString(zone, endDate, end)}`, timeZone: zone },
    ...(reminderMin != null
      ? { extendedProperties: { private: { notedworkReminderMin: String(reminderMin) } } }
      : {}),
  };
}

export async function createEvent(
  userId: string,
  v: EventInput,
  reminderMin?: number,
  tz?: string
): Promise<Sched> {
  const res = await googleFetch(userId, `${CAL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventPayload(v, reminderMin ?? v.reminderMin, tz)),
  });
  if (!res.ok) throw new Error("Calendar create gagal: " + res.status);
  const e = (await res.json()) as GEvent;
  return (
    toSched(e, 0) ?? { id: `g:${e.id ?? Date.now()}`, title: v.title, date: v.date, time: v.time, ...(v.endTime ? { endTime: v.endTime } : {}), note: v.note, color: COLORS[0] }
  );
}

export async function updateEvent(
  userId: string,
  eventId: string,
  v: EventInput,
  reminderMin?: number,
  tz?: string
): Promise<Sched> {
  const res = await googleFetch(userId, `${CAL}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventPayload(v, reminderMin ?? v.reminderMin, tz)),
  });
  if (!res.ok) throw new Error("Calendar update gagal: " + res.status);
  const e = (await res.json()) as GEvent;
  return (
    toSched(e, 0) ?? { id: `g:${eventId}`, title: v.title, date: v.date, time: v.time, ...(v.endTime ? { endTime: v.endTime } : {}), note: v.note, color: COLORS[0] }
  );
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const res = await googleFetch(userId, `${CAL}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 410) throw new Error("Calendar delete gagal: " + res.status);
}
