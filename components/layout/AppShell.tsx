import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { TutorialBubble } from "@/components/ui/TutorialBubble";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-arcade-bg">
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col bg-arcade-grid">
        <TopStatusBar />
        <main className="flex-1 overflow-y-auto px-3 py-4 lg:px-6 lg:py-6">
          {/* max-w-6xl (1152px) previously capped every page at the same width regardless of
              screen size, leaving huge idle margins on wide/ultra-wide monitors (most visible on
              Monsters' card grid, which is built to keep adding columns as space allows). Bumped
              to 1600px — TopStatusBar.tsx's two max-w-6xl wrappers must stay in sync with this or
              the header winds up narrower than the page content below it. */}
          <div className="mx-auto h-full max-w-[1600px]">{children}</div>
        </main>
        <BottomNav />
      </div>
      <MobileDrawer />
      <TutorialBubble />
    </div>
  );
}
