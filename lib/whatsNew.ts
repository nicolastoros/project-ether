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
 * it, kept as an alias so WHATS_NEW_CHANGELOG's declaration below stays self-descriptive. */
export interface FeatureIntroItem {
  title: string;
  body: string;
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
    title: "Overclock — Weekly Ranked Boss",
    body: "Fight a rotating weekly boss 2-on-1 and rack up as much damage as you can before you fall. Top the leaderboard before it resets every Friday for Lacrima and rare chipsets.",
  },
  {
    title: "One Start Button",
    body: "Adventure, Survivor, and the new Overclock all launch from a single Start button now, in the Hub and the sidebar.",
  },
  {
    title: "LR Ultimate Attacks",
    body: "LR creatures now unleash a full-screen Ultimate Attack on top of their passive skills — watch for the banner mid-battle.",
  },
  {
    title: "Creature Categories",
    body: "Every creature now carries Category tags — build teams around shared tags to trigger more LR passive synergies.",
  },
  {
    title: "Tamer Set Effects",
    body: "Equip every piece of one Tamer gear set to unlock its Set Effect — Crit Rate, EXP, ATK, or Skill Damage bonuses.",
  },
  {
    title: "Premium Shop",
    body: "A new Lacrima shop is on its way — check the Shop's Premium tab for a preview of what's coming.",
  },
];

const changelogEs: ChangelogEntry[] = [
  {
    title: "Overclock — Jefe Ranqueado Semanal",
    body: "Enfréntate a un jefe semanal rotativo 2 contra 1 y acumula todo el daño que puedas antes de caer. Sube al ranking antes de que se resetee cada viernes para ganar Lacrima y chipsets raros.",
  },
  {
    title: "Un Solo Botón de Inicio",
    body: "Adventure, Survivor y el nuevo Overclock ahora se inician desde un solo botón de Start, tanto en el Hub como en la barra lateral.",
  },
  {
    title: "Ataques Ultimate LR",
    body: "Las creaturas LR ahora desatan un Ataque Ultimate a pantalla completa además de sus habilidades pasivas — atento al banner durante la batalla.",
  },
  {
    title: "Categorías de Creaturas",
    body: "Cada creatura ahora tiene etiquetas de Categoría — arma equipos con etiquetas compartidas para activar más sinergias de pasivas LR.",
  },
  {
    title: "Efectos de Set del Domador",
    body: "Equipa todas las piezas de un set de equipo del Domador para desbloquear su Efecto de Set — bonos de Crítico, EXP, ATK o Daño de Habilidad.",
  },
  {
    title: "Tienda Premium",
    body: "Una nueva tienda de Lacrima está en camino — revisa la pestaña Premium de la Tienda para ver un adelanto.",
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
