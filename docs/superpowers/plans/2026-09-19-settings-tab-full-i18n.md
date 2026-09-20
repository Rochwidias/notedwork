# Settings Tab + Full ID/EN Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti halaman Profil menjadi tab keenam "Pengaturan" (dengan tombol gear di halaman Catatan) dan terjemahkan seluruh UI ke ID/EN.

**Architecture:** Rename `ViewName "profil"` → `"settings"` + `git mv ProfileView` → `SettingsView`; helper tanggal di `lib/dates.ts` dapat parameter `Lang`; tiap view/sheet memakai hook `useLang()` langsung (pola sudah ada di `TopBar`); semua string baru masuk kamus datar `lib/i18n.ts` (parity ID=EN dicek otomatis); legal direstruktur `Record<Lang, Record<LegalId, LegalDoc>>`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 3, tanpa dependensi baru, test repro `.mjs` statis via `node`.

**Spec:** `docs/superpowers/specs/2026-09-19-settings-tab-full-i18n-design.md`

## Global Constraints

- No new npm dependencies — test hanya `node tests/*.mjs` yang terdaftar di `npm test` (`package.json:10`).
- Setiap key i18n baru WAJIB ada di blok `id` dan `en` (`lib/i18n.ts`) — parity dicek `tests/repro-i18n-parity.mjs`.
- `t()` fallback `STRINGS[lang][k] ?? STRINGS.id[k] ?? k` — tidak boleh ada teks kosong.
- Class Tailwind hanya token yang ada (`bg-paper`, `bg-card`, `text-muted`) atau `bg-[var(--...)]` — tidak ada class baru tanpa cek `tailwind.config.ts`.
- Fungsi di `lib/` harus murni/SSR-aman (tidak ada akses `window`/`localStorage` langsung).
- JANGAN sentuh `.claude/` (worktree `note-feature` berisi salinan repo lama — abaikan total).
- Error/throw di `lib/google.ts` yang menyebut "profil Google" adalah API profil Google — JANGAN diubah.
- Komentar kode Bahasa Indonesia (konvensi repo).
- Verifikasi tiap task: `node tests/repro-settings-i18n.mjs` (atau file repro yang disebut), `npx tsc --noEmit`, `npx eslint components lib tests`.

## File Structure Map

- `lib/types.ts` — `ViewName`: `"profil"` → `"settings"`; update komentar baris 73.
- `components/SettingsView.tsx` — BARU via `git mv` dari `ProfileView.tsx`; isi pindahan + translate (Task 1 rename, Task 10 translate).
- `components/AppNav.tsx` — `MAIN_TABS` + tab settings keenam; `Exclude<ViewName, "settings">`; Sidebar MENU/TAMBAH/Tambah Baru + Fab title via `t()`.
- `components/TopBar.tsx` — `t("topbar.profile")` → `t("topbar.settings")`; update komentar baris 64-66 (`profil` → `settings`). Nama prop `onProfile` TETAP (hindari churn).
- `components/NotedworkApp.tsx` — routing `"profil"` → `"settings"` (baris 21, 684, 801, 906-907); toast/banner/confirm/quote via `t("toast.*")`/`t("banner.*")`/`t("mail.*")`; tambah `t` ke dep-array callback; rename variabel lokal `t` → `found` di `toggleTask`/`startEditTask`.
- `components/NotesView.tsx` — tombol gear + prop `onOpenSettings`.
- `lib/dates.ts` — helper `dayNames`, `monthNames`, `dow3`, `dowInitials`, `prioLabel`; param `lang` di `fmtDateID`, `fmtSchedRange`, `taskBadge`.
- `components/HariIni.tsx`, `EmailView.tsx`, `TasksView.tsx`, `CalendarView.tsx` — `useLang()` + ganti semua literal (tabel per task).
- `components/Sheets.tsx` — `useLang()` di Sched/Task/Mail/Routine/InfoSheet + ReminderChips; `REMINDER_OPTIONS` → `REMINDER_VALUES`; `LEGAL[id]` → `LEGAL[lang][id]`.
- `lib/i18n.ts` — semua key baru (tabel per task).
- `lib/legal.ts` — `Record<Lang, Record<LegalId, LegalDoc>>` + isi EN + perbaiki "via Profil →" menjadi "via Pengaturan →" di teks ID.
- `lib/preview.ts` — HAPUS export `PREVIEW_LOGIN_HINT` (satu-satunya pemakai: `NotedworkApp.tsx:661`, diganti `t()`).
- `lib/data.ts:23` — komentar "bisa diubah di Profil" → "bisa diubah di Pengaturan".
- `tests/repro-settings-i18n.mjs` — BARU, didaftarkan di `npm test`.
- `tests/repro-topbar-lang.mjs`, `tests/repro-menu-kiri.mjs` — update asersi `profil` → `settings`.

---

### Task 1: Rename Profil → Settings + tab keenam + string AppNav

**Files:**
- Modify: `lib/types.ts:73-74`, `components/AppNav.tsx:5,9-15,27-44,82-87`, `components/TopBar.tsx:64-71`, `components/NotedworkApp.tsx:21,684,801,906-907`, `lib/i18n.ts` (tambah 6 key), `lib/data.ts:23`, `tests/repro-topbar-lang.mjs:14`, `tests/repro-menu-kiri.mjs`
- Rename: `git mv components/ProfileView.tsx components/SettingsView.tsx` (+ di dalamnya: `ProfileView` → `SettingsView`, `id="v-profil"` → `id="v-settings"`)
- Test: `tests/repro-menu-kiri.mjs`, `tests/repro-settings-i18n.mjs`

**Interfaces:**
- Consumes: `ViewName`, `NavTarget` dari `@/lib/types`; `IconGear` dari `./icons` (sudah ada, `icons.tsx:133`).
- Produces: `ViewName` tanpa `"profil"` (dengan `"settings"`); `MAIN_TABS` 6 entri; key `nav.settings`, `nav.menu`, `nav.addSection`, `topbar.settings`, `notes.settings` TIDAK di task ini (notes.settings di Task 2).

- [ ] **Step 1: Tulis failing test (extend repro-menu-kiri + cek baru)**

  Di `tests/repro-menu-kiri.mjs`: baca dulu seluruh file, lalu update SEMUA asersi terkait profil/tab: path `../components/ProfileView.tsx` → `../components/SettingsView.tsx`; `/Galeri Tema/` → cek `t("settings.themeGallery")`; `!/id:\s*"profil"/` → `!/id:\s*"profil"/` TETAP (profil tidak boleh kembali) PLUS cek baru `/id:\s*"settings"/` ada di `AppNav.tsx`; angka "5 tab" → "6 tab" di komentar/asersi mana pun yang menghitung tab.
  Tambah cek baru di file repro SETTINGS (buat file `tests/repro-settings-i18n.mjs` dengan kerangka runner repo):
```js
import { readFileSync } from "node:fs";
const nav = readFileSync("components/AppNav.tsx", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const checks = [
  ["tab settings keenam", /id:\s*"settings"/.test(nav) && nav.includes('labelKey: "nav.settings"')],
  ["tanpa profil di nav", !/id:\s*"profil"/.test(nav)],
  ["ViewName settings", types.includes('"settings"') && !types.includes('"profil"')],
  ["sidebar via t()", nav.includes('t("nav.menu"') || nav.includes("t('nav.menu'")],
];
let fail = 0;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`), ok || fail++;
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL (tab settings / ViewName settings belum ada)

- [ ] **Step 3: Implementasi rename + tab + key**

  3a. `git mv components/ProfileView.tsx components/SettingsView.tsx`. Di file hasil rename: `export default function ProfileView(` → `export default function SettingsView(`, `id="v-profil"` → `id="v-settings"`. Isi LAINNYA jangan diubah di task ini (translate di Task 10).
  3b. `lib/types.ts:73-74`:
```ts
/** Layar utama: beranda (Hari Ini) + email + tugas + kalender + catatan + pengaturan. */
export type ViewName = "beranda" | "email" | "tugas" | "kalender" | "catatan" | "settings";
```
  3c. `components/AppNav.tsx`: import tambah `IconGear`; `Exclude<ViewName, "profil">` → `Exclude<ViewName, "settings">`; tambah entri keenam `{ id: "settings", Icon: IconGear, labelKey: "nav.settings" }`. Sidebar: `<div className="cap">MENU</div>` → `<div className="cap">{t("nav.menu")}</div>`; `<div className="cap">TAMBAH</div>` → `<div className="cap">{t("nav.addSection")}</div>`; `Tambah Baru` → `{t("nav.addNew")}`. Fab: `title="Tambah baru" aria-label="Tambah baru"` → `title={t("nav.addNew")}` — TAPI `Fab({ onAdd })` belum terima `t`: ubah signature menjadi `Fab({ onAdd, t = (k: string) => k }: { onAdd: () => void; t?: (k: string) => string })` dan pemanggil di `NotedworkApp.tsx:927` menjadi `<Fab onAdd={() => go("tambah")} t={t} />`.
  3d. `NotedworkApp.tsx`: `import ProfileView` → `import SettingsView from "./SettingsView"`; `setView("profil")` → `setView("settings")`; `onProfile={() => go("profil")}` → `onProfile={() => go("settings")}`; `{view === "profil" && (<ProfileView` → `{view === "settings" && (<SettingsView`. Kondisi banner pratinjau (baris 806) TETAP (hanya 4 view, settings tidak termasuk — tidak diubah).
  3e. `TopBar.tsx:64-71`: komentar `→ profil` → `→ settings`; `t("topbar.profile")` → `t("topbar.settings")` (2 tempat: title + aria-label).
  3f. `lib/i18n.ts` tambah ke KEDUA blok (id + en), tepat setelah `"nav.notes"`:
```ts
"nav.settings": "Pengaturan",   // en: "Settings"
"nav.menu": "MENU",              // en: "MENU"
"nav.addSection": "TAMBAH",      // en: "ADD"
"topbar.settings": "Pengaturan", // en: "Settings"
```
dan HAPUS key `"topbar.profile"` dari kedua blok (ID "Profil" / EN "Profile").
  3g. `lib/data.ts:23`: komentar `bisa diubah di Profil` → `bisa diubah di Pengaturan`.
  3h. `tests/repro-topbar-lang.mjs:14`: `t("topbar.profile")` → `t("topbar.settings")`.

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-menu-kiri.mjs && node tests/repro-topbar-lang.mjs && node tests/repro-i18n-parity.mjs`
Expected: semua PASS (parity: key count bertambah 3 tiap bahasa, tetap seimbang)

- [ ] **Step 5: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
Expected: bersih (abaikan noise `.claude/`/`.next` — perintah di atas tidak menyentuhnya)
```bash
git add lib/types.ts components/AppNav.tsx components/TopBar.tsx components/NotedworkApp.tsx lib/i18n.ts lib/data.ts components/SettingsView.tsx tests/repro-settings-i18n.mjs tests/repro-topbar-lang.mjs tests/repro-menu-kiri.mjs
git commit -m "feat(nav): Profil jadi tab Pengaturan keenam"
```
(`git mv` sudah men-stage rename; `git add components/SettingsView.tsx` men-stage hasil editnya.)

---

### Task 2: Tombol gear di halaman Catatan

**Files:**
- Modify: `components/NotesView.tsx:3-22`, `components/NotedworkApp.tsx:897-905`, `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `IconGear` dari `./icons`; key `notes.settings`; `go("settings")` dari shell.
- Produces: prop `onOpenSettings: () => void` di `NotesView`.

- [ ] **Step 1: Tambah cek gagal ke repro settings**

Append ke array `checks` di `tests/repro-settings-i18n.mjs` (baca file dulu, tambah entri + baca file yang dicek di atasnya):
```js
const notesView = readFileSync("components/NotesView.tsx", "utf8");
// ... tambah ke checks:
["notes gear ke settings", notesView.includes("onOpenSettings") && notesView.includes("IconGear") && notesView.includes('t("notes.settings")')],
["notes gear wiring", readFileSync("components/NotedworkApp.tsx", "utf8").includes('go("settings")') && readFileSync("components/NotedworkApp.tsx", "utf8").includes("onOpenSettings")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL pada 2 cek baru

- [ ] **Step 3: Implementasi**

  3a. `lib/i18n.ts` kedua blok setelah `"notes.delete"`: `"notes.settings": "Pengaturan"` / `"Settings"`.
  3b. `components/NotesView.tsx`: import tambah `IconGear`; interface tambah `onOpenSettings: () => void`; destructure tambah `onOpenSettings`; di `.view-head` setelah tombol `+ Tambah`:
```tsx
<button type="button" className="icon-btn" onClick={onOpenSettings} title={t("notes.settings")} aria-label={t("notes.settings")}>
  <IconGear size={18} />
</button>
```
  3c. `NotedworkApp.tsx:897-905`: `<NotesView` tambah prop `onOpenSettings={() => go("settings")}`.

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs`
Expected: PASS

- [ ] **Step 5: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/NotesView.tsx components/NotedworkApp.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(notes): tombol gear ke Pengaturan"
```

---

### Task 3: Helper tanggal multi-bahasa di lib/dates.ts

**Files:**
- Modify: `lib/dates.ts:1-64` (tambah konstanta + fungsi, ubah 3 fungsi)
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `import type { Lang } from "./i18n"` (type-only, tanpa runtime cycle).
- Produces: `dayNames(lang)`, `monthNames(lang)`, `dow3(lang)`, `dowInitials(lang)`, `prioLabel(prio, lang)`, `fmtDateID(iso, lang = "id")`, `fmtSchedRange(s, lang = "id")`, `taskBadge(t, lang = "id")`. Dipakai Task 4-9. Tanda tangan lama tetap kompatibel (param `lang` opsional dengan default `"id"`).

- [ ] **Step 1: Tambah cek gagal**

```js
const dates = readFileSync("lib/dates.ts", "utf8");
// ... tambah ke checks:
["dates helper EN", dates.includes('"Monday"') && dates.includes('"January"') && dates.includes('"Mon"') && dates.includes('"All day"') && dates.includes("en-US")],
["dates helper export", ["dayNames", "monthNames", "dow3", "dowInitials", "prioLabel"].every((f) => dates.includes(`export function ${f}`))],
["dates fmt lang param", dates.includes("fmtDateID(iso: string, lang") && dates.includes("fmtSchedRange(s: Sched, lang") && dates.includes("taskBadge(t: Task, lang")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL 3 cek baru

- [ ] **Step 3: Implementasi**

  3a. Atas file tambah `import type { Lang } from "./i18n";` dan setelah `MONTHS`:
```ts
export const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DOW3_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const DOW3_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DOW1_ID = ["S", "S", "R", "K", "J", "S", "M"];
export const DOW1_EN = ["M", "T", "W", "T", "F", "S", "S"];
export function dayNames(lang: Lang): string[] { return lang === "en" ? DAYS_EN : DAYS; }
export function monthNames(lang: Lang): string[] { return lang === "en" ? MONTHS_EN : MONTHS; }
export function dow3(lang: Lang): string[] { return lang === "en" ? DOW3_EN : DOW3_ID; }
export function dowInitials(lang: Lang): string[] { return lang === "en" ? DOW1_EN : DOW1_ID; }
export function prioLabel(p: Prio, lang: Lang): string {
  if (lang === "en") return p === "tinggi" ? "High" : p === "sedang" ? "Medium" : "Low";
  return PRIO[p][0];
}
```
  3b. `fmtDateID` menjadi:
```ts
export function fmtDateID(iso: string, lang: Lang = "id"): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
```
  3c. `fmtSchedRange(s: Sched)` → `fmtSchedRange(s: Sched, lang: Lang = "id")`; ganti `"Seharian"` → `(lang === "en" ? "All day" : "Seharian")` dan `` ` · besok` `` → `` ` · ${lang === "en" ? "tomorrow" : "besok"}` ``. Logika/IRisan regex TETAP.
  3d. `taskBadge(t: Task)` → `taskBadge(t: Task, lang: Lang = "id")`; di dalam tambah `const en = lang === "en";` lalu: `"Selesai"` → `(en ? "Done" : "Selesai")`; `"Telat!"` → `(en ? "Late!" : "Telat!")`; `"Telat " + d + " hari"` → `(en ? `Late ${d} days` : `Telat ${d} hari`)`; `"Hari ini • "` → `(en ? "Today • " : "Hari ini • ")`; `"Besok • "` → `(en ? "Tomorrow • " : "Besok • ")`; `"Sisa " + days + " hari"` → `(en ? `${days} days left` : `Sisa ${days} hari`)`.urutan `if` dan `cls` TETAP.

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro.mjs`
Expected: PASS (default `lang="id"` menjaga perilaku lama — repro lama harus tetap hijau)

- [ ] **Step 5: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add lib/dates.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): helper tanggal EN di lib/dates"
```

---

### Task 4: Translate HariIni (home.*)

**Files:**
- Modify: `components/HariIni.tsx`, `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `useLang` dari `./LangProvider`; `dow3`, `fmtDateID(iso, lang)`, `fmtSchedRange(s, lang)`, `taskBadge(t, lang)` dari `@/lib/dates`; key `common.*`, `notes.add`, `nav.calendar` yang sudah ada.
- Produces: key `home.*`, `common.all`, `common.markDone`, `common.tapToComplete` (dipakai ulang Task 5-7).

- [ ] **Step 1: Tambah cek gagal**

```js
const hari = readFileSync("components/HariIni.tsx", "utf8");
// ... tambah ke checks:
["hariini useLang", hari.includes("useLang()")],
["hariini tanpa hardcode", !hari.includes("Tidak ada pengingat") && !hari.includes("3 Terpenting") && !hari.includes("Minggu ini") && !hari.includes("Email penting") && !hari.includes("DOW3 = [") && !hari.includes("Halo, {name}") && !hari.includes(" • Ruang ") && !hari.includes("mnt lagi")],
```
CATATAN: string dinamis `Lihat kalender`, `Semua`, `Tandai selesai`, `Ketuk untuk tandai selesai`, `Kotak masuk beres`, `Tambah`, `Hari Ini`, `Mode pratinjau`, `Buka email:`, tanggal `toLocaleDateString("id-ID"` dicek manual di Step 4 (pola `t(` menutupinya — pastikan tidak ada sisa literal).

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL cek baru

- [ ] **Step 3: Tambah key (kedua blok, urutan sama)**

```ts
"common.all": "Semua",                       // en: "All"
"common.markDone": "Tandai selesai",          // en: "Mark done"
"common.tapToComplete": ". Ketuk untuk tandai selesai.", // en: ". Tap to mark done."
"home.title": "Hari Ini",                     // en: "Today"
"home.hello": "Halo",                         // en: "Hello"
"home.previewSuffix": " — Mode pratinjau (data contoh)", // en: " — Preview mode (sample data)"
"home.guestName": "di sana",                  // en: "there"
"home.dueSoon": "Sebentar lagi",              // en: "Starting soon"
"home.inMin": "{n} mnt lagi",                 // en: "{n} min to go"
"home.inHours": "{h} jam {m} mnt lagi",       // en: "{h}h {m}m to go"
"home.inHoursEven": "{h} jam lagi",           // en: "{h} hours to go"
"home.tomorrow": "Besok",                     // en: "Tomorrow"
"home.inDays": "{d} hari lagi",               // en: "{d} days to go"
"home.room": "Ruang",                         // en: "Room"
"home.reminderPrefix": "Pengingat",           // en: "Reminder"
"home.openCalendar": "Buka kalender",         // en: "Open calendar"
"home.reminderAriaNone": "Tidak ada pengingat. Buka kalender.", // en: "No reminders. Open calendar."
"home.viewCalendar": "Lihat kalender",        // en: "View calendar"
"home.noReminder": "Tidak ada pengingat berikutnya", // en: "No upcoming reminders"
"home.noReminderSub": "Belum ada agenda atau deadline. Nikmati harimu!", // en: "No agenda or deadlines. Enjoy your day!"
"home.top3": "3 Terpenting",                  // en: "Top 3"
"home.allDone": "Semua tugas selesai. Nikmati harimu!", // en: "All tasks done. Enjoy your day!"
"home.thisWeek": "Minggu ini",                // en: "This week"
"home.emailImportant": "Email penting",       // en: "Important email"
"home.openMail": "Buka email: ",              // en: "Open email: "
"home.inboxClear": "Kotak masuk beres. Tidak ada email penting.", // en: "Inbox zero. No important email."
```
Placeholder `{n}`/`{h}`/`{m}`/`{d}` diganti via `.replace("{n}", String(n))` di call-site.

- [ ] **Step 4: Wiring useLang + ganti literal**

  4a. Import `useLang`, di badan komponen `const { lang, t } = useLang();`.
  4b. `const DOW3 = [...]` (baris 31) → HAPUS; pemakaian `DOW3[i]` (baris 312) → `dow3(lang)[i]` (import `dow3`).
  4c. `todayLine` (baris 118): `toLocaleDateString("id-ID", {...})` → `toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {...})` (opsi format TETAP).
  4d. `fmtCountdown` returns: `"Sebentar lagi"` → `t("home.dueSoon")`; `` `${mins} mnt lagi` `` → `t("home.inMin").replace("{n}", String(mins))`; jam/menit → `t("home.inHours").replace("{h}", ...).replace("{m}", ...)` / `t("home.inHoursEven")`; `"Besok"` → `t("home.tomorrow")`; `` `${d} hari lagi` `` → `t("home.inDays").replace("{d}", ...)`.
  4e. `guestName?.trim() || "di sana"` → `guestName?.trim() || t("home.guestName")`; `` ` • Ruang ${r.room}` `` → `` ` • ${t("home.room")} ${r.room}` ``; `{todayLine} • Halo, {name}` → `{todayLine} • {t("home.hello")}, {name}`; `" — Mode pratinjau (data contoh)"` → `t("home.previewSuffix")`; `"Hari Ini"` (greet) → `t("home.title")`.
  4f. aria hero: `"Tidak ada pengingat. Buka kalender."` → `t("home.reminderAriaNone")`; pola `` `Pengingat: ${label}, ${title}. Buka kalender.` `` → `` `${t("home.reminderPrefix")}: ${label}, ${title}. ${t("home.openCalendar")}` ``.
  4g. `Lihat kalender <span>›</span>` → `{t("home.viewCalendar")} <span>›</span>`; `"Tidak ada pengingat berikutnya"` → `t("home.noReminder")`; `"Belum ada agenda..."` → `t("home.noReminderSub")`; `"3 Terpenting"` → `t("home.top3")`; `Semua <span>›</span>` → `{t("common.all")} <span>›</span>` (2 tempat: tugas + email); `Kalender <span>›</span>` → `{t("nav.calendar")} <span>›</span>`.
  4h. Baris tugas: `` `${i+1}. ${t.title}. Ketuk untuk tandai selesai.` `` → `` `${i+1}. ${title}. ${sep}${t("common.tapToComplete")}` `` — HATI-HATI: `t` sekarang fungsi translate (shadowing nama variabel loop `t`)! Rename variabel loop/router row `t` → `task` (atau nama tak bentrok) di seluruh file HariIni SEBELUM wiring — cari `taskBadge(t)`, `t.title`, `t.matkul`, `t.date` (baris 143-272) dan rename konsisten.
  4i. `title="Tandai selesai"` → `title={t("common.markDone")}`; `` `Tandai selesai: ${title}` `` → `` `${t("common.markDone")}: ${title}` ``; `"Semua tugas selesai..."` → `t("home.allDone")`; `"Minggu ini"` → `t("home.thisWeek")`; `"Email penting"` → `t("home.emailImportant")`; `` `Buka email: ${m.subj}` `` → `` `${t("home.openMail")}${m.subj}` ``; `"Kotak masuk beres..."` → `t("home.inboxClear")`; tombol `"Tambah"` → `{t("notes.add")}`.
  4j. Semua `fmtDateID(x)` → `fmtDateID(x, lang)`; `fmtSchedRange(x)` → `fmtSchedRange(x, lang)`; `taskBadge(x)` → `taskBadge(x, lang)`; `aria-label={fmtDateID(iso)}` (baris 309) ikut.
  4k. Verifikasi manual: `grep -n "Halo,\|Ruang \|mnt lagi\|Ketuk untuk\|Belum ada\|Mode pratinjau\|Buka email\|Lihat kalender\|3 Terpenting\|Minggu ini\|Email penting\|Kotak masuk\|id-ID\|DOW3" components/HariIni.tsx` harus KOSONG (kecuali key `t("...")`).

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs`
Expected: PASS

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/HariIni.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate Hari Ini full EN"
```

---

### Task 5: Translate EmailView (email.*)

**Files:**
- Modify: `components/EmailView.tsx`, `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `useLang`; key `common.all`, `common.delete`/`common.edit` (sudah ada), `email.*` baru.

- [ ] **Step 1: Tambah cek gagal**

```js
const emailV = readFileSync("components/EmailView.tsx", "utf8");
// ... tambah ke checks:
["emailview useLang", emailV.includes("useLang()")],
["emailview tanpa hardcode", !emailV.includes("Belum dibaca") && !emailV.includes("Cari email") && !emailV.includes("Muat lagi") && !emailV.includes("Arsipkan") && !emailV.includes("Kembali ke daftar") && !emailV.includes("STATUS_DEF") === false],
```
Sederhanakan cek terakhir menjadi daftar literal (tanpa trik boolean): `!emailV.includes("Belum dibaca") && !emailV.includes("Cari email") && !emailV.includes("Muat lagi") && !emailV.includes("Arsipkan") && !emailV.includes("Kembali ke daftar") && !emailV.includes("Tandai belum dibaca") && !emailV.includes("Beri bintang") && !emailV.includes("Tanpa label")`.

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Tambah key (kedua blok)**

```ts
"email.title": "Email",                       // en: "Email"
"email.previewSub": "Mode pratinjau — data contoh. Bukan data aslimu.", // en: "Preview mode — sample data. Not your real data."
"email.liveBase": "Gmail & Kalender asli",    // en: "Real Gmail & Calendar"
"email.updatedFrag": " • update ",            // en: " • updated "
"email.countSep": " • ",                      // en: " • "
"email.countUnit": " email",                  // en: " emails"
"email.filterUnread": "Belum dibaca",         // en: "Unread"
"email.filterStar": "Bintang",                // en: "Starred"
"email.showEmails": "Tampilkan email",        // en: "Show"
"email.searchPh": "Cari email…",              // en: "Search email…"
"email.searchLabel": "Cari email",            // en: "Search email"
"email.clearSearch": "Bersihkan pencarian",   // en: "Clear search"
"email.typing": "Mengetik…",                  // en: "Typing…"
"email.searching": "Mencari…",                // en: "Searching…"
"email.results": " hasil",                    // en: " results"
"email.resultsFor": " untuk “",               // en: " for “"
"email.loading": "Memuat email",              // en: "Loading email"
"email.unreadSuffix": ", belum dibaca",       // en: ", unread"
"email.starTitle": "Bintang",                 // en: "Star"
"email.unstar": "Hapus bintang",              // en: "Unstar"
"email.giveStar": "Beri bintang",             // en: "Star"
"email.noTag": "Tanpa label",                 // en: "No label"
"email.noResults": "Tidak ada hasil. Coba kata kunci atau filter lain.", // en: "No results. Try other keywords or filters."
"email.emptyHere": "Tidak ada email di sini.", // en: "No email here."
"email.loadingMore": "Memuat…",               // en: "Loading…"
"email.loadMore": "Muat lagi (50 berikutnya)", // en: "Load more (next 50)"
"email.backToList": "Kembali ke daftar",      // en: "Back to list"
"email.backToListAria": "Kembali ke daftar email", // en: "Back to email list"
"email.badgeNew": "Baru",                     // en: "New"
"email.attach": "LAMPIRAN (",                // en: "ATTACHMENTS ("
"email.reply": "Balas",                       // en: "Reply"
"email.forward": "Teruskan",                  // en: "Forward"
"email.moreActions": "Aksi email lainnya",    // en: "More email actions"
"email.more": "Lainnya",                      // en: "More"
"email.archive": "Arsipkan",                  // en: "Archive"
"email.markUnread": "Tandai belum dibaca",    // en: "Mark as unread"
```
Catatan: chip "Semua" → `t("common.all")`; chip "Bintang" → `t("email.filterStar")` (tanpa "red").

- [ ] **Step 4: Wiring + ganti literal (inventaris persis di Baris 45-391)**

  `STATUS_DEF` (baris 45-47): konstanta modul tidak bisa memanggil hook, jadi pindahkan ke DALAM komponen. Tambah dulu di badan komponen `const { lang, t } = useLang();` (`lang` dipakai untuk `fmtDateID(x, lang)` di file ini), lalu definisikan sebelum render: `const STATUS_DEF = [{ id: "all", label: t("common.all") }, { id: "unread", label: t("email.filterUnread") }, { id: "star", label: t("email.filterStar") }];` — PERTAHANKAN `id` values persis (`"all"`/`"unread"`/`"star"` sesuai tipe `MailStatus`); pastikan tidak ada importer lain (grep `STATUS_DEF` — hanya file ini).
  Baris 73/76/77: `"Email"` → `t("email.title")`; `"Mode pratinjau..."` → `t("email.previewSub")`; pola live → `` `${t("email.liveBase")}${updatedAt ? `${t("email.updatedFrag")}${updatedAt}` : ""}${total != null ? `${t("email.countSep")}${total}${t("email.countUnit")}` : ""}` ``.
  Baris 142-160: placeholder/aria/count/typing per tabel. Pola hasil: `` `${list.length}${t("email.results")}${props.search.trim() ? `${t("email.resultsFor")}“${props.search.trim()}”` : ""}` `` — HATI-HATI kutip keriting `“ ”` TETAP.
  Baris 169: `` `Tampilkan email ${s.label.toLowerCase()}${counts[s.id] ? `, ${counts[s.id]} email` : ""}` `` → `` `${t("email.showEmails")} ${s.label.toLowerCase()}${counts[s.id] ? `, ${counts[s.id]}${t("email.countUnit")}` : ""}` ``.
  Baris 184/203/222-223/235/246/251/256/289-304/321/337-391: ganti 1:1 per tabel (`"Memuat email"` → `t("email.loading")`, `", belum dibaca"` → `t("email.unreadSuffix")`, dst.). `" • "` dan `" — "` dan `")"` sebagai separator TETAP tanpa key.

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs && node tests/repro-email.mjs`
Expected: PASS

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/EmailView.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate Email full EN"
```

---

### Task 6: Translate TasksView (tasks.*)

**Files:**
- Modify: `components/TasksView.tsx`, `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `useLang`; `PRIO` (untuk `cls` via `p[1]` — TETAP) + `prioLabel` baru; `taskBadge(t, lang)`, `fmtDateID(d, lang)`; reuse `common.all`, `common.markDone`, `common.tapToComplete`, `common.edit`, `common.delete`.

- [ ] **Step 1: Tambah cek gagal**

```js
const tasksV = readFileSync("components/TasksView.tsx", "utf8");
// ... tambah ke checks:
["tasksview useLang", tasksV.includes("useLang()")],
["tasksview tanpa hardcode", !tasksV.includes("Tidak ada tugas") && !tasksV.includes("Tambah tugas") && !tasksV.includes('"Aktif"') && !tasksV.includes('"Telat"') && !tasksV.includes("Ketuk untuk ubah status") && !tasksV.includes("tersimpan lokal")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Tambah key (kedua blok)**

```ts
"tasks.title": "Tugas",                       // en: "Tasks"
"tasks.previewSub": "Mode pratinjau — data contoh, tersimpan lokal di perangkatmu", // en: "Preview mode — sample data, stored locally on your device"
"tasks.liveSub": "Gmail & Kalender asli — deadline ikut muncul di Kalender & Dashboard", // en: "Real Gmail & Calendar — deadlines also appear on Calendar & Dashboard"
"tasks.filterActive": "Aktif",                // en: "Active"
"tasks.filterOverdue": "Telat",               // en: "Overdue"
"tasks.filterDone": "Selesai",                // en: "Done"
"tasks.stateDone": "selesai",                 // en: "done"
"tasks.stateActive": "aktif",                 // en: "active"
"tasks.tapToToggle": ". Ketuk untuk ubah status.", // en: ". Tap to change status."
"tasks.reopen": "Buka lagi",                  // en: "Reopen"
"tasks.emptyHere": "Tidak ada tugas di sini.", // en: "No tasks here."
"tasks.addTask": "Tambah tugas",              // en: "Add task"
```
"Semua" filter → `t("common.all")`.

- [ ] **Step 4: Wiring + ganti literal**

  `FILTERS` (baris 11-14, konstanta modul): pindahkan ke dalam komponen. Tambah dulu `const { lang, t } = useLang();` di badan komponen, lalu: baca baris 11-14, PERTAHANKAN `v` values persis apa adanya, hanya ganti labelnya: `v` untuk "Semua" → `t("common.all")`, "Aktif" → `t("tasks.filterActive")`, "Telat" → `t("tasks.filterOverdue")`, "Selesai" → `t("tasks.filterDone")`. Pastikan tidak ada importer lain (grep `FILTERS` — hanya file ini).
  Baris 52-53: greet + small per tabel. Baris 58: `{l} ({counts[v]})` TETAP (tanda kurung bukan teks).
  Baris 70-71: `taskBadge(t)` → `taskBadge(t, lang)`; `PRIO[t.prio] ?? PRIO.sedang` → `const p = PRIO[t.prio] ?? PRIO.sedang; const pLabel = prioLabel(t.prio in PRIO ? t.prio : "sedang", lang);` — sedehana: label via `prioLabel`, class via `p[1]` TETAP. (Jika kode memakai `p[0]` untuk label, ganti `p[0]` → `prioLabel(...)`, `p[1]` tidak diubah.)
  Baris 84: `` `${t.title} — ${t.done ? "selesai" : "aktif"}. Ketuk untuk ubah status.` `` → `` `${title} — ${done ? t("tasks.stateDone") : t("tasks.stateActive")}${t("tasks.tapToToggle")}` `` — HATI-HATI shadowing: jika komponen memakai `const { t } = useLang()`, rename variabel row `t` → `task` di seluruh render list (cek `taskBadge(t)`, `t.title`, dsb.).
  Baris 90-91/111-124: `title="Tandai selesai"` → `title={t("common.markDone")}`; aria `"Buka lagi"` → `t("tasks.reopen")`; `title="Ubah"` → `title={t("common.edit")}`, `` `Ubah ${...}` `` → `` `${t("common.edit")} ${...}` ``; `title="Hapus"` → `title={t("common.delete")}`, `` `Hapus ${...}` `` → `` `${t("common.delete")} ${...}` ``.
  Baris 102: `fmtDateID(t.date)` → `fmtDateID(t.date, lang)`. Baris 137/142 per tabel.

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs`
Expected: PASS

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/TasksView.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate Tugas full EN"
```

---

### Task 7: Translate CalendarView (cal.*)

**Files:**
- Modify: `components/CalendarView.tsx`, `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `useLang`; `dayNames`, `monthNames`, `dowInitials` (Task 3); `fmtDateID(iso, lang)`, `fmtSchedRange(s, lang)`, `taskBadge(x, lang)`; reuse `common.edit`, `common.delete`, `common.tapToComplete`.

- [ ] **Step 1: Tambah cek gagal**

```js
const calV = readFileSync("components/CalendarView.tsx", "utf8");
// ... tambah ke checks:
["calendar useLang", calV.includes("useLang()")],
["calendar tanpa hardcode", !calV.includes("Bulan sebelumnya") && !calV.includes("Jadwal rutin mingguan") && !calV.includes("Tidak ada agenda") && !calV.includes("Kelola jadwal rutin") && !calV.includes("MONTHS[") && !calV.includes("DAYS[")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Tambah key (kedua blok)**

```ts
"cal.previewSub": "Mode pratinjau — data contoh. Bukan data aslimu.", // en: "Preview mode — sample data. Not your real data."
"cal.liveSub": "Gmail & Kalender asli — ketuk tanggal untuk melihat agenda", // en: "Real Gmail & Calendar — tap a date to see the agenda"
"cal.prevMonth": "Bulan sebelumnya",      // en: "Previous month"
"cal.nextMonth": "Bulan berikutnya",      // en: "Next month"
"cal.routine": "Rutin",                   // en: "Routine"
"cal.agenda": "Agenda",                   // en: "Events"
"cal.deadline": "Deadline",               // en: "Deadline"
"cal.today": "Hari ini",                  // en: "Today"
"cal.backToday": "Kembali ke hari ini",   // en: "Back to today"
"cal.room": "Ruang",                      // en: "Room"
"cal.deadlineAt": " • deadline ",         // en: " • due "
"cal.emptyDate": "Tidak ada agenda di tanggal ini.", // en: "No agenda on this date."
"cal.enjoyDay": "Nikmati harimu!",        // en: "Enjoy your day!"
"cal.addSched": "Tambah Jadwal",          // en: "Add Event"
"cal.weeklyRoutine": "Jadwal rutin mingguan", // en: "Weekly routine"
"cal.noRoutine": "Belum ada jadwal rutin.", // en: "No routine yet."
"cal.manageRoutine": "Kelola jadwal rutin", // en: "Manage routine"
```
Judul greet "Kalender" → reuse `t("nav.calendar")`.

- [ ] **Step 4: Wiring + ganti literal (baris 94-291)**

  Import: tambah `dayNames, monthNames, dowInitials` ke import `@/lib/dates` (baris 5) dan `const { lang, t } = useLang();` di badan komponen; `DAYS`/`MONTHS` tidak dipakai lagi → hapus dari import bila tak ada pemakaian lain di file.
  Baris 94: small per tabel. Baris 100/110: aria bulan. Baris 106: `{MONTHS[mo]} {y}` → `{monthNames(lang)[mo]} {y}`. Baris 117: `["S","S","R","K","J","S","M"]` → `{dowInitials(lang).map(...)}` — PERTAHANKAN struktur render (cek kode: kemungkinan `.map((d, i) => <div key={i} className="dow">{d}</div>)`; hanya ganti sumber array).
  Baris 153/157/161: legend → `t("cal.routine")`/`t("cal.agenda")`/`t("cal.deadline")`. Baris 171: `Agenda • {fmtDateID(selDate)}` → `{t("cal.agenda")} • {fmtDateID(selDate, lang)}`. Baris 174-175: aria `t("cal.backToday")`, teks `Hari ini ›` → `{t("cal.today")} <span>›</span>`.
  Baris 185: pill `"Rutin"` → `t("cal.routine")`. Baris 189-190: `` ` • Ruang ${x.room}` `` → `` ` • ${t("cal.room")} ${x.room}` ``; `` ` • ${x.lect}` `` TETAP. Baris 200: `fmtSchedRange(s)` → `fmtSchedRange(s, lang)` (`•` TETAP).
  Baris 204/207/280: `` `Ubah ${s.title}` `` → `` `${t("common.edit")} ${s.title}` ``; `` `Hapus ${...}` `` → `` `${t("common.delete")} ${...}` ``.
  Baris 213: `taskBadge(x)` → `taskBadge(x, lang)`. Baris 221: `` `${x.title}. Ketuk untuk tandai selesai.` `` → `` `${x.title}${t("common.tapToComplete")}` ``. Baris 238: `{x.matkul} • deadline {x.time}` → `{x.matkul}{t("cal.deadlineAt")}{x.time}`.
  Baris 247-249/255/264/275-277/286/291 per tabel; baris 275: `{DAYS[r.day-1]} • ...` → `{dayNames(lang)[r.day-1]} • ...` (`–` dan ` • ` TETAP); baris 276-277 seperti 189-190.

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs`
Expected: PASS

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/CalendarView.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate Kalender full EN"
```

---

### Task 8: Translate SchedSheet + TaskSheet + ReminderChips

**Files:**
- Modify: `components/Sheets.tsx` (SchedSheet ~baris 110-273, TaskSheet ~478-638, ReminderChips 74-108), `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `useLang`; key `common.close`, `common.save`, `common.optional` (baru), `sched.*`, `task.*`, `reminder.*` (baru).
- Produces: `REMINDER_VALUES` (ganti `REMINDER_OPTIONS`); key `sched.*`, `task.*`, `reminder.*`, `common.optional` (dipakai Task 9 untuk label opsional lain bila ada).

- [ ] **Step 1: Tambah cek gagal**

```js
const sheets = readFileSync("components/Sheets.tsx", "utf8");
const schedBlock = sheets.slice(sheets.indexOf("export function SchedSheet"), sheets.indexOf("export function MailSheet"));
const taskBlock = sheets.slice(sheets.indexOf("export function TaskSheet"), sheets.indexOf("export function RoutineSheet"));
// ... tambah ke checks:
["sched/task useLang", schedBlock.includes("useLang()") && taskBlock.includes("useLang()")],
["sched tanpa hardcode", !schedBlock.includes("Ubah Jadwal") && !schedBlock.includes("Tambah Jadwal") && !schedBlock.includes("Isi judul dulu") && !schedBlock.includes("Jam selesai")],
["task tanpa hardcode", !taskBlock.includes("Ubah Tugas") && !taskBlock.includes("Mata kuliah") && !taskBlock.includes("Dikosongkan = akhir hari") && !taskBlock.includes("Prioritas")],
["reminder values", sheets.includes("REMINDER_VALUES") && !sheets.includes("REMINDER_OPTIONS")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Tambah key (kedua blok)**

```ts
"common.optional": "(opsional)",              // en: "(optional)"
"reminder.title": "Pengingat",                // en: "Reminder"
"reminder.off": "Mati",                       // en: "Off"
"reminder.min": " mnt",                       // en: " min"
"sched.editTitle": "Ubah Jadwal",             // en: "Edit Event"
"sched.addTitle": "Tambah Jadwal",            // en: "Add Event"
"sched.hint": "Agenda sekali saja. Untuk matkul tiap minggu, pakai jadwal rutin.", // en: "One-time agenda. For weekly courses, use a routine schedule."
"sched.titleRequired": "Isi judul dulu — cth: Seminar proposal", // en: "Enter a title first — e.g. Thesis defense"
"sched.endInvalid": "Format jam selesai tidak valid — kosongkan bila sekilas", // en: "Invalid end time — leave empty for point-time events"
"sched.fieldTitle": "Judul",                  // en: "Title"
"sched.titlePh": "cth: Seminar proposal",     // en: "e.g. Thesis defense"
"sched.fieldDate": "Tanggal",                 // en: "Date"
"sched.startLabel": "Jam mulai ",             // en: "Start time "
"sched.endLabel": "Jam selesai ",             // en: "End time "
"sched.endHint": "Dikosongkan = sekilas (pakai jam mulai saja). Diisi = tampil rentang 09.00–10.40. Jam selesai lebih kecil = lewat tengah malam (besok).", // en: "Leave empty = point-time (start time only). Filled = shows a range like 09.00–10.40. An end earlier than the start means past midnight (tomorrow)."
"sched.fieldNote": "Keterangan",              // en: "Details"
"sched.notePh": "Ruang, dosen, link meeting…", // en: "Room, lecturer, meeting link…"
"sched.saving": "Menyimpan…",                 // en: "Saving…"
"sched.saveChanges": "Simpan perubahan",      // en: "Save changes"
"task.editTitle": "Ubah Tugas",               // en: "Edit Task"
"task.addTitle": "Tambah Tugas",              // en: "Add Task"
"task.hint": "Deadline otomatis muncul di Kalender & Dashboard.", // en: "Deadlines automatically appear on Calendar & Dashboard."
"task.titleRequired": "Isi judul tugas dulu — cth: Laporan modul 6", // en: "Enter the task title first — e.g. Module 6 report"
"task.fieldCourse": "Mata kuliah",            // en: "Course"
"task.coursePh": "cth: Basis Data",           // en: "e.g. Databases"
"task.fieldTitle": "Judul tugas",             // en: "Task title"
"task.titlePh": "cth: Laporan modul 6",       // en: "e.g. Module 6 report"
"task.fieldDate": "Deadline tanggal",         // en: "Deadline date"
"task.fieldTime": "Jam ",                     // en: "Time "
"task.timeHint": "Dikosongkan = akhir hari 23.59.", // en: "Leave empty = end of day 23:59."
"task.fieldPrio": "Prioritas",                // en: "Priority"
"task.fieldNote": "Catatan",                  // en: "Notes"
"task.notePh": "Cara kumpul, link, dsb…",     // en: "How to submit, links, etc…"
"task.saving": "Menyimpan…",                  // en: "Saving…"
"task.saveChanges": "Simpan perubahan",       // en: "Save changes"
```
Tombol Tutup → `t("common.close")`; Simpan → `t("common.save")`. Label `"Pengingat"` (Sched 258, Task 623) → `t("reminder.title")`. Label opsional: `"Jam mulai " + "(opsional)"` → `{t("sched.startLabel")}{t("common.optional")}` (pola sama untuk end & task time).

- [ ] **Step 4: Wiring + ganti literal**

  4a. Import `useLang` di `Sheets.tsx`; di `SchedSheet`, `TaskSheet`, `ReminderChips`: `const { t } = useLang();` (pertama di badan fungsi).
  4b. `REMINDER_OPTIONS` (baris 74-80) → `export const REMINDER_VALUES = [0, 5, 15, 30, 60];` — grep dulu importer di luar file ini: hanya `ReminderChips` internal (sudah dikonfirmasi). Render: `{REMINDER_VALUES.map((v) => (... {v === 0 ? t("reminder.off") : `${v}${t("reminder.min")}`} ...))}` — PERTAHANKAN `key`, `id={`${idPrefix}-${v}`}`, `aria-pressed`, `onClick`. aria group `"Pengingat"` → `t("reminder.title")`.
  4c. SchedSheet (baris 159-267) & TaskSheet (528-630): ganti SEMUA literal per tabel key di atas, 1:1 sesuai inventaris (label, placeholder, hint, error validasi, tombol submit 3-state `Menyimpan…/Simpan perubahan/Simpan` → `saving/saveChanges/common.save` — pola SAMA seperti NoteSheet).
  4d. Prioritas select (617-619): `"Tinggi"/"Sedang"/"Rendah"` → `{prioLabel("tinggi", lang)}` — perlu `lang` juga: `const { lang, t } = useLang();` di TaskSheet. `value="tinggi"` TETAP.

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs`
Expected: PASS

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/Sheets.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate sheet Jadwal & Tugas full EN"
```

---

### Task 9: Translate MailSheet + RoutineSheet + InfoSheet

**Files:**
- Modify: `components/Sheets.tsx` (MailSheet ~348-475, RoutineSheet ~740-866, InfoSheet 52-72), `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `useLang`; `dayNames(lang)` (Task 3); `LEGAL[lang][id]` (struktur baru di Task 12 — URUTAN: Task 9 memakai `LEGAL[lang][id]` sehingga Task 12 HARUS SEBELUM Task 9? InfoSheet butuh struktur legal baru. Putuskan: Task 9 untuk Mail+Routine dulu dengan `LEGAL[id]` tetap, InfoSheet lang-wiring ikut Task 12. REVISI cakupan task ini: MailSheet + RoutineSheet SAJA; InfoSheet pindah ke Task 12.)
- Produces: key `mail.*`, `routine.*`.

- [ ] **Step 1: Tambah cek gagal**

```js
const mailBlock = sheets.slice(sheets.indexOf("export function MailSheet"), sheets.indexOf("export function TaskSheet"));
const routineBlock = sheets.slice(sheets.indexOf("export function RoutineSheet"));
// ... tambah ke checks (variabel sheets sudah dibaca di Task 8 — tambah readFileSync bila scope terpisah):
["mail/routine useLang", mailBlock.includes("useLang()") && routineBlock.includes("useLang()")],
["mail tanpa hardcode", !mailBlock.includes("Tulis Email") && !mailBlock.includes("Kepada") && !mailBlock.includes("Mengirim") && !mailBlock.includes("Terkirim langsung")],
["routine tanpa hardcode", !routineBlock.includes("Kelola Jadwal Rutin") && !routineBlock.includes("Mata kuliah") && !routineBlock.includes("Jadwal buatanmu (") && !routineBlock.includes("Menambah")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Tambah key (kedua blok)**

```ts
"mail.replyTitle": "Balas Email",             // en: "Reply Email"
"mail.fwdTitle": "Teruskan Email",            // en: "Forward Email"
"mail.composeTitle": "Tulis Email",           // en: "Compose Email"
"mail.hint": "Terkirim langsung via Gmail.",  // en: "Sent directly via Gmail."
"mail.toInvalid": "Format email tujuan tidak valid", // en: "Invalid recipient email format"
"mail.fieldTo": "Kepada",                     // en: "To"
"mail.toPh": "dosen@univ.ac.id",              // en: "lecturer@univ.ac.id"
"mail.fieldSubj": "Subjek ",                  // en: "Subject "
"mail.subjPh": "Izin / konsultasi / tugas…",  // en: "Permission / consultation / assignment…"
"mail.fieldBody": "Isi",                      // en: "Body"
"mail.bodyPh": "Tulis pesan…",                // en: "Write a message…"
"mail.sending": "Mengirim…",                  // en: "Sending…"
"mail.send": "Kirim",                         // en: "Send"
"routine.title": "Kelola Jadwal Rutin",       // en: "Manage Routine Schedule"
"routine.hint": "Matkul tetap tiap minggu — otomatis muncul di Kalender.", // en: "Fixed weekly courses — automatically appear on Calendar."
"routine.fieldCourse": "Mata kuliah",         // en: "Course"
"routine.coursePh": "cth: Sistem Operasi",    // en: "e.g. Operating Systems"
"routine.fieldDay": "Hari",                   // en: "Day"
"routine.fieldRoom": "Ruang",                 // en: "Room"
"routine.roomPh": "cth: 2A",                  // en: "e.g. 2A"
"routine.fieldStart": "Mulai",                // en: "Start"
"routine.fieldEnd": "Selesai",                // en: "End"
"routine.fieldLect": "Dosen",                 // en: "Lecturer"
"routine.lectPh": "cth: Pak Andi",            // en: "e.g. Mr. Andi"
"routine.adding": "Menambah…",                // en: "Adding…"
"routine.add": "Tambah",                      // en: "Add"
"routine.mineTitle": "Jadwal buatanmu (",     // en: "Your schedules ("
"routine.emptyMine": "Belum ada — tambah lewat form di atas.", // en: "None yet — add via the form above."
```
Tutup → `common.close`; tombol Hapus per-row → `common.delete`.

- [ ] **Step 4: Wiring + ganti literal**

  4a. `const { lang, t } = useLang();` di `MailSheet` dan `RoutineSheet`.
  4b. MailSheet judul per `mode` (389-392): `mode === "balas" ? t("mail.replyTitle") : mode === "teruskan" ? t("mail.fwdTitle") : t("mail.composeTitle")` — PERTAHANKAN struktur ternary yang ada, hanya ganti literalnya. Sisa baris 396-470 per tabel; counter `{subj.length}/100` TETAP.
  4c. RoutineSheet: `dayName` lokal (baris 764) → HAPUS, ganti pemakaian (baris 854) dengan `dayNames(lang)[r.day - 1] ?? ""`; `<select id="rDay">` options (810-816): PERTAHANKAN `value` yang ada (cek file — kemungkinan `value={i + 1}`), ganti label dengan `dayNames(lang)[i]`. Jika options hardcode `value="Senin"` (string!), UBAH menjadi index 1-7 DENGAN HATI-HATI: `onSave` menerima `day:number` — pastikan konversi benar (`value={i+1}` + `Number(e.target.value)`). Cek kode select sebelum edit.
  4d. Header list (846): `"Jadwal buatanmu (" + {mine.length} + ")"` → `{t("routine.mineTitle")}{mine.length})`.

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs`
Expected: PASS

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/Sheets.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate sheet Email & Rutin full EN"
```

---

### Task 10: Translate SettingsView (settings.*)

**Files:**
- Modify: `components/SettingsView.tsx` (hasil rename Task 1), `lib/i18n.ts`
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `useLang`; key `common.*`.
- Produces: key `settings.*`.

- [ ] **Step 1: Tambah cek gagal**

```js
const settingsV = readFileSync("components/SettingsView.tsx", "utf8");
// ... tambah ke checks:
["settings useLang", settingsV.includes("useLang()")],
["settings tanpa hardcode", !settingsV.includes("Galeri Tema") && !settingsV.includes("Hubungkan Google") && !settingsV.includes("Akun Google yang tersambung") && !settingsV.includes("Nama tampilan") && !settingsV.includes("Warna tampilan") && !settingsV.includes("Terang, gelap") && !settingsV.includes("Login dengan Google") && !settingsV.includes("Keluar dari pratinjau") && !settingsV.includes("Tersambung sebagai") && !settingsV.includes("Pembuat &")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Tambah key (kedua blok)**

```ts
"settings.title": "Pengaturan",               // en: "Settings"
"settings.accountOn": "Akun Google yang tersambung", // en: "Connected Google account"
"settings.previewMode": "Mode pratinjau — data contoh", // en: "Preview mode — sample data"
"settings.account": "Akun",                   // en: "Account"
"settings.loggedSub": "Login via Google",     // en: "Logged in via Google"
"settings.guestMode": "Mode tamu",            // en: "Guest mode"
"settings.guestSub": "Pratinjau dengan data contoh", // en: "Preview with sample data"
"settings.displayName": "Nama tampilan",      // en: "Display name"
"settings.namePh": "cth: Budi",               // en: "e.g. Budi"
"settings.logout": "Keluar",                  // en: "Log out"
"settings.connectGoogle": "Hubungkan Google", // en: "Connect Google"
"settings.exitPreview": "Keluar dari pratinjau (hapus data tamu)", // en: "Exit preview (delete guest data)"
"settings.themeGallery": "Galeri Tema",       // en: "Theme Gallery"
"settings.appearance": "Tampilan",            // en: "Appearance"
"settings.appearanceSub": "Terang, gelap, atau ikut sistem", // en: "Light, dark, or follow system"
"settings.light": "Terang",                   // en: "Light"
"settings.dark": "Gelap",                     // en: "Dark"
"settings.auto": "Otomatis",                  // en: "Automatic"
"settings.modeGroup": "Mode tampilan",        // en: "Display mode"
"settings.accentColor": "Warna tampilan",     // en: "Accent color"
"settings.accentSub": "Aksen tombol, badge & logo — pilihanmu, tersimpan di perangkat", // en: "Button, badge & logo accents — your choice, stored on this device"
"settings.colorOf": "Warna ",                 // en: "Color "
"settings.customColor": "Warna custom",       // en: "Custom color"
"settings.reset": "Reset",                    // en: "Reset"
"settings.reminderTitle": "Pengingat jadwal", // en: "Schedule reminders"
"settings.reminderSub": "Notifikasi pengingat dari aplikasi", // en: "Reminder notifications from the app"
"settings.connTitle": "Koneksi Google",       // en: "Google connection"
"settings.connLive": "Tersambung sebagai {email}", // en: "Connected as {email}"
"settings.connNone": "Belum tersambung",      // en: "Not connected"
"settings.loginGoogle": "Login dengan Google", // en: "Log in with Google"
"settings.info": "Info",                      // en: "Info"
"settings.credit": "Kredit",                  // en: "Credits"
"settings.creditSub": "Pembuat & teknologi notedwork", // en: "notedwork makers & tech"
"settings.privacy": "Privasi",                // en: "Privacy"
"settings.privacySub": "Data apa yang disimpan & di mana", // en: "What data is stored & where"
"settings.terms": "Syarat",                   // en: "Terms"
"settings.termsSub": "Aturan pakai aplikasi ini", // en: "Rules for using this app"
"settings.open": "Buka",                      // en: "Open"
"settings.about": "Tentang",                  // en: "About"
"settings.aboutBody1": "notedwork — email, tugas & kalender untuk mahasiswa.", // en: "notedwork — email, tasks & calendar for students."
"settings.aboutBody2": "Bisa dipasang ke layar utama HP.", // en: "Can be installed to your phone's home screen."
```
Mode chips: `{m === "light" ? "Terang" : m === "dark" ? "Gelap" : "Otomatis"}` → `{m === "light" ? t("settings.light") : m === "dark" ? t("settings.dark") : t("settings.auto")}`. `aria-label={`Warna ${c}`}` → `` `${t("settings.colorOf")}${c}` ``. Koneksi: `{connected ? `Tersambung sebagai ${email}` : preview ? "Mode pratinjau — data contoh" : "Belum tersambung"}` → `{connected ? t("settings.connLive").replace("{email}", email ?? "") : preview ? t("settings.previewMode") : t("settings.connNone")}` (reuse `settings.previewMode` untuk greet small juga).

- [ ] **Step 4: Wiring + ganti literal (baris 44-313 file hasil rename)**

  `const { t } = useLang();` setelah `useTheme()`. Ganti SEMUA literal per tabel, 1:1 mengikuti struktur JSX yang ada (greet, kartu Akun, Galeri Tema, set-row notifikasi/koneksi, kartu Info, kartu Tentang). `title="Warna custom"` + `aria-label="Warna custom"` → `t("settings.customColor")`. `title={c}` pada preset TETAP (hex code, bukan teks).

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs`
Expected: PASS

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/SettingsView.tsx lib/i18n.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate Pengaturan full EN"
```

---

### Task 11: Toast/banner/confirm/quote di NotedworkApp + dep-array t

**Files:**
- Modify: `components/NotedworkApp.tsx`, `lib/i18n.ts`, `lib/preview.ts` (hapus export)
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `t` dari `useLang()` (sudah ada, baris 64); `LANG_KEY`, `STRINGS`, `pickLang`, `type Lang` dari `@/lib/i18n`.
- Produces: key `toast.*`, `banner.*`. Tidak ada interface baru.

- [ ] **Step 1: Tambah cek gagal**

```js
const shell = readFileSync("components/NotedworkApp.tsx", "utf8");
// ... tambah ke checks:
["shell toast via t()", shell.includes('t("toast.taskDone")') && shell.includes('t("toast.schedSaved")') && shell.includes('t("toast.archived")') && shell.includes('t("toast.connected")')],
["shell tanpa hardcode", !shell.includes('"Tugas selesai!"') && !shell.includes('"Diarsipkan"') && !shell.includes('"Jadwal tersimpan"') && !shell.includes('"Terhubung ke Google"') && !shell.includes('"Keluar dari pratinjau?') && !shell.includes("PREVIEW_LOGIN_HINT") && !shell.includes('"Mode pratinjau — data contoh"') && !shell.includes('"Login dengan Google"')],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Tambah key (kedua blok)**

```ts
"toast.syncFail": "Gagal sync Google",        // en: "Google sync failed"
"toast.loginTokenFail": "Login Google gagal saat simpan token — coba lagi", // en: "Google login failed while saving token — try again"
"toast.loginSessionFail": "Login Google gagal saat buat sesi — coba lagi", // en: "Google login failed while creating session — try again"
"toast.loginExpired": "Login Google kedaluwarsa — coba lagi", // en: "Google login expired — try again"
"toast.loginCancelled": "Login Google dibatalkan", // en: "Google login cancelled"
"toast.loginFail": "Login Google gagal, coba lagi", // en: "Google login failed, try again"
"toast.connected": "Terhubung ke Google",     // en: "Connected to Google"
"toast.mailBodyFail": "Gagal memuat isi email", // en: "Failed to load email body"
"toast.starFail": "Gagal ubah bintang",       // en: "Failed to change star"
"toast.archived": "Diarsipkan",               // en: "Archived"
"toast.markedUnread": "Ditandai belum dibaca", // en: "Marked as unread"
"toast.gmailFail": "Aksi Gmail gagal",        // en: "Gmail action failed"
"toast.taskReopened": "Dibuka lagi",          // en: "Reopened"
"toast.taskDone": "Tugas selesai!",           // en: "Task done!"
"toast.taskDeleted": "Tugas dihapus",         // en: "Task deleted"
"toast.taskMissing": "Tugas tidak ditemukan", // en: "Task not found"
"toast.schedDeleted": "Jadwal dihapus",       // en: "Event deleted"
"toast.gcalDeleted": "Event Google dihapus",  // en: "Google event deleted"
"toast.schedDeleteFail": "Gagal hapus event", // en: "Failed to delete event"
"toast.schedSaved": "Jadwal tersimpan",       // en: "Event saved"
"toast.schedSavedGcal": "Jadwal tersimpan ke Google Calendar", // en: "Event saved to Google Calendar"
"toast.schedSaveFail": "Gagal simpan ke Google", // en: "Failed to save to Google"
"toast.schedMissing": "Jadwal tidak ditemukan", // en: "Event not found"
"toast.schedUpdated": "Jadwal diperbarui",    // en: "Event updated"
"toast.schedUpdatedGcal": "Jadwal diperbarui di Google Calendar", // en: "Event updated in Google Calendar"
"toast.updateFailPrefix": "Gagal ubah: ",     // en: "Failed to update: "
"toast.previewLoginHint": "Login dengan Google untuk memakai data aslimu", // en: "Log in with Google to use your real data"
"toast.mailSent": "Email terkirim via Gmail", // en: "Email sent via Gmail"
"toast.sendFailPrefix": "Gagal kirim: ",      // en: "Failed to send: "
"toast.loggedOut": "Keluar dari Google",      // en: "Logged out of Google"
"toast.loggedOutLocal": "Keluar lokal; sesi server mungkin masih aktif — coba lagi", // en: "Logged out locally; the server session may still be active — try again"
"toast.exitPreview": "Keluar dari mode pratinjau", // en: "Exited preview mode"
"toast.exitPreviewConfirm": "Keluar dari pratinjau? Data tamu (tugas, rutin, jadwal contoh) akan dihapus dan dikembalikan ke contoh awal.", // en: "Exit preview? Guest data (sample tasks, routines, events) will be deleted and reset to the original samples."
"toast.routineDeleted": "Jadwal rutin dihapus", // en: "Routine deleted"
"toast.reminderPrefix": "Pengingat: ",        // en: "Reminder: "
"toast.notifOff": "Pengingat dimatikan",      // en: "Reminders off"
"toast.notifOn": "Pengingat dinyalakan",      // en: "Reminders on"
"toast.taskUpdated": "Tugas diperbarui",      // en: "Task updated"
"toast.taskSaved": "Tugas tersimpan",         // en: "Task saved"
"toast.routineSaved": "Jadwal rutin tersimpan", // en: "Routine saved"
"banner.previewTitle": "Mode pratinjau — data contoh", // en: "Preview mode — sample data"
"banner.previewSub": "Bukan data aslimu. Login untuk Gmail & Kalender asli.", // en: "Not your real data. Log in for real Gmail & Calendar."
"banner.login": "Login dengan Google",        // en: "Log in with Google"
"mail.quoteWrote": "Pada {time}, {from} menulis:", // en: "On {time}, {from} wrote:"
"mail.quoteFwd": "— Diteruskan dari {from} <{email}> —", // en: "— Forwarded from {from} <{email}> —"
```

- [ ] **Step 4: Ganti call-sites + dep-array**

  4a. Rename shadowing: `toggleTask` baris 473 `const t = tasksRef.current.find(...)` → `const found = ...` + sesuaikan `t.done` → `found.done` dst.; `startEditTask` baris 491 `const t = ...` → `const found = ...` + `if (!found)` + `setEditingTask(found)`.
  4b. Semua `toastMsg("<ID>")` → `toastMsg(t("toast.<key>"))` sesuai tabel (baris 220, 347, 370, 410, 414, 448, 453, 459, 463, 475, 483, 493, 507, 514, 517, 551, 560, 563, 581, 593, 625, 635, 666, 687, 704, 710, 757, 986, 992, 1023 + inline 912 `"Pengingat dimatikan/dinyalakan"`). Prefix dinamis: `` `Gagal ubah: ${...}` `` → `` `${t("toast.updateFailPrefix")}${...}` `` (638); `` `Gagal kirim: ${...}` `` → `` `${t("toast.sendFailPrefix")}${...}` `` (669); `"Pengingat: " + d.title` → `t("toast.reminderPrefix") + d.title` (757).
  4c. `toastMsg(PREVIEW_LOGIN_HINT)` (661) → `toastMsg(t("toast.previewLoginHint"))`; import baris 7 hapus `PREVIEW_LOGIN_HINT` (sisakan yang lain); hapus `export const PREVIEW_LOGIN_HINT...` di `lib/preview.ts` (satu-satunya pemakai sudah diganti — grep konfirmasi sebelum hapus).
  4d. Quote boilerplate `mailAction` (392, 401, 429, 440): `` `\n\n— — —\nPada ${m.time}, ${m.from} menulis:\n${quoted}` `` → `` `\n\n— — —\n${t("mail.quoteWrote").replace("{time}", m.time).replace("{from}", m.from)}:\n${quoted}` `` — HATI-HATI: key diakhiri `:` + template menambah `:` → HAPUS `:` ekstra di template (key sudah mengandung titik dua). Sama untuk teruskan: `` `\n\n— Diteruskan dari ${m.from} <${m.email}> —\n${quoted}` `` → `` `\n\n${t("mail.quoteFwd").replace("{from}", m.from).replace("{email}", m.email)}\n${quoted}` ``. Berlaku untuk blok preview (392/401) DAN remote (429/440). Prefix `"Re: "` / `"Fwd: "` TETAP.
  4e. Banner (812/814/821): `"Mode pratinjau — data contoh"` → `t("banner.previewTitle")`; `"Bukan data aslimu..."` → `t("banner.previewSub")` (perhatikan source `&amp;` = `&` biasa); `"Login dengan Google"` → `t("banner.login")`.
  4f. `exitPreview` confirm (694): string → `t("toast.exitPreviewConfirm")`.
  4g. OAuth effect (238-248): `t` di mount-effect adalah closure basi (lang restore jalan belakangan) — baca bahasa tersimpan sinkron:
```ts
import { LANG_KEY, STRINGS, pickLang, type Lang } from "@/lib/i18n";
// di dalam effect, sebelum memilih pesan:
let storedLang: Lang = "id";
try {
  storedLang = pickLang(JSON.parse(localStorage.getItem(LANG_KEY) ?? "null")) ?? "id";
} catch { storedLang = "id"; }
const tt = (k: string) => STRINGS[storedLang][k] ?? STRINGS.id[k] ?? k;
```
lalu 6 literal `"Login Google..."` + `"Terhubung ke Google"` → `tt("toast.loginTokenFail")` dst. (effect mount-only + eslint-disable TETAP; tidak tambah dep).
  4h. Tambahkan `t` ke dep-array SEMUA `useCallback` yang memakai `t(...)` hasil 4b (`refreshRemote`, `openMail`, `toggleStar`, `mailAction`, `toggleTask`, `delTask`, `startEditTask`, `delSched`, `saveSched`, `startEditSched`, `saveEditSched`, `saveMail`, `logoutGoogle`, `exitPreview`, `delRoutine`) — caranya: tambahkan `, t` sebelum `]` penutup tiap dep-array (jangan ubah isi lain). Effect reminder (dep `[schedules, tasks, notif, toastMsg]`) → tambah `t`. Inline JSX (`onToggleNotif`, TaskSheet/RoutineSheet `onSave`) TIDAK perlu dep (closure render).

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && node tests/repro-i18n-parity.mjs && npm test`
Expected: PASS semua (full suite — tidak ada regresi repro lama)

- [ ] **Step 6: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add components/NotedworkApp.tsx lib/i18n.ts lib/preview.ts tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): translate toast/banner/confirm shell full EN"
```

---

### Task 12: Legal EN + InfoSheet lang-wiring

**Files:**
- Modify: `lib/legal.ts`, `components/Sheets.tsx` (InfoSheet 52-72), `lib/i18n.ts` (TIDAK ada key baru — judul dari LEGAL)
- Test: `tests/repro-settings-i18n.mjs` (append)

**Interfaces:**
- Consumes: `type Lang` dari `@/lib/i18n` (type-only); `useLang` di InfoSheet.
- Produces: `LEGAL: Record<Lang, Record<LegalId, LegalDoc>>`.

- [ ] **Step 1: Tambah cek gagal**

```js
const legal = readFileSync("lib/legal.ts", "utf8");
// ... tambah ke checks:
["legal EN", legal.includes("Record<Lang, Record<LegalId, LegalDoc>>") && legal.includes('"Credits"') && legal.includes('"Updated September 2026"')],
["legal ID konsisten", legal.includes("via Pengaturan → Keluar") && legal.includes("(Pengaturan → Syarat)") && !legal.includes("via Profil →") && !legal.includes("(Profil →")],
["infosheet lang", sheets.includes("LEGAL[lang][id]")],
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `node tests/repro-settings-i18n.mjs`
Expected: FAIL

- [ ] **Step 3: Restruktur legal.ts + tulis EN + perbaiki referensi Profil**

  3a. Import type: `import type { Lang } from "./i18n";`. Ubah `export const LEGAL: Record<LegalId, LegalDoc> = {` → `export const LEGAL: Record<Lang, Record<LegalId, LegalDoc>> = {\n  id: {` + tutup blok ID + tambah blok `en: {...}` + tutup. ISI ID PERSIS SAMA kecuali 2 kalimat: privacy body[3] `via Profil → Keluar` → `via Pengaturan → Keluar`; terms body[4] `(Profil → Syarat)` → `(Pengaturan → Syarat)`.
  3b. Blok `en` (verbatim, lengkap):
```ts
en: {
  credit: {
    title: "Credits",
    updated: "notedwork • 2026",
    body: [
      "notedwork is a student email, task & calendar dashboard — built as a personal project by @Rochwidias.",
      "Built with Next.js, React, TypeScript, and Tailwind CSS, deployed on Vercel. Poppins & JetBrains Mono fonts (Google Fonts).",
      "Email & calendar data comes from the Gmail API and Google Calendar API of your own Google account. Gmail and Google Calendar are trademarks of Google LLC.",
      "Icons & interface made exclusively for notedwork. Default accent brown (#B45309) — you can change it in Settings.",
    ],
  },
  privacy: {
    title: "Privacy",
    updated: "Updated September 2026",
    body: [
      "Local-first: tasks, routines, theme, color, guest name & notification preferences are stored ONLY in your device's browser (localStorage). notedwork has no database for that data and sells no data whatsoever.",
      "Google login uses official OAuth2. Requested scopes: gmail.readonly (reading email), gmail.send (sending email), gmail.modify (star/archive/mark read), calendar.readonly (reading events), calendar.events (adding/removing events). Without these permissions the related features won't work — preview mode remains usable without login.",
      "OAuth tokens are stored encrypted (AES-GCM 256-bit) on the notedwork server (Supabase, server-only access). Your browser never holds tokens; all it has is a 30-day httpOnly session cookie (notedwork_session).",
      "Disconnect anytime via Settings → Log out: the server token is revoked & the session deleted. To fully revoke, also remove notedwork access in your Google account (Security → Third-party access). Local tasks stay until you clear site data in the browser.",
      "No ads, no cross-site tracking, no third-party analytics in this app.",
    ],
  },
  terms: {
    title: "Terms of Use",
    updated: "Updated September 2026",
    body: [
      "notedwork is provided as-is for personal study use. No uptime guarantees, and Google features follow Google's quotas & policies.",
      "Your Google account & its contents remain yours. You are responsible for emails you send and events you create through this app.",
      "Use fairly: no spam, abuse, or excessive automation violating Google's policies — Google may throttle API access if abused.",
      "Logging out of Google revokes the server token & deletes the session on that device; local tasks & routines are kept. Preview mode uses fictional sample data — not anyone's real data.",
      "These terms may change; the latest version is always available in the app (Settings → Terms). Continued use means you agree to the latest version.",
    ],
  },
},
```
  3c. InfoSheet: tambah import `useLang`; `const doc = LEGAL[id];` → `const { lang } = useLang();` + `const doc = LEGAL[lang][id];` (hook SEBELUM early-return `if (id == null) return null` — pindahkan early-return setelah hook agar tertib hooks). Tombol `"Tutup"` → `{t("common.close")}` (perlu `t` juga dari `useLang()`).

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `node tests/repro-settings-i18n.mjs && npm test`
Expected: PASS

- [ ] **Step 5: Verifikasi + commit**

Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
```bash
git add lib/legal.ts components/Sheets.tsx tests/repro-settings-i18n.mjs
git commit -m "feat(i18n): dokumen legal versi EN + InfoSheet ikut bahasa"
```

---

### Task 13: Final — daftarkan test, verifikasi penuh + visual

**Files:**
- Modify: `package.json:10`, (tidak ada kode lain kecuali temuan visual)

**Interfaces:**
- Consumes: semua task 1-12.

- [ ] **Step 1: Daftarkan repro ke npm test**

`"test": "... && node tests/repro-topbar-lang.mjs"` → tambah ` && node tests/repro-settings-i18n.mjs` di ujung.

- [ ] **Step 2: Full suite + typecheck + lint**

Run: `npm test`
Expected: SEMUA skrip PASS (repro lama + parity + topbar + settings)
Run: `npx tsc --noEmit; if ($?) { npx eslint components lib tests }`
Expected: bersih

- [ ] **Step 3: Cek visual Playwright ID + EN**

Jalankan dev server (`npm run dev -- --port 3100`), lalu dengan Playwright + Chrome sistem: (a) mode ID: 6 tab tampil, gear di Catatan membuka Pengaturan; (b) toggle EN: tiap tab (beranda/email/tugas/kalender/catatan/settings) + sheet (jadwal/tugas/email/rutin/note/tambah) + InfoSheet (privacy) tidak ada sisa teks Indonesia — scan `page.content()` terhadap daftar literal ID dari cek "tanpa hardcode" di `tests/repro-settings-i18n.mjs` (Task 4-11), 0 console error; (c) viewport 360px: 6 ikon muat 1 baris, `overflow-x` 0; (d) screenshot arsip ke `.playwright-mcp/`. Temuan visual WAJIB diperbaiki di task ini sebelum commit (edit file terkait + catat di pesan commit).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(test): daftarkan repro-settings-i18n di npm test"
```
(Push ke `main` menunggu perintah pemilik.)
