import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncPlayerProgress } from "@/lib/db/bigquery";

// Headroom beyond the platform default in case BigQuery has a slow moment — the actual queries
// now run in parallel (see syncPlayerProgress), but a wide roster is still N concurrent round
// trips, and a killed-mid-flight serverless function silently loses progress with no client error.
export const maxDuration = 30;

interface SyncCreature {
  creatureId: string;
  level: number;
  exp: number;
  expToNextLevel: number;
  partySlot: number | null;
  isInHubTeam: boolean;
  superAttackLevel: number;
  potentialNodes: string[];
  copies: number;
}

function isSyncCreature(value: unknown): value is SyncCreature {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.creatureId === "string" &&
    typeof c.level === "number" &&
    typeof c.exp === "number" &&
    typeof c.expToNextLevel === "number" &&
    (typeof c.partySlot === "number" || c.partySlot === null) &&
    typeof c.isInHubTeam === "boolean" &&
    typeof c.superAttackLevel === "number" &&
    Array.isArray(c.potentialNodes) &&
    typeof c.copies === "number"
  );
}

interface SyncCurrencies {
  gold: number;
  gems: number;
  sealCoins: number;
  energy: number;
  lastEnergyTickAt: number;
}

function isSyncCurrencies(value: unknown): value is SyncCurrencies {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.gold === "number" &&
    typeof c.gems === "number" &&
    typeof c.sealCoins === "number" &&
    typeof c.energy === "number" &&
    typeof c.lastEnergyTickAt === "number"
  );
}

interface SyncItem {
  itemId: string;
  quantity: number;
}

function isSyncItem(value: unknown): value is SyncItem {
  if (!value || typeof value !== "object") return false;
  const i = value as Record<string, unknown>;
  return typeof i.itemId === "string" && typeof i.quantity === "number";
}

interface SyncDailyTasksState {
  date: string;
  tasks: Record<string, { progress: number; claimed: boolean }>;
}

function isSyncDailyTasksState(value: unknown): value is SyncDailyTasksState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.date !== "string" || !v.tasks || typeof v.tasks !== "object") return false;
  return Object.values(v.tasks as Record<string, unknown>).every(
    (t) =>
      !!t &&
      typeof t === "object" &&
      typeof (t as Record<string, unknown>).progress === "number" &&
      typeof (t as Record<string, unknown>).claimed === "boolean"
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { level, exp, expToNextLevel, creatures, dungeonHighestStageCleared, currencies, dailyEventAttempts, items, dailyTasksState } = body as Record<
    string,
    unknown
  >;
  if (
    typeof level !== "number" ||
    typeof exp !== "number" ||
    typeof expToNextLevel !== "number" ||
    !Array.isArray(creatures) ||
    (dungeonHighestStageCleared !== undefined && typeof dungeonHighestStageCleared !== "number") ||
    (currencies !== undefined && !isSyncCurrencies(currencies)) ||
    (items !== undefined && !Array.isArray(items)) ||
    (dailyTasksState !== undefined && !isSyncDailyTasksState(dailyTasksState))
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await syncPlayerProgress(session.user.id, {
      level,
      exp,
      expToNextLevel,
      creatures: creatures.filter(isSyncCreature),
      dungeonHighestStageCleared: dungeonHighestStageCleared as number | undefined,
      currencies: currencies as SyncCurrencies | undefined,
      dailyEventAttempts: dailyEventAttempts as Record<string, number> | undefined,
      items: items !== undefined ? (items as unknown[]).filter(isSyncItem) : undefined,
      dailyTasksState: dailyTasksState as SyncDailyTasksState | undefined,
    });
  } catch (err) {
    console.error("Progress sync failed", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
