"use client";

import { useGameStore } from "@/lib/store";
import { TRANSLATIONS, type TranslationKey } from "@/lib/i18n/translations";

/** `const t = useT();` then `t("nav.hub")`, or `t("battle.log.poison_damage", { name: "Agumon",
 * amount: 40 })` for a template with `{placeholder}` tokens (see lib/combat.ts's BattleLogEntry —
 * the only current user of the params form). Resolves against the store's persisted `language`
 * (see lib/store.ts) — purely client-side, no network/database round trip, same as every other
 * local-only UI preference in this app. */
export function useT() {
  const language = useGameStore((s) => s.language);
  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    const template = TRANSLATIONS[language][key];
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, token: string) =>
      token in params ? String(params[token]) : match
    );
  };
}
