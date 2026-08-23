import type { LucideIcon } from "lucide-react";
import {
  Castle,
  Map,
  Sparkles,
  Users,
  ShieldHalf,
  Swords,
  Trophy,
  PawPrint,
  UserPlus,
  Shield,
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
      { href: "/combat", label: "Combat Sandbox", icon: Swords },
      { href: "/gacha", label: "Summon", icon: Sparkles },
      { href: "/pvp", label: "PvP Arena", icon: Trophy },
    ],
  },
  {
    title: "Collection",
    items: [
      { href: "/monsters", label: "Monsters", icon: PawPrint },
      { href: "/party", label: "Party", icon: Users },
      { href: "/inventory", label: "Inventory", icon: ShieldHalf },
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

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/hub", label: "Hub", icon: Castle },
  { href: "/campaign", label: "Campaign", icon: Map },
  { href: "/gacha", label: "Summon", icon: Sparkles },
  { href: "/party", label: "Party", icon: Users },
];
