import { existsSync, readFileSync } from "node:fs";

const fail = (name) => (console.log(`FAIL ${name}`), 1);
const pass = (name) => (console.log(`PASS ${name}`), 0);
let code = 0;
const check = (name, ok) => (code |= (ok ? pass(name) : fail(name)));

const svg = existsSync("public/icon.svg") ? readFileSync("public/icon.svg", "utf8") : "";
const topbar = readFileSync("components/TopBar.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const theme = readFileSync("components/ThemeProvider.tsx", "utf8");
const manifest = readFileSync("app/manifest.ts", "utf8");

/** Dimensi PNG dari header IHDR (tanpa dep tambahan). */
const pngSize = (p) => {
  try {
    const b = readFileSync(p);
    if (b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  } catch {
    return null;
  }
};

// 1. Master SVG logo baru (monogram N + wordmark)
check("public/icon.svg ada", existsSync("public/icon.svg"));
check("icon.svg viewBox 512", svg.includes('viewBox="0 0 512 512"'));
check("icon.svg ada wordmark notedwork", svg.includes(">notedwork<"));
check("icon.svg ada gradien amber", svg.includes("linearGradient") && svg.includes("#fbbf24"));
check("icon.svg ada elemen kalender+amplop+pensil", svg.includes("Calendar") || (svg.includes("rect") && svg.includes("polygon") && svg.includes("circle")));

// 2. TopBar pakai logo, bukan huruf "N"
check("TopBar render img /icon.svg", topbar.includes('src="/icon.svg"') || topbar.includes("src={'/icon.svg'}"));
check("TopBar tak ada badge huruf N", !/>N</.test(topbar));

// 3. PNG turunan valid & berdimensi benar
const s192 = pngSize("public/icon-192.png");
const s512 = pngSize("public/icon-512.png");
check("icon-192.png 192x192 valid", !!s192 && s192.w === 192 && s192.h === 192);
check("icon-512.png 512x512 valid", !!s512 && s512.w === 512 && s512.h === 512);
check("app/icon.png (favicon) ada", existsSync("app/icon.png"));
check("app/apple-icon.png ada", existsSync("app/apple-icon.png"));
check("route dinamis icon.tsx dihapus", !existsSync("app/icon.tsx"));
check("route dinamis apple-icon.tsx dihapus", !existsSync("app/apple-icon.tsx"));

// 4. Tema navy selaras logo
const darkBlock = css.split('[data-theme="dark"]')[1]?.split("}")[0] ?? "";
check("dark --bg navy logo", darkBlock.includes("--bg: #0A0C10"));
check("dark --card slate logo", darkBlock.includes("--card: #161922"));
check("dark --ink kertas logo", darkBlock.includes("--ink: #F8FAFC"));
check("dark --muted slate logo", darkBlock.includes("--muted: #94A3B8"));
check("dark --brand amber logo", darkBlock.includes("--brand: #F59E0B"));
check("dark tak ada sisa #1C1917", !darkBlock.toUpperCase().includes("#1C1917"));
check("DEFAULT_ACCENT amber logo", theme.includes('DEFAULT_ACCENT = "#D97706"'));
check("meta theme-color navy", theme.includes("#0A0C10"));
check("manifest theme/background navy", manifest.includes("#0A0C10"));

process.exit(code);
