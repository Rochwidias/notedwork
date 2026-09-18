"use client";

import { useEffect, useRef, useState } from "react";
import type { ComposePreset, Note, Prio, Routine, Sched, Task } from "@/lib/types";
import { IconBook, IconForward, IconMail, IconNote, IconPlus, IconReply, IconTask } from "./icons";
import { LEGAL, type LegalId } from "@/lib/legal";
import { prioLabel } from "@/lib/dates";
import { useLang } from "./LangProvider";

export type SheetId = "sched" | "mail" | "task" | "routine" | "note" | "tambah" | null;
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
  if (id == null) return null;
  const doc = LEGAL[id];
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
          Tutup
        </button>
      </div>
    </Shell>
  );
}

export const REMINDER_VALUES = [0, 5, 15, 30, 60];

/** Pemilih pengingat chips [Mati,5,15,30,60 mnt] — dipakai SchedSheet + TaskSheet. */
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
          {v === 0 ? t("reminder.off") : `${v}${t("reminder.min")}`}
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
  const [reminderMin, setReminderMin] = useState(15);
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
          setReminderMin(15);
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
        <div className="row" style={{ cursor: "pointer" }} {...pick("mail", "Tulis email baru")}>
          <span className="h-ic"><IconMail size={18} /></span>
          <div>
            <div className="t">{t("tambah.mail")}</div>
            <div className="s">{t("tambah.mailSub")}</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("task", "Tambah tugas baru")}>
          <span className="h-ic"><IconTask size={18} /></span>
          <div>
            <div className="t">{t("tambah.task")}</div>
            <div className="s">{t("tambah.taskSub")}</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("sched", "Tambah jadwal baru")}>
          <span className="h-ic"><IconPlus size={18} /></span>
          <div>
            <div className="t">{t("tambah.sched")}</div>
            <div className="s">{t("tambah.schedSub")}</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("note", "Tambah catatan baru")}>
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
      ? { icon: <IconReply size={15} />, title: "Balas Email" }
      : effMode === "teruskan"
        ? { icon: <IconForward size={15} />, title: "Teruskan Email" }
        : { icon: <IconMail size={15} />, title: "Tulis Email" };
  return (
    <Shell id="ovMail" open={open} onClose={onClose}>
      <h2><span className="h-ic">{head.icon}</span>{head.title}</h2>
      <p className="hint">Terkirim langsung via Gmail.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (sendingRef.current) return;
          const dest = to.trim();
          if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(dest)) {
            setToErr("Format email tujuan tidak valid");
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
        <label className="f" htmlFor="mTo">Kepada</label>
        <input
          className="f"
          id="mTo"
          type="email"
          required
          placeholder="dosen@univ.ac.id"
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
          Subjek <span style={{ fontWeight: 500, color: "var(--muted)", float: "right" }}>{subj.length}/100</span>
        </label>
        <input
          className="f"
          id="mSubj"
          required
          maxLength={100}
          placeholder="Izin / konsultasi / tugas…"
          value={subj}
          onChange={(e) => setSubj(e.target.value)}
        />
        <label className="f" htmlFor="mBody">Isi</label>
        <textarea
          className="f compose-body"
          id="mBody"
          required
          rows={7}
          placeholder="Tulis pesan…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={sending}>
            Tutup
          </button>
          <button type="submit" className="btn primary" disabled={sending} aria-busy={sending}>
            {sending ? "Mengirim…" : "Kirim"}
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
  const [reminderMin, setReminderMin] = useState(15);
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
          setReminderMin(15);
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
  onDelete: (id: string) => void;
}) {
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

  const dayName = (d: number) => ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][d - 1] ?? "";

  return (
    <Shell id="ovRoutine" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconBook size={15} /></span>Kelola Jadwal Rutin</h2>
      <p className="hint">Matkul tetap tiap minggu — otomatis muncul di Kalender.</p>
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
        <label className="f" htmlFor="rCourse">Mata kuliah</label>
        <input
          className="f"
          id="rCourse"
          required
          maxLength={60}
          placeholder="cth: Sistem Operasi"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        />
        <div className="frow">
          <div>
            <label className="f" htmlFor="rDay">Hari</label>
            <select className="f" id="rDay" value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="1">Senin</option>
              <option value="2">Selasa</option>
              <option value="3">Rabu</option>
              <option value="4">Kamis</option>
              <option value="5">Jumat</option>
              <option value="6">Sabtu</option>
              <option value="7">Minggu</option>
            </select>
          </div>
          <div>
            <label className="f" htmlFor="rRoom">Ruang</label>
            <input className="f" id="rRoom" maxLength={30} placeholder="cth: 2A" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
        </div>
        <div className="frow">
          <div>
            <label className="f" htmlFor="rStart">Mulai</label>
            <input className="f" id="rStart" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="rEnd">Selesai</label>
            <input className="f" id="rEnd" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="rLect">Dosen</label>
        <input className="f" id="rLect" maxLength={60} placeholder="cth: Pak Andi" value={lect} onChange={(e) => setLect(e.target.value)} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={adding}>
            Tutup
          </button>
          <button type="submit" className="btn primary" disabled={adding} aria-busy={adding}>
            {adding ? "Menambah…" : "Tambah"}
          </button>
        </div>
      </form>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, margin: "10px 0 4px" }}>Jadwal buatanmu ({mine.length})</div>
        {mine.length ? (
          mine.map((r) => (
            <div className="row" key={r.id}>
              <span className="dot" style={{ background: r.color }} />
              <div>
                <div className="t">{r.course}</div>
                <div className="s">
                  {dayName(r.day)} • {r.start}–{r.end}
                </div>
              </div>
              <button className="del" style={{ marginLeft: "auto" }} onClick={() => onDelete(r.id)}>
                Hapus
              </button>
            </div>
          ))
        ) : (
          <div className="empty">Belum ada — tambah lewat form di atas.</div>
        )}
      </div>
    </Shell>
  );
}
