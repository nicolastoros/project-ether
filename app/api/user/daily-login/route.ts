import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDailyLoginClaimedDates, getDailyLoginRewardItems } from "@/lib/db/bigquery";

/** "YYYY-MM-DD" / "YYYY-MM" in the SERVER's local sense (UTC, since that's what a serverless
 * function's clock actually is) — deliberately not client-supplied, so a player can't spoof their
 * system clock to claim ahead. */
function todayParts() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return { dateStr: `${yyyy}-${mm}-${dd}`, monthPrefix: `${yyyy}-${mm}`, dayOfMonth: d.getUTCDate() };
}

/** Status only — powers the calendar grid without claiming anything. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dateStr, monthPrefix, dayOfMonth } = todayParts();
  const claimedDates = await getDailyLoginClaimedDates(session.user.id, monthPrefix);
  return NextResponse.json({
    today: dateStr,
    dayOfMonth,
    claimedDates,
    claimedToday: claimedDates.includes(dateStr),
    todayReward: getDailyLoginRewardItems(dayOfMonth),
  });
}
