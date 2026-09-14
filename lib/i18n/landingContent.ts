/** Marketing copy for the public landing page (components/landing/LandingPage.tsx) — kept as its
 * own dedicated content bundle (same reasoning as lib/whatsNew.ts/lib/overclockTour.ts) rather than
 * folded into lib/i18n/translations.ts's short-label dictionary, since this is paragraph-length
 * copy specific to one page, not reusable chrome. The landing page is the one place a pre-login
 * visitor can actually reach — see LandingPage.tsx's own language-toggle pill in its nav for why
 * that matters here specifically. */
import type { Language } from "@/lib/i18n/translations";

export interface LandingContent {
  nav: { logIn: string };
  hero: { tagline: string; subtitle: string; playNow: string; freeToPlay: string };
  stats: {
    creatures: string;
    chapters: string;
    areas: string;
    raidBosses: string;
    categories: string;
  };
  collect: {
    eyebrow: string;
    title: string;
    subtitle: (count: number) => string;
    categoriesPrefix: string;
    categoriesWord: string;
    categoriesSuffix: string;
  };
  combat: { eyebrow: string; title: string; subtitle: string };
  lrPower: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ultimateTab: string;
    passiveTab: string;
    passiveSkillLabel: string;
  };
  potential: { eyebrow: string; title: string; subtitle: string };
  raidBosses: { eyebrow: string; title: string; subtitle: string };
  campaign: { eyebrow: string; title: string; subtitle: (chapters: number, areas: number) => string };
  social: { guilds: string; ranking: string; dex: string };
  finalCta: { title: string; subtitle: string; playNow: string };
  footer: { alreadyHaveAccount: string; logIn: string };
}

const en: LandingContent = {
  nav: { logIn: "Log In" },
  hero: {
    tagline: "Summon. Evolve. Conquer the Digital World.",
    subtitle:
      "A free turn-based creature-collecting adventure — build your team, awaken hidden potential, and bring down colossal Raid Bosses.",
    playNow: "Play Now",
    freeToPlay: "Free to play — create your Tamer in seconds.",
  },
  stats: {
    creatures: "Creatures to Collect",
    chapters: "Story Chapters",
    areas: "Campaign Areas",
    raidBosses: "Epic Raid Bosses",
    categories: "Team Categories",
  },
  collect: {
    eyebrow: "Build Your Roster",
    title: "Collect and command a growing army",
    subtitle: (n) =>
      `From Common recruits to Legendary Royal Knights — ${n}+ creatures await, each with its own element, skills, and evolution path.`,
    categoriesPrefix: "Every creature carries real ",
    categoriesWord: "Categories",
    categoriesSuffix:
      " — build a team around one and stack their synergy, just like the tag systems veteran gacha players already know.",
  },
  combat: {
    eyebrow: "Battle System",
    title: "Combat that feels alive",
    subtitle:
      "Directional attacks, screen-shaking criticals, and Dokkan-style floating damage numbers — every hit lands with real weight.",
  },
  lrPower: {
    eyebrow: "LR-Exclusive",
    title: "Legendary power, on full display",
    subtitle:
      "Every LR creature carries its own Ultimate Attack and battle-opening Passive — real epic banners, real animations, straight from the actual game.",
    ultimateTab: "Ultimate Attacks",
    passiveTab: "Passives",
    passiveSkillLabel: "Passive Skill",
  },
  potential: {
    eyebrow: "Growth Systems",
    title: "Awaken hidden potential",
    subtitle: "Spend Orbs to unlock deep potential trees and push your strongest creatures far past their base limits.",
  },
  raidBosses: {
    eyebrow: "Team Up",
    title: "Bring down colossal Raid Bosses",
    subtitle: "Assemble up to 4 creatures and take on brutal multi-tier bosses for exclusive rewards.",
  },
  campaign: {
    eyebrow: "Story Mode",
    title: "A story worth fighting for",
    subtitle: (chapters, areas) =>
      `${chapters} chapters, ${areas} areas and counting — from a quiet beginning to a clash with rogue Royal Knights.`,
  },
  social: {
    guilds: "Guilds & Friends",
    ranking: "Global Ranking",
    dex: "Monster Dex",
  },
  finalCta: {
    title: "Your journey starts now.",
    subtitle: "No download, no wallet required — just a Tamer name and a starter creature.",
    playNow: "Play Now — It's Free",
  },
  footer: {
    alreadyHaveAccount: "Already have an account?",
    logIn: "Log in",
  },
};

const es: LandingContent = {
  nav: { logIn: "Iniciar Sesión" },
  hero: {
    tagline: "Invoca. Evoluciona. Conquista el Mundo Digital.",
    subtitle:
      "Una aventura gratuita de recolección de creaturas por turnos — arma tu equipo, despierta el potencial oculto y derriba jefes raid colosales.",
    playNow: "Jugar Ahora",
    freeToPlay: "Gratis para jugar — crea a tu Domador en segundos.",
  },
  stats: {
    creatures: "Creaturas para Coleccionar",
    chapters: "Capítulos de Historia",
    areas: "Áreas de Campaña",
    raidBosses: "Jefes Raid Épicos",
    categories: "Categorías de Equipo",
  },
  collect: {
    eyebrow: "Arma tu Plantel",
    title: "Colecciona y comanda un ejército en crecimiento",
    subtitle: (n) =>
      `Desde reclutas Common hasta Legendary Royal Knights — ${n}+ creaturas te esperan, cada una con su propio elemento, habilidades y camino de evolución.`,
    categoriesPrefix: "Cada creatura tiene ",
    categoriesWord: "Categorías",
    categoriesSuffix:
      " reales — arma un equipo en torno a una y acumula su sinergia, igual que los sistemas de etiquetas que ya conocen los jugadores veteranos de gacha.",
  },
  combat: {
    eyebrow: "Sistema de Batalla",
    title: "Combate que se siente vivo",
    subtitle:
      "Ataques direccionales, críticos que sacuden la pantalla, y números de daño flotantes al estilo Dokkan — cada golpe pega con peso real.",
  },
  lrPower: {
    eyebrow: "Exclusivo LR",
    title: "Poder legendario, a plena vista",
    subtitle:
      "Cada creatura LR tiene su propio Ataque Definitivo y una Pasiva que se activa al inicio de la batalla — banners épicos reales, animaciones reales, directo del juego real.",
    ultimateTab: "Ataques Definitivos",
    passiveTab: "Pasivas",
    passiveSkillLabel: "Habilidad Pasiva",
  },
  potential: {
    eyebrow: "Sistemas de Crecimiento",
    title: "Despierta el potencial oculto",
    subtitle: "Gasta Orbes para desbloquear árboles de potencial profundos y llevar a tus creaturas más fuertes mucho más allá de sus límites base.",
  },
  raidBosses: {
    eyebrow: "Únete en Equipo",
    title: "Derriba jefes raid colosales",
    subtitle: "Reúne hasta 4 creaturas y enfréntate a brutales jefes de múltiples niveles por recompensas exclusivas.",
  },
  campaign: {
    eyebrow: "Modo Historia",
    title: "Una historia que vale la pena pelear",
    subtitle: (chapters, areas) =>
      `${chapters} capítulos, ${areas} áreas y contando — desde un comienzo tranquilo hasta un choque con Royal Knights renegados.`,
  },
  social: {
    guilds: "Gremios y Amigos",
    ranking: "Ranking Global",
    dex: "Monster Dex",
  },
  finalCta: {
    title: "Tu aventura empieza ahora.",
    subtitle: "Sin descargas, sin billetera necesaria — solo un nombre de Domador y una creatura inicial.",
    playNow: "Jugar Ahora — Es Gratis",
  },
  footer: {
    alreadyHaveAccount: "¿Ya tienes una cuenta?",
    logIn: "Iniciar sesión",
  },
};

export const LANDING_CONTENT: Record<Language, LandingContent> = { en, es };
