import Image from "next/image";
import { cn } from "@/lib/utils";

/** Icon for the `gold` currency, earned from Campaign/Survival stage clears. */
export function GoldCoinIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/ui/gold_coin.png"
      alt=""
      width={32}
      height={32}
      className={cn("h-4 w-4 shrink-0 object-contain", className)}
    />
  );
}
