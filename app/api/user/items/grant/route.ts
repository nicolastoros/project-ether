import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { grantItemToUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const itemId = (body as Record<string, unknown> | null)?.itemId;
  const quantity = (body as Record<string, unknown> | null)?.quantity;
  if (typeof itemId !== "string" || itemId.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;

  try {
    await grantItemToUser(session.user.id, itemId, qty);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Item grant failed", err);
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}
