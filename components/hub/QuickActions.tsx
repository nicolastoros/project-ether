"use client";

import Link from "next/link";
import { Flame, Sparkles, ShieldHalf, Trophy, Zap } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

function buildActions(t: ReturnType<typeof useT>) {
  return [
    // Raid Battle moved into Events' "Extreme Battles" tab (see ExtremeBattlesTab.tsx) — deep-link
    // straight there instead of dropping the player on Events' default Extra tab.
    { href: "/events?tab=extreme", label: t("hub.action_raid_battle"), icon: Flame, accent: "text-red-500", featured: false },
    // The one tile that should visibly outrank the other three — it's the game's actual
    // monetization funnel, so it gets the same gold treatment as an LR pull instead of blending
    // in as a fourth identical white box.
    { href: "/gacha", label: t("nav.summon"), icon: Sparkles, accent: "text-gold-bright", featured: true },
    { href: "/inventory", label: t("hub.action_blacksmith"), icon: ShieldHalf, accent: "text-gold-bright", featured: false },
    { href: "/ranking", label: t("hub.action_ranking"), icon: Trophy, accent: "text-violet-500", featured: false },
    { href: "/overclock", label: t("hub.action_overclock"), icon: Zap, accent: "text-sky-400", featured: false },
  ] as const;
}

export function QuickActions() {
  const t = useT();
  const ACTIONS = buildActions(t);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
      {ACTIONS.map(({ href, label, icon: Icon, accent, featured }) => (
        <Link key={href} href={href}>
          <GlowPanel
            accent={featured ? "gold" : "none"}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 py-4 transition-colors",
              featured
                ? "border-gold bg-gold/10 shadow-[0_0_16px_rgba(255,184,77,0.35)] hover:bg-gold/15"
                : "border-arcade-border hover:border-gold"
            )}
          >
            <Icon className={cn(accent, "h-6 w-6", featured && "drop-shadow-[0_0_4px_rgba(255,184,77,0.7)]")} />
            <span
              className={cn(
                "font-arcade text-[10px] uppercase tracking-wide",
                featured ? "text-gold-bright" : "text-foreground"
              )}
            >
              {label}
            </span>
          </GlowPanel>
        </Link>
      ))}
    </div>
  );
}
