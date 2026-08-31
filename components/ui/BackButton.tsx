"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
}

/** Circular arrow-left link back to a parent page — same visual shape TeamSelectScreen.tsx
 * already uses for "Back to Campaign". Meant to sit as the first child of a `flex items-center
 * gap-2 lg:gap-4` row next to the page's own <h1>/<p> title block. */
export function BackButton({ href, label = "Back", className }: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm transition-colors hover:text-foreground lg:h-11 lg:w-11",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
    </Link>
  );
}
