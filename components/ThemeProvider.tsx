"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Theme } from "@/lib/types";
import { ACCENT_KEY, LS } from "@/lib/data";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  accent: string;
  setAccent: (hex: string) => void;
}

export const DEFAULT_ACCENT = "#00CFFF";

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
    if (raw === '"dark"' || raw === "dark") return "dark";
    if (raw === '"light"' || raw === "light") return "light";
  } catch {
    /* abaikan */
  }
  return null;
}

function sanitizeHex(v: string | null): string | null {
  if (!v) return null;
  const hex = v.trim().replace(/^"+|"+$/g, "");
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : null;
}

function applyAccent(accent: string, dark: boolean): void {
  const root = document.documentElement.style;
  // Mode terang: gelapkan ~25% agar kontras di background putih.
  const main = dark ? accent : mixWith(accent, "#000000", 0.25);
  root.setProperty("--brand", main);
  root.setProperty("--brand-dark", dark ? accent : mixWith(accent, "#000000", 0.35));
  root.setProperty("--brand-soft", `color-mix(in srgb, ${accent} 12%, transparent)`);
  root.setProperty("--accent-glow", `color-mix(in srgb, ${accent} 28%, transparent)`);
  root.setProperty("--accent-muted", `color-mix(in srgb, ${accent} 8%, transparent)`);
  root.setProperty("--border-accent", `color-mix(in srgb, ${accent} 35%, transparent)`);
}

/** Campur hex dengan warna lain (t 0–1). Fallback: kembalikan base bila input aneh. */
function mixWith(base: string, other: string, t: number): string {
  const toRgb = (h: string): [number, number, number] | null => {
    const m = /^#([0-9a-fA-F]{6})$/.exec(h.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(LS.theme, JSON.stringify(theme));
    } catch {
      /* abaikan */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#121212" : "#f5f5f5");
    applyAccent(accent, theme === "dark");
  }, [theme, accent]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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
