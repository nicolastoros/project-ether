import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccountBundle } from "@/lib/db/bigquery";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bundle = await getAccountBundle(session.user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(bundle);
}
