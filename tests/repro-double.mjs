// RED test (TDD): anti-double submit spam-klik Simpan/Kirim.
// Jalankan: node tests/repro-double.mjs
// Harus GAGAL sebelum fix, PASS sesudah fix.
import { readFileSync } from "node:fs";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); failures++; }
}
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

const sheets = read("../components/Sheets.tsx");
const app = read("../components/NotedworkApp.tsx");

function chunk(name) {
  const parts = sheets.split("export function ");
  const f = parts.find((p) => p.startsWith(name + "(") || p.startsWith(name + "({") || p.startsWith(name));
  return f ?? "";
}

const sched = chunk("SchedSheet");
const task = chunk("TaskSheet");
const mail = chunk("MailSheet");
const routine = chunk("RoutineSheet");

// SchedSheet: guard ref sinkron + tombol disabled + label menyimpan.
check(
  "SchedSheet: ref guard sinkron anti-spam",
  /useRef\s*\(\s*false\s*\)/.test(sched) && /\.current/.test(sched) && /if\s*\(.*\.current.*\)\s*return/.test(sched),
  "tidak ada useRef+early-return di SchedSheet"
);
check(
  "SchedSheet: tombol submit disabled saat menyimpan",
  /disabled\s*=\s*\{[^}]*saving[^}]*\}/.test(sched) || /disabled\s*=\s*\{[^}]*busy[^}]*\}/i.test(sched),
  "submit SchedSheet tidak disabled saat saving"
);

// TaskSheet: guard ref sinkron + tombol disabled.
check(
  "TaskSheet: ref guard sinkron anti-spam",
  /useRef\s*\(\s*false\s*\)/.test(task) && /\.current/.test(task) && /if\s*\(.*\.current.*\)\s*return/.test(task),
  "tidak ada useRef+early-return di TaskSheet"
);
check(
  "TaskSheet: tombol submit disabled saat menyimpan",
  /disabled\s*=\s*\{[^}]*saving[^}]*\}/.test(task) || /disabled\s*=\s*\{[^}]*busy[^}]*\}/i.test(task),
  "submit TaskSheet tidak disabled saat saving"
);

// MailSheet: guard harus pakai ref (state saja bisa lolos klik cepat sebelum re-render).
check(
  "MailSheet: guard pakai ref (bukan state saja)",
  /useRef\s*\(\s*false\s*\)/.test(mail) && /\.current/.test(mail) && /if\s*\(.*\.current.*\)\s*return/.test(mail),
  "MailSheet masih guard state saja, lolos spam-klik"
);

// RoutineSheet: sync tapi tetap butuh guard (spam-klik = 2 rutin).
check(
  "RoutineSheet: ref guard anti-spam",
  /useRef\s*\(\s*false\s*\)/.test(routine) && /\.current/.test(routine) && /if\s*\(.*\.current.*\)\s*return/.test(routine),
  "tidak ada guard di RoutineSheet"
);

// Parent: defense-in-depth di NotedworkApp (lolos dari sheet tetap tertahan).
check(
  "App: saveSched punya in-flight guard",
  /schedBusy|saveSchedBusy|saveBusy/i.test(app) && /\.current/.test(app),
  "saveSched tanpa guard di NotedworkApp"
);
check(
  "App: saveMail punya in-flight guard",
  /mailBusy|saveMailBusy|sendBusy/i.test(app) && /\.current/.test(app),
  "saveMail tanpa guard di NotedworkApp"
);
check(
  "App: saveTask punya in-flight guard",
  /taskBusy|saveTaskBusy/i.test(app) && /\.current/.test(app),
  "save task tanpa guard di NotedworkApp"
);

console.log(failures ? `\n${failures} check(s) FAILED (bug double-submit terreproduksi)` : "\nSemua checks double-submit PASS");
process.exit(failures ? 1 : 0);
