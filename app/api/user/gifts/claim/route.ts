import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { claimAdminGift } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const giftId = (body as Record<string, unknown> | null)?.giftId;
  if (typeof giftId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await claimAdminGift(giftId, session.user.id);
    if (!result.ok) {
      return NextResponse.json({ error: "Gift not found or already claimed" }, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to claim admin gift", err);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }
}
