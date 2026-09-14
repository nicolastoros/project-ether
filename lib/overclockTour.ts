import type { CoachmarkStepDef, FeatureIntroItem } from "@/lib/whatsNew";
import type { Language } from "@/lib/i18n/translations";

/** Local-only "have I seen this" id — same seenTutorialTips array WhatsNewTour.tsx's own id lives
 * in, see lib/whatsNew.ts's comment on that tradeoff. Separate id (and separate tour) from
 * whats-new-v1: that one is a maintenance-wide changelog gated to the Hub, this one is a single
 * feature's own first-run walkthrough gated to /overclock — a player could plausibly reach
 * Overclock long before or after any given maintenance's changelog fires. Language-independent on
 * purpose — switching languages shouldn't bring this back. */
export const OVERCLOCK_TOUR_SEEN_ID = "overclock-tour-v1";

const introItemsEn: FeatureIntroItem[] = [
  { title: "One Boss, All Week", body: "A single boss rotates in every week, 2-on-1 — and it gets tougher with every turn it takes." },
  { title: "Score = Damage Dealt", body: "Win or lose, your best single run's total damage is what counts toward the leaderboard." },
  { title: "Climb The Ranking", body: "Repeat as many times as you want — only your top score is kept. Top 3 each week win real rewards." },
];

const introItemsEs: FeatureIntroItem[] = [
  { title: "Un Jefe, Toda la Semana", body: "Un solo jefe rota cada semana, 2 contra 1 — y se vuelve más fuerte con cada turno que da." },
  { title: "Puntaje = Daño Hecho", body: "Ganes o pierdas, el daño total de tu mejor intento es lo que cuenta para el ranking." },
  { title: "Sube en el Ranking", body: "Repite las veces que quieras — solo se guarda tu mejor puntaje. El top 3 de cada semana gana recompensas reales." },
];

export const OVERCLOCK_INTRO_ITEMS: Record<Language, FeatureIntroItem[]> = { en: introItemsEn, es: introItemsEs };

const tourStepsEn: CoachmarkStepDef[] = [
  {
    selector: '[data-tour="overclock-boss"]',
    title: "This Week's Boss",
    description: "A new boss rotates in every week and grows stronger with every turn it survives — see how much damage your team can rack up before it takes you down.",
  },
  {
    selector: '[data-tour="overclock-best"]',
    title: "Your Best Run",
    description: "Win or lose, your single highest-damage attempt this week is what gets ranked. Fight as many times as you like.",
  },
  {
    selector: '[data-tour="overclock-rewards"]',
    title: "Weekly Rewards",
    description: "The top 3 tamers each week win Lacrima and chipsets, paid out the moment the week resets.",
  },
  {
    selector: '[data-tour="overclock-leaderboard"]',
    title: "Leaderboard",
    description: "Ranked against every other tamer — standings refresh every couple hours and reset every Friday. Tap Update Ranking anytime to check for a fresh result.",
  },
  {
    selector: '[data-tour="overclock-start"]',
    title: "Bring Your Best Two",
    description: "Pick up to 2 creatures — max 1 LR, to keep it fair — and jump in.",
  },
];

const tourStepsEs: CoachmarkStepDef[] = [
  {
    selector: '[data-tour="overclock-boss"]',
    title: "El Jefe de Esta Semana",
    description: "Un nuevo jefe rota cada semana y se hace más fuerte con cada turno que sobrevive — mira cuánto daño puede acumular tu equipo antes de caer.",
  },
  {
    selector: '[data-tour="overclock-best"]',
    title: "Tu Mejor Intento",
    description: "Ganes o pierdas, tu intento con más daño esta semana es el que se rankea. Pelea las veces que quieras.",
  },
  {
    selector: '[data-tour="overclock-rewards"]',
    title: "Recompensas Semanales",
    description: "Los 3 mejores domadores de cada semana ganan Lacrima y chipsets, pagados apenas se resetea la semana.",
  },
  {
    selector: '[data-tour="overclock-leaderboard"]',
    title: "Tabla de Posiciones",
    description: "Rankeado contra todos los demás domadores — las posiciones se actualizan cada un par de horas y se resetean todos los viernes. Toca Update Ranking cuando quieras para ver un resultado fresco.",
  },
  {
    selector: '[data-tour="overclock-start"]',
    title: "Trae tus Mejores Dos",
    description: "Elige hasta 2 creaturas — máximo 1 LR, para que sea justo — y entra a la batalla.",
  },
];

export const OVERCLOCK_TOUR_STEPS: Record<Language, CoachmarkStepDef[]> = { en: tourStepsEn, es: tourStepsEs };

/** The intro modal's own title/subtitle — separate from FeatureIntroModal's generic "Skip"/CTA
 * button text (lib/i18n/translations.ts's tutorial.*, reused by every feature-intro modal). */
export const OVERCLOCK_MODAL_TEXT: Record<Language, { title: string; subtitle: string }> = {
  en: { title: "Overclock", subtitle: "A new weekly ranked boss fight" },
  es: { title: "Overclock", subtitle: "Un nuevo jefe ranqueado semanal" },
};
