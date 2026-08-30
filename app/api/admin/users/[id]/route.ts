import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getUserAdminDetail } from "@/lib/db/bigquery";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const { id } = await params;
  try {
    const detail = await getUserAdminDetail(id);
    if (!detail) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    console.error("Failed to load admin user detail", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
