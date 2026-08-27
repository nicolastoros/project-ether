"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import * as db from "@/lib/db/bigquery";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function searchUsers(query: string) {
  const userId = await requireAuth();
  if (!query || query.length < 3) return [];
  const results = await db.searchUsersByUsername(query);
  
  // Serialize complex BigQuery date objects to strings and exclude self
  return results
    .filter((r) => r.user_id !== userId)
    .map((r) => ({
      ...r,
      last_seen_at: r.last_seen_at ? String((r.last_seen_at as any).value || r.last_seen_at) : null,
      friendship_created_at: r.friendship_created_at ? String((r.friendship_created_at as any).value || r.friendship_created_at) : String(new Date()),
    }));
}

export async function getFriendsAndRequests() {
  const userId = await requireAuth();
  const [friendsRaw, { incoming: incomingRaw, outgoing: outgoingRaw }] = await Promise.all([
    db.getFriends(userId),
    db.getFriendRequests(userId),
  ]);
  
  // Serialize complex BigQuery date objects to plain primitives
  const friends = friendsRaw.map((f) => ({
    ...f,
    last_seen_at: f.last_seen_at ? String((f.last_seen_at as any).value || f.last_seen_at) : null,
    friendship_created_at: f.friendship_created_at ? String((f.friendship_created_at as any).value || f.friendship_created_at) : String(new Date()),
  }));
  
  const serializeRequest = (r: db.DbFriendRequest) => ({
    ...r,
    created_at: r.created_at ? String((r.created_at as any).value || r.created_at) : String(new Date()),
  });

  const incoming = incomingRaw.map(serializeRequest);
  const outgoing = outgoingRaw.map(serializeRequest);

  return { friends, incoming, outgoing };
}

export async function sendFriendRequestAction(addresseeId: string) {
  const userId = await requireAuth();
  if (userId === addresseeId) throw new Error("Cannot add yourself");
  await db.sendFriendRequest(userId, addresseeId);
  revalidatePath("/friends");
}

export async function acceptFriendRequestAction(requestId: string, addresseeId: string) {
  const userId = await requireAuth();
  await db.acceptFriendRequest(requestId, userId, addresseeId);
  revalidatePath("/friends");
}

export async function rejectFriendRequestAction(requestId: string) {
  await requireAuth(); // just ensure logged in
  await db.rejectFriendRequest(requestId);
  revalidatePath("/friends");
}
