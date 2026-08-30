export type PotentialStatType = "hp" | "atk" | "def" | "spd";
export type PotentialAdvancedType = "sa" | "crit" | "evasion" | "heal";

export interface PotentialNode {
  id: string;
  branch: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  type: "stat" | "gate" | "advanced";
  /** Stat type for stat nodes, or advanced type for advanced nodes. */
  statType?: PotentialStatType | PotentialAdvancedType;
  /** Value of the buff (e.g. 50 HP, 1% Crit) */
  value: number;
  /** Orb cost to unlock this node */
  cost: { small: number; medium: number; large: number };
  /** The node ID that must be unlocked before this one */
  requiresNodeId?: string;
}

const BASE_COSTS = {
  small: { small: 15, medium: 0, large: 0 },
  medium: { small: 30, medium: 5, large: 0 },
  large: { small: 50, medium: 15, large: 2 },
  advanced: { small: 100, medium: 30, large: 5 },
};

function createBranch(
  branch: PotentialNode["branch"],
  stat1: PotentialStatType,
  stat2: PotentialStatType,
  stat1Val: number,
  stat2Val: number,
  advancedTypes: PotentialAdvancedType[]
): PotentialNode[] {
  const nodes: PotentialNode[] = [];
  const prefix = branch.split('-').map(w => w[0]).join(''); // tl, tr, bl, br
  
  // Node 1: Stat 1
  nodes.push({ id: `${prefix}-1`, branch, type: "stat", statType: stat1, value: stat1Val, cost: BASE_COSTS.small });
  // Node 2: Stat 2
  nodes.push({ id: `${prefix}-2`, branch, type: "stat", statType: stat2, value: stat2Val, cost: BASE_COSTS.small, requiresNodeId: `${prefix}-1` });
  // Node 3: Gate (Requires Duplicate)
  nodes.push({ id: `${prefix}-gate`, branch, type: "gate", value: 0, cost: { small: 0, medium: 0, large: 0 }, requiresNodeId: `${prefix}-2` });
  // Node 4: Stat 1 Medium
  nodes.push({ id: `${prefix}-3`, branch, type: "stat", statType: stat1, value: stat1Val * 2, cost: BASE_COSTS.medium, requiresNodeId: `${prefix}-gate` });
  // Node 5: Stat 2 Medium
  nodes.push({ id: `${prefix}-4`, branch, type: "stat", statType: stat2, value: stat2Val * 2, cost: BASE_COSTS.medium, requiresNodeId: `${prefix}-3` });
  // Node 6: Stat 1 Large
  nodes.push({ id: `${prefix}-5`, branch, type: "stat", statType: stat1, value: stat1Val * 3, cost: BASE_COSTS.large, requiresNodeId: `${prefix}-4` });
  
  // Advanced Nodes
  nodes.push({ id: `${prefix}-adv1`, branch, type: "advanced", statType: advancedTypes[0], value: 1, cost: BASE_COSTS.advanced, requiresNodeId: `${prefix}-5` });
  nodes.push({ id: `${prefix}-adv2`, branch, type: "advanced", statType: advancedTypes[1], value: 1, cost: BASE_COSTS.advanced, requiresNodeId: `${prefix}-adv1` });
  nodes.push({ id: `${prefix}-adv3`, branch, type: "advanced", statType: advancedTypes[2], value: 1, cost: BASE_COSTS.advanced, requiresNodeId: `${prefix}-adv2` });
  
  return nodes;
}

export const POTENTIAL_TREE: PotentialNode[] = [
  // Top-Left: ATK & DEF
  ...createBranch("top-left", "atk", "def", 20, 10, ["sa", "crit", "evasion"]),
  // Top-Right: ATK & HP
  ...createBranch("top-right", "atk", "hp", 20, 100, ["sa", "crit", "heal"]),
  // Bottom-Left: HP & DEF
  ...createBranch("bottom-left", "hp", "def", 100, 10, ["heal", "evasion", "crit"]),
  // Bottom-Right: ATK & HP (The best branch)
  ...createBranch("bottom-right", "atk", "hp", 30, 150, ["sa", "crit", "evasion"]),
];

/** Calculates the total static bonuses a creature gets from its unlocked potential nodes. */
export function getPotentialBonuses(unlockedNodeIds: string[]) {
  const buffs = { hp: 0, atk: 0, def: 0, spd: 0, sa: 0, crit: 0, evasion: 0, heal: 0 };
  
  for (const id of unlockedNodeIds) {
    const node = POTENTIAL_TREE.find(n => n.id === id);
    if (!node || !node.statType) continue;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (buffs as any)[node.statType] += node.value;
  }
  
  return buffs;
}
