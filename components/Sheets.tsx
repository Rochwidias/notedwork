"use client";

import { useEffect, useState } from "react";
import type { ComposePreset, Prio, Routine, Sched } from "@/lib/types";
import { IconBook, IconForward, IconMail, IconPlus, IconReply, IconTask } from "./icons";
import { LEGAL, type LegalId } from "@/lib/legal";

export type SheetId = "sched" | "mail" | "task" | "routine" | "tambah" | null;
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
      <div className="actions">
        <span />
        <button type="button" className="btn primary" onClick={onClose}>
          Tutup
        </button>
      </div>
    </Shell>
  );
}

export const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Mati" },
  { value: 5, label: "5 mnt" },
  { value: 15, label: "15 mnt" },
  { value: 30, label: "30 mnt" },
  { value: 60, label: "60 mnt" },
];

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
  return (
    <div className="chips" role="group" aria-label="Pengingat" style={{ paddingBottom: 4 }}>
      {REMINDER_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          id={`${idPrefix}-${o.value}`}
          className={`chip${value === o.value ? " on" : ""}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
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
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selDate);
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [reminderMin, setReminderMin] = useState(15);

  useEffect(() => {
    if (open) {
      // Mode edit: isi form dari data lama; mode tambah: default tanggal dipilih.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form default saat sheet dibuka
      setTitle(initial?.title ?? "");
      setDate(initial?.date ?? selDate);
      setTime(initial?.time ?? "09:00");
      setEndTime(initial?.endTime ?? "");
      setNote(initial?.note ?? "");
      setReminderMin(initial?.reminderMin ?? 15);
    }
  }, [open, selDate, initial]);

  const editing = !!initial;

  return (
    <Shell id="ovSched" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconPlus size={15} /></span>{editing ? "Ubah Jadwal" : "Tambah Jadwal"}</h2>
      <p className="hint">Agenda sekali saja. Untuk matkul tiap minggu, pakai jadwal rutin.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const t = time || "09:00";
          const end = endTime.trim();
          // end<=start = lintas-hari (lewat tengah malam, besok): diterima, bukan ditolak.
          if (end && !/^\d{2}:\d{2}$/.test(end)) return;
          const ok = await onSave({
            title: title.trim(),
            date,
            time: t,
            ...(end ? { endTime: end } : {}),
            note: note.trim(),
            reminderMin,
          });
          // Form tetap utuh bila simpan gagal (false): jangan clear draf.
          if (ok === false) return;
          setTitle("");
          setNote("");
          setTime("09:00");
          setEndTime("");
          setReminderMin(15);
        }}
      >
        <label className="f" htmlFor="fTitle">Judul</label>
        <input
          className="f"
          id="fTitle"
          required
          maxLength={80}
          placeholder="cth: Seminar proposal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="frow">
          <div>
            <label className="f" htmlFor="fDate">Tanggal</label>
            <input className="f" id="fDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="fTime">Jam mulai</label>
            <input className="f" id="fTime" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="fEnd">Jam selesai <span style={{ fontWeight: 500, color: "var(--muted)" }}>(opsional)</span></label>
        <input
          className="f"
          id="fEnd"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        <p className="hint" style={{ marginTop: 4 }}>Kosongkan bila sekilas. Jam selesai lebih kecil = lewat tengah malam (besok).</p>
        <label className="f">Pengingat</label>
        <ReminderChips value={reminderMin} onChange={setReminderMin} idPrefix="sRem" />
        <label className="f" htmlFor="fNote">Keterangan</label>
        <input className="f" id="fNote" placeholder="Ruang, dosen, link meeting…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Tutup
          </button>
          <button type="submit" className="btn primary">
            {editing ? "Simpan perubahan" : "Simpan"}
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
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kind: "mail" | "task" | "sched") => void;
}) {
  const pick = (kind: "mail" | "task" | "sched", label: string) => ({
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
      <h2><span className="h-ic"><IconPlus size={15} /></span>Tambah Baru</h2>
      <p className="hint">Pilih yang mau dibuat.</p>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <div className="row" style={{ cursor: "pointer" }} {...pick("mail", "Tulis email baru")}>
          <span className="h-ic"><IconMail size={18} /></span>
          <div>
            <div className="t">Tulis Email</div>
            <div className="s">Terkirim via Gmail</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("task", "Tambah tugas baru")}>
          <span className="h-ic"><IconTask size={18} /></span>
          <div>
            <div className="t">Tambah Tugas</div>
            <div className="s">Deadline muncul di Kalender</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
        <div className="row" style={{ cursor: "pointer" }} {...pick("sched", "Tambah jadwal baru")}>
          <span className="h-ic"><IconPlus size={18} /></span>
          <div>
            <div className="t">Tambah Jadwal</div>
            <div className="s">Agenda sekali saja</div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--muted)", fontWeight: 800, marginLeft: "auto" }}>›</span>
        </div>
      </div>
      <div className="actions">
        <span />
        <button type="button" className="btn ghost" onClick={onClose}>
          Tutup
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

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- isi form dari preset saat sheet dibuka
      setTo(preset?.to ?? "");
      setSubj(preset?.subj ?? "");
      setBody(preset?.body ?? "");
      setToErr("");
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
          if (sending) return;
          const dest = to.trim();
          if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(dest)) {
            setToErr("Format email tujuan tidak valid");
            return;
          }
          setToErr("");
          setSending(true);
          // Draf dipertahankan bila kirim gagal (return false): jangan clear.
          const ok = await onSave(dest, subj, body);
          setSending(false);
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
  onClose,
  onSave,
}: {
  open: boolean;
  selDate: string;
  courses: string[];
  onClose: () => void;
  onSave: (v: { matkul: string; title: string; date: string; time: string; prio: Prio; note: string; reminderMin?: number }) => Promise<boolean | void> | boolean | void;
}) {
  const [matkul, setMatkul] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selDate);
  const [time, setTime] = useState("23:59");
  const [prio, setPrio] = useState<Prio>("sedang");
  const [note, setNote] = useState("");
  const [reminderMin, setReminderMin] = useState(15);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset SEMUA field saat sheet dibuka
      setMatkul("");
      setTitle("");
      setDate(selDate);
      setTime("23:59");
      setPrio("sedang");
      setNote("");
      setReminderMin(15);
    }
  }, [open, selDate]);

  return (
    <Shell id="ovTask" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconTask size={15} /></span>Tambah Tugas</h2>
      <p className="hint">Deadline otomatis muncul di Kalender &amp; Dashboard.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const ok = await onSave({
            matkul: matkul.trim() || "Umum",
            title: title.trim(),
            date,
            time: time || "23:59",
            prio,
            note: note.trim(),
            reminderMin,
          });
          if (ok === false) return;
          setMatkul("");
          setTitle("");
          setNote("");
          setPrio("sedang");
          setTime("23:59");
          setReminderMin(15);
        }}
      >
        <label className="f" htmlFor="tMatkul">Mata kuliah</label>
        <input
          className="f"
          id="tMatkul"
          list="matkulListSheet"
          required
          maxLength={60}
          placeholder="cth: Basis Data"
          value={matkul}
          onChange={(e) => setMatkul(e.target.value)}
        />
        <datalist id="matkulListSheet">
          {courses.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <label className="f" htmlFor="tTitle">Judul tugas</label>
        <input
          className="f"
          id="tTitle"
          required
          maxLength={100}
          placeholder="cth: Laporan modul 6"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="frow">
          <div>
            <label className="f" htmlFor="tDate">Deadline tanggal</label>
            <input className="f" id="tDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="tTime">Jam</label>
            <input className="f" id="tTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="tPrio">Prioritas</label>
        <select className="f" id="tPrio" value={prio} onChange={(e) => setPrio(e.target.value as Prio)}>
          <option value="tinggi">Tinggi</option>
          <option value="sedang">Sedang</option>
          <option value="rendah">Rendah</option>
        </select>
        <label className="f" htmlFor="tNote">Catatan</label>
        <input className="f" id="tNote" maxLength={140} placeholder="Cara kumpul, link, dsb…" value={note} onChange={(e) => setNote(e.target.value)} />
        <label className="f">Pengingat</label>
        <ReminderChips value={reminderMin} onChange={setReminderMin} idPrefix="tRem" />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Tutup
          </button>
          <button type="submit" className="btn primary">
            Simpan
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

  const dayName = (d: number) => ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][d - 1] ?? "";

  return (
    <Shell id="ovRoutine" open={open} onClose={onClose}>
      <h2><span className="h-ic"><IconBook size={15} /></span>Kelola Jadwal Rutin</h2>
      <p className="hint">Matkul tetap tiap minggu — otomatis muncul di Kalender.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!course.trim()) return;
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
          <button type="button" className="btn ghost" onClick={onClose}>
            Tutup
          </button>
          <button type="submit" className="btn primary">
            Tambah
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
