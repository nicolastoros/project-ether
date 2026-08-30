import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getServerStats } from "@/lib/db/bigquery";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const stats = await getServerStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Failed to load server stats", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
