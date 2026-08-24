import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncPlayerProgress } from "@/lib/db/bigquery";

interface SyncCreature {
  creatureId: string;
  level: number;
  exp: number;
  expToNextLevel: number;
}

function isSyncCreature(value: unknown): value is SyncCreature {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.creatureId === "string" &&
    typeof c.level === "number" &&
    typeof c.exp === "number" &&
    typeof c.expToNextLevel === "number"
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { level, exp, expToNextLevel, creatures } = body as Record<string, unknown>;
  if (
    typeof level !== "number" ||
    typeof exp !== "number" ||
    typeof expToNextLevel !== "number" ||
    !Array.isArray(creatures)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await syncPlayerProgress(session.user.id, {
      level,
      exp,
      expToNextLevel,
      creatures: creatures.filter(isSyncCreature),
    });
  } catch (err) {
    console.error("Progress sync failed", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
