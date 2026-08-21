import { Shield, Users, Crown } from "lucide-react";
import { MOCK_GUILD } from "@/lib/gameData";
import type { GuildRole } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { cn, formatNumber } from "@/lib/utils";

const ROLE_STYLES: Record<GuildRole, string> = {
  Leader: "bg-gold-bright text-white",
  Officer: "bg-rarity-rare text-white",
  Member: "bg-arcade-panel-light text-zinc-600 border border-arcade-border",
};

export default function GuildPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Guild</h1>
        <p className="mt-1 text-xs text-zinc-500">Coordinate with your guildmates.</p>
      </div>

      <GlowPanel className="flex items-start gap-3 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame glow-border-gold">
          <Shield className="h-7 w-7 text-gold-bright" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{MOCK_GUILD.name}</p>
            <span className="font-arcade text-[9px] text-gold-bright">Lv.{MOCK_GUILD.level}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600">
            <Users className="h-3 w-3" /> {MOCK_GUILD.memberCount}/{MOCK_GUILD.memberCap} members
          </p>
          <p className="mt-2 text-xs text-zinc-500">{MOCK_GUILD.description}</p>
        </div>
      </GlowPanel>

      <div>
        <h2 className="font-arcade text-xs glow-text-neon">Members</h2>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_GUILD.members.map((member) => (
            <GlowPanel key={member.id} accent="none" className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light font-arcade text-[10px] text-zinc-500">
                {member.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{member.name}</p>
                <p className="text-[10px] text-zinc-600">
                  Lv.{member.level} · {formatNumber(member.weeklyContribution)} pts/wk
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-arcade text-[8px] font-semibold uppercase tracking-wide shadow-sm",
                  ROLE_STYLES[member.role]
                )}
              >
                {member.role === "Leader" && <Crown className="h-2.5 w-2.5" />}
                {member.role}
              </span>
            </GlowPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
