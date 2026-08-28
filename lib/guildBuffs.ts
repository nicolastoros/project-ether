export type GuildBuffType = "atk" | "def" | "hp" | "all";

export function getDailyGuildBuff(): GuildBuffType {
  const day = new Date().getDay();
  // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  switch (day) {
    case 1: return "atk"; // Monday: Attack
    case 2: return "def"; // Tuesday: Defense
    case 3: return "hp"; // Wednesday: HP
    case 4: return "atk"; // Thursday: Attack
    case 5: return "def"; // Friday: Defense
    case 6: return "hp"; // Saturday: HP
    case 0: return "all"; // Sunday: All buffs!
    default: return "atk";
  }
}

export function getGuildBuffValue(guildLevel: number, buffType: GuildBuffType): { atkPercent: number, defPercent: number, hpPercent: number } {
  // 1% per guild level
  const bonus = guildLevel;
  return {
    atkPercent: (buffType === "atk" || buffType === "all") ? bonus : 0,
    defPercent: (buffType === "def" || buffType === "all") ? bonus : 0,
    hpPercent: (buffType === "hp" || buffType === "all") ? bonus : 0,
  };
}
