import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { setUserCurrency } from "@/lib/db/bigquery";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;

  const updates: { gold?: number; gems?: number; sealCoins?: number } = {};
  for (const [key, target] of [["gold", "gold"], ["gems", "gems"], ["sealCoins", "sealCoins"]] as const) {
    const value = body?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      updates[target] = Math.round(value);
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid currency fields provided" }, { status: 400 });
  }

  try {
    await setUserCurrency(id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update user currency", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
