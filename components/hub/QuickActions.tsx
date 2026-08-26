import Link from "next/link";
import { Flame, Sparkles, ShieldHalf, Trophy } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";

const ACTIONS = [
  { href: "/raid", label: "Raid Battle", icon: Flame, accent: "text-red-500" },
  { href: "/gacha", label: "Summon", icon: Sparkles, accent: "text-neon" },
  { href: "/inventory", label: "Blacksmith", icon: ShieldHalf, accent: "text-gold-bright" },
  { href: "/pvp", label: "Arena", icon: Trophy, accent: "text-violet-500" },
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {ACTIONS.map(({ href, label, icon: Icon, accent }) => (
        <Link key={href} href={href}>
          <GlowPanel
            accent="none"
            className="flex flex-col items-center justify-center gap-1.5 border-arcade-border py-4 transition-colors hover:border-gold"
          >
            <Icon className={accent + " h-6 w-6"} />
            <span className="font-arcade text-[10px] uppercase tracking-wide text-foreground">
              {label}
            </span>
          </GlowPanel>
        </Link>
      ))}
    </div>
  );
}
