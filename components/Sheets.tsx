"use client";

import { useEffect, useState } from "react";
import type { ComposePreset, Prio, Routine } from "@/lib/types";

export type SheetId = "sched" | "mail" | "task" | "routine" | null;

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
  return (
    <div className={`overlay${open ? " open" : ""}`} id={id} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function SchedSheet({
  open,
  selDate,
  onClose,
  onSave,
}: {
  open: boolean;
  selDate: string;
  onClose: () => void;
  onSave: (v: { title: string; date: string; time: string; note: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selDate);
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form default saat sheet dibuka
      setDate(selDate);
    }
  }, [open, selDate]);

  return (
    <Shell id="ovSched" open={open} onClose={onClose}>
      <h2>➕ Tambah Jadwal</h2>
      <p className="hint">Agenda sekali saja. Untuk matkul tiap minggu, pakai jadwal rutin.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSave({ title: title.trim(), date, time: time || "09:00", note: note.trim() });
          setTitle("");
          setNote("");
          setTime("09:00");
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
            <label className="f" htmlFor="fTime">Jam</label>
            <input className="f" id="fTime" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="fNote">Keterangan</label>
        <input className="f" id="fNote" placeholder="Ruang, dosen, link meeting…" value={note} onChange={(e) => setNote(e.target.value)} />
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

export function MailSheet({
  open,
  preset,
  onClose,
  onSave,
}: {
  open: boolean;
  preset: ComposePreset | null;
  onClose: () => void;
  onSave: (to: string, subj: string, body: string) => void;
}) {
  const [to, setTo] = useState("");
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- isi form dari preset saat sheet dibuka
      setTo(preset?.to ?? "");
      setSubj(preset?.subj ?? "");
      setBody(preset?.body ?? "");
    }
  }, [open, preset]);

  const isReply = !!preset?.to;
  return (
    <Shell id="ovMail" open={open} onClose={onClose}>
      <h2>{preset ? (isReply ? "↩️ Balas Email" : "➡️ Teruskan Email") : "✉️ Tulis Email"}</h2>
      <p className="hint">Contoh saja — tersimpan sebagai konsep di perangkat.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(to, subj, body);
          setTo("");
          setSubj("");
          setBody("");
        }}
      >
        <label className="f" htmlFor="mTo">Kepada</label>
        <input className="f" id="mTo" type="email" required placeholder="dosen@univ.ac.id" value={to} onChange={(e) => setTo(e.target.value)} />
        <label className="f" htmlFor="mSubj">Subjek</label>
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
        <textarea className="f" id="mBody" required placeholder="Tulis pesan…" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Tutup
          </button>
          <button type="submit" className="btn primary">
            Kirim (contoh)
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
  onSave: (v: { matkul: string; title: string; date: string; time: string; prio: Prio; note: string }) => void;
}) {
  const [matkul, setMatkul] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selDate);
  const [time, setTime] = useState("23:59");
  const [prio, setPrio] = useState<Prio>("sedang");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form default saat sheet dibuka
      setDate(selDate);
    }
  }, [open, selDate]);

  return (
    <Shell id="ovTask" open={open} onClose={onClose}>
      <h2>📝 Tambah Tugas</h2>
      <p className="hint">Deadline otomatis muncul di Kalender &amp; Dashboard.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSave({
            matkul: matkul.trim() || "Umum",
            title: title.trim(),
            date,
            time: time || "23:59",
            prio,
            note: note.trim(),
          });
          setMatkul("");
          setTitle("");
          setNote("");
          setPrio("sedang");
          setTime("23:59");
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
          <option value="tinggi">🔴 Tinggi</option>
          <option value="sedang">🟡 Sedang</option>
          <option value="rendah">🟢 Rendah</option>
        </select>
        <label className="f" htmlFor="tNote">Catatan</label>
        <input className="f" id="tNote" maxLength={140} placeholder="Cara kumpul, link, dsb…" value={note} onChange={(e) => setNote(e.target.value)} />
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
      <h2>📚 Kelola Jadwal Rutin</h2>
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
          <div className="empty">Belum ada — tambah lewat form di atas 👆</div>
        )}
      </div>
    </Shell>
  );
}
