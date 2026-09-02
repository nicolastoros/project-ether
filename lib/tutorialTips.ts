export interface TutorialTip {
  /** Persisted "seen" key — also used as the row key in the Monster Guide. Stable once shipped;
   * changing it would make an already-dismissed tip reappear for existing players. */
  id: string;
  title: string;
  body: string;
}

/** One tip per screen, keyed by its route pathname. TutorialBubble.tsx looks this up against
 * usePathname() and shows it once (see lib/store.ts's seenTutorialTips); MonsterGuideModal.tsx
 * lists every entry here as a permanent reference. Keep each body to 1-2 short sentences — this
 * is meant to be a quick nudge, not documentation. */
export const TUTORIAL_TIPS: Record<string, TutorialTip> = {
  "/hub": {
    id: "hub",
    title: "Hub",
    body: "Your home base — see your active creature, daily tasks, and quick links to Raid Battle, Summon, the Blacksmith, and the Arena.",
  },
  "/campaign": {
    id: "campaign",
    title: "Campaign",
    body: "Each World has a run of Stages leading to a Boss — clear them for Gold, EXP, and gear. Every stage also has Easy/Medium/Hard/Super difficulty tiers, unlocked one at a time as you clear the one before.",
  },
  "/survival": {
    id: "survival",
    title: "Survival",
    body: "Fight back-to-back waves of enemies without a break — see how far your team can push before it falls, for its own set of rewards.",
  },
  "/events": {
    id: "events",
    title: "Events",
    body: "Limited-time content — right now, Hidden Training stages that reward extra items and EXP.",
  },
  "/raid": {
    id: "raid",
    title: "Raid Battle",
    body: "Bring up to 4 creatures to take down a single tough boss — harder difficulty tiers hit much harder but pay out better rewards.",
  },
  "/expeditions": {
    id: "expeditions",
    title: "Expeditions",
    body: "Send creatures that aren't in your active team out on a timed expedition — they'll come back with Gold, items, and EXP once it's done.",
  },
  "/gacha": {
    id: "gacha",
    title: "Summon",
    body: "Spend Gems or tickets to summon new creatures and equipment — Multi-Summon pulls several at once for a better rate on rarer ones.",
  },
  "/pvp": {
    id: "pvp",
    title: "PvP Arena",
    body: "Battle other players' defense teams to climb the rankings and earn rank-up rewards.",
  },
  "/monsters": {
    id: "monsters",
    title: "Monsters",
    body: "Your full roster — check each creature's stats and skills, equip gear, and train its Super Attack with duplicate copies.",
  },
  "/formations": {
    id: "formations",
    title: "Formation Menu",
    body: "Build your team, sell creatures you don't need, unlock Hidden Potential, or browse the full Monster Dex — all from here.",
  },
  "/formations/teams": {
    id: "formations-teams",
    title: "Formations",
    body: "Build and save team presets for your hub team and party — swap creatures in and out and pick which formation to bring into battle.",
  },
  "/formations/sell": {
    id: "formations-sell",
    title: "Sell Monster",
    body: "Trade extra copies of creatures you don't need for Gold — you can't sell your last copy of one that's in your hub team, party, or a saved formation.",
  },
  "/formations/potential": {
    id: "formations-potential",
    title: "Hidden Potential",
    body: "Pick any creature you own to see its potential tree — spend duplicate copies to unlock permanent stat and skill bonuses.",
  },
  "/dex": {
    id: "dex",
    title: "Monster Dex",
    body: "Every creature in the Digital World, discovered or not — owned ones show in color, the rest stay grayed out until you get one.",
  },
  "/inventory": {
    id: "inventory",
    title: "Inventory",
    body: "Consumables, evolution materials, and other items you've collected — use or sell them from here.",
  },
  "/tamer": {
    id: "tamer",
    title: "Tamer",
    body: "Your own avatar and its gear — equipped pieces buff every creature in battle, not just one.",
  },
  "/shop": {
    id: "shop",
    title: "Shop",
    body: "Spend Gold or Gems on items and gear, or sell items you don't need for Gold.",
  },
  "/trophies": {
    id: "trophies",
    title: "Trophies",
    body: "Achievements earned for milestones — clearing tough content, exploring the Digital World, and more.",
  },
};
