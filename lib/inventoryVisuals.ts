import { FlaskConical, Gem, Hammer, KeyRound, Palette } from "lucide-react";
import type { InventoryItemCategory } from "@/types/game";

// Kept separate from lib/gameData.ts (which server-only modules like lib/db/bigquery.ts import)
// so pulling in lucide-react/React never leaks into that server bundle — same reasoning as
// lib/elementVisuals.ts's ELEMENT_ICON.
export const CATEGORY_ICON: Record<InventoryItemCategory, typeof FlaskConical> = {
  Consumable: FlaskConical,
  Quest: KeyRound,
  Evolution: Gem,
  Skin: Palette,
  Crafting: Hammer,
};
