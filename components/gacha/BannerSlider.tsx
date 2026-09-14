"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GachaBanner } from "@/types/game";
import { cn } from "@/lib/utils";

interface BannerSliderProps {
  banners: GachaBanner[];
  activeIndex: number;
  onChange: (index: number) => void;
}

const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY = 400;

// No autoplay, on purpose — this used to auto-advance every few seconds, and a player could tap
// Summon right as it slid to a different banner underneath them, pulling on the wrong one. Moving
// between banners is now 100% player-initiated: drag/swipe, the arrow buttons, or the dots.
export function BannerSlider({ banners, activeIndex, onChange }: BannerSliderProps) {
  const goTo = (index: number) => onChange((index + banners.length) % banners.length);

  return (
    <div className="group relative select-none">
      <motion.div
        animate={{
          boxShadow: [
            "0 0 0px 0px rgba(255,184,77,0.0)",
            "0 0 40px 4px rgba(255,184,77,0.45)",
            "0 0 0px 0px rgba(255,184,77,0.0)",
          ],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="relative overflow-hidden rounded-3xl border-2 border-gold shadow-lg"
      >
        <motion.div
          className="flex"
          drag={banners.length > 1 ? "x" : false}
          dragMomentum={false}
          dragElastic={0.2}
          animate={{ x: `-${activeIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY) {
              goTo(activeIndex + 1);
            } else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY) {
              goTo(activeIndex - 1);
            }
          }}
        >
          {banners.map((banner, i) => (
            <div key={banner.id} className="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-950">
              <motion.div
                className="absolute inset-0"
                initial={false}
                animate={{ scale: i === activeIndex ? 1 : 1.07 }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              >
                {/* Blurred cover-fill backdrop of the same art, for banners whose native aspect
                    ratio is narrower than this slider's fixed aspect-video box — fills what would
                    otherwise be flat black letterbox bars instead of cropping the foreground
                    image (object-contain below never crops, so nothing is ever cut off). */}
                <Image
                  src={banner.bannerImage}
                  alt=""
                  aria-hidden
                  fill
                  draggable={false}
                  sizes="(max-width: 1024px) 100vw, 768px"
                  className="scale-110 object-cover opacity-70 blur-2xl"
                />
                <Image
                  src={banner.bannerImage}
                  alt={banner.name}
                  fill
                  draggable={false}
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 768px"
                  className="relative object-contain"
                />
              </motion.div>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          initial={{ x: "-140%" }}
          animate={{ x: "340%" }}
          transition={{ duration: 1.7, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
        />

        {banners.length > 1 && (
          <>
            {/* Always visible (not hover-only) — hover has no equivalent on mobile, and the whole
                point is for a player to notice there's more to see without having to guess. The
                chevrons themselves idle-nudge sideways to draw the eye the first time; the button
                still brightens further on hover/tap for desktop polish. */}
            <button
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white opacity-90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/65 hover:opacity-100 sm:h-10 sm:w-10"
            >
              <motion.span
                animate={{ x: [0, -3, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.span>
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white opacity-90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/65 hover:opacity-100 sm:h-10 sm:w-10"
            >
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.span>
            </button>
          </>
        )}
      </motion.div>

      {banners.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              onClick={() => goTo(i)}
              aria-label={`Go to ${banner.name} banner`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex ? "w-6 bg-gold" : "w-1.5 bg-arcade-border hover:bg-zinc-400"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
