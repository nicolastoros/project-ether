import type { LucideIcon } from "lucide-react";
import {
  Award,
  Castle,
  Calendar,
  Compass,
  Flame,
  Map,
  Skull,
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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Play",
    items: [
      { href: "/hub", label: "Hub", icon: Castle },
      { href: "/campaign", label: "Campaign", icon: Map },
      { href: "/survival", label: "Survival", icon: Skull },
      { href: "/events", label: "Events", icon: Calendar },
      { href: "/raid", label: "Raid Battle", icon: Flame },
      { href: "/expeditions", label: "Expeditions", icon: Compass },
      { href: "/gacha", label: "Summon", icon: Sparkles },
      { href: "/pvp", label: "PvP Arena", icon: Trophy },
    ],
  },
  {
    title: "Collection",
    items: [
      { href: "/monsters", label: "Monsters", icon: PawPrint },
      // "Formations" stays exactly where it was — it just now opens the new Dokkan-style submenu
      // (app/(game)/formations/page.tsx) instead of going straight to the team builder, which
      // moved to /formations/teams. "Dex" is dropped here since it's reachable from that submenu
      // now (and still lives at /dex, just not top-level nav) — see the submenu's "Monster Dex" tile.
      { href: "/formations", label: "Formations", icon: Users },
      { href: "/inventory", label: "Inventory", icon: ShieldHalf },
      { href: "/tamer", label: "Tamer", icon: Shirt },
      { href: "/shop", label: "Shop", icon: Store },
      { href: "/trophies", label: "Trophies", icon: Award },
    ],
  },
  {
    title: "Social",
    items: [
      { href: "/friends", label: "Friends", icon: UserPlus },
      { href: "/guild", label: "Guild", icon: Shield },
    ],
  },
];

const ADMIN_NAV_GROUP: NavGroup = {
  title: "Admin",
  items: [{ href: "/admin", label: "Admin Panel", icon: ShieldAlert }],
};

/** NAV_GROUPS plus the Admin group, only for accounts with profile.isAdmin — every other player
 * never sees it, in the sidebar or the mobile drawer (both call this instead of NAV_GROUPS
 * directly). The /admin route itself is guarded server-side too (see app/(game)/admin/page.tsx
 * and every app/api/admin/* route) — hiding the nav entry is a UX nicety, not the real gate. */
export function getNavGroups(isAdmin: boolean): NavGroup[] {
  return isAdmin ? [...NAV_GROUPS, ADMIN_NAV_GROUP] : NAV_GROUPS;
}

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/hub", label: "Hub", icon: Castle },
  { href: "/campaign", label: "Campaign", icon: Map },
  { href: "/gacha", label: "Summon", icon: Sparkles },
  { href: "/party", label: "Party", icon: Users },
];
