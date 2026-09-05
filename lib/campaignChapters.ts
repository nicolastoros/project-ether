// Replaces lib/campaignWorlds.ts for the Dokkan-style label-based Campaign redesign — the old
// map-image-per-World concept is gone, replaced by a Chapter -> Area grid. Stages themselves
// still live in gameData.ts's DUNGEON_STAGES (chapter number == DungeonStage.world, area number
// == DungeonStage.worldStageNumber — field names kept as-is to avoid touching the many consumers
// of DungeonStage across battle/combat code that don't care about the Chapter/World rename).

export interface CampaignChapter {
  chapter: number;
  /** Area names in order, 1-indexed by position. Empty until this chapter's content is provided —
   * see CAMPAIGN_CHAPTERS below. */
  areaNames: string[];
  isAvailable: boolean;
}

export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    chapter: 1,
    areaNames: [
      "The Beginning",
      "An Unsettling Feeling",
      "Spacetime Distortion",
      "An Uncertain Future",
      "The Prophecy",
      "An Unexpected Turn",
      "Our World",
      "Bonds of Friendship",
      "True Strength",
      "Awakening",
      "A Dangerous Enemy Approaches",
      "Together, We'll Save Our World",
      "The Power Within",
      "Mystery of the Digital Network",
      "The Royal Knights",
    ],
    isAvailable: true,
  },
  {
    chapter: 2,
    areaNames: [
      "The Parallel World",
      "Two Worlds, One Balance",
      "The Resonance Within",
      "Chosen by Resonance",
      "Beyond Their Limits",
      "A Consciousness Awakens",
      "The Unknown Entity",
      "Signs of Another World",
      "A World That Shouldn't Exist",
      "The First Replica",
      "Echoes of Reality",
      "Worlds Out of Sync",
      "The Collision Begins",
      "Reality in Danger",
      "Protect the Original World",
    ],
    isAvailable: true,
  },
  // Chapters 3-4: content pending — shown locked/"Coming Soon" in ChapterList until their area
  // lists are provided, same treatment the old World 6-12 placeholders used.
  { chapter: 3, areaNames: [], isAvailable: false },
  { chapter: 4, areaNames: [], isAvailable: false },
];

/** Centralizes the "is this the last (boss) area of the chapter" check against the chapter's real
 * area count, instead of a hardcoded worldStageNumber magic number scattered across files. */
export function isFinalAreaOfChapter(chapter: number, areaNumber: number): boolean {
  const def = CAMPAIGN_CHAPTERS.find((c) => c.chapter === chapter);
  if (!def || def.areaNames.length === 0) return false;
  return areaNumber === def.areaNames.length;
}
