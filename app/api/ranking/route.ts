import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGlobalRanking } from "@/lib/db/bigquery";

/** Global Ranking (app/(game)/ranking/page.tsx) — gated behind login (any signed-in player, not
 * just admins) since it's a real feature, not an admin tool, but there's no reason to expose
 * everyone's power/level to a logged-out request. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ranking = await getGlobalRanking();
  return NextResponse.json({ ranking });
}
