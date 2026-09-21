/** Rate-limit in-memory fixed-window per kunci (user/IP).
 *  Catatan: di Vercel serverless tiap instance punya memori sendiri,
 *  jadi ini pembatas lunak anti-spam/anti-bruteforce, bukan kuota keras
 *  global. Cukup untuk menahan penyalahgunaan gmail/send & login.
 *  Anti-injeksi: kunci dinormalisasi (maks 200 char, tanpa CRLF) agar
 *  tak bisa jadi bom memori via header X-Forwarded-For palsu.
 */

const buckets = new Map<string, { count: number; reset: number }>();

function normKey(s: string): string {
  return s
    .replace(/[\u0000-\u0020\u007f]+/g, "")
    .trim()
    .slice(0, 200);
}

/** IP client dari X-Forwarded-For (entri pertama) atau "unknown". */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const first = fwd ? fwd.split(",")[0].trim() : "";
  if (first && first.length <= 100 && !/[\r\n]/.test(first)) return normKey(first);
  const real = req.headers.get("x-real-ip") ?? "";
  if (real && real.length <= 100 && !/[\r\n]/.test(real)) return normKey(real);
  return "unknown";
}

/**
 * Cek & catat 1 hit. Return true bila BOLEH lanjut, false bila kena limit.
 * @param key identitas unik, mis. `send:user123` / `login:1.2.3.4`
 * @param limit maks hit per windowMs
 * @param windowMs lebar jendela, default 60 detik
 */
export function hitRateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const k = normKey(key);
  if (!k) return false;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || now >= b.reset) {
    buckets.set(k, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      // Bersihkan bucket kedaluwarsa agar memori tak membengkak.
      for (const [kk, vv] of buckets) if (now >= vv.reset) buckets.delete(kk);
    }
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** Respons 429 standar berbahasa Indonesia + header Retry-After. */
export function tooMany(): Response {
  return Response.json({ error: "Terlalu sering, coba lagi sebentar" }, {
    status: 429,
    headers: { "Retry-After": "60", "Cache-Control": "private, no-store" },
  });
}

/** Pola ID aman untuk Gmail/Calendar/Drive: huruf-angka-dash-underscore. */
export function validGoogleId(id: string, opts?: { allowGPrefix?: boolean }): string | null {
  let v = (id ?? "").trim();
  if (opts?.allowGPrefix && v.startsWith("g:")) v = v.slice(2);
  if (!v || v.length > 256) return null;
  if (!/^[A-Za-z0-9-_]{1,256}$/.test(v)) return null;
  return v;
}
