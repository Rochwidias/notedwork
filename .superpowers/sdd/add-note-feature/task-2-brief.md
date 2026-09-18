## Task 2: Add note creation UI (FAB + Modal)

**Files:**
- Modify: `components/NotesView.tsx` (add floating‑action button)
- Create: `components/NoteModal.tsx`
- Test: `tests/components/NoteModal.test.tsx`

**Interfaces:**
- Consumes: `Note` type from Task 1.
- Produces: `createNote(note: Note): void` exported from `lib/notes.ts`.

**Steps (to implement):**
1. Write failing test for opening the modal when the FAB is clicked.
2. Implement FAB in `NotesView` and a basic `NoteModal` with title & body fields, ARIA labels, and Save/Cancel buttons.
3. Wire the FAB to open the modal, and the Save button to call `createNote` (stub implementation now).
4. Add a test that the modal appears and can be closed.
5. Commit changes.
