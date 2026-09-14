import Image from "next/image";
import { UserCircle2 } from "lucide-react";
import { AVATAR_CATALOG } from "@/lib/gameData";
import { cn } from "@/lib/utils";

/** Resolves a UserProfile.avatarKey to real art, falling back to the generic icon for accounts
 * that haven't picked one yet (every fresh account starts on "avatar-male"/"avatar-female", which
 * intentionally have no art — see AVATAR_CATALOG's comment in lib/gameData.ts). Used by
 * Sidebar/TopStatusBar's nav chip and the Profile modal itself, so all three always agree. */
export function ProfileAvatar({ avatarKey, className, iconClassName }: { avatarKey: string; className?: string; iconClassName?: string }) {
  const avatar = AVATAR_CATALOG.find((a) => a.key === avatarKey);
  if (!avatar) {
    return <UserCircle2 className={cn("text-gold-bright", iconClassName ?? "h-6 w-6")} />;
  }
  return (
    <Image
      src={avatar.icon}
      alt={avatar.name}
      width={128}
      height={128}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
