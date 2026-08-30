import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** Every app/api/admin/* route calls this first. Returns the session when the caller is a real,
 * authenticated admin; otherwise returns a ready-to-return NextResponse (401/403) so the route can
 * just do `const gate = await requireAdmin(); if (gate.response) return gate.response;`. Session
 * `isAdmin` comes straight from the JWT (see auth.ts), itself sourced from the DB's is_admin column
 * at login time — never trust a client-supplied admin flag for this. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (!session.user.isAdmin) {
    return { session: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session, response: null } as const;
}
