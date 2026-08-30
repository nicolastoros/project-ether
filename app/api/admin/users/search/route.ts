import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { searchUsersForAdmin } from "@/lib/db/bigquery";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length === 0) {
    return NextResponse.json({ users: [] });
  }

  try {
    const users = await searchUsersForAdmin(q);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("Admin user search failed", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
