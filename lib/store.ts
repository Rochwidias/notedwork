"use client";

import { useCallback, useEffect, useState } from "react";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as T;
    // Jangan percaya storage korup: array harus tetap array.
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* abaikan: mode privat / storage penuh */
  }
}

/** State yang persist ke localStorage. Hydration-safe: baca saat mount. */
export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() =>
    typeof initial === "function" ? (initial as () => T)() : initial
  );

  // initial hanya dipakai untuk seed pertama; simpan snapshot-nya agar
  // effect tidak perlu depend ke referensi fungsi yang berubah tiap render.
  const [seed] = useState<T>(() =>
    typeof initial === "function" ? (initial as () => T)() : initial
  );

  useEffect(() => {
    const stored = readLS<T>(key, seed);
    if (stored !== seed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted value after mount
      setValue(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed snapshot, key saja
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        writeLS(key, v);
        return v;
      });
    },
    [key]
  );

  return [value, set] as const;
}

export function removeLS(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
}
