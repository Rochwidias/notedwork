# Add Note Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB‑SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task‑by‑task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to create, edit, and delete personal notes from the app, accessible via a button next to the calendar, and provide a settings button for future configuration.

**Architecture:** Add a new `NotesView` component displaying note cards, backed by localStorage for preview mode and future Google Keep sync. Reuse existing UI elements (Card, Modal, Toast) for consistency.

**Tech Stack:** React, TypeScript, Tailwind CSS, localStorage; stub Google Keep client (`google_keep.py`) deferred.

**Spec:** docs/superpowers/specs/2024-09-18-add-note-feature-design.md

## Global Constraints
- Use existing design tokens (`--bg`, `--card`, `--muted`, `--brand-soft`).
- Tailwind: use mapped names (`bg-paper`, `bg-card`, `text-muted`) or arbitrary values (`bg-[var(--brand-soft)]`). Do NOT use `bg-bg` or `bg-brand-soft` (not in `tailwind.config.ts`).
- Follow current naming conventions (`camelCase` for functions, `PascalCase` for components).
- No new npm dependencies. No jest/vitest/`@testing-library` — tests MUST use the repo's `tests/repro-*.mjs` node-script pattern (`node tests/repro-xxx.mjs`, see `tests/repro.mjs`, `tests/repro-notes-keys.mjs`).
- Canonical `Note` type is `lib/types.ts:65-71` (`{ id, title, body, updatedAt: number }`). Do NOT redefine `Note` in components. If `pinned` is needed, add `pinned?: boolean` to `lib/types.ts`.
- All UI must be responsive and accessible (ARIA labels, keyboard focus).
---

### Task 1: Create NotesView component

**Files:**
- Create: `components/NotesView.tsx`
- Modify: `components/AppNav.tsx` (add button linking to `/notes`)
- Test: `tests/repro-notes-view.mjs`

**Interfaces:**
- Consumes: `Note` from `lib/types.ts` (do NOT redefine).
- Produces: `NotesView` view.

- [ ] **Step 1: Write failing test** (`tests/repro-notes-view.mjs`, follow `tests/repro-notes-keys.mjs` static-check pattern):
```js
import { readFileSync, existsSync } from "node:fs";
let fail = 0;
const check = (n, c) => { console.log(`${c ? "PASS" : "FAIL"} ${n}`); if (!c) fail++; };
check("NotesView.tsx exists", existsSync("components/NotesView.tsx"));
const src = existsSync("components/NotesView.tsx") ? readFileSync("components/NotesView.tsx", "utf8") : "";
check("empty state text", /no notes yet/i.test(src));
check("imports canonical Note", /from ["']\.\.\/lib\/types["']|from ["']@\/lib\/types["']/.test(src));
check("no duplicate Note interface", !/export interface Note/.test(src));
process.exit(fail ? 1 : 0);
```
- [ ] **Step 2: Run test to verify it fails**
`node tests/repro-notes-view.mjs` (expect FAIL — file does not exist yet)
- [ ] **Step 3: Implement minimal component**
```tsx
import type { Note } from "../lib/types";

export default function NotesView() {
  const notes: Note[] = [];
  return notes.length ? (
    <div>/* render cards */</div>
  ) : (
    <p className="text-muted">No notes yet. Click the + button to add one.</p>
  );
}
```
- [ ] **Step 4: Run test to verify it passes**
`node tests/repro-notes-view.mjs` (expect PASS) then `npm test` for regressions
- [ ] **Step 5: Commit**
```bash
git add components/NotesView.tsx tests/repro-notes-view.mjs components/AppNav.tsx
git commit -m "feat: add NotesView component with empty state"
```

### Task 2: Add note creation UI (FAB + Modal)

**Files:**
- Modify: `components/NotesView.tsx` (add FAB)
- Create: `components/NoteModal.tsx`
- Test: `tests/repro-note-modal.mjs`

**Interfaces:**
- Consumes: `Note` type from `lib/types.ts`.
- Produces: `saveNote(note: Note): void` contract for `lib/notes.ts` (implemented in Task 3).

- [ ] **Step 1: Write failing test** (`tests/repro-note-modal.mjs` static checks):
```js
import { readFileSync, existsSync } from "node:fs";
let fail = 0;
const check = (n, c) => { console.log(`${c ? "PASS" : "FAIL"} ${n}`); if (!c) fail++; };
const view = existsSync("components/NotesView.tsx") ? readFileSync("components/NotesView.tsx", "utf8") : "";
const modal = existsSync("components/NoteModal.tsx") ? readFileSync("components/NoteModal.tsx", "utf8") : "";
check("FAB has aria-label", /aria-label="Add Note"/i.test(view));
check("FAB uses valid class (no bg-brand-soft)", !/bg-brand-soft/.test(view) && /bg-\[var\(--brand-soft\)\]/.test(view));
check("NoteModal has dialog role", /role="dialog"|role=\{"dialog"\}/.test(modal));
process.exit(fail ? 1 : 0);
```
- [ ] **Step 2: Run test to verify it fails**
`node tests/repro-note-modal.mjs` (expect FAIL)
- [ ] **Step 3: Implement FAB & Modal**
```tsx
import { useState } from "react";
import NoteModal from "./NoteModal";
import type { Note } from "../lib/types";

export default function NotesView() {
  const [open, setOpen] = useState(false);
  const notes: Note[] = [];
  return (
    <>
      {notes.length ? /* cards */ : <p className="text-muted">No notes yet.</p>}
      <button
        aria-label="Add Note"
        className="fixed bottom-4 right-4 rounded-full bg-[var(--brand-soft)] p-3 shadow-lg"
        onClick={() => setOpen(true)}
      >+</button>
      {open && <NoteModal onClose={() => setOpen(false)} />}
    </>
  );
}
```
- [ ] **Step 4: Run test to verify it passes**
`node tests/repro-note-modal.mjs` (expect PASS) then `npm test` for regressions
- [ ] **Step 5: Commit**
```bash
git add components/NoteModal.tsx components/NotesView.tsx tests/repro-note-modal.mjs
git commit -m "feat: add FAB and NoteModal for creating notes"
```

### Task 3: Persist notes in localStorage (preview mode)

**Files:**
- Create: `lib/notes.ts`
- Modify: `components/NotesView.tsx` (load/save notes)
- Test: `tests/repro-notes-storage.mjs`

**Interfaces:**
- Consumes: `Note` from `lib/types.ts`.
- Produces: `getNotes(): Note[]`, `saveNote(note: Note): void` (upsert), `deleteNote(id: string): void`.

- [ ] **Step 1: Write failing test** (`tests/repro-notes-storage.mjs` — import TS directly like `tests/repro.mjs`):
```js
// Run: node tests/repro-notes-storage.mjs (Node >=22 strips types)
import { getNotes, saveNote, deleteNote } from "../lib/notes.ts";
let fail = 0;
const check = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fail++; };
// Polyfill localStorage for node run:
globalThis.localStorage ??= { _m: new Map(), getItem(k) { return this._m.get(k) ?? null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); }, clear() { this._m.clear(); } };
localStorage.clear?.();
const note = { id: "1", title: "Test", body: "body", updatedAt: Date.now() };
saveNote(note);
check("save and retrieve note", getNotes().some(n => n.id === "1"));
// Upsert: same id twice => one entry
saveNote({ ...note, title: "v2", updatedAt: Date.now() });
check("upsert same id yields one entry", getNotes().filter(n => n.id === "1").length === 1);
// Corrupt JSON => [] not throw
localStorage.setItem("notedwork.notes:preview", "{bad");
let threw = false; let val = null;
try { val = getNotes(); } catch { threw = true; }
check("corrupt JSON returns []", !threw && Array.isArray(val) && val.length === 0);
deleteNote("1");
check("delete removes note", !getNotes().some(n => n.id === "1"));
process.exit(fail ? 1 : 0);
```
- [ ] **Step 2: Run test to verify it fails**
`node tests/repro-notes-storage.mjs` (expect FAIL — `lib/notes.ts` missing)
- [ ] **Step 3: Implement storage utils** (follow `lib/store.ts:6-33` guards — SSR, corrupt, quota):
```ts
import type { Note } from "./types";
const STORAGE_KEY = "notedwork.notes:preview";
export function getNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Note[];
  } catch {
    return [];
  }
}
function persist(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* ignore: private mode / quota full */
  }
}
export function saveNote(note: Note): void {
  const notes = getNotes();
  const i = notes.findIndex(n => n.id === note.id);
  if (i >= 0) notes[i] = note; else notes.push(note);
  persist(notes);
}
export function deleteNote(id: string): void {
  persist(getNotes().filter(n => n.id !== id));
}
```
Notes: `NotesView` should prefer `useLocalStorage<Note[]>(STORAGE_KEY, [])` from `lib/store.ts`; if it calls `getNotes()` directly, only call inside `useEffect` (SSR-safe).
- [ ] **Step 4: Run test to verify it passes**
`node tests/repro-notes-storage.mjs` (expect PASS) then `npm test` for regressions
- [ ] **Step 5: Commit**
```bash
git add lib/notes.ts tests/repro-notes-storage.mjs components/NotesView.tsx
git commit -m "feat: persist notes in localStorage (preview mode)"
```

### Task 4: Add Settings button next to calendar

**Files:**
- Modify: `components/AppNav.tsx` (add icon button)
- Create: `components/SettingsModal.tsx`
- Test: `tests/repro-settings.mjs`

**Interfaces:**
- Consumes: none.
- Produces: Settings UI (future toggles for Google Keep sync).

- [ ] **Step 1: Write failing test** (`tests/repro-settings.mjs` static checks):
```js
import { readFileSync, existsSync } from "node:fs";
let fail = 0;
const check = (n, c) => { console.log(`${c ? "PASS" : "FAIL"} ${n}`); if (!c) fail++; };
const nav = existsSync("components/AppNav.tsx") ? readFileSync("components/AppNav.tsx", "utf8") : "";
const modal = existsSync("components/SettingsModal.tsx") ? readFileSync("components/SettingsModal.tsx", "utf8") : "";
check("Settings button has aria-label", /aria-label="Settings"/i.test(nav));
check("nav uses valid bg class (no bg-bg)", !/bg-bg/.test(nav));
check("SettingsModal has dialog role", /role="dialog"|role=\{"dialog"\}/.test(modal));
process.exit(fail ? 1 : 0);
```
- [ ] **Step 2: Run test to verify it fails**
`node tests/repro-settings.mjs` (expect FAIL)
- [ ] **Step 3: Implement button & modal**
```tsx
import SettingsModal from "./SettingsModal";
import { useState } from "react";

export default function AppNav() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <nav className="flex items-center justify-between p-4 bg-paper">
      {/* existing nav items */}
      <button aria-label="Settings" onClick={() => setSettingsOpen(true)} className="p-2">
        <svg /* gear icon */></svg>
      </button>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </nav>
  );
}
```
Use `bg-paper` (maps to `var(--bg)` in `tailwind.config.ts:17`). `bg-bg` does not exist.
- [ ] **Step 4: Run test to verify it passes**
`node tests/repro-settings.mjs` (expect PASS) then `npm test`
- [ ] **Step 5: Commit**
```bash
git add components/SettingsModal.tsx components/AppNav.tsx tests/repro-settings.mjs
git commit -m "feat: add Settings button and modal"
```

### Task 5: Wire notes UI together (load, create, delete)

**Files:**
- Modify: `components/NotesView.tsx`
- Modify: `components/NoteModal.tsx` (call `saveNote`)
- Modify: `components/NoteCard.tsx` (add delete button)
- Test: `tests/repro-notes-flow.mjs`

**Interfaces:**
- Consumes: `lib/notes` API from Task 3.
- Produces: Fully functional notes list with create/delete.

- [ ] **Step 1: Write failing integration test** (`tests/repro-notes-flow.mjs` static + storage checks):
```js
import { readFileSync, existsSync } from "node:fs";
let fail = 0;
const check = (n, c) => { console.log(`${c ? "PASS" : "FAIL"} ${n}`); if (!c) fail++; };
const view = existsSync("components/NotesView.tsx") ? readFileSync("components/NotesView.tsx", "utf8") : "";
const modal = existsSync("components/NoteModal.tsx") ? readFileSync("components/NoteModal.tsx", "utf8") : "";
const card = existsSync("components/NoteCard.tsx") ? readFileSync("components/NoteCard.tsx", "utf8") : "";
check("view loads via getNotes/useLocalStorage", /getNotes|useLocalStorage/.test(view));
check("modal calls saveNote with updatedAt", /saveNote/.test(modal) && /updatedAt/.test(modal));
check("modal uses crypto.randomUUID or uid (no bare uuid())", /crypto\.randomUUID|uid\(/.test(modal) && !/[^.]uuid\(\)/.test(modal.replace(/randomUUID/g, "")));
check("card delete calls deleteNote", /deleteNote/.test(card));
process.exit(fail ? 1 : 0);
```
- [ ] **Step 2: Run test to verify it fails**
`node tests/repro-notes-flow.mjs` (expect FAIL)
- [ ] **Step 3: Implement load/create/delete logic**
  - Load notes via `getNotes()` in `useEffect` (or `useLocalStorage<Note[]>(KEY, [])` from `lib/store.ts`) — never call `localStorage` during SSR/prerender.
  - `NoteModal` calls `saveNote({ id: crypto.randomUUID(), title, body, updatedAt: Date.now() })` then closes. `crypto.randomUUID()` is built-in (Node >=22, browsers) — do NOT add `uuid` npm package. Alternatively reuse `uid()` from `lib/dates.ts`.
  - `saveNote` is upsert (Task 3) so double-submit/edit does not duplicate.
  - `NoteCard` delete button calls `deleteNote(id)` and triggers state update. `Note` must include `updatedAt` (canonical `lib/types.ts`).
- [ ] **Step 4: Run test to verify it passes**
`node tests/repro-notes-flow.mjs` (expect PASS) then `npm test`
- [ ] **Step 5: Commit**
```bash
git add components/NoteCard.tsx components/NoteModal.tsx components/NotesView.tsx tests/repro-notes-flow.mjs
git commit -m "feat: integrate notes list with create/delete flow"
```

### Task 6: Documentation & Cleanup

**Files:**
- Update: `docs/superpowers/specs/2024-09-18-add-note-feature-design.md` (add usage notes).
- Add: `README.md` entry under "Features".
- Modify: `package.json` (`test` script — append new `node tests/repro-notes-*.mjs` files).
- Lint: run `npm run lint` and fix any warnings.

- [ ] **Step 1: Write docs**
  - Add section describing how to access Notes, create notes, and future settings.
- [ ] **Step 2: Wire new repro scripts + run linter/tests**
`npm run lint`
`npm test` (must include new `tests/repro-notes-*.mjs` files)
- [ ] **Step 3: Commit docs**
```bash
git add docs/superpowers/specs/2024-09-18-add-note-feature-design.md README.md package.json
git commit -m "docs: add notes feature documentation"
```

---

**Plan saved to `docs/superpowers/plans/2024-09-18-add-note-feature.md`.**

Plan complete. Two execution options:

1. **Subagent‑Driven Development (recommended)** – dispatch a fresh subagent for each task, review between tasks.
2. **Inline Execution** – run the tasks sequentially in this session using the `executing-plans` skill.

Which approach do you prefer?