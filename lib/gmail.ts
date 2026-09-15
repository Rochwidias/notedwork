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

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => {
      try {
        return String.fromCharCode(Number(n));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => {
      try {
        return String.fromCharCode(parseInt(h, 16));
      } catch {
        return "";
      }
    });
}

/** HTML → teks rapi: blok jadi newline, link pertahankan URL-nya, <img> dibuang. */
function htmlToText(html: string): string {
  let t = html;
  // <a href="U">teks</a> → "teks U" agar URL tidak hilang saat tag dibuang.
  t = t.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m: string, url: string, inner: string) => {
      const label = inner.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const u = (url || "").trim();
      if (!label) return ` ${u} `;
      if (label === u) return ` ${u} `;
      if (label.includes(u) || u.includes(label)) return ` ${label} `;
      return ` ${label} ${u} `;
    }
  );
  // Elemen blok → newline (sebelum tag dibuang).
  t = t.replace(/<(br\s*\/?|\/p|\/div|\/li|\/tr|\/h[1-6]|\/ul|\/ol|\/table|\/blockquote)>/gi, "\n");
  t = t.replace(/<(p|div|li|tr|h[1-6]|ul|ol|table|blockquote)[\s>]/gi, "\n");
  // <img> dibuang total — tanpa placeholder "[image: ...]".
  t = t.replace(/<img\b[^>]*>/gi, " ");
  // Sisa tag → spasi agar kata tidak menempel.
  t = t.replace(/<[^>]*>/g, " ");
  t = decodeEntities(t);
  const lines = t.split("\n").map((l) => l.replace(/[ \t\r\f\v]+/g, " ").trim());
  const kept = lines.filter((l) => !/^\[image:[^\]]*\]$/i.test(l));
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Buang baris placeholder "[image: ...]" dari teks polos. */
function stripImageLines(text: string): string {
  return text
    .split("\n")
    .filter((l) => !/^\[image:[^\]]*\]$/i.test(l.trim()))
    .join("\n");
}

/** Normalisasi ringan teks polos: satukan line-ending, rapikan spasi akhir baris. */
function cleanPlain(text: string): string {
  return stripImageLines(text.replace(/\r\n?/g, "\n"))
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Potong maks 6000 char di batas baris/spasi agar tidak penggal URL. */
function safeSlice(text: string, max = 6000): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const urlTail = cut.match(/https?:\/\/\S*$/);
  if (urlTail && urlTail.index !== undefined && urlTail.index > max - 500) {
    return cut.slice(0, urlTail.index).trimEnd();
  }
  const br = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
  if (br > max * 0.8) return cut.slice(0, br).trimEnd();
  return cut.trimEnd();
}

function extractBody(msg: GmailMessage): string {
  const walk = (part: GmailPart | undefined): string => {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) return cleanPlain(b64ToText(part.body.data));
    if (part.parts) {
      for (const p of part.parts) {
        const t = walk(p);
        if (t) return t;
      }
      for (const p of part.parts) {
        if (p.mimeType === "text/html" && p.body?.data) {
          return htmlToText(b64ToText(p.body.data));
        }
      }
    }
    if (part.body?.data && part.mimeType?.startsWith("text/")) return cleanPlain(b64ToText(part.body.data));
    return "";
  };
  const payload = msg.payload as GmailPart | undefined;
  const snippetClean = (msg.snippet ?? "").replace(/\s+/g, " ").trim();
  return safeSlice(walk(payload)) || snippetClean || "Email ini tidak memiliki isi teks.";
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

/** Potong di batas kata, tambah … bila dipotong. */
function cutWords(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const base = (sp > max * 0.5 ? cut.slice(0, sp) : cut).trimEnd();
  return base + "…";
}

/** Baris pertama non-kosong dari teks (±70 char, tanpa URL mentah). */
function firstLine(text: string, max = 70): string {
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^\[image:[^\]]*\]$/i.test(line)) continue;
    const noUrls = line.replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
    if (!noUrls) continue;
    return cutWords(noUrls, max);
  }
  return "";
}

/** Uraikan header From → display-name + alamat. */
function parseFrom(fromRaw: string): { from: string; email: string } {
  const raw = (fromRaw || "").trim();
  if (!raw) return { from: "Pengirim tidak diketahui", email: "" };
  const angle = raw.match(/<([^>]+)>/);
  if (angle?.[1]) {
    const email = angle[1].trim();
    const name = raw
      .replace(/<[^>]*>/g, "")
      .replace(/"/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return { from: name || email.split("@")[0] || email, email };
  }
  if (/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(raw)) {
    return { from: raw.split("@")[0] || raw, email: raw };
  }
  const bareMail = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (bareMail) {
    const name = raw
      .replace(bareMail[0], "")
      .replace(/["<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return { from: name || bareMail[0].split("@")[0] || bareMail[0], email: bareMail[0] };
  }
  return { from: raw, email: "" };
}

function toMail(msg: GmailMessage, internalDate?: string): Mail {
  const { from, email } = parseFrom(header(msg, "From"));
  const body = extractBody(msg);
  const snippetClean = (msg.snippet ?? "").replace(/\s+/g, " ").trim();
  // Subjek: header → baris pertama isi → sisa snippet → netral.
  const headerSubj = header(msg, "Subject").replace(/\s+/g, " ").trim();
  const fallbackSubj = firstLine(body) || firstLine(snippetClean);
  const labels = msg.labelIds ?? [];
  // Jika subjek diambil dari snippet, prev pakai sisa agar list tidak repetitif.
  let prev = snippetClean;
  if (!headerSubj && fallbackSubj && snippetClean.startsWith(fallbackSubj.replace(/…$/, ""))) {
    prev = snippetClean.slice(fallbackSubj.replace(/…$/, "").length).replace(/^[\s–—:;,.]+/, "");
  }
  return {
    id: msg.id,
    from,
    email,
    subj: headerSubj || fallbackSubj || "Tanpa subjek",
    prev: cutWords(prev, 140),
    body,
    time: prettyDate(internalDate),
    tag: "Gmail",
    files: extractFiles(msg),
    unread: labels.includes("UNREAD"),
    starred: labels.includes("STARRED"),
  };
}

export async function listMails(
  userId: string,
  q = "",
  pageToken?: string
): Promise<{ mails: Mail[]; nextPageToken?: string }> {
  const p = new URLSearchParams({ maxResults: "50", format: "metadata", includeSpamTrash: "false" });
  p.append("metadataHeaders", "From");
  p.append("metadataHeaders", "Subject");
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
