"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Sparkles, Trophy, Map, Shield } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ACHIEVEMENTS, AVATAR_CATALOG, DUNGEON_STAGES, MAX_LEVEL, STARTER_CREATURES } from "@/lib/gameData";
import { setAvatarOnServer } from "@/lib/syncProgress";
import { useSyncSettleGate } from "@/lib/useSyncGate";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { cn, xpPercent } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-arcade-border bg-arcade-panel-light p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-gold-bright">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
        <p className="truncate text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

/** "My Profile" — opened from the avatar chip in Sidebar.tsx (desktop) and TopStatusBar.tsx
 * (mobile). Two things in one screen, per the original ask: a real stats summary (level/XP,
 * roster size, achievements, campaign progress, guild, currencies) and a picker for the new
 * profile_img art (see AVATAR_CATALOG in lib/gameData.ts) — tapping a thumbnail applies it
 * immediately, same "tap to equip" instant-apply feel as Tamer gear, not a separate confirm step. */
export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const t = useT();
  const profile = useGameStore((s) => s.profile);
  const currencies = useGameStore((s) => s.currencies);
  const creatures = useGameStore((s) => s.creatures);
  const achievements = useGameStore((s) => s.achievements);
  const dungeon = useGameStore((s) => s.dungeon);
  const guild = useGameStore((s) => s.guild);
  const setAvatar = useGameStore((s) => s.setAvatar);
  const markProfileSeen = useGameStore((s) => s.markProfileSeen);
  const { settling, runWithSettle } = useSyncSettleGate();
  // Same createPortal SSR-guard pattern as DailyLoginModal.tsx/GiftsModal.tsx — the mount effect
  // must set state (not a lazy useState initializer) so the very first client render still matches
  // the server-rendered markup (portal not yet mounted) before hydration flips it; that's a real
  // correctness need the react-hooks/set-state-in-effect warning below doesn't account for.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) markProfileSeen();
  }, [isOpen, markProfileSeen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !settling) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, settling]);

  // Local mutation runs immediately (instant visual feedback, per ProfileAvatar reading
  // profile.avatarKey right away) — runWithSettle then holds `settling` for SYNC_PAUSE_MS so the
  // fire-and-forget setAvatarOnServer write has real time to land before another tap (or closing
  // the modal) can race it. Same pattern as every other "important sync moment" in this app — see
  // lib/useSyncGate.ts.
  function handlePickAvatar(avatarKey: string) {
    if (avatarKey === profile.avatarKey || settling) return;
    setAvatar(avatarKey);
    runWithSettle(() => setAvatarOnServer(avatarKey));
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !settling && onClose()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-arcade-border bg-arcade-panel shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-arcade-border p-5">
              <h2 className="flex items-center gap-2 font-arcade text-lg glow-text-gold">{t("profile.my_profile")}</h2>
              <button
                onClick={onClose}
                disabled={settling}
                aria-label={t("common.close")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-arcade-border text-zinc-500 hover:text-foreground disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {/* Identity header */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-gold shadow-[0_0_16px_-2px_rgba(255,184,77,0.5)]">
                  <ProfileAvatar avatarKey={profile.avatarKey} className="h-20 w-20 rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-foreground">
                    {profile.name} <span className="font-normal text-zinc-500">Lv.{profile.level}</span>
                  </p>
                  <p className="truncate text-sm text-zinc-500">{profile.title}</p>
                  {profile.level < MAX_LEVEL ? (
                    <ProgressBar
                      percent={xpPercent(profile.exp, profile.expToNextLevel)}
                      color="exp"
                      innerText={`${profile.exp}/${profile.expToNextLevel} EXP`}
                      className="mt-2"
                    />
                  ) : (
                    <p className="mt-2 font-arcade text-[10px] uppercase tracking-wide text-gold-bright">{t("sidebar.max_level")}</p>
                  )}
                </div>
              </div>

              {/* Currencies */}
              <div className="flex flex-wrap gap-2">
                <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5" />} value={currencies.gold} />
                <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5" />} value={currencies.gems} />
                <CurrencyPill icon={<SealCoinIcon className="h-3.5 w-3.5" />} value={currencies.sealCoins} />
              </div>

              {/* Stats */}
              <div>
                <p className="mb-2 font-arcade text-xs uppercase tracking-wide text-zinc-500">{t("profile.stats")}</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <StatCard
                    icon={<Sparkles className="h-5 w-5" />}
                    label={t("profile.creatures_owned")}
                    value={`${creatures.length}/${STARTER_CREATURES.length}`}
                  />
                  <StatCard
                    icon={<Trophy className="h-5 w-5" />}
                    label={t("profile.achievements")}
                    value={`${achievements.length}/${ACHIEVEMENTS.length}`}
                  />
                  <StatCard
                    icon={<Map className="h-5 w-5" />}
                    label={t("profile.campaign_stages_cleared")}
                    value={`${dungeon.highestStageCleared}/${DUNGEON_STAGES.length}`}
                  />
                  <StatCard
                    icon={<Shield className="h-5 w-5" />}
                    label={t("profile.guild")}
                    value={guild ? `${guild.name} · Lv.${guild.level}` : t("profile.no_guild")}
                  />
                </div>
              </div>

              {/* Avatar picker */}
              <div>
                <p className="mb-2 font-arcade text-xs uppercase tracking-wide text-zinc-500">{t("profile.change_profile_picture")}</p>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                  {AVATAR_CATALOG.map((avatar) => {
                    const isSelected = avatar.key === profile.avatarKey;
                    return (
                      <button
                        key={avatar.key}
                        onClick={() => handlePickAvatar(avatar.key)}
                        disabled={settling}
                        title={avatar.name}
                        className={cn(
                          "group relative aspect-square overflow-hidden rounded-full border-2 transition-all",
                          isSelected
                            ? "border-gold shadow-[0_0_14px_-2px_rgba(255,184,77,0.6)]"
                            : "border-arcade-border hover:border-gold/60",
                          settling && "opacity-60"
                        )}
                      >
                        <ProfileAvatar avatarKey={avatar.key} className="transition-transform group-hover:scale-105" />
                        {isSelected && (
                          <span className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-arcade-panel bg-gold text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
          <LoadingOverlay show={settling} label={t("profile.saving_profile_picture")} />
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
