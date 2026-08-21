"use client";

import type { ComponentProps } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PixelButtonProps extends ComponentProps<typeof motion.button> {
  variant?: "gold" | "neon" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<NonNullable<PixelButtonProps["variant"]>, string> = {
  gold: "bg-gold text-white border-b-[3px] border-black/15 shadow-sm",
  neon: "bg-neon text-white border-b-[3px] border-black/15 shadow-sm",
  ghost: "bg-white text-foreground border border-arcade-border shadow-sm",
  danger: "bg-red-400 text-white border-b-[3px] border-black/15 shadow-sm",
};

const sizeClasses: Record<NonNullable<PixelButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export function PixelButton({
  variant = "gold",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: PixelButtonProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.94 }}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      className={cn(
        "rounded-full font-arcade font-semibold uppercase tracking-wide transition-opacity",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
