"use client";

/** Full-screen spinner shown while useSyncGate (see lib/useSyncGate.ts) re-syncs the local store
 * against server truth before letting the caller into a risky screen/action — combat entry,
 * Hidden Potential, Super Attack training, Awaken. Purely presentational; see useSyncGate for the
 * actual reconciliation logic and why this exists. */
export function LoadingOverlay({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
      {/* Layered CSS ring — see globals.css's loading-ring keyframes for why this replaced the old
          static PNG icon. Sized up from a original 64px — against a full-screen backdrop it read as
          a tiny lost icon rather than a real loading moment. */}
      <div className="relative h-24 w-24 sm:h-28 sm:w-28">
        {/* Dim static track, so the bright arc reads as sweeping over something instead of floating alone. */}
        <div className="absolute inset-0 rounded-full border-4 border-gold/15" />
        {/* Bright arc — only two adjacent sides colored, so it reads as a moving arc, not a full ring. */}
        <div className="absolute inset-0 animate-loading-ring rounded-full border-4 border-transparent border-r-gold-bright border-t-gold-bright drop-shadow-[0_0_10px_rgba(201,130,15,0.75)]" />
        {/* Thinner dashed ring counter-rotating inside it, in the "digital" teal accent, for a
            layered tech feel rather than one flat spinner. */}
        <div className="absolute inset-2.5 animate-loading-ring-reverse rounded-full border-2 border-dashed border-neon-bright/70" />
        {/* Pulsing core. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 animate-loading-core rounded-full bg-gold-bright shadow-[0_0_12px_4px_rgba(201,130,15,0.8)]" />
        </div>
      </div>
      <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-400">
        {label ?? "Syncing..."}
      </p>
    </div>
  );
}
