"use client";

import type { ComponentType } from "react";
import type { NavTarget, ViewName } from "@/lib/types";
import { IconCalendar, IconGear, IconHome, IconMail, IconTask, IconPlus, IconNote } from "./icons";

type IconComp = ComponentType<{ size?: number; className?: string }>;

const MAIN_TABS: { id: ViewName; Icon: IconComp; labelKey: string }[] = [
  { id: "beranda", Icon: IconHome, labelKey: "nav.home" },
  { id: "email", Icon: IconMail, labelKey: "nav.email" },
  { id: "tugas", Icon: IconTask, labelKey: "nav.tasks" },
  { id: "kalender", Icon: IconCalendar, labelKey: "nav.calendar" },
  { id: "catatan", Icon: IconNote, labelKey: "nav.notes" },
  { id: "settings", Icon: IconGear, labelKey: "nav.settings" },
];

export function Sidebar({
  view,
  go,
  t = (k: string) => k,
}: {
  view: ViewName;
  go: (v: NavTarget) => void;
  t?: (k: string) => string;
}) {
  return (
    <nav className="sidebar" aria-label="Navigasi utama">
      <div className="cap">{t("nav.menu")}</div>
      {MAIN_TABS.map((n) => (
        <button key={n.id} className={`tab${view === n.id ? " active" : ""}`} onClick={() => go(n.id)}>
          <span className="ic">
            <n.Icon size={20} />
          </span>
          {t(n.labelKey)}
        </button>
      ))}
      <div className="cap">{t("nav.addSection")}</div>
      <button className="tab" onClick={() => go("tambah")}>
        <span className="ic">
          <IconPlus size={20} />
        </span>
        {t("nav.addNew")}
      </button>
    </nav>
  );
}

export function TabBar({
  view,
  go,
  t = (k: string) => k,
}: {
  view: ViewName;
  go: (v: NavTarget) => void;
  t?: (k: string) => string;
}) {
  return (
    <nav className="tabbar" aria-label="Navigasi utama">
      <div className="tabbar-inner">
        {MAIN_TABS.map((n) => (
          <button
            key={n.id}
            className={`tab${view === n.id ? " active" : ""}`}
            aria-current={view === n.id ? "page" : undefined}
            aria-label={t(n.labelKey)}
            title={t(n.labelKey)}
            onClick={() => go(n.id)}
          >
            <span className="ic" aria-hidden="true">
              <n.Icon size={20} />
            </span>
            <span className="lbl" aria-hidden="true">
              {t(n.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Fab({ onAdd, t = (k: string) => k }: { onAdd: () => void; t?: (k: string) => string }) {
  return (
    <button className="fab" onClick={onAdd} title={t("nav.addNew")} aria-label={t("nav.addNew")}>
      <IconPlus size={26} />
    </button>
  );
}
