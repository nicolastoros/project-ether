import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { grantCreatureToUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const creatureId = (body as Record<string, unknown> | null)?.creatureId;
  if (typeof creatureId !== "string" || creatureId.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await grantCreatureToUser(session.user.id, creatureId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Creature grant failed", err);
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}
