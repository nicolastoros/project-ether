"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserCircle2, LogOut } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { NAV_GROUPS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const profile = useGameStore((s) => s.profile);
  const logout = useGameStore((s) => s.logout);
  const router = useRouter();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-arcade-border bg-arcade-panel/60 lg:flex">
      <div className="flex items-center gap-2.5 border-b border-arcade-border px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold bg-arcade-panel-light glow-border-gold">
          <UserCircle2 className="h-6 w-6 text-gold-bright" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {profile.name} <span className="text-zinc-600">Lv.{profile.level}</span>
          </p>
          <p className="truncate text-[11px] text-zinc-600">{profile.title}</p>
        </div>
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
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors",
                        isActive
                          ? "bg-arcade-panel-light text-gold-bright glow-border-gold border border-gold"
                          : "border border-transparent text-zinc-500 hover:bg-arcade-panel-light hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
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
          onClick={() => {
            logout();
            router.replace("/");
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-zinc-600 transition-colors hover:bg-arcade-panel-light hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
