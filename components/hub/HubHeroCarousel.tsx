"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { GACHA_BANNERS } from "@/lib/gameData";
import { RAID_EVENTS } from "@/lib/raidBosses";
import { currentOverclockBoss, currentOverclockWeekNumber, nextOverclockResetAt } from "@/lib/overclock";
import { getRaidEventDescription } from "@/lib/i18n/raidDescriptions";
import { getGachaBannerTagline } from "@/lib/i18n/shopDescriptions";
import { useT } from "@/lib/i18n/useT";
import { useGameStore } from "@/lib/store";
import type { Language, TranslationKey } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

interface HeroSlide {
  id: string;
  image: string;
  label: string;
  title: string | null;
  subtitle: string;
  href: string;
  /** object-position for the crop — "center 80%" (biased toward the bottom of the source) suits
   * portada.png, but each banner's subject sits at a different height in its own frame, so this
   * is tuned per slide instead of forced to one global value. */
  objectPosition: string;
}

// Per-banner crop bias, keyed by GACHA_BANNERS/RAID_EVENTS id. Tuned by eye against how each
// source image is actually composed — e.g. banner_carnival_omega.jpg's Omega is framed high in
// the source, so the default "center 80%" (bottom-biased) was cropping his head off entirely.
const CROP_POSITION_OVERRIDES: Record<string, string> = {
  "banner-lr-omega": "center 15%",
  // Abaddo's eye sits around 42% down the source, with a big "LR ABADDO" logo filling the
  // bottom ~15% — anchoring at 30% keeps the eye comfortably in the lower half of the crop
  // (not pinned to the top edge) at every width, without ever pulling the logo into view.
  "banner-lr-abaddo": "center 30%",
};
const DEFAULT_CROP_POSITION = "center 80%";

// One-shot (not ticking) "Xd Yh"/"Xh Ym"/"Xm" formatter — this slide's subtitle only refreshes
// when buildSlides itself recomputes (language change, remount), same "stateless urgency cue, not
// a new per-second timer on a big shared carousel" call the countdown-hook family in
// lib/useResetCountdown.ts already makes elsewhere.
function formatCoarseCountdown(targetMs: number): string {
  const msLeft = Math.max(0, targetMs - Date.now());
  const days = Math.floor(msLeft / 86_400_000);
  const hours = Math.floor((msLeft % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// GACHA_BANNERS/RAID_EVENTS' own bannerImage is shared with the Summon/Raid pages' own banner
// UI, which needs a different aspect ratio — this hub carousel gets its own dedicated wide art
// here instead of reusing (and badly cropping) those, once one actually fits the slot cleanly.
// Empty for now: every custom home-banner attempt so far (blank render, over-compressed,
// wrong-ratio-with-typo'd logo text) needed more crop than the container should demand — see
// the max-w-[1600px] cap below, which bounds how extreme that ratio gets on very wide screens
// so a moderately-wide (~4:1–5:1) generated banner will actually fit next time.
const HOME_BANNER_OVERRIDES: Record<string, string> = {};

// Real content we already have — no placeholder slides. Skips RAID_EVENTS entries with no
// bannerImage (Elder Dragon's Awakening) since there's no art to show for them here.
// A function (not a module-level constant) so it can be recomputed per-language inside the
// component.
function buildSlides(t: (key: TranslationKey, params?: Record<string, string | number>) => string, language: Language): HeroSlide[] {
  return [
    {
      id: "welcome",
      image: "/assets/ui/portada.png",
      label: t("hub.welcome_back_label"),
      title: t("hub.welcome_back_title"),
      subtitle: t("hub.welcome_back_subtitle"),
      href: "/campaign",
      objectPosition: DEFAULT_CROP_POSITION,
    },
    ...GACHA_BANNERS.map((b) => ({
      id: b.id,
      image: HOME_BANNER_OVERRIDES[b.id] ?? b.bannerImage,
      label: t("nav.summon"),
      title: b.name,
      subtitle: getGachaBannerTagline(b.id, b.tagline, language),
      href: "/gacha",
      objectPosition: CROP_POSITION_OVERRIDES[b.id] ?? DEFAULT_CROP_POSITION,
    })),
    ...RAID_EVENTS.filter((e): e is typeof e & { bannerImage: string } => Boolean(e.bannerImage)).map((e) => ({
      id: e.id,
      image: HOME_BANNER_OVERRIDES[e.id] ?? e.bannerImage,
      label: t("hub.raid_event_label"),
      // evento_crimson_home_banner.jpg already has "CRIMSON DIVINE POWER" painted in as a big
      // logo — showing the title text too would just duplicate it right on top.
      title: e.id === "event-crimson" ? null : e.name,
      subtitle: getRaidEventDescription(e, language),
      // Raid Battle lives in Events' "Extreme Battles" tab now — see ExtremeBattlesTab.tsx.
      href: "/events?tab=extreme",
      objectPosition: CROP_POSITION_OVERRIDES[e.id] ?? DEFAULT_CROP_POSITION,
    })),
    {
      // Overclock had zero presence in the Hub's own promotional rotation before this — only
      // reachable via /start. /assets/ui/overclock_mode.png is composed for a mode-select tile,
      // not this carousel's wide strip — swap in a dedicated banner via HOME_BANNER_OVERRIDES
      // once one exists, same as every other slide here.
      id: "overclock-promo",
      image: HOME_BANNER_OVERRIDES["overclock-promo"] ?? "/assets/ui/overclock_mode.png",
      label: t("hub.overclock_slide_label"),
      title: t("hub.overclock_slide_title", { week: currentOverclockWeekNumber(), boss: currentOverclockBoss().name }),
      subtitle: t("hub.overclock_slide_subtitle", { time: formatCoarseCountdown(nextOverclockResetAt()) }),
      href: "/overclock",
      objectPosition: CROP_POSITION_OVERRIDES["overclock-promo"] ?? DEFAULT_CROP_POSITION,
    },
  ];
}

const SLIDE_DURATION_MS = 5500;

/** Rotating hero banner — cycles through the welcome slide, every active Summon banner, and
 * every raid event that has art, instead of a single static "Welcome back" image sitting on
 * the most valuable real estate on the page and never pointing anywhere. */
export function HubHeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = useT();
  const language = useGameStore((s) => s.language);
  const SLIDES = useMemo(() => buildSlides(t, language), [t, language]);

  useEffect(() => {
    if (paused || SLIDES.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, [paused, SLIDES.length]);

  const slide = SLIDES[index];

  return (
    <div
      // max-w bounds how wide (and therefore how extreme the effective aspect ratio gets) this
      // strip can grow on very wide monitors — without it, a fixed h-56 spanning the full content
      // column can demand anywhere from ~4.5:1 (laptop) to ~9:1+ (ultrawide), a range no single
      // generated banner can satisfy without heavy cropping at one end or the other.
      className="relative mx-auto h-56 w-full max-w-[1600px] overflow-hidden rounded-3xl border border-arcade-border shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <Link href={slide.href} className="relative block h-full w-full">
            <Image
              src={slide.image}
              alt=""
              fill
              priority={index === 0}
              className="object-cover"
              style={{ objectPosition: slide.objectPosition }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <span className="absolute left-5 top-5 rounded-full bg-black/50 px-2.5 py-1 font-arcade text-[9px] uppercase tracking-widest text-gold-bright backdrop-blur-sm">
              {slide.label}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5 pr-24">
              {slide.title && <h1 className="font-arcade text-lg text-white drop-shadow-md">{slide.title}</h1>}
              <p className={cn("text-xs text-white/80 drop-shadow", slide.title && "mt-1")}>{slide.subtitle}</p>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {SLIDES.length > 1 && (
        <div className="absolute bottom-4 right-5 z-10 flex gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={t("hub.go_to_slide", { n: i + 1 })}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-gold" : "w-1.5 bg-white/50 hover:bg-white/80"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
