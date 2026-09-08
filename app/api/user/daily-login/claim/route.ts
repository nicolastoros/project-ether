import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { claimDailyLoginForUser } from "@/lib/db/bigquery";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always the server's own clock — see app/api/user/daily-login/route.ts's todayParts comment.
  const d = new Date();
  const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const dayOfMonth = d.getUTCDate();

  try {
    const items = await claimDailyLoginForUser(session.user.id, dateStr, dayOfMonth);
    if (!items) {
      return NextResponse.json({ granted: false });
    }
    return NextResponse.json({ granted: true, items });
  } catch (err) {
    console.error("Daily login claim failed", err);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }
}
