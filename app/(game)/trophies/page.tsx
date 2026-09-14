"use client";

import { Award, Lock } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import { getAchievementName, getAchievementDescription } from "@/lib/i18n/achievementDescriptions";

export default function TrophiesPage() {
  const t = useT();
  const language = useGameStore((s) => s.language);
  const unlocked = useGameStore((s) => s.achievements);
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">{t("trophies.title")}</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {unlockedCount}/{ACHIEVEMENTS.length}{t("trophies.unlocked_suffix")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlocked.includes(achievement.id);
          return (
            <GlowPanel
              key={achievement.id}
              accent={isUnlocked ? "gold" : "none"}
              className={cn(
                "flex flex-col items-center gap-2 p-4 text-center",
                !isUnlocked && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border",
                  isUnlocked
                    ? "border-gold bg-gradient-to-br from-gold/25 to-gold/5 glow-border-gold"
                    : "border-arcade-border bg-arcade-panel-light"
                )}
              >
                {isUnlocked ? (
                  <Award className="h-7 w-7 text-gold-bright" />
                ) : (
                  <Lock className="h-6 w-6 text-zinc-400" />
                )}
              </div>
              <p className={cn("text-sm font-semibold", isUnlocked ? "text-foreground" : "text-zinc-500")}>
                {getAchievementName(achievement, language)}
              </p>
              <p className="text-[11px] leading-snug text-zinc-500">{getAchievementDescription(achievement, language)}</p>
            </GlowPanel>
          );
        })}
      </div>
    </div>
  );
}
