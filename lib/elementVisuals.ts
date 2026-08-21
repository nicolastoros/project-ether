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
