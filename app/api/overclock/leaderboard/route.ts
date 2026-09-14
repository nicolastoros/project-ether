import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOverclockHistoryForUser, getOverclockLeaderboard, getOverclockUserStanding } from "@/lib/db/bigquery";
import { currentOverclockBoss, currentOverclockWeekId, currentOverclockWeekNumber } from "@/lib/overclock";

/** Backs the Overclock pre-battle hub — the leaderboard itself is a snapshot refreshed at most
 * every 2 hours (see getOverclockLeaderboard's own comment for why: no cron infra in this project,
 * so it's recomputed lazily on whichever read happens to land after it goes stale), not live. This
 * same read is also what triggers the previous week's top-3 reward payout, exactly once. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const weekId = currentOverclockWeekId();
    const boss = currentOverclockBoss();
    const [{ rankings, computedAt, nextUpdateAt }, history, standing] = await Promise.all([
      getOverclockLeaderboard(weekId),
      getOverclockHistoryForUser(session.user.id),
      // Live rank, not read off `rankings` — that list is capped at the top 100 (see
      // OVERCLOCK_LEADERBOARD_SIZE), so a player outside that cut still needs a real number to
      // know how far off they are instead of just not appearing anywhere.
      getOverclockUserStanding(session.user.id, weekId),
    ]);

    return NextResponse.json({
      weekNumber: currentOverclockWeekNumber(),
      bossName: boss.name,
      rankings,
      computedAt,
      nextUpdateAt,
      yourRank: standing?.rank ?? null,
      totalPlayers: standing?.totalPlayers ?? 0,
      history,
    });
  } catch (err) {
    console.error("Overclock leaderboard fetch failed", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
