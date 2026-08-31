import { toast } from "sonner";
import type { Achievement } from "@/types/game";

/** Fires the "Trophy Unlocked" notification — needs <Toaster /> mounted (see app/layout.tsx) to
 * actually render; without it sonner's toast calls are silent no-ops, which is what was
 * previously happening to the two other toast.success calls in this codebase (Hidden Potential,
 * Super Attack) before <Toaster /> was added alongside this. Uses toast.custom for a gold/arcade-
 * styled card instead of sonner's default look, matching the rest of the game's visual language
 * (font-arcade, glow-text-gold, border-gold) rather than a generic notification. */
export function notifyAchievementUnlocked(achievement: Achievement): void {
  toast.custom(
    () => (
      <div className="flex items-center gap-3 rounded-2xl border border-gold bg-arcade-panel px-4 py-3 shadow-[0_2px_16px_-2px_rgba(255,184,77,0.5)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/70 bg-gold/10">
          <span className="text-lg">🏆</span>
        </div>
        <div className="min-w-0">
          <p className="font-arcade text-[10px] uppercase tracking-wide text-gold-bright">Trophy Unlocked</p>
          <p className="truncate text-sm font-semibold text-foreground">{achievement.name}</p>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
