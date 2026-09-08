"use client";

/** Full-screen spinner shown while useSyncGate (see lib/useSyncGate.ts) re-syncs the local store
 * against server truth before letting the caller into a risky screen/action — combat entry,
 * Hidden Potential, Super Attack training, Awaken. Purely presentational; see useSyncGate for the
 * actual reconciliation logic and why this exists. */
export function LoadingOverlay({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/loading_icon.png"
        alt="Loading"
        className="h-16 w-16 animate-loading-disc drop-shadow-[0_0_12px_rgba(255,184,77,0.5)]"
      />
      <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-400">
        {label ?? "Syncing..."}
      </p>
    </div>
  );
}
