"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MenuBannerButtonProps {
  /** Path to one of the wide banner PNGs (public/assets/events/menu_*.png, summon_button.png). */
  image: string;
  label: string;
  /** Renders as a Link when set. Mutually exclusive with onClick — pass one or the other. */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Reserves space for the circular icon medallion baked into the left ~22% of the 4 submenu
   * banners — set false for banners with no medallion (summon_button.png), where the label
   * centers across the whole image instead. */
  hasIcon?: boolean;
  className?: string;
  /** Small caption rendered below the banner (e.g. a currency cost) — kept off the image itself
   * so it stays legible regardless of what's drawn there. */
  caption?: ReactNode;
  /** Overrides the label's responsive text-size classes — callers whose banner grid actually
   * grows on wide screens (e.g. the Formations submenu) want the label scaling up right along
   * with it; callers whose grid stays a fixed narrow width (e.g. gacha's two Summon buttons)
   * should leave this at the default so the label doesn't outgrow the banner. */
  labelSizeClassName?: string;
}

/** A whole-image button: one of the wide "medallion + dark banner" PNGs (or the plain
 * summon_button.png ribbon) as the button surface, with a centered text label overlaid — see
 * app/(game)/formations/page.tsx's submenu tiles and gacha/page.tsx's Summon buttons. */
export function MenuBannerButton({
  image,
  label,
  href,
  onClick,
  disabled = false,
  hasIcon = true,
  className,
  caption,
  labelSizeClassName = "text-xs sm:text-sm lg:text-base",
}: MenuBannerButtonProps) {
  const surface = (
    <motion.div
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      className={cn("relative block w-full", disabled && "grayscale opacity-50")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative banner art at a fixed aspect ratio, not a content photo */}
      <img src={image} alt="" className="h-auto w-full select-none" draggable={false} />
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center px-3 text-center font-arcade text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]",
          labelSizeClassName,
          hasIcon && "pl-[26%]"
        )}
      >
        {label}
      </span>
    </motion.div>
  );

  return (
    <div className={className}>
      {href ? (
        <Link href={href} aria-disabled={disabled} className={cn("block", disabled && "pointer-events-none")}>
          {surface}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className="block w-full text-left">
          {surface}
        </button>
      )}
      {caption && <div className="mt-1 text-center">{caption}</div>}
    </div>
  );
}
