import { connectedEmail } from "@/lib/google";
import { getSessionUser } from "@/lib/session";

const NO_STORE = { headers: { "Cache-Control": "private, no-store" } };

export async function GET() {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ connected: false }, NO_STORE);
  const email = await connectedEmail(userId);
  if (!email) return Response.json({ connected: false }, NO_STORE);
  return Response.json({ connected: true, email }, NO_STORE);
}
