import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { consumeItemForUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const itemId = body?.itemId;
  const quantity = body?.quantity;
  if (typeof itemId !== "string" || itemId.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;

  try {
    await consumeItemForUser(session.user.id, itemId, qty);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Item consume failed", err);
    return NextResponse.json({ error: "Consume failed" }, { status: 500 });
  }
}
