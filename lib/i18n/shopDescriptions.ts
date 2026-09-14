import type { PremiumShopItem, ShopListing } from "@/lib/gameData";
import type { Language } from "./translations";

// Same pattern as skillDescriptions.ts/itemDescriptions.ts: a separate ES-only lookup keyed by
// the stable listing id, instead of touching SHOP_LISTINGS/PREMIUM_SHOP_ITEMS in lib/gameData.ts.
export const SHOP_LISTING_DESCRIPTION_ES: Record<string, string> = {
  "shop-chicken": "Restaura 30 de energía del Tamer.",
  "shop-training-box": "Otorga 200 EXP a una Criatura.",
  "shop-training-trx": "Otorga 600 EXP a una Criatura.",
  "shop-training-dumbbell": "Otorga 1500 EXP a una Criatura.",
  "shop-skin-crimson-emberling": "Una apariencia alternativa para Emberling.",
  "shop-creature-venomshade": "Una Criatura de tipo Oscuridad, disponible directamente por gemas.",
  "shop-creature-tidewarden": "Una Criatura de tipo Agua, disponible directamente por gemas.",
  "shop-orb-s-fire": "50x Orbes Rojos Pequeños",
  "shop-orb-m-fire": "20x Orbes Rojos Medianos",
  "shop-orb-l-fire": "5x Orbes Rojos Grandes",
  "shop-orb-s-water": "50x Orbes Azules Pequeños",
  "shop-orb-m-water": "20x Orbes Azules Medianos",
  "shop-orb-l-water": "5x Orbes Azules Grandes",
  "shop-orb-s-nature": "50x Orbes Verdes Pequeños",
  "shop-orb-m-nature": "20x Orbes Verdes Medianos",
  "shop-orb-l-nature": "5x Orbes Verdes Grandes",
  "shop-orb-s-light": "50x Orbes Amarillos Pequeños",
  "shop-orb-m-light": "20x Orbes Amarillos Medianos",
  "shop-orb-l-light": "5x Orbes Amarillos Grandes",
  "shop-orb-s-dark": "50x Orbes Morados Pequeños",
  "shop-orb-m-dark": "20x Orbes Morados Medianos",
  "shop-orb-l-dark": "5x Orbes Morados Grandes",
  "shop-orb-s-electric": "50x Orbes Cian Pequeños",
  "shop-orb-m-electric": "20x Orbes Cian Medianos",
  "shop-orb-l-electric": "5x Orbes Cian Grandes",
  "shop-orb-s-neutral": "50x Orbes Grises Pequeños",
  "shop-orb-m-neutral": "20x Orbes Grises Medianos",
  "shop-orb-l-neutral": "5x Orbes Grises Grandes",
};

export const PREMIUM_ITEM_NAME_ES: Record<string, string> = {
  "premium-lacrima": "Lacrima",
  "premium-lacrima-pack01": "Paquete de Lacrima",
  "premium-lacrima-pack02": "Lote de Lacrima",
  "premium-lacrima-bag": "Bolsa de Lacrima",
  "premium-lacrima-box": "Caja de Lacrima",
};

export const PREMIUM_ITEM_DESCRIPTION_ES: Record<string, string> = {
  "premium-lacrima": "Una única Lacrima reluciente.",
  "premium-lacrima-pack01": "Un pequeño paquete de Lacrima.",
  "premium-lacrima-pack02": "Un lote más grande de Lacrima.",
  "premium-lacrima-bag": "Una bolsa repleta de Lacrima.",
  "premium-lacrima-box": "Una caja rebosante de Lacrima.",
};

export function getShopListingDescription(listing: ShopListing, language: Language): string {
  if (language !== "es") return listing.description;
  return SHOP_LISTING_DESCRIPTION_ES[listing.id] ?? listing.description;
}

export function getPremiumItemName(item: PremiumShopItem, language: Language): string {
  if (language !== "es") return item.name;
  return PREMIUM_ITEM_NAME_ES[item.id] ?? item.name;
}

export function getPremiumItemDescription(item: PremiumShopItem, language: Language): string {
  if (language !== "es") return item.description;
  return PREMIUM_ITEM_DESCRIPTION_ES[item.id] ?? item.description;
}

// GACHA_BANNERS (lib/gameData.ts) — banner name stays untranslated (marketing brand, same
// proper-noun rule as skill/ultimate names); only the tagline is localized.
export const GACHA_BANNER_TAGLINE_ES: Record<string, string> = {
  "banner-legendary": "Invoca a los mayores campeones.",
  "banner-lr-omega": "El pináculo absoluto del poder.",
  "banner-lr-abaddo": "Abraza la inevitable entropía.",
};

export function getGachaBannerTagline(bannerId: string, tagline: string, language: Language): string {
  if (language !== "es") return tagline;
  return GACHA_BANNER_TAGLINE_ES[bannerId] ?? tagline;
}
