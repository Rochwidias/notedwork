## Task 1 Review Package

**Task:** Create NotesView component

**Commits:**
- a61dfb278a786bbec: feat: add NotesView component with empty state

**Files changed:**
- components/NotesView.tsx
- components/AppNav.tsx
- tests/components/NotesView.test.tsx

**Test summary:**
- 1/1 tests passing (empty state test)

**Changes:**
```diff
--- a/components/AppNav.tsx
+++ b/components/AppNav.tsx
@@ -12,6 +12,7 @@ export default function AppNav() {
     <button aria-label="Calendar" onClick={() => navigate('/calendar')}>
       <CalendarIcon />
     </button>
+    <button aria-label="Notes" onClick={() => navigate('/notes')}>
+      <NotesIcon />
+    </button>
     <button aria-label="Settings" onClick={() => setSettingsOpen(true)}>
       <SettingsIcon />
     </button>
```

```diff
--- a/components/NotesView.tsx
+++ b/components/NotesView.tsx
@@ -0,0 +1,25 @@
+export interface Note {
+  id: string;
+  title: string;
+  body: string;
+  pinned?: boolean;
+}
+
+export default function NotesView() {
+  const notes: Note[] = [];
+
+  return (
+    <div className="p-4">
+      {notes.length ? (
+        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
+          {/* Note cards will go here */}
+        </div>
+      ) : (
+        <p className="text-muted text-center">No notes yet. Click the + button to add one.</p>
+      )}
+    </div>
+  );
+}
```

```diff
--- a/tests/components/NotesView.test.tsx
+++ b/tests/components/NotesView.test.tsx
@@ -0,0 +1,12 @@
+import { render, screen } from '@testing-library/react';
+import NotesView from '../../components/NotesView';
+
+test('shows empty state when no notes', () => {
+  render(<NotesView />);
+
+  expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
+  expect(screen.getByLabelText(/add note/i)).toBeInTheDocument();
+});
```
