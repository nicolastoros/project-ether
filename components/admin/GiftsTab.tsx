"use client";

import { useState } from "react";
import { Gift as GiftIcon } from "lucide-react";
import { ITEM_CATALOG, GACHA_CREATURE_POOL } from "@/lib/gameData";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";

type GiftType = "item" | "creature";
type Target = "user" | "broadcast";

export function GiftsTab() {
  const [target, setTarget] = useState<Target>("user");
  const [username, setUsername] = useState("");
  const [type, setType] = useState<GiftType>("item");
  const [itemId, setItemId] = useState(ITEM_CATALOG[0]?.id ?? "");
  const [creatureId, setCreatureId] = useState(GACHA_CREATURE_POOL[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSend = async () => {
    if (target === "user" && !username.trim()) {
      setFeedback({ ok: false, text: "Enter a username, or switch to broadcast." });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: target === "user" ? username.trim() : "",
          type,
          itemId: type === "item" ? itemId : undefined,
          creatureId: type === "creature" ? creatureId : undefined,
          quantity,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error ?? "Failed to send gift." });
        return;
      }
      setFeedback({
        ok: true,
        text: data.broadcast
          ? "Sent to every user's inbox (current and future)."
          : `Sent to ${username.trim()}'s inbox.`,
      });
      setUsername("");
      setMessage("");
      setQuantity(1);
    } catch {
      setFeedback({ ok: false, text: "Failed to send gift." });
    } finally {
      setSending(false);
    }
  };

  return (
    <GlowPanel className="space-y-4 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/70 bg-gold/10">
          <GiftIcon className="h-5 w-5 text-gold-bright" />
        </div>
        <div>
          <h2 className="font-arcade text-sm text-foreground">Send a Gift</h2>
          <p className="text-xs text-zinc-500">Lands in the player&apos;s inbox — same Gifts modal as any other reward.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTarget("user")}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            target === "user" ? "border-gold bg-gold/10 text-gold-bright" : "border-arcade-border text-zinc-500"
          }`}
        >
          Specific User
        </button>
        <button
          onClick={() => setTarget("broadcast")}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            target === "broadcast" ? "border-gold bg-gold/10 text-gold-bright" : "border-arcade-border text-zinc-500"
          }`}
        >
          Broadcast (All Users)
        </button>
      </div>

      {target === "user" && (
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-sm text-foreground outline-none focus:border-gold"
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setType("item")}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            type === "item" ? "border-gold bg-gold/10 text-gold-bright" : "border-arcade-border text-zinc-500"
          }`}
        >
          Item
        </button>
        <button
          onClick={() => setType("creature")}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            type === "creature" ? "border-gold bg-gold/10 text-gold-bright" : "border-arcade-border text-zinc-500"
          }`}
        >
          Creature
        </button>
      </div>

      {type === "item" ? (
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-sm text-foreground outline-none focus:border-gold"
        >
          {ITEM_CATALOG.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={creatureId}
          onChange={(e) => setCreatureId(e.target.value)}
          className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-sm text-foreground outline-none focus:border-gold"
        >
          {GACHA_CREATURE_POOL.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.rarity})
            </option>
          ))}
        </select>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-zinc-500">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-sm text-foreground outline-none focus:border-gold"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-zinc-500">Message (optional)</label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A gift from the team!"
          className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-sm text-foreground outline-none focus:border-gold"
        />
      </div>

      {feedback && (
        <p className={`text-xs ${feedback.ok ? "text-emerald-500" : "text-red-500"}`}>{feedback.text}</p>
      )}

      <PixelButton variant="gold" disabled={sending} onClick={handleSend} className="w-full">
        {sending ? "Sending…" : "Send Gift"}
      </PixelButton>
    </GlowPanel>
  );
}
