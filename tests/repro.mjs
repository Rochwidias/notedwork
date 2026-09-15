// RED test (TDD): bug isOverdue untuk time kosong + Minggu di RoutineSheet.
// Jalankan: node --experimental-strip-types tests/repro.mjs  (atau node tests/repro.mjs di Node 24)
// Harus GAGAL sebelum fix, PASS sesudah fix.
import { readFileSync } from "node:fs";
import { isOverdue, taskBadge, todayStr, nowHM } from "../lib/dates.ts";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); failures++; }
}

// Bug 1: tugas hari ini TANPA jam (time="") tak boleh dianggap telat.
// TaskSheet selalu kirim time, tapi tipe mengizinkan "" dan badge memakai default 23:59.
const today = todayStr();
check(
  "isOverdue: tugas hari ini tanpa jam TIDAK telat",
  isOverdue({ date: today, time: "", done: false }) === false,
  `isOverdue({date:${today},time:""}) = ${isOverdue({ date: today, time: "", done: false })}`
);

// Konsistensi: isOverdue vs taskBadge untuk kasus yang sama.
const badge = taskBadge({ date: today, time: "", done: false });
check(
  "isOverdue konsisten dengan taskBadge (badge bukan Telat*)",
  !badge.txt.startsWith("Telat"),
  `badge = ${JSON.stringify(badge)}`
);

// Regresi: tugas kemarin TANPA jam tetap telat.
const y = new Date(); y.setDate(y.getDate() - 1);
const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
check(
  "isOverdue: tugas kemarin tanpa jam tetap TELAT",
  isOverdue({ date: yStr, time: "", done: false }) === true
);

// Regresi: done=true tak pernah telat.
check(
  "isOverdue: done=true tidak telat",
  isOverdue({ date: "2000-01-01", time: "", done: true }) === false
);

// Regresi: tugas hari ini jam 23:59 belum telat (pagi-malam masih aman bila now < 23:59).
check(
  "isOverdue: hari ini 23:59 tidak telat bila sekarang < 23:59",
  nowHM() < "23:59" ? isOverdue({ date: today, time: "23:59", done: false }) === false : true
);

// Bug 2 (statis): RoutineSheet harus punya opsi hari Minggu value="7".
const sheets = readFileSync(new URL("../components/Sheets.tsx", import.meta.url), "utf8");
check(
  'RoutineSheet: ada opsi hari Minggu (value="7")',
  /value="7"/.test(sheets),
  "tidak ditemukan value=\"7\" di Sheets.tsx"
);

// Bug 3 (statis): SW tidak boleh men-cache /api/* (tanpa pengecualian = bug).
const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const hasApiBypass = /\/api/.test(sw) && /(return|bypass|jangan|skip|network-only|networkOnly)/i.test(sw);
check(
  "SW: ada bypass untuk /api/*",
  hasApiBypass,
  "public/sw.js tidak menyebut /api sama sekali"
);

console.log(failures ? `\n${failures} check(s) FAILED (bug terreproduksi)` : "\nSemua checks PASS");

// ---- Checks baru (spec redesign §4/§6): reminders, monthWindow, uid, encode ----
// JANGAN ubah checks lama di atas; blok ini hanya menambah.
import { nextReminder, formatCountdown, dueReminders } from "../lib/reminders.ts";
import { monthWindow, uid, fmtSchedRange } from "../lib/dates.ts";

const atISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const atHM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// nextReminder: pilih terdekat + abaikan yang lewat.
{
  const now = new Date(2026, 8, 16, 10, 0, 0);
  const past = new Date(2026, 8, 16, 9, 0, 0);
  const near = new Date(2026, 8, 16, 10, 30, 0);
  const far = new Date(2026, 8, 16, 12, 0, 0);
  const mk = (d, id) => ({ id, title: id, date: atISO(d), time: atHM(d), kind: "sched", reminderMin: 15 });
  const r = nextReminder([mk(far, "jauh"), mk(past, "lewat"), mk(near, "dekat")], now);
  check("nextReminder: pilih terdekat, abaikan yang lewat", r?.item.id === "dekat", `dapat ${r?.item.id}`);
}

// formatCountdown: 0, 45, 130.
check("formatCountdown(0) = sekarang", formatCountdown(0) === "sekarang", formatCountdown(0));
check("formatCountdown(45) = 45 mnt lagi", formatCountdown(45) === "45 mnt lagi", formatCountdown(45));
check("formatCountdown(130) = 2 jam lagi", formatCountdown(130) === "2 jam lagi", formatCountdown(130));

// fmtSchedRange: allDay + overnight.
check(
  "fmtSchedRange: allDay = Seharian",
  fmtSchedRange({ id: "x", title: "t", date: "2026-09-16", time: "00:00", note: "", color: "", allDay: true }) === "Seharian"
);
{
  const s = fmtSchedRange({ id: "x", title: "t", date: "2026-09-16", time: "23:00", endTime: "01:00", note: "", color: "", overnight: true });
  check("fmtSchedRange: overnight 23:00-01:00 + besok", s === "23:00–01:00 · besok", s);
}

// dueReminders: fire tepat (reminderMin 15, now = at-15mnt ±30dt → kena).
{
  const at = new Date(2026, 8, 16, 10, 0, 0);
  const item = { id: "e1", title: "Rapat", date: atISO(at), time: atHM(at), kind: "sched", reminderMin: 15 };
  const fire = new Date(at.getTime() - 15 * 60_000);
  const hit1 = dueReminders([item], new Date(fire.getTime() + 30_000));
  const hit2 = dueReminders([item], new Date(fire.getTime() - 30_000));
  check("dueReminders: now = fire+30dt kena", hit1.length === 1, JSON.stringify(hit1.length));
  check("dueReminders: now = fire-30dt kena", hit2.length === 1, JSON.stringify(hit2.length));
  const miss = dueReminders([item], new Date(at.getTime() - 60 * 60_000));
  check("dueReminders: now jauh → kosong", miss.length === 0, JSON.stringify(miss.length));
  const off = dueReminders([{ ...item, reminderMin: 0 }], fire);
  check("dueReminders: reminderMin 0 → kosong", off.length === 0, JSON.stringify(off.length));
}

// monthWindow anti-overflow: 31 Mar, back=1 → from Feb (bukan Maret!).
{
  const w = monthWindow(1, 2, new Date(2026, 2, 31));
  check("monthWindow: from 2026-02-01 (anti-overflow)", w.from === "2026-02-01", `from=${w.from}`);
  check("monthWindow: to 2026-05-31", w.to === "2026-05-31", `to=${w.to}`);
}

// uid unik: 1000x tanpa kembar.
{
  const set = new Set(Array.from({ length: 1000 }, () => uid()));
  check("uid: 1000x unik", set.size === 1000, `unik=${set.size}`);
  check("uid: prefix default id", uid().startsWith("id"), uid().slice(0, 4));
}

// encode: getMail/labelMail source mengandung encodeURIComponent.
{
  const src = readFileSync(new URL("../lib/gmail.ts", import.meta.url), "utf8");
  const gm = /getMail[\s\S]{0,400}?encodeURIComponent/.test(src);
  const lm = /labelMail[\s\S]{0,800}?encodeURIComponent/.test(src);
  check("gmail getMail memakai encodeURIComponent", gm);
  check("gmail labelMail memakai encodeURIComponent", lm);
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nSemua checks PASS (lama + baru)");
process.exit(failures ? 1 : 0);
