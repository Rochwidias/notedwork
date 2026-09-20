"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Theme } from "@/lib/types";
import { ACCENT_KEY, BG_DARK_KEY, BG_LIGHT_KEY, INK_DARK_KEY, INK_LIGHT_KEY, LS } from "@/lib/data";

interface ThemeContextValue {
  /** Preferensi tema ("dark" | "light" | "auto"); tema efektif di-resolve ke DOM. */
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  accent: string;
  setAccent: (hex: string) => void;
  /** Tema efektif yang sedang tampil ("auto" sudah di-resolve). */
  effective: "dark" | "light";
  /** Warna font kustom mode aktif (null = ikut token tema). */
  ink: string | null;
  setInk: (hex: string | null) => void;
  /** Warna latar kustom mode aktif (null = ikut token tema). */
  bg: string | null;
  setBg: (hex: string | null) => void;
}

export const DEFAULT_ACCENT = "#D97706";

/** Preset aksen selaras logo (Amber Emas): amber default + biru + hijau + ungu + merah tua. */
export const ACCENT_PRESETS = ["#D97706", "#1D4ED8", "#15803D", "#7C3AED", "#B91C1C"];

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
  effective: "dark",
  ink: null,
  setInk: () => {},
  bg: null,
  setBg: () => {},
});

/** Preset warna font selaras logo: kertas, amber, slate, pekat. */
export const FONT_PRESETS = ["#F8FAFC", "#FBBF24", "#94A3B8", "#0D0D0D"];

/** Preset warna latar selaras logo: navy, slate, kertas, putih. */
export const BG_PRESETS = ["#0A0C10", "#161922", "#F7F4EE", "#FFFFFF"];

export function useTheme() {
  return useContext(ThemeContext);
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS.theme);
    const v = raw?.trim().replace(/^"+|"+$/g, "");
    if (v === "dark" || v === "light" || v === "auto") return v;
  } catch {
    /* abaikan */
  }
  return null;
}

/** Tema sistem dari prefers-color-scheme. Fallback "light" di SSR/tanpa matchMedia. */
function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Resolve tema efektif: "auto" mengikuti sistem, "dark"/"light" dipakai apa adanya. */
function resolveTheme(t: Theme): "dark" | "light" {
  return t === "auto" ? getSystemTheme() : t;
}

function sanitizeHex(v: string | null): string | null {
  if (!v) return null;
  const hex = v.trim().replace(/^"+|"+$/g, "");
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : null;
}

function toRgb(h: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(h.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminance relatif sRGB (0–1) untuk keputusan kontras teks. */
function getLuminance(hex: string): number {
  const rgb = toRgb(hex);
  if (!rgb) return 0;
  const lin = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Pilih warna teks di atas background aksen: putih bila bg gelap, hitam pekat bila terang. */
function pickOnColor(bgHex: string): "#FFFFFF" | "#0D0D0D" {
  return getLuminance(bgHex) < 0.45 ? "#FFFFFF" : "#0D0D0D";
}

function applyAccent(accent: string, dark: boolean): void {
  const root = document.documentElement.style;
  // Floor mode gelap: aksen terlalu gelap (navy/hitam) dicerahkan bertahap
  // agar terlihat di atas card gelap & teks di atasnya terbaca.
  let base = accent;
  if (dark) {
    for (let i = 0; i < 5 && getLuminance(base) < 0.18; i++) {
      base = mixWith(base, "#FFFFFF", 0.2);
    }
  }
  // Mode terang: gelapkan sampai kontras cukup (minta teks putih), bukan fix 25%.
  let main = base;
  if (!dark) {
    for (let i = 0; i < 6 && pickOnColor(main) !== "#FFFFFF"; i++) {
      main = mixWith(main, "#000000", 0.15);
    }
  }
  const brandDark = dark ? base : mixWith(main, "#000000", 0.12);
  root.setProperty("--brand", main);
  root.setProperty("--brand-dark", brandDark);
  // Wash turun dari brand final (bukan aksen mentah) agar konsisten dengan yang tampil.
  root.setProperty("--brand-soft", `color-mix(in srgb, ${main} 12%, transparent)`);
  root.setProperty("--accent-glow", `color-mix(in srgb, ${main} 28%, transparent)`);
  root.setProperty("--accent-muted", `color-mix(in srgb, ${main} 8%, transparent)`);
  root.setProperty("--border-accent", `color-mix(in srgb, ${main} 35%, transparent)`);
  root.setProperty("--on-brand", pickOnColor(main));
}

/** Campur hex dengan warna lain (t 0–1). Fallback: kembalikan base bila input aneh. */
function mixWith(base: string, other: string, t: number): string {
  const a = toRgb(base);
  const b = toRgb(other);
  if (!a || !b) return base;
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Terapkan override tampilan kustom mode aktif.
 * - ink: timpa --ink; --muted diturunkan (ink 62% + bg) agar teks sekunder harmonis.
 * - bg: timpa --bg + turunkan --card/--card-2/--input/--topbar/--line dari bg+ink.
 * - null = hapus override (kembali ke token CSS tema).
 */
function applyCustom(ink: string | null, bg: string | null, dark: boolean): void {
  const root = document.documentElement.style;
  const baseBg = bg ?? (dark ? "#0A0C10" : "#F7F4EE");
  const baseInk = ink ?? (dark ? "#F8FAFC" : "#292524");
  if (ink) {
    root.setProperty("--ink", ink);
    root.setProperty("--muted", `color-mix(in srgb, ${ink} 62%, ${baseBg})`);
  } else {
    root.removeProperty("--ink");
    root.removeProperty("--muted");
  }
  if (bg) {
    root.setProperty("--bg", bg);
    root.setProperty("--card", `color-mix(in srgb, ${bg} 92%, ${baseInk})`);
    root.setProperty("--card-2", `color-mix(in srgb, ${bg} 86%, ${baseInk})`);
    root.setProperty("--input", `color-mix(in srgb, ${bg} 92%, ${baseInk})`);
    root.setProperty("--topbar", `color-mix(in srgb, ${bg} 88%, transparent)`);
    root.setProperty("--line", `color-mix(in srgb, ${bg} 80%, ${baseInk})`);
  } else {
    root.removeProperty("--bg");
    root.removeProperty("--card");
    root.removeProperty("--card-2");
    root.removeProperty("--input");
    root.removeProperty("--topbar");
    root.removeProperty("--line");
  }
}

/** Baca override kustom tersimpan (null = belum pernah diatur). */
function getStoredCustom(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sanitizeHex(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function getStoredAccent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sanitizeHex(localStorage.getItem(ACCENT_KEY));
  } catch {
    return null;
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [inkDark, setInkDark] = useState<string | null>(null);
  const [inkLight, setInkLight] = useState<string | null>(null);
  const [bgDark, setBgDark] = useState<string | null>(null);
  const [bgLight, setBgLight] = useState<string | null>(null);
  // Pilihan sistem saat ini — lazy-init dari matchMedia agar tanpa setState di effect.
  const [system, setSystem] = useState<"dark" | "light">(() => getSystemTheme());

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted theme after mount to stay hydration-safe
      setTheme(stored);
    }
    const acc = getStoredAccent();
    if (acc) {
      setAccentState(acc);
    }
    const id = getStoredCustom(INK_DARK_KEY);
    if (id) setInkDark(id);
    const il = getStoredCustom(INK_LIGHT_KEY);
    if (il) setInkLight(il);
    const bd = getStoredCustom(BG_DARK_KEY);
    if (bd) setBgDark(bd);
    const bl = getStoredCustom(BG_LIGHT_KEY);
    if (bl) setBgLight(bl);
  }, []);

  // Langganan prefers-color-scheme: hanya callback perubahan yang setState.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystem(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Tema efektif = turunan murni (bukan state): "auto" → sistem, lain → apa adanya.
  const effective: "dark" | "light" = theme === "auto" ? system : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = effective;
    try {
      localStorage.setItem(LS.theme, JSON.stringify(theme));
    } catch {
      /* abaikan */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", effective === "dark" ? "#0A0C10" : "#F7F4EE");
    applyAccent(accent, effective === "dark");
    const dark = effective === "dark";
    applyCustom(dark ? inkDark : inkLight, dark ? bgDark : bgLight, dark);
  }, [theme, effective, accent, inkDark, inkLight, bgDark, bgLight]);

  const toggle = useCallback(() => {
    // Non-breaking: toggle selalu dark<->light ("auto" → ikut efektif lalu dibalik).
    setTheme((prev) => (resolveTheme(prev) === "dark" ? "light" : "dark"));
  }, []);

  const setAccent = useCallback((hex: string) => {
    const clean = sanitizeHex(hex);
    if (!clean) return;
    setAccentState(clean);
    try {
      localStorage.setItem(ACCENT_KEY, JSON.stringify(clean));
    } catch {
      /* abaikan */
    }
  }, []);

  // Tulis override ke kunci mode efektif; null/"" = reset ke token tema.
  const setCustomForMode = useCallback(
    (
      hex: string | null,
      setDark: (v: string | null) => void,
      setLight: (v: string | null) => void,
      keyDark: string,
      keyLight: string
    ) => {
      const clean = hex ? sanitizeHex(hex) : null;
      const dark = effective === "dark";
      (dark ? setDark : setLight)(clean);
      try {
        if (clean) localStorage.setItem(dark ? keyDark : keyLight, JSON.stringify(clean));
        else localStorage.removeItem(dark ? keyDark : keyLight);
      } catch {
        /* abaikan */
      }
    },
    [effective]
  );

  const setInk = useCallback(
    (hex: string | null) => setCustomForMode(hex, setInkDark, setInkLight, INK_DARK_KEY, INK_LIGHT_KEY),
    [setCustomForMode]
  );
  const setBg = useCallback(
    (hex: string | null) => setCustomForMode(hex, setBgDark, setBgLight, BG_DARK_KEY, BG_LIGHT_KEY),
    [setCustomForMode]
  );

  const dark = effective === "dark";
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle,
        setTheme,
        accent,
        setAccent,
        effective,
        ink: dark ? inkDark : inkLight,
        setInk,
        bg: dark ? bgDark : bgLight,
        setBg,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
