"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

/** The desktop Hub's own version of MobileHeroHub.tsx's Start button — same asset, same breathing
 * glow, so "this is how you play" reads identically on both. Sits between HubHeroCarousel and the
 * rest of the grid rather than inside QuickActions.tsx, on purpose: a same-size grid tile (even a
 * gold-highlighted "featured" one, see QuickActions' own Summon tile) still reads as "one of the
 * buttons" — this needs to read as THE way in, so it gets its own full-width row. */
export function HubStartButton() {
  return (
    <Link href="/start" className="group block" data-tour="hub-start">
      <motion.div
        animate={{
          scale: [1, 1.015, 1],
          filter: [
            "drop-shadow(0 0 6px rgba(255,184,77,0.5))",
            "drop-shadow(0 0 26px rgba(255,184,77,0.85))",
            "drop-shadow(0 0 6px rgba(255,184,77,0.5))",
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mx-auto max-w-md"
      >
        <Image src="/assets/ui/start_button.png" alt="Start" width={2172} height={724} priority className="h-auto w-full" />
      </motion.div>
    </Link>
  );
}
