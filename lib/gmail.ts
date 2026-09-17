import type { Mail, MailFile } from "./types";
import { googleFetch } from "./google";
import { BATCH_URL, buildBatchBody, parseBatchResponse } from "./gmailBatch";

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
  const want = name.toLowerCase();
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === want)?.value ?? "";
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

/** Hapus artefak MSO/Outlook: conditional comments (asli maupun ter-escape
 *  &lt;!--), tag VML/Office (v:/w:/o:), dan atribut xmlns yatim. */
function stripMsoRaw(s: string): string {
  let t = s;
  // Blok MSO ter-escape dihapus UTUH (cabang Outlook menduplikat isi non-Outlook).
  t = t.replace(/&lt;!--\[if mso\]&gt;[\s\S]*?&lt;!\[endif\]--&gt;/gi, " ");
  // Sisa marker downlevel-revealed ter-escape — isinya dipertahankan.
  t = t.replace(/&lt;!--\[if[^\]]*\]&gt;/gi, " ");
  t = t.replace(/&lt;!\[endif\]--&gt;/gi, " ");
  t = t.replace(/&lt;!--&gt;/gi, " ");
  return t;
}

/** Sapuan kedua SETELAH decode: marker MSO/VML yang baru materialisasi
 *  dari &lt;…&gt; dibuang di sini (strip tag umum sudah lewat). */
function stripMsoDecoded(s: string): string {
  let t = s;
  t = t.replace(/<!--\[if[^\]]*\]><!-->/gi, " ");
  t = t.replace(/<!--\[if[^\]]*\]>/gi, " ");
  t = t.replace(/<!--<!\[endif\]-->/gi, " ");
  t = t.replace(/<!\[endif\]-->/gi, " ");
  t = t.replace(/<!--\[endif\]-->/gi, " ");
  t = t.replace(/<\/?(?:v|w|o|st1):[^>]*>/gi, " ");
  t = t.replace(/\sxmlns:(?:v|w|o)="[^"]*"/gi, " ");
  t = t.replace(/\sxmlns:(?:v|w|o)='[^']*'/gi, " ");
  return t;
}

/** Buang blok paragraf duplikat BERURUTAN (email MJML menyimpan cabang
 *  Outlook + non-Outlook dgn isi sama → tampil dua kali). */
function dedupeBlocks(text: string): string {
  const blocks = text.split(/\n{2,}/);
  const out: string[] = [];
  for (const b of blocks) {
    const norm = b.replace(/\s+/g, " ").trim().toLowerCase();
    const last = out.length ? out[out.length - 1].replace(/\s+/g, " ").trim().toLowerCase() : "";
    if (norm && norm === last) continue;
    out.push(b);
  }
  return out.join("\n\n");
}

/** HTML → teks ber-token: link [label](url), tabel [TABLE]/[R]/[H], code [PRE], <img> dibuang.
 *  Diekspor agar bisa diuji langsung (tests/repro-email.mjs). */
export function htmlToText(html: string): string {
  let t = stripMsoRaw(html);
  // Komentar HTML (termasuk kondisional MSO <!--[if mso]>…<![endif]--> yang
  // menyembunyikan <table> hantu) + <head>/<style>/<script> dibuang dulu —
  // kalau tidak, CSS mentah MJML bocor jadi teks terlihat.
  t = t.replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, " ");
  t = t.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ");
  t = t.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ");
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
  // href BOLEH tanpa quote (newsletter jadul): href=URL-telanjang ikut jadi link.
  t = t.replace(
    /<a\b[^>]*href=(?:"([^"]+)"|'([^']+)'|([^\s>"']+))[^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_m: string, uq: string | undefined, us: string | undefined, ub: string | undefined, inner: string) => {
      const u = cleanLinkUrl(uq ?? us ?? ub ?? "");
      const label = cleanLinkLabel(inner);
      if (!u) return label ? ` ${label} ` : " ";
      if (!label || label === u) return ` ${u} `;
      return ` [${label}](${u}) `;
    }
  );
  // Sel wrapper yang hanya membungkus satu blok (kolom tunggal / sel penampung)
  // tak menambah makna → dibuka agar tak jadi baris ">" kosong di teks.
  // Kolom MJML (div .mj-column-*) dipertahankan (isi kolom tetap terpisah rapi).
  for (let k = 0; k < 3; k++) {
    const before = t;
    t = t.replace(/<(div|center|span)\b((?![^>]*mj-column-)[^>]*)>([^<>]*?)<\/\1\s*>/gi, " $3 ");
    if (t === before) break;
  }
  // Tabel → token struktur (dirender jadi <table> beneran di EmailBody).
  // [TABLE] pembuka dipertahankan agar EmailBody menemukan blok tabel;
  // token yatim (tanpa [R]) dibersihkan di langkah akhir di bawah.
  t = t.replace(/<table\b[^>]*>/gi, "[TABLE]");
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
  t = t.replace(/<(br\s*\/?|\/p|\/div|\/li|\/tr|\/h[1-6]|\/ul|\/ol|\/table|\/blockquote|\/figure|\/figcaption)>/gi, "\n");
  t = t.replace(/<(p|div|li|tr|h[1-6]|ul|ol|table|blockquote|figure)[\s>]/gi, "\n");
  // <figcaption> pembuka → newline (caption tampil sebagai baris sendiri).
  t = t.replace(/<figcaption\b[^>]*>/gi, "\n");
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
  // Atribut HTML yatim (style="…", class="…") tanpa tag pembuka — sisa dari
  // <div …> yang tag-nya terpotong/terbuang — dibuang agar tak tampil mentah.
  t = t.replace(/\s[a-zA-Z-]+="[^"]*"/g, " ");
  t = t.replace(/\s[a-zA-Z-]+='[^']*'/g, " ");
  // Sisa tag → spasi agar kata tidak menempel.
  t = t.replace(/<[^>]*>/g, " ");
  t = decodeEntities(t);
  // Marker MSO/VML yang baru muncul dari &lt;…&gt; sesudah decode dibuang di sini.
  t = stripMsoDecoded(t);
  // Baris sisa token/atribut: ">" penutup tag yatim, "|" sisa <td>,
  // token [R]/[H]/[PRE] yatim, sisa atribut.
  // PENTING: baris token [TABLE]/[/TABLE] JANGAN dibuang di sini — EmailBody
  // butuh pasangan [TABLE]…[/TABLE] yang utuh untuk render <table> beneran.
  // Token yatim tanpa pasangan dibersihkan di langkah akhir di bawah.
  t = t
    .split("\n")
    .map((l) => {
      let x = l.trim();
      if (/^[>|]+$/.test(x)) return "";
      if (/^\[(PRE|\/PRE|R|H)\]$/.test(x)) return "";
      if (/^\[(TABLE|\/TABLE)\]/.test(x)) return x;
      x = x.replace(/^[>|]+\s*/, "").replace(/\s*[|]\s*$/, "").trim();
      if (/^\[(PRE|\/PRE|R|H)\]$/.test(x)) return "";
      return x;
    })
    .join("\n");
  const lines = t.split("\n").map((l) => {
    if (/^\[TABLE\]/.test(l.trim())) {
      // Baris pembuka tabel tanpa <tr>: normalisasi trailing pipe TANPA memenggal
      // token [TABLE] — langkah akhir butuh pasangan [TABLE]…[/TABLE] yang utuh.
      return l.replace(/[ \t\r\f\v]+/g, " ").replace(/(\s*\|\s*)+$/, "").trim();
    }
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
  // Tabel jadul tanpa <tr> (layout email lama): sel tampil tapi tanpa [R]
  // sehingga EmailBody tak mengenalinya → jadikan baris [R] agar tampil
  // sebagai <table> beneran, bukan token mentah bocor ke layar.
  // Token [TABLE]…[/TABLE] yatim (tanpa [R] dan tanpa sel) dibuang bersih.
  out = out.replace(/\[TABLE\]([\s\S]*?)\[\/TABLE\]/g, (_m: string, inner: string) => {
    if (/\[R\]/.test(inner)) return `[TABLE]${inner}[/TABLE]`;
    const rows = inner
      .split("\n")
      .map((l) => l.replace(/(\s*\|\s*)+$/, "").trim())
      .filter((l) => l && !/^\[(TABLE|\/TABLE|PRE|\/PRE|R|H)\]$/.test(l));
    if (!rows.length) return "";
    return `[TABLE]\n${rows.map((r) => `[R]${r}`).join("\n")}\n[/TABLE]`;
  });
  // Sisa token yatim tanpa pasangan (tak termakan regex berpasangan di atas).
  out = out
    .split("\n")
    .map((l) => {
      const x = l.trim();
      if (/^\[(TABLE|\/TABLE)\]$/.test(x)) return "";
      return l;
    })
    .join("\n");
  // Cabang MSO ganda (Outlook + non-Outlook) → paragraf kembar berurutan dibuang.
  out = dedupeBlocks(out);
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
  // Part text/plain email marketing kadang membawa sisa MSO/VML mentah —
  // bersihkan dulu agar tak tampil sebagai teks (kasus notifikasi Google).
  const demsod = stripMsoDecoded(stripMsoRaw(text));
  return dedupeBlocks(
    stripImageLines(demsod.replace(/\r\n?/g, "\n"))
      .split("\n")
      .map((l) => {
        const x = l.replace(/[ \t]+$/g, "");
        // Baris murni marker kondisional / VML / atribut xmlns yatim → buang.
        if (/^\s*(<!--\[if|<!--<!\[endif\]|<!\[endif\]|<\/?(?:v|w|o|st1):|xmlns:(?:v|w|o))/i.test(x)) return "";
        return x;
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
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
      // bisa menelan HTML mentah sebagai teks. Kecuali plain-nya rusak (sisa MSO/VML
      // khas part text/plain email marketing) sementara HTML bersih → pakai HTML.
      const plain = pickPlain(part);
      const html = pickHtml(part);
      if (plain && html && /<!--\[if|<!\[endif|&lt;!--|<(?:v|w|o):/i.test(plain)) return html;
      return plain || html;
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
  // Gmail tidak mengembalikan header di list → batchGet 1 round-trip
  // (multipart POST /batch/gmail/v1). Gagal/parsial → fallback N+1 per pesan (CONC=8).
  const byId = await batchMetadata(userId, ids.map((m) => m.id));
  const missing = ids.map((m) => m.id).filter((id) => !byId.has(id));
  if (missing.length) {
    // Paralel terbatas seperti pola lama (bukan serial) agar tak timeout Vercel.
    const CONC = 8;
    for (let i = 0; i < missing.length; i += CONC) {
      const chunk = await Promise.all(missing.slice(i, i + CONC).map((id) => singleMetadata(userId, id)));
      chunk.forEach((full, k) => {
        if (full && full.id) byId.set(missing[i + k], full);
      });
    }
  }
  for (const id of ids.map((m) => m.id)) {
    const full = byId.get(id);
    if (full) mails.push(toMail(full, full.internalDate));
  }
  return { mails, nextPageToken: j.nextPageToken };
}

async function singleMetadata(
  userId: string,
  id: string
): Promise<(GmailMessage & { internalDate?: string }) | null> {
  const hp = new URLSearchParams({ format: "metadata" });
  for (const h of ["From", "Sender", "Reply-To", "Return-Path", "Subject"]) hp.append("metadataHeaders", h);
  const r = await googleFetch(userId, `${GMAIL}/messages/${id}?${hp.toString()}`);
  if (!r.ok) return null;
  return (await r.json()) as GmailMessage & { internalDate?: string };
}

/** Ambil metadata banyak pesan sekaligus via batch; kembalikan map id → pesan (parsial OK). */
async function batchMetadata(
  userId: string,
  ids: string[]
): Promise<Map<string, GmailMessage & { internalDate?: string }>> {
  const out = new Map<string, GmailMessage & { internalDate?: string }>();
  if (!ids.length) return out;
  const boundary = `notedwork_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  let res: Response;
  try {
    res = await googleFetch(userId, BATCH_URL, {
      method: "POST",
      headers: { "Content-Type": `multipart/mixed; boundary=${boundary}` },
      body: buildBatchBody(ids, boundary),
    });
  } catch {
    return out; // network gagal → fallback N+1 di pemanggil
  }
  if (!res.ok) return out;
  const parts = parseBatchResponse(await res.text());
  // Cocokkan via msg.id yang dikembalikan server (bukan posisi): tahan terhadap
  // respons yang diurut-ulang/di-skip; part yang tak cocok → fallback per-pesan.
  for (const p of parts) {
    const msg = p?.ok ? (p.json as GmailMessage & { internalDate?: string }) : null;
    if (msg && msg.id && ids.includes(msg.id)) out.set(msg.id, msg);
  }
  return out;
}

export async function getMail(userId: string, id: string): Promise<Mail> {
  const res = await googleFetch(userId, `${GMAIL}/messages/${encodeURIComponent(id)}?format=full`);
  if (!res.ok) throw new Error("Gmail detail gagal: " + res.status);
  const full = (await res.json()) as GmailMessage & { internalDate?: string };
  return toMail(full, full.internalDate);
}

/** Encode header RFC2047 bila ada byte non-ASCII; ASCII murni dikirim apa adanya.
 *  CRLF selalu dibuang dulu (defense-in-depth lawan injeksi header MIME). */
export function encodeHeader(s: string): string {
  const clean = s.replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf-8").toString("base64")}?=`;
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
  const res = await googleFetch(userId, `${GMAIL}/messages/${encodeURIComponent(id)}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
  });
  if (!res.ok) throw new Error("Ubah label gagal: " + res.status);
}
