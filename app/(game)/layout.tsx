import type { ReactNode } from "react";
import { GameGate } from "@/components/auth/GameGate";

export default function GameLayout({ children }: { children: ReactNode }) {
  return <GameGate>{children}</GameGate>;
}
