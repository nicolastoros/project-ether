import type { LucideIcon } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";

interface PlaceholderViewProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PlaceholderView({ icon: Icon, title, description }: PlaceholderViewProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <GlowPanel accent="neon" className="flex flex-col items-center gap-3 px-8 py-10">
        <Icon className="h-10 w-10 text-neon" />
        <h1 className="font-arcade text-sm glow-text-neon">{title}</h1>
        <p className="max-w-xs text-xs text-zinc-500">{description}</p>
        <p className="font-arcade text-[9px] uppercase tracking-wide text-zinc-600">
          Coming in the next build step
        </p>
      </GlowPanel>
    </div>
  );
}
