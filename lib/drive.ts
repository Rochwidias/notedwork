// Sync catatan → Google Docs di Drive (folder "notedwork").
// Scope: drive.file — hanya file yang dibuat app ini, tak bisa baca Drive lain.
// Pola sama seperti gmail.ts/calendar.ts: googleFetch + error NOT_CONNECTED.

import { googleFetch } from "./google";

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const DOC_MIME = "application/vnd.google-apps.document";

export const NOTES_FOLDER_NAME = "notedwork";

async function asJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("NOT_CONNECTED");
    throw new Error(`${what} gagal: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Cari folder notedwork, bikin bila belum ada. Return folderId. */
export async function ensureNotesFolder(userId: string): Promise<string> {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${NOTES_FOLDER_NAME}' and trashed=false`;
  const found = await googleFetch(
    userId,
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`
  );
  const list = await asJson<{ files: { id: string }[] }>(found, "Cari folder");
  if (list.files[0]) return list.files[0].id;
  const created = await googleFetch(userId, `${DRIVE}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: NOTES_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  return (await asJson<{ id: string }>(created, "Buat folder")).id;
}

/**
 * Buat Dokumen baru (bila fileId kosong) lalu timpa isinya dengan
 * judul + body teks polos. Return fileId untuk disimpan di Note.
 */
export async function upsertNoteDoc(
  userId: string,
  folderId: string,
  title: string,
  body: string,
  fileId?: string
): Promise<string> {
  let id = (fileId ?? "").trim();
  if (!id) {
    const created = await googleFetch(userId, `${DRIVE}/files?fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: title, mimeType: DOC_MIME, parents: [folderId] }),
    });
    id = (await asJson<{ id: string }>(created, "Buat dokumen")).id;
  }
  const content = `${title}\n\n${body}`;
  const written = await googleFetch(userId, `${UPLOAD}/files/${encodeURIComponent(id)}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });
  if (!written.ok) {
    if (written.status === 401 || written.status === 403) throw new Error("NOT_CONNECTED");
    throw new Error(`Tulis dokumen gagal: ${written.status}`);
  }
  return id;
}

/** Buang file catatan ke sampah Drive (best-effort; abaikan bila sudah hilang). */
export async function trashNoteFile(userId: string, fileId: string): Promise<void> {
  if (!fileId.trim()) return;
  const res = await googleFetch(userId, `${DRIVE}/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (res.ok || res.status === 404) return;
  if (res.status === 401 || res.status === 403) throw new Error("NOT_CONNECTED");
  throw new Error(`Hapus dokumen gagal: ${res.status}`);
}
