import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { grantTamerEquipmentToUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const itemId = (body as Record<string, unknown> | null)?.itemId;
  if (typeof itemId !== "string" || itemId.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await grantTamerEquipmentToUser(session.user.id, itemId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Tamer equipment grant failed", err);
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}
