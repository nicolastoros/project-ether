"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { PixelButton } from "@/components/ui/PixelButton";

// Standalone page, deliberately outside GameGate/AppShell — GameGate's own maintenance-poll
// effect (components/auth/GameGate.tsx) is what redirects non-admin players here, so this page
// itself must not depend on anything GameGate would otherwise provide.
export default function MaintenancePage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-arcade-bg bg-arcade-grid px-4 py-10">
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-arcade-border bg-arcade-panel p-8 text-center shadow-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/70 bg-gold/10">
          <Wrench className="h-8 w-8 text-gold-bright" />
        </div>
        <h1 className="font-arcade text-lg glow-text-gold">Mantenimiento del Servidor</h1>
        <p className="text-sm text-zinc-400">
          Estamos realizando tareas de mantenimiento. El juego va a estar disponible de nuevo en breve — gracias por tu paciencia.
        </p>
        <div className="flex w-full flex-col gap-2 pt-2">
          {/* Not router.refresh() — this page has no server data to refetch. Routing back into
              the game re-enters GameGate, whose own poll (components/auth/GameGate.tsx) decides
              fresh whether maintenance is still on: if it's been lifted this just works, and if
              not the player bounces right back here. */}
          <PixelButton variant="ghost" className="w-full" onClick={() => router.push("/hub")}>
            Reintentar
          </PixelButton>
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              router.replace("/");
            }}
            className="text-xs text-zinc-500 transition-colors hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
