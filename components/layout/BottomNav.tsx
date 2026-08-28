"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { BOTTOM_NAV_ITEMS } from "@/lib/navigation";
import { useUiStore } from "@/lib/uiStore";
import { cn } from "@/lib/utils";
import { NewBadge } from "@/components/ui/NewBadge";

export function BottomNav() {
  const pathname = usePathname();
  const toggleDrawer = useUiStore((s) => s.toggleDrawer);
  const isDrawerOpen = useUiStore((s) => s.isDrawerOpen);
  const hasUnseenCampaign = useGameStore((s) => s.hasUnseenCampaign);

  return (
    <nav className="sticky bottom-0 z-20 border-t border-arcade-border bg-arcade-panel/95 backdrop-blur-sm lg:hidden">
      <ul className="flex items-stretch justify-between px-2">
        {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="relative flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wide"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-gold-bright" : "text-zinc-500"
                    )}
                  />
                  {href === "/campaign" && hasUnseenCampaign && (
                    <NewBadge className="-right-2 -top-2" />
                  )}
                </div>
                <span className={cn("font-arcade", isActive ? "text-gold-bright" : "text-zinc-500")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            onClick={toggleDrawer}
            className="relative flex w-full flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wide"
          >
            {isDrawerOpen && (
              <motion.div
                layoutId="bottom-nav-active"
                className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Menu
              className={cn(
                "h-5 w-5 transition-colors",
                isDrawerOpen ? "text-gold-bright" : "text-zinc-500"
              )}
            />
            <span className={cn("font-arcade", isDrawerOpen ? "text-gold-bright" : "text-zinc-500")}>
              Menu
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
