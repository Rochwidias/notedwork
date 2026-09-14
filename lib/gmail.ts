import type { Mail, MailFile } from "./types";
import { googleFetch } from "./google";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  filename?: string;
  mimeType?: string;
  body?: { size?: number; data?: string };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { size?: number; data?: string };
    parts?: GmailPart[];
    mimeType?: string;
  };
}

function header(msg: GmailMessage, name: string): string {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
}

function b64ToText(b64: string): string {
  const bin = Buffer.from(b64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  return bin;
}

function extractBody(msg: GmailMessage): string {
  const walk = (part: GmailPart | undefined): string => {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) return b64ToText(part.body.data);
    if (part.parts) {
      for (const p of part.parts) {
        const t = walk(p);
        if (t) return t;
      }
      for (const p of part.parts) {
        if (p.mimeType === "text/html" && p.body?.data) {
          return b64ToText(p.body.data).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        }
      }
    }
    if (part.body?.data && part.mimeType?.startsWith("text/")) return b64ToText(part.body.data);
    return "";
  };
  const payload = msg.payload as GmailPart | undefined;
  return walk(payload).slice(0, 6000) || msg.snippet || "(tanpa isi)";
}

function fmtSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function extractFiles(msg: GmailMessage): MailFile[] {
  const out: MailFile[] = [];
  const walk = (part: GmailPart | undefined) => {
    if (!part) return;
    if (part.filename) out.push({ name: part.filename, size: fmtSize(part.body?.size ?? 0) });
    part.parts?.forEach(walk);
  };
  walk(msg.payload as GmailPart | undefined);
  return out;
}

function prettyDate(internalDateMs: string | undefined): string {
  if (!internalDateMs) return "";
  const d = new Date(Number(internalDateMs));
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Kemarin";
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 864e5);
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function toMail(msg: GmailMessage, internalDate?: string): Mail {
  const fromRaw = header(msg, "From");
  const from = fromRaw.replace(/<[^>]*>/g, "").replace(/"/g, "").trim() || fromRaw || "(tanpa pengirim)";
  const emailMatch = fromRaw.match(/<([^>]+)>/);
  return {
    id: msg.id,
    from,
    email: emailMatch?.[1] ?? "",
    subj: header(msg, "Subject") || "(tanpa subjek)",
    prev: msg.snippet ?? "",
    body: extractBody(msg),
    time: prettyDate(internalDate),
    tag: "Gmail",
    files: extractFiles(msg),
  };
}

export async function listMails(
  userId: string,
  q = "",
  pageToken?: string
): Promise<{ mails: Mail[]; nextPageToken?: string }> {
  const p = new URLSearchParams({ maxResults: "50", format: "metadata", includeSpamTrash: "false" });
  p.set("metadataHeaders", "From");
  p.set("metadataHeaders", "Subject");
  if (q) p.set("q", q);
  if (pageToken) p.set("pageToken", pageToken);
  const res = await googleFetch(userId, `${GMAIL}/messages?${p.toString()}`);
  if (!res.ok) throw new Error("Gmail list gagal: " + res.status);
  const j = (await res.json()) as GmailListResponse;
  const ids = j.messages ?? [];
  const mails: Mail[] = [];
  // Gmail tidak mengembalikan header di list; ambil per pesan (50 max, paralel terbatas).
  const CONC = 8;
  for (let i = 0; i < ids.length; i += CONC) {
    const chunk = await Promise.all(
      ids.slice(i, i + CONC).map(async (m) => {
        const r = await googleFetch(
          userId,
          `${GMAIL}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`
        );
        if (!r.ok) return null;
        const full = (await r.json()) as GmailMessage & { internalDate?: string };
        return toMail(full, full.internalDate);
      })
    );
    for (const m of chunk) if (m) mails.push(m);
  }
  return { mails, nextPageToken: j.nextPageToken };
}

export async function getMail(userId: string, id: string): Promise<Mail> {
  const res = await googleFetch(userId, `${GMAIL}/messages/${id}?format=full`);
  if (!res.ok) throw new Error("Gmail detail gagal: " + res.status);
  const full = (await res.json()) as GmailMessage & { internalDate?: string };
  return toMail(full, full.internalDate);
}

function rawMessage(to: string, subj: string, body: string): string {
  const raw = [`To: ${to}`, `Subject: ${subj}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
  return Buffer.from(raw, "utf-8").toString("base64url");
}

export async function sendMail(userId: string, to: string, subj: string, body: string): Promise<string> {
  const res = await googleFetch(userId, `${GMAIL}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawMessage(to, subj, body) }),
  });
  if (!res.ok) throw new Error("Kirim email gagal: " + res.status);
  const j = (await res.json()) as { id?: string };
  return j.id ?? "";
}

export type LabelAction = "star" | "unstar" | "read" | "unread" | "archive";

export async function labelMail(userId: string, id: string, act: LabelAction): Promise<void> {
  const add: string[] = [];
  const remove: string[] = [];
  if (act === "star") add.push("STARRED");
  if (act === "unstar") remove.push("STARRED");
  if (act === "read") remove.push("UNREAD");
  if (act === "unread") add.push("UNREAD");
  if (act === "archive") remove.push("INBOX"); // arsip = keluar inbox, tanpa hapus permanen
  const res = await googleFetch(userId, `${GMAIL}/messages/${id}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
  });
  if (!res.ok) throw new Error("Ubah label gagal: " + res.status);
}
