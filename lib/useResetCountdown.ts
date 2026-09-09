"use client";

import { useEffect, useState } from "react";

/** "Xh Ym" until local midnight — matches lib/utils.ts's todayDateString, which is what actually
 * drives the reset, so this stays accurate to the moment it happens rather than an approximation.
 * Split out from lib/utils.ts (rather than living alongside todayDateString there) because that
 * file is also imported by server components, which can't pull in a hook. */
export function useResetCountdown(): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const msLeft = midnight.getTime() - now.getTime();
      const h = Math.floor(msLeft / 3_600_000);
      const m = Math.floor((msLeft % 3_600_000) / 60_000);
      setLabel(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

/** "Xd Yh" until next local Monday midnight — the weekly counterpart to useResetCountdown above,
 * matching lib/utils.ts's thisWeekStartDateString (which is what actually drives Hidden Training's
 * weekly attempt reset — see ensureFreshWeeklyEventAttempts in lib/store.ts). */
export function useWeeklyResetCountdown(): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const daysSinceMonday = (now.getDay() + 6) % 7;
      const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday + 7);
      const msLeft = nextMonday.getTime() - now.getTime();
      const d = Math.floor(msLeft / 86_400_000);
      const h = Math.floor((msLeft % 86_400_000) / 3_600_000);
      setLabel(d > 0 ? `${d}d ${h}h` : `${h}h`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return label;
}
