"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Settings, UserCircle2, LogOut } from "lucide-react";
import { MAX_LEVEL } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { NAV_GROUPS } from "@/lib/navigation";
import { cn, xpPercent } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { NewBadge } from "@/components/ui/NewBadge";

/**
 * Decorative watermark for the empty space below the nav groups.
 * Placeholder abstract dragon silhouette built from plain SVG shapes — swap it for a real
 * asset later by replacing this <svg> with an <img src="/assets/ui/sidebar_watermark.png" />
 * (or a `background-image` on the wrapper), keeping the same wrapper classes/positioning.
 */
function SidebarWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-64 overflow-hidden opacity-[0.15]"
    >
      <svg
        viewBox="0 0 240 300"
        className="absolute -bottom-4 -right-10 h-72 w-auto text-[#0e7490]"
        fill="currentColor"
      >
        <path
          d="M 110 290 L 170 210 L 140 170 L 220 120 L 190 70 L 240 30 L 210 10 L 110 100 L 80 80 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="bevel"
        />
        <polygon points="120,270 170,220 150,190 210,140" fill="currentColor" opacity="0.3" />
        <circle cx="150" cy="130" r="5" fill="#38bdf8" />
        <circle cx="200" cy="90" r="3" fill="#38bdf8" />
        <path d="M 90 160 L 130 120 L 110 100" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
        <path d="M 40 260 L 80 260 L 100 240" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" />
        <path d="M 50 280 L 90 280 L 120 250" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      </svg>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const profile = useGameStore((s) => s.profile);
  const logout = useGameStore((s) => s.logout);
  const hasUnseenInventory = useGameStore((s) => s.hasUnseenInventory);
  const hasUnseenCampaign = useGameStore((s) => s.hasUnseenCampaign);
  const hasUnseenTamer = useGameStore((s) => s.hasUnseenTamer);
  const pendingGuildInvitesCount = useGameStore((s) => s.pendingGuildInvitesCount);
  const router = useRouter();

  return (
    <aside className="sidebar-surface sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-arcade-border/80 shadow-[2px_0_16px_-8px_rgba(30,64,120,0.14)] lg:flex xl:w-72 2xl:w-80">
      <nav className="scrollbar-hidden relative flex-1 overflow-y-auto px-3.5 pb-4 pt-5 xl:px-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-6">
            <div className="mb-2 flex items-center gap-2 px-2">
              <span className="font-arcade text-[10px] uppercase tracking-wider text-slate-400 xl:text-[11px]">
                {group.title}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-arcade-border to-transparent" />
            </div>
            <ul className="space-y-1.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-300 ease-out xl:py-3 xl:text-base",
                        isActive
                          ? "border-gold/70 bg-gold/12 font-semibold text-gold-bright shadow-[0_2px_10px_-2px_rgba(255,184,77,0.4)]"
                          : cn(
                              "nav-cyber-hover border-transparent text-slate-500",
                              "hover:translate-x-[4px] hover:border-[#0e7490]/60 hover:bg-[#0f172a] hover:text-[#e0f2fe]",
                              "hover:shadow-[0_4px_20px_-4px_rgba(14,116,144,0.6),inset_3px_0_12px_rgba(14,116,144,0.3)]"
                            )
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gold" />
                      )}
                      <span className="relative flex shrink-0 items-center justify-center">
                        <Icon
                          strokeWidth={2.25}
                          className={cn(
                            "h-5 w-5 transition-all duration-300 xl:h-[22px] xl:w-[22px]",
                            isActive
                              ? "text-gold-bright"
                              : "text-slate-400 group-hover:text-[#38bdf8] group-hover:[filter:drop-shadow(0_0_8px_rgba(56,189,248,0.8))]"
                          )}
                        />
                        {href === "/inventory" && hasUnseenInventory && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white" />
                        )}
                        {((href === "/tamer" && hasUnseenTamer) || (href === "/campaign" && hasUnseenCampaign) || (href === "/guild" && pendingGuildInvitesCount > 0)) && (
                          <NewBadge className="-right-2 -top-2" />
                        )}
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <SidebarWatermark />
      </nav>

      <div className="border-t border-arcade-border/70 px-3.5 py-3.5 xl:px-4">
        <div className="flex items-center gap-3 rounded-xl px-1.5 py-1.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/70 bg-gradient-to-b from-white to-arcade-panel-light shadow-[0_2px_8px_-2px_rgba(255,184,77,0.35)] xl:h-12 xl:w-12">
            <UserCircle2 className="h-6 w-6 text-gold-bright xl:h-7 xl:w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {profile.name} <span className="font-normal text-slate-400">Lv.{profile.level}</span>
            </p>
            <p className="truncate text-xs text-slate-400">{profile.title}</p>
            {profile.level < MAX_LEVEL ? (
              <ProgressBar
                percent={xpPercent(profile.exp, profile.expToNextLevel)}
                color="exp"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 font-arcade text-[9px] uppercase tracking-wide text-gold-bright">Max level</p>
            )}
          </div>
          <button
            type="button"
            disabled
            title="Settings — coming soon"
            className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-slate-300"
          >
            <Settings strokeWidth={2.25} className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            logout();
            router.replace("/");
          }}
          className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut strokeWidth={2.25} className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
