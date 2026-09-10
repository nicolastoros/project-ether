"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, ClipboardList, X, type LucideIcon } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { NAV_GROUPS } from "@/lib/navigation";
import { DailyTaskList } from "@/components/hub/DailyTaskList";
import { GACHA_BANNERS } from "@/lib/gameData";
import { RAID_EVENTS } from "@/lib/raidBosses";
import { cn } from "@/lib/utils";

const COLLECTION_RAIL = NAV_GROUPS.find((g) => g.title === "Collection")?.items ?? [];
const SOCIAL_RAIL = NAV_GROUPS.find((g) => g.title === "Social")?.items ?? [];
const PLAY_MODES = (NAV_GROUPS.find((g) => g.title === "Play")?.items ?? []).filter(
  (item) => item.href !== "/hub"
);

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

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "welcome",
    image: "/assets/ui/home_1.png",
    label: "Welcome Back",
    title: "Welcome back, Summoner",
    subtitle: "Your creatures await orders in the city hub.",
    href: "/campaign",
    objectPosition: CROP_POSITION_OVERRIDES.welcome,
    fit: "cover",
  },
  ...GACHA_BANNERS.map((b) => ({
    id: b.id,
    image: b.bannerImage,
    label: "Summon",
    title: b.name,
    subtitle: b.tagline,
    href: "/gacha",
    objectPosition: CROP_POSITION_OVERRIDES[b.id] ?? DEFAULT_CROP_POSITION,
    fit: "cover" as const,
  })),
  ...RAID_EVENTS.filter((e): e is typeof e & { bannerImage: string } => Boolean(e.bannerImage)).map((e) => ({
    id: e.id,
    image: e.bannerImage,
    label: "Raid Event",
    title: e.id === "event-crimson" ? null : e.name,
    subtitle: e.description,
    // Raid Battle lives in Events' "Extreme Battles" tab now — see ExtremeBattlesTab.tsx.
    href: "/events?tab=extreme",
    objectPosition: "center",
    fit: "contain" as const,
  })),
];

const SLIDE_DURATION_MS = 5500;

interface RailButtonProps {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: boolean;
}

function RailButton({ label, icon: Icon, href, onClick, badge }: RailButtonProps) {
  const content = (
    <>
      <span className="relative">
        <Icon className="h-4 w-4 text-foreground" />
        {badge && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 font-arcade text-[7px] text-white ring-2 ring-white">
            !
          </span>
        )}
      </span>
      <span className="font-arcade text-[7px] uppercase tracking-wide text-zinc-600">{label}</span>
    </>
  );
  const className =
    "flex flex-col items-center gap-1 rounded-2xl border border-white/60 bg-white/85 px-2 py-2 shadow-sm backdrop-blur-sm transition-transform active:scale-95";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="rounded-3xl border border-arcade-border bg-arcade-panel/95 p-3 shadow-xl backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-arcade text-[10px] glow-text-gold">{title}</p>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-arcade-border text-zinc-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </motion.div>
  );
}

export function MobileHeroHub() {
  const dailyTasks = useGameStore((s) => s.dailyTasks);
  const [modesOpen, setModesOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const hasClaimableMission = dailyTasks.some((t) => t.progress >= t.target && !t.claimed);

  // Rotates through the welcome art, every active Summon banner, and every raid event that has
  // art — same "always be pointing somewhere" idea as the desktop HubHeroCarousel, so the screen
  // every player sees most often is never just a static picture with nothing to tap.
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (HERO_SLIDES.length <= 1) return;
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % HERO_SLIDES.length), SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, []);
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
          is advertising — sits below the rail buttons and Start controls (both z-10) so it never
          steals their taps. The slide dots are a separate control layered on top of it. */}
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
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === slideIndex ? "w-5 bg-gold" : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        {COLLECTION_RAIL.map((item) => (
          <RailButton key={item.href} {...item} />
        ))}
      </div>
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        {SOCIAL_RAIL.map((item) => (
          <RailButton key={item.href} {...item} />
        ))}
        <RailButton
          label="Missions"
          icon={ClipboardList}
          onClick={() => setMissionsOpen(true)}
          badge={hasClaimableMission}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
        <AnimatePresence mode="wait">
          {modesOpen ? (
            <BottomSheet key="modes" title="Choose a mode" onClose={() => setModesOpen(false)}>
              <div className="grid grid-cols-2 gap-2">
                {PLAY_MODES.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 rounded-2xl border border-arcade-border bg-arcade-panel-light px-3 py-2.5 transition-colors active:border-gold"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gold-bright" />
                    <span className="font-arcade text-[9px] uppercase tracking-wide text-foreground">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </BottomSheet>
          ) : (
            <motion.button
              key="start"
              type="button"
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
              exit={{ opacity: 0, scale: 0.85, filter: "none", transition: { duration: 0.2 } }}
              transition={{
                opacity: { duration: 0.25 },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                filter: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setModesOpen(true)}
              className="mx-auto block"
            >
              <Image
                src="/assets/ui/start_button.png"
                alt="Start"
                width={2172}
                height={724}
                priority
                className="h-auto w-56"
              />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {missionsOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMissionsOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative max-h-[75vh] w-full max-w-md overflow-y-auto"
            >
              <button
                onClick={() => setMissionsOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <DailyTaskList />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
