import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOverclockHistoryForUser, getOverclockLeaderboard } from "@/lib/db/bigquery";
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
    const [{ rankings, computedAt, nextUpdateAt }, history] = await Promise.all([
      getOverclockLeaderboard(weekId),
      getOverclockHistoryForUser(session.user.id),
    ]);
    const yourEntry = rankings.find((r) => r.userId === session.user.id) ?? null;

    return NextResponse.json({
      weekNumber: currentOverclockWeekNumber(),
      bossName: boss.name,
      rankings,
      computedAt,
      nextUpdateAt,
      yourRank: yourEntry?.rank ?? null,
      history,
    });
  } catch (err) {
    console.error("Overclock leaderboard fetch failed", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
