import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerConfig, isUserBanned } from "@/lib/db/bigquery";

/** Polled by every logged-in client (see components/auth/GameGate.tsx) to decide whether to
 * redirect to /maintenance, and whether to sign the caller out because they were banned mid-
 * session (see isUserBanned's comment — a JWT session can't otherwise be revoked early).
 * Deliberately not under app/api/admin/* — any authenticated user needs to read this, only
 * writing maintenance (app/api/admin/maintenance) is admin-gated. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [config, isBanned] = await Promise.all([getServerConfig(), isUserBanned(session.user.id)]);
  return NextResponse.json({ ...config, isBanned });
}
