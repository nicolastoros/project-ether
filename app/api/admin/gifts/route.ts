import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminGift, getUserByUsername } from "@/lib/db/bigquery";
import { ITEM_CATALOG, GACHA_CREATURE_POOL } from "@/lib/gameData";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const type = body?.type;
  const itemId = typeof body?.itemId === "string" ? body.itemId : undefined;
  const creatureId = typeof body?.creatureId === "string" ? body.creatureId : undefined;
  const quantity = typeof body?.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;
  const message = typeof body?.message === "string" && body.message.trim() ? body.message.trim() : "A gift from the team!";
  // Empty/missing username means broadcast to everyone (present AND future accounts — see
  // getPendingAdminGifts's target_user_id IS NULL match).
  const targetUsername = typeof body?.targetUsername === "string" ? body.targetUsername.trim() : "";

  if (type !== "item" && type !== "creature") {
    return NextResponse.json({ error: "type must be 'item' or 'creature'" }, { status: 400 });
  }
  if (type === "item" && (!itemId || !ITEM_CATALOG.some((i) => i.id === itemId))) {
    return NextResponse.json({ error: "Unknown itemId" }, { status: 400 });
  }
  // Raid-boss creatures (see GACHA_CREATURE_POOL's filter) are excluded here too — no user should
  // own one yet, gifting is not a backdoor around that.
  if (type === "creature" && (!creatureId || !GACHA_CREATURE_POOL.some((c) => c.id === creatureId))) {
    return NextResponse.json({ error: "Unknown creatureId" }, { status: 400 });
  }

  let targetUserId: string | null = null;
  if (targetUsername) {
    const user = await getUserByUsername(targetUsername);
    if (!user) {
      return NextResponse.json({ error: `No user named "${targetUsername}"` }, { status: 404 });
    }
    targetUserId = user.id;
  }

  try {
    const gift = await createAdminGift({
      targetUserId,
      type,
      itemId: type === "item" ? itemId : undefined,
      creatureId: type === "creature" ? creatureId : undefined,
      quantity,
      message,
      createdBy: gate.session.user.id,
    });
    return NextResponse.json({ ok: true, giftId: gift.id, broadcast: targetUserId === null });
  } catch (err) {
    console.error("Failed to create admin gift", err);
    return NextResponse.json({ error: "Failed to send gift" }, { status: 500 });
  }
}
