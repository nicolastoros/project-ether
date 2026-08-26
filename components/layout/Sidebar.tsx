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
      className="pointer-events-none absolute inset-x-0 bottom-0 h-64 overflow-hidden opacity-[0.06]"
    >
      <svg
        viewBox="0 0 240 300"
        className="absolute -bottom-8 -right-14 h-72 w-auto text-[#476ba8]"
        fill="currentColor"
      >
        <path
          d="M60 280 Q20 230 55 188"
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="140" cy="188" rx="68" ry="52" transform="rotate(-25 140 188)" />
        <polygon points="150,150 232,58 206,138 252,108 190,190" />
        <circle cx="203" cy="94" r="28" />
        <polygon points="193,70 202,20 213,67" />
        <polygon points="213,71 230,30 233,74" />
      </svg>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const profile = useGameStore((s) => s.profile);
  const logout = useGameStore((s) => s.logout);
  const hasUnseenInventory = useGameStore((s) => s.hasUnseenInventory);
  const router = useRouter();

  return (
    <aside className="sidebar-surface sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-arcade-border/80 shadow-[2px_0_16px_-8px_rgba(30,64,120,0.14)] lg:flex">
      <nav className="scrollbar-hidden relative flex-1 overflow-y-auto px-3 pb-4 pt-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-6">
            <div className="mb-2 flex items-center gap-2 px-2">
              <span className="font-arcade text-[9px] uppercase tracking-wider text-slate-400">
                {group.title}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-arcade-border to-transparent" />
            </div>
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs transition-all duration-150 ease-out",
                        isActive
                          ? "border-gold/70 bg-gold/12 font-semibold text-gold-bright shadow-[0_2px_10px_-2px_rgba(255,184,77,0.4)]"
                          : "border-transparent text-slate-500 hover:translate-x-[2px] hover:border-arcade-border/60 hover:bg-[#eef3fb] hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gold" />
                      )}
                      <span className="relative flex shrink-0 items-center justify-center">
                        <Icon
                          strokeWidth={2.25}
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isActive ? "text-gold-bright" : "text-slate-400 group-hover:text-neon"
                          )}
                        />
                        {href === "/inventory" && hasUnseenInventory && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white" />
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

      <div className="border-t border-arcade-border/70 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/70 bg-gradient-to-b from-white to-arcade-panel-light shadow-[0_2px_8px_-2px_rgba(255,184,77,0.35)]">
            <UserCircle2 className="h-5 w-5 text-gold-bright" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {profile.name} <span className="font-normal text-slate-400">Lv.{profile.level}</span>
            </p>
            <p className="truncate text-[10px] text-slate-400">{profile.title}</p>
            {profile.level < MAX_LEVEL ? (
              <ProgressBar
                percent={xpPercent(profile.exp, profile.expToNextLevel)}
                color="exp"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 font-arcade text-[8px] uppercase tracking-wide text-gold-bright">Max level</p>
            )}
          </div>
          <button
            type="button"
            disabled
            title="Settings — coming soon"
            className="flex h-7 w-7 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-slate-300"
          >
            <Settings strokeWidth={2.25} className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            logout();
            router.replace("/");
          }}
          className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut strokeWidth={2.25} className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
