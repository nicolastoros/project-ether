import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileDrawer } from "@/components/layout/MobileDrawer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-arcade-bg">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-arcade-grid">
        <TopStatusBar />
        <main className="flex-1 overflow-y-auto px-3 py-4 lg:px-6 lg:py-6">
          <div className="mx-auto h-full max-w-6xl">{children}</div>
        </main>
        <BottomNav />
      </div>
      <MobileDrawer />
    </div>
  );
}
