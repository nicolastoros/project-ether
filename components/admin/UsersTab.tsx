"use client";

import { useState } from "react";
import { Search, ShieldBan, ShieldCheck, Coins } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";

interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  level: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string | null;
}

interface UserDetail extends UserSummary {
  gold: number;
  gems: number;
  sealCoins: number;
  creatureCount: number;
  lastLoginAt: string | null;
}

export function UsersTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currencyDraft, setCurrencyDraft] = useState({ gold: "", gems: "", sealCoins: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.users ?? []);
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setDetail(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error();
      const data: UserDetail = await res.json();
      setDetail(data);
      setCurrencyDraft({ gold: String(data.gold), gems: String(data.gems), sealCoins: String(data.sealCoins) });
    } catch {
      setError("Failed to load that user.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const saveCurrency = async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/currency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gold: Number(currencyDraft.gold),
          gems: Number(currencyDraft.gems),
          sealCoins: Number(currencyDraft.sealCoins),
        }),
      });
      if (!res.ok) throw new Error();
      setDetail({
        ...detail,
        gold: Number(currencyDraft.gold),
        gems: Number(currencyDraft.gems),
        sealCoins: Number(currencyDraft.sealCoins),
      });
    } catch {
      setError("Failed to update currency.");
    } finally {
      setBusy(false);
    }
  };

  const toggleBan = async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !detail.isBanned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error);
      }
      setDetail({ ...detail, isBanned: !detail.isBanned });
      setResults((prev) => prev.map((u) => (u.id === detail.id ? { ...u, isBanned: !detail.isBanned } : u)));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to update ban status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlowPanel className="space-y-3 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/70 bg-gold/10">
            <Search className="h-5 w-5 text-gold-bright" />
          </div>
          <h2 className="font-arcade text-sm text-foreground">Find a User</h2>
        </div>

        <form onSubmit={search} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Username or display name"
            className="flex-1 rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-sm text-foreground outline-none focus:border-gold"
          />
          <PixelButton type="submit" variant="ghost" disabled={searching}>
            Search
          </PixelButton>
        </form>

        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => openDetail(u.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                detail?.id === u.id ? "border-gold bg-gold/10" : "border-arcade-border hover:bg-arcade-panel-light"
              }`}
            >
              <span className="truncate">
                {u.displayName} <span className="text-xs text-zinc-500">@{u.username} · Lv.{u.level}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                {u.isAdmin && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-arcade text-gold-bright">ADMIN</span>}
                {u.isBanned && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-arcade text-red-500">BANNED</span>}
              </span>
            </button>
          ))}
          {results.length === 0 && !searching && (
            <p className="py-4 text-center text-xs text-zinc-500">No results yet — search above.</p>
          )}
        </div>
      </GlowPanel>

      <GlowPanel className="space-y-4 rounded-2xl p-5">
        {loadingDetail && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loadingDetail && !detail && <p className="text-sm text-zinc-500">Select a user to see details.</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}

        {detail && !loadingDetail && (
          <>
            <div>
              <h3 className="font-arcade text-sm text-foreground">{detail.displayName}</h3>
              <p className="text-xs text-zinc-500">
                @{detail.username} · Lv.{detail.level} · {detail.creatureCount} creatures
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-400">
                Last login: {detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : "never"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                <Coins className="h-3.5 w-3.5" /> Currencies
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] text-zinc-500">Gold</label>
                  <input
                    type="number"
                    min={0}
                    value={currencyDraft.gold}
                    onChange={(e) => setCurrencyDraft((d) => ({ ...d, gold: e.target.value }))}
                    className="w-full rounded-lg border border-arcade-border bg-arcade-panel-light p-2 text-xs text-foreground outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-zinc-500">Gems</label>
                  <input
                    type="number"
                    min={0}
                    value={currencyDraft.gems}
                    onChange={(e) => setCurrencyDraft((d) => ({ ...d, gems: e.target.value }))}
                    className="w-full rounded-lg border border-arcade-border bg-arcade-panel-light p-2 text-xs text-foreground outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-zinc-500">Seal Coins</label>
                  <input
                    type="number"
                    min={0}
                    value={currencyDraft.sealCoins}
                    onChange={(e) => setCurrencyDraft((d) => ({ ...d, sealCoins: e.target.value }))}
                    className="w-full rounded-lg border border-arcade-border bg-arcade-panel-light p-2 text-xs text-foreground outline-none focus:border-gold"
                  />
                </div>
              </div>
              <PixelButton variant="gold" size="sm" disabled={busy} onClick={saveCurrency}>
                Save Currency
              </PixelButton>
            </div>

            <div className="border-t border-arcade-border pt-3">
              {detail.isAdmin ? (
                <p className="text-xs text-zinc-500">Admin accounts can&apos;t be banned from here.</p>
              ) : (
                <PixelButton
                  variant={detail.isBanned ? "ghost" : "danger"}
                  size="sm"
                  disabled={busy}
                  onClick={toggleBan}
                  className="flex items-center gap-2"
                >
                  {detail.isBanned ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
                  {detail.isBanned ? "Unban Account" : "Ban Account"}
                </PixelButton>
              )}
            </div>
          </>
        )}
      </GlowPanel>
    </div>
  );
}
