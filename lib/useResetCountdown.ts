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
