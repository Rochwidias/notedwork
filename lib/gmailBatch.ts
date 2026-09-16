// Batch Gmail: 1 round-trip untuk metadata banyak pesan (fallback N+1 di lib/gmail.ts).
// Murni (tanpa fetch) agar bisa diuji langsung (tests/repro-fix.mjs).

export const BATCH_URL = "https://gmail.googleapis.com/batch/gmail/v1";

const META_HEADERS = ["From", "Sender", "Reply-To", "Return-Path", "Subject"];

function metaQuery(): string {
  const p = new URLSearchParams({ format: "metadata" });
  for (const h of META_HEADERS) p.append("metadataHeaders", h);
  return p.toString();
}

/** Body multipart/mixed untuk batchGet metadata pesan. */
export function buildBatchBody(ids: string[], boundary: string): string {
  const q = metaQuery();
  const parts = ids.map(
    (id, i) =>
      `--${boundary}\r\n` +
      `Content-Type: application/http\r\n` +
      `Content-ID: <item-${i}>\r\n\r\n` +
      `GET /gmail/v1/users/me/messages/${id}?${q}\r\n`
  );
  return parts.join("") + `--${boundary}--`;
}

export interface BatchPart {
  index: number;
  ok: boolean;
  json: unknown;
}

/** Parser toleran respons multipart batch → per-part { index, ok, json }. */
export function parseBatchResponse(text: string): BatchPart[] {
  const norm = text.replace(/\r\n/g, "\n");
  const first = norm.split("\n").find((l) => l.startsWith("--") && l.trim() !== "--");
  if (!first) return [];
  const boundary = first.trim();
  const out: BatchPart[] = [];
  for (const raw of norm.split(boundary)) {
    const part = raw.trim();
    if (!part || part === "--") continue;
    // Buang header part (Content-Type/Content-ID) sampai baris kosong pertama.
    const headEnd = part.indexOf("\n\n");
    const http = headEnd >= 0 ? part.slice(headEnd + 2).trim() : part;
    const lines = http.split("\n");
    const status = lines[0] ?? "";
    const ok = /^HTTP\/\d(\.\d)?\s+2\d\d\b/.test(status);
    const bodyIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "");
    let json: unknown = null;
    if (bodyIdx >= 0) {
      const body = lines.slice(bodyIdx + 1).join("\n").trim();
      if (body) {
        try {
          json = JSON.parse(body);
        } catch {
          json = null;
        }
      }
    }
    out.push({ index: out.length, ok, json });
  }
  return out;
}
