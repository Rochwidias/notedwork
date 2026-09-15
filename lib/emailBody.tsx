"use client";

import { Fragment, type ReactNode } from "react";

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const TRAIL_PUNCT = /[.,;:!?)\]}"'»”’]+$/;

function isSafeUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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
    if (isSafeUrl(url)) {
      out.push(
        <a key={`${i}-${idx}`} href={url} target="_blank" rel="noopener noreferrer" className="mail-link">
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
  "©",
  "anda menerima email ini",
  "email ini dikirim otomatis",
  "email ini adalah pemberitahuan otomatis",
  "unsubscribe",
  "berhenti berlangganan",
  "kelola preferensi email",
  "lihat kebijakan privasi",
];

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
    if (FOOTER_MARKS.some((mk) => low.includes(mk))) {
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
