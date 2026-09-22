"use client";

import { useState } from "react";
import { DEFAULT_ACCENT, ACCENT_PRESETS, FONT_PRESETS, BG_PRESETS, useTheme } from "./ThemeProvider";
import { useLang } from "./LangProvider";
import { InfoSheet, type InfoSheetId } from "./Sheets";
import {
  IconArrowRight,
  IconBell,
  IconDoc,
  IconDownload,
  IconEye,
  IconGear,
  IconGoogle,
  IconInfo,
  IconMoon,
  IconPalette,
  IconPlug,
  IconShield,
  IconStar,
  IconUser,
} from "./icons";

/** Picker warna pola aksen: swatch preset + custom + reset (null = ikut token tema). */
function SwatchPicker({
  label,
  value,
  presets,
  colorOf,
  customLabel,
  resetLabel,
  onPick,
}: {
  label: string;
  value: string | null;
  presets: string[];
  colorOf: string;
  customLabel: string;
  resetLabel: string;
  onPick: (hex: string | null) => void;
}) {
  const customValue = (value ?? presets[0]).toUpperCase();
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "2px 0 8px" }}>
      {presets.map((c) => (
        <button
          key={c}
          title={c}
          aria-label={`${colorOf}${c}`}
          aria-pressed={(value ?? "").toUpperCase() === c}
          onClick={() => onPick(c)}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: c,
            border: (value ?? "").toUpperCase() === c ? "3px solid var(--ink)" : "1px solid var(--line)",
            cursor: "pointer",
            flex: "none",
          }}
        />
      ))}
      <label
        title={customLabel}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
          border: "1px solid var(--line)",
          cursor: "pointer",
          flex: "none",
          position: "relative",
          overflow: "hidden",
          color: "#fff",
        }}
      >
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <IconPalette size={16} />
        </span>
        <input
          type="color"
          aria-label={customLabel}
          value={customValue}
          onChange={(e) => onPick(e.target.value)}
          style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
        />
      </label>
      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{label}</span>
      {value !== null && (
        <button className="link" onClick={() => onPick(null)}>
          {resetLabel}
        </button>
      )}
    </div>
  );
}

interface Props {
  connected: boolean;
  email: string | null;
  notif: boolean;
  onToggleNotif: () => void;
  onLogout: () => void;
  preview: boolean;
  guestName: string;
  onGuestName: (v: string) => void;
  onExitPreview: () => void;
  installed: boolean;
  onOpenInstall: () => void;
  onTestNotif: () => void;
}

export default function SettingsView({
  connected,
  email,
  notif,
  onToggleNotif,
  onLogout,
  preview,
  guestName,
  onGuestName,
  onExitPreview,
  installed,
  onOpenInstall,
  onTestNotif,
}: Props) {
  const { theme, setTheme, accent, setAccent, ink, setInk, bg, setBg, effective } = useTheme();
  const { t } = useLang();
  const modeLabel = t("settings.forMode").replace(
    "{mode}",
    t(effective === "dark" ? "settings.dark" : "settings.light").toLowerCase()
  );
  const initial = (email?.trim()?.[0] ?? "").toUpperCase();
  const [info, setInfo] = useState<InfoSheetId>(null);

  return (
    <section className="view active" id="v-settings">
      <div className="greet">
        {t("settings.title")}<small>{connected ? t("settings.accountOn") : t("settings.previewMode")}</small>
      </div>

      <div className="card">
        <h2>
          <span className="h-ic">
            <IconUser size={15} />
          </span>
          {t("settings.account")}
        </h2>
        <div className="profile-head">
          <div className="profile-ava">
            {connected && initial ? initial : <IconEye size={24} />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {connected ? (
              <>
                <div style={{ fontWeight: 800, fontSize: 17, overflowWrap: "anywhere" }}>{email}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <span className="dot" style={{ background: "var(--green)", display: "inline-block", marginRight: 6 }} />
                  {t("settings.loggedSub")}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{t("settings.guestMode")}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <span className="dot" style={{ background: "var(--amber)", display: "inline-block", marginRight: 6 }} />
                  {t("settings.guestSub")}
                </div>
              </>
            )}
          </div>
        </div>
        {!connected && (
          <>
            <label className="f" htmlFor="guestName">{t("settings.displayName")}</label>
            <input
              className="f"
              id="guestName"
              maxLength={30}
              placeholder={t("settings.namePh")}
              value={guestName}
              onChange={(e) => onGuestName(e.target.value)}
            />
          </>
        )}
        {connected ? (
          <div className="btn-pair" style={{ marginTop: 14 }}>
            <button className="btn danger" onClick={onLogout}>
              {t("settings.logout")}
            </button>
          </div>
        ) : (
          <>
            <a
              className="btn primary block btn-ic"
              href="/api/auth/login"
              style={{ marginTop: 14, textDecoration: "none", textAlign: "center" }}
            >
              <IconGoogle size={17} />
              {t("settings.connectGoogle")}
            </a>
            <button className="btn ghost block" onClick={onExitPreview} style={{ marginTop: 8 }}>
              {t("settings.exitPreview")}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h2>
          <span className="h-ic">
            <IconGear size={15} />
          </span>
          {t("settings.themeGallery")}
        </h2>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconMoon size={14} />
              {t("settings.appearance")}
            </div>
            <div className="s">{t("settings.appearanceSub")}</div>
          </div>
        </div>
        <div className="chips" role="group" aria-label={t("settings.modeGroup")} style={{ paddingBottom: 8 }}>
          {(["light", "dark", "auto"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`chip${theme === m ? " on" : ""}`}
              aria-pressed={theme === m}
              onClick={() => setTheme(m)}
            >
              {m === "light" ? t("settings.light") : m === "dark" ? t("settings.dark") : t("settings.auto")}
            </button>
          ))}
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconPalette size={14} />
              {t("settings.accentColor")}
            </div>
            <div className="s">{t("settings.accentSub")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "2px 0 8px" }}>
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              title={c}
              aria-label={`${t("settings.colorOf")}${c}`}
              aria-pressed={accent.toUpperCase() === c}
              onClick={() => setAccent(c)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: c,
                border: accent.toUpperCase() === c ? "3px solid var(--ink)" : "1px solid var(--line)",
                cursor: "pointer",
                flex: "none",
              }}
            />
          ))}
          <label
            title={t("settings.customColor")}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
              border: "1px solid var(--line)",
              cursor: "pointer",
              flex: "none",
              position: "relative",
              overflow: "hidden",
              color: "#fff",
            }}
          >
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <IconPalette size={16} />
            </span>
            <input
              type="color"
              aria-label={t("settings.customColor")}
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
            />
          </label>
          {accent.toUpperCase() !== DEFAULT_ACCENT && (
            <button className="link" onClick={() => setAccent(DEFAULT_ACCENT)}>
              {t("settings.reset")}
            </button>
          )}
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconDoc size={14} />
              {t("settings.fontColor")}
            </div>
            <div className="s">{t("settings.fontColorSub")}</div>
          </div>
        </div>
        <SwatchPicker
          label={modeLabel}
          value={ink}
          presets={FONT_PRESETS}
          colorOf={t("settings.colorOf")}
          customLabel={t("settings.customColor")}
          resetLabel={t("settings.reset")}
          onPick={setInk}
        />
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconPalette size={14} />
              {t("settings.bgColor")}
            </div>
            <div className="s">{t("settings.bgColorSub")}</div>
          </div>
        </div>
        <SwatchPicker
          label={modeLabel}
          value={bg}
          presets={BG_PRESETS}
          colorOf={t("settings.colorOf")}
          customLabel={t("settings.customColor")}
          resetLabel={t("settings.reset")}
          onPick={setBg}
        />
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconBell size={14} />
              {t("settings.reminderTitle")}
            </div>
            <div className="s">{t("settings.reminderSub")}</div>
          </div>
          <button className="link" style={{ marginLeft: "auto" }} onClick={onTestNotif}>
            {t("settings.testNotif")}
          </button>
          <button
            className="switch"
            role="switch"
            aria-checked={notif ? "true" : "false"}
            aria-label={t("settings.reminderTitle")}
            onClick={onToggleNotif}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconPlug size={14} />
              {t("settings.connTitle")}
            </div>
            <div className="s">{connected ? t("settings.connLive").replace("{email}", email ?? "") : preview ? t("settings.previewMode") : t("settings.connNone")}</div>
          </div>
          {connected ? (
            <button className="btn danger" style={{ marginLeft: "auto", padding: "10px 16px" }} onClick={onLogout}>
              {t("settings.logout")}
            </button>
          ) : (
            <a
              className="link link-ic"
              style={{ marginLeft: "auto", textDecoration: "none" }}
              href="/api/auth/login"
            >
              <IconGoogle size={14} />
              {t("settings.loginGoogle")}
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <h2>
          <span className="h-ic">
            <IconInfo size={15} />
          </span>
          {t("settings.info")}
        </h2>
        {!installed && (
          <div className="set-row">
            <div>
              <div className="t row-ic">
                <IconDownload size={14} />
                {t("settings.installApp")}
              </div>
              <div className="s">{t("settings.installAppSub")}</div>
            </div>
            <button className="link link-ic" style={{ marginLeft: "auto" }} onClick={onOpenInstall}>
              {t("settings.open")}
              <IconArrowRight size={14} />
            </button>
          </div>
        )}
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconStar size={14} />
              {t("settings.credit")}
            </div>
            <div className="s">{t("settings.creditSub")}</div>
          </div>
          <button className="link link-ic" style={{ marginLeft: "auto" }} onClick={() => setInfo("credit")}>
            {t("settings.open")}
            <IconArrowRight size={14} />
          </button>
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconShield size={14} />
              {t("settings.privacy")}
            </div>
            <div className="s">{t("settings.privacySub")}</div>
          </div>
          <button className="link link-ic" style={{ marginLeft: "auto" }} onClick={() => setInfo("privacy")}>
            {t("settings.open")}
            <IconArrowRight size={14} />
          </button>
        </div>
        <div className="set-row">
          <div>
            <div className="t row-ic">
              <IconDoc size={14} />
              {t("settings.terms")}
            </div>
            <div className="s">{t("settings.termsSub")}</div>
          </div>
          <button className="link link-ic" style={{ marginLeft: "auto" }} onClick={() => setInfo("terms")}>
            {t("settings.open")}
            <IconArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="card">
        <h2>
          <span className="h-ic">
            <IconInfo size={15} />
          </span>
          {t("settings.about")}
        </h2>
        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
          {t("settings.aboutBody1")}
          <br />
          {t("settings.aboutBody2")}
          <br />
          {t("settings.copyright")}
        </div>
      </div>

      <InfoSheet id={info} onClose={() => setInfo(null)} />
    </section>
  );
}
