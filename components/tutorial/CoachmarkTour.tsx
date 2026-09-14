"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { CoachmarkStepDef } from "@/lib/whatsNew";
import { useT } from "@/lib/i18n/useT";

const SPOTLIGHT_PAD = 8;
// The target may render a frame or two after a step becomes active (layout not settled right
// after scrollIntoView, or a step pointing at something behind an animation) — poll briefly
// instead of measuring exactly once and giving up.
const MEASURE_RETRY_MS = 120;
const MEASURE_MAX_ATTEMPTS = 25;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Generic Dokkan/LoL-style coachmark tour: darkens the screen, cuts a spotlight hole around a
 * real DOM element (found via CSS selector, not a prop-drilled ref — keeps this reusable from
 * anywhere without wiring refs through every intermediate component), and shows a speech-bubble
 * card describing it. Advances on a click anywhere in the spotlight or the bubble's Next button;
 * "Skip Tour" / Escape ends it immediately. See WhatsNewTour.tsx for the first caller. */
export function CoachmarkTour({
  steps,
  onComplete,
}: {
  steps: CoachmarkStepDef[];
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[stepIndex];
  const t = useT();

  const measure = useCallback(() => {
    if (!step) return null;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(step.selector));
    const target = candidates.find((el) => el.offsetWidth > 0 && el.offsetHeight > 0);
    if (!target) return null;
    const r = target.getBoundingClientRect();
    return {
      top: r.top - SPOTLIGHT_PAD,
      left: r.left - SPOTLIGHT_PAD,
      width: r.width + SPOTLIGHT_PAD * 2,
      height: r.height + SPOTLIGHT_PAD * 2,
    };
  }, [step]);

  useEffect(() => {
    if (!step) return;
    let attempts = 0;
    let cancelled = false;

    const tick = () => {
      if (attempts === 0) setRect(null);
      attempts += 1;
      const found = measure();
      if (found) {
        if (!cancelled) setRect(found);
        return;
      }
      if (attempts >= MEASURE_MAX_ATTEMPTS) {
        // The target never showed up (wrong route, element removed) — bail out of the whole tour
        // rather than leaving a permanent dark screen with nothing to click.
        if (!cancelled) onComplete();
        return;
      }
      timeoutId = setTimeout(tick, MEASURE_RETRY_MS);
    };
    let timeoutId = setTimeout(tick, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [step, measure, onComplete]);

  useEffect(() => {
    if (!rect) return;
    const onResize = () => {
      const found = measure();
      if (found) setRect(found);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [rect, measure]);

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        onComplete();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  if (!step || !rect) return null;

  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const targetInTopHalf = rect.top + rect.height / 2 < viewportH / 2;
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[300]">
      {/* Four-rectangle backdrop frame around the cutout, instead of an SVG mask — same technique
          used everywhere else in this codebase that needs a "hole" in an overlay. Each panel is
          also a click target, so tapping anywhere off the highlight advances the tour too. */}
      <button type="button" aria-label={t("tutorial.next")} onClick={advance} className="absolute inset-x-0 top-0 bg-black/78 backdrop-blur-[1px]" style={{ height: Math.max(0, rect.top) }} />
      <button type="button" aria-label={t("tutorial.next")} onClick={advance} className="absolute inset-x-0 bottom-0 bg-black/78 backdrop-blur-[1px]" style={{ top: rect.top + rect.height }} />
      <button
        type="button"
        aria-label={t("tutorial.next")}
        onClick={advance}
        className="absolute bg-black/78 backdrop-blur-[1px]"
        style={{ top: rect.top, height: rect.height, left: 0, width: Math.max(0, rect.left) }}
      />
      <button
        type="button"
        aria-label={t("tutorial.next")}
        onClick={advance}
        className="absolute bg-black/78 backdrop-blur-[1px]"
        style={{ top: rect.top, height: rect.height, left: rect.left + rect.width, right: 0 }}
      />

      {/* Spotlight ring + its own click-catcher, so tapping the highlighted element itself also
          advances instead of triggering the real button underneath mid-tour. */}
      <motion.button
        type="button"
        aria-label={t("tutorial.next")}
        onClick={advance}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, boxShadow: ["0 0 0 3px var(--color-gold-bright)", "0 0 22px 4px var(--color-gold-bright)", "0 0 0 3px var(--color-gold-bright)"] }}
        transition={{ boxShadow: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute cursor-pointer rounded-2xl"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: targetInTopHalf ? 12 : -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className={
            "fixed inset-x-4 z-[302] mx-auto max-w-sm rounded-2xl border-2 border-[#38bdf8] bg-arcade-panel p-4 shadow-[0_0_28px_-4px_rgba(56,189,248,0.6)] " +
            (targetInTopHalf ? "bottom-20 lg:bottom-6" : "top-6")
          }
        >
          <button
            type="button"
            onClick={onComplete}
            aria-label={t("tutorial.skip_tour")}
            className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="pr-5 font-arcade text-[9px] uppercase tracking-wide text-[#0e7490]">
            {step.title} · {stepIndex + 1}/{steps.length}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">{step.description}</p>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={onComplete} className="text-[10px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300">
              {t("tutorial.skip_tour")}
            </button>
            <button
              type="button"
              onClick={advance}
              className="rounded-full bg-gradient-to-br from-gold-bright to-gold px-4 py-1.5 font-arcade text-[10px] uppercase tracking-wide text-white shadow-[0_0_10px_rgba(255,184,77,0.6)]"
            >
              {isLast ? t("tutorial.got_it") : t("tutorial.next")}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
