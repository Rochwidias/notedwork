"use client";

import { useMemo, useState } from "react";
import type { Mail } from "@/lib/types";

export type MailStatus = "all" | "unread" | "star" | "arch";

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
}

const STATUS_LABEL: [MailStatus, (c: Counts) => string][] = [
  ["all", () => "Semua"],
  ["unread", (c) => `Belum dibaca (${c.unread})`],
  ["star", (c) => `★ (${c.star})`],
  ["arch", (c) => `Arsip (${c.arch})`],
];

interface Counts {
  unread: number;
  star: number;
  arch: number;
}

export default function EmailView(props: Props) {
  const { mails, remote } = props;
  const [status, setStatus] = useState<MailStatus>("all");

  const current = mails.find((m) => m.id === props.currentMail) ?? null;

  const counts: Counts = useMemo(
    () => ({
      unread: mails.filter((m) => m.unread).length,
      star: mails.filter((m) => m.tag.includes("★")).length,
      arch: 0, // mode Gmail: arsip keluar dari hasil list server
    }),
    [mails]
  );

  const list = useMemo(() => {
    const q = props.search.toLowerCase();
    return mails.filter((m) => {
      // Arsip di Gmail = hilang dari inbox; tampilkan semua yang dikembalikan server,
      // filter status hanya mengandalkan label yang masih ada di hasil.
      if (status === "unread" && !m.unread) return false;
      if (status === "star" && !m.tag.includes("★")) return false;
      if (status === "arch") return false;
      return (m.from + m.subj + m.prev + m.tag).toLowerCase().includes(q);
    });
  }, [mails, status, props.search]);

  if (current) return <MailDetail m={current} {...props} />;

  return (
    <section className="view active" id="v-email">
      <div className="greet">
        Email<small>Gmail asli — sync tiap buka tab</small>
      </div>
      <input
        className="search"
        type="search"
        placeholder="🔍 Cari email…"
        value={props.search}
        onChange={(e) => props.onSearch(e.target.value)}
      />
      <div className="chips">
        {STATUS_LABEL.map(([v, l]) => (
          <button key={v} className={`chip${status === v ? " on" : ""}`} onClick={() => setStatus(v)}>
            {l(counts)}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 4 }}>
        {remote.loading && list.length === 0 ? (
          <>
            <div className="skeleton">
              <div className="sk" style={{ width: "60%" }} />
              <div className="sk" style={{ width: "90%" }} />
              <div className="sk" style={{ width: "40%" }} />
            </div>
            <div className="skeleton">
              <div className="sk" style={{ width: "50%" }} />
              <div className="sk" style={{ width: "85%" }} />
              <div className="sk" style={{ width: "35%" }} />
            </div>
          </>
        ) : list.length ? (
          list.map((m) => (
            <div key={m.id} className={`mail${m.unread ? "" : " read"}`} onClick={() => props.onOpen(m.id)}>
              <div className="from">
                {m.unread && <span className="unread-dot" />}
                {m.from}
                {m.files && m.files.length > 0 && <span style={{ fontSize: 12 }}>📎</span>}
                {m.unread && <span className="badge">Baru</span>}
                <button
                  className={`star${m.tag.includes("★") ? " lit" : ""}`}
                  title="Bintang"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleStar(m.id);
                  }}
                >
                  {m.tag.includes("★") ? "★" : "☆"}
                </button>
              </div>
              <div className="subj">{m.subj}</div>
              <div className="prev">{m.prev}</div>
              <div className="meta">
                <span># {m.tag}</span>
                <span>•</span>
                <span>{m.time}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">📭 Tidak ada email di sini.</div>
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
}: { m: Mail } & Pick<Props, "onBack" | "onAction">) {
  const isStar = m.tag.includes("★");
  return (
    <section className="view active" id="v-email">
      <div className="greet">
        Email<small>Gmail asli — sync tiap buka tab</small>
      </div>
      <div className="card">
        <button className="link" onClick={onBack}>
          ← Kembali ke daftar
        </button>
        <div className="mail-detail" style={{ border: "none", boxShadow: "none", padding: "8px 0 0" }}>
          <span className="tag-pill">{m.tag}</span>
          <h2>{m.subj}</h2>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {m.from} {m.email ? `<${m.email}>` : ""} • {m.time}
          </div>
          <div className="body">{m.body}</div>
          {m.files && m.files.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, margin: "14px 0 2px", color: "var(--muted)" }}>
                📎 LAMPIRAN ({m.files.length})
              </div>
              {m.files.map((f) => (
                <div className="file" key={f.name}>
                  📄
                  <div>
                    <div className="n">{f.name}</div>
                    <div className="z">{f.size}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mactions">
            <button className="btn soft sm" onClick={() => onAction("reply")}>
              ↩️ Balas
            </button>
            <button className="btn soft sm" onClick={() => onAction("fwd")}>
              ➡️ Teruskan
            </button>
            <button className="btn ghost sm" onClick={() => onAction("star")}>
              {isStar ? "★ Hapus bintang" : "☆ Bintang"}
            </button>
            <button className="btn ghost sm" onClick={() => onAction("arch")}>
              📦 Arsip
            </button>
            <button className="btn ghost sm" onClick={() => onAction("unread")}>
              👁️ Belum dibaca
            </button>
            <button className="btn danger sm" onClick={() => onAction("del")}>
              🗑️ Arsipkan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
