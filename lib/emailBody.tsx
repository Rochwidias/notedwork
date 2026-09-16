"use client";

import { Fragment, type ReactNode } from "react";

// Catatan: alternatif ")" di URL_RE sengaja dikecualikan agar "(lihat https://x/y)"
// tak menelan ")" kalimat. Konsekuensinya URL wiki "…/Foo_(bar)" terpotong di "("
// → dipulihkan oleh restoreBalancedTail() di bawah (kembalikan ")" yang seimbang).
const URL_RE = /https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+|[\w.+-]+@[\w-]+\.[\w.]+/g;

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

/** Pecah teks jadi [plain, label, url, plain, …] dgn URL berkurung-seimbang. */
function splitTokens(text: string): string[] {
  const parts: string[] = [];
  const re = /\[([^\[\]\n]{1,200})\]\(/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const url = readBalancedUrl(text, m.index + m[0].length - 1);
    if (url === null) continue;
    parts.push(text.slice(last, m.index), m[1], url);
    last = m.index + m[0].length + url.length + 1;
    re.lastIndex = last;
  }
  parts.push(text.slice(last));
  return parts;
}

/** Kembalikan ")" / "]" penutup yang ditelan URL_RE, bila seimbang dgn pembukanya.
 *  Batas: hanya intip ≤ 8 char ke depan agar tak menelan kalimat berikutnya. */
function restoreBalancedTail(url: string, after: string): string {
  let u = url;
  for (let k = 0; k < 8 && k < after.length; k++) {
    const c = after[k];
    if (c !== ")" && c !== "]") break;
    const open = c === ")" ? "(" : "[";
    const opens = u.split(open).length - 1;
    const closes = u.split(c).length - 1;
    if (opens > closes) u += c;
    else break;
  }
  return u;
}

/** Potong tanda baca di ekor bare-URL: [.,;:!?] selalu; ) ] hanya bila tak berpasangan.
 *  Urutan penting: paren/siku DULU (seimbang dipertahankan), titik-koma dkk TERAKHIR —
 *  kalau dibalik, "…Foo_(bar)" kehilangan ")" duluan. TRAIL_PUNCT tak dipakai di sini
 *  karena ia menelan ")" tanpa cek keseimbangan (dipakai hanya untuk "(…)" kalimat
 *  di versi lama — sekarang loop seimbang di atas yang menentukan). */
export function trimBareTail(raw: string): string {
  let u = raw.replace(/[.,;:!?]+$/, "");
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

function isSafeUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Label pendek untuk URL telanjang: host + /… + ekor; href+title tetap penuh. */
function shortUrl(raw: string, href: string): string {
  if (href.startsWith("mailto:")) return raw;
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    const path = (u.pathname + u.search).replace(/\/$/, "");
    if (!path || path === "/") return host;
    const s = host + path;
    return s.length > 45 ? host + "/…" + path.slice(-20) : s;
  } catch {
    return raw.length > 45 ? raw.slice(0, 42) + "…" : raw;
  }
}

/** Normalisasi temuan link: www. → https, email → mailto, http(s) apa adanya. */
function toHref(raw: string): string | null {
  if (raw.includes("@") && !/^https?:\/\//i.test(raw) && !raw.startsWith("www.")) {
    return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(raw) ? `mailto:${raw}` : null;
  }
  const url = raw.startsWith("www.") ? `https://${raw}` : raw;
  return isSafeUrl(url) ? url : null;
}

function linkNode(url: string, href: string, key: string): ReactNode {
  const label = href.startsWith("mailto:") || url === href ? url : shortUrl(url, href);
  return (
    <a key={key} href={href} title={href} target="_blank" rel="noopener noreferrer" className="mail-link">
      {label}
    </a>
  );
}

/** Hilangkan token [..](..)/[TABLE]/[PRE] → teks polos (untuk draf reply/fwd & subjek).
 *  Pemindaian manual berkurung-seimbang (bukan regex tunggal) agar URL wiki utuh. */
export function stripMailTokens(t: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const lb = t.indexOf("[", i);
    if (lb < 0) { out += t.slice(i); break; }
    const mid = t.indexOf("](", lb + 1);
    if (mid < 0 || mid - (lb + 1) > 200 || mid - (lb + 1) < 1 || /[\[\]\n]/.test(t.slice(lb + 1, mid))) {
      out += t.slice(i, lb + 1); i = lb + 1; continue;
    }
    const url = readBalancedUrl(t, mid + 1);
    if (url === null) { out += t.slice(i, mid + 2); i = mid + 2; continue; }
    const label = t.slice(lb + 1, mid);
    out += t.slice(i, lb) + (label === url ? ` ${url} ` : ` ${label} (${url}) `);
    i = mid + 2 + url.length + 1;
  }
  return out
    .replace(/\[TABLE\]|\[\/TABLE\]|\[PRE\]|\[\/PRE\]|\[H\]/g, "")
    .replace(/\[R\]/g, "")
    .replace(/[ \t]+\|/g, " |");
}

/** Pecah teks jadi potongan teks/tautan — token berlabel dulu, baru bare-URL. */
function linkifyText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  // Lapis 1: token [label](url) dari htmlToText — label diklik, URL di href+title.
  const parts = splitTokens(text);
  for (let p = 0; p < parts.length; p += 3) {
    const plain = parts[p] ?? "";
    if (plain) {
      // Lapis 2: bare-URL pada sisa teks (label pendek, href penuh).
      // "last" dimajukan sejauh karakter yang benar-benar dikonsumsi (match + restore),
      // agar ")" yang dipulihkan tak dirender ganda sebagai teks.
      let last = 0;
      for (const m of plain.matchAll(URL_RE)) {
        const idx = m.index ?? 0;
        const after = plain.slice(idx + m[0].length, idx + m[0].length + 8);
        const restored = restoreBalancedTail(m[0], after);
        const url = trimBareTail(restored);
        if (!url) continue;
        // Autolink Markdown <URL> / Label<URL> (khas body text/plain — jalur HTML
        // sudah dikupas htmlToText): telan kurung sudutnya agar tak tampil mentah.
        let start = idx;
        let end = idx + restored.length;
        if (start > last && plain[start - 1] === "<" && plain[end] === ">") {
          start -= 1;
          end += 1;
        }
        if (start > last) out.push(plain.slice(last, start));
        const href = toHref(url);
        out.push(href ? linkNode(url, href, `b${i}-${idx}`) : url);
        last = end;
        i++;
      }
      if (last < plain.length) out.push(plain.slice(last));
    }
    const label = parts[p + 1];
    const url = parts[p + 2];
    if (label !== undefined && url !== undefined) {
      out.push(
        isSafeUrl(url) ? (
          <a key={`t${i}`} href={url} title={url} target="_blank" rel="noopener noreferrer" className="mail-link">
            {label}
          </a>
        ) : (
          `${label} (${url})`
        )
      );
      i++;
    }
  }
  return out;
}

const FOOTER_MARKS = [
  "anda menerima email ini",
  "email ini dikirim otomatis",
  "email ini adalah pemberitahuan otomatis",
  "this email was sent to",
  "you received this email",
  "because you signed up",
  "because you subscribed",
  "unsubscribe",
  "berhenti berlangganan",
  "kelola preferensi email",
  "manage preferences",
  "update preferences",
  "email preferences",
  "lihat kebijakan privasi",
  "privacy policy",
  "terms apply",
  "introductory price",
  "price expires",
  "offer expires",
  "all rights reserved",
  "hak cipta dilindungi",
];

/** Baris penanda copyright: © + tahun atau kata copyright. */
function isCopyrightLine(l: string): boolean {
  const low = l.toLowerCase();
  if (low.includes("copyright")) return true;
  return /©.*\b(19|20)\d{2}\b/.test(l);
}

/** Baris footnote trailing (* …, 1. …, dsb.) tepat di atas footer. */
function isFootnoteLine(l: string): boolean {
  const t = l.trim();
  if (/^[\*†‡]\s*\S/.test(t)) return true;
  return /introductory price|price expires|offer expires|terms (and|&) conditions|billed .* after/i.test(t);
}

/** Pisahkan isi utama vs footer legalese (footer tetap tampil, dikecilkan). */
export function splitFooter(text: string): { main: string; footer: string | null } {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (l === "--" || l === "— — —") {
      if (i / Math.max(lines.length, 1) < 0.3) continue;
      return { main: lines.slice(0, i).join("\n").trimEnd(), footer: lines.slice(i + 1).join("\n").trim() || null };
    }
    const low = l.toLowerCase();
    if (isCopyrightLine(l) || FOOTER_MARKS.some((mk) => low.includes(mk))) {
      if (i / Math.max(lines.length, 1) < 0.3) continue;
      // Expand ke atas: footnote trailing ikut footer, jangan tertinggal di main.
      let start = i;
      while (start > 0 && isFootnoteLine(lines[start - 1])) start--;
      return { main: lines.slice(0, start).join("\n").trimEnd(), footer: lines.slice(start).join("\n").trim() || null };
    }
  }
  return { main: text, footer: null };
}

/** Sel tabel: pisah " | ", sel [H] jadi header, tiap sel di-linkify. */
function renderCells(line: string, keyBase: string): ReactNode {
  const cells = line
    .replace(/^\[R\]\s*/, "")
    .split(/\s*\|\s*/)
    .filter((c) => c !== "");
  return cells.map((c, j) => {
    const head = c.startsWith("[H]");
    const body = head ? c.slice(3).trim() : c;
    const kids = linkifyText(body);
    return head ? (
      <th key={`${keyBase}-${j}`}>{kids}</th>
    ) : (
      <td key={`${keyBase}-${j}`}>{kids}</td>
    );
  });
}

/** Body email: paragraf + tabel beneran + blok code + link + footer kecil. */
export function EmailBody({ text }: { text: string }) {
  const { main, footer } = splitFooter(text);
  const blocks: ReactNode[] = [];
  // Tabel tanpa pasangan [TABLE]…[/TABLE] (mis. baris [R] yatim dari tabel jadul)
  // tetap dirender sebagai <table> beneran — jangan biarkan token mentah ke layar.
  const tableish = /\[TABLE\][\s\S]*?\[\/TABLE\]|\[R\]/;
  const chunks = tableish.test(main)
    ? main.split(/(\n?\[TABLE\][\s\S]*?\[\/TABLE\]\n?|\n?\[PRE\]\n[\s\S]*?\n\[\/PRE\]\n?)/g)
    : main.split(/(\n?\[PRE\]\n[\s\S]*?\n\[\/PRE\]\n?)/g);
  chunks.forEach((ch, i) => {
    if (!ch || !ch.trim()) return;
    const pre = ch.match(/\[PRE\]\n([\s\S]*?)\n\[\/PRE\]/);
    if (pre) {
      blocks.push(
        <pre key={i} className="body-pre">
          {pre[1]}
        </pre>
      );
      return;
    }
    const tbl = ch.match(/\[TABLE\]([\s\S]*?)\[\/TABLE\]/);
    // Baris [R] yatim (tanpa [TABLE]…[/TABLE]) → bungkus jadi tabel beneran.
    const orphanRows = !tbl
      ? ch
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("[R]"))
      : [];
    if (tbl || orphanRows.length) {
      const rows = tbl
        ? tbl[1]
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.startsWith("[R]"))
        : orphanRows;
      if (rows.length) {
        blocks.push(
          <div key={i} className="table-scroll">
            <table className="mail-table">
              <tbody>
                {rows.map((r, j) => (
                  <tr key={j}>{renderCells(r, `${i}-${j}`)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return;
      }
    }
    ch.split(/\n{2,}/).forEach((para, k) => {
      if (!para.trim()) return;
      blocks.push(
        <p key={`${i}-${k}`} className="body-para">
          {para.split("\n").map((line, j, arr) => (
            <Fragment key={j}>
              {linkifyText(line)}
              {j < arr.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      );
    });
  });
  return (
    <>
      {blocks}
      {footer && (
        <div className="body-footer">
          <div className="body-footer-label">Info pengirim</div>
          {linkifyText(footer)}
        </div>
      )}
    </>
  );
}
