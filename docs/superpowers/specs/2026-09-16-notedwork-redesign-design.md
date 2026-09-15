# notedwork Redesign — Spec Final (disetujui user 2026-09-16)

## 1. Keputusan terkunci (dari brainstorming visual)
- **Base visual: C — Kertas Netral.** Kanvas krem `#F7F4EE`, kartu putih `#FFFFFF`,
  teks `#292524`, muted `#A8A29E`, garis `#E8E1D4`, aksen default coklat `#B45309`.
- **Unisex.** Tanpa kesan feminim/maskulin/gaming/pastel pop.
- **Nol emoji di UI.** Semua ikon = SVG garis satu gaya (`components/icons.tsx`).
  Emoji boleh hanya di *konten user* (isi email dari Gmail) — bukan di chrome app.
- **Semua bisa dipencet.** Tiap kartu/baris/angka punya tujuan + tanda `›`.
  Satu tombol utama per layar. Tidak ada tombol mati: mode tamu semua jalan
  (data contoh), bukan ditolak. Layar kosong selalu ada tombol aksi.
- **Galeri Tema** di Profil: 5 preset + custom × Terang/Gelap/Otomatis,
  satu ketuk seluruh app ikut, tersimpan per HP (`localStorage`).

## 2. Struktur navigasi baru
- Tab bawah (HP): **Hari Ini · Email · Kalender · Tugas** (4 tab) + avatar → Profil.
- Desktop: sama + sidebar kiri.
- View `koneksi` DIHAPUS — status + login/logout gabung ke Profil.
- View `dashboard` diganti `beranda` (layar Hari Ini, komponen baru `HariIni.tsx`).
- Tombol `＋` selalu sama: buka sheet pilihan **Email / Tugas / Jadwal**
  (bukan berubah-ubah tergantung login). Email di mode tamu → sheet tetap
  terbuka, saat Kirim baru diberi tahu perlu login (kejujuran, bukan tombol mati).
- Preview (tamu) fully-interactive: tugas, rutin, DAN jadwal tersimpan lokal
  (`:preview`), email contoh bisa dibuka-baca.

## 3. Layar (5)
### 3.1 Hari Ini (baru, layar utama)
Urutan dari atas: kartu pengingat (`45 mnt lagi: X`, ketuk → detail + atur) →
"3 Terpenting" bernomor + centang di tempat → strip minggu (ketuk tanggal =
lompat, ikut bulan otomatis) → email penting (belum dibaca + terkait deadline)
→ tombol ＋. Semua baris ada `›` + bisa keyboard.
### 3.2 Email (disetujui, refine)
Daftar + cari + chip Semua/Baru/Bintang · detail + Balas/Teruskan/Lainnya
(Bintang, Arsip, Tandai belum dibaca) · tulis (Kepada/Subjek/Isi).
Perbaikan: debounce cari ±400ms + batalkan request basi · dedup pagination +
kunci dobel-klik "Muat lagi" · reset token saat query baru · pesan error jelas
saat detail gagal (jangan tampilkan snippet sebagai isi penuh) · draf TIDAK
hilang saat kirim gagal · baris keyboard-accessible.
### 3.3 Kalender (disetujui, refine)
SATU bagian agenda (hapus dobel "hari ini" + "tanggal dipilih") · bulan otomatis
ikut tanggal + tombol "kembali ke hari ini" · rutin mingguan + kelola (termasuk
Minggu, bug lama) · tambah: tanggal terisi otomatis + pilihan pengingat
5/15/30/60 mnt (default 15) · form tidak hilang saat simpan gagal · all-day =
"Seharian" (bukan 00:00) · lintas-hari diterima ("→ besok"), bukan ditolak.
### 3.4 Tugas (refine)
Filter Semua/Aktif/Telat/Selesai · centang di tempat · badge jelas ·
tambah 3 kolom wajib + pengingat · baris keyboard-accessible (bug lama).
### 3.5 Profil + Tema
Kartu akun (status Google, gabungan koneksi) · Galeri Tema · Pengingat ·
Tampilan · Koneksi · Info (Kredit/Privasi/Syarat). `GoogleConnect.tsx` dihapus,
`LoginGate.tsx` (dead code) dihapus.

## 4. Pengingat waktu (in-app dulu, Web Push nanti)
- Tiap jadwal & tugas punya `reminderMin?: number` (default 15, 0 = mati).
- Kartu pengingat di Hari Ini: hitung mundur otomatis ke kejadian terdekat.
- Saat tiba: bunyi + getar + banner — walau di tab lain (selama app terbuka).
- Tanpa setting wajib; default 15 mnt sebelum aktif.
- Implementasi: `lib/reminders.ts` (pure: pilih kejadian terdekat, format
  hitung mundur) + hook interval di `NotedworkApp` + bunyi WebAudio + vibrate.

## 5. Token desain (Kertas Netral)
- Light (default): `--bg:#F7F4EE --card:#FFFFFF --ink:#292524 --muted:#A8A29E
  --line:#E8E1D4 --input:#FFFFFF`, aksen default `#B45309`.
- Dark (warm, bukan hitam pekat): `--bg:#1C1917 --card:#292524 --ink:#F7F4EE
  --muted:#A8A29E --line:rgba(247,244,238,.12 --input:#292524`.
- Mode Otomatis = ikut `prefers-color-scheme` (listen perubahan).
- Aksen: preset unisex (coklat default + biru + hijau + ungu + merah tua) +
  custom. `applyAccent` dipertahankan (floor/kontras), disesuaikan ke base baru.

## 6. Bug yang WAJIB ikut sembuh (dari audit)
Sudah sembuh: CRLF `To:` (validasi ketat) · `isOverdue` time kosong ·
Rutin Minggu · SW cemari `/api/*`.
Belum (dikerjakan di eksekusi ini): search spam/race · pagination dup/closure ·
`exitPreview` gagal reseed · overflow aritmetika bulan (29–31 → Feb hilang) ·
timezone dibuang mentah (tampil jam salah) · form terhapus saat gagal ·
Gmail `id` tanpa encode · hidrasi timpa migrasi · `toggleStar` dobel-klik ·
ID `Date.now()` kembar · toast tanpa live-region + di dalam updater ·
`TasksView` tanpa keyboard · `TaskSheet` draf basi · validasi tanggal longgar.

## 7. Kriteria "matang" (definisi selesai)
- [ ] `npx tsc --noEmit` exit 0
- [ ] `node tests/repro.mjs` semua PASS (diperluas untuk helper baru)
- [ ] `npm run build` exit 0
- [ ] `npm run lint` exit 0 (perbaiki script `eslint` tanpa path → `eslint .`)
- [ ] Nol emoji di chrome UI (grep non-ASCII hanya tipografi — · … ›)
- [ ] Semua baris/angka/ikon utama bisa dipencet + keyboard + `›` affordance
- [ ] Mode tamu fully-interactive, keluar preview kembali ke contoh segar
