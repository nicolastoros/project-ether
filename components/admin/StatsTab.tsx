"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, ShieldAlert, UserPlus, LogIn, TrendingUp } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalBanned: number;
  newUsersLast7d: number;
  loginsLast24h: number;
  loginsLast7d: number;
  avgLevel: number;
}

const CARDS: { key: keyof Stats; label: string; icon: typeof Users }[] = [
  { key: "totalUsers", label: "Total Users", icon: Users },
  { key: "totalAdmins", label: "Admins", icon: ShieldAlert },
  { key: "totalBanned", label: "Banned", icon: ShieldAlert },
  { key: "newUsersLast7d", label: "New (7d)", icon: UserPlus },
  { key: "loginsLast24h", label: "Logins (24h)", icon: LogIn },
  { key: "loginsLast7d", label: "Logins (7d)", icon: LogIn },
  { key: "avgLevel", label: "Avg. Level", icon: TrendingUp },
];

export function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("Failed to load server stats."));
  }, []);

  return (
    <GlowPanel className="space-y-4 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/70 bg-gold/10">
          <BarChart3 className="h-5 w-5 text-gold-bright" />
        </div>
        <h2 className="font-arcade text-sm text-foreground">Server Stats</h2>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {!stats && !error && <p className="text-sm text-zinc-500">Loading…</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CARDS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-xl border border-arcade-border bg-arcade-panel-light p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
                <Icon className="h-3 w-3" /> {label}
              </div>
              <p className="font-arcade text-lg text-gold-bright">{stats[key]}</p>
            </div>
          ))}
        </div>
      )}
    </GlowPanel>
  );
}
