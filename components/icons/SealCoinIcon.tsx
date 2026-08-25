import Image from "next/image";
import { cn } from "@/lib/utils";

/** Icon for the `sealCoins` currency — dropped by Campaign stages, spent crafting Tamer gear. */
export function SealCoinIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/ui/seal_coin.png"
      alt=""
      width={32}
      height={32}
      className={cn("h-4 w-4 shrink-0 object-contain", className)}
    />
  );
}
