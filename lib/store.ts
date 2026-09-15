"use client";

import { useCallback, useEffect, useState } from "react";
import { migrateRochaKeys } from "./data";

function readLS<T>(key: string, fallback: T): T {
  // Migrasi selalu sebelum baca — perbaiki bug hidrasi-timpa-migrasi:
  // tanpa ini, state lama terbaca dulu lalu ditulis balik dan menimpa hasil migrasi.
  try {
    migrateRochaKeys();
  } catch {
    /* abaikan: storage tak tersedia */
  }
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
  const initialNow: T = typeof initial === "function" ? (initial as () => T)() : initial;
  const [value, setValue] = useState<T>(initialNow);

  // initial hanya dipakai untuk seed pertama; simpan snapshot-nya agar
  // effect tidak perlu depend ke referensi fungsi yang berubah tiap render.
  const [seed] = useState<T>(initialNow);

  useEffect(() => {
    const stored = readLS<T>(key, seed);
    if (stored !== seed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted value after mount
      setValue(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed snapshot, key saja
  }, [key]);

  // Reset tanpa bocor satu render saat key akun berganti: set-state-dalam-render
  // (pola React resmi) agar value langsung sinkron sebelum paint berikutnya.
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setValue(readLS(key, initialNow));
  }

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
