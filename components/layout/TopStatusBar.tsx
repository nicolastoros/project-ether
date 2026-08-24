"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Coins, Gem, UserCircle2, LogOut } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function TopStatusBar() {
  const profile = useGameStore((s) => s.profile);
  const currencies = useGameStore((s) => s.currencies);
  const logout = useGameStore((s) => s.logout);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 border-b border-arcade-border bg-arcade-panel/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold bg-arcade-panel-light glow-border-gold">
            <UserCircle2 className="h-5 w-5 text-gold-bright" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {profile.name}{" "}
              <span className="text-zinc-600">Lv.{profile.level}</span>
            </p>
            <p className="truncate text-[10px] text-zinc-600">{profile.title}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <CurrencyPill icon={Coins} value={currencies.gold} iconClassName="text-gold-bright" />
          <CurrencyPill icon={Gem} value={currencies.gems} iconClassName="text-neon" />
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              logout();
              router.replace("/");
            }}
            aria-label="Log out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-600 transition-colors hover:border-red-500 hover:text-red-500 lg:hidden"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 pb-2 lg:px-6">
        <ProgressBar
          percent={(currencies.energy / currencies.energyMax) * 100}
          color="energy"
          label={`Energy ${currencies.energy}/${currencies.energyMax}`}
          className="lg:max-w-xs"
        />
      </div>
    </header>
  );
}
