import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listMails } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const pageToken = req.nextUrl.searchParams.get("pageToken") ?? undefined;
  try {
    const { mails, nextPageToken } = await listMails(userId, q, pageToken);
    return Response.json({ mails, nextPageToken: nextPageToken ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED")
      return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Gmail list gagal" }, { status: 502 });
  }
}
