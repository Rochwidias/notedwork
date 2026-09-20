import { readFileSync, existsSync } from "node:fs";
const google = readFileSync("lib/google.ts", "utf8");
const drive = readFileSync("lib/drive.ts", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const remote = readFileSync("lib/remote.ts", "utf8");
const shell = readFileSync("components/NotedworkApp.tsx", "utf8");
const post = existsSync("app/api/drive/notes/route.ts")
  ? readFileSync("app/api/drive/notes/route.ts", "utf8")
  : "";
const del = existsSync("app/api/drive/notes/[id]/route.ts")
  ? readFileSync("app/api/drive/notes/[id]/route.ts", "utf8")
  : "";
const checks = [
  ["scope drive.file", google.includes("auth/drive.file")],
  ["drive.ts ensureNotesFolder", drive.includes("ensureNotesFolder")],
  ["drive.ts upsertNoteDoc", drive.includes("upsertNoteDoc")],
  ["drive.ts trashNoteFile", drive.includes("trashNoteFile")],
  ["drive.ts NOT_CONNECTED", drive.includes("NOT_CONNECTED")],
  ["Note.driveFileId", types.includes("driveFileId")],
  ["remote apiSyncNote", remote.includes("apiSyncNote")],
  ["remote apiTrashNoteFile", remote.includes("apiTrashNoteFile")],
  ["route POST ada", post.includes("export async function POST")],
  ["route POST no-store", post.includes("private, no-store")],
  ["route DELETE ada", del.includes("export async function DELETE")],
  ["shell syncNote", shell.includes("syncNote")],
  ["shell local-first", shell.includes("setNotes") && shell.includes("apiSyncNote")],
  ["i18n notes.onDrive", readFileSync("lib/i18n.ts", "utf8").includes('"notes.onDrive"')],
  ["i18n driveSyncFail", readFileSync("lib/i18n.ts", "utf8").includes('"toast.driveSyncFail"')],
];
let fail = 0;
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`), ok || fail++;
process.exit(fail ? 1 : 0);
