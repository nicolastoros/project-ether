import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Creature,
  Currencies,
  DailyTask,
  DungeonProgress,
  Equipment,
  UserProfile,
} from "@/types/game";
import {
  DEFAULT_DAILY_TASKS,
  DEFAULT_PROFILE,
  HUB_TEAM_SIZE,
  STARTER_CREATURES,
  STARTER_EQUIPMENT,
} from "@/lib/gameData";
// Type-only import: erased at compile time, so this never pulls the server-only
// BigQuery client (lib/db/bigquery.ts) into the client bundle.
import type { AccountBundle } from "@/lib/db/bigquery";

export { HUB_TEAM_SIZE };
const BOX_EXP_PER_SECOND = 1.5;
const MAX_TICK_SECONDS = 6 * 60 * 60; // cap catch-up so a long-idle tab can't grant absurd EXP

function applyExpGain(creature: Creature, gained: number): Creature {
  let exp = creature.exp + gained;
  let level = creature.level;
  let expToNextLevel = creature.expToNextLevel;
  let baseStats = creature.baseStats;

  while (exp >= expToNextLevel) {
    exp -= expToNextLevel;
    level += 1;
    expToNextLevel = Math.round(expToNextLevel * 1.15);
    baseStats = {
      hp: baseStats.hp + 8,
      atk: baseStats.atk + 3,
      def: baseStats.def + 2,
      spd: baseStats.spd + 1,
    };
  }

  return { ...creature, level, exp, expToNextLevel, baseStats };
}

interface GameState {
  profile: UserProfile;
  currencies: Currencies;
  creatures: Creature[];
  activeCreatureId: string;
  partyCreatureIds: (string | null)[];
  hubTeamIds: string[];
  lastExpTickAt: number;
  inventory: Equipment[];
  dungeon: DungeonProgress;
  dailyTasks: DailyTask[];
  /** Highest Survival stage number cleared so far (see lib/survivalStages.ts) — local-only for now, same as `dungeon`. */
  survivalHighestStageCleared: number;
  hasHydrated: boolean;

  /** Replaces local profile/currencies/creatures/dungeon with what the server (BigQuery) has on file, right after sign-in or registration. */
  hydrateFromServer: (bundle: AccountBundle) => void;
  /** Clears account-specific local state so a different account signing in next doesn't inherit it. */
  logout: () => void;
  setHasHydrated: (hydrated: boolean) => void;

  setActiveCreature: (creatureId: string) => void;
  setPartySlot: (slotIndex: number, creatureId: string | null) => void;
  toggleHubTeamMember: (creatureId: string) => void;
  tickBoxExp: () => void;
  gainCreatureExp: (creatureId: string, amount: number) => void;

  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  spendEnergy: (amount: number) => boolean;
  regenEnergy: (amount: number) => void;

  equipItem: (creatureId: string, equipmentId: string) => void;
  unequipItem: (creatureId: string, equipmentId: string) => void;
  enhanceEquipment: (equipmentId: string) => void;

  toggleAutoBattle: () => void;
  toggleAutoDg: () => void;
  setSpeedMultiplier: (speed: 1 | 2 | 4) => void;

  clearSurvivalStage: (stageNumber: number) => void;

  claimTask: (taskId: string) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      currencies: {
        gold: 45230,
        gems: 1280,
        energy: 82,
        energyMax: 120,
        energyRegenMinutes: 5,
      },
      creatures: STARTER_CREATURES,
      activeCreatureId: STARTER_CREATURES[0].id,
      partyCreatureIds: STARTER_CREATURES.slice(0, 3).map((c) => c.id),
      hubTeamIds: STARTER_CREATURES.slice(0, HUB_TEAM_SIZE).map((c) => c.id),
      lastExpTickAt: Date.now(),
      inventory: STARTER_EQUIPMENT,
      dungeon: {
        highestStageCleared: 0,
        currentWave: 0,
        autoBattleEnabled: false,
        autoDgEnabled: false,
        speedMultiplier: 1,
      },
      dailyTasks: DEFAULT_DAILY_TASKS,
      survivalHighestStageCleared: 0,
      hasHydrated: false,

      hydrateFromServer: (bundle) => {
        const creatureCatalogById = new Map(STARTER_CREATURES.map((c) => [c.id, c]));
        const creatures = bundle.creatures
          .map((owned): Creature | null => {
            const base = creatureCatalogById.get(owned.creatureId);
            if (!base) return null;
            return {
              ...base,
              level: owned.level,
              exp: owned.exp,
              expToNextLevel: owned.expToNextLevel,
              baseStats: { hp: owned.hp, atk: owned.atk, def: owned.def, spd: owned.spd },
              equipment: {},
            };
          })
          .filter((c): c is Creature => c !== null);

        const equipmentCatalogById = new Map(STARTER_EQUIPMENT.map((e) => [e.id, e]));
        const inventory = bundle.equipment
          .map((owned): Equipment | null => {
            const base = equipmentCatalogById.get(owned.equipmentId);
            if (!base) return null;
            return { ...base, enhancementLevel: owned.enhancementLevel, equippedTo: owned.equippedTo ?? undefined };
          })
          .filter((e): e is Equipment => e !== null);

        const hubTeamIds = bundle.creatures.filter((c) => c.isInHubTeam).map((c) => c.creatureId);
        const partyCreatureIds: (string | null)[] = [null, null, null];
        for (const c of bundle.creatures) {
          if (c.partySlot && c.partySlot >= 1 && c.partySlot <= 3) {
            partyCreatureIds[c.partySlot - 1] = c.creatureId;
          }
        }

        set({
          profile: {
            id: bundle.profile.id,
            name: bundle.profile.displayName,
            title: bundle.profile.title,
            level: bundle.profile.level,
            exp: bundle.profile.exp,
            expToNextLevel: bundle.profile.expToNextLevel,
            avatarKey: bundle.profile.avatarKey,
            isAdmin: bundle.profile.isAdmin,
          },
          currencies: bundle.currencies,
          creatures,
          activeCreatureId: creatures[0]?.id ?? "",
          partyCreatureIds,
          hubTeamIds,
          lastExpTickAt: Date.now(),
          inventory,
          dungeon: bundle.dungeon,
          // Not synced server-side yet (see docs/gcp-database-schema.md) — reset so a different
          // account signing in on this browser doesn't inherit the previous one's local progress.
          survivalHighestStageCleared: 0,
        });
      },

      logout: () =>
        set({
          profile: DEFAULT_PROFILE,
          currencies: {
            gold: 0,
            gems: 0,
            energy: 0,
            energyMax: 120,
            energyRegenMinutes: 5,
          },
          creatures: [],
          activeCreatureId: "",
          partyCreatureIds: [null, null, null],
          hubTeamIds: [],
          inventory: [],
          dungeon: {
            highestStageCleared: 0,
            currentWave: 0,
            autoBattleEnabled: false,
            autoDgEnabled: false,
            speedMultiplier: 1,
          },
          survivalHighestStageCleared: 0,
        }),

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      setActiveCreature: (creatureId) => set({ activeCreatureId: creatureId }),

      setPartySlot: (slotIndex, creatureId) =>
        set((state) => {
          const next = [...state.partyCreatureIds];
          // A creature can only occupy one slot at a time.
          for (let i = 0; i < next.length; i++) {
            if (next[i] === creatureId) next[i] = null;
          }
          next[slotIndex] = creatureId;
          return { partyCreatureIds: next };
        }),

      toggleHubTeamMember: (creatureId) =>
        set((state) => {
          const isMember = state.hubTeamIds.includes(creatureId);

          if (isMember) {
            const nextTeam = state.hubTeamIds.filter((id) => id !== creatureId);
            const activeCreatureId =
              state.activeCreatureId === creatureId
                ? nextTeam[0] ?? state.creatures[0]?.id ?? state.activeCreatureId
                : state.activeCreatureId;
            return { hubTeamIds: nextTeam, activeCreatureId };
          }

          if (state.hubTeamIds.length >= HUB_TEAM_SIZE) return state;
          return { hubTeamIds: [...state.hubTeamIds, creatureId] };
        }),

      tickBoxExp: () =>
        set((state) => {
          const now = Date.now();
          const elapsedSeconds = Math.min(
            MAX_TICK_SECONDS,
            Math.max(0, (now - state.lastExpTickAt) / 1000)
          );
          if (elapsedSeconds < 1) return state;

          const gained = elapsedSeconds * BOX_EXP_PER_SECOND;
          const hubSet = new Set(state.hubTeamIds);
          return {
            lastExpTickAt: now,
            creatures: state.creatures.map((c) =>
              hubSet.has(c.id) ? c : applyExpGain(c, gained)
            ),
          };
        }),

      gainCreatureExp: (creatureId, amount) =>
        set((state) => ({
          creatures: state.creatures.map((c) =>
            c.id === creatureId ? applyExpGain(c, amount) : c
          ),
        })),

      addGold: (amount) =>
        set((state) => ({
          currencies: { ...state.currencies, gold: state.currencies.gold + amount },
        })),

      spendGold: (amount) => {
        const { currencies } = get();
        if (currencies.gold < amount) return false;
        set({ currencies: { ...currencies, gold: currencies.gold - amount } });
        return true;
      },

      addGems: (amount) =>
        set((state) => ({
          currencies: { ...state.currencies, gems: state.currencies.gems + amount },
        })),

      spendGems: (amount) => {
        const { currencies } = get();
        if (currencies.gems < amount) return false;
        set({ currencies: { ...currencies, gems: currencies.gems - amount } });
        return true;
      },

      spendEnergy: (amount) => {
        const { currencies } = get();
        if (currencies.energy < amount) return false;
        set({ currencies: { ...currencies, energy: currencies.energy - amount } });
        return true;
      },

      regenEnergy: (amount) =>
        set((state) => ({
          currencies: {
            ...state.currencies,
            energy: Math.min(state.currencies.energyMax, state.currencies.energy + amount),
          },
        })),

      equipItem: (creatureId, equipmentId) =>
        set((state) => {
          const item = state.inventory.find((eq) => eq.id === equipmentId);
          if (!item) return state;
          return {
            inventory: state.inventory.map((eq) =>
              eq.id === equipmentId ? { ...eq, equippedTo: creatureId } : eq
            ),
            creatures: state.creatures.map((c) =>
              c.id === creatureId
                ? { ...c, equipment: { ...c.equipment, [item.slot]: equipmentId } }
                : c
            ),
          };
        }),

      unequipItem: (creatureId, equipmentId) =>
        set((state) => {
          const item = state.inventory.find((eq) => eq.id === equipmentId);
          if (!item) return state;
          return {
            inventory: state.inventory.map((eq) =>
              eq.id === equipmentId ? { ...eq, equippedTo: undefined } : eq
            ),
            creatures: state.creatures.map((c) => {
              if (c.id !== creatureId) return c;
              const nextEquipment = { ...c.equipment };
              delete nextEquipment[item.slot];
              return { ...c, equipment: nextEquipment };
            }),
          };
        }),

      enhanceEquipment: (equipmentId) =>
        set((state) => ({
          inventory: state.inventory.map((eq) =>
            eq.id === equipmentId && eq.enhancementLevel < 10
              ? { ...eq, enhancementLevel: eq.enhancementLevel + 1 }
              : eq
          ),
        })),

      toggleAutoBattle: () =>
        set((state) => ({
          dungeon: { ...state.dungeon, autoBattleEnabled: !state.dungeon.autoBattleEnabled },
        })),

      toggleAutoDg: () =>
        set((state) => ({
          dungeon: { ...state.dungeon, autoDgEnabled: !state.dungeon.autoDgEnabled },
        })),

      setSpeedMultiplier: (speed) =>
        set((state) => ({ dungeon: { ...state.dungeon, speedMultiplier: speed } })),

      clearSurvivalStage: (stageNumber) =>
        set((state) => ({
          survivalHighestStageCleared: Math.max(state.survivalHighestStageCleared, stageNumber),
        })),

      claimTask: (taskId) =>
        set((state) => {
          const task = state.dailyTasks.find((t) => t.id === taskId);
          if (!task || task.claimed || task.progress < task.target) return state;
          return {
            dailyTasks: state.dailyTasks.map((t) =>
              t.id === taskId ? { ...t, claimed: true } : t
            ),
            currencies: {
              ...state.currencies,
              gold: state.currencies.gold + (task.rewardGold ?? 0),
              gems: state.currencies.gems + (task.rewardGems ?? 0),
            },
          };
        }),
    }),
    {
      name: "monster-gacha-save",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Creatures and equipment are mostly design/content data we control from code —
      // always take the latest definitions on load so name, sprite, or skill changes
      // show up immediately instead of being shadowed by whatever shape happened to be
      // cached in the browser from an earlier session. Level/EXP/stat growth and gear
      // assignment ARE real player progress though, so those are preserved per id.
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState;
        const persisted = persistedState as Partial<GameState>;
        const merged: GameState = { ...currentState, ...persisted };

        // Only the creatures this account actually owns get persisted — refresh their
        // definition (name/sprite/skills/...) from the current catalog by id, but never
        // add catalog entries back in just because they exist in code (a real account's
        // roster is whatever the player owns, not "everything we've ever designed").
        const catalogById = new Map(STARTER_CREATURES.map((c) => [c.id, c]));
        merged.creatures = (persisted.creatures ?? []).map((saved) => {
          const base = catalogById.get(saved.id);
          return base
            ? {
                ...base,
                level: saved.level,
                exp: saved.exp,
                expToNextLevel: saved.expToNextLevel,
                baseStats: saved.baseStats,
                equipment: saved.equipment,
              }
            : saved;
        });

        // Same rule as creatures above: only equipment this account actually owns is
        // kept, refreshed by id from the current content definitions. Real accounts
        // don't own any starter gear yet (equipment isn't wired up server-side), so
        // this intentionally stays empty for them instead of showing demo items.
        const catalogEquipmentById = new Map(STARTER_EQUIPMENT.map((e) => [e.id, e]));
        merged.inventory = (persisted.inventory ?? []).map((saved) => {
          const item = catalogEquipmentById.get(saved.id);
          return item
            ? { ...item, enhancementLevel: saved.enhancementLevel, equippedTo: saved.equippedTo }
            : saved;
        });

        return merged;
      },
    }
  )
);

export const useActiveCreature = () =>
  useGameStore((state) =>
    state.creatures.find((c) => c.id === state.activeCreatureId) ?? state.creatures[0]
  );
