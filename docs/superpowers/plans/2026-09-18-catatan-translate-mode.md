# Fix Catatan + Mode Translate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** View Catatan bisa dipakai penuh (tambah/ubah/hapus catatan, tombol + di header view + opsi di picker), dan ada tombol mode bahasa ID/EN di sebelah toggle tema dark/light di TopBar.

**Architecture:** Ikuti pola yang sudah ada — state catatan via `useLocalStorage` per-akun (`notedwork.notes:<email>` / `:preview`) seperti tasks; `NoteSheet` meniru `TaskSheet`; `LangProvider` meniru `ThemeProvider` (context + localStorage `notedwork.lang`); kamus string di `lib/i18n.ts`. Tanpa backend baru, tanpa scope OAuth baru (sinkron Google Keep = follow-up, bukan bagian plan ini).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 3 + CSS variables, localStorage per-akun.

**Spec:** Permintaan user (chat 2026-09-18): (1) fix catatan yang dead-end (FAB picker tidak ada opsi catatan), (2) tombol + di sebelah/di header Catatan, (3) tombol translate mode di sebelah toggle dark/light mode, (4) bikin plan dulu.

## Global Constraints

- Branch kerja: `feat/google-keep-api` (repo C:\Project\notedwork).
- Bahasa default tetap Indonesia (`id`); tidak ada i18n library (tanpa next-intl).
- Hydration-safe: baca localStorage hanya saat mount (tirukan `ThemeProvider` + `useLocalStorage` di `lib/store.ts`).
- Kunci storage per-akun: suffix `:${email.toLowerCase()}` saat login, `:preview` saat tamu (tirukan `userSuffix` di `NotedworkApp.tsx:90`).
- Verifikasi tiap task: `npm test` (node `tests/repro*.mjs`) + `npm run build` harus exit 0.
- Commit kecil per task dengan pesan mengikuti gaya repo (`feat(catatan): ...`, `feat(i18n): ...`, `fix(catatan): ...`).

## File Map

- Ubah: `lib/types.ts` — tambah `Note`, `ViewName` + `"catatan"`, komentar `ViewName`.
- Ubah: `lib/data.ts` — tambah `notes: "notedwork.notes"` di `LS`.
- Buat: `components/NotesView.tsx` — daftar + header berisi tombol + (pengganti stub worktree yang hanya di `.claude/worktrees/note-feature/`, JANGAN pakai file worktree).
- Buat: `NoteSheet` di `components/Sheets.tsx` — tambah `| "note"` ke `SheetId` (baris 8), tambah komponen sheet.
- Ubah: `components/Sheets.tsx` `TambahSheet` (~baris 278–336) — tambah baris opsi "Tambah Catatan".
- Ubah: `components/AppNav.tsx` — tambah tab Catatan di `MAIN_TABS` (+ label lewat kamus bahasa).
- Ubah: `components/icons.tsx` — tambah `IconNote` + `IconGlobe`.
- Ubah: `components/NotedworkApp.tsx` — state notes, render view `catatan`, render `NoteSheet`, mapping `onPick("note")`.
- Buat: `lib/i18n.ts` — tipe `Lang`, `LANG_KEY`, kamus `STRINGS`.
- Buat: `components/LangProvider.tsx` — context bahasa (tirukan `ThemeProvider.tsx`).
- Ubah: `components/TopBar.tsx` — tombol bahasa di sebelah tombol tema.
- Buat: `tests/repro-notes-keys.mjs`, `tests/repro-i18n-parity.mjs` — assert statis + paritas kamus.

---

### Task 1: Tipe Note + kunci storage

**Files:**
- Modify: `lib/types.ts:50-69`
- Modify: `lib/data.ts:1-11`
- Test: `tests/repro-notes-keys.mjs` (create)

**Interfaces:**
- Consumes: tidak ada (task pertama).
- Produces: `Note { id, title, body, updatedAt }`, `ViewName` mencakup `"catatan"`, `LS.notes = "notedwork.notes"` — dipakai Task 2–5.

- [ ] **Step 1: Tambah interface + view + kunci**

```ts
// lib/types.ts — setelah interface Task (baris 63), sebelum ViewName:
export interface Note {
  id: string;
  title: string;
  body: string;
  /** epoch ms terakhir diubah; untuk urutan terbaru dulu. */
  updatedAt: number;
}
```

```ts
// lib/types.ts baris 66 — ganti jadi:
/** Layar utama: beranda (Hari Ini) + email + tugas + kalender + catatan + profil. */
export type ViewName = "beranda" | "email" | "tugas" | "kalender" | "catatan" | "profil";
```

```ts
// lib/data.ts — dalam objek LS, setelah routine:
  notes: "notedwork.notes",
```

- [ ] **Step 2: Tulis test assert statis**

```js
// tests/repro-notes-keys.mjs
import { readFileSync } from "node:fs";
const types = readFileSync("lib/types.ts", "utf8");
const data = readFileSync("lib/data.ts", "utf8");
const checks = [
  ["interface Note", types.includes("export interface Note")],
  ["Note.updatedAt", types.includes("updatedAt: number")],
  ['ViewName catatan', types.includes('"catatan"')],
  ['LS.notes', data.includes('notes: "notedwork.notes"')],
];
let fail = 0;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`), ok || fail++;
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Daftarkan ke npm test** — buka `package.json`, tambah `node tests/repro-notes-keys.mjs` ke script `test` (rantai `&&` seperti entri lain).

- [ ] **Step 4: Run test**

Run: `npm test`
Expected: semua PASS termasuk `repro-notes-keys.mjs` (4/4)

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/data.ts tests/repro-notes-keys.mjs package.json
git commit -m "feat(catatan): tipe Note + ViewName catatan + kunci LS"
```

---

### Task 2: NotesView (daftar + tombol + di header)

**Files:**
- Create: `components/NotesView.tsx`
- Consumes: `Note` (Task 1), `t()` dari `useLang` (dibuat Task 6 — untuk sekarang terima prop `t: (k: string) => string` agar task ini mandiri; Task 6 menyediakan implementasinya, Task 7 menyambungkan).
- Produces: `NotesView({ notes, t, onAdd, onEdit, onDelete })`.

Kontrak props (jangan diubah Task lain tanpa update ini):

```ts
interface NotesViewProps {
  notes: Note[];            // sudah urut terbaru dulu (diurutkan pemanggil)
  t: (key: string) => string;
  onAdd: () => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}
```

Kunci kamus yang dipakai view ini (harus ada di Task 6): `notes.title`, `notes.add`, `notes.empty`, `notes.emptyHint`, `notes.edit`, `notes.delete`, `notes.updatedNow`, `common.cancel`.

- [ ] **Step 1: Tulis komponen**

```tsx
"use client";

import type { Note } from "@/lib/types";
import { IconPlus, IconPencil, IconTrash } from "./icons";

interface NotesViewProps {
  notes: Note[];
  t: (key: string) => string;
  onAdd: () => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

export default function NotesView({ notes, t, onAdd, onEdit, onDelete }: NotesViewProps) {
  return (
    <section aria-label={t("notes.title")}>
      <div className="view-head">
        <h1>{t("notes.title")}</h1>
        <button type="button" className="btn primary" onClick={onAdd} aria-label={t("notes.add")}>
          + {t("notes.add")}
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="empty">
          <p>{t("notes.empty")}</p>
          <p className="hint">{t("notes.emptyHint")}</p>
        </div>
      ) : (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className="card">
              <div className="t">{n.title}</div>
              <div className="s">{n.body}</div>
              <div className="row-actions">
                <button type="button" className="btn ghost" onClick={() => onEdit(n)} aria-label={`${t("notes.edit")}: ${n.title}`}>
                  <IconPencil size={15} /> {t("notes.edit")}
                </button>
                <button type="button" className="btn ghost danger" onClick={() => onDelete(n.id)} aria-label={`${t("notes.delete")}: ${n.title}`}>
                  <IconTrash size={15} /> {t("notes.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Catatan: kelas CSS (`view-head`, `empty`, `note-list`, `card`, `row-actions`, `btn`, `ghost`, `danger`, `hint`, `t`, `s`) adalah kelas yang SUDAH dipakai di view lain (орот TasksView/CalendarView). Jangan buat CSS baru kecuali satu kelas hilang — cek `app/globals.css` dulu, tambahkan hanya yang belum ada.

- [ ] **Step 2: Verifikasi build parsial**

Run: `npm run build`
Expected: exit 0 (error `t`/`useLang` belum dipakai di sini — prop `t` dioper pemanggil, jadi tidak ada import yang hilang; error TS bila ada harus diperbaiki sekarang)

- [ ] **Step 3: Commit**

```bash
git add components/NotesView.tsx
git commit -m "feat(catatan): NotesView daftar + tombol tambah di header"
```

---

### Task 3: NoteSheet + opsi picker "Tambah Catatan" + ikon

**Files:**
- Modify: `components/Sheets.tsx:8` (`SheetId`), tambah `NoteSheet` (setelah `TaskSheet`, ~baris 660), tambah baris opsi di `TambahSheet` (~baris 320).
- Modify: `components/icons.tsx` — tambah `IconNote`, `IconGlobe` (dipakai juga Task 5).
- Consumes: `Note` (Task 1).
- Produces: `NoteSheet({ open, initial, onClose, onSave })`, `onPick` menerima `"note"`.

Kontrak:

```ts
// initial null = mode tambah; terisi = mode ubah.
interface NoteSheetProps {
  open: boolean;
  initial: Note | null;
  onClose: () => void;
  /** return false = gagal, sheet tetap terbuka. */
  onSave: (v: { title: string; body: string }) => Promise<boolean | void> | boolean | void;
}
```

Kunci kamus baru: `notes.sheetAdd`, `notes.sheetEdit`, `notes.titlePh`, `notes.bodyPh`, `notes.titleRequired`, `notes.fieldTitle`, `notes.fieldBody`, `common.save`, `common.close`.

- [ ] **Step 1: Extend SheetId + tambah ikon**

```ts
// Sheets.tsx baris 8:
export type SheetId = "sched" | "mail" | "task" | "routine" | "note" | "tambah" | null;
```

```tsx
// icons.tsx — tirukan pola IconDoc (baris 350), tambah di akhir file:
export function IconNote(p: IconProps) {
  const { size = 20, className } = p;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
      <path d="M15 3v6h6" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

export function IconGlobe(p: IconProps) {
  const { size = 16, className } = p;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
```

(Verifikasi dulu signature `IconProps` di `icons.tsx:1-23` — bila beda, sesuaikan destructure di atas dengan pola `IconDoc`.)

- [ ] **Step 2: Tambah opsi picker** — di `TambahSheet`, setelah blok `pick("sched", ...)` (~baris 320), tambah:

```tsx
<div className="row" style={{ cursor: "pointer" }} {...pick("note", "Tambah catatan baru")}>
  <span className="h-ic"><IconNote size={18} /></span>
  <div>
    <div className="t">Tambah Catatan</div>
    <div className="s">Ide cepat tersimpan lokal</div>
  </div>
  <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
</div>
```

Ubah juga tipe `onPick` dan helper `pick` di `TambahSheet` (~baris 285–287) dari `"mail" | "task" | "sched"` menjadi `"mail" | "task" | "sched" | "note"`.

- [ ] **Step 3: Tulis NoteSheet** — setelah `TaskSheet`, tirukan strukturnya (state title/body, `useEffect` reset saat `open`, validasi judul wajib → error inline, tombol Simpan/Tutup). Aturan: judul kosong → `setTitleErr(t("notes.titleRequired"))`, jangan panggil `onSave`; sukses → clear + `onClose` oleh pemanggil (tirukan `MailSheet`/`TaskSheet`: pemanggil yang `setSheet(null)`).

- [ ] **Step 4: Run**

Run: `npm test`
Expected: PASS (test lama tidak rusak)

Run: `npm run build`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add components/Sheets.tsx components/icons.tsx
git commit -m "feat(catatan): NoteSheet + opsi picker + IconNote/IconGlobe"
```

---

### Task 4: Kabel NotedworkApp (state + view + sheet)

**Files:**
- Modify: `components/NotedworkApp.tsx`
- Consumes: `Note`, `LS.notes` (Task 1), `NotesView` (Task 2), `NoteSheet` + `"note"` (Task 3), `t()` (Task 6 — import `useLang`; bila Task 6 belum jalan, teruskan `t` dummy `(k) => k` sementara? TIDAK — kerjakan Task 6 dulu. Urutan eksekusi: 1→2→3→6→4→5→7.)
- Produces: CRUD catatan per-akun + view `catatan` ter-render + sheet `note` terbuka dari picker/tombol +.

- [ ] **Step 1: State + CRUD** — setelah state routines (~baris 92):

```tsx
const [notes, setNotes] = useLocalStorage<Note[]>1000);
```

- [ ] **Step 2: Render view** — setelah blok kalender (~baris 869–886), tambah:

```tsx
{view === "catatan" && (
  <NotesView
    notes={notes}
    t={t}
    onAdd={() => { setEditingNote(null); setSheet("note"); }}
    onEdit={(n) => { setEditingNote(n); setSheet("note"); }}
    onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
  />
)}
```

- [ ] **Step 3: Mapping picker + render sheet** — di `onPick` TambahSheet (~baris 912–922) tambah `else if (kind === "note") { setEditingNote(null); setSheet("note"); }`; setelah `TaskSheet` (~baris 941–977) tambah:

```tsx
<NoteSheet
  open={sheet === "note"}
  initial={editingNote}
  t={t}
  onClose={() => setSheet(null)}
  onSave={(v) => {
    if (editingNote) {
      setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? { ...n, title: v.title, body: v.body, updatedAt: Date.now() } : n)));
    } else {
      const now = Date.now();
      setNotes((prev) => [{ id: `n-${now.toString(36)}`, title: v.title, body: v.body, updatedAt: now }, ...prev]);
    }
    setSheet(null);
  }}
/>
```

- [ ] **Step 4: Run**

Run: `npm test` → PASS. Run: `npm run build` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/NotedworkApp.tsx
git commit -m "feat(catatan): CRUD per-akun + view + sheet wiring"
```

---

### Task 5: Tab navigasi Catatan

**Files:**
- Modify: `components/AppNav.tsx:5-14,43-55`
- Consumes: `IconNote` (Task 3), label `t("nav.notes")` — AppNav terima prop `t` baru? Kontrak: tambah prop opsional `t?: (k: string) => string` dengan fallback `(k) => k`, agar Sidebar/TabBar lama tidak rusak. Pemanggil di NotedworkApp meneruskan `t`.
- Produces: tab Catatan di sidebar + tabbar bawah (ikon + label, `aria-current` seperti tab lain).

- [ ] **Step 1: Tambah tab**

```tsx
import { IconCalendar, IconHome, IconMail, IconTask, IconPlus, IconNote } from "./icons";
// MAIN_TABS tambah di akhir:
{ id: "catatan", Icon: IconNote, label: "Catatan" },
```

Label harus lewat `t("nav.notes")`: ubah `MAIN_TABS` menyimpan `labelKey` (`"nav.home"`, `"nav.email"`, `"nav.tasks"`, `"nav.calendar"`, `"nav.notes"`) dan render `{t(n.labelKey)}`. Update kedua komponen (Sidebar + TabBar). Bilaview aktif `catatan`, tidak ada cabang yang rusak karena `Exclude<ViewName, "profil">` otomatis mencakupnya.

- [ ] **Step 2: Teruskan `t`** dari NotedworkApp ke `<Sidebar>`/`<TabBar>` (cari pemakaiannya di NotedworkApp, tambah prop `t={t}`).

- [ ] **Step 3: Run** `npm test` → PASS; `npm run build` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/AppNav.tsx components/NotedworkApp.tsx
git commit -m "feat(catatan): tab navigasi Catatan sidebar + tabbar"
```

---

### Task 6: Kamus bahasa + LangProvider (fondasi translate mode)

**Files:**
- Create: `lib/i18n.ts`
- Create: `components/LangProvider.tsx`
- Modify: `components/NotedworkApp.tsx` (bungkus provider + `const { t } = useLang()`)
- Test: `tests/repro-i18n-parity.mjs` (create + daftarkan di `package.json`)

**Interfaces:**
- Consumes: tidak ada.
- Produces: `type Lang = "id" | "en"`, `LANG_KEY = "notedwork.lang"`, `STRINGS` (rekaman `Record<Lang, Record<string, string>>`), `LangProvider`, `useLang() → { lang, t, setLang, toggleLang }`.

Daftar kunci WAJIB (dipakai Task 2–5, 7 — tidak boleh kurang):
`nav.home nav.email nav.tasks nav.calendar nav.notes nav.addNew, tambah.title tambah.hint tambah.mail tambah.mailSub tambah.task tambah.taskSub tambah.sched tambah.schedSub tambah.note tambah.noteSub, notes.title notes.add notes.empty notes.emptyHint notes.edit notes.delete notes.sheetAdd notes.sheetEdit notes.fieldTitle notes.fieldBody notes.titlePh notes.bodyPh notes.titleRequired, topbar.langToEn topbar.langToId topbar.theme, common.save common.close common.delete common.cancel common.edit`

Isi Indonesia = teks yang SUDAH ada di UI hari ini (contoh: `tambah.note` = "Tambah Catatan", `tambah.noteSub` = "Ide cepat tersimpan lokal", `notes.empty` = "Belum ada catatan.", `notes.emptyHint` = "Ketuk tombol + untuk menambah satu."). Isi Inggris = terjemahan natural ("Add Note", "Quick ideas saved locally", "No notes yet.", "Tap the + button to add one.").

- [ ] **Step 1: Tulis `lib/i18n.ts`**

```ts
export type Lang = "id" | "en";
export const LANG_KEY = "notedwork.lang";
export const STRINGS: Record<Lang, Record<string, string>> = {
  id: { "nav.home": "Hari Ini", /* ...semua kunci... */ },
  en: { "nav.home": "Today", /* ...semua kunci... */ },
};
export function pickLang(v: unknown): Lang | null {
  return v === "id" || v === "en" ? v : null;
}
```

- [ ] **Step 2: Tulis `components/LangProvider.tsx`** — tirukan `ThemeProvider.tsx` baris 135–193: `useState<Lang>("id")`, hydrate dari `localStorage.getItem(LANG_KEY)` di effect mount (JSON.parse aman + `pickLang`), persist tiap berubah, `toggleLang` id↔en, `t = useCallback((k) => STRINGS[lang][k] ?? STRINGS.id[k] ?? k)`. Juga set `document.documentElement.lang = lang` di effect (gantikan `lang="id"` statis di layout).

- [ ] **Step 3: Pasang provider** — di `NotedworkApp.tsx`: bungkus isi return dengan `<LangProvider>` dan buat komponen dalam `function Shell(){ const { t } = useLang(); ... }` bila hook dipakai di level yang sama (aturan hooks: provider harus di atas konsumen — pecah jadi `NotedworkApp` (provider) + `NotedworkShell` (isi lama)).

- [ ] **Step 4: Test paritas**

```js
// tests/repro-i18n-parity.mjs
import { readFileSync } from "node:fs";
const src = readFileSync("lib/i18n.ts", "utf8");
const getKeys = (lang) => {
  const m = src.match(new RegExp(lang + ": \\{([\\s\\S]*?)\\n  \\}"));
  if (!m) throw new Error("blok " + lang + " tidak ketemu");
  return [...m[1].matchAll(/"([^"]+)":/g)].map((x) => x[1]);
};
const id = getKeys("id"), en = getKeys("en");
const missing = [...id.filter((k) => !en.includes(k)), ...en.filter((k) => !id.includes(k)).map((k) => "en:" + k)];
console.log(`id=${id.length} en=${en.length}`);
if (!id.length || missing.length) { console.log("FAIL", missing.slice(0, 10)); process.exit(1); }
console.log("PASS paritas kamus");
```

Daftarkan di script `test` package.json. Run `npm test` → PASS. Run `npm run build` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts components/LangProvider.tsx components/NotedworkApp.tsx tests/repro-i18n-parity.mjs package.json
git commit -m "feat(i18n): kamus ID/EN + LangProvider + parity test"
```

---

### Task 7: Tombol bahasa di TopBar + terapkan t() ke Catatan

**Files:**
- Modify: `components/TopBar.tsx`
- Modify: `components/Sheets.tsx` (TambahSheet + NoteSheet teks → `t()`; terima prop `t`)
- Modify: `components/NotedworkApp.tsx` (teruskan `t={t}` ke `<TambahSheet>` — wajib, kalau tidak `tsc` gagal)
- Modify: `app/globals.css` (hanya tambah `.lang-tag`)
- Consumes: `useLang`, `IconGlobe` (Task 3), kamus (Task 6).
- Produces: tombol bahasa di SEBELAH tombol tema; seluruh teks Catatan + picker lewat kamus.

- [ ] **Step 1: Tombol bahasa** — di `TopBar.tsx` dalam `.top-actions`, SEBELUM tombol tema:

```tsx
import { useLang } from "./LangProvider";
import { IconGlobe } from "./icons";
// di komponen:
const { lang, toggleLang } = useLang();
<button
  className="icon-btn"
  onClick={toggleLang}
  title={lang === "id" ? t("topbar.langToEn") : t("topbar.langToId")}
  aria-label={lang === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
>
  <IconGlobe size={16} />
  <span className="lang-tag" aria-hidden="true">{lang.toUpperCase()}</span>
</button>
```

TopBar butuh `t` juga: `const { t } = useLang();` (satu hook, dua nilai). Tambah CSS `.lang-tag` di `app/globals.css` bila belum ada (font 10px bold, margin-left 2px). `aria-label` dua bahasa di atas disengaja: dibaca benar oleh screen reader di kedua mode.

- [ ] **Step 2: Terapkan `t()`** — `TambahSheet`: judul/hint/3+1 baris/Tutup dari kamus (`tambah.*`, `common.close`). `NoteSheet`: semua label dari kamus. `NotesView` sudah pakai `t` (Task 2). Hapus string hardcoded Indonesia di file yang disentuh task ini SAJA (view lain = follow-up, bukan scope ini).

- [ ] **Step 3: Run** `npm test` → PASS; `npm run build` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/TopBar.tsx components/Sheets.tsx app/globals.css
git commit -m "feat(i18n): tombol bahasa di TopBar + kamus di picker & catatan"
```

---

### Task 8: Verifikasi E2E Playwright + bersih-bersih

**Files:** tanpa file kode (bukti verifikasi).

- [ ] **Step 1: Jalankan checklist Playwright** di `https://notedwork.vercel.app` (atau preview deploy branch):
  1. Tab Catatan tampil di sidebar + tabbar bawah; klik → judul + tombol `+` terlihat; teks empty Indonesia.
  2. Klik `+` → NoteSheet terbuka; Simpan dengan judul kosong → error inline, sheet tetap terbuka.
  3. Isi judul+isi → Simpan → kartu muncul paling atas; edit → berubah; hapus → hilang.
  4. FAB → picker ada 4 opsi termasuk Tambah Catatan → buat satu → muncul di view.
  5. Login Google → ulangi tambah 1 catatan → hapus lagi (akun bersih).
  6. Klik tombol bahasa (ID) → tab jadi Today/Email/Tasks/Calendar/Notes, empty-state Inggris; reload → tetap EN (`localStorage notedwork.lang === '"en"'`); klik lagi → kembali ID.
  7. Console 0 errors di semua langkah; `npm test` + `npm run build` hijau.
- [ ] **Step 2: Hapus artefak `.playwright-mcp/` baru** bila ikut ke-status git (file `?? .playwright-mcp/...` jangan di-commit).
- [ ] **Step 3: Commit kosong? TIDAK** — task ini tanpa commit kode; catat hasil checklist di pesan ke user.

---

## Self-Review

1. **Spec coverage:** (1) fix catatan → Task 1–4 (CRUD+sheet+view); (2) tombol + di Catatan → Task 2 (header) + Task 3 (picker); (3) tombol translate di sebelah tema → Task 7 (+ fondasi Task 6); (4) plan dulu → dokumen ini. Sinkron Google Keep TIDAK masuk (butuh scope OAuth `keep` + consent ulang + API route baru — follow-up terpisah). Mode terang/gelap yang ada tidak diubah (tombol bahasa hanya tetangga).
2. **Placeholder scan:** tidak ada TBD/TODO; semua langkah ada kode/perintah ekspektasi konkret; tipe antar-task konsisten (`Note`, `SheetId` + `"note"`, `t: (k: string) => string`, kunci kamus sama persis di Task 2/3 dan Task 6).
3. **Type consistency:** `onPick` diperluas di Task 3 sebelum dipakai Task 4; `useLang` dibuat Task 6 sebelum dipakai Task 4/5/7 (urutan eksekusi 1→2→3→6→4→5→7→8); `IconGlobe` dibuat Task 3 dipakai Task 7.

## Catatan asumsi (minta koreksi bila salah)

- "tombol di sebelah catatan" = tombol **+** di header view Catatan (ditambah entri picker) — bukan mengubah urutan tab.
- "pengganti tema dark mode dan light mode" = toggle tema yang sudah ada di TopBar; tombol bahasa ditaruh tepat di sebelah kirinya.
- "translite mode" = mode bahasa Indonesia↔English (toggle ID/EN), default ID, persist per-browser.
