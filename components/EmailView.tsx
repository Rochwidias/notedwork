"use client";

import { useMemo, useState } from "react";
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

const STATUS_DEF: { id: MailStatus; label: string; star?: boolean }[] = [
  { id: "all", label: "Semua" },
  { id: "unread", label: "Belum dibaca" },
  { id: "star", label: "Bintang", star: true },
  // Tanpa chip Arsip: arsip Gmail keluar dari hasil list server sehingga
  // filter arsip selalu kosong (dead-end). Aksi arsip tetap ada di detail.
];

/** Warna avatar pengirim — hash dari nama/email agar beda tiap pengirim. */
export function senderColor(key: string): string {
  const cols = ["#00cfff", "#22c55e", "#f59e0b", "#7c5cff", "#ec4899", "#ef4444"];
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
  return (
    <div className="greet">
      Email
      <small>
        {preview
          ? "Mode pratinjau — data contoh. Bukan data aslimu."
          : `Gmail & Kalender asli${updatedAt ? ` • update ${updatedAt}` : ""}${total != null ? ` • ${total} email` : ""}`}
      </small>
    </div>
  );
}

export default function EmailView(props: Props) {
  const { mails, remote, preview } = props;
  const [status, setStatus] = useState<MailStatus>("all");

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
          placeholder="Cari email…"
          aria-label="Cari email"
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
        />
        {props.search && (
          <button type="button" className="search-clear" aria-label="Bersihkan pencarian" onClick={() => props.onSearch("")}>
            <IconX size={15} />
          </button>
        )}
      </div>
      {filtering && (
        <div className="search-count" role="status">
          {list.length} hasil{props.search.trim() ? ` untuk “${props.search.trim()}”` : ""}
        </div>
      )}
      <div className="chips">
        {STATUS_DEF.map((s) => (
          <button
            key={s.id}
            className={`chip${status === s.id ? " on" : ""}`}
            aria-pressed={status === s.id}
            aria-label={`Tampilkan email ${s.label.toLowerCase()}${counts[s.id] ? `, ${counts[s.id]} email` : ""}`}
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
          <div aria-busy="true" aria-label="Memuat email">
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
              aria-label={`${m.subj} — ${m.from}${m.unread ? ", belum dibaca" : ""}`}
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
                  title="Bintang"
                  aria-label={m.starred ? "Hapus bintang" : "Beri bintang"}
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
                <span className="meta-tag">{m.tag ? `#${m.tag}` : "Tanpa label"}</span>
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
            {filtering ? "Tidak ada hasil. Coba kata kunci atau filter lain." : "Tidak ada email di sini."}
          </div>
        )}
        {remote.loading && list.length > 0 && (
          <div className="more-loading" role="status">
            Memuat…
          </div>
        )}
        {remote.hasMore && list.length > 0 && (
          <button className="btn ghost block" onClick={remote.onMore} style={{ marginTop: 6 }}>
            {remote.loading ? "Memuat…" : "Muat lagi (50 berikutnya)"}
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
          <button className="link link-ic" onClick={onBack} aria-label="Kembali ke daftar email">
            <IconArrowLeft size={15} />
            Kembali ke daftar
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
                {m.unread && <span className="badge">Baru</span>}
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
                LAMPIRAN ({m.files.length}){totalBytes ? ` • ${totalBytes}` : ""}
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
              Balas
            </button>
            <button className="btn soft sm btn-ic" onClick={() => onAction("fwd")}>
              <IconForward size={15} />
              Teruskan
            </button>
            <div className="more-wrap">
              <button
                type="button"
                className="btn ghost sm btn-ic"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-label="Aksi email lainnya"
                onClick={() => setMoreOpen((v) => !v)}
              >
                <IconDots size={15} />
                Lainnya
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
                    {isStar ? "Hapus bintang" : "Beri bintang"}
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
                    Arsipkan
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
                    Tandai belum dibaca
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
