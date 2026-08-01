// La Pharmacie : méta-progression persistante (décision N4 2026-07-28).
// L'XP (protéines collectées) s'accumule entre les runs et s'y dépense en
// passifs permanents. Stockage localStorage.

export interface MetaDef {
  id: string;
  name: string;
  desc: string;
  max: number;
  baseCost: number;
  growth: number;
}

export const META_DEFS: MetaDef[] = [
  {
    id: "vacuole",
    name: "Vacuole de réserve",
    desc: "+1 PV au départ de chaque run.",
    max: 2,
    baseCost: 150,
    growth: 2.5,
  },
  {
    id: "cils",
    name: "Cils moteurs",
    desc: "+4 % de vitesse de nage par palier.",
    max: 5,
    baseCost: 60,
    growth: 1.8,
  },
  {
    id: "concentres",
    name: "Enzymes concentrées",
    desc: "+8 % de dégâts par palier, toutes armes.",
    max: 5,
    baseCost: 80,
    growth: 1.8,
  },
  {
    id: "phago",
    name: "Cils phagocytaires",
    desc: "Aimant à protéines élargi dès le départ.",
    max: 3,
    baseCost: 70,
    growth: 1.8,
  },
  {
    id: "reserve",
    name: "Réserve d'Apoptose",
    desc: "+1 charge d'Apoptose prête dès le départ (L2), par palier.",
    max: 3,
    baseCost: 120,
    growth: 2,
  },
  {
    id: "virulence",
    name: "Virulence",
    desc: "+18 % de rayon d'explosion des kystes par palier — ils nettoient plus large.",
    max: 5,
    baseCost: 70,
    growth: 1.7,
  },
  {
    id: "saccade",
    name: "Saccade",
    desc: "Dash (R1) plus prompt par palier ; palier 3 : invulnérable pendant ; palier 5 : il déchire sur son passage.",
    max: 5,
    baseCost: 100,
    growth: 1.8,
  },
  {
    id: "reroll",
    name: "Plasticité",
    desc: "+1 relance des choix d'évolution par run, par palier (R1 sur l'écran de choix).",
    max: 5,
    baseCost: 90,
    growth: 1.8,
  },
];

// ---------- Personnages jouables ----------
// Débloqués par la RÉUSSITE des morceaux de la bibliothèque (décision N4
// 2026-07-30) — un personnage par morceau, plus d'achat à l'XP. La sélection
// se fait sur un écran dédié avant la run. Skins Midjourney à venir.
export interface PersoDef {
  id: string;
  name: string;
  desc: string;
  /** Fichier du morceau à réussir pour débloquer (null = toujours possédé). */
  unlockFile: string | null;
  /**
   * Personnage EXIGÉ pour que la victoire compte (N4 2026-07-31) : sans ça,
   * le Tardigrade immortel débloquerait tout le roster sans effort.
   */
  unlockWith?: string;
}

export const PERSO_DEFS: PersoDef[] = [
  {
    id: "reguliere",
    name: "La Régulière",
    desc: "La cellule de base — équilibrée, fiable.",
    unlockFile: null,
  },
  {
    id: "phage",
    name: "Le Phage",
    desc: "1 PV. Dégâts ×1,5 et +10 % de vitesse — tout dans l'attaque.",
    unlockFile: "Anxious pathogene.mp3",
    unlockWith: "reguliere",
  },
  {
    id: "tardigrade",
    name: "Le Tardigrade",
    desc: "Ne meurt jamais. Chaque coup encaissé disperse ta jauge et te coûte de l'XP.",
    unlockFile: "Beyond abyss.mp3",
    unlockWith: "phage", // l'épreuve du roster : ce morceau avec 1 PV
  },
  {
    id: "amibe",
    name: "L'Amibe",
    desc: "Aimant énorme et +50 % d'XP collectée, mais lente et fragile.",
    unlockFile: "Dreamy Dive.mp3",
    unlockWith: "reguliere",
  },
  {
    id: "symbiote",
    name: "Le Symbiote",
    desc: "Les évolutions se choisissent toutes seules : la run ne s'interrompt jamais.",
    unlockFile: "Never see the light again.mp3",
    unlockWith: "reguliere",
  },
];

export function costOf(def: MetaDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(def.growth, level));
}

export interface MetaState {
  xp: number;
  upgrades: Record<string, number>;
  /** Personnage sélectionné ("reguliere" par défaut). L'achat du Symbiote
   *  d'avant la refonte (upgrades.symbiote = 1) vaut possession du perso. */
  selected?: string;
  /** Morceaux de la bibliothèque terminés en victoire (fichiers). */
  cleared?: string[];
  /** Personnages débloqués (les conditions de perso ont été remplies). */
  unlocked?: string[];
  /** Meilleur score par morceau (clé = fichier officiel ou id custom). */
  scores?: Record<string, number>;
}

const KEY = "bs-meta";

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw);
      if (typeof m.xp === "number" && m.upgrades) {
        if (!m.selected) m.selected = "reguliere";
        if (!m.cleared) m.cleared = [];
        if (!m.unlocked) m.unlocked = [];
        if (!m.scores) m.scores = {};
        return m;
      }
    }
  } catch {}
  return { xp: 0, upgrades: {}, selected: "reguliere", cleared: [], unlocked: [], scores: {} };
}

export function saveMeta(m: MetaState) {
  localStorage.setItem(KEY, JSON.stringify(m));
}
