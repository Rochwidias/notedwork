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
