import { Flame, Droplet, Leaf, Sun, Moon, Zap, CircleDashed } from "lucide-react";
import type { Element } from "@/types/game";

export const ELEMENT_ICON: Record<Element, typeof Flame> = {
  Fire: Flame,
  Water: Droplet,
  Nature: Leaf,
  Light: Sun,
  Dark: Moon,
  Electric: Zap,
  Neutral: CircleDashed,
};

export const ELEMENT_GRADIENT: Record<Element, string> = {
  Fire: "from-orange-300/80 via-orange-200/50 to-transparent",
  Water: "from-sky-300/80 via-sky-200/50 to-transparent",
  Nature: "from-emerald-300/80 via-emerald-200/50 to-transparent",
  Light: "from-yellow-200/80 via-yellow-100/50 to-transparent",
  Dark: "from-purple-300/70 via-purple-200/45 to-transparent",
  Electric: "from-yellow-300/80 via-sky-200/40 to-transparent",
  Neutral: "from-slate-300/70 via-slate-200/45 to-transparent",
};

/** Bolder, full-bleed version of ELEMENT_GRADIENT for hero/banner surfaces. */
export const ELEMENT_HERO_GRADIENT: Record<Element, string> = {
  Fire: "from-orange-200 via-amber-100 to-rose-50",
  Water: "from-sky-200 via-cyan-100 to-blue-50",
  Nature: "from-emerald-200 via-lime-100 to-green-50",
  Light: "from-yellow-100 via-amber-50 to-white",
  Dark: "from-violet-200 via-purple-100 to-indigo-50",
  Electric: "from-yellow-200 via-sky-100 to-cyan-50",
  Neutral: "from-slate-200 via-zinc-100 to-white",
};
