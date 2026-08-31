import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sellCreatureFromUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const creatureId = (body as Record<string, unknown> | null)?.creatureId;
  const quantity = (body as Record<string, unknown> | null)?.quantity;
  if (typeof creatureId !== "string" || creatureId.length === 0 || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await sellCreatureFromUser(session.user.id, creatureId, quantity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Creature sell failed", err);
    return NextResponse.json({ error: "Sell failed" }, { status: 500 });
  }
}
