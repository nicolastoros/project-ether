import type { Language } from "@/lib/i18n/translations";

export interface TutorialTip {
  /** Persisted "seen" key — also used as the row key in the Monster Guide. Stable once shipped;
   * changing it would make an already-dismissed tip reappear for existing players. Language-
   * independent on purpose (seenTutorialTips shouldn't reset just because the player switches
   * languages). */
  id: string;
  title: string;
  body: string;
}

const en: Record<string, TutorialTip> = {
  "/hub": {
    id: "hub",
    title: "Hub",
    body: "Your home base — see your active creature, daily tasks, and quick links to Raid Battle, Summon, the Blacksmith, and Global Ranking.",
  },
  "/campaign": {
    id: "campaign",
    title: "Campaign",
    body: "Each Chapter has a run of Areas leading to a Boss — clear them for Gold, EXP, and gear. Every area also has Normal/Medium/Hard/Super difficulty tiers, unlocked one at a time as you clear the one before.",
  },
  "/survival": {
    id: "survival",
    title: "Survival",
    body: "Fight back-to-back waves of enemies without a break — see how far your team can push before it falls, for its own set of rewards.",
  },
  "/events": {
    id: "events",
    title: "Events",
    body: "Extra: Hidden Training battles for Orbs of every color. Extreme Battles: bring up to 4 creatures to take down a tough raid boss for Awaken Coins. Challenge: coming soon.",
  },
  "/expeditions": {
    id: "expeditions",
    title: "Expeditions",
    body: "Send creatures that aren't in your active team out on a timed expedition — they'll come back with Gold, items, and EXP once it's done.",
  },
  "/gacha": {
    id: "gacha",
    title: "Summon",
    body: "Spend Gems or tickets to summon new creatures and equipment — Multi-Summon pulls several at once for a better rate on rarer ones.",
  },
  "/ranking": {
    id: "ranking",
    title: "Global Ranking",
    body: "Every Tamer ranked by total power — level up, awaken creatures, and grow your collection to climb the board.",
  },
  "/monsters": {
    id: "monsters",
    title: "Monsters",
    body: "Your full roster — check each creature's stats and skills, equip gear, and train its Super Attack with duplicate copies.",
  },
  "/formations": {
    id: "formations",
    title: "Formation Menu",
    body: "Build your team, sell creatures you don't need, unlock Hidden Potential, or browse the full Monster Dex — all from here.",
  },
  "/formations/teams": {
    id: "formations-teams",
    title: "Formations",
    body: "Build and save team presets for your hub team and party — swap creatures in and out and pick which formation to bring into battle.",
  },
  "/formations/sell": {
    id: "formations-sell",
    title: "Sell Monster",
    body: "Trade extra copies of creatures you don't need for Gold — you can't sell your last copy of one that's in your hub team, party, or a saved formation.",
  },
  "/formations/potential": {
    id: "formations-potential",
    title: "Hidden Potential",
    body: "Pick any creature you own to see its potential tree — spend duplicate copies to unlock permanent stat and skill bonuses.",
  },
  "/dex": {
    id: "dex",
    title: "Monster Dex",
    body: "Every creature in the Digital World, discovered or not — owned ones show in color, the rest stay grayed out until you get one.",
  },
  "/inventory": {
    id: "inventory",
    title: "Inventory",
    body: "Consumables, evolution materials, and other items you've collected — use or sell them from here.",
  },
  "/tamer": {
    id: "tamer",
    title: "Tamer",
    body: "Your own avatar and its gear — equipped pieces buff every creature in battle, not just one.",
  },
  "/shop": {
    id: "shop",
    title: "Shop",
    body: "Spend Gold or Gems on items and gear, or sell items you don't need for Gold.",
  },
  "/trophies": {
    id: "trophies",
    title: "Trophies",
    body: "Achievements earned for milestones — clearing tough content, exploring the Digital World, and more.",
  },
};

const es: Record<string, TutorialTip> = {
  "/hub": {
    id: "hub",
    title: "Base",
    body: "Tu base de operaciones: revisa tu creatura activa, las tareas diarias y accesos rápidos a Raid Battle, Invocar, la Herrería y el Ranking Global.",
  },
  "/campaign": {
    id: "campaign",
    title: "Campaña",
    body: "Cada Capítulo tiene una serie de Áreas que llevan a un Jefe: complétalas para conseguir Oro, EXP y equipo. Cada área también tiene niveles de dificultad Normal/Medio/Difícil/Super, que se desbloquean de a uno a medida que superas el anterior.",
  },
  "/survival": {
    id: "survival",
    title: "Supervivencia",
    body: "Enfrenta oleadas de enemigos sin descanso: mira hasta dónde puede llegar tu equipo antes de caer, por sus propias recompensas.",
  },
  "/events": {
    id: "events",
    title: "Eventos",
    body: "Extra: batallas de Entrenamiento Oculto para conseguir Orbes de todos los colores. Extreme Battles: lleva hasta 4 creaturas para derrotar a un jefe raid y ganar Monedas de Despertar. Challenge: próximamente.",
  },
  "/expeditions": {
    id: "expeditions",
    title: "Expediciones",
    body: "Envía creaturas que no estén en tu equipo activo a una expedición cronometrada: volverán con Oro, items y EXP cuando termine.",
  },
  "/gacha": {
    id: "gacha",
    title: "Invocar",
    body: "Gasta Gemas o tickets para invocar nuevas creaturas y equipo: Multi-Summon invoca varias de una vez con mejor probabilidad para las más raras.",
  },
  "/ranking": {
    id: "ranking",
    title: "Ranking Global",
    body: "Todos los Domadores rankeados por poder total: sube de nivel, despierta creaturas y haz crecer tu colección para escalar posiciones.",
  },
  "/monsters": {
    id: "monsters",
    title: "Monstruos",
    body: "Tu plantel completo: revisa las estadísticas y habilidades de cada creatura, equípale objetos, y entrena su Ataque Especial con copias duplicadas.",
  },
  "/formations": {
    id: "formations",
    title: "Menú de Formaciones",
    body: "Arma tu equipo, vende creaturas que no necesites, desbloquea Potencial Oculto, o explora el Monster Dex completo — todo desde acá.",
  },
  "/formations/teams": {
    id: "formations-teams",
    title: "Formaciones",
    body: "Arma y guarda equipos preestablecidos para tu equipo de base y tu party: cambia creaturas y elige qué formación llevar a la batalla.",
  },
  "/formations/sell": {
    id: "formations-sell",
    title: "Vender Monstruo",
    body: "Cambia copias extra de creaturas que no necesites por Oro: no puedes vender la última copia de una que esté en tu equipo de base, tu party o una formación guardada.",
  },
  "/formations/potential": {
    id: "formations-potential",
    title: "Potencial Oculto",
    body: "Elige cualquier creatura que tengas para ver su árbol de potencial: gasta copias duplicadas para desbloquear bonos permanentes de estadísticas y habilidades.",
  },
  "/dex": {
    id: "dex",
    title: "Monster Dex",
    body: "Todas las creaturas del Mundo Digital, descubiertas o no: las que tienes se ven a color, el resto queda en gris hasta que consigas una.",
  },
  "/inventory": {
    id: "inventory",
    title: "Inventario",
    body: "Consumibles, materiales de evolución y otros items que has conseguido: úsalos o véndelos desde acá.",
  },
  "/tamer": {
    id: "tamer",
    title: "Domador",
    body: "Tu propio avatar y su equipo: las piezas equipadas potencian a todas tus creaturas en batalla, no solo a una.",
  },
  "/shop": {
    id: "shop",
    title: "Tienda",
    body: "Gasta Oro o Gemas en items y equipo, o vende los que no necesites por Oro.",
  },
  "/trophies": {
    id: "trophies",
    title: "Trofeos",
    body: "Logros ganados por hitos importantes: superar contenido difícil, explorar el Mundo Digital, y más.",
  },
};

/** One tip per screen, keyed by its route pathname, per language. TutorialBubble.tsx looks this up
 * against usePathname() + the active language and shows it once (see lib/store.ts's
 * seenTutorialTips); MonsterGuideModal.tsx lists every entry here as a permanent reference. Keep
 * each body to 1-2 short sentences — this is meant to be a quick nudge, not documentation. */
export const TUTORIAL_TIPS: Record<Language, Record<string, TutorialTip>> = { en, es };
