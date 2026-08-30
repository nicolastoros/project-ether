import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { setUserBanned } from "@/lib/db/bigquery";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const { id } = await params;
  if (id === gate.session.user.id) {
    return NextResponse.json({ error: "Can't ban your own account" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const banned = (body as Record<string, unknown> | null)?.banned;
  if (typeof banned !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await setUserBanned(id, banned);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update ban status", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
