import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listMails } from "@/lib/gmail";
import { hitRateLimit, tooMany } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  if (!hitRateLimit(`gmail-list:${userId}`, 60)) return tooMany();
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
  const rawToken = req.nextUrl.searchParams.get("pageToken") ?? undefined;
  // pageToken opaque dari Google: tolak CRLF/control + batasi panjang.
  const pageToken =
    rawToken && rawToken.length <= 500 && !/[\r\n\u0000-\u001f\u007f]/.test(rawToken)
      ? rawToken
      : undefined;
  if (rawToken && !pageToken)
    return Response.json({ error: "pageToken tidak valid" }, { status: 400 });
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
