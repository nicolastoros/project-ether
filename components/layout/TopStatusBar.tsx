"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { UserCircle2, LogOut, Mail, BookOpen } from "lucide-react";
import { useState } from "react";
import { MAX_LEVEL } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { MonsterGuideModal } from "@/components/ui/MonsterGuideModal";
import { xpPercent } from "@/lib/utils";
import { GiftsModal } from "./GiftsModal";

export function TopStatusBar() {
  const profile = useGameStore((s) => s.profile);
  const currencies = useGameStore((s) => s.currencies);
  const gifts = useGameStore((s) => s.gifts) || [];
  const logout = useGameStore((s) => s.logout);
  const router = useRouter();
  const [showGifts, setShowGifts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-arcade-border bg-arcade-panel/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-2.5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold bg-arcade-panel-light glow-border-gold">
            <UserCircle2 className="h-5 w-5 text-gold-bright" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {profile.name}{" "}
              <span className="text-zinc-600">Lv.{profile.level}</span>
            </p>
            <p className="truncate text-[10px] text-zinc-600">{profile.title}</p>
            {profile.level < MAX_LEVEL && (
              <ProgressBar
                percent={xpPercent(profile.exp, profile.expToNextLevel)}
                color="exp"
                className="mt-1 max-w-32"
              />
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5" />} value={currencies.gold} />
          <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5" />} value={currencies.gems} />
          <button
            onClick={() => setShowGifts(true)}
            aria-label="Gifts"
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-600 transition-colors hover:border-gold hover:text-gold-bright"
          >
            <Mail className="h-3.5 w-3.5" />
            {gifts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
                {gifts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowGuide(true)}
            aria-label="Monster Guide"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-600 transition-colors hover:border-[#38bdf8] hover:text-[#0e7490]"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              logout();
              router.replace("/");
            }}
            aria-label="Log out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-600 transition-colors hover:border-red-500 hover:text-red-500 lg:hidden"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-3 pb-2 lg:px-6">
        <ProgressBar
          percent={(currencies.energy / currencies.energyMax) * 100}
          color="energy"
          label={`Energy ${currencies.energy}/${currencies.energyMax}`}
          className="lg:max-w-xs"
        />
      </div>

      <GiftsModal isOpen={showGifts} onClose={() => setShowGifts(false)} />
      <MonsterGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </header>
  );
}
