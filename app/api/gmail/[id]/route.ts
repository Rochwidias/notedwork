import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getMail } from "@/lib/gmail";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const mail = await getMail(userId, id);
    return Response.json({ mail });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "NOT_CONNECTED" || msg === "REFRESH_FAILED")
      return Response.json({ error: "NOT_CONNECTED" }, { status: 401 });
    return Response.json({ error: "Gmail detail gagal" }, { status: 502 });
  }
}
