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
  STARTER_CREATURES,
  STARTER_EQUIPMENT,
} from "@/lib/gameData";

export type AuthProvider = "google" | "discord";

export interface AuthState {
  isAuthenticated: boolean;
  provider: AuthProvider | null;
}

interface GameState {
  profile: UserProfile;
  currencies: Currencies;
  creatures: Creature[];
  activeCreatureId: string;
  partyCreatureIds: (string | null)[];
  inventory: Equipment[];
  dungeon: DungeonProgress;
  dailyTasks: DailyTask[];
  auth: AuthState;
  hasHydrated: boolean;

  login: (provider: AuthProvider) => void;
  logout: () => void;
  setHasHydrated: (hydrated: boolean) => void;

  setActiveCreature: (creatureId: string) => void;
  setPartySlot: (slotIndex: number, creatureId: string | null) => void;

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
      inventory: STARTER_EQUIPMENT,
      dungeon: {
        highestStageCleared: 14,
        currentWave: 3,
        autoBattleEnabled: false,
        autoDgEnabled: false,
        speedMultiplier: 1,
      },
      dailyTasks: DEFAULT_DAILY_TASKS,
      auth: { isAuthenticated: false, provider: null },
      hasHydrated: false,

      login: (provider) => set({ auth: { isAuthenticated: true, provider } }),
      logout: () => set({ auth: { isAuthenticated: false, provider: null } }),
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
      // Creatures and equipment are design/content data we control from code, not
      // player-mutated data — always take the latest definitions on load so sprite,
      // stat, or skill changes show up immediately instead of being shadowed by
      // whatever shape happened to be cached in the browser from an earlier session.
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState;
        const persisted = persistedState as Partial<GameState>;
        const merged: GameState = { ...currentState, ...persisted };

        merged.creatures = STARTER_CREATURES;

        // Equipment enhancement level and what it's equipped to ARE real player
        // progress, so preserve those per item while refreshing everything else
        // (name, stats, rarity, sprite, ...) from the current content definitions.
        const savedEquipmentById = new Map((persisted.inventory ?? []).map((e) => [e.id, e]));
        merged.inventory = STARTER_EQUIPMENT.map((item) => {
          const saved = savedEquipmentById.get(item.id);
          return saved
            ? { ...item, enhancementLevel: saved.enhancementLevel, equippedTo: saved.equippedTo }
            : item;
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
