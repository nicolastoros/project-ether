export interface BattlePacing {
  /** Delay between the attack lunge starting and the hit actually landing (damage/heal number,
   * shake, HP change) — was hardcoded 220ms in all 3 battle screens. */
  lungeDelayMs: number;
  /** Delay for the boss's own attack-animation beat before damage lands — Raid/Overclock only,
   * was hardcoded 1500ms. */
  bossAttackDelayMs: number;
  /** "Thinking" delay before whichever side is auto-acting (enemy AI, or the player's own turn
   * under Auto-Battle) actually resolves its move — was hardcoded 900ms in all 3 screens. */
  enemyThinkDelayMs: number;
}

/** Centralizes the magic-number setTimeout delays every battle screen's resolveTurn/auto-acting
 * effect otherwise hardcodes independently, so the Skip-Animation toggle only has to flip one set
 * of numbers instead of being duplicated 3x. Collapsed to 0 (not skipped) under Skip-Animation —
 * each battle screen still routes through setTimeout(fn, 0) rather than calling synchronously, so
 * a long auto-battled fight still advances one turn per macrotask/render instead of recursing on
 * the call stack (see BattleScreen.tsx/RaidBattleScreen.tsx/OverclockBattleScreen.tsx's own
 * auto-acting effect for why that matters). */
export function getBattlePacing(skipAnimationEnabled: boolean): BattlePacing {
  return skipAnimationEnabled
    ? { lungeDelayMs: 0, bossAttackDelayMs: 0, enemyThinkDelayMs: 0 }
    : { lungeDelayMs: 220, bossAttackDelayMs: 1500, enemyThinkDelayMs: 900 };
}
