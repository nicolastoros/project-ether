import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unlockAchievement } from "@/lib/db/bigquery";
import { ACHIEVEMENTS } from "@/lib/gameData";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const achievementId = (body as Record<string, unknown> | null)?.achievementId;
  if (typeof achievementId !== "string" || !ACHIEVEMENTS.some((a) => a.id === achievementId)) {
    return NextResponse.json({ error: "Unknown achievementId" }, { status: 400 });
  }

  try {
    const result = await unlockAchievement(session.user.id, achievementId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to unlock achievement", err);
    return NextResponse.json({ error: "Unlock failed" }, { status: 500 });
  }
}
