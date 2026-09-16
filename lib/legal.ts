export type LegalId = "credit" | "privacy" | "terms";

export interface LegalDoc {
  title: string;
  updated: string;
  body: string[];
}

export const LEGAL: Record<LegalId, LegalDoc> = {
  credit: {
    title: "Kredit",
    updated: "notedwork • 2026",
    body: [
      "notedwork adalah dashboard email, tugas & kalender untuk mahasiswa — dibuat sebagai proyek pribadi oleh @Rochwidias.",
      "Dibangun dengan Next.js, React, TypeScript, dan Tailwind CSS, di-deploy di Vercel. Font Poppins & JetBrains Mono (Google Fonts).",
      "Data email & kalender berasal dari Gmail API dan Google Calendar API milik akun Googlemu sendiri. Gmail dan Google Calendar adalah merek milik Google LLC.",
      "Ikon & antarmuka dibuat khusus untuk notedwork. Warna aksen default coklat (#B45309) — bisa kamu ganti di Pengaturan.",
    ],
  },
  privacy: {
    title: "Privasi",
    updated: "Diperbarui September 2026",
    body: [
      "Local-first: tugas, jadwal rutin, tema, warna, nama tamu & preferensi notifikasi tersimpan HANYA di browser perangkatmu (localStorage). notedwork tidak punya database untuk data tersebut dan tidak menjual data apa pun.",
      "Login Google memakai OAuth2 resmi. Izin yang diminta: gmail.readonly (membaca email), gmail.send (mengirim email), gmail.modify (bintang/arsip/tandai baca), calendar.readonly (membaca event), calendar.events (tambah/hapus event). Tanpa izin ini fitur terkait tidak jalan — mode pratinjau tetap bisa dipakai tanpa login.",
      "Token OAuth disimpan terenkripsi (AES-GCM 256-bit) di server notedwork (Supabase, akses terbatas server-only). Browser-mu tidak pernah memegang token; yang ada hanya cookie sesi httpOnly 30 hari (notedwork_session).",
      "Putus koneksi kapan saja via Profil → Keluar: token server dicabut & sesi dihapus. Untuk mencabut total, hapus juga akses notedwork di akun Google (Keamanan → Akses pihak ketiga). Tugas lokal tetap ada sampai kamu hapus data situs di browser.",
      "Tidak ada iklan, tidak ada pelacakan lintas situs, tidak ada analitik pihak ketiga di aplikasi ini.",
    ],
  },
  terms: {
    title: "Syarat Penggunaan",
    updated: "Diperbarui September 2026",
    body: [
      "notedwork disediakan apa adanya (as-is) untuk pemakaian studi pribadi. Tidak ada jaminan uptime, dan fitur Google mengikuti kuota & kebijakan Google.",
      "Akun Google & isinya tetap milikmu. Kamu bertanggung jawab atas email yang kamu kirim dan event yang kamu buat lewat aplikasi ini.",
      "Gunakan secara wajar: dilarang spam, penyalahgunaan, atau otomasi berlebih yang melanggar kebijakan Google — akses API bisa dibatasi Google bila disalahgunakan.",
      "Keluar dari Google akan mencabut token server & menghapus sesi di perangkat itu; tugas & rutin lokal tidak ikut terhapus. Mode pratinjau memakai data contoh fiktif — bukan data asli siapa pun.",
      "Syarat ini dapat berubah; versi terbaru selalu tersedia di aplikasi (Profil → Syarat). Pemakaian berkelanjutan berarti kamu setuju dengan versi terbaru.",
    ],
  },
};
