"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Mail } from "@/lib/types";
import { EmailBody } from "@/lib/emailBody";
import {
  IconArchive,
  IconArrowLeft,
  IconClip,
  IconDots,
  IconEyeOff,
  IconFile,
  IconForward,
  IconInbox,
  IconReply,
  IconSearch,
  IconStar,
  IconX,
} from "./icons";
import { useLang } from "./LangProvider";

export type MailStatus = "all" | "unread" | "star";

interface RemoteState {
  loading: boolean;
  hasMore: boolean;
  onMore: () => void;
}

interface Props {
  mails: Mail[];
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onAction: (act: string) => void;
  currentMail: string | null;
  onBack: () => void;
  search: string;
  onSearch: (q: string) => void;
  remote: RemoteState;
  preview?: boolean;
  /** Jam sync terakhir dari NotedworkApp (HH:MM), tampil bila login. */
  updatedAt?: string | null;
}

/** Warna avatar pengirim — hash dari nama/email agar beda tiap pengirim. */
export function senderColor(key: string): string {
  const cols = ["#D97706", "#16a34a", "#d97706", "#7c5cff", "#ec4899", "#dc2626"];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return cols[h % cols.length];
}

/** Varian warna tag-pill berdasar tag email. */
function tagVariant(tag: string): string {
  const t = (tag || "").toLowerCase();
  if (t.includes("contoh") || t.includes("preview")) return "blue";
  if (t.includes("promo") || t.includes("sosial")) return "pink";
  if (t.includes("tugas") || t.includes("penting") || t.includes("spam")) return "amber";
  if (t.includes("kampus") || t.includes("akademik") || t.includes("kerja")) return "green";
  return "";
}

function EmailHead({ preview, updatedAt, total }: { preview?: boolean; updatedAt?: string | null; total?: number }) {
  // Kepala ikut bahasa aktif.
  const { t } = useLang();
  return (
    <div className="greet">
      {t("email.title")}
      <small>
        {preview
          ? t("email.previewSub")
          : `${t("email.liveBase")}${updatedAt ? `${t("email.updatedFrag")}${updatedAt}` : ""}${total != null ? `${t("email.countSep")}${total}${t("email.countUnit")}` : ""}`}
      </small>
    </div>
  );
}

export default function EmailView(props: Props) {
  const { mails, remote, preview } = props;
  // Bahasa aktif untuk semua label di tampilan ini.
  const { t } = useLang();
  const [status, setStatus] = useState<MailStatus>("all");
  // Status pencarian ber-debounce: tampil "mencari…" saat user masih mengetik,
  // agar jelas request dikirim setelah berhenti — bukan tiap huruf.
  const [typing, setTyping] = useState(false);
  const typeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typeT.current) clearTimeout(typeT.current);
    };
  }, []);

  const onSearchChange = useCallback(
    (q: string) => {
      setTyping(true);
      if (typeT.current) clearTimeout(typeT.current);
      // 400ms tanpa ketikan = anggap selesai; induk juga debounce di sisinya.
      typeT.current = setTimeout(() => setTyping(false), 450);
      props.onSearch(q);
    },
    [props]
  );

  const current = mails.find((m) => m.id === props.currentMail) ?? null;

  const counts = useMemo(
    () => ({
      all: mails.length,
      unread: mails.filter((m) => m.unread).length,
      star: mails.filter((m) => !!m.starred).length,
    }),
    [mails]
  );

  const list = useMemo(() => {
    const q = props.search.toLowerCase();
    return mails.filter((m) => {
      if (status === "unread" && !m.unread) return false;
      if (status === "star" && !m.starred) return false;
      return (m.from + m.subj + m.prev + m.tag).toLowerCase().includes(q);
    });
  }, [mails, status, props.search]);

  const filtering = props.search.trim() !== "" || status !== "all";

  // Definisi chip di dalam komponen karena hook tidak bisa dipanggil di level modul.
  // Label diambil dari kamus agar ikut bahasa aktif; id dipertahankan sesuai tipe MailStatus.
  const STATUS_DEF: { id: MailStatus; label: string; star?: boolean }[] = [
    { id: "all", label: t("common.all") },
    { id: "unread", label: t("email.filterUnread") },
    { id: "star", label: t("email.filterStar"), star: true },
    // Tanpa chip Arsip: arsip Gmail keluar dari hasil list server sehingga
    // filter arsip selalu kosong (dead-end). Aksi arsip tetap ada di detail.
  ];

  if (current) return <MailDetail m={current} preview={preview} {...props} />;

  return (
    <section className="view active" id="v-email">
      <EmailHead preview={preview} updatedAt={props.updatedAt} total={preview ? undefined : mails.length} />
      <div className="search-wrap" role="search">
        <span className="search-ic" aria-hidden>
          <IconSearch size={16} />
        </span>
        <input
          className="search"
          type="search"
          placeholder={t("email.searchPh")}
          aria-label={t("email.searchLabel")}
          value={props.search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {props.search && (
          <button type="button" className="search-clear" aria-label={t("email.clearSearch")} onClick={() => onSearchChange("")}>
            <IconX size={15} />
          </button>
        )}
      </div>
      {(typing || remote.loading) && (
        <div className="search-count" role="status" aria-live="polite">
          {typing ? t("email.typing") : t("email.searching")}
        </div>
      )}
      {filtering && (
        <div className="search-count" role="status">
          {list.length}{t("email.results")}{props.search.trim() ? `${t("email.resultsFor")}${props.search.trim()}”` : ""}
        </div>
      )}
      <div className="chips">
        {STATUS_DEF.map((s) => (
          <button
            key={s.id}
            className={`chip${status === s.id ? " on" : ""}`}
            aria-pressed={status === s.id}
            aria-label={`${t("email.showEmails")} ${s.label.toLowerCase()}${counts[s.id] ? `, ${counts[s.id]}${t("email.countUnit")}` : ""}`}
            onClick={() => setStatus(s.id)}
          >
            {s.star && (
              <span className="chip-ic">
                <IconStar size={13} filled={status === s.id} />
              </span>
            )}
            {s.label}
            <span className="chip-count">{counts[s.id]}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 4 }}>
        {remote.loading && list.length === 0 ? (
          <div aria-busy="true" aria-label={t("email.loading")}>
            <div className="skeleton">
              <div className="sk w-60" />
              <div className="sk w-90" />
              <div className="sk w-40" />
            </div>
            <div className="skeleton">
              <div className="sk w-50" />
              <div className="sk w-85" />
              <div className="sk w-35" />
            </div>
          </div>
        ) : list.length ? (
          list.map((m) => (
            <article
              key={m.id}
              className={`mail${m.unread ? "" : " read"}`}
              role="button"
              tabIndex={0}
              aria-label={`${m.subj} — ${m.from}${m.unread ? t("email.unreadSuffix") : ""}`}
              onClick={() => props.onOpen(m.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onOpen(m.id);
                }
              }}
            >
              <div className="from">
                {m.unread && <span className="unread-dot" />}
                <span className="from-name">{m.from}</span>
                {m.files && m.files.length > 0 && (
                  <span className="from-ic">
                    <IconClip size={13} />
                  </span>
                )}
                <button
                  className={`star${m.starred ? " lit" : ""}`}
                  title={t("email.starTitle")}
                  aria-label={m.starred ? t("email.unstar") : t("email.giveStar")}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleStar(m.id);
                  }}
                >
                  <IconStar size={17} filled={!!m.starred} />
                </button>
              </div>
              <div className="subj">{m.subj}</div>
              <div className="prev">{m.prev}</div>
              <div className="meta">
                <span className="meta-tag">{m.tag ? `#${m.tag}` : t("email.noTag")}</span>
                <span aria-hidden>•</span>
                <span className="meta-time">{m.time}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            <span className="empty-ic">
              <IconInbox size={22} />
            </span>
            {filtering ? t("email.noResults") : t("email.emptyHere")}
          </div>
        )}
        {remote.loading && list.length > 0 && (
          <div className="more-loading" role="status">
            {t("email.loadingMore")}
          </div>
        )}
        {remote.hasMore && list.length > 0 && (
          <button className="btn ghost block" onClick={remote.onMore} style={{ marginTop: 6 }}>
            {remote.loading ? t("email.loadingMore") : t("email.loadMore")}
          </button>
        )}
      </div>
    </section>
  );
}

function MailDetail({
  m,
  onBack,
  onAction,
  preview,
  updatedAt,
}: { m: Mail; preview?: boolean } & Pick<Props, "onBack" | "onAction" | "updatedAt">) {
  // Bahasa aktif untuk label aksi di detail email.
  const { t } = useLang();
  const isStar = !!m.starred;
  const [moreOpen, setMoreOpen] = useState(false);
  const totalBytes = useMemo(() => {
    // Jumlahkan ukuran hanya bila satuannya sama (tanpa sok konversi).
    const units = new Set((m.files ?? []).map((f) => f.size.trim().split(/\s+/).pop()));
    if (units.size === 1) {
      const sum = (m.files ?? []).reduce((a, f) => a + (parseFloat(f.size.replace(",", ".")) || 0), 0);
      const unit = [...units][0] ?? "";
      const pretty = Number.isInteger(sum) ? String(sum) : sum.toFixed(1).replace(".", ",");
      return `${pretty} ${unit}`.trim();
    }
    return null;
  }, [m.files]);
  return (
    <section className="view active" id="v-email">
      <EmailHead preview={preview} updatedAt={updatedAt} />
      <div className="card">
        <div className="backbar">
          <button className="link link-ic" onClick={onBack} aria-label={t("email.backToListAria")}>
            <IconArrowLeft size={15} />
            {t("email.backToList")}
          </button>
        </div>
        <div className="mail-detail" style={{ border: "none", boxShadow: "none", padding: "8px 0 0" }}>
          <span className={`tag-pill${tagVariant(m.tag) ? ` ${tagVariant(m.tag)}` : ""}`}>{m.tag}</span>
          <h2>{m.subj}</h2>
          <div className="mhead">
            <span className="mava" aria-hidden style={{ background: senderColor(m.email || m.from) }}>
              {(m.from || "?").trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="mhead-tx">
              <div className="who">
                <span className="who-name">{m.from}</span>
                {m.unread && <span className="badge">{t("email.badgeNew")}</span>}
              </div>
              <div className="sub">
                {[m.email ? `<${m.email}>` : null, m.time, `#${m.tag}`].filter(Boolean).join(" • ")}
              </div>
            </div>
          </div>
          <div className="mdiv" />
          <div className="body">
            <EmailBody text={m.body} />
          </div>
          {m.files && m.files.length > 0 && (
            <div>
              <div className="attach-head">
                <span className="h-ic">
                  <IconClip size={14} />
                </span>
                {t("email.attach")}{m.files.length}){totalBytes ? ` • ${totalBytes}` : ""}
              </div>
              {m.files.map((f) => (
                <div className="file" key={f.name}>
                  <IconFile size={18} />
                  <div>
                    <div className="n">{f.name}</div>
                    <div className="z">{f.size}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mactions">
            <button className="btn primary sm btn-ic" onClick={() => onAction("reply")}>
              <IconReply size={15} />
              {t("email.reply")}
            </button>
            <button className="btn soft sm btn-ic" onClick={() => onAction("fwd")}>
              <IconForward size={15} />
              {t("email.forward")}
            </button>
            <div className="more-wrap">
              <button
                type="button"
                className="btn ghost sm btn-ic"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-label={t("email.moreActions")}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <IconDots size={15} />
                {t("email.more")}
              </button>
              {moreOpen && (
                <div className="more-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="more-item"
                    onClick={() => {
                      setMoreOpen(false);
                      onAction("star");
                    }}
                  >
                    <IconStar size={15} filled={isStar} />
                    {isStar ? t("email.unstar") : t("email.giveStar")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-item"
                    onClick={() => {
                      setMoreOpen(false);
                      onAction("arch");
                    }}
                  >
                    <IconArchive size={15} />
                    {t("email.archive")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-item"
                    onClick={() => {
                      setMoreOpen(false);
                      onAction("unread");
                    }}
                  >
                    <IconEyeOff size={15} />
                    {t("email.markUnread")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
