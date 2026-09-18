"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LANG_KEY, STRINGS, pickLang, type Lang } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  t: (key: string) => string;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "id",
  t: (k) => STRINGS.id[k] ?? k,
  setLang: () => {},
  toggleLang: () => {},
});

export function useLang() {
  return useContext(LangContext);
}

export default function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LANG_KEY);
      if (raw == null) return;
      const v = JSON.parse(raw);
      const l = pickLang(v);
      if (l) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted lang after mount to stay hydration-safe
        setLangState(l);
      }
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, JSON.stringify(lang));
    } catch {
      /* abaikan */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((k: string) => STRINGS[lang][k] ?? STRINGS.id[k] ?? k, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "id" ? "en" : "id"));
  }, []);

  return <LangContext.Provider value={{ lang, t, setLang, toggleLang }}>{children}</LangContext.Provider>;
}
