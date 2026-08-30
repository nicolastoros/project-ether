import type { LucideIcon } from "lucide-react";
import {
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
      { href: "/formations", label: "Formations", icon: Users },
      { href: "/inventory", label: "Inventory", icon: ShieldHalf },
      { href: "/tamer", label: "Tamer", icon: Shirt },
      { href: "/shop", label: "Shop", icon: Store },
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
