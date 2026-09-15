"use client";

import { Fragment, type ReactNode } from "react";

const URL_RE = /https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+|[\w.+-]+@[\w-]+\.[\w.]+/g;
const TRAIL_PUNCT = /[.,;:!?)\]}"'»”’]+$/;
/** Token link berlabel dari htmlToText: [label](url). */
const TOKEN_RE = /\[([^\[\]\n]{1,200})\]\((https?:\/\/[^\s()<>\"]+)\)/g;

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

/** Hilangkan token [..](..)/[TABLE]/[PRE] → teks polos (untuk draf reply/fwd & subjek). */
export function stripMailTokens(t: string): string {
  return t
    .replace(TOKEN_RE, (_m, label: string, url: string) => (label === url ? url : `${label} (${url})`))
    .replace(/\[TABLE\]|\[\/TABLE\]|\[PRE\]|\[\/PRE\]|\[H\]/g, "")
    .replace(/\[R\]/g, "")
    .replace(/[ \t]+\|/g, " |");
}

/** Pecah teks jadi potongan teks/tautan — token berlabel dulu, baru bare-URL. */
function linkifyText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  // Lapis 1: token [label](url) dari htmlToText — label diklik, URL di href+title.
  const parts = text.split(TOKEN_RE);
  for (let p = 0; p < parts.length; p += 3) {
    const plain = parts[p] ?? "";
    if (plain) {
      // Lapis 2: bare-URL pada sisa teks (label pendek, href penuh).
      let last = 0;
      for (const m of plain.matchAll(URL_RE)) {
        const idx = m.index ?? 0;
        const url = m[0].replace(TRAIL_PUNCT, "");
        if (!url) continue;
        if (idx > last) out.push(plain.slice(last, idx));
        const href = toHref(url);
        out.push(href ? linkNode(url, href, `b${i}-${idx}`) : url);
        last = idx + m[0].length - (m[0].length - url.length);
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
  const chunks = main.split(/(\n?\[TABLE\][\s\S]*?\[\/TABLE\]\n?|\n?\[PRE\]\n[\s\S]*?\n\[\/PRE\]\n?)/g);
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
    if (tbl) {
      const rows = tbl[1]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("[R]"));
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
