"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { X, LogOut } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { useUiStore } from "@/lib/uiStore";
import { NAV_GROUPS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { NewBadge } from "@/components/ui/NewBadge";

export function MobileDrawer() {
  const isOpen = useUiStore((s) => s.isDrawerOpen);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const pathname = usePathname();
  const logout = useGameStore((s) => s.logout);
  const hasUnseenCampaign = useGameStore((s) => s.hasUnseenCampaign);
  const hasUnseenTamer = useGameStore((s) => s.hasUnseenTamer);
  const pendingGuildInvitesCount = useGameStore((s) => s.pendingGuildInvitesCount);
  const router = useRouter();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-l border-arcade-border bg-arcade-panel"
          >
            <div className="flex items-center justify-between border-b border-arcade-border px-4 py-3.5">
              <h2 className="font-arcade text-xs glow-text-gold">Menu</h2>
              <button
                onClick={closeDrawer}
                aria-label="Close menu"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-arcade-border text-zinc-500 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="scrollbar-hidden flex-1 overflow-y-auto px-3 py-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="mb-5">
                  <p className="mb-1.5 px-2 font-arcade text-[9px] uppercase tracking-wider text-zinc-600">
                    {group.title}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const isActive = pathname.startsWith(href);
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={closeDrawer}
                            className={cn(
                              "flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-xs transition-colors",
                              isActive
                                ? "bg-arcade-panel-light text-gold-bright glow-border-gold border border-gold"
                                : "border border-transparent text-zinc-500 hover:bg-arcade-panel-light hover:text-foreground"
                            )}
                          >
                            <div className="relative">
                              <Icon className="h-4 w-4 shrink-0" />
                              {((href === "/tamer" && hasUnseenTamer) || (href === "/campaign" && hasUnseenCampaign) || (href === "/guild" && pendingGuildInvitesCount > 0)) && (
                                <NewBadge className="-right-2 -top-2" />
                              )}
                            </div>
                            <span className="truncate">{label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="border-t border-arcade-border px-3 py-3">
              <button
                onClick={async () => {
                  closeDrawer();
                  await signOut({ redirect: false });
                  logout();
                  router.replace("/");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-zinc-600 transition-colors hover:bg-arcade-panel-light hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
