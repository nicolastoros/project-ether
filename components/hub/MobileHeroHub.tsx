"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { GACHA_BANNERS } from "@/lib/gameData";
import { RAID_EVENTS } from "@/lib/raidBosses";
import { getRaidEventDescription } from "@/lib/i18n/raidDescriptions";
import { getGachaBannerTagline } from "@/lib/i18n/shopDescriptions";
import { useT } from "@/lib/i18n/useT";
import type { Language, TranslationKey } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

interface HeroSlide {
  id: string;
  image: string;
  label: string;
  title: string | null;
  subtitle: string;
  href: string;
  objectPosition: string;
  /** "cover" fills this tall portrait box edge-to-edge — great for the welcome art and the
   * gacha banners (already close to this container's own aspect ratio). The raid event banners
   * are a much wider 3:1 strip (same art used in the Raid Battle list), so covering a tall box
   * with one would zoom in on a tiny sliver of it — those use "contain" (a blurred cover-fill
   * copy of the same image behind it, same trick BannerSlider.tsx uses) instead. */
  fit: "cover" | "contain";
}

// Mirrors HubHeroCarousel's desktop slide list (welcome + every active Summon banner + every raid
// event with art), but with its own crop tuning — this container is tall/portrait instead of a
// short wide strip, so the same object-position values would frame completely differently here.
const DEFAULT_CROP_POSITION = "center 22%";
const CROP_POSITION_OVERRIDES: Record<string, string> = {
  welcome: "center 30%",
};

// Function (not a module-level constant) so it can be rebuilt per-language inside the component —
// see HubHeroCarousel.tsx's identical buildSlides.
function buildHeroSlides(t: (key: TranslationKey) => string, language: Language): HeroSlide[] {
  return [
    {
      id: "welcome",
      image: "/assets/ui/home_1.png",
      label: t("hub.welcome_back_label"),
      title: t("hub.welcome_back_title"),
      subtitle: t("hub.welcome_back_subtitle"),
      href: "/campaign",
      objectPosition: CROP_POSITION_OVERRIDES.welcome,
      fit: "cover",
    },
    ...GACHA_BANNERS.map((b) => ({
      id: b.id,
      image: b.bannerImage,
      label: t("nav.summon"),
      title: b.name,
      subtitle: getGachaBannerTagline(b.id, b.tagline, language),
      href: "/gacha",
      objectPosition: CROP_POSITION_OVERRIDES[b.id] ?? DEFAULT_CROP_POSITION,
      fit: "cover" as const,
    })),
    ...RAID_EVENTS.filter((e): e is typeof e & { bannerImage: string } => Boolean(e.bannerImage)).map((e) => ({
      id: e.id,
      image: e.bannerImage,
      label: t("hub.raid_event_label"),
      title: e.id === "event-crimson" ? null : e.name,
      subtitle: getRaidEventDescription(e, language),
      // Raid Battle lives in Events' "Extreme Battles" tab now — see ExtremeBattlesTab.tsx.
      href: "/events?tab=extreme",
      objectPosition: "center",
      fit: "contain" as const,
    })),
  ];
}

const SLIDE_DURATION_MS = 5500;

export function MobileHeroHub() {
  const t = useT();
  const language = useGameStore((s) => s.language);
  const HERO_SLIDES = useMemo(() => buildHeroSlides(t, language), [t, language]);

  // Rotates through the welcome art, every active Summon banner, and every raid event that has
  // art — same "always be pointing somewhere" idea as the desktop HubHeroCarousel, so the screen
  // every player sees most often is never just a static picture with nothing to tap.
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (HERO_SLIDES.length <= 1) return;
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % HERO_SLIDES.length), SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, [HERO_SLIDES.length]);
  const slide = HERO_SLIDES[slideIndex];

  return (
    <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-b-3xl bg-arcade-panel">

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {slide.fit === "contain" && (
            <Image
              src={slide.image}
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="scale-125 object-cover opacity-70 blur-2xl"
            />
          )}
          <Image
            src={slide.image}
            alt=""
            fill
            priority={slideIndex === 0}
            sizes="100vw"
            className={slide.fit === "contain" ? "relative object-contain" : "object-cover"}
            style={{ objectPosition: slide.objectPosition }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-arcade-bg via-arcade-bg/50 to-transparent" />
      {/* A genuinely dark scrim for the slide's own title/subtitle text — the panel-blend gradient
          above fades to a pale blue (--color-arcade-bg), not black, so on its own it did nothing
          to separate white text from a busy banner image (or that banner's own baked-in logo
          text) sitting right behind it. */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      {/* One big, comfortable tap target covering the whole art — straight to whatever the slide
          is advertising — sits below the Start control (z-10) so it never steals its taps. The
          slide dots are a separate control layered on top of it. */}
      <Link href={slide.href} className="absolute inset-0">
        <div className="absolute inset-x-0 bottom-32 px-4">
          <span className="inline-block rounded-full bg-black/50 px-2.5 py-1 font-arcade text-[8px] uppercase tracking-widest text-gold-bright backdrop-blur-sm">
            {slide.label}
          </span>
          {slide.title && (
            <h2 className="mt-1.5 font-arcade text-sm text-white drop-shadow-md">{slide.title}</h2>
          )}
          <p className="mt-0.5 line-clamp-2 text-[11px] text-white/85 drop-shadow">{slide.subtitle}</p>
        </div>
      </Link>
      {HERO_SLIDES.length > 1 && (
        // z-20, not z-10 — the Start/mode-picker container below is also z-10 and comes later in
        // the DOM, so at equal z-index it would win the stacking tie and swallow the dots' taps.
        // bottom-24 (96px) clears that container's ~91px height, and sits below the text block
        // above (bottom-32/128px) so neither overlaps.
        <div className="absolute inset-x-0 bottom-24 z-20 flex gap-1.5 px-4">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSlideIndex(i)}
              aria-label={t("hub.go_to_slide", { n: i + 1 })}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === slideIndex ? "w-5 bg-gold" : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
        {/* Straight into the mode-select hub (app/(game)/start/page.tsx) — Adventure, Survivor,
            Overclock, Infinite Tower all live there now instead of in an in-place sheet here. */}
        <Link href="/start" className="mx-auto block w-fit" data-tour="hub-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: [1, 1.045, 1],
              filter: [
                "drop-shadow(0 0 4px rgba(255,184,77,0.55))",
                "drop-shadow(0 0 20px rgba(255,184,77,0.9))",
                "drop-shadow(0 0 4px rgba(255,184,77,0.55))",
              ],
            }}
            transition={{
              opacity: { duration: 0.25 },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              filter: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
          >
            <Image
              src="/assets/ui/start_button.png"
              alt="Start"
              width={2172}
              height={724}
              priority
              className="h-auto w-56"
            />
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
