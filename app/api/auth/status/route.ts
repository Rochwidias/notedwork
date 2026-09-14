import { connectedEmail } from "@/lib/google";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUser();
  if (!userId) return Response.json({ connected: false });
  const email = await connectedEmail(userId);
  if (!email) return Response.json({ connected: false });
  return Response.json({ connected: true, email });
}
