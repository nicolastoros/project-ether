import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startExpeditionForUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = body?.id;
  const defId = body?.defId;
  const creatureIds = body?.creatureIds;
  const startedAt = body?.startedAt;
  const durationMs = body?.durationMs;
  if (
    typeof id !== "string" ||
    typeof defId !== "string" ||
    !Array.isArray(creatureIds) ||
    !creatureIds.every((c) => typeof c === "string") ||
    typeof startedAt !== "number" ||
    typeof durationMs !== "number"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await startExpeditionForUser(session.user.id, { id, defId, creatureIds, startedAt, durationMs });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Expedition start failed", err);
    return NextResponse.json({ error: "Start failed" }, { status: 500 });
  }
}
