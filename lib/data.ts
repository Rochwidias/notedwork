export const LS = {
  sched: "notedwork.schedules",
  read: "notedwork.readMail",
  star: "notedwork.star",
  arch: "notedwork.arch",
  del: "notedwork.del",
  tasks: "notedwork.tasks",
  routine: "notedwork.routine",
  theme: "notedwork.theme",
  notif: "notedwork.notif",
} as const;

/** Flag lama era contoh — ikut dimigrasi/dibersihkan, jangan dipakai lagi. */
const LEGACY_CLEANED_KEY = "rocha.v2cleaned";

/** Flag one-time migrasi rocha.* → notedwork.* (nama baru = jalan sekali walau flag lama ada). */
export const MIGRATED_KEY = "notedwork.v3migrated";

/** Suffix kunci tamu preview — terisolasi dari akun asli & dari kunci telanjang. */
export const GUEST_SUFFIX = ":preview";

/** Nama tampilan tamu (lokal, bisa diubah di Profil). */
export const GUEST_NAME_KEY = "notedwork.guestName";

/** Accent warna pilihan user (hex, default coklat brand). */
export const ACCENT_KEY = "notedwork.accent";

/**
 * Migrasi one-time kunci lama rocha.* → notedwork.* tanpa hilang data.
 * Urutan: panggil ini DULU saat mount, sebelum state apa pun ditulis.
 * - Copy raw string verbatim (tanpa JSON.parse → nilai korup tak bisa throw).
 * - Copy-if-absent: bila kunci baru sudah ada, nilai baru menang.
 * - Kunci tasks/routine digabung menurut id bila keduanya ada (dedup id).
 * - Scan prefix "rocha." → kunci per-akun rocha.tasks:<email> ikut pindah otomatis.
 */
export function migrateRochaKeys(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return false;
    const keys = Object.keys(localStorage);
    const mergeable = new Set([`rocha.tasks`, `rocha.routine`]);
    for (const oldKey of keys) {
      if (!oldKey.startsWith("rocha.")) continue;
      if (oldKey === LEGACY_CLEANED_KEY) continue;
      const newKey = "notedwork." + oldKey.slice("rocha.".length);
      const oldRaw = localStorage.getItem(oldKey);
      if (oldRaw == null) {
        localStorage.removeItem(oldKey);
        continue;
      }
      const newRaw = localStorage.getItem(newKey);
      if (newRaw == null) {
        localStorage.setItem(newKey, oldRaw);
      } else if (mergeable.has(oldKey.split(":")[0]) && oldRaw !== newRaw) {
        const merged = mergeArraysById(oldRaw, newRaw);
        if (merged != null) localStorage.setItem(newKey, merged);
      }
      localStorage.removeItem(oldKey);
    }
    localStorage.removeItem(LEGACY_CLEANED_KEY);
    localStorage.setItem(MIGRATED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/** Gabung dua JSON array menurut field id (baru menang bila id sama). Null bila bukan array valid. */
function mergeArraysById(oldRaw: string, newRaw: string): string | null {
  try {
    const a = JSON.parse(oldRaw) as unknown;
    const b = JSON.parse(newRaw) as unknown;
    if (!Array.isArray(a) || !Array.isArray(b)) return null;
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const item of [...b, ...a]) {
      const id =
        typeof item === "object" && item !== null && "id" in item
          ? String((item as { id: unknown }).id)
          : JSON.stringify(item);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(item);
    }
    return JSON.stringify(out);
  } catch {
    return null;
  }
}

/**
 * @deprecated Era contoh — kini no-op demi keamanan data migrasi.
 * Dibiarkan agar caller lama tak error; panggil migrateRochaKeys() sebagai gantinya.
 */
export function clearLegacyLocalData(): boolean {
  return migrateRochaKeys();
}
