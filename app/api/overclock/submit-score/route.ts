import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { submitOverclockScore } from "@/lib/db/bigquery";
import { currentOverclockBoss, currentOverclockWeekId } from "@/lib/overclock";

/** The server computes the current week id and boss itself (lib/overclock.ts) rather than trusting
 * anything the client sends — a spoofed week id could otherwise let a player log a Week 12 score
 * into Week 1's leaderboard. Only `damage` comes from the request body. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const damage = (body as Record<string, unknown> | null)?.damage;
  if (typeof damage !== "number" || !Number.isFinite(damage) || damage < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const weekId = currentOverclockWeekId();
    const boss = currentOverclockBoss();
    await submitOverclockScore(session.user.id, weekId, boss.id, Math.round(damage));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Overclock score submit failed", err);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
