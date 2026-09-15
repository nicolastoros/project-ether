import type { Language } from "@/lib/i18n/translations";

/** Content for the "What's New" changelog card + the coachmark tour that follows it — see
 * components/tutorial/WhatsNewTour.tsx for the orchestration and lib/tutorialTips.ts for the
 * older, lighter-weight per-route tip system this sits alongside (that one's a single corner
 * bubble per screen; this is a one-time "welcome back" moment covering a whole maintenance's
 * worth of changes at once).
 *
 * WHATS_NEW_SEEN_ID is stored in the same local-only seenTutorialTips list TutorialBubble.tsx
 * already uses (see lib/store.ts) — purely a "have I seen this" UI cue, not real progress, so
 * reusing that array instead of a whole new persisted field matches this codebase's existing
 * convention exactly. Bump the id (v1 -> v2) the next time there's a maintenance worth
 * re-announcing; changing it makes the card reappear once for everyone, same tradeoff
 * lib/tutorialTips.ts's own id field documents. Language-independent on purpose — switching
 * languages shouldn't bring this back. */
export const WHATS_NEW_SEEN_ID = "whats-new-v1";

/** Shared {title, body} card shape used by every one-time feature-intro modal (see
 * components/tutorial/FeatureIntroModal.tsx) — ChangelogEntry is just this file's own naming for
 * it, kept as an alias so WHATS_NEW_CHANGELOG's declaration below stays self-descriptive.
 * `featured` renders a noticeably bigger, gold-accented card instead of the plain default one —
 * for the handful of changes that shouldn't be easy to miss/forget on a quick skim. `cta` adds a
 * button that navigates straight to the feature (and closes the modal on click, via onSkip). */
export interface FeatureIntroItem {
  title: string;
  body: string;
  featured?: boolean;
  cta?: { label: string; href: string };
}
export type ChangelogEntry = FeatureIntroItem;

export interface CoachmarkStepDef {
  /** CSS selector, not a React ref — see CoachmarkTour.tsx. Matched with querySelectorAll and the
   * first element with a non-zero rendered rect wins, since the Hub mounts both a desktop and a
   * mobile Start button simultaneously (one hidden via responsive classes) and both carry this
   * same data-tour value on purpose. */
  selector: string;
  title: string;
  description: string;
}

const changelogEn: ChangelogEntry[] = [
  {
    title: "⚡ Auto-Battle",
    body: "Let your team fight on its own — faster, no tapping skills every turn. Toggle it right before any battle starts.",
    featured: true,
  },
  {
    title: "⏩ x2 Speed",
    body: "Skip the slow animations and blast through fights twice as fast. Combine it with Auto-Battle for the fastest grind.",
    featured: true,
  },
  {
    title: "🏃 Skip Battle",
    body: "Clearly stronger than a Campaign stage? Skip it outright — no fighting required, rewards granted instantly.",
    featured: true,
  },
  {
    title: "🔥 Overclock",
    body: "A weekly ranked boss fight, free to enter as many times as you want. Rack up damage and climb the leaderboard.",
    featured: true,
    cta: { label: "Play Overclock", href: "/overclock" },
  },
];

// Neutral Latin American Spanish (tú, not vos) — matches the rest of lib/i18n/translations.ts's
// existing convention; keep new entries here consistent with that, not Argentine voseo.
const changelogEs: ChangelogEntry[] = [
  {
    title: "⚡ Batalla Automática",
    body: "Deja que tu equipo pelee solo — más rápido, sin tocar habilidades en cada turno. Actívala justo antes de cualquier batalla.",
    featured: true,
  },
  {
    title: "⏩ Velocidad x2",
    body: "Salta las animaciones lentas y resuelve combates el doble de rápido. Combínala con Batalla Automática para avanzar aún más rápido.",
    featured: true,
  },
  {
    title: "🏃 Omitir Batalla",
    body: "¿Eres claramente más fuerte que una etapa de Campaña? Omítela directamente — sin pelear, recompensas al instante.",
    featured: true,
  },
  {
    title: "🔥 Overclock",
    body: "Un jefe ranqueado semanal, gratis las veces que quieras. Acumula daño y sube en el ranking.",
    featured: true,
    cta: { label: "Jugar Overclock", href: "/overclock" },
  },
];

export const WHATS_NEW_CHANGELOG: Record<Language, ChangelogEntry[]> = { en: changelogEn, es: changelogEs };

const tourStepsEn: CoachmarkStepDef[] = [
  {
    selector: '[data-tour="hub-start"]',
    title: "Everything starts here",
    description: "Adventure, Survivor, and the new Overclock weekly boss all live behind this one Start button now.",
  },
  {
    selector: '[data-tour="lacrima-buy"]',
    title: "Lacrima",
    description: "The new premium currency — grab more anytime from here once the Premium Shop opens.",
  },
];

const tourStepsEs: CoachmarkStepDef[] = [
  {
    selector: '[data-tour="hub-start"]',
    title: "Todo empieza acá",
    description: "Adventure, Survivor y el nuevo jefe semanal de Overclock ahora viven detrás de este único botón de Start.",
  },
  {
    selector: '[data-tour="lacrima-buy"]',
    title: "Lacrima",
    description: "La nueva moneda premium — consigue más desde acá cuando abra la Tienda Premium.",
  },
];

export const WHATS_NEW_TOUR_STEPS: Record<Language, CoachmarkStepDef[]> = { en: tourStepsEn, es: tourStepsEs };

/** The changelog modal's own title/subtitle — separate from FeatureIntroModal's generic "Skip"/CTA
 * button text (that lives in lib/i18n/translations.ts as tutorial.* since it's reused by every
 * feature-intro modal, not just this one). */
export const WHATS_NEW_MODAL_TEXT: Record<Language, { title: string; subtitle: string }> = {
  en: { title: "What's New", subtitle: "Here's what changed in this update" },
  es: { title: "Novedades", subtitle: "Esto es lo que cambió en esta actualización" },
};
