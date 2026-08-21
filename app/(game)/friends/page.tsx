import { UserPlus, Swords } from "lucide-react";
import { MOCK_FRIENDS } from "@/lib/gameData";
import type { FriendStatus } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<FriendStatus, string> = {
  Online: "bg-emerald-400",
  "In Battle": "bg-amber-400",
  Offline: "bg-zinc-600",
};

export default function FriendsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Friends</h1>
          <p className="mt-1 text-xs text-zinc-500">{MOCK_FRIENDS.length} friends</p>
        </div>
        <PixelButton size="sm" variant="neon">
          <UserPlus className="h-3.5 w-3.5" />
        </PixelButton>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_FRIENDS.map((friend) => (
          <GlowPanel
            key={friend.id}
            accent="none"
            className="flex items-center gap-3 p-3 transition-colors hover:border-gold"
          >
            <div className="relative shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light font-arcade text-xs text-zinc-600">
                {friend.name.charAt(0)}
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-arcade-panel",
                  STATUS_STYLES[friend.status]
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{friend.name}</p>
              <p className="text-[10px] text-zinc-600">
                Lv.{friend.level} · {friend.status === "Offline" ? friend.lastActive : friend.status}
              </p>
            </div>
            <button
              aria-label={`Challenge ${friend.name}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-500 transition-colors hover:border-gold hover:text-gold-ink"
            >
              <Swords className="h-3.5 w-3.5" />
            </button>
          </GlowPanel>
        ))}
      </div>
    </div>
  );
}
