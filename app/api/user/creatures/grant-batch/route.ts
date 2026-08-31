import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { grantCreaturesToUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const creatureIds = (body as Record<string, unknown> | null)?.creatureIds;
  if (!Array.isArray(creatureIds) || creatureIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (creatureIds.length === 0) {
    return NextResponse.json({ ok: true });
  }

  try {
    await grantCreaturesToUser(session.user.id, creatureIds as string[]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Batch creature grant failed", err);
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}
