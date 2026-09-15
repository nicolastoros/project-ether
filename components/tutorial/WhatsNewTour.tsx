"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useGameStore } from "@/lib/store";
import { WHATS_NEW_SEEN_ID, WHATS_NEW_TOUR_STEPS } from "@/lib/whatsNew";
import { WhatsNewModal } from "./WhatsNewModal";
import { CoachmarkTour } from "./CoachmarkTour";

// sessionStorage (not the persisted store) on purpose — cleared when the tab/browser closes, so
// the changelog card reappears every fresh session instead of the old "once ever on this device"
// behavior, per explicit feedback that useful info (the battle toggles, Overclock) was getting
// buried after a single dismissal.
const SESSION_FLAG_KEY = "whats-new-shown-session";

/** Mounted once in AppShell.tsx, alongside TutorialBubble. Shows the "What's New" changelog card
 * every session, followed — the FIRST time only — by a coachmark tour of the Hub's Start button +
 * the Lacrima pill. The tour itself stays a true one-time thing (seenTutorialTips is local-only
 * but persisted — see lib/tutorialTips.ts's own comment on that tradeoff); re-running an
 * interactive walkthrough every login would just be noise once someone's already seen it.
 *
 * Gated to /hub (the only route whose DOM has this tour's targets) and to players who already
 * received their starter gifts — a brand-new account's hasReceivedStarterGifts is still false at
 * the moment this first renders (GameGate's own claim effect hasn't resolved yet), so a first-ever
 * signup never sees a "here's what changed" card for changes it has no baseline to compare against;
 * it'll show the next time that account logs back in instead, same as any returning player. */
export function WhatsNewTour() {
  const pathname = usePathname();
  const hasReceivedStarterGifts = useGameStore((s) => s.profile.hasReceivedStarterGifts);
  const seenTutorialTips = useGameStore((s) => s.seenTutorialTips);
  const markTutorialTipSeen = useGameStore((s) => s.markTutorialTipSeen);
  const language = useGameStore((s) => s.language);
  const [phase, setPhase] = useState<"modal" | "tour" | "done">("modal");
  // Starts true (renders nothing) until the mount effect below confirms sessionStorage hasn't
  // already shown this session — sessionStorage doesn't exist during the server render, so
  // defaulting to "already shown" here avoids a flash of the modal before hydration can check.
  const [shownThisSession, setShownThisSession] = useState(true);

  useEffect(() => {
    try {
      // Same accepted "setState directly in a one-shot mount effect" shape used elsewhere in this
      // codebase (e.g. SweepScreen.tsx, BattlePage.tsx's auto-sweep) — this effect only runs once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShownThisSession(sessionStorage.getItem(SESSION_FLAG_KEY) === "1");
    } catch {
      // Private browsing / blocked storage — treat as "already shown" so this never gets stuck
      // reappearing on every single navigation.
      setShownThisSession(true);
    }
  }, []);

  const tourAlreadySeen = seenTutorialTips.includes(WHATS_NEW_SEEN_ID);
  const eligible = pathname === "/hub" && hasReceivedStarterGifts && !shownThisSession;

  if (!eligible || phase === "done") return null;

  const finish = () => {
    try {
      sessionStorage.setItem(SESSION_FLAG_KEY, "1");
    } catch {
      // Ignore — worst case the card reappears on the next page load within the same session.
    }
    markTutorialTipSeen(WHATS_NEW_SEEN_ID);
    setPhase("done");
  };

  if (phase === "modal") {
    return (
      <WhatsNewModal
        onContinue={() => (tourAlreadySeen ? finish() : setPhase("tour"))}
        onSkip={finish}
      />
    );
  }
  return <CoachmarkTour steps={WHATS_NEW_TOUR_STEPS[language]} onComplete={finish} />;
}
