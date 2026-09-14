"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposePreset, NavTarget, Routine, Sched, Task, ViewName } from "@/lib/types";
import { LS, SAMPLE_MAIL, SAMPLE_ROUTINE, seedSchedules, seedTasks } from "@/lib/data";
import { RCOL, SCHED_COLORS, todayStr } from "@/lib/dates";
import { removeLS, useLocalStorage } from "@/lib/store";
import ThemeProvider, { useTheme } from "./ThemeProvider";
import TopBar from "./TopBar";
import { Fab, Sidebar, TabBar } from "./AppNav";
import Dashboard from "./Dashboard";
import EmailView from "./EmailView";
import TasksView from "./TasksView";
import CalendarView from "./CalendarView";
import ProfileView from "./ProfileView";
import GoogleConnect from "./GoogleConnect";
import { MailSheet, RoutineSheet, SchedSheet, TaskSheet, type SheetId } from "./Sheets";
import type { Mail } from "@/lib/types";
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
  const { setTheme } = useTheme();
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

  const [extraSched, setExtraSched] = useLocalStorage<Sched[]>(LS.sched, []);
  const [readMail, setReadMail] = useLocalStorage<string[]>(LS.read, []);
  const [starred, setStarred] = useLocalStorage<string[]>(LS.star, []);
  const [archived, setArchived] = useLocalStorage<string[]>(LS.arch, []);
  const [deleted, setDeleted] = useLocalStorage<string[]>(LS.del, []);
  const [extraRoutine, setExtraRoutine] = useLocalStorage<Routine[]>(LS.routine, []);
  const [tasks, setTasks] = useLocalStorage<Task[]>(LS.tasks, seedTasks);
  const [notif, setNotif] = useLocalStorage<boolean>(LS.notif, true);

  const [schedSeed] = useState<Sched[]>(() => seedSchedules());
  const [currentMail, setCurrentMail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selDate, setSelDate] = useState<string>(() => todayStr());

  /* ---- koneksi Google (sync diam-diam) ---- */
  const [connected, setConnected] = useState(false);
  const [connEmail, setConnEmail] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [remoteMails, setRemoteMails] = useState<Mail[]>([]);
  const [mailPage, setMailPage] = useState<string | null>(null);
  const [mailLoading, setMailLoading] = useState(false);
  const [remoteEvents, setRemoteEvents] = useState<Sched[]>([]);

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
        : [...extraSched, ...schedSeed].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [connected, remoteEvents, extraSched, schedSeed]
  );
  const routines = useMemo(() => [...extraRoutine, ...SAMPLE_ROUTINE], [extraRoutine]);

  const go = useCallback((v: NavTarget) => {
    if (v === "tambah") {
      setSheet("sched");
      return;
    }
    setView(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openCompose = useCallback((p?: ComposePreset) => {
    setCompose(p ?? null);
    setSheet("mail");
  }, []);

  /* ---- email (lokal vs Google) ---- */
  const mailSource: Mail[] = connected ? remoteMails : SAMPLE_MAIL;

  const openMail = useCallback(
    async (id: string) => {
      setCurrentMail(id);
      if (connected) {
        // Tandai dibaca di Gmail + ambil isi penuh.
        try {
          await apiLabelMail(id, "read");
        } catch {
          /* abaikan: tetap tampilkan */
        }
        try {
          const full = await apiGetMail(id);
          setRemoteMails((prev) => prev.map((m) => (m.id === id ? full : m)));
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        }
        return;
      }
      setReadMail((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [connected, setReadMail, markDisconnected]
  );

  const toggleStar = useCallback(
    async (id: string) => {
      if (connected) {
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
        return;
      }
      setStarred((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    [connected, remoteMails, setStarred, markDisconnected, toastMsg]
  );

  const mailAction = useCallback(
    async (act: string) => {
      const m = mailSource.find((x) => x.id === currentMail);
      if (!m) return;
      if (connected) {
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
            setCurrentMail(null);
            toastMsg("👁️ Ditandai belum dibaca");
          } else if (act === "del") {
            // v1: tanpa hapus permanen — tombol hapus = arsip.
            await apiLabelMail(m.id, "archive");
            setRemoteMails((prev) => prev.filter((x) => x.id !== m.id));
            setCurrentMail(null);
            toastMsg("📦 Diarsipkan");
          }
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
          else toastMsg("⚠️ Aksi Gmail gagal");
        }
        return;
      }
      const stripRe = (s: string) => s.replace(/^re:\s+/i, "");
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
        toggleStar(m.id);
      } else if (act === "arch") {
        setArchived((prev) => {
          const has = prev.includes(m.id);
          toastMsg(has ? "📥 Dikeluarkan dari arsip" : "📦 Diarsipkan");
          return has ? prev.filter((x) => x !== m.id) : [...prev, m.id];
        });
        setCurrentMail(null);
      } else if (act === "unread") {
        setReadMail((prev) => prev.filter((x) => x !== m.id));
        setCurrentMail(null);
        toastMsg("👁️ Ditandai belum dibaca");
      } else if (act === "del") {
        setDeleted((prev) => [...prev, m.id]);
        setCurrentMail(null);
        toastMsg("🗑️ Dipindah ke sampah");
      } else if (act === "restore") {
        setDeleted((prev) => prev.filter((x) => x !== m.id));
        setCurrentMail(null);
        toastMsg("↩️ Email dipulihkan");
      } else if (act === "destroy") {
        setDeleted((prev) => prev.filter((x) => x !== m.id));
        setCurrentMail(null);
        toastMsg("🗑️ Dihapus permanen (contoh)");
      }
    },
    [currentMail, mailSource, connected, openCompose, toggleStar, setArchived, setReadMail, setDeleted, toastMsg, markDisconnected]
  );

  /* ---- tugas ---- */
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

  /* ---- jadwal (lokal vs Google) ---- */
  const delSched = useCallback(
    async (id: string) => {
      if (connected && id.startsWith("g:")) {
        try {
          await apiDeleteEvent(id);
          setRemoteEvents((prev) => prev.filter((s) => s.id !== id));
          toastMsg("🗑️ Event Google dihapus");
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
          else toastMsg("⚠️ Gagal hapus event");
        }
        return;
      }
      setExtraSched((prev) => prev.filter((s) => s.id !== id));
      toastMsg("🗑️ Jadwal dihapus");
    },
    [connected, setExtraSched, toastMsg, markDisconnected]
  );

  const saveSched = useCallback(
    async (v: { title: string; date: string; time: string; note: string }) => {
      if (connected) {
        try {
          const ev = await apiCreateEvent(v);
          setRemoteEvents((prev) => [...prev, ev].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
          toastMsg("✅ Jadwal tersimpan ke Google Calendar");
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
          else toastMsg("⚠️ Gagal simpan ke Google");
          return;
        }
      } else {
        const id = "u" + Date.now();
        setExtraSched((prev) => [
          ...prev,
          { id, ...v, color: SCHED_COLORS[prev.length % SCHED_COLORS.length] },
        ]);
        toastMsg("✅ Jadwal tersimpan");
      }
      setSelDate(v.date);
      setSheet(null);
      go("kalender");
    },
    [connected, setExtraSched, toastMsg, markDisconnected, go]
  );

  const saveMail = useCallback(
    async (to: string, subj: string, body: string) => {
      if (connected) {
        try {
          await apiSendMail(to, subj, body);
          toastMsg("✅ Email terkirim via Gmail");
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
          else toastMsg(`⚠️ ${e instanceof Error ? e.message : "Gagal kirim"}`);
          return;
        }
      } else {
        toastMsg("✅ Email contoh tersimpan sebagai konsep");
      }
      setSheet(null);
    },
    [connected, toastMsg, markDisconnected]
  );

  const logoutGoogle = useCallback(async () => {
    await apiLogout();
    markDisconnected();
    toastMsg("👋 Keluar dari Google");
  }, [markDisconnected, toastMsg]);

  const delRoutine = useCallback(
    (id: string) => {
      setExtraRoutine((prev) => prev.filter((r) => r.id !== id));
      toastMsg("🗑️ Jadwal rutin dihapus");
    },
    [setExtraRoutine, toastMsg]
  );

  const wipe = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm("Kembalikan ke contoh awal? Semua buatanmu akan hilang."))
      return;
    Object.values(LS).forEach((k) => removeLS(k));
    setExtraSched([]);
    setReadMail([]);
    setStarred([]);
    setArchived([]);
    setDeleted([]);
    setExtraRoutine([]);
    setTasks(seedTasks());
    setNotif(true);
    setCurrentMail(null);
    setTheme("dark");
    toastMsg("🧹 Kembali ke contoh awal");
  }, [setExtraSched, setReadMail, setStarred, setArchived, setDeleted, setExtraRoutine, setTasks, setNotif, setTheme, toastMsg]);

  const courses = useMemo(() => [...new Set(routines.map((r) => r.course))], [routines]);
  const myRoutines = useMemo(
    () => extraRoutine.slice().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
    [extraRoutine]
  );

  return (
    <>
      <TopBar onProfile={() => go("profil")} />
      <div className="shell">
        <div className="app">
          <Sidebar view={view} go={go} />
          <main>
            {view === "dashboard" && (
              <Dashboard
                mails={
                  connected
                    ? mailSource
                    : SAMPLE_MAIL.filter((m) => !deleted.includes(m.id) && !archived.includes(m.id))
                }
                schedules={schedules}
                routines={routines}
                tasks={tasks}
                readMail={connected ? mailSource.map((m) => m.id) : readMail}
                go={go}
                onCompose={() => openCompose()}
              />
            )}
            {view === "email" && (
              <EmailView
                mails={mailSource}
                readMail={connected ? mailSource.map((m) => m.id) : readMail}
                starred={connected ? mailSource.filter((m) => m.tag.includes("★")).map((m) => m.id) : starred}
                archived={connected ? [] : archived}
                deleted={connected ? [] : deleted}
                onOpen={openMail}
                onToggleStar={toggleStar}
                onAction={mailAction}
                onEmptyTrash={() => {
                  setDeleted([]);
                  toastMsg("🧹 Sampah dikosongkan");
                }}
                currentMail={currentMail}
                onBack={() => setCurrentMail(null)}
                search={search}
                onSearch={(q) => {
                  setSearch(q);
                  if (connected) refreshRemote({ mails: true, events: false, query: q });
                }}
                remote={{
                  connected,
                  loading: mailLoading,
                  hasMore: !!mailPage,
                  onMore: () => refreshRemote({ mails: true, events: false, query: search, append: true }),
                }}
              />
            )}
            {view === "tugas" && (
              <TasksView
                tasks={tasks}
                routines={routines}
                onToggle={toggleTask}
                onDelete={delTask}
                onAdd={() => setSheet("task")}
              />
            )}
            {view === "kalender" && (
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
            )}
            {view === "profil" && (
              <ProfileView
                notif={notif}
                onToggleNotif={() => {
                  setNotif((v) => {
                    toastMsg(!v ? "🔔 Pengingat dinyalakan (contoh)" : "🔕 Pengingat dimatikan");
                    return !v;
                  });
                }}
                onWipe={wipe}
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
      <Fab onAdd={() => setSheet("sched")} />

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
          setExtraRoutine((prev) => [
            ...prev,
            { id: "ru" + Date.now(), ...v, color: RCOL[prev.length % RCOL.length] },
          ]);
          toastMsg("✅ Jadwal rutin tersimpan");
        }}
        onDelete={delRoutine}
      />

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </>
  );
}
