import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getServerConfig, setServerMaintenanceMode } from "@/lib/db/bigquery";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const config = await getServerConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  const enabled = (body as Record<string, unknown> | null)?.enabled;
  const message = (body as Record<string, unknown> | null)?.message;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await setServerMaintenanceMode(enabled, typeof message === "string" ? message : "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update maintenance mode", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
