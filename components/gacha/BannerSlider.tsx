"use client";

import { useEffect, useState } from "react";
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

const AUTOPLAY_MS = 5500;
const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY = 400;

export function BannerSlider({ banners, activeIndex, onChange }: BannerSliderProps) {
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (isInteracting || banners.length <= 1) return;
    const id = setInterval(() => {
      onChange((activeIndex + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [activeIndex, isInteracting, banners.length, onChange]);

  const goTo = (index: number) => onChange((index + banners.length) % banners.length);

  return (
    <div
      className="group relative select-none"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
    >
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
          onDragStart={() => setIsInteracting(true)}
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
                <Image
                  src={banner.bannerImage}
                  alt={banner.name}
                  fill
                  draggable={false}
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 768px"
                  className="object-contain"
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
            <button
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
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
