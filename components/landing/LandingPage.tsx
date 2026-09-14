"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useAnimationControls, type Variants } from "framer-motion";
import { ChevronDown, Languages, Sparkles, Swords, Users, Trophy, BookOpen, Wand2 } from "lucide-react";
import { STARTER_CREATURES, CREATURE_CATEGORIES } from "@/lib/gameData";
import { CAMPAIGN_CHAPTERS } from "@/lib/campaignChapters";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n/useT";
import { LANDING_CONTENT, type LandingContent } from "@/lib/i18n/landingContent";
import type { Language } from "@/lib/i18n/translations";
import { getLrPassiveDescription } from "@/lib/i18n/skillDescriptions";
import { cn } from "@/lib/utils";

// Real creatures, not placeholder art — a spread of elements and both top rarities (LR/Mythic)
// so CreatureSprite's own aura-particle system (see components/ui/CreatureSprite.tsx) does the
// "look how alive this roster is" work for free, exactly as it does in the real Monsters grid.
const SHOWCASE_CREATURE_IDS = ["cr-gallantknight", "cr-poseidon", "cr-abaddo", "cr-astarion", "cr-sakuya", "cr-blazefire"];
const showcaseCreatures = SHOWCASE_CREATURE_IDS.map((id) => STARTER_CREATURES.find((c) => c.id === id)!).filter(Boolean);

const HERO_CREATURE = STARTER_CREATURES.find((c) => c.id === "cr-gallantknight")!;
const TARGET_CREATURE = STARTER_CREATURES.find((c) => c.id === "cr-abaddo")!;

// The 5 LR-exclusive creatures — every one has both an ultimateSkill and an lrPassive (see
// types/game.ts), so LrPowerShowcase below can read real content straight off STARTER_CREATURES
// instead of duplicating names/descriptions as landing-page-only copy that could drift out of sync.
const LEGENDARY_IDS = ["cr-omega", "cr-poseidon", "cr-magnagold", "cr-abaddo", "cr-gallantknight"];
const legendaryCreatures = LEGENDARY_IDS.map((id) => STARTER_CREATURES.find((c) => c.id === id)!).filter(Boolean);

// A hand-picked, evocative slice of the full 21-category list (lib/gameData.ts's
// CREATURE_CATEGORIES) — enough to sell "deep Dokkan-style team synergy" without dumping the
// entire taxonomy on a first-time visitor.
const SHOWCASE_CATEGORIES = [
  "Royal Knights",
  "Dragon Kings",
  "Power of Darkness",
  "Power of Light",
  "Eternal Rivals",
  "Guardian of the Digital World",
  "Time Travelers",
  "Winged Warriors",
  "Holy Knights",
  "Savior",
];

const totalAreas = CAMPAIGN_CHAPTERS.reduce((sum, c) => sum + c.areaNames.length, 0);

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

/** Wraps children in a scroll-triggered fade+rise — fires once, the first time it enters the
 * viewport, never replays on scroll-back (viewport.once) so revisiting a section by scrolling up
 * doesn't feel twitchy. `-120px` margin starts the reveal a beat before the section is fully in
 * view, so it never feels like it's chasing the scroll. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** Section eyebrow + heading, reused across every feature block below for a consistent rhythm. */
function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-arcade text-[11px] uppercase tracking-[0.3em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm text-zinc-400 sm:text-base">{subtitle}</p>
    </div>
  );
}

/** Same ambient conic-ring + drifting-motes treatment as HiddenPotentialScreen's ShrineBackdrop
 * (see components/monsters/HiddenPotentialScreen.tsx) — reused here at page-background scale for
 * visual consistency between "the game's own epic moments" and "the page that's selling them". */
function AmbientGlow({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        style={{ background: "conic-gradient(from 0deg, #22d3ee, #eab308, #a78bfa, #22d3ee, #eab308, #a78bfa, #22d3ee)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/** A tiny, self-contained loop of exactly the combat "juice" this session built for real battles
 * (see components/combat/CombatantCard.tsx) — a hero lunge, a Dokkan-style floating damage
 * number, and a critical-hit burst — so the Combat feature section shows the actual system
 * instead of describing it in a bullet point. */
function CombatDemo() {
  const t = useT();
  const lungeControls = useAnimationControls();
  const [hitNonce, setHitNonce] = useState(0);
  const [isCrit, setIsCrit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loop() {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 1800));
        if (cancelled) break;
        const crit = Math.random() < 0.4;
        setIsCrit(crit);
        void lungeControls.start({
          x: [0, -8, 46, 46, 0],
          scale: [1, 1, 1.08, 1.08, 1],
          transition: { duration: 0.5, times: [0, 0.18, 0.42, 0.62, 1], ease: "easeOut" },
        });
        setTimeout(() => {
          if (!cancelled) setHitNonce((n) => n + 1);
        }, 220);
      }
    }
    void loop();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex h-40 items-center justify-center gap-10 sm:h-48 sm:gap-16">
      <motion.div animate={lungeControls} className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28">
        <CreatureSprite creature={HERO_CREATURE} direction="south-east" className="h-full w-full" />
      </motion.div>
      <div className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28">
        <CreatureSprite creature={TARGET_CREATURE} direction="south-west" className="h-full w-full" />
        {hitNonce > 0 && (
          <motion.div
            key={hitNonce}
            initial={{ opacity: 0, y: 4, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -40, scale: isCrit ? [0.5, 1.4, 1.05, 1.05] : [0.5, 1.1, 1, 1] }}
            transition={{ duration: isCrit ? 1.1 : 0.85, times: [0, 0.18, 0.8, 1], ease: "easeOut" }}
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-center font-arcade font-black leading-none",
              isCrit ? "text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]" : "text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
            )}
          >
            {isCrit && <div className="text-[9px] font-bold tracking-widest text-red-400">{t("battle.critical")}</div>}
            <div className={isCrit ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"}>-{isCrit ? "1,240" : "612"}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** Recreates the real in-battle epic banners (components/combat/UltimateAttackIntro.tsx's gold
 * treatment, components/combat/LrPassiveIntro.tsx's neon-blue one) at grid scale instead of as a
 * full-screen takeover, so the landing page shows the actual system rather than a mockup of it —
 * same GIFs (public/assets/creatures/<id>/animations/special_attack.gif), same real
 * name/description text pulled straight off each LR's ultimateSkill/lrPassive. Plain <img> (not
 * next/image) for the GIFs specifically — Next's image optimizer strips GIF animation unless
 * explicitly told not to, same reason UltimateAttackIntro.tsx itself uses a plain img. */
function LrPowerShowcase({ content, language }: { content: LandingContent; language: Language }) {
  const [mode, setMode] = useState<"ultimate" | "passive">("ultimate");

  return (
    <div>
      <div className="mx-auto flex w-fit gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {(
          [
            ["ultimate", content.lrPower.ultimateTab],
            ["passive", content.lrPower.passiveTab],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              "rounded-full px-4 py-1.5 font-arcade text-[10px] uppercase tracking-wide transition-colors sm:px-5 sm:text-xs",
              mode === id ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
      >
        {mode === "ultimate"
          ? legendaryCreatures.map((creature) => (
              <div
                key={creature.id}
                className="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 border-gold-bright/60 bg-gradient-to-b from-[#1a1206] via-black to-black p-3 text-center shadow-[0_0_24px_-8px_rgba(255,184,77,0.6)] sm:p-4"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(255,184,77,0.18)_0%,_transparent_70%)]" />
                {creature.ultimateSkill?.animationGif && (
                  <img
                    src={creature.ultimateSkill.animationGif}
                    alt=""
                    className="relative h-16 w-16 object-contain drop-shadow-[0_0_16px_rgba(255,184,77,0.8)] sm:h-20 sm:w-20"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
                <p className="relative font-arcade text-[8px] uppercase tracking-[0.2em] text-gold-bright/80 sm:text-[9px]">
                  {creature.name}
                </p>
                <p
                  className="relative text-sm font-black leading-tight text-transparent sm:text-base"
                  style={{
                    backgroundImage: "linear-gradient(180deg, #ffffff 0%, var(--color-gold-bright) 55%, var(--color-gold-ink) 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  {creature.ultimateSkill?.name}
                </p>
              </div>
            ))
          : legendaryCreatures.map((creature) => (
              <div
                key={creature.id}
                className="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 border-sky-400/60 bg-gradient-to-b from-[#030913] via-[#0a2547] to-[#030913] p-3 text-center shadow-[0_0_24px_-8px_rgba(56,189,248,0.6)] sm:p-4"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-sky-300 bg-black/70 shadow-[0_0_14px_rgba(56,189,248,0.7)] sm:h-16 sm:w-16">
                  <CreatureSprite creature={creature} className="h-11 w-11 sm:h-12 sm:w-12" />
                </div>
                <p className="font-arcade text-[8px] uppercase tracking-[0.2em] text-sky-300 sm:text-[9px]">{content.lrPower.passiveSkillLabel}</p>
                <p className="text-sm font-bold leading-tight text-white sm:text-base">{creature.lrPassive?.name}</p>
                <p className="text-[10px] leading-snug text-sky-100/75 sm:text-xs">
                  {creature.lrPassive && getLrPassiveDescription(creature, creature.lrPassive, language)}
                </p>
              </div>
            ))}
      </motion.div>
    </div>
  );
}

export function LandingPage() {
  const language = useGameStore((s) => s.language);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const t = useT();
  const content = LANDING_CONTENT[language];

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#05070d] text-white">
      {/* Nav */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-4 py-5 sm:px-8">
        <Image src="/assets/digital_resonance_transparent.png" alt="Digital Resonance" width={280} height={140} className="h-8 w-auto sm:h-10" />
        <div className="flex items-center gap-2 sm:gap-3">
          {/* The one place a pre-login visitor can actually toggle language — the game's own
              toggle (TopStatusBar.tsx) is behind auth, useless to someone still deciding whether
              to sign up in a language they can read. */}
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
            aria-label={t("lang.switch_to")}
            title={t("lang.switch_to")}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-300 backdrop-blur-sm transition-colors hover:bg-white/10 sm:px-3.5"
          >
            <Languages className="h-4 w-4" />
            {language}
          </button>
          <Link
            href="/play"
            className="rounded-full border border-gold/50 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gold-bright backdrop-blur-sm transition-colors hover:bg-white/10 sm:px-5 sm:text-sm"
          >
            {content.nav.logIn}
          </Link>
        </div>
      </div>

      {/* Hero */}
      {/* isolate: without its own stacking context, the -z-10 backdrop below doesn't just sit
          behind THIS section's own content — it escapes to the page's root stacking context and
          renders behind the root div's own bg-[#05070d], i.e. behind literally everything,
          reading as a flat black hero with no art at all (confirmed live). isolate scopes it back
          to exactly this section, the way it was always meant to. */}
      <section className="relative isolate flex min-h-[92dvh] flex-col items-center justify-center px-4 pb-16 pt-4 text-center sm:px-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* poster: the static key art shows immediately (no flash of black) and stays as the
              fallback for any browser that blocks video autoplay. The video itself plays muted +
              inline (required for autoplay on mobile Safari/Chrome) and loops silently. */}
          <video
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            aria-hidden
            poster="/assets/back_home_1.png"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-60"
          >
            <source src="/assets/video_3.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/50 via-[#05070d]/75 to-[#05070d]" />
          <AmbientGlow />
        </div>

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <Image
            src="/assets/digital_resonance_transparent.png"
            alt="Digital Resonance"
            width={1774}
            height={887}
            priority
            className="h-auto w-72 drop-shadow-[0_0_40px_rgba(34,211,238,0.35)] sm:w-96 lg:w-[30rem]"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 max-w-xl text-base text-zinc-300 sm:text-lg"
        >
          {content.hero.tagline}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-2 max-w-md text-sm text-zinc-500"
        >
          {content.hero.subtitle}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}>
          <Link href="/play" className="group relative mt-8 inline-block">
            <span className="absolute inset-0 -z-10 rounded-full bg-gold blur-lg opacity-60 transition-opacity group-hover:opacity-90" />
            <span className="relative flex items-center gap-2 rounded-full bg-gradient-to-b from-gold to-gold-bright px-9 py-4 font-arcade text-sm uppercase tracking-wide text-white shadow-lg transition-transform group-hover:scale-105 sm:text-base">
              {content.hero.playNow}
            </span>
          </Link>
        </motion.div>
        <p className="mt-3 text-xs text-zinc-600">{content.hero.freeToPlay}</p>

        <motion.div
          className="absolute bottom-6 text-zinc-600"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </section>

      {/* Stats strip */}
      <Reveal className="relative border-y border-white/5 bg-white/[0.02] px-4 py-8 sm:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 text-center sm:grid-cols-3 lg:grid-cols-5">
          {[
            { value: `${STARTER_CREATURES.length}+`, label: content.stats.creatures },
            { value: `${CAMPAIGN_CHAPTERS.length}`, label: content.stats.chapters },
            { value: `${totalAreas}`, label: content.stats.areas },
            { value: "3", label: content.stats.raidBosses },
            { value: `${CREATURE_CATEGORIES.length}`, label: content.stats.categories },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-arcade text-2xl text-gold-bright sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500 sm:text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Feature: Collect */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-28">
        <AmbientGlow />
        <Reveal>
          <SectionHeading
            eyebrow={content.collect.eyebrow}
            title={content.collect.title}
            subtitle={content.collect.subtitle(STARTER_CREATURES.length)}
          />
        </Reveal>
        <Reveal delay={0.15} className="mt-14 flex flex-wrap items-end justify-center gap-4 sm:gap-8">
          {showcaseCreatures.map((creature, i) => (
            <motion.div
              key={creature.id}
              className={cn("h-20 w-20 sm:h-28 sm:w-28", i % 2 === 1 && "sm:mb-8")}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3 + (i % 3) * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
            >
              <CreatureSprite creature={creature} spin className="h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]" />
            </motion.div>
          ))}
        </Reveal>

        {/* Dokkan-style team-building depth — a real system (lib/gameData.ts's
            CREATURE_CATEGORIES), shown as a pill cloud rather than a full grid section so it reads
            as a teaser, not a whole extra feature block. */}
        <Reveal delay={0.25} className="mx-auto mt-14 max-w-2xl text-center">
          <p className="text-sm text-zinc-400 sm:text-base">
            {content.collect.categoriesPrefix}
            <span className="font-semibold text-white">{content.collect.categoriesWord}</span>
            {content.collect.categoriesSuffix}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {SHOWCASE_CATEGORIES.map((category) => (
              <span
                key={category}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 backdrop-blur-sm"
              >
                {category}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Feature: Combat */}
      <section className="relative border-t border-white/5 bg-white/[0.02] px-4 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <SectionHeading
            eyebrow={content.combat.eyebrow}
            title={content.combat.title}
            subtitle={content.combat.subtitle}
          />
        </Reveal>
        <Reveal delay={0.15} className="mx-auto mt-10 max-w-lg rounded-3xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm sm:p-6">
          <CombatDemo />
        </Reveal>
      </section>

      {/* Feature: LR-Exclusive Power */}
      <section className="relative overflow-hidden border-t border-white/5 px-4 py-20 sm:px-8 sm:py-28">
        <AmbientGlow />
        <Reveal>
          <SectionHeading
            eyebrow={content.lrPower.eyebrow}
            title={content.lrPower.title}
            subtitle={content.lrPower.subtitle}
          />
        </Reveal>
        <Reveal delay={0.15} className="mt-12">
          <LrPowerShowcase content={content} language={language} />
        </Reveal>
      </section>

      {/* Feature: Hidden Potential */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-28">
        <AmbientGlow />
        <Reveal>
          <SectionHeading
            eyebrow={content.potential.eyebrow}
            title={content.potential.title}
            subtitle={content.potential.subtitle}
          />
        </Reveal>
        <Reveal delay={0.15} className="mx-auto mt-12 flex max-w-xl items-center justify-center gap-3 sm:gap-5">
          {[Wand2, Sparkles, Swords].map((Icon, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-gold/10 text-gold-bright shadow-[0_0_20px_-4px_rgba(255,184,77,0.6)] sm:h-16 sm:w-16">
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              {i < 2 && (
                <div className="relative h-0.5 w-8 overflow-hidden bg-white/10 sm:w-16">
                  <motion.div
                    className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-gold-bright to-transparent"
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
                  />
                </div>
              )}
            </div>
          ))}
        </Reveal>
      </section>

      {/* Feature: Raid Bosses */}
      <section className="relative border-t border-white/5 bg-white/[0.02] px-4 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <SectionHeading
            eyebrow={content.raidBosses.eyebrow}
            title={content.raidBosses.title}
            subtitle={content.raidBosses.subtitle}
          />
        </Reveal>
        <Reveal delay={0.15} className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
          {[
            { src: "/assets/events/crimsondivinepower.png", name: "Crimson Paladin" },
            { src: "/assets/events/storm_thunder_eagle.png", name: "Storm Thunder Eagle" },
            { src: "/assets/events/factor_x_unkwnown.png", name: "Factor X" },
          ].map((boss) => (
            <div
              key={boss.name}
              className="flex aspect-[3/1] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black p-3 shadow-[0_0_30px_-10px_rgba(239,68,68,0.4)] sm:aspect-square sm:p-6"
            >
              <Image src={boss.src} alt={boss.name} width={2172} height={724} className="h-auto w-full object-contain" />
            </div>
          ))}
        </Reveal>
      </section>

      {/* Feature: Campaign */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-28">
        <AmbientGlow />
        <Reveal>
          <SectionHeading
            eyebrow={content.campaign.eyebrow}
            title={content.campaign.title}
            subtitle={content.campaign.subtitle(CAMPAIGN_CHAPTERS.length, totalAreas)}
          />
        </Reveal>
        <Reveal delay={0.15} className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {CAMPAIGN_CHAPTERS.map((chapter) => (
            <div
              key={chapter.chapter}
              className="flex aspect-[2/1] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/60 p-3"
            >
              <Image
                src={`/assets/ui/chapter${chapter.chapter}.png`}
                alt={`Chapter ${chapter.chapter}`}
                width={480}
                height={160}
                className="h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>
          ))}
        </Reveal>
      </section>

      {/* Social proof strip */}
      <Reveal className="relative border-t border-white/5 bg-white/[0.02] px-4 py-14 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-6 text-center">
          {[
            { icon: Users, label: content.social.guilds },
            { icon: Trophy, label: content.social.ranking },
            { icon: BookOpen, label: content.social.dex },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-zinc-400">
              <Icon className="h-5 w-5 text-cyan-300" />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-4 py-24 text-center sm:px-8 sm:py-32">
        <AmbientGlow />
        <Reveal>
          <h2 className="text-3xl font-bold text-white sm:text-5xl">{content.finalCta.title}</h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-zinc-400 sm:text-base">{content.finalCta.subtitle}</p>
          <Link href="/play" className="group relative mt-9 inline-block">
            <span className="absolute inset-0 -z-10 rounded-full bg-gold blur-lg opacity-60 transition-opacity group-hover:opacity-90" />
            <span className="relative flex items-center gap-2 rounded-full bg-gradient-to-b from-gold to-gold-bright px-10 py-4 font-arcade text-sm uppercase tracking-wide text-white shadow-lg transition-transform group-hover:scale-105 sm:text-base">
              {content.finalCta.playNow}
            </span>
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 px-4 py-8 text-center sm:px-8">
        <Image src="/assets/digital_resonance_transparent.png" alt="Digital Resonance" width={200} height={100} className="mx-auto h-6 w-auto opacity-60" />
        <p className="mt-3 text-xs text-zinc-600">
          {content.footer.alreadyHaveAccount}{" "}
          <Link href="/play" className="font-semibold text-neon hover:underline">
            {content.footer.logIn}
          </Link>
        </p>
      </footer>
    </div>
  );
}
