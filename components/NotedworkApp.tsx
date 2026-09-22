"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposePreset, Mail, NavTarget, Note, Routine, Sched, Task, ViewName } from "@/lib/types";
import { GUEST_NAME_KEY, GUEST_SUFFIX, LS, migrateRochaKeys } from "@/lib/data";
import { RCOL, todayStr } from "@/lib/dates";
import { sampleRoutines, sampleScheds, sampleTasks, SAMPLE_MAILS } from "@/lib/preview";
import { stripMailTokens } from "@/lib/emailBody";
import { useLocalStorage } from "@/lib/store";
import { LANG_KEY, STRINGS, pickLang, type Lang } from "@/lib/i18n";
import { DEFAULT_REMINDER_MIN, dueReminders, type ReminderItem } from "@/lib/reminders";
import ThemeProvider from "./ThemeProvider";
import LangProvider, { useLang } from "./LangProvider";
import TopBar from "./TopBar";
import { Fab, Sidebar, TabBar } from "./AppNav";
import { IconDownload, IconEye } from "./icons";
import HariIni from "./HariIni";
import EmailView from "./EmailView";
import TasksView from "./TasksView";
import CalendarView from "./CalendarView";
import NotesView from "./NotesView";
import SettingsView from "./SettingsView";
import { ConfirmSheet, InstallSheet, MailSheet, NoteSheet, QuickAddSheet, RoutineSheet, SchedSheet, TambahSheet, TaskSheet, type PendingDelete, type QuickKind, type SheetId } from "./Sheets";
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
  apiSyncNote,
  apiTrashNoteFile,
  apiUpdateEvent,
} from "@/lib/remote";

/** ID unik lokal — anti-kembar Date.now() (bug lama): prefix + base36 waktu + acak. */
function genId(p: string): string {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

type SchedInput = {
  title: string;
  date: string;
  time: string;
  endTime?: string;
  note: string;
  reminderMin?: number;
};

const sortSched = (a: Sched, b: Sched) => (a.date + a.time).localeCompare(b.date + b.time);

export default function NotedworkApp() {
  return (
    <ThemeProvider>
      <LangProvider>
        <NotedworkShell />
      </LangProvider>
    </ThemeProvider>
  );
}

function NotedworkShell() {
  const { t } = useLang();
  const [view, setView] = useState<ViewName>("beranda");
  const [sheet, setSheet] = useState<SheetId>(null);
  const [confirmDel, setConfirmDel] = useState<PendingDelete | null>(null);
  const [compose, setCompose] = useState<ComposePreset | null>(null);
  /** Mode sheet email — ditentukan pemanggil openCompose, bukan ditebak dari preset. */
  const [composeMode, setComposeMode] = useState<"tulis" | "balas" | "teruskan">("tulis");
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
  // Jadwal preview: persist lokal terisolasi (:preview), fully-interactive.
  const [previewScheds, setPreviewScheds] = useLocalStorage<Sched[]>(`${LS.sched}${GUEST_SUFFIX}`, []);

  // Tugas & rutin: per email saat login, kunci :preview saat tamu (terisolasi & persist lokal).
  // Seed [] — sampel preview diisi sekali via efek di bawah (hanya bila kunci tamu belum ada),
  // agar akun login baru tidak ikut dapat sampel.
  const userSuffix = connected && connEmail ? `:${connEmail.toLowerCase()}` : GUEST_SUFFIX;
  const [tasks, setTasks] = useLocalStorage<Task[]>(`${LS.tasks}${userSuffix}`, []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>(`${LS.routine}${userSuffix}`, []);
  const [notes, setNotes] = useLocalStorage<Note[]>(`${LS.notes}${userSuffix}`, []);
  // Catatan yang sedang diedit (null = mode tambah). Sheet dibuka via onEdit/onAdd.
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [notif, setNotif] = useLocalStorage<boolean>(LS.notif, true);
  const [guestName, setGuestName] = useLocalStorage<string>(GUEST_NAME_KEY, "Tamu");

  /* ---- install PWA ---- */
  /** Prompt native Chrome (beforeinstallprompt) — hanya ada bila app belum terinstal & installable. */
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useLocalStorage<boolean>("notedwork.installDismissed", false);
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const check = () =>
      setPwaInstalled(mq.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    check();
    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPwaInstalled(true);
      setInstallPrompt(null);
    };
    mq.addEventListener("change", check);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      mq.removeEventListener("change", check);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  /** Picu dialog install native Android — dipanggil dari InstallSheet. */
  const doNativeInstall = useCallback(async () => {
    const ev = installPrompt;
    if (!ev) return;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    setInstallPrompt(null);
    if (outcome === "accepted") toastMsg(t("install.installedToast"));
  }, [installPrompt, toastMsg, t]);
  /** “Jangan tampilkan lagi” — tutup sheet + sembunyikan entry permanen. */
  const neverShowInstall = useCallback(() => {
    setInstallDismissed(true);
    setSheet(null);
    toastMsg(t("install.dismissedToast"));
  }, [setInstallDismissed, toastMsg, t]);

  /* ---- ref cermin & penjaga race ---- */
  const searchT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const mailPageRef = useRef<string | null>(null);
  const mailLoadingRef = useRef(false);
  const tasksRef = useRef<Task[]>([]);
  /** Nomor urut fetch — respons basi (seq lama) diabaikan. */
  const fetchSeq = useRef(0);
  /** Anti-race bintang: id yang sedang di-POST tak bisa diklik ulang. */
  const starPending = useRef(new Map<string, boolean>());
  /** Anti double-submit (spam-klik Simpan/Kirim): submit yg sedang jalan tolak yg baru. */
  const schedBusy = useRef(false);
  const mailBusy = useRef(false);
  const taskBusy = useRef(false);
  /** Pengingat yang sudah dibunyikan: kunci id|date|time (maks 200). */
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mailPageRef.current = mailPage;
  }, [mailPage]);
  useEffect(() => {
    mailLoadingRef.current = mailLoading;
  }, [mailLoading]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Seed sampel preview sekali: tamu segar lihat contoh, tamu kembali pertahankan editannya.
  useEffect(() => {
    try {
      if (localStorage.getItem(`${LS.tasks}${GUEST_SUFFIX}`) == null) setTasks(sampleTasks());
      if (localStorage.getItem(`${LS.routine}${GUEST_SUFFIX}`) == null) setRoutines(sampleRoutines());
      if (localStorage.getItem(`${LS.sched}${GUEST_SUFFIX}`) == null) setPreviewScheds(sampleScheds());
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
  // Tugas yang sedang diedit (null = mode tambah). Sheet dibuka via onEditTask.
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const markDisconnected = useCallback(() => {
    setConnected(false);
    setConnEmail(null);
    setRemoteMails([]);
    setMailPage(null);
    setRemoteEvents([]);
    setCurrentMail(null);
    setEditingSched(null);
    setEditingTask(null);
    setEditingNote(null);
    setSheet(null);
    setCompose(null);
  }, []);

  const nowHMID = useCallback(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, []);

  const browserTz = useCallback(
    () => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined),
    []
  );

  const refreshRemote = useCallback(
    async (opts?: { mails?: boolean; events?: boolean; query?: string; append?: boolean; signal?: AbortSignal }) => {
      const wantMails = opts?.mails ?? true;
      const wantEvents = opts?.events ?? true;
      const seq = ++fetchSeq.current;
      const stale = () => fetchSeq.current !== seq;
      try {
        if (wantMails) {
          setMailLoading(true);
          const { mails, nextPageToken } = await apiListMails(
            opts?.query ?? "",
            opts?.append ? (mailPageRef.current ?? undefined) : undefined,
            opts?.signal ? { signal: opts.signal } : undefined
          );
          if (stale()) return;
          setRemoteMails((prev) => {
            if (!opts?.append) return mails;
            const seen = new Set(prev.map((m) => m.id));
            return [...prev, ...mails.filter((m) => !seen.has(m.id))];
          });
          setMailPage(nextPageToken);
        }
        if (wantEvents) {
          // Hari 1 & 0 agar aritmetika bulan anti-overflow (29–31 → Feb tak hilang).
          const now = new Date();
          const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const to = new Date(now.getFullYear(), now.getMonth() + 3, 0);
          const iso = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const events = await apiListEvents(
            iso(from),
            iso(to),
            browserTz()
          );
          if (stale()) return;
          setRemoteEvents(events);
        }
        if (!stale()) setUpdatedAt(nowHMID());
      } catch (e) {
        // Abort search baru = bukan error: request lama sengaja dibatalkan.
        if (e instanceof Error && e.name === "AbortError") return;
        if (stale()) return;
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg(t("toast.syncFail"));
      } finally {
        if (!stale()) setMailLoading(false);
      }
    },
    [markDisconnected, nowHMID, toastMsg, browserTz, t]
  );

  // Migrasi kunci lama rocha.* → notedwork.* (sekali per browser) + hasil login OAuth.
  useEffect(() => {
    migrateRochaKeys();
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const auth = q.get("auth");
    if (auth === "ok" || auth === "gagal") {
      // Tunda ke microtask agar bukan setState sinkron di dalam effect.
      // Kode pesan spesifik dari /api/auth/callback (simpan-token-gagal/buat-sesi-gagal/…).
      const detail = q.get("pesan");
      let storedLang: Lang = "id";
      try {
        storedLang = pickLang(JSON.parse(localStorage.getItem(LANG_KEY) ?? "null")) ?? "id";
      } catch { storedLang = "id"; }
      const tt = (k: string) => STRINGS[storedLang][k] ?? STRINGS.id[k] ?? k;
      const failMsg =
        detail === "simpan-token-gagal"
          ? tt("toast.loginTokenFail")
          : detail === "buat-sesi-gagal"
            ? tt("toast.loginSessionFail")
            : detail === "state-tidak-cocok"
              ? tt("toast.loginExpired")
              : detail === "ditolak-google"
                ? tt("toast.loginCancelled")
                : tt("toast.loginFail");
      const msg = auth === "ok" ? tt("toast.connected") : failMsg;
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
      if (searchT.current) clearTimeout(searchT.current);
      searchAbort.current?.abort();
    };
  }, []);

  // Data tampil: Gmail/Calendar asli saat login, contoh lokal saat preview.
  const mails = connected ? remoteMails : previewMails;
  const schedules = useMemo(
    () => (connected ? remoteEvents : previewScheds).slice().sort(sortSched),
    [connected, remoteEvents, previewScheds]
  );

  const go = useCallback((v: NavTarget) => {
    if (v === "tambah") {
      setSheet("cepat");
      return;
    }
    setView(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Sheet email selalu boleh dibuka (termasuk tamu) — penolakan jujur terjadi
  // saat Kirim via saveMail, bukan via tombol mati.
  const openCompose = useCallback((p?: ComposePreset, mode: "tulis" | "balas" | "teruskan" = "tulis") => {
    setCompose(p ?? null);
    setComposeMode(mode);
    setSheet("mail");
  }, []);

  /** Cari email: debounce 400ms + abort request lama agar tak spam/balap tiap huruf. */
  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q);
      if (searchT.current) clearTimeout(searchT.current);
      searchT.current = setTimeout(() => {
        if (!connected) return;
        // Batalkan request search sebelumnya sebelum kirim yang baru.
        searchAbort.current?.abort();
        const ctl = new AbortController();
        searchAbort.current = ctl;
        void refreshRemote({ mails: true, events: false, query: q, signal: ctl.signal });
      }, 400);
    },
    [connected, refreshRemote]
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
        else toastMsg(t("toast.mailBodyFail"));
      }
    },
    [connected, markDisconnected, toastMsg, t]
  );

  const toggleStar = useCallback(
    async (id: string) => {
      if (!connected) {
        // Preview: flip bintang di state lokal.
        setPreviewMails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)));
        return;
      }
      if (starPending.current.get(id)) return;
      starPending.current.set(id, true);
      const isStar = !!remoteMails.find((m) => m.id === id)?.starred;
      // Optimistic flip + rollback bila POST gagal.
      setRemoteMails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !isStar } : m)));
      try {
        await apiLabelMail(id, isStar ? "unstar" : "star");
      } catch (e) {
        setRemoteMails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: isStar } : m)));
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg(t("toast.starFail"));
      } finally {
        starPending.current.delete(id);
      }
    },
    [connected, remoteMails, markDisconnected, toastMsg, t]
  );

  const mailAction = useCallback(
    async (act: string) => {
      const stripRe = (s: string) => s.replace(/^re:\s+/i, "");
      if (!connected) {
        // Preview fully-interactive: reply/fwd = draf compose dari mail contoh,
        // bintang = flip, arsip/hapus = buang dari list, unread = tandai.
        const m = previewMails.find((x) => x.id === currentMail);
        if (!m) return;
        const quoted = stripMailTokens(m.body);
        if (act === "reply") {
          openCompose(
            {
              to: m.email,
              subj: "Re: " + stripRe(m.subj),
              body: `\n\n— — —\n${t("mail.quoteWrote").replace("{time}", m.time).replace("{from}", m.from)}\n${quoted}`,
            },
            "balas"
          );
        } else if (act === "fwd") {
          openCompose(
            {
              to: "",
              subj: "Fwd: " + stripRe(m.subj).replace(/^fwd:\s+/i, ""),
              body: `\n\n${t("mail.quoteFwd").replace("{from}", m.from).replace("{email}", m.email)}\n${quoted}`,
            },
            "teruskan"
          );
        } else if (act === "star") {
          setPreviewMails((prev) => prev.map((x) => (x.id === m.id ? { ...x, starred: !x.starred } : x)));
        } else if (act === "arch" || act === "del") {
          setPreviewMails((prev) => prev.filter((x) => x.id !== m.id));
          setCurrentMail(null);
          toastMsg(t("toast.archived"));
        } else if (act === "unread") {
          setPreviewMails((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: true } : x)));
          setCurrentMail(null);
          toastMsg(t("toast.markedUnread"));
        }
        return;
      }
      const m = remoteMails.find((x) => x.id === currentMail);
      if (!m) return;
      // Draf reply/fwd = teks polos: token [label](url)/[TABLE]/[PRE] dikembalikan
      // jadi "label (url)" / "a | b" agar markup tak bocor ke email terkirim.
      const quoted = stripMailTokens(m.body);
      try {
        if (act === "reply") {
          openCompose(
            {
              to: m.email,
              subj: "Re: " + stripRe(m.subj),
              body: `\n\n— — —\n${t("mail.quoteWrote").replace("{time}", m.time).replace("{from}", m.from)}\n${quoted}`,
            },
            "balas"
          );
        } else if (act === "fwd") {
          openCompose(
            {
              to: "",
              subj: "Fwd: " + stripRe(m.subj).replace(/^fwd:\s+/i, ""),
              body: `\n\n${t("mail.quoteFwd").replace("{from}", m.from).replace("{email}", m.email)}\n${quoted}`,
            },
            "teruskan"
          );
        } else if (act === "star") {
          await toggleStar(m.id);
        } else if (act === "arch") {
          await apiLabelMail(m.id, "archive");
          setRemoteMails((prev) => prev.filter((x) => x.id !== m.id));
          setCurrentMail(null);
          toastMsg(t("toast.archived"));
        } else if (act === "unread") {
          await apiLabelMail(m.id, "unread");
          setRemoteMails((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: true } : x)));
          setCurrentMail(null);
          toastMsg(t("toast.markedUnread"));
        } else if (act === "del") {
          // Tanpa hapus permanen — tombol hapus = arsip.
          await apiLabelMail(m.id, "archive");
          setRemoteMails((prev) => prev.filter((x) => x.id !== m.id));
          setCurrentMail(null);
          toastMsg(t("toast.archived"));
        }
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg(t("toast.gmailFail"));
      }
    },
    [currentMail, previewMails, remoteMails, connected, openCompose, toggleStar, toastMsg, markDisconnected, t]
  );

  /* ---- tugas (milik sendiri, mulai kosong) ---- */
  const toggleTask = useCallback(
    (id: string) => {
      // Toast di LUAR updater (side-effect di dalam updater = bug lama).
      const found = tasksRef.current.find((x) => x.id === id);
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
      toastMsg(found ? (found.done ? t("toast.taskReopened") : t("toast.taskDone")) : t("toast.taskDone"));
    },
    [setTasks, toastMsg, t]
  );

  const delTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((x) => x.id !== id));
      toastMsg(t("toast.taskDeleted"));
    },
    [setTasks, toastMsg, t]
  );

  // Mulai edit tugas: isi TaskSheet dari data lama (mode edit, bukan reset).
  const startEditTask = useCallback(
    (id: string) => {
      const found = tasksRef.current.find((x) => x.id === id);
      if (!found) {
        toastMsg(t("toast.taskMissing"));
        return;
      }
      setEditingTask(found);
      setSheet("task");
    },
    [toastMsg, t]
  );

  /* ---- jadwal: Google Calendar saat login, lokal saat preview ---- */
  const delSched = useCallback(
    async (id: string) => {
      if (!connected) {
        setPreviewScheds((prev) => prev.filter((s) => s.id !== id));
        toastMsg(t("toast.schedDeleted"));
        return;
      }
      const gid = id.startsWith("g:") ? id : `g:${id}`;
      try {
        await apiDeleteEvent(gid);
        setRemoteEvents((prev) => prev.filter((s) => s.id !== id && s.id !== gid));
        toastMsg(t("toast.gcalDeleted"));
      } catch (e) {
        if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
        else toastMsg(t("toast.schedDeleteFail"));
      }
    },
    [connected, toastMsg, markDisconnected, setPreviewScheds, t]
  );

  const saveSched = useCallback(
    async (v: SchedInput): Promise<boolean> => {
      // Lapis 2 (lapis 1 = guard sheet): spam dari keyboard/Enter ganda tetap tertahan.
      if (schedBusy.current) return false;
      schedBusy.current = true;
      try {
        if (!connected) {
          const start = v.time && v.time.trim() ? v.time : "09:00";
          // Akhir opsional: kosong / sama dengan mulai = sekilas (tak disimpan).
          const rawEnd = v.endTime && v.endTime.trim() ? v.endTime.trim() : undefined;
          const end = rawEnd && rawEnd !== start ? rawEnd : undefined;
          const overnight = end != null && end <= start;
          setPreviewScheds((prev) =>
            [
              ...prev,
              {
                id: genId("s"),
                title: v.title,
                date: v.date,
                time: start,
                ...(end ? { endTime: end } : {}),
                note: v.note ?? "",
                color: RCOL[prev.length % RCOL.length],
                reminderMin: v.reminderMin,
                ...(overnight ? { overnight: true } : {}),
              } as Sched,
            ].sort(sortSched)
          );
          toastMsg(t("toast.schedSaved"));
          setSelDate(v.date);
          setSheet(null);
          go("kalender");
          return true;
        }
        try {
          const ev = await apiCreateEvent(v, browserTz());
          setRemoteEvents((prev) => [...prev, ev].sort(sortSched));
          toastMsg(t("toast.schedSavedGcal"));
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
          else toastMsg(t("toast.schedSaveFail"));
          return false;
        }
        setSelDate(v.date);
        setSheet(null);
        go("kalender");
        return true;
      } finally {
        schedBusy.current = false;
      }
    },
    [connected, toastMsg, markDisconnected, go, setPreviewScheds, browserTz, t]
  );

  const startEditSched = useCallback(
    (id: string) => {
      const s = (connected ? remoteEvents : previewScheds).find((x) => x.id === id);
      if (!s) {
        toastMsg(t("toast.schedMissing"));
        return;
      }
      setEditingSched(s);
      setSheet("sched");
    },
    [connected, remoteEvents, previewScheds, toastMsg, t]
  );

  const saveEditSched = useCallback(
    async (v: SchedInput): Promise<boolean> => {
      if (!editingSched) {
        toastMsg(t("toast.schedMissing"));
        return false;
      }
      // Edit spam-klik: PATCH ganda = data balapan — tahan seperti save.
      if (schedBusy.current) return false;
      schedBusy.current = true;
      try {
        if (!connected) {
          const start = v.time && v.time.trim() ? v.time : "09:00";
          // Akhir opsional: kosong / sama dengan mulai = sekilas (tak disimpan).
          const rawEnd = v.endTime && v.endTime.trim() ? v.endTime.trim() : undefined;
          const end = rawEnd && rawEnd !== start ? rawEnd : undefined;
          const overnight = end != null && end <= start;
          const id = editingSched.id;
          setPreviewScheds((prev) =>
            prev
              .map((s) =>
                s.id === id
                  ? ({
                      ...s,
                      title: v.title,
                      date: v.date,
                      time: start,
                      ...(end ? { endTime: end } : { endTime: undefined }),
                      note: v.note ?? "",
                      reminderMin: v.reminderMin,
                      ...(overnight ? { overnight: true } : {}),
                    } as Sched)
                  : s
              )
              .sort(sortSched)
          );
          toastMsg(t("toast.schedUpdated"));
          setEditingSched(null);
          setSelDate(v.date);
          setSheet(null);
          go("kalender");
          return true;
        }
        try {
          const ev = await apiUpdateEvent(editingSched.id, v, browserTz());
          setRemoteEvents((prev) => prev.map((s) => (s.id === editingSched.id ? ev : s)).sort(sortSched));
          toastMsg(t("toast.schedUpdatedGcal"));
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
          else toastMsg(`${t("toast.updateFailPrefix")}${e instanceof Error ? e.message : "unknown"}`);
          return false;
        }
        setEditingSched(null);
        setSelDate(v.date);
        setSheet(null);
        go("kalender");
        return true;
      } finally {
        schedBusy.current = false;
      }
    },
    [connected, editingSched, toastMsg, markDisconnected, go, setPreviewScheds, browserTz, t]
  );

  const saveMail = useCallback(
    async (to: string, subj: string, body: string): Promise<boolean> => {
      // Anti double-kirim: spam-klik Kirim = 1 email, bukan N email ke dosen.
      if (mailBusy.current) return false;
      mailBusy.current = true;
      try {
        if (!connected) {
          // Satu-satunya guard login yang tersisa: sheet tetap terbuka, draf utuh.
          toastMsg(t("toast.previewLoginHint"));
          return false;
        }
        try {
          await apiSendMail(to, subj, body);
          toastMsg(t("toast.mailSent"));
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) markDisconnected();
          else toastMsg(`${t("toast.sendFailPrefix")}${e instanceof Error ? e.message : "unknown"}`);
          return false;
        }
        setSheet(null);
        return true;
      } finally {
        mailBusy.current = false;
      }
    },
    [connected, toastMsg, markDisconnected, t]
  );

  const logoutGoogle = useCallback(async () => {
    const ok = await apiLogout();
    markDisconnected();
    setView("settings");
    // Bila server menolak (403 Origin) sesi+grant masih hidup: katakan jujur
    // agar user tak merasa sudah keluar lalu diam-diam terautentikasi lagi.
    toastMsg(ok ? t("toast.loggedOut") : t("toast.loggedOutLocal"));
  }, [markDisconnected, toastMsg, t]);

  /** Keluar preview: minta konfirmasi dulu — editan tamu ikut terhapus. */
  const exitPreview = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("toast.exitPreviewConfirm"))
    )
      return;
    setTasks(sampleTasks());
    setRoutines(sampleRoutines());
    setPreviewScheds(sampleScheds());
    setPreviewMails(SAMPLE_MAILS);
    setCurrentMail(null);
    setSearch("");
    setView("beranda");
    toastMsg(t("toast.exitPreview"));
  }, [setTasks, setRoutines, setPreviewScheds, toastMsg, t]);

  const delRoutine = useCallback(
    (id: string) => {
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      toastMsg(t("toast.routineDeleted"));
    },
    [setRoutines, toastMsg, t]
  );

  /** Minta konfirmasi hapus dulu (sheet) — eksekusi jalan pas user tekan Hapus. */
  const askDelete = useCallback(
    (kind: PendingDelete["kind"], id: string, title: string) =>
      setConfirmDel({ kind, id, title: title.trim() || id }),
    []
  );

  const doConfirmDelete = useCallback(() => {
    if (!confirmDel) return;
    const { kind, id } = confirmDel;
    setConfirmDel(null);
    if (kind === "task") delTask(id);
    else if (kind === "sched") void delSched(id);
    else if (kind === "routine") delRoutine(id);
    else {
      const fileId = notes.find((n) => n.id === id)?.driveFileId;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toastMsg(t("toast.noteDeleted"));
      // File Drive ikut dibuang; lokal tetap terhapus walau sync gagal.
      if (fileId && connected && !preview) {
        void apiTrashNoteFile(fileId).catch(() => toastMsg(t("toast.driveSyncFail")));
      }
    }
  }, [confirmDel, delTask, delSched, delRoutine, notes, setNotes, toastMsg, t, connected, preview]);

  /** Sync catatan ke Google Docs (background, local-first): hanya saat login. */
  const syncNote = useCallback(
    (note: { id: string; title: string; body: string; driveFileId?: string }) => {
      if (!connected || preview) return;
      void (async () => {
        try {
          const fileId = await apiSyncNote(note);
          setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, driveFileId: fileId } : n)));
        } catch (e) {
          if (e instanceof Error && e.message === NOT_CONNECTED) return;
          toastMsg(t("toast.driveSyncFail"));
        }
      })();
    },
    [connected, preview, setNotes, toastMsg, t]
  );

  /** Simpan tugas — dipakai TaskSheet DAN QuickAddSheet (satu logika, tanpa divergensi). */
  const saveTaskValue = useCallback(
    (v: { matkul: string; title: string; date: string; time: string; prio: Task["prio"]; note: string; reminderMin?: number }) => {
      // Anti double-tugas: spam-klik Simpan = 1 tugas, bukan N.
      if (taskBusy.current) return;
      taskBusy.current = true;
      try {
        const reminderMin = v.reminderMin ?? DEFAULT_REMINDER_MIN;
        if (editingTask) {
          const id = editingTask.id;
          setTasks((prev) =>
            prev.map((x) =>
              x.id === id ? { ...x, matkul: v.matkul, title: v.title, date: v.date, time: v.time, prio: v.prio, note: v.note, reminderMin } : x
            )
          );
          setEditingTask(null);
          setSheet(null);
          toastMsg(t("toast.taskUpdated"));
          go("tugas");
          return;
        }
        setTasks((prev) => [...prev, { id: genId("t"), ...v, reminderMin, done: false }]);
        setSheet(null);
        toastMsg(t("toast.taskSaved"));
        go("tugas");
      } finally {
        taskBusy.current = false;
      }
    },
    [editingTask, setTasks, setEditingTask, toastMsg, go, t]
  );

  /** Simpan catatan (local-first + background sync Drive) — dipakai NoteSheet DAN QuickAddSheet. */
  const saveNoteValue = useCallback(
    (v: { title: string; body: string }) => {
      if (editingNote) {
        const id = editingNote.id;
        const fileId = notes.find((n) => n.id === id)?.driveFileId;
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: v.title, body: v.body, updatedAt: Date.now() } : n)));
        setSheet(null);
        syncNote({ id, title: v.title, body: v.body, driveFileId: fileId });
      } else {
        const now = Date.now();
        const id = `n-${now.toString(36)}`;
        setNotes((prev) => [{ id, title: v.title, body: v.body, updatedAt: now }, ...prev]);
        setSheet(null);
        syncNote({ id, title: v.title, body: v.body });
      }
    },
    [editingNote, notes, setNotes, syncNote]
  );

  /** Dari wizard cepat ke form lengkap (draf judul tetap di wizard saat kembali). */
  const openDetailFromQuick = useCallback(
    (kind: QuickKind) => {
      if (kind === "mail") openCompose();
      else if (kind === "task") setSheet("task");
      else if (kind === "note") {
        setEditingNote(null);
        setSheet("note");
      } else {
        setEditingSched(null);
        setSheet("sched");
      }
    },
    [openCompose]
  );

  /* ---- pengingat in-app: bunyi + getar + banner tiap 30 detik ---- */
  /** Tembak satu notifikasi lewat jalur yang sama (dipakai interval + tombol Tes). */
  const fireReminderAlert = useCallback(
    (title: string) => {
      toastMsg(t("toast.reminderPrefix") + title);
      try {
        navigator.vibrate?.(200);
      } catch {
        /* abaikan: browser tanpa vibrate */
      }
      try {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = 880;
        const t0 = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.start(t0);
        o.stop(t0 + 0.32);
        o.onended = () => {
          void ctx.close().catch(() => null);
        };
      } catch {
        /* abaikan: autoplay policy / tanpa WebAudio */
      }
    },
    [toastMsg, t]
  );

  /** Tombol Tes di Pengaturan: tembak contoh walau saklar pengingat mati. */
  const testNotif = useCallback(() => {
    fireReminderAlert(t("settings.testNotifSample"));
  }, [fireReminderAlert, t]);

  useEffect(() => {
    if (!notif) return;
    const tick = () => {
      const items: ReminderItem[] = [
        ...schedules.map(
          (s): ReminderItem => ({
            id: s.id,
            title: s.title,
            date: s.date,
            time: s.time,
            kind: "sched",
            reminderMin: s.reminderMin ?? DEFAULT_REMINDER_MIN,
          })
        ),
        ...tasks
          .filter((t) => !t.done)
          .map(
            (t): ReminderItem => ({
              id: t.id,
              title: t.title,
              date: t.date,
              time: t.time,
              kind: "task",
              reminderMin: t.reminderMin ?? DEFAULT_REMINDER_MIN,
            })
          ),
      ];
      let due: ReminderItem[];
      try {
        due = dueReminders(items, new Date());
      } catch {
        return;
      }
      for (const d of due) {
        const key = `${d.id}|${d.date}|${d.time}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);
        if (firedRef.current.size > 200) {
          const first = firedRef.current.values().next().value as string | undefined;
          if (first !== undefined) firedRef.current.delete(first);
        }
        fireReminderAlert(d.title);
      }
    };
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [schedules, tasks, notif, fireReminderAlert]);

  const courses = useMemo(() => [...new Set(routines.map((r) => r.course))], [routines]);
  const myRoutines = useMemo(
    () => routines.slice().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
    [routines]
  );

  return (
    <>
      <TopBar connected={connected} email={connEmail} onProfile={() => go("settings")} preview={preview} />
      <div className="shell">
        <div className="app">
          <Sidebar view={view} go={go} t={t} />
          <main>
            {preview && (view === "beranda" || view === "email" || view === "tugas" || view === "kalender") && (
              <div className="banner" role="status">
                <span className="banner-ic">
                  <IconEye size={24} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="t">{t("banner.previewTitle")}</span>
                  <br />
                  <span className="s">{t("banner.previewSub")}</span>
                </span>
                <a
                  className="btn primary sm"
                  href="/api/auth/login"
                  style={{ textDecoration: "none", flex: "none" }}
                >
                  {t("banner.login")}
                </a>
              </div>
            )}
            {/* Entry install PWA: tepat di bawah banner pratinjau; auto-sembunyi bila terinstal/ditolak. */}
            {preview && !pwaInstalled && !installDismissed && (view === "beranda" || view === "email" || view === "tugas" || view === "kalender") && (
              <button type="button" className="banner install" onClick={() => setSheet("install")} aria-label={t("install.entryTitle")}>
                <span className="banner-ic">
                  <IconDownload size={24} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="t">{t("install.entryTitle")}</span>
                  <br />
                  <span className="s">{t("install.entrySub")}</span>
                </span>
                <span className="btn primary sm" style={{ flex: "none" }}>
                  {t("install.entryBtn")}
                </span>
              </button>
            )}
            {view === "beranda" && (
              <HariIni
                mails={mails}
                schedules={schedules}
                routines={routines}
                tasks={tasks}
                email={connEmail}
                preview={preview}
                guestName={guestName}
                go={go}
                onOpenMail={openMail}
                onToggleTask={toggleTask}
                onSelectDate={setSelDate}
                todayStr={todayStr()}
                onAdd={() => setSheet("cepat")}
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
                onSearch={handleSearch}
                remote={{
                  loading: mailLoading,
                  hasMore: connected && !!mailPage,
                  onMore: () => {
                    if (mailLoadingRef.current) return;
                    void refreshRemote({ mails: true, events: false, query: search, append: true });
                  },
                }}
                preview={preview}
                updatedAt={updatedAt}
              />
            )}
            {view === "tugas" && (
              <TasksView
                tasks={tasks}
                routines={routines}
                onToggle={toggleTask}
                onDelete={(id, title) => askDelete("task", id, title)}
                onAdd={() => {
                  setEditingTask(null);
                  setSheet("task");
                }}
                onEdit={startEditTask}
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
                onDeleteSched={(id, title) => askDelete("sched", id, title)}
                onDeleteRoutine={(id, title) => askDelete("routine", id, title)}
                onAddSched={() => {
                  setEditingSched(null);
                  setSheet("sched");
                }}
                onManageRoutine={() => setSheet("routine")}
                preview={preview}
                onToggleTask={toggleTask}
              />
            )}
            {view === "catatan" && (
              <NotesView
                notes={notes}
                t={t}
                onAdd={() => { setEditingNote(null); setSheet("note"); }}
                onEdit={(n) => { setEditingNote(n); setSheet("note"); }}
                onDelete={(id, title) => askDelete("note", id, title)}
              />
            )}
            {view === "settings" && (
              <SettingsView
                connected={connected}
                email={connEmail}
                notif={notif}
                onToggleNotif={() => {
                  toastMsg(notif ? t("toast.notifOff") : t("toast.notifOn"));
                  setNotif(!notif);
                }}
                onTestNotif={testNotif}
                onLogout={logoutGoogle}
                preview={preview}
                guestName={guestName}
                onGuestName={(v) => setGuestName(v)}
                onExitPreview={exitPreview}
                installed={pwaInstalled}
                onOpenInstall={() => setSheet("install")}
              />
            )}
          </main>
        </div>
      </div>
      <TabBar view={view} go={go} t={t} />
      {/* Fab satu jalur via go("tambah"): wizard Tambah Cepat 3 langkah. */}
      <Fab onAdd={() => go("tambah")} t={t} />

      {/* Semua sheet selalu dirender (login maupun preview); isi yang menentukan sumber data. */}
      <TambahSheet
        open={sheet === "tambah"}
        t={t}
        onClose={() => setSheet(null)}
        onPick={(kind) => {
          if (kind === "mail") openCompose();
          else if (kind === "task") setSheet("task");
          else if (kind === "note") { setEditingNote(null); setSheet("note"); }
          else {
            setEditingSched(null);
            setSheet("sched");
          }
        }}
      />
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
        mode={composeMode}
        onClose={() => setSheet(null)}
        onSave={saveMail}
      />
      <TaskSheet
        open={sheet === "task"}
        selDate={selDate}
        courses={courses}
        initial={editingTask}
        onClose={() => {
          setEditingTask(null);
          setSheet(null);
        }}
        onSave={saveTaskValue}
      />
      <QuickAddSheet
        open={sheet === "cepat"}
        selDate={selDate}
        courses={courses}
        onClose={() => setSheet(null)}
        onSaveTask={saveTaskValue}
        onSaveSched={(v) => saveSched(v)}
        onSaveMail={saveMail}
        onSaveNote={saveNoteValue}
        onOpenDetail={openDetailFromQuick}
      />
      <NoteSheet
        open={sheet === "note"}
        initial={editingNote}
        t={t}
        onClose={() => setSheet(null)}
        onSave={saveNoteValue}
      />
      <RoutineSheet
        open={sheet === "routine"}
        mine={myRoutines}
        onClose={() => setSheet(null)}
        onSave={(v) => {
          setRoutines((prev) => [
            ...prev,
            { id: genId("r"), ...v, color: RCOL[prev.length % RCOL.length] },
          ]);
          toastMsg(t("toast.routineSaved"));
        }}
        onDelete={(id, title) => askDelete("routine", id, title)}
      />
      <ConfirmSheet
        pending={confirmDel}
        onCancel={() => setConfirmDel(null)}
        onConfirm={doConfirmDelete}
      />
      <InstallSheet
        open={sheet === "install"}
        canPrompt={installPrompt != null}
        onInstall={doNativeInstall}
        onNever={neverShowInstall}
        onClose={() => setSheet(null)}
      />

      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
