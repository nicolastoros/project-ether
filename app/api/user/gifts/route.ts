import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPendingAdminGifts } from "@/lib/db/bigquery";

/** Polled by GameGate to merge admin-sent gifts (targeted or broadcast) into the local gifts
 * inbox — see components/layout/GiftsModal.tsx's handling of the "admin-gift-" id prefix. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gifts = await getPendingAdminGifts(session.user.id);
    return NextResponse.json({ gifts });
  } catch (err) {
    console.error("Failed to load pending admin gifts", err);
    return NextResponse.json({ error: "Failed to load gifts" }, { status: 500 });
  }
}
