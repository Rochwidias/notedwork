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
