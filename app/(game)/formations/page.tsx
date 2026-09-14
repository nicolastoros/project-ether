"use client";

import { MenuBannerButton } from "@/components/ui/MenuBannerButton";
import { useT } from "@/lib/i18n/useT";
import type { TranslationKey } from "@/lib/i18n/translations";

const MENU_TILES = [
  { href: "/formations/teams", image: "/assets/events/menu_formations.png", labelKey: "formations.tile_formations" },
  { href: "/formations/sell", image: "/assets/events/menu_sell.png", labelKey: "formations.tile_sell_monster" },
  { href: "/formations/potential", image: "/assets/events/menu_hidden_potential.png", labelKey: "formations.tile_hidden_potential" },
  { href: "/dex", image: "/assets/events/menu_monster_dex.png", labelKey: "formations.tile_monster_dex" },
] as const satisfies { href: string; image: string; labelKey: TranslationKey }[];

export default function FormationsMenuPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">{t("formations.menu_title")}</h1>
        <p className="mt-1 text-xs text-zinc-500">{t("formations.menu_subtitle")}</p>
      </div>

      {/* Capped at max-w-3xl on mobile (already reads well there per the reference screenshot) and
          growing aggressively through lg/xl/2xl — nearly to AppShell's own 1600px content cap —
          so the wide banners actually fill a big desktop screen instead of sitting tiny in a sea
          of whitespace. MenuBannerButton's own label text scales up alongside via its own
          lg:/xl:/2xl: classes (see labelSizeClassName below). */}
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:max-w-5xl lg:gap-6 xl:max-w-6xl xl:gap-8 2xl:max-w-[1500px] 2xl:gap-10">
        {MENU_TILES.map((tile) => (
          <MenuBannerButton
            key={tile.href}
            href={tile.href}
            image={tile.image}
            label={t(tile.labelKey)}
            labelSizeClassName="text-sm sm:text-base lg:text-xl xl:text-2xl 2xl:text-3xl"
          />
        ))}
      </div>
    </div>
  );
}
