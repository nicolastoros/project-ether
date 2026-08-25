import Image from "next/image";
import { cn } from "@/lib/utils";

/** Icon for the `gems` currency (displayed as "Crowns") — the premium/paid currency. */
export function CrownIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/ui/crown.png"
      alt=""
      width={32}
      height={32}
      className={cn("h-4 w-4 shrink-0 object-contain", className)}
    />
  );
}
