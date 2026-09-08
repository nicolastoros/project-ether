import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { claimStarterGiftsForUser } from "@/lib/db/bigquery";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const granted = await claimStarterGiftsForUser(session.user.id);
    return NextResponse.json({ granted });
  } catch (err) {
    console.error("Failed to claim starter gifts", err);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }
}
