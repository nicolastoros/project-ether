import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { grantTamerAvatarToUser } from "@/lib/db/bigquery";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tamerId = body?.tamerId;
  if (typeof tamerId !== "string" || tamerId.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await grantTamerAvatarToUser(session.user.id, tamerId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Tamer avatar grant failed", err);
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}
