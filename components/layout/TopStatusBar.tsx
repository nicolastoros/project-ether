"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { LogOut, Mail, BookOpen, CalendarDays, Languages, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { MAX_LEVEL } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n/useT";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { NewBadge } from "@/components/ui/NewBadge";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { MonsterGuideModal } from "@/components/ui/MonsterGuideModal";
import { xpPercent } from "@/lib/utils";
import { GiftsModal } from "./GiftsModal";
import { DailyLoginModal } from "./DailyLoginModal";
import { ProfileModal } from "./ProfileModal";

export function TopStatusBar() {
  const profile = useGameStore((s) => s.profile);
  const currencies = useGameStore((s) => s.currencies);
  const gifts = useGameStore((s) => s.gifts) || [];
  const hasUnseenProfile = useGameStore((s) => s.hasUnseenProfile);
  const logout = useGameStore((s) => s.logout);
  const language = useGameStore((s) => s.language);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const router = useRouter();
  const t = useT();
  const [showGifts, setShowGifts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showDailyLogin, setShowDailyLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dailyLoginAvailable, setDailyLoginAvailable] = useState(false);

  // Cheap status-only check so the nav dot only lights up when today's reward is actually still
  // unclaimed — a plain GET, no claim attempted (see DailyLoginModal for the actual claim flow).
  useEffect(() => {
    fetch("/api/user/daily-login")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDailyLoginAvailable(Boolean(data && !data.claimedToday)))
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-arcade-border bg-arcade-panel/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-2.5 lg:px-6">
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="flex min-w-0 items-center gap-2 text-left lg:hidden"
        >
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gold bg-arcade-panel-light glow-border-gold">
              <ProfileAvatar avatarKey={profile.avatarKey} iconClassName="h-5 w-5" />
            </div>
            {hasUnseenProfile && <NewBadge className="-right-1 -top-1 h-3.5 w-3.5" />}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-gold text-white shadow-sm"
            >
              <Pencil className="h-2 w-2" strokeWidth={2.5} />
            </span>
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
        </button>

        {/* flex-wrap is the safety net — on the narrowest phones 3 currency pills + 4 icon
            buttons won't all fit one line, so this lets it wrap to a second row (right-aligned)
            instead of clipping/overflowing off-screen. */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          <CurrencyPill
            icon={<GoldCoinIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            value={currencies.gold}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2"
          />
          <CurrencyPill
            icon={<CrownIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            value={currencies.gems}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2"
          />
          {/* Shortest path from "I'm low on Lacrima" to "buy more" — a persistent "+" shortcut
              straight into the Shop's Premium tab, the industry-standard placement for premium
              currency (always visible next to the balance itself, not buried in a tab). Lacrima
              (not gems/"Currency C", which is earned by playing) is the real-money one. The "+"
              itself pulses continuously (same attention pattern as NewBadge.tsx) — it has to read
              as an obvious CTA at a glance, not blend in like a static decoration. */}
          <div className="relative">
            <CurrencyPill
              icon={<Image src="/assets/objects/lacrima.png" alt="" width={24} height={24} className="h-5 w-5 object-contain sm:h-6 sm:w-6" />}
              value={currencies.lacrima ?? 0}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2"
            />
            <motion.button
              type="button"
              onClick={() => router.push("/shop?tab=premium")}
              aria-label={t("topbar.buy_lacrima")}
              data-tour="lacrima-buy"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.3, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
              whileTap={{ scale: 0.85 }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gold-bright to-gold text-white shadow-[0_0_10px_rgba(255,184,77,0.9)] sm:h-7 sm:w-7"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3.5} />
            </motion.button>
          </div>
          {/* Language toggle — the whole "un botón para pasarlo a español" ask. Shows the current
              language's code; tapping switches to the other one. Purely a local store preference
              (see lib/store.ts's `language` field) — no server round trip, resolved instantly. */}
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
            aria-label={t("lang.switch_to")}
            title={t("lang.switch_to")}
            className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-arcade-border bg-arcade-panel-light px-2.5 text-zinc-600 transition-colors hover:border-gold hover:text-gold-bright sm:h-10 sm:px-3"
          >
            <Languages className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-arcade text-[10px] font-bold uppercase sm:text-xs">{language}</span>
          </button>
          <button
            onClick={() => setShowGifts(true)}
            aria-label={t("topbar.gifts")}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-600 transition-colors hover:border-gold hover:text-gold-bright sm:h-10 sm:w-10"
          >
            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            {gifts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {gifts.length}
              </span>
            )}
          </button>
          {/* Gold-tinted by default (not just on hover) — this is the one nobody could find:
              nothing about a plain gray calendar icon says "there's a free reward waiting here"
              the way Gifts' red badge does, so it needs to read as valuable at rest too. */}
          <button
            onClick={() => {
              setShowDailyLogin(true);
              setDailyLoginAvailable(false);
            }}
            aria-label={t("topbar.daily_login")}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-gold-bright transition-colors hover:border-gold hover:bg-gold/20 sm:h-10 sm:w-10"
          >
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            {dailyLoginAvailable && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-arcade-panel bg-red-500" />
            )}
          </button>
          <button
            onClick={() => setShowGuide(true)}
            aria-label={t("topbar.monster_guide")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-600 transition-colors hover:border-[#38bdf8] hover:text-[#0e7490] sm:h-10 sm:w-10"
          >
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              logout();
              // "/" is the marketing landing now — a just-logged-out player wants the login form
              // back, not the pitch (see app/play/page.tsx).
              router.replace("/play");
            }}
            aria-label={t("sidebar.log_out")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-600 transition-colors hover:border-red-500 hover:text-red-500 lg:hidden"
          >
            <LogOut className="h-4 w-4" />
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
      <DailyLoginModal isOpen={showDailyLogin} onClose={() => setShowDailyLogin(false)} />
      <MonsterGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  );
}
