import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { collectExpeditionForUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const expeditionId = body?.expeditionId;
  if (typeof expeditionId !== "string" || expeditionId.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await collectExpeditionForUser(session.user.id, expeditionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Expedition collect failed", err);
    return NextResponse.json({ error: "Collect failed" }, { status: 500 });
  }
}
