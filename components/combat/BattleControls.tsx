"use client";

import { motion } from "framer-motion";
import { Bot, FastForward } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";

interface BattleControlsProps {
  className?: string;
}

/** Auto-Battle + Speed (x1/x2) toggle pills, shared by all 3 battle screens (Campaign/Raid/
 * Overclock) and every pre-battle team picker — two independent, combinable preferences (see
 * lib/store.ts's autoBattleEnabled/skipAnimationEnabled doc comments). Sized and colored to be
 * impossible to miss (per explicit feedback that the original pair read as too small/easy to
 * lose track of) — active state isn't just a border tint, it's a solid fill plus a slow pulse,
 * and the speed pill's own label swaps text (X1 -> X2) instead of relying on color alone. */
export function BattleControls({ className }: BattleControlsProps) {
  const t = useT();
  const autoBattleEnabled = useGameStore((s) => s.autoBattleEnabled);
  const skipAnimationEnabled = useGameStore((s) => s.skipAnimationEnabled);
  const toggleAutoBattle = useGameStore((s) => s.toggleAutoBattle);
  const toggleSkipAnimation = useGameStore((s) => s.toggleSkipAnimation);

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <motion.button
        type="button"
        onClick={toggleAutoBattle}
        aria-label={t("battle.auto_battle_toggle_aria")}
        aria-pressed={autoBattleEnabled}
        animate={autoBattleEnabled ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={autoBattleEnabled ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : undefined}
        className={cn(
          "flex items-center gap-1.5 rounded-full border-2 px-3 py-2 font-arcade text-[11px] uppercase tracking-wide transition-colors sm:px-4 sm:py-2.5 sm:text-sm",
          autoBattleEnabled
            ? "border-gold bg-gold text-white shadow-[0_0_14px_rgba(255,184,77,0.75)]"
            : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
        )}
      >
        <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
        {t("battle.auto_battle_label")}
      </motion.button>
      <motion.button
        type="button"
        onClick={toggleSkipAnimation}
        aria-label={t("battle.skip_animation_toggle_aria")}
        aria-pressed={skipAnimationEnabled}
        animate={skipAnimationEnabled ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={skipAnimationEnabled ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : undefined}
        className={cn(
          "flex items-center gap-1.5 rounded-full border-2 px-3 py-2 font-arcade text-[11px] font-bold uppercase tracking-wide transition-colors sm:px-4 sm:py-2.5 sm:text-sm",
          skipAnimationEnabled
            ? "border-red-400 bg-red-500 text-white shadow-[0_0_14px_rgba(239,68,68,0.75)]"
            : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
        )}
      >
        {/* The fast-forward icon disambiguates X2 as playback speed, not a reward/loot multiplier
            (a real "2x rewards" reading someone flagged once the label became a bare "X2"). */}
        <FastForward className="h-4 w-4 sm:h-5 sm:w-5" />
        {skipAnimationEnabled ? t("battle.speed_x2") : t("battle.speed_x1")}
      </motion.button>
    </div>
  );
}
