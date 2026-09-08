import Link from "next/link";
import { Flame, Sparkles, ShieldHalf, Trophy } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/raid", label: "Raid Battle", icon: Flame, accent: "text-red-500", featured: false },
  // The one tile that should visibly outrank the other three — it's the game's actual
  // monetization funnel, so it gets the same gold treatment as an LR pull instead of blending
  // in as a fourth identical white box.
  { href: "/gacha", label: "Summon", icon: Sparkles, accent: "text-gold-bright", featured: true },
  { href: "/inventory", label: "Blacksmith", icon: ShieldHalf, accent: "text-gold-bright", featured: false },
  { href: "/ranking", label: "Ranking", icon: Trophy, accent: "text-violet-500", featured: false },
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
