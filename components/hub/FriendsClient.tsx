"use client";

import { useState } from "react";
import { UserPlus, Swords, Check, X, Search, Loader2 } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";
import type { DbFriend, DbFriendRequest } from "@/lib/db/bigquery";
import {
  searchUsers,
  sendFriendRequestAction,
  acceptFriendRequestAction,
  rejectFriendRequestAction,
} from "@/app/actions/friends";

const STATUS_STYLES = {
  Online: "bg-emerald-400",
  "In Battle": "bg-amber-400",
  Offline: "bg-zinc-600",
};

export function FriendsClient({
  initialFriends,
  initialIncoming,
  initialOutgoing,
}: {
  initialFriends: DbFriend[];
  initialIncoming: DbFriendRequest[];
  initialOutgoing: DbFriendRequest[];
}) {
  const [tab, setTab] = useState<"friends" | "add" | "requests">("friends");

  const [friends, setFriends] = useState(initialFriends);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);

  // Search state
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DbFriend[]>([]);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || query.length < 3) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setLoadingActions((prev) => ({ ...prev, [userId]: true }));
    try {
      await sendFriendRequestAction(userId);
      // Optimistically add to outgoing
      setOutgoing([
        ...outgoing,
        {
          id: "temp-" + userId,
          requester_id: "me",
          addressee_id: userId,
          status: "pending",
          created_at: new Date(),
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActions((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleAccept = async (requestId: string, addresseeId: string) => {
    setLoadingActions((prev) => ({ ...prev, [requestId]: true }));
    try {
      await acceptFriendRequestAction(requestId, addresseeId);
      // Remove from incoming list
      const req = incoming.find((r) => r.id === requestId);
      setIncoming(incoming.filter((r) => r.id !== requestId));
      if (req) {
        setFriends([
          ...friends,
          {
            user_id: req.requester_id,
            username: req.other_username ?? "Unknown",
            display_name: req.other_display_name ?? "Unknown",
            level: req.other_level ?? 1,
            avatar_key: req.other_avatar_key ?? "default",
            is_online: false,
            is_in_battle: false,
            last_seen_at: null,
            friendship_created_at: { value: new Date().toISOString() },
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActions((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleReject = async (requestId: string) => {
    setLoadingActions((prev) => ({ ...prev, [requestId]: true }));
    try {
      await rejectFriendRequestAction(requestId);
      setIncoming(incoming.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActions((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Friends</h1>
          <p className="mt-1 text-xs text-zinc-500">{friends.length} friends</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-white/60 bg-white/60 backdrop-blur-sm p-1 shadow-sm">
        <button
          onClick={() => setTab("friends")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 font-arcade text-[10px] uppercase tracking-wider transition-colors",
            tab === "friends" ? "bg-foreground text-white shadow-sm" : "text-zinc-500 hover:text-foreground hover:bg-black/5"
          )}
        >
          My Friends
        </button>
        <button
          onClick={() => setTab("add")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 font-arcade text-[10px] uppercase tracking-wider transition-colors",
            tab === "add" ? "bg-foreground text-white shadow-sm" : "text-zinc-500 hover:text-foreground hover:bg-black/5"
          )}
        >
          Add Friend
        </button>
        <button
          onClick={() => setTab("requests")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 font-arcade text-[10px] uppercase tracking-wider transition-colors relative",
            tab === "requests" ? "bg-foreground text-white shadow-sm" : "text-zinc-500 hover:text-foreground hover:bg-black/5"
          )}
        >
          Requests
          {incoming.length > 0 && (
            <span className="absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-arcade text-[8px] text-white shadow-sm ring-2 ring-white">
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === "friends" && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {friends.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-zinc-500">
              No friends yet. Head to "Add Friend" to find some!
            </div>
          ) : (
            friends.map((friend) => {
              const status = friend.is_online ? "Online" : "Offline";
              return (
                <GlowPanel
                  key={friend.user_id}
                  accent="none"
                  className="flex items-center gap-3 p-3 transition-colors hover:border-gold"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-arcade-bg font-arcade text-base text-foreground shadow-sm">
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-arcade-panel",
                        STATUS_STYLES[status]
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{friend.display_name}</p>
                    <p className="text-[11px] text-zinc-600">
                      Lv.{friend.level} {friend.title} · {friend.creature_count} Monsters
                    </p>
                    <p className="text-[10px] text-zinc-400">@{friend.username}</p>
                  </div>
                  <button
                    aria-label={`Challenge ${friend.username}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:border-gold hover:text-gold-ink hover:bg-orange-50"
                  >
                    <Swords className="h-5 w-5" />
                  </button>
                </GlowPanel>
              );
            })
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Tamer ID (username)..."
              className="flex-1 rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm text-foreground shadow-sm placeholder:text-zinc-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <PixelButton type="submit" size="sm" variant="neon" disabled={isSearching || query.length < 3}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </PixelButton>
          </form>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((user) => {
              const isFriend = friends.some((f) => f.user_id === user.user_id);
              const isPending = outgoing.some((r) => r.addressee_id === user.user_id);

              return (
                <GlowPanel key={user.user_id} accent="none" className="flex items-center gap-3 p-3 transition-colors hover:border-neon">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-arcade-bg font-arcade text-base text-foreground shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{user.display_name}</p>
                    <p className="text-[11px] text-zinc-600">
                      Lv.{user.level} {user.title} · {user.creature_count} Monsters
                    </p>
                    <p className="text-[10px] text-zinc-400">@{user.username}</p>
                  </div>
                  {isFriend ? (
                    <span className="font-arcade text-[9px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">FRIEND</span>
                  ) : isPending ? (
                    <span className="font-arcade text-[9px] text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full border border-zinc-200">PENDING</span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(user.user_id)}
                      disabled={loadingActions[user.user_id]}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:border-neon hover:text-neon-ink hover:bg-teal-50 disabled:opacity-50"
                    >
                      {loadingActions[user.user_id] ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <UserPlus className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </GlowPanel>
              );
            })}
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          <h2 className="font-arcade text-[10px] text-zinc-400 uppercase tracking-wider">Incoming</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {incoming.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-zinc-600">No incoming requests.</div>
            ) : (
              incoming.map((req) => (
                <GlowPanel key={req.id} accent="none" className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{req.other_display_name}</p>
                    <p className="text-xs text-zinc-600">@{req.other_username}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleAccept(req.id, req.requester_id)}
                      disabled={loadingActions[req.id]}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-emerald-50 text-emerald-600 shadow-sm transition-colors hover:bg-emerald-500 hover:text-white disabled:opacity-50"
                    >
                      {loadingActions[req.id] ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 stroke-[3]" />}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={loadingActions[req.id]}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-50 text-red-500 shadow-sm transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
                    >
                      {loadingActions[req.id] ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5 stroke-[3]" />}
                    </button>
                  </div>
                </GlowPanel>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
