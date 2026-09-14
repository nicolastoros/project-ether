"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { TutorialBubble } from "@/components/ui/TutorialBubble";
import { WhatsNewTour } from "@/components/tutorial/WhatsNewTour";

// Route -> full-screen backdrop swap for the main content column (behind TopStatusBar/main/
// BottomNav, not the Sidebar — it keeps its own opaque nav surface). Add an entry here to give any
// other screen the same "you're really standing in this place" treatment Shop got.
const ROUTE_BACKDROPS: { match: (pathname: string) => boolean; image: string }[] = [
  { match: (p) => p.startsWith("/shop"), image: "/assets/maps/market.png" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const backdrop = ROUTE_BACKDROPS.find((r) => r.match(pathname));

  return (
    <div className="flex min-h-dvh bg-arcade-bg">
      <Sidebar />
      {/* min-w-0 on both: flex items default to min-width:auto, which refuses to shrink below
          the content's own intrinsic minimum width. A page whose content includes a fixed-width
          horizontal-scroll row (any shrink-0 flex children wider than the viewport, e.g. Dex's
          Legendary Cards strip) was winning that fight and stretching this ENTIRE column — every
          page, not just that one — wider than the actual viewport on mobile, rather than letting
          the row's own overflow-x-auto contain it as intended.
          relative + isolate: gives ROUTE_BACKDROPS' -z-10 layer below a real stacking-context
          boundary to paint behind in, instead of escaping past this column into bg-arcade-bg above
          (the exact bug class fixed twice already this session — see Hidden Potential/landing).
          h-dvh (not min-h-dvh): a hard cap, not just a minimum — keeps this column pinned to
          exactly one viewport tall no matter how much content a page renders, so <main>'s own
          overflow-y-auto (+ its min-h-0 below) is the only thing that ever scrolls. */}
      <div className="relative isolate flex h-dvh min-w-0 flex-1 flex-col bg-arcade-grid">
        <AnimatePresence>
          {backdrop && (
            <motion.div
              key={backdrop.image}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              // fixed (not absolute): pinned to the actual viewport, so it's immune to anything
              // that scrolls or resizes inside this column — switching Shop sections (different
              // content heights) was visibly shifting an absolute-positioned version of this layer
              // because it was sized to a box, not the viewport, itself. left offsets mirror
              // Sidebar.tsx's own width classes exactly (w-64/xl:w-72/2xl:w-80, hidden below lg)
              // so the backdrop still starts right where the sidebar ends instead of bleeding
              // under it.
              className="pointer-events-none fixed inset-0 left-0 -z-10 bg-cover bg-center lg:left-64 xl:left-72 2xl:left-80"
              style={{ backgroundImage: `url('${backdrop.image}')` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-arcade-bg/80 via-white/35 to-arcade-bg/80" />
            </motion.div>
          )}
        </AnimatePresence>
        <TopStatusBar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-4 lg:px-6 lg:py-6">
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
      <WhatsNewTour />
    </div>
  );
}
