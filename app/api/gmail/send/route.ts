import { getSessionUser } from "@/lib/session";
import { sendMail } from "@/lib/gmail";

export async function POST(req: Request) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  let body: { to?: string; subj?: string; body?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Body bukan JSON" }, { status: 400 });
  }
  const to = (body.to ?? "").trim();
  const subj = (body.subj ?? "").trim();
  const text = (body.body ?? "").trim();
  if (!to || !to.includes("@")) return Response.json({ error: "Tujuan email tidak valid" }, { status: 400 });
  if (!subj || !text) return Response.json({ error: "Subjek & isi wajib diisi" }, { status: 400 });
  if (subj.length > 200 || text.length > 20000)
    return Response.json({ error: "Subjek/isi terlalu panjang" }, { status: 400 });
  try {
    const id = await sendMail(userId, to, subj, text);
    return Response.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED")
      return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Kirim email gagal" }, { status: 502 });
  }
}
