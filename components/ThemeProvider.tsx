"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Theme } from "@/lib/types";
import { ACCENT_KEY, LS } from "@/lib/data";

interface ThemeContextValue {
  /** Preferensi tema ("dark" | "light" | "auto"); tema efektif di-resolve ke DOM. */
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  accent: string;
  setAccent: (hex: string) => void;
}

export const DEFAULT_ACCENT = "#B45309";

/** Preset aksen unisex (Kertas Netral): coklat default + biru + hijau + ungu + merah tua. */
export const ACCENT_PRESETS = ["#B45309", "#1D4ED8", "#15803D", "#7C3AED", "#B91C1C"];

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", effective === "dark" ? "#1C1917" : "#F7F4EE");
    applyAccent(accent, effective === "dark");
  }, [theme, effective, accent]);

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

  return <ThemeContext.Provider value={{ theme, toggle, setTheme, accent, setAccent }}>{children}</ThemeContext.Provider>;
}
