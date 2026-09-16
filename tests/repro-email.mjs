// Test email pipeline: htmlToText ASLI (lib/gmail.ts, diekspor) via transpile tsc.
// Cara jalan: npm run build:test-email (transpile gmail.ts -> tmp, stub google,
// jalankan checks), atau node tests/repro-email.mjs bila tmp sudah ada.
// Exit 1 = bug terreproduksi.
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const TMP = join(tmpdir(), "gmailjs-email-test");

function ensureBuild() {
  try {
    execFileSync(
      process.execPath,
      [join(ROOT, "node_modules", "typescript", "lib", "tsc.js"), "lib/gmail.ts", "--outDir", TMP, "--module", "nodenext", "--target", "es2022", "--moduleResolution", "nodenext", "--skipLibCheck"],
      { cwd: ROOT, stdio: "pipe" }
    );
  } catch (e) {
    console.log("FAIL  transpile lib/gmail.ts gagal — jalankan manual:");
    console.log("  npx tsc lib/gmail.ts --outDir $TMPDIR/gmailjs-email-test --module nodenext --target es2022 --moduleResolution nodenext --skipLibCheck");
    console.log(String(e.stdout ?? "") + String(e.stderr ?? "") + String(e.message ?? ""));
    process.exit(1);
  }
  writeStubs();
}

function writeStubs() {
  // tsc ikut men-transpile rantai impor gmail.ts → google.ts → supabaseAdmin.ts,
  // sehingga TMP berisi versi kompilasi yang butuh node_modules produksi.
  // Stub ditulis SETIAP jalan (bukan cuma saat ensureBuild) agar cache basi
  // atau hasil tsc manual tak merusak impor: htmlToText tak pakai ketiganya.
  writeFileSync(join(TMP, "google.js"), 'export async function googleFetch(){ throw new Error("stub"); }\n');
  // Stub rantai server-only (supabaseAdmin/crypto/identity) agar transpile bisa
  // diimpor tanpa node_modules produksi: gmail.js hasil tsc ikut men-transpile
  // google.ts → supabaseAdmin.ts (@supabase/supabase-js tak resolvable dari tmpdir).
  writeFileSync(join(TMP, "supabaseAdmin.js"), 'export const supabaseAdmin = null;\n');
  writeFileSync(join(TMP, "identity.js"), 'export function resolveIdentityKeys(bySubUserId, email){ const userId = String(email).toLowerCase(); const prev = String(bySubUserId ?? "").trim().toLowerCase(); return prev && prev !== userId ? { userId, prevKey: prev } : { userId, prevKey: userId }; }\n');
}

if (!existsSync(join(TMP, "gmail.js"))) ensureBuild();
else {
  // Bangun ulang bila gmail.ts lebih baru dari hasil transpile.
  const { statSync } = await import("node:fs");
  const src = statSync(new URL("../lib/gmail.ts", import.meta.url)).mtimeMs;
  const out = statSync(join(TMP, "gmail.js")).mtimeMs;
  if (src > out) ensureBuild();
}
writeStubs();

const { pathToFileURL } = await import("node:url");
const g = await import(pathToFileURL(join(TMP, "gmail.js")).href);
const { htmlToText } = g;
if (typeof htmlToText !== "function") {
  console.log("FAIL  htmlToText tidak diekspor dari lib/gmail.ts");
  process.exit(1);
}

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); failures++; }
}
const noLeak = (s) => !/\[TABLE\]|\[\/TABLE\]|\[R\]|\[H\]|\[PRE\]|\[\/PRE\]|<[^>]+>/.test(s);

// 1. Tabel jadul tanpa <tr>: sel tampil sebagai baris [R] (EmailBody render <table>).
{
  const out = htmlToText(`<table><td>A1</td><td>B1</td></table>`);
  check("tabel-tanpa-tr: sel tampil", out.includes("A1") && out.includes("B1"), JSON.stringify(out));
  check("tabel-tanpa-tr: jadi baris [R]", out.includes("[R]"), JSON.stringify(out));
}

// 2. Tabel normal tetap jadi tabel.
{
  const out = htmlToText(`<table><tr><td>A1</td><td>B1</td></tr></table>`);
  check("tabel-normal: token [TABLE]/[R] utuh", out.includes("[TABLE]") && out.includes("[R]"), JSON.stringify(out));
}

// 3. Figure: caption tampil, tanpa tag mentah.
{
  const out = htmlToText(`<figure><img src="https://x.id/a.png" alt="foto"><figcaption>Ket foto</figcaption></figure>`);
  check("figure: caption tampil", out.includes("Ket foto"), JSON.stringify(out));
  check("figure: tanpa tag mentah", noLeak(out), JSON.stringify(out));
}

// 4. Div bertingkat: teks dalam tampil.
{
  const out = htmlToText(`<div><div><div><p>Halo, ini promo terbaru</p><p>Klik di sini ya</p></div></div></div>`);
  check("div-bersarang: teks tampil", out.includes("Halo") && out.includes("Klik di sini"), JSON.stringify(out));
  check("div-bersarang: tanpa tag mentah", noLeak(out), JSON.stringify(out));
}

// 5. <a> tanpa quote: jadi token link.
{
  const out = htmlToText(`<a href=https://tanpa-quote.id/x>klik</a>`);
  check("a-tanpa-quote: jadi link", out.includes("https://tanpa-quote.id/x"), JSON.stringify(out));
  check("a-tanpa-quote: tanpa tag mentah", noLeak(out), JSON.stringify(out));
}

// 6. Regresi.
{
  const out = htmlToText(`<style>.x{color:red}</style><p>Halo</p>`);
  check("regresi: style dibuang", out.includes("Halo") && !out.includes("color"), JSON.stringify(out));
  const pre = htmlToText(`<pre>baris1<br>baris2</pre>`);
  check("regresi: pre verbatim", pre.includes("[PRE]") && pre.includes("baris1\nbaris2"), JSON.stringify(pre));
  const auto = htmlToText(`<p>Lihat portal<https://kampus.id/krs> ya</p>`);
  check("regresi: autolink Label<url>", auto.includes("[portal](https://kampus.id/krs)"), JSON.stringify(auto));
}

console.log(failures ? `\n${failures} check(s) FAILED (bug email terreproduksi)` : "\nSemua checks email PASS");
process.exit(failures ? 1 : 0);
