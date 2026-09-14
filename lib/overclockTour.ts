import type { CoachmarkStepDef, FeatureIntroItem } from "@/lib/whatsNew";

/** Local-only "have I seen this" id — same seenTutorialTips array WhatsNewTour.tsx's own id lives
 * in, see lib/whatsNew.ts's comment on that tradeoff. Separate id (and separate tour) from
 * whats-new-v1: that one is a maintenance-wide changelog gated to the Hub, this one is a single
 * feature's own first-run walkthrough gated to /overclock — a player could plausibly reach
 * Overclock long before or after any given maintenance's changelog fires. */
export const OVERCLOCK_TOUR_SEEN_ID = "overclock-tour-v1";

export const OVERCLOCK_INTRO_ITEMS: FeatureIntroItem[] = [
  { title: "One Boss, All Week", body: "A single boss rotates in every week, 2-on-1 — and it gets tougher with every turn it takes." },
  { title: "Score = Damage Dealt", body: "Win or lose, your best single run's total damage is what counts toward the leaderboard." },
  { title: "Climb The Ranking", body: "Repeat as many times as you want — only your top score is kept. Top 3 each week win real rewards." },
];

export const OVERCLOCK_TOUR_STEPS: CoachmarkStepDef[] = [
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
