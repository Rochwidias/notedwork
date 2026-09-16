// Identitas stabil akun Google: kunci rename aman saat email primer diganti.
// Murni (tanpa DB) agar bisa diuji langsung (tests/repro-fix.mjs).

/**
 * Tentukan kunci identitas login.
 * - userId: selalu email lowercase (format PK yang sudah ada — stabil).
 * - prevKey: baris lama yang harus di-rename (ditemukan via google_sub),
 *   sama dengan userId bila tak ada rename.
 */
export function resolveIdentityKeys(
  bySubUserId: string | null,
  email: string
): { userId: string; prevKey: string } {
  const userId = email.toLowerCase();
  const prev = (bySubUserId ?? "").trim().toLowerCase();
  if (prev && prev !== userId) return { userId, prevKey: prev };
  return { userId, prevKey: userId };
}

/**
 * Deteksi error "kolom google_sub belum ada" (migrasi SQL belum dijalankan).
 * Dipakai saveTokensFromCode agar bisa login via jalur lama (tanpa google_sub)
 * alih-alih gagal total — lalu coba tulis kolom bila sudah ada (best-effort).
 *
 * Bentuk error Supabase/PostgREST bermacam-macam:
 * - Error.message: 'column "google_sub" of relation ... does not exist'
 * - Kode PGRST204 ('column ... not found in schema cache') di message/details/hint/code
 *   — bisa berupa string, objek { message, details, hint, code }, atau dibungkus.
 */
export function isMissingColumnError(e: unknown): boolean {
  const texts: string[] = [];
  const collect = (v: unknown, depth: number): void => {
    if (v == null || depth > 3) return;
    if (typeof v === "string") {
      texts.push(v);
      return;
    }
    if (v instanceof Error) {
      texts.push(v.message);
      collect((v as { cause?: unknown }).cause, depth + 1);
      return;
    }
    if (typeof v === "object") {
      for (const k of ["message", "details", "hint", "code", "error", "msg"]) {
        const inner = (v as Record<string, unknown>)[k];
        if (typeof inner === "string") texts.push(inner);
        else if (inner != null && typeof inner === "object") collect(inner, depth + 1);
      }
    }
  };
  collect(e, 0);
  const all = texts.join("\n");
  if (/google_sub/i.test(all)) return true;
  if (/PGRST204/.test(all)) return true;
  return /column .* does not exist/i.test(all);
}

/** "Baris tidak ketemu" (.single() tanpa hasil) — bukan error kolom hilang. */
export function isNoRowError(e: unknown): boolean {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "string"
        ? e
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message?: unknown }).message ?? "")
          : "";
  return /PGRST116/i.test(msg) || /Results contain 0 rows/i.test(msg) || /row.*not found/i.test(msg);
}
