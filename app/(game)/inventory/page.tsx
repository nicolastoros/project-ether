import { ShieldHalf } from "lucide-react";
import { PlaceholderView } from "@/components/ui/PlaceholderView";

export default function InventoryPage() {
  return (
    <PlaceholderView
      icon={ShieldHalf}
      title="Inventory & Blacksmith"
      description="The 10-slot gear grid and refinement modal (+0 to +10) land next."
    />
  );
}
