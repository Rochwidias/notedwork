"use client";

import { useTheme } from "./ThemeProvider";
import { useLang } from "./LangProvider";
import { IconEye, IconGlobe } from "./icons";

interface Props {
  connected: boolean;
  email: string | null;
  onProfile: () => void;
  preview?: boolean;
}

export default function TopBar({ connected, email, onProfile, preview }: Props) {
  const { theme, toggle } = useTheme();
  const { lang, toggleLang, t } = useLang();
  const initial = (email?.trim()?.[0] ?? "").toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <img className="logo-badge" src="/icon.svg" alt="notedwork" width={40} height={40} />
        <div>
          <div className="brand-name">notedwork</div>
          <div className="brand-sub">{t("topbar.tagline")}</div>
        </div>
        <div className="top-actions">
          <button
            className="icon-btn lang-btn"
            onClick={toggleLang}
            title={lang === "id" ? t("topbar.langToEn") : t("topbar.langToId")}
            aria-label={lang === "id" ? t("topbar.langToEn") : t("topbar.langToId")}
          >
            <IconGlobe size={16} />
            <span className="lang-tag" aria-hidden="true">
              <span className={lang === "id" ? "on" : "off"}>ID</span>
              <span className="sep">/</span>
              <span className={lang === "en" ? "on" : "off"}>EN</span>
            </span>
          </button>
          <button
            className="icon-btn"
            onClick={toggle}
            title={t("topbar.theme")}
            aria-label={theme === "dark" ? t("topbar.themeToLight") : t("topbar.themeToDark")}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          {/* Avatar satu perilaku: preview (ikon mata) → koneksi/login,
              connected (inisial) → settings. Cabang IconUser mati dihapus
              karena preview = !connected membuatnya tak terjangkau. */}
          <button
            className="avatar"
            onClick={onProfile}
            title={preview ? t("topbar.connect") : t("topbar.settings")}
            aria-label={preview ? t("topbar.connect") : t("topbar.settings")}
          >
            {connected && initial ? initial : <IconEye size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
