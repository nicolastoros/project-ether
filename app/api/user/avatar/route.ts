import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setUserAvatar } from "@/lib/db/bigquery";
import { AVATAR_CATALOG } from "@/lib/gameData";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const avatarKey = body?.avatarKey;
  if (typeof avatarKey !== "string" || !AVATAR_CATALOG.some((a) => a.key === avatarKey)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await setUserAvatar(session.user.id, avatarKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Avatar update failed", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
