import Image from "next/image";
import type { InventoryItem } from "@/types/game";
import { CATEGORY_ICON } from "@/lib/inventoryVisuals";
import { cn } from "@/lib/utils";

/** Real art (item.icon) when set, falling back to the category's Lucide icon otherwise — reused
 * everywhere an ITEM_CATALOG entry is shown (Inventory, victory panels, Expeditions results). */
export function ItemIcon({ item, className }: { item: InventoryItem; className?: string }) {
  if (item.icon) {
    return <Image src={item.icon} alt="" width={40} height={40} className={cn("object-contain", className)} />;
  }
  const Icon = CATEGORY_ICON[item.category];
  return <Icon className={className} />;
}
