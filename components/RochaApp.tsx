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
import McpView from "./McpView";
import { MailSheet, RoutineSheet, SchedSheet, TaskSheet, type SheetId } from "./Sheets";

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

  const toastMsg = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(""), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastT.current) clearTimeout(toastT.current);
    };
  }, []);

  const schedules = useMemo(
    () =>
      [...extraSched, ...schedSeed].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [extraSched, schedSeed]
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

  /* ---- email ---- */
  const openMail = useCallback(
    (id: string) => {
      setCurrentMail(id);
      setReadMail((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [setReadMail]
  );

  const toggleStar = useCallback(
    (id: string) => {
      setStarred((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    [setStarred]
  );

  const mailAction = useCallback(
    (act: string) => {
      const m = SAMPLE_MAIL.find((x) => x.id === currentMail);
      if (!m) return;
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
    [currentMail, openCompose, toggleStar, setArchived, setReadMail, setDeleted, toastMsg]
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

  /* ---- jadwal ---- */
  const delSched = useCallback(
    (id: string) => {
      setExtraSched((prev) => prev.filter((s) => s.id !== id));
      toastMsg("🗑️ Jadwal dihapus");
    },
    [setExtraSched, toastMsg]
  );

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

  const copyApi = useCallback(async () => {
    const txt = "GET /api/emails  # daftar email kampus\nGET /api/events  # jadwal & deadline\nPOST /api/send   # (tahap berikut)";
    try {
      await navigator.clipboard.writeText(txt);
      toastMsg("📋 Endpoint tersalin");
    } catch {
      toastMsg("📋 Salin manual: /api/emails, /api/events");
    }
  }, [toastMsg]);

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
                mails={SAMPLE_MAIL.filter((m) => !deleted.includes(m.id) && !archived.includes(m.id))}
                schedules={schedules}
                routines={routines}
                tasks={tasks}
                readMail={readMail}
                go={go}
                onCompose={() => openCompose()}
              />
            )}
            {view === "email" && (
              <EmailView
                mails={SAMPLE_MAIL}
                readMail={readMail}
                starred={starred}
                archived={archived}
                deleted={deleted}
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
                onSearch={setSearch}
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
            {view === "mcp" && <McpView onCopy={copyApi} onProfile={() => go("profil")} />}
          </main>
        </div>
      </div>
      <TabBar view={view} go={go} />
      <Fab onAdd={() => setSheet("sched")} />

      <SchedSheet
        open={sheet === "sched"}
        selDate={selDate}
        onClose={() => setSheet(null)}
        onSave={(v) => {
          const id = "u" + Date.now();
          setExtraSched((prev) => [
            ...prev,
            { id, ...v, color: SCHED_COLORS[prev.length % SCHED_COLORS.length] },
          ]);
          setSelDate(v.date);
          setSheet(null);
          toastMsg("✅ Jadwal tersimpan");
          go("kalender");
        }}
      />
      <MailSheet
        open={sheet === "mail"}
        preset={compose}
        onClose={() => setSheet(null)}
        onSave={() => {
          setSheet(null);
          toastMsg("✅ Email contoh tersimpan sebagai konsep");
        }}
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
