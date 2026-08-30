import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { grantItemsToUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const items = (body as Record<string, unknown> | null)?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const parsed = items
    .map((entry) => {
      const e = entry as Record<string, unknown>;
      const itemId = typeof e?.itemId === "string" ? e.itemId : null;
      const quantity = typeof e?.quantity === "number" && e.quantity > 0 ? e.quantity : 1;
      return itemId ? { itemId, quantity } : null;
    })
    .filter((e): e is { itemId: string; quantity: number } => e !== null);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await grantItemsToUser(session.user.id, parsed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Batch item grant failed", err);
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}
