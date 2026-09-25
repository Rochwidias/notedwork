"use client";

import { useEffect, useRef, useState } from "react";
import type { ComposePreset, Note, Prio, Routine, Sched, Task } from "@/lib/types";
import { IconAddHome, IconBook, IconDownload, IconForward, IconLaptop, IconMail, IconMenuVert, IconNote, IconPhone, IconPlus, IconReply, IconShare, IconTask } from "./icons";
import { LEGAL, type LegalId } from "@/lib/legal";
import { dayNames, prioLabel } from "@/lib/dates";
import { DEFAULT_REMINDER_MIN } from "@/lib/reminders";
import { useLang } from "./LangProvider";

export type SheetId = "sched" | "mail" | "task" | "routine" | "note" | "tambah" | "cepat" | "install" | null;

/** Slider menit (0-1425) -> "HH:MM". Clamp agar tak pernah "24:xx". */
export function minutesToHHMM(mins: number): string {
  const m = Math.max(0, Math.min(1439, Math.round(mins)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export type QuickKind = "task" | "sched" | "mail" | "note";
export type InfoSheetId = LegalId | null;

function Shell({
  id,
  open,
  onClose,
  children,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      className={`overlay${open ? " open" : ""}`}
      id={id}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

/** Sheet info statis (Kredit/Privasi/Syarat) — reuse Shell, tanpa route. */
export function InfoSheet({ id, onClose }: { id: InfoSheetId; onClose: () => void }) {
  const { lang, t } = useLang();
  if (id == null) return null;
  const doc = LEGAL[lang][id];
  return (
    <Shell id="ovInfo" open onClose={onClose}>
      <h2>{doc.title}</h2>
      <p className="hint">{doc.updated}</p>
      <div style={{ fontSize: 13.5, lineHeight: 1.75, display: "grid", gap: 10 }}>
        {doc.body.map((p, i) => (
          <p key={i} style={{ color: "var(--ink)" }}>{p}</p>
        ))}
      </div>
      <div className="actions-single">
        <button type="button" className="btn primary block" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </Shell>
  );
}

/** Preset pengingat (menit): Mati, 3/5/10 jam, 1 hari — pas sebaris tanpa geser. */
export const REMINDER_VALUES = [0, 180, 300, 600, 1440];

/** Label chips pengingat: 0=Mati, 60=1 jam, kelipatan jam, 1440=1 hari. */
export function reminderChipLabel(mins: number, t: (key: string) => string): string {
  if (mins <= 0) return t("reminder.off");
  if (mins < 60) return `${mins}${t("reminder.min")}`;
  if (mins % 60 !== 0) return `${mins}${t("reminder.min")}`;
  const h = mins / 60;
  if (h < 24) return `${h}${h === 1 ? t("reminder.hour") : t("reminder.hours")}`;
  const d = h / 24;
  return `${d}${t("reminder.day")}`;
}

/** Pemilih pengingat chips [Mati,3/5/10 jam,1 hari] — dipakai SchedSheet + TaskSheet + QuickAddSheet. */
export function ReminderChips({
  value,
  onChange,
  idPrefix,
}: {
  value: number;
  onChange: (v: number) => void;
  idPrefix: string;
}) {
  const { t } = useLang();
  return (
    <div className="chips" role="group" aria-label={t("reminder.title")} style={{ paddingBottom: 4 }}>
      {REMINDER_VALUES.map((v) => (
        <button
          key={v}
          type="button"
          id={`${idPrefix}-${v}`}
          className={`chip${value === v ? " on" : ""}`}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {reminderChipLabel(v, t)}
        </button>
      ))}
    </div>
  );
}

export function SchedSheet({
  open,
  selDate,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  selDate: string;
  initial?: Sched | null;
  onClose: () => void;
  /** false = gagal: sheet tetap terbuka, draf utuh (tidak di-clear). */
  onSave: (v: { title: string; date: string; time: string; endTime?: string; note: string; reminderMin?: number }) => Promise<boolean | void> | boolean | void;
}) {
  const { t } = useLang();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selDate);
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [reminderMin, setReminderMin] = useState(DEFAULT_REMINDER_MIN);
  const [titleErr, setTitleErr] = useState("");
  const [endErr, setEndErr] = useState("");
  // Anti-spam simpan: ref sinkron (lolos bila pakai state saja — klik cepat
  // masuk sebelum re-render). finally selalu reset agar sheet tak macet.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Mode edit: isi form dari data lama; mode tambah: default tanggal dipilih.
      // Jam mulai dikosongkan di mode tambah (opsional → 09:00 saat simpan).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form default saat sheet dibuka
      setTitle(initial?.title ?? "");
      setDate(initial?.date ?? selDate);
      setTime(initial?.time ?? "");
      setEndTime(initial?.endTime ?? "");
      setNote(initial?.note ?? "");
      setReminderMin(initial?.reminderMin ?? 15);
      setTitleErr("");
      setEndErr("");
      savingRef.current = false;
      setSaving(false);
    }
  }, [open, selDate, initial]);

  const editing = !!initial;

  return (
    <Shell id="ovSched" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconPlus size={15} /></span>{editing ? t("sched.editTitle") : t("sched.addTitle")}</h2>
      <p className="hint">{t("sched.hint")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (savingRef.current) return;
          // Error inline (bukan diam): judul wajib, akhir valid bila diisi.
          const jt = title.trim();
          if (!jt) {
            setTitleErr(t("sched.titleRequired"));
            return;
          }
          setTitleErr("");
          const tm = time.trim() || "09:00";
          const end = endTime.trim();
          // Waktu akhir: opsional — kosongkan bila sekilas (pakai jam mulai saja).
          // format jam browser = "HH:MM"; string kosong = tak diisi.
          if (end && !/^\d{2}:\d{2}$/.test(end)) {
            setEndErr(t("sched.endInvalid"));
            return;
          }
          setEndErr("");
          // end<=start = lintas-hari (lewat tengah malam, besok): diterima, bukan ditolak.
          // end kosong / sama dengan mulai = sekilas (tak dikirim).
          savingRef.current = true;
          setSaving(true);
          let ok: boolean | void = false;
          try {
            ok = await onSave({
              title: jt,
              date,
              time: tm,
              ...(end && end !== tm ? { endTime: end } : {}),
              note: note.trim(),
              reminderMin,
            });
          } finally {
            savingRef.current = false;
            setSaving(false);
          }
          // Form tetap utuh bila simpan gagal (false): jangan clear draf.
          if (ok === false) return;
          setTitle("");
          setNote("");
          setTime("");
          setEndTime("");
          setTitleErr("");
          setEndErr("");
          setReminderMin(DEFAULT_REMINDER_MIN);
        }}
      >
        <label className="f" htmlFor="fTitle">{t("sched.fieldTitle")}</label>
        <input
          className="f"
          id="fTitle"
          maxLength={80}
          placeholder={t("sched.titlePh")}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleErr) setTitleErr("");
          }}
          aria-invalid={!!titleErr}
          aria-describedby={titleErr ? "fTitleErr" : undefined}
        />
        {titleErr && (
          <p id="fTitleErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5, marginTop: 4 }}>
            {titleErr}
          </p>
        )}
        <div className="frow">
          <div>
            <label className="f" htmlFor="fDate">{t("sched.fieldDate")}</label>
            <input className="f" id="fDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="fTime">{t("sched.startLabel")}<span style={{ fontWeight: 500, color: "var(--muted)" }}>{t("common.optional")}</span></label>
            <input className="f" id="fTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="fEnd">{t("sched.endLabel")}<span style={{ fontWeight: 500, color: "var(--muted)" }}>{t("common.optional")}</span></label>
        <input
          className="f"
          id="fEnd"
          type="time"
          value={endTime}
          onChange={(e) => {
            setEndTime(e.target.value);
            if (endErr) setEndErr("");
          }}
          aria-invalid={!!endErr}
          aria-describedby={endErr ? "fEndErr" : "fEndHint"}
        />
        {endErr && (
          <p id="fEndErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5, marginTop: 4 }}>
            {endErr}
          </p>
        )}
        <p className="hint" id="fEndHint" style={{ marginTop: 4 }}>{t("sched.endHint")}</p>
        <label className="f">{t("reminder.title")}</label>
        <ReminderChips value={reminderMin} onChange={setReminderMin} idPrefix="sRem" />
        <label className="f" htmlFor="fNote">{t("sched.fieldNote")}</label>
        <input className="f" id="fNote" placeholder={t("sched.notePh")} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            {t("common.close")}
          </button>
          <button type="submit" className="btn primary" disabled={saving} aria-busy={saving}>
            {saving ? t("sched.saving") : editing ? t("sched.saveChanges") : t("common.save")}
          </button>
        </div>
      </form>
    </Shell>
  );
}

export type MailMode = "tulis" | "balas" | "teruskan";

/** Sheet pilihan tambah: Email / Tugas / Jadwal — satu pintu agar tombol ＋ konsisten. */
export function TambahSheet({
  open,
  t,
  onClose,
  onPick,
}: {
  open: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onPick: (kind: "mail" | "task" | "sched" | "note") => void;
}) {
  const pick = (kind: "mail" | "task" | "sched" | "note", label: string) => ({
    onClick: () => onPick(kind),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPick(kind);
      }
    },
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
  });
  return (
    <Shell id="ovTambah" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconPlus size={15} /></span>{t("tambah.title")}</h2>
      <p className="hint">{t("tambah.hint")}</p>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <div className="row" style={{ cursor: "pointer" }} {...pick("mail", t("tambah.mailNew"))}>
          <span className="h-ic"><IconMail size={18} /></span>
          <div>
            <div className="t">{t("tambah.mail")}</div>
            <div className="s">{t("tambah.mailSub")}</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("task", t("tambah.taskNew"))}>
          <span className="h-ic"><IconTask size={18} /></span>
          <div>
            <div className="t">{t("tambah.task")}</div>
            <div className="s">{t("tambah.taskSub")}</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("sched", t("tambah.schedNew"))}>
          <span className="h-ic"><IconPlus size={18} /></span>
          <div>
            <div className="t">{t("tambah.sched")}</div>
            <div className="s">{t("tambah.schedSub")}</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("note", t("tambah.noteNew"))}>
          <span className="h-ic"><IconNote size={18} /></span>
          <div>
            <div className="t">{t("tambah.note")}</div>
            <div className="s">{t("tambah.noteSub")}</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
      </div>
      <div className="actions-single">
        <button type="button" className="btn ghost block" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </Shell>
  );
}

/** Sheet tutor pasang PWA — tab per platform, tombol native bila browser sediakan prompt. */
export type InstallTab = "android" | "iphone" | "laptop";
const INSTALL_TABS: InstallTab[] = ["android", "iphone", "laptop"];

/** Ikon panduan per (tab × langkah) — tunjukkan tombol beneran di perangkat user; null = teks saja. */
const STEP_ICONS: Record<InstallTab, (React.ComponentType<{ size?: number }> | null)[]> = {
  android: [IconDownload, null, IconPhone],
  iphone: [IconShare, IconAddHome, null],
  laptop: [IconDownload, IconMenuVert, null],
};

export function InstallSheet({
  open,
  canPrompt,
  onInstall,
  onNever,
  onClose,
}: {
  open: boolean;
  canPrompt: boolean;
  onInstall: () => void;
  onNever: () => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<InstallTab>("android");
  return (
    <Shell id="ovInstall" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconDownload size={15} /></span>{t("install.title")}</h2>
      <p className="hint">{t("install.sub")}</p>
      <div className="chips" role="tablist" aria-label={t("install.title")} style={{ paddingBottom: 4 }}>
        {INSTALL_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`chip${tab === id ? " on" : ""}`}
            onClick={() => setTab(id)}
          >
            {id === "android" ? <span className="chip-ic"><IconPhone size={14} /></span> : id === "iphone" ? <span className="chip-ic"><IconShare size={14} /></span> : <span className="chip-ic"><IconLaptop size={14} /></span>}
            {t(id === "android" ? "install.tabAndroid" : id === "iphone" ? "install.tabIphone" : "install.tabLaptop")}
          </button>
        ))}
      </div>
      <ol style={{ display: "grid", gap: 10, margin: "4px 0 0", padding: 0, listStyle: "none" }}>
        {[1, 2, 3].map((n) => {
          const StepIcon = STEP_ICONS[tab][n - 1];
          return (
            <li key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span className="step-n" aria-hidden="true">{n}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)" }}>
                {StepIcon && <span className="step-ic" aria-hidden="true"><StepIcon size={14} /></span>}
                {t(`install.${tab}${n}`)}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="actions-single">
        {canPrompt && (
          <button type="button" className="btn primary block" onClick={onInstall}>
            <span className="chip-ic"><IconDownload size={15} /></span>
            {t("install.nativeBtn")}
          </button>
        )}
        <button type="button" className="btn ghost block" onClick={onClose}>
          {t("common.close")}
        </button>
        <button
          type="button"
          onClick={onNever}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: 6, cursor: "pointer", textDecoration: "underline" }}
        >
          {t("install.never")}
        </button>
      </div>
    </Shell>
  );
}

export function MailSheet({
  open,
  preset,
  mode,
  onClose,
  onSave,
}: {
  open: boolean;
  preset: ComposePreset | null;
  /** Ditentukan pemanggil (openCompose): "tulis" | "balas" | "teruskan". Compose minimal — tanpa Cc/Bcc/lampiran/draft. */
  mode?: MailMode;
  onClose: () => void;
  /** false = gagal: draf dipertahankan, sheet tetap terbuka. */
  onSave: (to: string, subj: string, body: string) => Promise<boolean | void> | boolean | void;
}) {
  const { t } = useLang();
  const [to, setTo] = useState("");
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [toErr, setToErr] = useState("");
  const [sending, setSending] = useState(false);
  // Anti double-kirim: ref sinkron validasi SEKARANG (state telat satu render —
  // klik cepat 2x bisa lolos dua-duanya bila cuma cek state).
  const sendingRef = useRef(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- isi form dari preset saat sheet dibuka
      setTo(preset?.to ?? "");
      setSubj(preset?.subj ?? "");
      setBody(preset?.body ?? "");
      setToErr("");
      sendingRef.current = false;
      setSending(false);
    }
  }, [open, preset]);

  // Judul eksplisit dari mode pemanggil (jangan tebak dari preset.to:
  // forward dengan to="" akan salah terbaca sebagai reply).
  const effMode: MailMode = mode ?? (preset ? (preset.to ? "balas" : "teruskan") : "tulis");
  const head =
    effMode === "balas"
      ? { icon: <IconReply size={15} />, title: t("mail.replyTitle") }
      : effMode === "teruskan"
        ? { icon: <IconForward size={15} />, title: t("mail.fwdTitle") }
        : { icon: <IconMail size={15} />, title: t("mail.composeTitle") };
  return (
    <Shell id="ovMail" open={open} onClose={onClose}>
      <h2><span className="h-ic">{head.icon}</span>{head.title}</h2>
      <p className="hint">{t("mail.hint")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (sendingRef.current) return;
          const dest = to.trim();
          if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(dest)) {
            setToErr(t("mail.toInvalid"));
            return;
          }
          setToErr("");
          sendingRef.current = true;
          setSending(true);
          // Draf dipertahankan bila kirim gagal (return false): jangan clear.
          let ok: boolean | void = false;
          try {
            ok = await onSave(dest, subj, body);
          } finally {
            sendingRef.current = false;
            setSending(false);
          }
          if (ok === false) return;
          setTo("");
          setSubj("");
          setBody("");
        }}
      >
        <label className="f" htmlFor="mTo">{t("mail.fieldTo")}</label>
        <input
          className="f"
          id="mTo"
          type="email"
          required
          placeholder={t("mail.toPh")}
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            if (toErr) setToErr("");
          }}
          aria-invalid={!!toErr}
          aria-describedby={toErr ? "mToErr" : undefined}
        />
        {toErr && (
          <p id="mToErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5, marginTop: 4 }}>
            {toErr}
          </p>
        )}
        <label className="f" htmlFor="mSubj">
          {t("mail.fieldSubj")}<span style={{ fontWeight: 500, color: "var(--muted)", float: "right" }}>{subj.length}/100</span>
        </label>
        <input
          className="f"
          id="mSubj"
          required
          maxLength={100}
          placeholder={t("mail.subjPh")}
          value={subj}
          onChange={(e) => setSubj(e.target.value)}
        />
        <label className="f" htmlFor="mBody">{t("mail.fieldBody")}</label>
        <textarea
          className="f compose-body"
          id="mBody"
          required
          rows={7}
          placeholder={t("mail.bodyPh")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={sending}>
            {t("common.close")}
          </button>
          <button type="submit" className="btn primary" disabled={sending} aria-busy={sending}>
            {sending ? t("mail.sending") : t("mail.send")}
          </button>
        </div>
      </form>
    </Shell>
  );
}

export function TaskSheet({
  open,
  selDate,
  courses,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  selDate: string;
  courses: string[];
  /** Mode edit: isi form dari tugas lama (seperti SchedSheet); null/undefined = mode tambah. */
  initial?: Task | null;
  onClose: () => void;
  onSave: (v: { matkul: string; title: string; date: string; time: string; prio: Prio; note: string; reminderMin?: number }) => Promise<boolean | void> | boolean | void;
}) {
  const { lang, t } = useLang();
  const [matkul, setMatkul] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selDate);
  const [time, setTime] = useState("");
  const [prio, setPrio] = useState<Prio>("sedang");
  const [note, setNote] = useState("");
  const [reminderMin, setReminderMin] = useState(DEFAULT_REMINDER_MIN);
  const [titleErr, setTitleErr] = useState("");
  // Anti-spam simpan: ref sinkron validasi SEKARANG (state telat satu render).
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Mode edit: isi form dari data lama; mode tambah: reset SEMUA field.
      // Jam dikosongkan di mode tambah (opsional → 23:59 saat simpan).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form default saat sheet dibuka
      setMatkul(initial?.matkul ?? "");
      setTitle(initial?.title ?? "");
      setDate(initial?.date ?? selDate);
      setTime(initial?.time ?? "");
      setPrio(initial?.prio ?? "sedang");
      setNote(initial?.note ?? "");
      setReminderMin(initial?.reminderMin ?? 15);
      setTitleErr("");
      savingRef.current = false;
      setSaving(false);
    }
  }, [open, selDate, initial]);

  const editing = !!initial;

  return (
    <Shell id="ovTask" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconTask size={15} /></span>{editing ? t("task.editTitle") : t("task.addTitle")}</h2>
      <p className="hint">{t("task.hint")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (savingRef.current) return;
          // Error inline (bukan diam): judul wajib.
          const jt = title.trim();
          if (!jt) {
            setTitleErr(t("task.titleRequired"));
            return;
          }
          setTitleErr("");
          // Jam deadline: opsional — kosong = akhir hari 23:59 (konsisten taskBadge/isOverdue).
          savingRef.current = true;
          setSaving(true);
          let ok: boolean | void = false;
          try {
            ok = await onSave({
              matkul: matkul.trim() || "Umum",
              title: jt,
              date,
              time: time.trim() || "23:59",
              prio,
              note: note.trim(),
              reminderMin,
            });
          } finally {
            savingRef.current = false;
            setSaving(false);
          }
          if (ok === false) return;
          setMatkul("");
          setTitle("");
          setNote("");
          setPrio("sedang");
          setTime("");
          setTitleErr("");
          setReminderMin(DEFAULT_REMINDER_MIN);
        }}
      >
        <label className="f" htmlFor="tMatkul">{t("task.fieldCourse")}</label>
        <input
          className="f"
          id="tMatkul"
          list="matkulListSheet"
          required
          maxLength={60}
          placeholder={t("task.coursePh")}
          value={matkul}
          onChange={(e) => setMatkul(e.target.value)}
        />
        <datalist id="matkulListSheet">
          {courses.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <label className="f" htmlFor="tTitle">{t("task.fieldTitle")}</label>
        <input
          className="f"
          id="tTitle"
          maxLength={100}
          placeholder={t("task.titlePh")}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleErr) setTitleErr("");
          }}
          aria-invalid={!!titleErr}
          aria-describedby={titleErr ? "tTitleErr" : undefined}
        />
        {titleErr && (
          <p id="tTitleErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5, marginTop: 4 }}>
            {titleErr}
          </p>
        )}
        <div className="frow">
          <div>
            <label className="f" htmlFor="tDate">{t("task.fieldDate")}</label>
            <input className="f" id="tDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="tTime">{t("task.fieldTime")}<span style={{ fontWeight: 500, color: "var(--muted)" }}>{t("common.optional")}</span></label>
            <input className="f" id="tTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-describedby="tTimeHint" />
          </div>
        </div>
        <p className="hint" id="tTimeHint" style={{ marginTop: 4 }}>{t("task.timeHint")}</p>
        <label className="f" htmlFor="tPrio">{t("task.fieldPrio")}</label>
        <select className="f" id="tPrio" value={prio} onChange={(e) => setPrio(e.target.value as Prio)}>
          <option value="tinggi">{prioLabel("tinggi", lang)}</option>
          <option value="sedang">{prioLabel("sedang", lang)}</option>
          <option value="rendah">{prioLabel("rendah", lang)}</option>
        </select>
        <label className="f" htmlFor="tNote">{t("task.fieldNote")}</label>
        <input className="f" id="tNote" maxLength={140} placeholder={t("task.notePh")} value={note} onChange={(e) => setNote(e.target.value)} />
        <label className="f">{t("reminder.title")}</label>
        <ReminderChips value={reminderMin} onChange={setReminderMin} idPrefix="tRem" />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            {t("common.close")}
          </button>
          <button type="submit" className="btn primary" disabled={saving} aria-busy={saving}>
            {saving ? t("task.saving") : editing ? t("task.saveChanges") : t("common.save")}
          </button>
        </div>
      </form>
    </Shell>
  );
}

interface NoteSheetProps {
  open: boolean;
  initial: Note | null;   // null = tambah; terisi = ubah
  t: (key: string) => string;
  onClose: () => void;
  /** return false = gagal, sheet tetap terbuka. */
  onSave: (v: { title: string; body: string }) => Promise<boolean | void> | boolean | void;
}

export function NoteSheet({ open, initial, t, onClose, onSave }: NoteSheetProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleErr, setTitleErr] = useState("");
  // Anti-spam simpan: ref sinkron validasi SEKARANG (state telat satu render).
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Mode edit: isi form dari data lama; mode tambah: reset field.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form default saat sheet dibuka
      setTitle(initial?.title ?? "");
      setBody(initial?.body ?? "");
      setTitleErr("");
      savingRef.current = false;
      setSaving(false);
    }
  }, [open, initial]);

  const editing = !!initial;

  return (
    <Shell id="ovNote" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconNote size={15} /></span>{editing ? t("notes.sheetEdit") : t("notes.sheetAdd")}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (savingRef.current) return;
          // Error inline (bukan diam): judul wajib.
          const jt = title.trim();
          if (!jt) {
            setTitleErr(t("notes.titleRequired"));
            return;
          }
          setTitleErr("");
          savingRef.current = true;
          setSaving(true);
          let ok: boolean | void = false;
          try {
            ok = await onSave({ title: jt, body: body.trim() });
          } finally {
            savingRef.current = false;
            setSaving(false);
          }
          // Form tetap utuh bila simpan gagal (false): jangan clear draf.
          if (ok === false) return;
          setTitle("");
          setBody("");
          setTitleErr("");
        }}
      >
        <label className="f" htmlFor="nTitle">{t("notes.fieldTitle")}</label>
        <input
          className="f"
          id="nTitle"
          maxLength={100}
          placeholder={t("notes.titlePh")}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleErr) setTitleErr("");
          }}
          aria-invalid={!!titleErr}
          aria-describedby={titleErr ? "nTitleErr" : undefined}
        />
        {titleErr && (
          <p id="nTitleErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5, marginTop: 4 }}>
            {titleErr}
          </p>
        )}
        <label className="f" htmlFor="nBody">{t("notes.fieldBody")}</label>
        <textarea
          className="f"
          id="nBody"
          rows={6}
          placeholder={t("notes.bodyPh")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            {t("common.close")}
          </button>
          <button type="submit" className="btn primary" disabled={saving} aria-busy={saving}>
            {saving ? t("notes.saving") : editing ? t("notes.saveChanges") : t("common.save")}
          </button>
        </div>
      </form>
    </Shell>
  );
}

export function RoutineSheet({
  open,
  mine,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  mine: Routine[];
  onClose: () => void;
  onSave: (v: { course: string; day: number; start: string; end: string; room: string; lect: string }) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const { lang, t } = useLang();
  const [course, setCourse] = useState("");
  const [day, setDay] = useState("1");
  const [room, setRoom] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:40");
  const [lect, setLect] = useState("");
  // Anti-spam tambah: onSave sinkron tapi spam-klik = 2 submit sebelum
  // state clear — tahan via ref satu tick + disabled tombol.
  const addingRef = useRef(false);
  const [adding, setAdding] = useState(false);

  return (
    <Shell id="ovRoutine" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconBook size={15} /></span>{t("routine.title")}</h2>
      <p className="hint">{t("routine.hint")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (addingRef.current) return;
          if (!course.trim()) return;
          addingRef.current = true;
          setAdding(true);
          onSave({
            course: course.trim(),
            day: Number(day),
            start: start || "09:00",
            end: end || "10:40",
            room: room.trim(),
            lect: lect.trim(),
          });
          setCourse("");
          setRoom("");
          setLect("");
          // Lepas di tick berikut: cukup tahan double-submit satu event-loop,
          // tanpa bikin tombol macet bila user tambah 2 rutin berurutan.
          setTimeout(() => {
            addingRef.current = false;
            setAdding(false);
          }, 0);
        }}
      >
        <label className="f" htmlFor="rCourse">{t("routine.fieldCourse")}</label>
        <input
          className="f"
          id="rCourse"
          required
          maxLength={60}
          placeholder={t("routine.coursePh")}
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        />
        <div className="frow">
          <div>
            <label className="f" htmlFor="rDay">{t("routine.fieldDay")}</label>
            <select className="f" id="rDay" value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="1">{dayNames(lang)[0]}</option>
              <option value="2">{dayNames(lang)[1]}</option>
              <option value="3">{dayNames(lang)[2]}</option>
              <option value="4">{dayNames(lang)[3]}</option>
              <option value="5">{dayNames(lang)[4]}</option>
              <option value="6">{dayNames(lang)[5]}</option>
              <option value="7">{dayNames(lang)[6]}</option>
            </select>
          </div>
          <div>
            <label className="f" htmlFor="rRoom">{t("routine.fieldRoom")}</label>
            <input className="f" id="rRoom" maxLength={30} placeholder={t("routine.roomPh")} value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
        </div>
        <div className="frow">
          <div>
            <label className="f" htmlFor="rStart">{t("routine.fieldStart")}</label>
            <input className="f" id="rStart" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="rEnd">{t("routine.fieldEnd")}</label>
            <input className="f" id="rEnd" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="rLect">{t("routine.fieldLect")}</label>
        <input className="f" id="rLect" maxLength={60} placeholder={t("routine.lectPh")} value={lect} onChange={(e) => setLect(e.target.value)} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={adding}>
            {t("common.close")}
          </button>
          <button type="submit" className="btn primary" disabled={adding} aria-busy={adding}>
            {adding ? t("routine.adding") : t("routine.add")}
          </button>
        </div>
      </form>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, margin: "10px 0 4px" }}>{t("routine.mineTitle")}{mine.length})</div>
        {mine.length ? (
          mine.map((r) => (
            <div className="row" key={r.id}>
              <span className="dot" style={{ background: r.color }} />
              <div>
                <div className="t">{r.course}</div>
                <div className="s">
                  {dayNames(lang)[r.day - 1] ?? ""} • {r.start}–{r.end}
                </div>
              </div>
              <button className="del" style={{ marginLeft: "auto" }} onClick={() => onDelete(r.id, r.course)}>
                {t("common.delete")}
              </button>
            </div>
          ))
        ) : (
          <div className="empty">{t("routine.emptyMine")}</div>
        )}
      </div>
    </Shell>
  );
}

/** Konfirmasi hapus generik: Batal (fokus awal) + Hapus danger. */
export interface PendingDelete {
  kind: "task" | "sched" | "routine" | "note";
  id: string;
  title: string;
}

/** Wizard Tambah Cepat 3 langkah: 1 Apa (ketik) → 2 Kapan (geser jam) → 3 Cek & Simpan.
 *  Simpan reuse callback lama persis (saveSched/saveTask/saveMail/Note) — tanpa logika simpan baru. */
export function QuickAddSheet({
  open,
  selDate,
  courses,
  initialKind,
  lockKind,
  onClose,
  onSaveTask,
  onSaveSched,
  onSaveMail,
  onSaveNote,
  onOpenDetail,
}: {
  open: boolean;
  selDate: string;
  courses: string[];
  /** Kind awal untuk entry kontekstual per-tab. Default "task". */
  initialKind?: QuickKind;
  /** Kunci ke satu jenis: chips disembunyikan + judul ikut jenis. */
  lockKind?: boolean;
  onClose: () => void;
  onSaveTask: (v: { matkul: string; title: string; date: string; time: string; prio: Prio; note: string; reminderMin?: number }) => Promise<boolean | void> | boolean | void;
  onSaveSched: (v: { title: string; date: string; time: string; endTime?: string; note: string; reminderMin?: number }) => Promise<boolean | void> | boolean | void;
  onSaveMail: (to: string, subj: string, body: string) => Promise<boolean | void> | boolean | void;
  onSaveNote: (v: { title: string; body: string }) => Promise<boolean | void> | boolean | void;
  onOpenDetail: (kind: QuickKind) => void;
}) {
  const { lang, t } = useLang();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<QuickKind>(initialKind ?? "task");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [matkul, setMatkul] = useState("");
  const [date, setDate] = useState(selDate);
  const [timeMins, setTimeMins] = useState(540);
  const [endTime, setEndTime] = useState("");
  const [prio, setPrio] = useState<Prio>("sedang");
  const [to, setTo] = useState("");
  const [reminderMin, setReminderMin] = useState(DEFAULT_REMINDER_MIN);
  const [titleErr, setTitleErr] = useState("");
  const [toErr, setToErr] = useState("");
  const [detailErr, setDetailErr] = useState("");
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset wizard tiap dibuka
      setStep(1);
      setKind(initialKind ?? "task");
      setTitle("");
      setDetail("");
      setMatkul("");
      setDate(selDate);
      setTimeMins(540);
      setEndTime("");
      setPrio("sedang");
      setTo("");
      setReminderMin(DEFAULT_REMINDER_MIN);
      setTitleErr("");
      setToErr("");
      setDetailErr("");
      savingRef.current = false;
      setSaving(false);
    }
  }, [open, selDate, initialKind]);

  if (!open) return null;
  const time = minutesToHHMM(timeMins);
  const needWhen = kind === "task" || kind === "sched";
  // Review (langkah 3) hanya untuk email — kirim bersifat irreversibel.
  // Tugas/jadwal/catatan lokal-first (bisa ubah/hapus) langsung simpan.
  const maxStep = kind === "mail" ? 3 : 2;
  const atFinal = step === maxStep || kind === "note";
  const titleOk = title.trim().length > 0;
  const toOk = kind !== "mail" || /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(to.trim());
  const lockedTitle =
    kind === "task"
      ? t("quick.titleTask")
      : kind === "sched"
        ? t("quick.titleSched")
        : kind === "mail"
          ? t("quick.titleMail")
          : t("quick.titleNote");

  const next = () => {
    if (step === 1) {
      if (!titleOk) {
        setTitleErr(t("quick.titleRequired"));
        return;
      }
      setTitleErr("");
      if (kind === "mail" && !toOk) {
        setToErr(t("mail.toInvalid"));
        return;
      }
      setToErr("");
      if (kind === "note" && !detail.trim()) {
        setDetailErr(t("quick.noteBodyRequired"));
        return;
      }
      setDetailErr("");
      // Catatan tak punya langkah Kapan — langsung simpan dari langkah 1.
      if (kind === "note") {
        void save();
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      // Hanya email yang lanjut ke review (langkah 3); sisanya simpan langsung.
      if (kind === "mail") {
        if (!detail.trim()) {
          setDetailErr(t("quick.bodyRequired"));
          return;
        }
        setDetailErr("");
        setStep(3);
        return;
      }
      setDetailErr("");
      void save();
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return;
    d.setDate(d.getDate() + days);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setDate(iso);
  };

  const save = async () => {
    if (savingRef.current) return;
    if (!titleOk) {
      setTitleErr(t("quick.titleRequired"));
      setStep(1);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    let ok: boolean | void = false;
    try {
      const jt = title.trim();
      if (kind === "task") {
        ok = await onSaveTask({ matkul: matkul.trim() || "Umum", title: jt, date, time: time || "23:59", prio, note: detail.trim(), reminderMin });
      } else if (kind === "sched") {
        const end = endTime.trim();
        ok = await onSaveSched({ title: jt, date, time: time || "09:00", ...(end && end !== time ? { endTime: end } : {}), note: detail.trim(), reminderMin });
      } else if (kind === "mail") {
        if (!toOk) {
          setToErr(t("mail.toInvalid"));
          setStep(1);
          return;
        }
        if (!detail.trim()) {
          setDetailErr(t("quick.bodyRequired"));
          setStep(2);
          return;
        }
        ok = await onSaveMail(to.trim(), jt, detail.trim());
      } else {
        if (!detail.trim()) {
          setDetailErr(t("quick.noteBodyRequired"));
          setStep(1);
          return;
        }
        ok = await onSaveNote({ title: jt, body: detail.trim() });
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    if (ok === false) return;
  };

  return (
    <Shell id="ovCepat" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconPlus size={15} /></span>{lockKind ? lockedTitle : t("quick.title")}</h2>
      <p className="hint">{step === 1 ? t("quick.step1") : step === 2 ? t("quick.step2") : t("quick.step3")} — {t("quick.hint")}</p>
      {step === 1 && (
        <div style={{ display: "grid", gap: 8 }}>
          {!lockKind && (
            <div className="chips" role="group" aria-label={t("quick.summaryKind")}>
              {(["task", "sched", "mail", "note"] as QuickKind[]).map((k) => (
                <button key={k} type="button" className={`chip${kind === k ? " on" : ""}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {t(k === "task" ? "tambah.task" : k === "sched" ? "tambah.sched" : k === "mail" ? "tambah.mail" : "tambah.note")}
                </button>
              ))}
            </div>
          )}
          {kind === "mail" ? (
            <>
              <label className="f" htmlFor="qTo">{t("quick.toLabel")}</label>
              <input
                className="f"
                id="qTo"
                type="email"
                required
                autoFocus
                placeholder={t("quick.toPh")}
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  if (toErr) setToErr("");
                }}
                aria-invalid={!!toErr}
                aria-describedby={toErr ? "qToErr" : undefined}
              />
              {toErr && (
                <p id="qToErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5 }}>
                  {toErr}
                </p>
              )}
              <label className="f" htmlFor="qTitle">{t("quick.subjLabel")}</label>
              <input
                className="f"
                id="qTitle"
                maxLength={100}
                placeholder={t("quick.subjPh")}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleErr) setTitleErr("");
                }}
                aria-invalid={!!titleErr}
                aria-describedby={titleErr ? "qTitleErr" : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    next();
                  }
                }}
              />
              {titleErr && (
                <p id="qTitleErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5 }}>
                  {titleErr}
                </p>
              )}
            </>
          ) : (
            <>
              <label className="f" htmlFor="qTitle">{t("quick.step1")}</label>
              <input
                className="f"
                id="qTitle"
                maxLength={100}
                autoFocus
                placeholder={kind === "sched" ? t("quick.whatSchedPh") : kind === "note" ? t("quick.whatNotePh") : t("quick.whatPh")}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleErr) setTitleErr("");
                }}
                aria-invalid={!!titleErr}
                aria-describedby={titleErr ? "qTitleErr" : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    next();
                  }
                }}
              />
              {titleErr && (
                <p id="qTitleErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5 }}>
                  {titleErr}
                </p>
              )}
              {kind === "task" && (
                <>
                  <label className="f" htmlFor="qMatkul">{t("task.fieldCourse")}</label>
                  <input className="f" id="qMatkul" list="matkulListQuick" maxLength={60} placeholder={t("task.coursePh")} value={matkul} onChange={(e) => setMatkul(e.target.value)} />
                  <datalist id="matkulListQuick">
                    {courses.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
              <label className="f" htmlFor="qDetail">
                {t("notes.fieldBody")}
                {kind !== "note" && <span style={{ fontWeight: 500, color: "var(--muted)" }}>{t("common.optional")}</span>}
              </label>
              <textarea
                className="f"
                id="qDetail"
                rows={kind === "note" ? 4 : 3}
                placeholder={t("quick.detailPh")}
                value={detail}
                onChange={(e) => {
                  setDetail(e.target.value);
                  if (detailErr) setDetailErr("");
                }}
                aria-invalid={!!detailErr}
                aria-describedby={detailErr ? "qDetailErr" : undefined}
              />
              {detailErr && (
                <p id="qDetailErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5 }}>
                  {detailErr}
                </p>
              )}
            </>
          )}
        </div>
      )}
      {step === 2 && needWhen && (
        <div style={{ display: "grid", gap: 8 }}>
          <label className="f" htmlFor="qDate">{t("quick.dateLabel")}</label>
          <input className="f" id="qDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="f" htmlFor="qTime">{t("quick.timeLabel")} — <strong>{time}</strong></label>
          <input
            className="f"
            id="qTime"
            type="range"
            min={0}
            max={1425}
            step={15}
            value={timeMins}
            onChange={(e) => setTimeMins(Number(e.target.value))}
            aria-valuetext={time}
          />
          <div className="chips">
            <button type="button" className="chip" onClick={() => setTimeMins(420)}>{t("quick.presetMorning")} 07:00</button>
            <button type="button" className="chip" onClick={() => setTimeMins(780)}>{t("quick.presetNoon")} 13:00</button>
            <button type="button" className="chip" onClick={() => setTimeMins(1140)}>{t("quick.presetNight")} 19:00</button>
            <button type="button" className="chip" onClick={() => shiftDate(1)}>{t("quick.presetTomorrow")}</button>
          </div>
          {kind === "task" && (
            <>
              <label className="f">{t("task.fieldPrio")}</label>
              <div className="chips" role="group" aria-label={t("task.fieldPrio")}>
                {(["tinggi", "sedang", "rendah"] as Prio[]).map((p) => (
                  <button key={p} type="button" id={`qPrio-${p}`} className={`chip${prio === p ? " on" : ""}`} aria-pressed={prio === p} onClick={() => setPrio(p)}>
                    {prioLabel(p, lang)}
                  </button>
                ))}
              </div>
            </>
          )}
          {kind === "sched" && (
            <>
              <label className="f" htmlFor="qEnd">{t("quick.endLabel")}</label>
              <input className="f" id="qEnd" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </>
          )}
          <label className="f">{t("reminder.title")}</label>
          <ReminderChips value={reminderMin} onChange={setReminderMin} idPrefix="qRem" />
        </div>
      )}
      {step === 2 && kind === "mail" && (
        <div style={{ display: "grid", gap: 8 }}>
          <label className="f" htmlFor="qBody">{t("notes.fieldBody")}</label>
          <textarea
            className="f"
            id="qBody"
            rows={6}
            autoFocus
            placeholder={t("quick.bodyPhMail")}
            value={detail}
            onChange={(e) => {
              setDetail(e.target.value);
              if (detailErr) setDetailErr("");
            }}
            aria-invalid={!!detailErr}
            aria-describedby={detailErr ? "qBodyErr" : undefined}
          />
          {detailErr && (
            <p id="qBodyErr" role="alert" style={{ color: "var(--red)", fontSize: 12.5 }}>
              {detailErr}
            </p>
          )}
        </div>
      )}
      {step === 3 && (
        <div style={{ display: "grid", gap: 6, fontSize: 13.5, lineHeight: 1.6 }}>
          <div><strong>{t("quick.summaryKind")}:</strong> {t(kind === "task" ? "tambah.task" : kind === "sched" ? "tambah.sched" : kind === "mail" ? "tambah.mail" : "tambah.note")}</div>
          <div><strong>{kind === "mail" ? t("quick.subjLabel") : t("notes.fieldTitle")}:</strong> {title.trim()}</div>
          {needWhen && (
            <div><strong>{t("quick.dateLabel")}:</strong> {date} • {time}{kind === "sched" && endTime.trim() ? `–${endTime.trim()}` : ""}</div>
          )}
          {kind === "task" && (
            <div><strong>{t("task.fieldPrio")}:</strong> {prioLabel(prio, lang)}</div>
          )}
          {kind === "mail" && (
            <div><strong>{t("quick.toLabel")}:</strong> {to.trim()}</div>
          )}
          {detail.trim() && (
            <div style={{ color: "var(--muted)" }}>{detail.trim().slice(0, 140)}</div>
          )}
          <button
            type="button"
            onClick={() => onOpenDetail(kind)}
            style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 13, padding: "6px 0", cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
          >
            {t("quick.detailLink")} →
          </button>
        </div>
      )}
      {kind !== "mail" && atFinal && (
        <button
          type="button"
          onClick={() => onOpenDetail(kind)}
          style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 13, padding: "2px 0 8px", cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
        >
          {t("quick.detailLink")} →
        </button>
      )}
      <div className="actions">
        {step > 1 ? (
          <button type="button" className="btn ghost" onClick={() => setStep((s) => ((s - 1) as 1 | 2 | 3))} disabled={saving}>
            {t("quick.back")}
          </button>
        ) : (
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            {t("common.close")}
          </button>
        )}
        {atFinal ? (
          <button type="button" className="btn primary" onClick={save} disabled={saving || !titleOk} aria-busy={saving}>
            {saving ? t("task.saving") : t("common.save")}
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={next} disabled={!titleOk}>
            {t("quick.next")}
          </button>
        )}
      </div>
    </Shell>
  );
}

export function ConfirmSheet({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingDelete | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLang();
  if (!pending) return null;
  return (
    <Shell id="ovConfirm" open onClose={onCancel}>
      <h2>{t("confirm.title")}</h2>
      <p className="hint">{t("confirm.desc").replace("{title}", pending.title)}</p>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel} autoFocus>
          {t("common.cancel")}
        </button>
        <button type="button" className="btn danger" onClick={onConfirm}>
          {t("common.delete")}
        </button>
      </div>
    </Shell>
  );
}
