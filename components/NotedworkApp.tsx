"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposePreset, Mail, NavTarget, Routine, Sched, Task, ViewName } from "@/lib/types";
import { GUEST_NAME_KEY, GUEST_SUFFIX, LS, migrateRochaKeys } from "@/lib/data";
import { RCOL, todayStr } from "@/lib/dates";
import { PREVIEW_LOGIN_HINT, sampleRoutines, sampleScheds, sampleTasks, SAMPLE_MAILS } from "@/lib/preview";
import { removeLS, useLocalStorage } from "@/lib/store";
import ThemeProvider from "./ThemeProvider";
import TopBar from "./TopBar";
import { Fab, Sidebar, TabBar } from "./AppNav";
import { IconEye } from "./icons";
import Dashboard from "./Dashboard";
import EmailView from "./EmailView";
import TasksView from "./TasksView";
import CalendarView from "./CalendarView";
import ProfileView from "./ProfileView";
import GoogleConnect from "./GoogleConnect";
import { MailSheet, RoutineSheet, SchedSheet, TaskSheet, type SheetId } from "./Sheets";
import {
  NOT_CONNECTED,
  apiCreateEvent,
  apiDeleteEvent,
  apiGetMail,
  apiLabelMail,
  apiListEvents,
  apiListMails,
  apiLogout,
  apiSendMail,
  apiStatus,
  apiUpdateEvent,
} from "@/lib/remote";

export default function NotedworkApp() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}

function Shell() {
  const [view, setView] = useState<ViewName>("dashboard");
  const [sheet, setSheet] = useState<SheetId>(null);
  const [compose, setCompose] = useState<ComposePreset | null>(null);
  const [toast, setToastMsg] = useState("");
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastMsg = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(""), 2200);
  }, []);

  /* ---- koneksi Google ---- */
  const [connected, setConnected] = useState(false);
  const [connEmail, setConnEmail] = useState<string | null>(null);
  const preview = !connected;
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [remoteMails, setRemoteMails] = useState<Mail[]>([]);
  const [mailPage, setMailPage] = useState<string | null>(null);
  const [mailLoading, setMailLoading] = useState(false);
  const [remoteEvents, setRemoteEvents] = useState<Sched[]>([]);
  // Mail preview: state lokal agar buka/bintang/baca jalan in-memory tanpa API.
  const [previewMails, setPreviewMails] = useState<Mail[]>(() => SAMPLE_MAILS);

  // Tugas & rutin: per email saat login, kunci :preview saat tamu (terisolasi & persist lokal).
  // Seed [] — sampel preview diisi sekali via efek di bawah (hanya bila kunci tamu belum ada),
  // agar akun login baru tidak ikut dapat sampel.
  const userSuffix = connected && connEmail ? `:${connEmail.toLowerCase()}` : GUEST_SUFFIX;
  const [tasks, setTasks] = useLocalStorage<Task[]>(`${LS.tasks}${userSuffix}`, []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>(`${LS.routine}${userSuffix}`, []);
  const [notif, setNotif] = useLocalStorage<boolean>(LS.notif, true);
  const [guestName, setGuestName] = useLocalStorage<string>(GUEST_NAME_KEY, "Tamu");

  // Seed sampel preview sekali: tamu segar lihat contoh, tamu kembali pertahankan editannya.
  useEffect(() => {
    try {
      if (localStorage.getItem(`${LS.tasks}${GUEST_SUFFIX}`) == null) setTasks(sampleTasks());
      if (localStorage.getItem(`${LS.routine}${GUEST_SUFFIX}`) == null) setRoutines(sampleRoutines());
    } catch {
      /* abaikan: mode privat */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  const [currentMail, setCurrentMail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selDate, setSelDate] = useState<string>(() => todayStr());

  // Jadwal yang sedang diedit (null = mode tambah). Sheet dibuka via onEditSched.
  // Dideklarasikan sebelum markDisconnected agar reset saat putus koneksi.
  const [editingSched, setEditingSched] = useState<Sched | null>(null);

  const markDisconnected = useCallback(() => {
    setConnected(false);
    setConnEmail(null);
    setRemoteMails([]);
    setMailPage(null);
    setRemoteEvents([]);
    setCurrentMail(null);
    setEditingSched(null);
  }, []);

  const nowHMID = useCallback(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, []);

  const refreshRemote = useCallback(
    async (opts?: { mails?: boolean; events?: boolean; query?: string; append?: boolean }) => {
      const wantMails = opts?.mails ?? true;
      const wantEvents = opts?.events ?? true;
      try {
        if (wantMails) {
          setMailLoading(true);
          const { mails, nextPageToken } = await apiListMails(
            opts?.query ?? "",
            opts?.append ? (mailPage ?? undefined) : undefined
          );
          setRemoteMails((prev) => (opts?.append ? [...prev, ...mails] : mails));
          setMailPage(nextPageToken);
        }
        if (wantEvents) {
          const from = new Date();
          from.setMonth(from.getMonth() - 1);
          const to = new Date();
          to.setMonth(to.getMonth() + 2);
          const iso = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          setRemoteEvents(await apiListEvents(iso(from), iso(to)));
        }
        setUpdatedAt(nowHMID());
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("Gagal sync Google");
      } finally {
        setMailLoading(false);
      }
    },
    [mailPage, markDisconnected, nowHMID, toastMsg]
  );

  // Migrasi kunci lama rocha.* → notedwork.* (sekali per browser) + hasil login OAuth.
  useEffect(() => {
    migrateRochaKeys();
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const auth = q.get("auth");
    if (auth === "ok" || auth === "gagal") {
      // Tunda ke microtask agar bukan setState sinkron di dalam effect.
      const msg = auth === "ok" ? "Terhubung ke Google" : "Login Google gagal, coba lagi";
      queueMicrotask(() => toastMsg(msg));
      q.delete("auth");
      q.delete("pesan");
      const rest = q.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  useEffect(() => {
    let alive = true;
    apiStatus()
      .then((s) => {
        if (!alive) return;
        if (s.connected) {
          setConnected(true);
          setConnEmail(s.email ?? null);
          refreshRemote();
        }
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cek status sekali saat mount
  }, []);

  useEffect(() => {
    return () => {
      if (toastT.current) clearTimeout(toastT.current);
    };
  }, []);

  // Data tampil: Gmail/Calendar asli saat login, contoh statis saat preview.
  const mails = connected ? remoteMails : previewMails;
  const previewScheds = useMemo(() => sampleScheds(), []);
  const schedules = useMemo(
    () =>
      connected
        ? remoteEvents.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        : previewScheds.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [connected, remoteEvents, previewScheds]
  );

  const go = useCallback(
    (v: NavTarget) => {
      if (v === "tambah") {
        // Tamu preview: arahkan ke sheet tugas lokal (ramah tamu, tanpa login).
        setSheet(connected ? "sched" : "task");
        return;
      }
      setView(v);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [connected]
  );

  const openCompose = useCallback(
    (p?: ComposePreset) => {
      if (!connected) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      setCompose(p ?? null);
      setSheet("mail");
    },
    [connected, toastMsg]
  );

  /* ---- email: Gmail asli saat login, contoh lokal saat preview ---- */
  const openMail = useCallback(
    async (id: string) => {
      if (!connected) {
        // Preview: buka dari state lokal + tandai dibaca in-memory, tanpa API.
        setCurrentMail(id);
        setPreviewMails((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)));
        return;
      }
      setCurrentMail(id);
      // Tandai dibaca di Gmail + ambil isi penuh.
      try {
        await apiLabelMail(id, "read");
      } catch {
        /* abaikan: tetap tampilkan */
      }
      setRemoteMails((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)));
      try {
        const full = await apiGetMail(id);
        setRemoteMails((prev) => prev.map((m) => (m.id === id ? { ...full, unread: false } : m)));
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
      }
    },
    [connected, markDisconnected]
  );

  const toggleStar = useCallback(
    async (id: string) => {
      if (!connected) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      const isStar = !!remoteMails.find((m) => m.id === id)?.starred;
      try {
        await apiLabelMail(id, isStar ? "unstar" : "star");
        setRemoteMails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !isStar } : m)));
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("Gagal ubah bintang");
      }
    },
    [connected, remoteMails, markDisconnected, toastMsg]
  );

  const mailAction = useCallback(
    async (act: string) => {
      if (!connected) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      const m = remoteMails.find((x) => x.id === currentMail);
      if (!m) return;
      const stripRe = (s: string) => s.replace(/^re:\s+/i, "");
      try {
        if (act === "reply") {
          openCompose({
            to: m.email,
            subj: "Re: " + stripRe(m.subj),
            body: `\n\n— — —\nPada ${m.time}, ${m.from} menulis:\n${m.body}`,
          });
        } else if (act === "fwd") {
          openCompose({
            to: "",
            subj: "Fwd: " + stripRe(m.subj).replace(/^fwd:\s+/i, ""),
            body: `\n\n— Diteruskan dari ${m.from} <${m.email}> —\n${m.body}`,
          });
        } else if (act === "star") {
          await toggleStar(m.id);
        } else if (act === "arch") {
          await apiLabelMail(m.id, "archive");
          setRemoteMails((prev) => prev.filter((x) => x.id !== m.id));
          setCurrentMail(null);
          toastMsg("Diarsipkan");
        } else if (act === "unread") {
          await apiLabelMail(m.id, "unread");
          setRemoteMails((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: true } : x)));
          setCurrentMail(null);
          toastMsg("Ditandai belum dibaca");
        } else if (act === "del") {
          // Tanpa hapus permanen — tombol hapus = arsip.
          await apiLabelMail(m.id, "archive");
          setRemoteMails((prev) => prev.filter((x) => x.id !== m.id));
          setCurrentMail(null);
          toastMsg("Diarsipkan");
        }
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("Aksi Gmail gagal");
      }
    },
    [currentMail, remoteMails, connected, openCompose, toggleStar, toastMsg, markDisconnected]
  );

  /* ---- tugas (milik sendiri, mulai kosong) ---- */
  const toggleTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const t = prev.find((x) => x.id === id);
        if (t) toastMsg(t.done ? "Dibuka lagi" : "Tugas selesai!");
        return prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
      });
    },
    [setTasks, toastMsg]
  );

  const delTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((x) => x.id !== id));
      toastMsg("Tugas dihapus");
    },
    [setTasks, toastMsg]
  );

  /* ---- jadwal: Google Calendar saat login, prompt login saat preview ---- */
  const delSched = useCallback(
    async (id: string) => {
      if (!connected) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      const gid = id.startsWith("g:") ? id : `g:${id}`;
      try {
        await apiDeleteEvent(gid);
        setRemoteEvents((prev) => prev.filter((s) => s.id !== id && s.id !== gid));
        toastMsg("Event Google dihapus");
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("Gagal hapus event");
      }
    },
    [connected, toastMsg, markDisconnected]
  );

  const saveSched = useCallback(
    async (v: { title: string; date: string; time: string; note: string }) => {
      if (!connected) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      try {
        const ev = await apiCreateEvent(v);
        setRemoteEvents((prev) => [...prev, ev].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
        toastMsg("Jadwal tersimpan ke Google Calendar");
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("Gagal simpan ke Google");
        return;
      }
      setSelDate(v.date);
      setSheet(null);
      go("kalender");
    },
    [connected, toastMsg, markDisconnected, go]
  );

  const startEditSched = useCallback(
    (id: string) => {
      if (!connected) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      const s = remoteEvents.find((x) => x.id === id);
      if (!s) {
        toastMsg("Jadwal tidak ditemukan");
        return;
      }
      setEditingSched(s);
      setSheet("sched");
    },
    [connected, remoteEvents, toastMsg]
  );

  const saveEditSched = useCallback(
    async (v: { title: string; date: string; time: string; note: string }) => {
      if (!connected || !editingSched) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      try {
        const ev = await apiUpdateEvent(editingSched.id, v);
        setRemoteEvents((prev) =>
          prev
            .map((s) => (s.id === editingSched.id ? ev : s))
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        );
        toastMsg("Jadwal diperbarui di Google Calendar");
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg(`Gagal ubah: ${e instanceof Error ? e.message : "unknown"}`);
        return;
      }
      setEditingSched(null);
      setSelDate(v.date);
      setSheet(null);
      go("kalender");
    },
    [connected, editingSched, toastMsg, markDisconnected, go]
  );

  const saveMail = useCallback(
    async (to: string, subj: string, body: string) => {
      if (!connected) {
        toastMsg(PREVIEW_LOGIN_HINT);
        return;
      }
      try {
        await apiSendMail(to, subj, body);
        toastMsg("Email terkirim via Gmail");
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg(`Gagal kirim: ${e instanceof Error ? e.message : "unknown"}`);
        return;
      }
      setSheet(null);
    },
    [connected, toastMsg, markDisconnected]
  );

  const logoutGoogle = useCallback(async () => {
    await apiLogout();
    markDisconnected();
    setView("koneksi");
    toastMsg("Keluar dari Google");
  }, [markDisconnected, toastMsg]);

  /** Keluar preview: hapus data tamu lokal, kembali ke kondisi contoh segar. */
  const exitPreview = useCallback(() => {
    removeLS(`${LS.tasks}${GUEST_SUFFIX}`);
    removeLS(`${LS.routine}${GUEST_SUFFIX}`);
    setTasks([]);
    setRoutines([]);
    setPreviewMails(SAMPLE_MAILS);
    setCurrentMail(null);
    setView("dashboard");
    toastMsg("Keluar dari mode pratinjau");
  }, [setTasks, setRoutines, toastMsg]);

  const delRoutine = useCallback(
    (id: string) => {
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      toastMsg("Jadwal rutin dihapus");
    },
    [setRoutines, toastMsg]
  );

  const courses = useMemo(() => [...new Set(routines.map((r) => r.course))], [routines]);
  const myRoutines = useMemo(
    () => routines.slice().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
    [routines]
  );

  return (
    <>
      <TopBar connected={connected} email={connEmail} onProfile={() => go("profil")} preview={preview} />
      <div className="shell">
        <div className="app">
          <Sidebar view={view} go={go} />
          <main>
            {preview && (view === "dashboard" || view === "email" || view === "tugas" || view === "kalender") && (
              <div className="banner" role="status">
                <span className="banner-ic">
                  <IconEye size={24} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="t">Mode pratinjau — data contoh</span>
                  <br />
                  <span className="s">Bukan data aslimu. Login untuk Gmail &amp; Kalender asli.</span>
                </span>
                <a
                  className="btn primary sm"
                  href="/api/auth/login"
                  style={{ textDecoration: "none", flex: "none" }}
                >
                  Login dengan Google
                </a>
              </div>
            )}
            {view === "dashboard" && (
              <Dashboard
                mails={mails}
                schedules={schedules}
                routines={routines}
                tasks={tasks}
                email={connEmail}
                preview={preview}
                guestName={guestName}
                go={go}
                onCompose={() => openCompose()}
              />
            )}
            {view === "email" && (
              <EmailView
                mails={mails}
                onOpen={openMail}
                onToggleStar={toggleStar}
                onAction={mailAction}
                currentMail={currentMail}
                onBack={() => setCurrentMail(null)}
                search={search}
                onSearch={(q) => {
                  setSearch(q);
                  if (connected) refreshRemote({ mails: true, events: false, query: q });
                }}
                remote={{
                  loading: mailLoading,
                  hasMore: connected && !!mailPage,
                  onMore: () => refreshRemote({ mails: true, events: false, query: search, append: true }),
                }}
                preview={preview}
              />
            )}
            {view === "tugas" && (
              <TasksView
                tasks={tasks}
                routines={routines}
                onToggle={toggleTask}
                onDelete={delTask}
                onAdd={() => setSheet("task")}
                preview={preview}
              />
            )}
            {view === "kalender" && (
              <CalendarView
                schedules={schedules}
                routines={routines}
                tasks={tasks}
                selDate={selDate}
                onSelectDate={(iso) => setSelDate(iso)}
                onEditSched={startEditSched}
                onDeleteSched={delSched}
                onDeleteRoutine={delRoutine}
                onAddSched={() => {
                  if (!connected) {
                    toastMsg(PREVIEW_LOGIN_HINT);
                    return;
                  }
                  setEditingSched(null);
                  setSheet("sched");
                }}
                onManageRoutine={() => setSheet("routine")}
                preview={preview}
              />
            )}
            {view === "profil" && (
              <ProfileView
                connected={connected}
                email={connEmail}
                notif={notif}
                onToggleNotif={() => {
                  setNotif((v) => {
                    toastMsg(!v ? "Pengingat dinyalakan" : "Pengingat dimatikan");
                    return !v;
                  });
                }}
                onLogout={logoutGoogle}
                onKoneksi={() => go("koneksi")}
                preview={preview}
                guestName={guestName}
                onGuestName={(v) => setGuestName(v)}
                onExitPreview={exitPreview}
              />
            )}
            {view === "koneksi" && (
              <GoogleConnect
                connected={connected}
                email={connEmail}
                updatedAt={updatedAt}
                onLogout={logoutGoogle}
                onProfile={() => go("profil")}
              />
            )}
          </main>
        </div>
      </div>
      <TabBar view={view} go={go} />
      {/* Fab: tambah event saat login, tambah tugas lokal saat preview. */}
      <Fab
        onAdd={() => {
          if (connected) {
            setEditingSched(null);
            setSheet("sched");
          } else setSheet("task");
        }}
      />

      {/* Sched/Mail = tulis ke Google (saat login saja). Task/Routine = lokal (jalan juga di preview). */}
      {connected && (
        <>
          <SchedSheet
            open={sheet === "sched"}
            selDate={selDate}
            initial={editingSched}
            onClose={() => {
              setEditingSched(null);
              setSheet(null);
            }}
            onSave={(v) => (editingSched ? saveEditSched(v) : saveSched(v))}
          />
          <MailSheet
            open={sheet === "mail"}
            preset={compose}
            onClose={() => setSheet(null)}
            onSave={(to, subj, body) => saveMail(to, subj, body)}
          />
        </>
      )}
      {(connected || preview) && (
        <>
          <TaskSheet
            open={sheet === "task"}
            selDate={selDate}
            courses={courses}
            onClose={() => setSheet(null)}
            onSave={(v) => {
              setTasks((prev) => [...prev, { id: "u" + Date.now(), ...v, done: false }]);
              setSheet(null);
              toastMsg("Tugas tersimpan");
              go("tugas");
            }}
          />
          <RoutineSheet
            open={sheet === "routine"}
            mine={myRoutines}
            onClose={() => setSheet(null)}
            onSave={(v) => {
              setRoutines((prev) => [
                ...prev,
                { id: "ru" + Date.now(), ...v, color: RCOL[prev.length % RCOL.length] },
              ]);
              toastMsg("Jadwal rutin tersimpan");
            }}
            onDelete={delRoutine}
          />
        </>
      )}

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </>
  );
}
