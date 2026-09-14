import type { LucideIcon } from "lucide-react";
import {
  Award,
  Castle,
  Calendar,
  Map,
  Rocket,
  Sparkles,
  Store,
  Users,
  ShieldHalf,
  Trophy,
  PawPrint,
  UserPlus,
  Shield,
  Shirt,
  ShieldAlert,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translations";

// labelKey/titleKey (not raw display strings) — resolve with useT() (lib/i18n/useT.ts) at render
// time in Sidebar.tsx/MobileDrawer.tsx/BottomNav.tsx. Keeps this file (and everything that reads
// href/icon off it) language-agnostic; only the render sites need to know about the active locale.
export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export interface NavGroup {
  titleKey: TranslationKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "nav.play",
    items: [
      { href: "/hub", labelKey: "nav.hub", icon: Castle },
      // Dokkan-style single entry point — Campaign ("Adventure") and Survival ("Survivor") moved
      // here from their own top-level links, joined by Overclock and Infinite Tower (both still
      // "Coming Soon" — see app/(game)/start/page.tsx). Keeps this list from growing one item per
      // new game mode forever; /campaign and /survival themselves are untouched, still real routes,
      // just reached through /start now instead of linked directly.
      { href: "/start", labelKey: "nav.start", icon: Rocket },
      // Raid Battle is no longer a standalone nav item — it moved to Events' "Extreme Battles"
      // tab (see components/events/ExtremeBattlesTab.tsx) once Events grew Dokkan-style category
      // tabs; deep-link straight to it via "/events?tab=extreme".
      { href: "/events", labelKey: "nav.events", icon: Calendar },
      // Hidden from the menu for now (per the user's request) — the /expeditions route and page
      // are untouched, so re-adding this entry later is a one-line change.
      { href: "/gacha", labelKey: "nav.summon", icon: Sparkles },
      { href: "/ranking", labelKey: "nav.ranking", icon: Trophy },
    ],
  },
  {
    titleKey: "nav.collection",
    items: [
      { href: "/monsters", labelKey: "nav.monsters", icon: PawPrint },
      // "Formations" stays exactly where it was — it just now opens the new Dokkan-style submenu
      // (app/(game)/formations/page.tsx) instead of going straight to the team builder, which
      // moved to /formations/teams. "Dex" is dropped here since it's reachable from that submenu
      // now (and still lives at /dex, just not top-level nav) — see the submenu's "Monster Dex" tile.
      { href: "/formations", labelKey: "nav.formations", icon: Users },
      { href: "/inventory", labelKey: "nav.inventory", icon: ShieldHalf },
      { href: "/tamer", labelKey: "nav.tamer", icon: Shirt },
      { href: "/shop", labelKey: "nav.shop", icon: Store },
      { href: "/trophies", labelKey: "nav.trophies", icon: Award },
    ],
  },
  {
    titleKey: "nav.social",
    items: [
      { href: "/friends", labelKey: "nav.friends", icon: UserPlus },
      { href: "/guild", labelKey: "nav.guild", icon: Shield },
    ],
  },
];

const ADMIN_NAV_GROUP: NavGroup = {
  titleKey: "nav.admin_group",
  items: [{ href: "/admin", labelKey: "nav.admin_panel", icon: ShieldAlert }],
};

/** NAV_GROUPS plus the Admin group, only for accounts with profile.isAdmin — every other player
 * never sees it, in the sidebar or the mobile drawer (both call this instead of NAV_GROUPS
 * directly). The /admin route itself is guarded server-side too (see app/(game)/admin/page.tsx
 * and every app/api/admin/* route) — hiding the nav entry is a UX nicety, not the real gate. */
export function getNavGroups(isAdmin: boolean): NavGroup[] {
  return isAdmin ? [...NAV_GROUPS, ADMIN_NAV_GROUP] : NAV_GROUPS;
}

// "/party" used to be a 4th slot here but never had a real route behind it — a permanent dead
// link on mobile's bottom bar. Removed rather than repointed; BottomNav.tsx's flex-1 items and
// the trailing Menu button both reflow fine with 3.
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/hub", labelKey: "nav.hub", icon: Castle },
  { href: "/campaign", labelKey: "nav.campaign", icon: Map },
  { href: "/gacha", labelKey: "nav.summon", icon: Sparkles },
];
