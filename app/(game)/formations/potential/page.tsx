"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import { HiddenPotentialScreen } from "@/components/monsters/HiddenPotentialScreen";
import { BackButton } from "@/components/ui/BackButton";
import { useT } from "@/lib/i18n/useT";

export default function HiddenPotentialPickerPage() {
  const t = useT();
  const creatures = useGameStore((s) => s.creatures);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const openedCreature = openedId ? creatures.find((c) => c.id === openedId) : null;
  if (openedCreature) {
    return <HiddenPotentialScreen creature={openedCreature} onClose={() => setOpenedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 lg:gap-4">
        <BackButton href="/formations" label={t("dex.back_to_formation_menu")} />
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">{t("potential.title")}</h1>
          <p className="mt-1 text-xs text-zinc-500">{t("formations.choose_creature_potential")}</p>
        </div>
      </div>

      <MultiCreaturePicker
        creatures={creatures}
        selectedIds={selectedId ? [selectedId] : []}
        maxCount={1}
        onToggle={(id) => setSelectedId((prev) => (prev === id ? null : id))}
        onConfirm={() => setOpenedId(selectedId)}
        confirmLabel={t("formations.view_potential_tree")}
      />
    </div>
  );
}
