import { getSessionUser } from "@/lib/session";
import { ensureNotesFolder, upsertNoteDoc } from "@/lib/drive";
import { hitRateLimit, tooMany, validGoogleId } from "@/lib/ratelimit";

function disconnected(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : "";
  return msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED";
}

export async function POST(req: Request) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  if (!hitRateLimit(`drive-sync:${userId}`, 30)) return tooMany();
  let v: { title?: string; body?: string; driveFileId?: string };
  try {
    v = (await req.json()) as typeof v;
  } catch {
    return Response.json({ error: "Body bukan JSON" }, { status: 400 });
  }
  const title = (v.title ?? "").trim();
  const body = (v.body ?? "").trim();
  if (!title) return Response.json({ error: "Judul wajib diisi" }, { status: 400 });
  if (title.length > 120 || body.length > 20000)
    return Response.json({ error: "Judul/isi terlalu panjang" }, { status: 400 });
  // driveFileId dari client: bila ada harus pola ID Google yang aman.
  let driveFileId: string | undefined;
  if (v.driveFileId) {
    const clean = validGoogleId(v.driveFileId);
    if (!clean) return Response.json({ error: "driveFileId tidak valid" }, { status: 400 });
    driveFileId = clean;
  }
  try {
    const folderId = await ensureNotesFolder(userId);
    const fileId = await upsertNoteDoc(userId, folderId, title.slice(0, 120), body, driveFileId);
    return Response.json(
      { fileId },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    if (disconnected(e)) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Sync Drive gagal" }, { status: 502 });
  }
}
