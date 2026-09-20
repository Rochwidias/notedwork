"use client";

import type { Mail, Sched } from "./types";

export const NOT_CONNECTED = "NOT_CONNECTED";

async function jget<T>(url: string, init?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(url, init?.signal ? { signal: init.signal } : undefined);
  if (res.status === 401) throw new Error(NOT_CONNECTED);
  if (!res.ok) throw new Error("fetch gagal: " + res.status);
  return (await res.json()) as T;
}

async function jpost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error(NOT_CONNECTED);
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error ?? "request gagal: " + res.status);
  }
  return (await res.json()) as T;
}

export async function apiStatus(): Promise<{ connected: boolean; email?: string }> {
  try {
    return await jget<{ connected: boolean; email?: string }>("/api/auth/status");
  } catch {
    return { connected: false };
  }
}

export async function apiLogout(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiListMails(
  q: string,
  pageToken?: string,
  init?: { signal?: AbortSignal }
): Promise<{ mails: Mail[]; nextPageToken: string | null }> {
  const p = new URLSearchParams({ q });
  if (pageToken) p.set("pageToken", pageToken);
  return jget<{ mails: Mail[]; nextPageToken: string | null }>(`/api/gmail/list?${p.toString()}`, init);
}

export async function apiGetMail(id: string): Promise<Mail> {
  const j = await jget<{ mail: Mail }>(`/api/gmail/${encodeURIComponent(id)}`);
  return j.mail;
}

export async function apiSendMail(to: string, subj: string, body: string): Promise<void> {
  await jpost("/api/gmail/send", { to, subj, body });
}

export async function apiLabelMail(id: string, act: "star" | "unstar" | "read" | "unread" | "archive"): Promise<void> {
  await jpost("/api/gmail/label", { id, act });
}

export async function apiListEvents(
  timeMin: string,
  timeMax: string,
  tz?: string
): Promise<Sched[]> {
  const p = new URLSearchParams({ timeMin, timeMax });
  if (tz) p.set("tz", tz);
  const j = await jget<{ events: Sched[] }>(`/api/calendar/events?${p.toString()}`);
  return j.events;
}

export async function apiCreateEvent(
  v: {
    title: string;
    date: string;
    time: string;
    endTime?: string;
    note: string;
    reminderMin?: number;
  },
  tz?: string
): Promise<Sched> {
  const j = await jpost<{ event: Sched }>("/api/calendar/events", tz ? { ...v, tz } : v);
  return j.event;
}

export async function apiDeleteEvent(id: string): Promise<void> {
  const res = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.status === 401) throw new Error(NOT_CONNECTED);
  if (!res.ok) throw new Error("hapus event gagal: " + res.status);
}

export async function apiUpdateEvent(
  id: string,
  v: { title: string; date: string; time: string; endTime?: string; note: string; reminderMin?: number },
  tz?: string
): Promise<Sched> {
  const res = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tz ? { ...v, tz } : v),
  });
  if (res.status === 401) throw new Error(NOT_CONNECTED);
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error ?? "ubah event gagal: " + res.status);
  }
  const j = (await res.json()) as { event: Sched };
  return j.event;
}

export async function apiSyncNote(
  v: { title: string; body: string; driveFileId?: string }
): Promise<string> {
  const j = await jpost<{ fileId: string }>("/api/drive/notes", v);
  return j.fileId;
}

export async function apiTrashNoteFile(fileId: string): Promise<void> {
  const res = await fetch(`/api/drive/notes/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  if (res.status === 401) throw new Error(NOT_CONNECTED);
  if (!res.ok) throw new Error("hapus dokumen gagal: " + res.status);
}
