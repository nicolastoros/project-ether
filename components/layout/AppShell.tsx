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
      {/* min-w-0 on both: flex items default to min-width:auto, which refuses to shrink below
          the content's own intrinsic minimum width. A page whose content includes a fixed-width
          horizontal-scroll row (any shrink-0 flex children wider than the viewport, e.g. Dex's
          Legendary Cards strip) was winning that fight and stretching this ENTIRE column — every
          page, not just that one — wider than the actual viewport on mobile, rather than letting
          the row's own overflow-x-auto contain it as intended. */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-arcade-grid">
        <TopStatusBar />
        <main className="min-w-0 flex-1 overflow-y-auto px-3 py-4 lg:px-6 lg:py-6">
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
