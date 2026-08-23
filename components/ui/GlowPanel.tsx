import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlowPanelProps extends HTMLAttributes<HTMLDivElement> {
  accent?: "gold" | "neon" | "none";
  pixel?: boolean;
}

export function GlowPanel({
  accent = "gold",
  pixel = true,
  className,
  children,
  ...props
}: GlowPanelProps) {
  return (
    <div
      className={cn(
        "relative bg-arcade-panel/95 shadow-sm backdrop-blur-sm",
        pixel && "pixel-frame",
        accent === "gold" && "glow-border-gold",
        accent === "neon" && "glow-border-neon",
        accent === "none" && "border border-arcade-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
