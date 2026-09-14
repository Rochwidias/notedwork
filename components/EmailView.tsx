"use client";

import { useMemo, useState } from "react";
import type { Mail } from "@/lib/types";

export type MailStatus = "all" | "unread" | "star" | "arch" | "trash";

interface RemoteState {
  connected: boolean;
  loading: boolean;
  hasMore: boolean;
  onMore: () => void;
}

interface Props {
  mails: Mail[];
  readMail: string[];
  starred: string[];
  archived: string[];
  deleted: string[];
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onAction: (act: string) => void;
  onEmptyTrash: () => void;
  currentMail: string | null;
  onBack: () => void;
  search: string;
  onSearch: (q: string) => void;
  remote?: RemoteState;
}

const STATUS_LABEL: [MailStatus, (c: Counts) => string][] = [
  ["all", () => "Semua"],
  ["unread", (c) => `Belum dibaca (${c.unread})`],
  ["star", (c) => `★ (${c.star})`],
  ["arch", (c) => `Arsip (${c.arch})`],
  ["trash", (c) => `Sampah (${c.trash})`],
];

interface Counts {
  unread: number;
  star: number;
  arch: number;
  trash: number;
}

export default function EmailView(props: Props) {
  const { mails, readMail, starred, archived, deleted, remote } = props;
  const isRemote = !!remote?.connected;
  const [status, setStatus] = useState<MailStatus>("all");
  const [tag, setTag] = useState<string>("all");

  const current = mails.find((m) => m.id === props.currentMail) ?? null;

  const counts: Counts = useMemo(() => {
    const live = mails.filter((m) => !deleted.includes(m.id));
    return {
      unread: live.filter((m) => !archived.includes(m.id) && !readMail.includes(m.id)).length,
      star: live.filter((m) => starred.includes(m.id)).length,
      arch: live.filter((m) => archived.includes(m.id)).length,
      trash: deleted.length,
    };
  }, [mails, deleted, archived, readMail, starred]);

  const tags = useMemo(
    () => [...new Set(mails.filter((m) => !deleted.includes(m.id)).map((m) => m.tag))],
    [mails, deleted]
  );

  const list = useMemo(() => {
    const q = props.search.toLowerCase();
    return mails.filter((m) => {
      if (status === "trash") {
        if (!deleted.includes(m.id)) return false;
      } else {
        if (deleted.includes(m.id)) return false;
        if (status === "unread" && (readMail.includes(m.id) || archived.includes(m.id))) return false;
        if (status === "star" && !starred.includes(m.id)) return false;
        if (status === "arch" && !archived.includes(m.id)) return false;
        if (status === "all" && archived.includes(m.id)) return false;
      }
      if (tag !== "all" && m.tag !== tag) return false;
      return (m.from + m.subj + m.prev + m.tag).toLowerCase().includes(q);
    });
  }, [mails, status, tag, deleted, readMail, archived, starred, props.search]);

  if (current) return <MailDetail m={current} {...props} />;

  return (
    <section className="view active" id="v-email">
      <div className="greet">
        Email kampus
        <small>
          {isRemote ? "Gmail asli — sync diam-diam tiap buka tab" : "Data contoh tema mahasiswa — login Google untuk email asli"}
        </small>
      </div>
      <input
        className="search"
        type="search"
        placeholder="🔍 Cari email dosen, akademik, UKM…"
        value={props.search}
        onChange={(e) => props.onSearch(e.target.value)}
      />
      <div className="chips">
        {STATUS_LABEL.map(([v, l]) => (
          <button key={v} className={`chip${status === v ? " on" : ""}`} onClick={() => setStatus(v)}>
            {l(counts)}
          </button>
        ))}
        <button className={`chip${tag === "all" ? " on" : ""}`} onClick={() => setTag("all")}>
          # Semua label
        </button>
        {tags.map((t) => (
          <button key={t} className={`chip${tag === t ? " on" : ""}`} onClick={() => setTag(t)}>
            # {t}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 4 }}>
        {list.length ? (
          list.map((m) => (
            <div key={m.id} className={`mail${readMail.includes(m.id) ? " read" : ""}`} onClick={() => props.onOpen(m.id)}>
              <div className="from">
                {!readMail.includes(m.id) && <span className="unread-dot" />}
                {m.from}
                {m.files && m.files.length > 0 && <span style={{ fontSize: 12 }}>📎</span>}
                {!readMail.includes(m.id) && <span className="badge">Baru</span>}
                <button
                  className={`star${starred.includes(m.id) ? " lit" : ""}`}
                  title="Bintang"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleStar(m.id);
                  }}
                >
                  {starred.includes(m.id) ? "★" : "☆"}
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
        {!isRemote && status === "trash" && list.length > 0 && (
          <button className="btn danger block" onClick={props.onEmptyTrash}>
            🗑️ Kosongkan sampah
          </button>
        )}
        {isRemote && remote?.hasMore && (
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
  starred,
  archived,
  deleted,
  onBack,
  onAction,
  remote,
}: { m: Mail } & Pick<Props, "starred" | "archived" | "deleted" | "onBack" | "onAction" | "remote">) {
  const isRemote = !!remote?.connected;
  const isDel = deleted.includes(m.id);
  const isArch = archived.includes(m.id);
  const isStar = starred.includes(m.id);
  return (
    <section className="view active" id="v-email">
      <div className="greet">
        Email kampus
        <small>
          {isRemote ? "Gmail asli — sync diam-diam tiap buka tab" : "Data contoh tema mahasiswa — login Google untuk email asli"}
        </small>
      </div>
      <div className="card">
        <button className="link" onClick={onBack}>
          ← Kembali ke daftar
        </button>
        <div className="mail-detail" style={{ border: "none", boxShadow: "none", padding: "8px 0 0" }}>
          <span className="pill blue">{m.tag}</span>
          <h2>{m.subj}</h2>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {m.from} &lt;{m.email}&gt; • {m.time}
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
                    <div className="z">{f.size}{isRemote ? "" : " • contoh"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mactions">
            {isRemote ? (
              <>
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
              </>
            ) : isDel ? (
              <>
                <button className="btn soft sm" onClick={() => onAction("restore")}>
                  ↩️ Pulihkan
                </button>
                <button className="btn danger sm" onClick={() => onAction("destroy")}>
                  🗑️ Hapus permanen
                </button>
              </>
            ) : (
              <>
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
                  {isArch ? "📥 Keluarkan arsip" : "📦 Arsip"}
                </button>
                <button className="btn ghost sm" onClick={() => onAction("unread")}>
                  👁️ Belum dibaca
                </button>
                <button className="btn danger sm" onClick={() => onAction("del")}>
                  🗑️ Hapus
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
