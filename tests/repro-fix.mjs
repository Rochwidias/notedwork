// RED test (TDD) batch 2: 8 temuan audit notedwork 2026-09-16 (V1–V8).
// Jalankan: node tests/repro-fix.mjs  (Node >=22.6; import .ts langsung)
// Harus GAGAL sebelum fix, PASS sesudah fix.
import { readFileSync, existsSync } from "node:fs";
import { resolveTimeZone, tzOffsetString } from "../lib/dates.ts";
import { BATCH_URL, buildBatchBody, parseBatchResponse } from "../lib/gmailBatch.ts";
import { resolveIdentityKeys } from "../lib/identity.ts";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); failures++; }
}
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

// ---------- V1: CRLF subjek ----------
{
  const src = read("../app/api/gmail/send/route.ts");
  const guards = src.match(/\[\\r\\n\]/g) ?? [];
  check("V1: route tolak CRLF di to DAN subj", guards.length >= 2, `guard CRLF = ${guards.length}`);
  const g = read("../lib/gmail.ts");
  check("V1: encodeHeader sterilkan CRLF", /function encodeHeader[\s\S]{0,400}?\[\\r\\n\]/.test(g));
}

// ---------- V2: konfirmasi exit preview ----------
{
  const app = read("../components/NotedworkApp.tsx");
  check("V2: exitPreview minta konfirmasi", /const exitPreview[\s\S]{0,600}?window\.confirm/.test(app));
}

// ---------- V3: timezone client ----------
check("V3: resolveTimeZone kenal Asia/Makassar", resolveTimeZone("Asia/Makassar") === "Asia/Makassar");
check("V3: resolveTimeZone fallback zona aneh", resolveTimeZone("Bukan/Zona") === "Asia/Jakarta");
check(
  "V3: resolveTimeZone fallback kosong",
  resolveTimeZone("") === "Asia/Jakarta" && resolveTimeZone() === "Asia/Jakarta"
);
check(
  "V3: offset WIB +07:00",
  tzOffsetString("Asia/Jakarta", "2026-09-16", "10:00") === "+07:00",
  tzOffsetString("Asia/Jakarta", "2026-09-16", "10:00")
);
check(
  "V3: offset WITA +08:00",
  tzOffsetString("Asia/Makassar", "2026-09-16", "10:00") === "+08:00",
  tzOffsetString("Asia/Makassar", "2026-09-16", "10:00")
);
check(
  "V3: offset New York Januari -05:00",
  tzOffsetString("America/New_York", "2026-01-16", "10:00") === "-05:00",
  tzOffsetString("America/New_York", "2026-01-16", "10:00")
);
check(
  "V3: offset New York Juli -04:00 (DST)",
  tzOffsetString("America/New_York", "2026-07-16", "10:00") === "-04:00",
  tzOffsetString("America/New_York", "2026-07-16", "10:00")
);
{
  const cal = read("../lib/calendar.ts");
  check("V3: calendar.ts tanpa hardcode +07:00", !cal.includes("+07:00"), "masih ada +07:00");
  check("V3: calendar.ts pakai resolveTimeZone", cal.includes("resolveTimeZone"));
  const rem = read("../lib/remote.ts");
  check("V3: remote kirim tz", rem.includes("tz?") || rem.includes('"tz"'));
  const app = read("../components/NotedworkApp.tsx");
  check("V3: client kirim zona browser", app.includes("resolvedOptions().timeZone"));
  check("V3: saveSched teruskan tz", /apiCreateEvent\(v,\s*[^)]+\)/.test(app));
  check("V3: saveEditSched teruskan tz", /apiUpdateEvent\(editingSched\.id,\s*v,\s*[^)]+\)/.test(app));
}

// ---------- V4: identitas stabil ----------
{
  const g = read("../lib/google.ts");
  check("V4: scope openid + email", g.includes('"openid"') && g.includes('"email"'));
  check("V4: ambil sub via userinfo", g.includes("userinfo"));
  check("V4: tolak email unverified", g.includes("email_verified"));
  check("V4: simpan google_sub", g.includes("google_sub"));
  check("V4: pakai helper identitas terpusat", g.includes("resolveIdentityKeys"));
  check("V4: cabut sesi saat sub beda (anti-takeover)", g.includes("existing.google_sub"));
  const k = resolveIdentityKeys(null, "User@Contoh.ID");
  check("V4: tanpa sub → kunci email", k.userId === "user@contoh.id" && k.prevKey === "user@contoh.id", JSON.stringify(k));
  const r = resolveIdentityKeys("lama@contoh.id", "Baru@contoh.id");
  check("V4: sub dikenal + email ganti → rename", r.userId === "baru@contoh.id" && r.prevKey === "lama@contoh.id", JSON.stringify(r));
  const sqlUrl = new URL("../db/notedwork_google_sub.sql", import.meta.url);
  check("V4: migrasi SQL ada", existsSync(sqlUrl));
  if (existsSync(sqlUrl)) {
    const sql = read("../db/notedwork_google_sub.sql");
    check("V4: migrasi google_sub + cascade", sql.includes("google_sub") && sql.includes("ON UPDATE CASCADE"));
  } else {
    check("V4: migrasi google_sub + cascade", false, "file db/notedwork_google_sub.sql belum ada");
  }
}

// ---------- V5a: Gmail batch ----------
{
  const body = buildBatchBody(["a1", "b2"], "BOUND");
  check(
    "V5a: batch body GET per id",
    body.includes("GET /gmail/v1/users/me/messages/a1?") && body.includes("GET /gmail/v1/users/me/messages/b2?")
  );
  check("V5a: batch body delimiter benar", body.includes("--BOUND\r\n") && body.includes("--BOUND--"));
  check("V5a: BATCH_URL gmail", BATCH_URL === "https://gmail.googleapis.com/batch/gmail/v1", BATCH_URL);
  // Reorder/short: part untuk c1 datang duluan + b2 hilang → parse tetap utuh,
  // dan batchMetadata wajib cocokkan via msg.id (bukan posisi).
  const fx2 =
    "--batch_123\r\nContent-Type: application/http\r\nContent-ID: <response-1>\r\n\r\n" +
    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n" +
    '{"id":"c1","snippet":"ketiga"}\r\n' +
    "--batch_123\r\nContent-Type: application/http\r\nContent-ID: <response-0>\r\n\r\n" +
    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n" +
    '{"id":"a1","snippet":"pertama"}\r\n--batch_123--\r\n';
  const px2 = parseBatchResponse(fx2);
  check(
    "V5a: parse tahan reorder (2 part, id sesuai konten)",
    px2.length === 2 && px2[0]?.json?.id === "c1" && px2[1]?.json?.id === "a1",
    JSON.stringify(px2.map((p) => p.json))
  );
  const fx =
    "--batch_123\r\nContent-Type: application/http\r\nContent-ID: <response-0>\r\n\r\n" +
    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n" +
    '{"id":"a1","snippet":"halo"}\r\n' +
    "--batch_123\r\nContent-Type: application/http\r\nContent-ID: <response-1>\r\n\r\n" +
    "HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\n\r\n" +
    '{"error":{"code":404}}\r\n--batch_123--\r\n';
  const parts = parseBatchResponse(fx);
  check(
    "V5a: parse 2 part + status",
    parts.length === 2 && parts[0].ok === true && parts[1].ok === false,
    JSON.stringify(parts.map((p) => p.ok))
  );
  check("V5a: parse json id", parts[0]?.json?.id === "a1", JSON.stringify(parts[0]?.json));
  const g = read("../lib/gmail.ts");
  check("V5a: listMails batch + fallback", /batch/i.test(g) && /fallback/i.test(g));
  check("V5a: cocokkan via msg.id bukan posisi", g.includes("ids.includes(msg.id)"));
  check("V5a: fallback paralel CONC=8", /CONC = 8/.test(g));
}

// ---------- V5b: abort search ----------
{
  const rem = read("../lib/remote.ts");
  check("V5b: remote teruskan signal", rem.includes("signal"));
  const app = read("../components/NotedworkApp.tsx");
  check("V5b: search pakai AbortController", app.includes("AbortController"));
}

// ---------- V6: error callback spesifik ----------
{
  const cb = read("../app/api/auth/callback/route.ts");
  check("V6: callback log error server", cb.includes("console.error"));
  check("V6: callback bedakan tahap gagal", cb.includes("simpan-token-gagal") && cb.includes("buat-sesi-gagal"));
  const app = read("../components/NotedworkApp.tsx");
  check("V6: client tampilkan pesan gagal spesifik", app.includes('get("pesan")'));
}

// ---------- V7: sapu cyan lama ----------
{
  const files = [
    "../app/loading.tsx",
    "../app/not-found.tsx",
    "../app/icon.tsx",
    "../app/apple-icon.tsx",
    "../app/layout.tsx",
    "../app/manifest.ts",
    "../public/icon.svg",
    "../lib/legal.ts",
    "../lib/data.ts",
  ];
  const stale = files.filter((f) => /00cfff|0d0d0d|#121212/i.test(read(f)));
  check("V7: tanpa sisa cyan/hitam lama (#00cfff/#0d0d0d/#121212)", stale.length === 0, stale.join(", "));
  check("V7: ikon pakai coklat brand", read("../public/icon.svg").includes("#B45309"));
  check("V7: teks legal sebut default coklat", read("../lib/legal.ts").includes("#B45309"));
  check("V7: tanpa kata cyan di legal/data", !/cyan/i.test(read("../lib/legal.ts") + read("../lib/data.ts")));
  check("V7: theme-color ikut tema kertas", read("../components/ThemeProvider.tsx").includes("#1C1917"));
  check(
    "V7: palet runtime tanpa cyan",
    !/#00cfff/i.test(
      read("../components/CalendarView.tsx") +
        read("../components/EmailView.tsx") +
        read("../lib/calendar.ts") +
        read("../lib/dates.ts") +
        read("../lib/preview.ts")
    )
  );
}

// ---------- V8: batch minor ----------
check("V8a: Routine.day 1..7 Minggu", read("../lib/types.ts").includes("7=Minggu"));
{
  const lo = read("../app/api/auth/logout/route.ts");
  check("V8b: logout cek Origin", lo.includes("origin") && lo.includes("403"));
  check("V8b: logout fallback Sec-Fetch-Site", lo.includes("sec-fetch-site"));
  check("V8b: logout terima origin request sendiri", lo.includes("reqOrigin"));
  check("V8b: client jujur bila logout ditolak", read("../components/NotedworkApp.tsx").includes("masih aktif"));
}
{
  const g = read("../lib/google.ts");
  check("V8c: tanpa require node:crypto", !g.includes("require("));
  check("V8c: import node:crypto", g.includes('from "node:crypto"'));
}
{
  const s = read("../components/Sheets.tsx");
  check("V8d: TaskSheet mode edit", s.includes("Ubah Tugas") && /TaskSheet[\s\S]{0,1200}?initial/.test(s));
  check("V8d: TasksView ada onEdit", read("../components/TasksView.tsx").includes("onEdit"));
  check("V8d: App kelola editingTask", read("../components/NotedworkApp.tsx").includes("editingTask"));
}
{
  const pkg = JSON.parse(read("../package.json"));
  check(
    "V8e: npm test jalan semua repro",
    /repro\.mjs/.test(pkg.scripts.test) && /repro-email\.mjs/.test(pkg.scripts.test) && /repro-fix\.mjs/.test(pkg.scripts.test),
    pkg.scripts.test
  );
  check("V8e: engines Node", /22/.test(pkg.engines?.node ?? ""), pkg.engines?.node ?? "tanpa engines");
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nSemua checks fix PASS");
process.exit(failures ? 1 : 0);
