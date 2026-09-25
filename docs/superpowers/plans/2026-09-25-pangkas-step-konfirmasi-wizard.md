# Pangkas Step Konfirmasi Wizard Tambah Cepat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pangkas wizard Tambah Cepat dari 3 langkah menjadi 2 (1 langkah untuk catatan) dengan menghapus layar konfirmasi "Langkah 3 — Cek" untuk item reversibel, sambil mempertahankan review khusus email.

**Architecture:** Satu komponen (`QuickAddSheet` di `components/Sheets.tsx`) + assertion statis di `tests/repro-cepat.mjs`. Dua konstanta baru (`maxStep`/`atFinal`) mengendalikan footer; `next()` memanggil `save()` langsung untuk kind non-mail; link "Lengkapi detail →" pindah ke langkah final non-mail. Tanpa perubahan `save()`, i18n, atau sheet lain.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node 22 (test `.mjs` statis, tanpa framework).

**Spec:** Persetujuan in-chat 2026-09-25 (rekomendasi: pangkas step 3; review dipertahankan khusus email karena kirim bersifat irreversibel) + `tests/repro-cepat.mjs` sebagai executable spec.

## Global Constraints

- `components/Sheets.tsx` adalah file `"use client"` — tidak ada API/server-code di dalamnya.
- Dilarang menambah dependensi baru atau i18n key baru — pakai ulang key yang ada.
- Paritas i18n ID+EN tidak boleh rusak (tidak ada key yang dihapus dalam plan ini).
- Test runner: `node tests/repro-cepat.mjs` dan full `npm test` harus PASS; `npx tsc --noEmit` harus bersih.
- Sheet lain (`TaskSheet`, `NoteSheet`, `SchedSheet`, `MailSheet`, `TambahSheet`) dan fungsi `save()` tidak disentuh.
- Kerja di branch baru `feat/wizard-tanpa-review` dari `main`; tidak ada push langsung ke `main`.
- Setiap commit diakhiri `Co-Authored-By: Claude Code <noreply@anthropic.com>`.

## Review Focus

- Email harus tetap 3 langkah (body di langkah 2, review di langkah 3, kirim dari sana); orang yang menguji alur email mengharapkan layar cek sebelum terkirim — dipin oleh test "email tetap lewat langkah 3" di Task 2.
- Catatan dengan body kosong: tombol Simpan di langkah 1 harus menampilkan error inline "Isi wajib diisi", bukan menyimpan kosong atau crash — dipin oleh validasi `save()` yang ada; diverifikasi smoke Task 4.
- Jalur form lengkap via "Lengkapi detail →" (`onOpenDetail` → `TaskSheet`/`NoteSheet`/`SchedSheet`/`MailSheet`) harus tetap reachable — dipin oleh test Task 3.
- Spam-klik Simpan harus menghasilkan tepat 1 item (`savingRef` guard) — dipin oleh test pin Task 2.
- Key `quick.step3` ID+EN harus tetap ada karena alur email memakainya di hint — dipin oleh test i18n Task 2.

---

### Task 1: Betulkan assertion agenda yang basi (test-only, green baseline)

**Files:**
- Modify: `tests/repro-cepat.mjs` (blok check "Agenda: hari kanan ikut warna urgensi", sekitar baris 227-231)

**Interfaces:**
- Consumes: tidak ada.
- Produces: `node tests/repro-cepat.mjs` hijau sebagai baseline; tidak ada export/nama baru.

**Konteks:** Commit `fb1d321` menggabung hari + jam agenda ke dalam satu pill (`{dayFull} • {fmtSchedRange(...)}`), sehingga check lama yang mencari `var(--red|amber|green)` di blok `next7` selalu FAIL. Suite harus hijau dulu sebelum Task 2/3 menambah check baru.

- [ ] **Step 1: Buat branch + tunjukkan FAIL saat ini**

```bash
git checkout -b feat/wizard-tanpa-review main
node tests/repro-cepat.mjs 2>&1 | tail -8
```

Expected: FAIL pada `Agenda: hari kanan ikut warna urgensi`.

- [ ] **Step 2: Ganti check basi dengan assertion pill gabungan**

Ganti blok ini di `tests/repro-cepat.mjs`:

```js
check(
  "Agenda: hari kanan ikut warna urgensi",
  /var\(--(red|amber|green)\)/.test(agendaBlock),
  "hari kanan belum berwarna urgensi"
);
```

dengan:

```js
check(
  "Agenda: hari + jam gabung dalam satu pill",
  agendaBlock.includes("dayFull") && agendaBlock.includes("pill ${") && !agendaBlock.includes("urgColor"),
  "blok next7 belum gabung hari+jam dalam satu pill"
);
```

- [ ] **Step 3: Verifikasi test target PASS**

```bash
node tests/repro-cepat.mjs 2>&1 | tail -5
```

Expected: `Semua checks PASS`.

- [ ] **Step 4: Verifikasi full suite tidak collateral**

```bash
npm test 2>&1 | tail -5
```

Expected: semua file repro PASS (exit 0).

- [ ] **Step 5: Commit**

```bash
git add tests/repro-cepat.mjs
git commit -m "test: sesuaikan assertion agenda dengan pill gabungan hari+jam

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Inti — simpan langsung tanpa review (task/sched/note), email tetap review

**Files:**
- Modify: `components/Sheets.tsx` (`QuickAddSheet`: tambah `maxStep`/`atFinal` ~baris 1052; tulis ulang `next()` baris 1064-1092; sederhanakan footer baris 1368-1387)
- Test: `tests/repro-cepat.mjs` (tambah 6 check sebelum baris `console.log(failures ...)` di akhir file)

**Interfaces:**
- Consumes: state `step: 1 | 2 | 3` (Sheets.tsx:1011), `kind: QuickKind` (Sheets.tsx:1012), `save()` (Sheets.tsx:1102-1144, tidak diubah), props `onSave*` (tidak diubah).
- Produces (dipakai Task 3 dengan nama exact ini): `maxStep: 2 | 3` (`kind === "mail" ? 3 : 2`), `atFinal: boolean` (`step === maxStep || kind === "note"`).

- [ ] **Step 1: Tulis failing test (6 check baru)**

Sisipkan blok berikut tepat sebelum baris `console.log(failures ? ...` di akhir `tests/repro-cepat.mjs` (variabel `quickSrc`, `sheets`, `i18n` sudah ada di file):

```js
const quickAll = sheets.slice(sheets.indexOf("export function QuickAddSheet"));
// 22b. Review (langkah 3) hanya untuk email.
check(
  "QuickAddSheet: maxStep review hanya email",
  /const maxStep = kind === "mail" \? 3 : 2/.test(quickAll),
  "tidak ada maxStep mail-only di QuickAddSheet"
);
check(
  "QuickAddSheet: footer pakai atFinal/maxStep",
  /const atFinal = step === maxStep \|\| kind === "note"/.test(quickAll) && /step === maxStep/.test(quickAll),
  "footer belum pakai atFinal/maxStep"
);
check(
  "QuickAddSheet: note simpan langsung dari langkah 1",
  /if \(kind === "note"\) \{\s*void save\(\);/.test(quickAll),
  "note belum void save() langsung"
);
check(
  "QuickAddSheet: email tetap lewat langkah 3",
  /if \(kind === "mail"\) \{\s*if \(!detail\.trim\(\)\)[\s\S]{0,200}?setStep\(3\)/.test(quickAll),
  "cabang mail setStep(3) hilang"
);
check(
  "QuickAddSheet: kunci anti double-submit utuh",
  /savingRef\.current = true/.test(quickAll),
  "guard savingRef hilang"
);
check(
  "i18n: quick.step3 tetap ada (dipakai alur email)",
  /"quick\.step3"/.test(i18n),
  "quick.step3 terhapus padahal email memakainya"
);
```

- [ ] **Step 2: Jalankan test, pastikan 4 check baru FAIL (2 pin PASS)**

```bash
node tests/repro-cepat.mjs 2>&1 | tail -10
```

Expected: FAIL pada `maxStep review hanya email`, `footer pakai atFinal/maxStep`, `note simpan langsung`, `email tetap lewat langkah 3`. Dua check pin (`anti double-submit`, `quick.step3 tetap ada`) PASS — itu disengaja, mereka mengunci perilaku yang tidak boleh berubah.

- [ ] **Step 3: Tambah `maxStep`/`atFinal` (edit 1)**

`old_string` (Sheets.tsx ~baris 1052):

```tsx
  const needWhen = kind === "task" || kind === "sched";
```

`new_string`:

```tsx
  const needWhen = kind === "task" || kind === "sched";
  // Review (langkah 3) hanya untuk email — kirim bersifat irreversibel.
  // Tugas/jadwal/catatan lokal-first (bisa ubah/hapus) langsung simpan.
  const maxStep = kind === "mail" ? 3 : 2;
  const atFinal = step === maxStep || kind === "note";
```

- [ ] **Step 4: Tulis ulang `next()` (edit 2)**

`old_string` (Sheets.tsx baris 1064-1092):

```tsx
  const next = () => {
    if (step === 1) {
      if (!titleOk) {
        setTitleErr(t("quick.titleRequired"));
        return;
      }
      setTitleErr("");
      if (kind === "mail" && !toOk) {
        setToErr(t("mail.toInvalid"));
        return;
      }
      setToErr("");
      if (kind === "note" && !detail.trim()) {
        setDetailErr(t("quick.noteBodyRequired"));
        return;
      }
      setDetailErr("");
      setStep(kind === "note" ? 3 : 2);
      return;
    }
    if (step === 2) {
      if (kind === "mail" && !detail.trim()) {
        setDetailErr(t("quick.bodyRequired"));
        return;
      }
      setDetailErr("");
      setStep(3);
    }
  };
```

`new_string`:

```tsx
  const next = () => {
    if (step === 1) {
      if (!titleOk) {
        setTitleErr(t("quick.titleRequired"));
        return;
      }
      setTitleErr("");
      if (kind === "mail" && !toOk) {
        setToErr(t("mail.toInvalid"));
        return;
      }
      setToErr("");
      if (kind === "note" && !detail.trim()) {
        setDetailErr(t("quick.noteBodyRequired"));
        return;
      }
      setDetailErr("");
      // Catatan tak punya langkah Kapan — langsung simpan dari langkah 1.
      if (kind === "note") {
        void save();
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      // Hanya email yang lanjut ke review (langkah 3); sisanya simpan langsung.
      if (kind === "mail") {
        if (!detail.trim()) {
          setDetailErr(t("quick.bodyRequired"));
          return;
        }
        setDetailErr("");
        setStep(3);
        return;
      }
      setDetailErr("");
      void save();
    }
  };
```

Catatan: `save` dideklarasikan di bawah `next` (baris 1102) — aman karena dipanggil saat runtime (closure), bukan saat inisialisasi. Bila `tsc`/lint protes `use-before-define`, pindahkan seluruh blok `const save = ...` ke atas `const next = ...` tanpa mengubah isinya.

- [ ] **Step 5: Sederhanakan footer (edit 3)**

`old_string` (Sheets.tsx baris 1369-1386):

```tsx
        {step > 1 ? (
          <button type="button" className="btn ghost" onClick={() => setStep((s) => (s === 3 && kind === "note" ? 1 : ((s - 1) as 1 | 2 | 3)))} disabled={saving}>
            {t("quick.back")}
          </button>
        ) : (
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            {t("common.close")}
          </button>
        )}
        {step < 3 ? (
          <button type="button" className="btn primary" onClick={next} disabled={!titleOk}>
            {t("quick.next")}
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={save} disabled={saving || !titleOk} aria-busy={saving}>
            {saving ? t("task.saving") : t("common.save")}
          </button>
        )}
```

`new_string`:

```tsx
        {step > 1 ? (
          <button type="button" className="btn ghost" onClick={() => setStep((s) => ((s - 1) as 1 | 2 | 3))} disabled={saving}>
            {t("quick.back")}
          </button>
        ) : (
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            {t("common.close")}
          </button>
        )}
        {atFinal ? (
          <button type="button" className="btn primary" onClick={save} disabled={saving || !titleOk} aria-busy={saving}>
            {saving ? t("task.saving") : t("common.save")}
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={next} disabled={!titleOk}>
            {t("quick.next")}
          </button>
        )}
```

Hasil perilaku: tugas/jadwal = langkah 1 (Lanjut) → langkah 2 (Simpan); catatan = langkah 1 (Simpan langsung); email = langkah 1 → 2 → 3 (Simpan) seperti semula.

- [ ] **Step 6: Verifikasi test + typecheck + full suite**

```bash
node tests/repro-cepat.mjs 2>&1 | tail -3
npx tsc --noEmit
npm test 2>&1 | tail -3
```

Expected: `Semua checks PASS`; `tsc` tanpa output; `npm test` exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/Sheets.tsx tests/repro-cepat.mjs
git commit -m "feat: wizard tambah cepat tanpa layar konfirmasi kecuali email

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Pindahkan "Lengkapi detail →" ke langkah final non-mail

**Files:**
- Modify: `components/Sheets.tsx` (`QuickAddSheet`: sisipkan blok link tepat sebelum `<div className="actions">` di footer; blok ringkasan langkah 3 milik email dibiarkan utuh termasuk link-nya)
- Test: `tests/repro-cepat.mjs` (1 check baru, sisipkan di samping check Task 2)

**Interfaces:**
- Consumes: `maxStep`, `atFinal` (nama exact dari Task 2), prop `onOpenDetail(kind)` (tidak diubah), key `quick.detailLink` (tidak diubah).
- Produces: penempatan link; tidak ada downstream kecuali smoke Task 4.

**Konteks:** Link "Lengkapi detail →" (lompat ke form lengkap `TaskSheet`/`NoteSheet`/`SchedSheet`) hari ini tinggal di blok ringkasan langkah 3. Setelah Task 2, langkah 3 tak lagi reachable untuk non-mail — link harus pindah ke langkah final masing-masing (langkah 1 untuk catatan, langkah 2 untuk tugas/jadwal). Link di langkah 3 tetap ada untuk email.

- [ ] **Step 1: Tulis failing test (1 check)**

Sisipkan di samping check Task 2, sebelum `console.log(failures ...`:

```js
check(
  "QuickAddSheet: link detail di langkah final non-mail",
  /kind !== "mail" && atFinal/.test(quickAll) && /onOpenDetail\(kind\)/.test(quickAll),
  "link Lengkapi detail belum pindah ke langkah final non-mail"
);
```

- [ ] **Step 2: Jalankan test, pastikan check baru FAIL**

```bash
node tests/repro-cepat.mjs 2>&1 | tail -5
```

Expected: FAIL hanya pada `link detail di langkah final non-mail`.

- [ ] **Step 3: Sisipkan blok link (murni tambahan, tanpa hapus)**

`old_string` (tepat sebelum footer, Sheets.tsx ~baris 1368):

```tsx
      <div className="actions">
        {step > 1 ? (
```

`new_string`:

```tsx
      {kind !== "mail" && atFinal && (
        <button
          type="button"
          onClick={() => onOpenDetail(kind)}
          style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 13, padding: "2px 0 8px", cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
        >
          {t("quick.detailLink")} →
        </button>
      )}
      <div className="actions">
        {step > 1 ? (
```

Style disalin persis dari link langkah 3 (baris 1359-1365) agar konsisten; hanya padding vertikal disesuaikan karena konteksnya footer, bukan ringkasan.

- [ ] **Step 4: Verifikasi test + typecheck**

```bash
node tests/repro-cepat.mjs 2>&1 | tail -3
npx tsc --noEmit
```

Expected: `Semua checks PASS`; `tsc` tanpa output.

- [ ] **Step 5: Commit**

```bash
git add components/Sheets.tsx tests/repro-cepat.mjs
git commit -m "feat: pindahkan link lengkapi-detail ke langkah final non-mail

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Smoke test dev-server (Playwright/observasi) + full suite

**Files:** tidak ada (tanpa perubahan file, tanpa commit).

**Interfaces:**
- Consumes: branch `feat/wizard-tanpa-review` dengan Task 1-3 selesai.
- Produces: bukti uji manual (screenshot + laporan lisan); bukan kode.

- [ ] **Step 1: Nyalakan dev-server**

```bash
npm run dev
```

Expected: `Ready on http://localhost:3000` (biarkan jalan di background selama smoke).

- [ ] **Step 2: Smoke tambah tugas = 2 langkah**

Buka `http://localhost:3000` → tombol Tambah → isi judul → Lanjut → (langkah 2: tanggal + slider jam) → pastikan tombol primer bertuliskan **Simpan** (bukan Lanjut) → klik Simpan → tugas muncul di daftar Tugas. Screenshot daftar tugas.

Expected: tidak ada layar "Langkah 3 — Cek".

- [ ] **Step 3: Smoke tambah email = tetap 3 langkah (tanpa mengirim)**

Tab Email → Tulis → isi To + subjek → Lanjut → isi body → pastikan tombol primer bertuliskan **Lanjut** → klik → layar ringkasan langkah 3 muncul → tutup wizard **tanpa** klik Simpan (jangan kirim email uji ke alamat asli).

Expected: review email utuh; tidak ada email terkirim.

- [ ] **Step 4: Smoke tambah catatan = 1 langkah, lalu bersih-bersih**

Tab Catatan → Tambah → isi judul + isi → pastikan tombol primer langsung **Simpan** di langkah 1 → klik → catatan muncul → hapus catatan uji via dialog konfirmasi.

Expected: tidak ada langkah 2/3 untuk catatan; daftar kembali kosong.

- [ ] **Step 5: Full suite + matikan server**

```bash
npm test 2>&1 | tail -3
```

Expected: exit 0. Matikan dev-server. Tanpa commit — tidak ada perubahan file pada task ini; laporkan hasil smoke (lolos/gagal + screenshot) sebagai penutup plan.
