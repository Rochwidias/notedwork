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
