"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposePreset, Mail, NavTarget, Routine, Sched, Task, ViewName } from "@/lib/types";
import { LS, clearLegacyLocalData } from "@/lib/data";
import { RCOL, todayStr } from "@/lib/dates";
import { useLocalStorage } from "@/lib/store";
import ThemeProvider from "./ThemeProvider";
import TopBar from "./TopBar";
import { Fab, Sidebar, TabBar } from "./AppNav";
import Dashboard from "./Dashboard";
import EmailView from "./EmailView";
import TasksView from "./TasksView";
import CalendarView from "./CalendarView";
import ProfileView from "./ProfileView";
import GoogleConnect from "./GoogleConnect";
import LoginGate from "./LoginGate";
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
} from "@/lib/remote";

export default function RochaApp() {
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
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [remoteMails, setRemoteMails] = useState<Mail[]>([]);
  const [mailPage, setMailPage] = useState<string | null>(null);
  const [mailLoading, setMailLoading] = useState(false);
  const [remoteEvents, setRemoteEvents] = useState<Sched[]>([]);

  // Tugas & rutin milik masing-masing akun (key per email). Mulai kosong.
  const userSuffix = connected && connEmail ? `:${connEmail.toLowerCase()}` : "";
  const [tasks, setTasks] = useLocalStorage<Task[]>(`${LS.tasks}${userSuffix}`, []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>(`${LS.routine}${userSuffix}`, []);
  const [notif, setNotif] = useLocalStorage<boolean>(LS.notif, true);

  const [currentMail, setCurrentMail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selDate, setSelDate] = useState<string>(() => todayStr());

  const markDisconnected = useCallback(() => {
    setConnected(false);
    setConnEmail(null);
    setRemoteMails([]);
    setMailPage(null);
    setRemoteEvents([]);
    setCurrentMail(null);
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
        else toastMsg("⚠️ Gagal sync Google");
      } finally {
        setMailLoading(false);
      }
    },
    [mailPage, markDisconnected, nowHMID, toastMsg]
  );

  // Hapus sisa data contoh era lama (sekali per browser) + hasil login OAuth.
  useEffect(() => {
    clearLegacyLocalData();
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const auth = q.get("auth");
    if (auth === "ok" || auth === "gagal") {
      // Tunda ke microtask agar bukan setState sinkron di dalam effect.
      const msg = auth === "ok" ? "✅ Terhubung ke Google" : "⚠️ Login Google gagal, coba lagi";
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

  const schedules = useMemo(
    () =>
      connected
        ? remoteEvents.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        : [],
    [connected, remoteEvents]
  );

  const go = useCallback(
    (v: NavTarget) => {
      if (v === "tambah") {
        if (!connected) {
          setView("mcp");
          return;
        }
        setSheet("sched");
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
        setView("mcp");
        return;
      }
      setCompose(p ?? null);
      setSheet("mail");
    },
    [connected]
  );

  /* ---- email Gmail ---- */
  const openMail = useCallback(
    async (id: string) => {
      if (!connected) return;
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
      if (!connected) return;
      const isStar = (remoteMails.find((m) => m.id === id)?.tag ?? "").includes("★");
      try {
        await apiLabelMail(id, isStar ? "unstar" : "star");
        setRemoteMails((prev) =>
          prev.map((m) => (m.id === id ? { ...m, tag: isStar ? "Gmail" : "Gmail ★" } : m))
        );
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("⚠️ Gagal ubah bintang");
      }
    },
    [connected, remoteMails, markDisconnected, toastMsg]
  );

  const mailAction = useCallback(
    async (act: string) => {
      if (!connected) return;
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
          toastMsg("📦 Diarsipkan");
        } else if (act === "unread") {
          await apiLabelMail(m.id, "unread");
          setRemoteMails((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: true } : x)));
          setCurrentMail(null);
          toastMsg("👁️ Ditandai belum dibaca");
        } else if (act === "del") {
          // Tanpa hapus permanen — tombol hapus = arsip.
          await apiLabelMail(m.id, "archive");
          setRemoteMails((prev) => prev.filter((x) => x.id !== m.id));
          setCurrentMail(null);
          toastMsg("📦 Diarsipkan");
        }
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("⚠️ Aksi Gmail gagal");
      }
    },
    [currentMail, remoteMails, connected, openCompose, toggleStar, toastMsg, markDisconnected]
  );

  /* ---- tugas (milik sendiri, mulai kosong) ---- */
  const toggleTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const t = prev.find((x) => x.id === id);
        if (t) toastMsg(t.done ? "↩️ Dibuka lagi" : "✅ Tugas selesai!");
        return prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
      });
    },
    [setTasks, toastMsg]
  );

  const delTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((x) => x.id !== id));
      toastMsg("🗑️ Tugas dihapus");
    },
    [setTasks, toastMsg]
  );

  /* ---- jadwal Google Calendar ---- */
  const delSched = useCallback(
    async (id: string) => {
      if (!connected) return;
      const gid = id.startsWith("g:") ? id : `g:${id}`;
      try {
        await apiDeleteEvent(gid);
        setRemoteEvents((prev) => prev.filter((s) => s.id !== id && s.id !== gid));
        toastMsg("🗑️ Event Google dihapus");
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("⚠️ Gagal hapus event");
      }
    },
    [connected, toastMsg, markDisconnected]
  );

  const saveSched = useCallback(
    async (v: { title: string; date: string; time: string; note: string }) => {
      if (!connected) return;
      try {
        const ev = await apiCreateEvent(v);
        setRemoteEvents((prev) => [...prev, ev].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
        toastMsg("✅ Jadwal tersimpan ke Google Calendar");
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg("⚠️ Gagal simpan ke Google");
        return;
      }
      setSelDate(v.date);
      setSheet(null);
      go("kalender");
    },
    [connected, toastMsg, markDisconnected, go]
  );

  const saveMail = useCallback(
    async (to: string, subj: string, body: string) => {
      if (!connected) return;
      try {
        await apiSendMail(to, subj, body);
        toastMsg("✅ Email terkirim via Gmail");
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg(`⚠️ ${e instanceof Error ? e.message : "Gagal kirim"}`);
        return;
      }
      setSheet(null);
    },
    [connected, toastMsg, markDisconnected]
  );

  const logoutGoogle = useCallback(async () => {
    await apiLogout();
    markDisconnected();
    setView("mcp");
    toastMsg("👋 Keluar dari Google");
  }, [markDisconnected, toastMsg]);

  const delRoutine = useCallback(
    (id: string) => {
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      toastMsg("🗑️ Jadwal rutin dihapus");
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
      <TopBar connected={connected} email={connEmail} onProfile={() => go("profil")} />
      <div className="shell">
        <div className="app">
          <Sidebar view={view} go={go} />
          <main>
            {view === "dashboard" &&
              (connected ? (
                <Dashboard
                  mails={remoteMails}
                  schedules={schedules}
                  routines={routines}
                  tasks={tasks}
                  email={connEmail}
                  go={go}
                  onCompose={() => openCompose()}
                />
              ) : (
                <LoginGate
                  title="Login dulu untuk melihat dashboard"
                  hint="Dashboard, email, tugas & kalendermu muncul setelah login dengan Google."
                />
              ))}
            {view === "email" &&
              (connected ? (
                <EmailView
                  mails={remoteMails}
                  onOpen={openMail}
                  onToggleStar={toggleStar}
                  onAction={mailAction}
                  currentMail={currentMail}
                  onBack={() => setCurrentMail(null)}
                  search={search}
                  onSearch={(q) => {
                    setSearch(q);
                    refreshRemote({ mails: true, events: false, query: q });
                  }}
                  remote={{
                    loading: mailLoading,
                    hasMore: !!mailPage,
                    onMore: () => refreshRemote({ mails: true, events: false, query: search, append: true }),
                  }}
                />
              ) : (
                <LoginGate
                  title="Email terkunci"
                  hint="Login dengan Google untuk membaca & mengirim email aslimu."
                />
              ))}
            {view === "tugas" &&
              (connected ? (
                <TasksView
                  tasks={tasks}
                  routines={routines}
                  onToggle={toggleTask}
                  onDelete={delTask}
                  onAdd={() => setSheet("task")}
                />
              ) : (
                <LoginGate
                  title="Tugas terkunci"
                  hint="Login dengan Google untuk mencatat & melacak tugasmu."
                />
              ))}
            {view === "kalender" &&
              (connected ? (
                <CalendarView
                  schedules={schedules}
                  routines={routines}
                  tasks={tasks}
                  selDate={selDate}
                  onSelectDate={(iso) => setSelDate(iso)}
                  onDeleteSched={delSched}
                  onDeleteRoutine={delRoutine}
                  onAddSched={() => setSheet("sched")}
                  onManageRoutine={() => setSheet("routine")}
                />
              ) : (
                <LoginGate
                  title="Kalender terkunci"
                  hint="Login dengan Google untuk melihat event Google Calendar-mu."
                />
              ))}
            {view === "profil" && (
              <ProfileView
                connected={connected}
                email={connEmail}
                notif={notif}
                onToggleNotif={() => {
                  setNotif((v) => {
                    toastMsg(!v ? "🔔 Pengingat dinyalakan" : "🔕 Pengingat dimatikan");
                    return !v;
                  });
                }}
                onLogout={logoutGoogle}
                onMcp={() => go("mcp")}
              />
            )}
            {view === "mcp" && (
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
      {connected && <Fab onAdd={() => setSheet("sched")} />}

      {connected && (
        <>
          <SchedSheet open={sheet === "sched"} selDate={selDate} onClose={() => setSheet(null)} onSave={saveSched} />
          <MailSheet
            open={sheet === "mail"}
            preset={compose}
            onClose={() => setSheet(null)}
            onSave={(to, subj, body) => saveMail(to, subj, body)}
          />
          <TaskSheet
            open={sheet === "task"}
            selDate={selDate}
            courses={courses}
            onClose={() => setSheet(null)}
            onSave={(v) => {
              setTasks((prev) => [...prev, { id: "u" + Date.now(), ...v, done: false }]);
              setSheet(null);
              toastMsg("✅ Tugas tersimpan");
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
              toastMsg("✅ Jadwal rutin tersimpan");
            }}
            onDelete={delRoutine}
          />
        </>
      )}

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </>
  );
}
