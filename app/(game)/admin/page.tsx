"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Wrench, Gift, Users, BarChart3 } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MaintenanceTab } from "@/components/admin/MaintenanceTab";
import { GiftsTab } from "@/components/admin/GiftsTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { StatsTab } from "@/components/admin/StatsTab";

type Tab = "maintenance" | "gifts" | "users" | "stats";

const TABS: { id: Tab; label: string; icon: typeof Wrench }[] = [
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "gifts", label: "Gifts", icon: Gift },
  { id: "users", label: "Users", icon: Users },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

// The nav entry itself is already hidden for non-admins (lib/navigation.ts's getNavGroups), but
// the route is still reachable by URL — this redirect, plus every app/api/admin/* route checking
// session.user.isAdmin server-side, are the real gate. profile.isAdmin comes from the JWT (see
// auth.ts), not anything the client could tamper with.
export default function AdminPage() {
  const isAdmin = useGameStore((s) => s.profile.isAdmin);
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("maintenance");

  useEffect(() => {
    if (hasHydrated && !isAdmin) router.replace("/hub");
  }, [hasHydrated, isAdmin, router]);

  if (!hasHydrated || !isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-gold-bright" />
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Admin Panel</h1>
          <p className="mt-1 text-xs text-zinc-500">Server maintenance, gifts, and account management.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
              tab === id
                ? "border-gold bg-gold/10 text-gold-bright"
                : "border-arcade-border text-zinc-500 hover:bg-arcade-panel-light"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "maintenance" && <MaintenanceTab />}
      {tab === "gifts" && <GiftsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "stats" && <StatsTab />}
    </div>
  );
}
