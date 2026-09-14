"use client";

import type { Mail, Sched } from "./types";

export const NOT_CONNECTED = "NOT_CONNECTED";

async function jget<T>(url: string): Promise<T> {
  const res = await fetch(url);
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

export async function apiLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
}

export async function apiListMails(q: string, pageToken?: string): Promise<{ mails: Mail[]; nextPageToken: string | null }> {
  const p = new URLSearchParams({ q });
  if (pageToken) p.set("pageToken", pageToken);
  return jget<{ mails: Mail[]; nextPageToken: string | null }>(`/api/gmail/list?${p.toString()}`);
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

export async function apiListEvents(timeMin: string, timeMax: string): Promise<Sched[]> {
  const p = new URLSearchParams({ timeMin, timeMax });
  const j = await jget<{ events: Sched[] }>(`/api/calendar/events?${p.toString()}`);
  return j.events;
}

export async function apiCreateEvent(v: { title: string; date: string; time: string; note: string }): Promise<Sched> {
  const j = await jpost<{ event: Sched }>("/api/calendar/events", v);
  return j.event;
}

export async function apiDeleteEvent(id: string): Promise<void> {
  const res = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.status === 401) throw new Error(NOT_CONNECTED);
  if (!res.ok) throw new Error("hapus event gagal: " + res.status);
}
