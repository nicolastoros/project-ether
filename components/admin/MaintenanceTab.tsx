"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";

interface Config {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export function MaintenanceTab() {
  const [config, setConfig] = useState<Config | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((r) => r.json())
      .then((c: Config) => {
        setConfig(c);
        setMessage(c.maintenanceMessage);
      })
      .catch(() => setError("Failed to load current status."));
  }, []);

  const toggle = async (enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, message }),
      });
      if (!res.ok) throw new Error();
      setConfig({ maintenanceMode: enabled, maintenanceMessage: message });
    } catch {
      setError("Failed to update maintenance mode.");
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <GlowPanel className="space-y-4 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/70 bg-gold/10">
          <Wrench className="h-5 w-5 text-gold-bright" />
        </div>
        <div>
          <h2 className="font-arcade text-sm text-foreground">Server Maintenance</h2>
          <p className="text-xs text-zinc-500">
            {config.maintenanceMode
              ? "Currently ON — every non-admin player is redirected to /maintenance."
              : "Currently OFF — players can access the game normally."}
          </p>
        </div>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-[10px] font-arcade uppercase tracking-wide ${
            config.maintenanceMode ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"
          }`}
        >
          {config.maintenanceMode ? "On" : "Off"}
        </span>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-zinc-500">
          Message shown to players (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="We're performing scheduled maintenance..."
          className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-3 text-sm text-foreground outline-none focus:border-gold"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        {config.maintenanceMode ? (
          <PixelButton variant="gold" disabled={saving} onClick={() => toggle(false)}>
            Turn Off Maintenance
          </PixelButton>
        ) : (
          <PixelButton variant="danger" disabled={saving} onClick={() => toggle(true)}>
            Turn On Maintenance
          </PixelButton>
        )}
      </div>
    </GlowPanel>
  );
}
