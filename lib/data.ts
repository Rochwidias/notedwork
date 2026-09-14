export const LS = {
  sched: "rocha.schedules",
  read: "rocha.readMail",
  star: "rocha.star",
  arch: "rocha.arch",
  del: "rocha.del",
  tasks: "rocha.tasks",
  routine: "rocha.routine",
  theme: "rocha.theme",
  notif: "rocha.notif",
} as const;

/** Flag one-time cleanup agar data contoh era lama terhapus dari browser pengunjung. */
export const CLEANED_KEY = "rocha.v2cleaned";

/**
 * Hapus seluruh data lokal era contoh (sekali saja per browser).
 * Dipanggil saat aplikasi mount — setelah itu user mulai dari kondisi kosong
 * dan data baru hanya muncul setelah login Google.
 */
export function clearLegacyLocalData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(CLEANED_KEY)) return false;
    for (const k of Object.values(LS)) localStorage.removeItem(k);
    localStorage.setItem(CLEANED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
