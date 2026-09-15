"use client";

import { Fragment, type ReactNode } from "react";

const URL_RE = /https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+|[\w.+-]+@[\w-]+\.[\w.]+/g;
const TRAIL_PUNCT = /[.,;:!?)\]}"'»”’]+$/;

function isSafeUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
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

/** Pecah teks jadi potongan teks/tautan — linkify aman tanpa HTML mentah. */
function linkifyText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    const url = m[0].replace(TRAIL_PUNCT, "");
    if (!url) continue;
    if (idx > last) out.push(text.slice(last, idx));
    const href = toHref(url);
    if (href) {
      out.push(
        <a key={`${i}-${idx}`} href={href} target="_blank" rel="noopener noreferrer" className="mail-link">
          {url}
        </a>
      );
    } else {
      out.push(url);
    }
    last = idx + m[0].length - (m[0].length - url.length);
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const FOOTER_MARKS = [
  "anda menerima email ini",
  "email ini dikirim otomatis",
  "email ini adalah pemberitahuan otomatis",
  "unsubscribe",
  "berhenti berlangganan",
  "kelola preferensi email",
  "lihat kebijakan privasi",
  "all rights reserved",
  "hak cipta dilindungi",
];

/** Baris penanda copyright: © + tahun atau kata copyright. */
function isCopyrightLine(l: string): boolean {
  const low = l.toLowerCase();
  if (low.includes("copyright")) return true;
  return /©.*\b(19|20)\d{2}\b/.test(l);
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
      return { main: lines.slice(0, i).join("\n").trimEnd(), footer: lines.slice(i).join("\n").trim() || null };
    }
  }
  return { main: text, footer: null };
}

/** Body email: paragraf rapi + link klikabel + footer kecil. */
export function EmailBody({ text }: { text: string }) {
  const { main, footer } = splitFooter(text);
  return (
    <>
      {main.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="body-para">
          {para.split("\n").map((line, j, arr) => (
            <Fragment key={j}>
              {linkifyText(line)}
              {j < arr.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      ))}
      {footer && <div className="body-footer">{linkifyText(footer)}</div>}
    </>
  );
}
