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

/**
 * Decode entities HTML satu pass: &amp;lt; → "&lt;" (literal), bukan "<".
 * Berantai (.replace &amp; lalu &lt;) akan decode ganda dan bisa menghidupkan
 * kembali tag/script dari teks yang aslinya ter-escape.
 */
function decodeEntities(s: string): string {
  return s.replace(/&(nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m: string, ent: string) => {
    const e = ent.toLowerCase();
    if (e === "nbsp") return " ";
    if (e === "amp") return "&";
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "quot") return '"';
    if (e === "apos" || ent === "&#39;") return "'";
    let num: number | null = null;
    if (/^#\d+$/.test(ent)) num = Number(ent.slice(1));
    else if (/^#x[0-9a-f]+$/i.test(ent)) num = parseInt(ent.slice(2), 16);
    if (num !== null && Number.isFinite(num)) {
      try {
        return String.fromCharCode(num);
      } catch {
        return "";
      }
    }
    return m;
  });
}

/** HTML → teks ber-token: link [label](url), tabel [TABLE]/[R]/[H], code [PRE], <img> dibuang. */
function htmlToText(html: string): string {
  let t = html;
  // <pre> diekstrak dulu agar indentasi kode utuh (verbatim, tanpa collapse spasi).
  const pres: string[] = [];
  t = t.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m: string, inner: string) => {
    const code = decodeEntities(inner.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, ""))
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!code) return " ";
    pres.push(code);
    return `\n\0PRE${pres.length - 1}\0\n`;
  });
  // <a href="U">teks</a> → token [label](url) agar pasangan label-href tidak hilang.
  t = t.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m: string, url: string, inner: string) => {
      const u = cleanLinkUrl(url);
      const label = cleanLinkLabel(inner);
      if (!u) return label ? ` ${label} ` : " ";
      if (!label || label === u) return ` ${u} `;
      return ` [${label}](${u}) `;
    }
  );
  // Tabel → token struktur (dirender jadi <table> beneran di EmailBody).
  t = t.replace(/<table\b[^>]*>/gi, "\n\n[TABLE]\n");
  t = t.replace(/<\/table\s*>/gi, "\n[/TABLE]\n");
  t = t.replace(/<tr\b[^>]*>/gi, "[R]");
  t = t.replace(/<\/tr\s*>/gi, "\n");
  t = t.replace(/<th\b[^>]*>/gi, "[H]");
  t = t.replace(/<\/th\s*>/gi, " | ");
  t = t.replace(/<td\b[^>]*>/gi, "");
  t = t.replace(/<\/td\s*>/gi, " | ");
  // List → bullet eksplisit.
  t = t.replace(/<li\b[^>]*>/gi, "\n• ");
  // Elemen blok → newline (sebelum tag dibuang).
  t = t.replace(/<(br\s*\/?|\/p|\/div|\/li|\/tr|\/h[1-6]|\/ul|\/ol|\/table|\/blockquote)>/gi, "\n");
  t = t.replace(/<(p|div|li|tr|h[1-6]|ul|ol|table|blockquote)[\s>]/gi, "\n");
  // <img> dibuang total — tanpa placeholder "[image: ...]".
  t = t.replace(/<img\b[^>]*>/gi, " ");
  // <a> sudah diproses di atas; sisa "<URL>" / "teks<URL>" (autolink pola newsletter)
  // → token link / URL telanjang. Hanya <http...>; tag HTML valid tak tersentuh.
  t = t.replace(/([^\s<>]+)?<(https?:\/\/[^\s>]+)>/gi, (_m: string, label: string | undefined, url: string) => {
    const u = cleanLinkUrl(trimUrlTail(url));
    if (!u) return " ";
    const lab = label ? cleanLinkLabel(label).replace(/^[(["'«“‘]+/, "").replace(/[.,;:!?)\]}"'»”’]+$/, "") : "";
    if (!lab || lab === u) return ` ${u} `;
    return ` [${lab}](${u}) `;
  });
  // Sisa tag → spasi agar kata tidak menempel.
  t = t.replace(/<[^>]*>/g, " ");
  t = decodeEntities(t);
  const lines = t.split("\n").map((l) => {
    if (l.includes("[R]") || l.includes(" | ") || l.includes("[H]")) {
      // Baris tabel: rapikan trailing " | " tapi jangan collapse interior.
      return l.replace(/[ \t\r\f\v]+/g, " ").replace(/(\s*\|\s*)+$/, "").trim();
    }
    return l.replace(/[ \t\r\f\v]+/g, " ").trim();
  });
  const kept = lines.filter((l) => !/^\[image:[^\]]*\]$/i.test(l));
  let out = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  // Kembalikan blok <pre> verbatim.
  out = out.replace(/\0PRE(\d+)\0/g, (_m: string, n: string) => {
    const code = pres[Number(n)] ?? "";
    return code ? `\n\n[PRE]\n${code}\n[/PRE]\n` : "";
  });
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Decode header RFC2047 minimal: =?charset?B/Q?...?= (utf-8/latin). */
function decodeHeader(s: string): string {
  return s.replace(/=\?([^?\s]+)\?([bBqQ])\?([^?]*)\?=/g, (_m: string, _cs: string, enc: string, data: string) => {
    try {
      if (enc.toLowerCase() === "b") {
        return Buffer.from(data, "base64").toString("utf-8");
      }
      const qp = data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_x: string, hx: string) => {
        try {
          return String.fromCharCode(parseInt(hx, 16));
        } catch {
          return "";
        }
      });
      return Buffer.from(qp, "latin1").toString("utf-8");
    } catch {
      return data;
    }
  });
}

/** Sanitasi label link: satu baris, tanpa kurung-siku, maks ~200 char. */
function cleanLinkLabel(s: string, max = 200): string {
  const t = decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/[[\]]/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(max - 1, 0)).trimEnd() + "…";
}

/** Potong tanda baca di ekor URL: [.,;:!?] selalu; ) ] hanya bila tak berpasangan. */
function trimUrlTail(url: string): string {
  let u = url.replace(/[.,;:!?]+$/, "");
  // Kurung/siku tutup di ekor dibuang hanya bila jumlahnya melebihi pembukanya
  // (cth: "Foo_(bar)" seimbang → dipertahankan; "teks (lihat https://x/y))" → satu dibuang).
  for (;;) {
    const last = u[u.length - 1];
    if (last !== ")" && last !== "]") break;
    const open = last === ")" ? "(" : "[";
    const opens = u.split(open).length - 1;
    const closes = u.split(last).length - 1;
    if (closes > opens) u = u.slice(0, -1).replace(/[.,;:!?]+$/, "");
    else break;
  }
  return u;
}

/** URL aman untuk token link: trim + decode entities + hanya http/https. */
function cleanLinkUrl(u: string): string {
  const t = decodeEntities(u || "").trim();
  if (!/^https?:\/\//i.test(t)) return "";
  try {
    const parsed = new URL(t);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return t;
  } catch {
    return "";
  }
}
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

/** Potong maks 6000 char di batas baris/spasi; sadar-token (tak penggal [...](...) / [TABLE] / [PRE]). */
function safeSlice(text: string, max = 6000): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const urlTail = cut.match(/https?:\/\/\S*$/);
  if (urlTail && urlTail.index !== undefined && urlTail.index > max - 500) {
    return cut.slice(0, urlTail.index).trimEnd();
  }
  // Mundur ke awal token bila potongan berakhir di dalam token link/tabel/pre.
  const tokTail = cut.match(/\[[^\][\n]*$/);
  if (tokTail && tokTail.index !== undefined && tokTail.index > max - 400) {
    return cut.slice(0, tokTail.index).trimEnd();
  }
  const br = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
  if (br > max * 0.8) return cut.slice(0, br).trimEnd();
  return cut.trimEnd();
}

function extractBody(msg: GmailMessage): string {
  const pickPlain = (part: GmailPart | undefined): string => {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) return cleanPlain(b64ToText(part.body.data));
    if (part.parts) {
      for (const p of part.parts) {
        const t = pickPlain(p);
        if (t) return t;
      }
    }
    if (!part.parts && part.body?.data && part.mimeType === "text/plain") return cleanPlain(b64ToText(part.body.data));
    return "";
  };
  const pickHtml = (part: GmailPart | undefined): string => {
    if (!part) return "";
    if (part.mimeType === "text/html" && part.body?.data) return htmlToText(b64ToText(part.body.data));
    if (part.parts) {
      for (const p of part.parts) {
        const t = pickHtml(p);
        if (t) return t;
      }
    }
    if (!part.parts && part.body?.data && part.mimeType === "text/html") return htmlToText(b64ToText(part.body.data));
    return "";
  };
  const walk = (part: GmailPart | undefined): string => {
    if (!part) return "";
    // Single-part text/html: tanpa .parts, tanpa mimeType gabungan — render via htmlToText.
    if (!part.parts && part.body?.data && part.mimeType?.startsWith("text/")) {
      return part.mimeType === "text/html" ? htmlToText(b64ToText(part.body.data)) : cleanPlain(b64ToText(part.body.data));
    }
    if (part.parts) {
      // Plain dulu di seluruh subtree, baru HTML — jangan campur walk generik yang
      // bisa menelan HTML mentah sebagai teks.
      return pickPlain(part) || pickHtml(part);
    }
    if (part.body?.data && part.mimeType?.startsWith("text/")) {
      return part.mimeType === "text/html" ? htmlToText(b64ToText(part.body.data)) : cleanPlain(b64ToText(part.body.data));
    }
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
  // Email masa depan (jam mundur / zona waktu) bukan "N hari lalu" — tampilkan tanggalnya.
  if (diffDays < 0) return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
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

/** Hilangkan token link [label](url) → label (untuk subjek/prev agar markup tak bocor). */
function detokenize(s: string): string {
  // Token dipindai manual (bukan regex tunggal) agar URL berkurung-seimbang
  // cth: [Foo](https://…/Foo_(bar)) ikut utuh, bukan terpotong di "bar)".
  let out = "";
  let i = 0;
  for (;;) {
    const lb = s.indexOf("[", i);
    if (lb < 0) { out += s.slice(i); break; }
    const mid = s.indexOf("](", lb + 1);
    if (mid < 0 || mid - (lb + 1) > 200 || mid - (lb + 1) < 1 || /[\[\]\n]/.test(s.slice(lb + 1, mid))) {
      out += s.slice(i, lb + 1); i = lb + 1; continue;
    }
    const url = readBalancedUrl(s, mid + 1);
    if (url === null) { out += s.slice(i, mid + 2); i = mid + 2; continue; }
    out += s.slice(i, lb) + s.slice(lb + 1, mid);
    i = mid + 2 + url.length + 1;
  }
  return out;
}

/** Baca URL dari posisi "(" dgn kurung seimbang; null bila tak ada ")" penutup. */
export function readBalancedUrl(s: string, openIdx: number): string | null {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) {
        const url = s.slice(openIdx + 1, i);
        if (!/^https?:\/\//i.test(url) || /[\s<>\"]/.test(url)) return null;
        return url;
      }
    } else if ((c === "\n" || c === " ") && depth <= 0) return null;
  }
  return null;
}

/** Baris-baris bermakna dari teks: buang kosong, placeholder gambar, dan baris murni struktur. */
function meaningfulLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = detokenize(raw).replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^\[image:[^\]]*\]$/i.test(line)) continue;
    if (/^\[(TABLE|\/TABLE|PRE|\/PRE|R)\]$/.test(line)) continue;
    // Baris murni URL (tanpa kata lain) bukan judul yang baik — lewati.
    const noUrls = line.replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
    if (!noUrls) continue;
    out.push(noUrls);
  }
  return out;
}

/** Baris pertama non-kosong dari teks (±70 char); baris sangat pendek digabung dgn baris berikut. */
function firstLine(text: string, max = 70): string {
  const lines = meaningfulLines(text);
  if (!lines.length) return "";
  let head = lines[0];
  // "Google AI" + "Studio …" → "Google AI Studio …" (judul 1–2 kata digabung).
  if ((head.length < 15 || head.split(/\s+/).length < 3) && lines.length > 1) {
    head = `${head} ${lines[1]}`;
  }
  return cutWords(head, max);
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
  const { from, email } = parseFrom(
    decodeHeader(header(msg, "From") || header(msg, "Sender") || header(msg, "Reply-To") || header(msg, "Return-Path"))
  );
  const body = extractBody(msg);
  const snippetClean = detokenize(msg.snippet ?? "").replace(/\s+/g, " ").trim();
  // Subjek: header → baris pertama isi → sisa snippet → netral.
  const headerSubj = decodeHeader(header(msg, "Subject")).replace(/\s+/g, " ").trim();
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
  // From + cadangan identitas pengirim massal (Sender/Reply-To/Return-Path) + Subject.
  for (const h of ["From", "Sender", "Reply-To", "Return-Path", "Subject"]) p.append("metadataHeaders", h);
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
        const hp = new URLSearchParams({ format: "metadata" });
        for (const h of ["From", "Sender", "Reply-To", "Return-Path", "Subject"]) hp.append("metadataHeaders", h);
        const r = await googleFetch(userId, `${GMAIL}/messages/${m.id}?${hp.toString()}`);
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

/** Encode header RFC2047 bila ada byte non-ASCII; ASCII murni dikirim apa adanya. */
export function encodeHeader(s: string): string {
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf-8").toString("base64")}?=`;
}

function rawMessage(to: string, subj: string, body: string): string {
  const raw = [`To: ${to}`, `Subject: ${encodeHeader(subj)}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
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
