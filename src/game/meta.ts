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
    id: "reroll",
    name: "Plasticité",
    desc: "+1 relance des choix d'évolution par run, par palier (R1 sur l'écran de choix).",
    max: 5,
    baseCost: 90,
    growth: 1.8,
  },
  {
    id: "symbiote",
    name: "Pilote symbiote",
    desc: "Choisit les évolutions à ta place — la run ne s'interrompt plus.",
    max: 1,
    baseCost: 500,
    growth: 1,
  },
];

export function costOf(def: MetaDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(def.growth, level));
}

export interface MetaState {
  xp: number;
  upgrades: Record<string, number>;
}

const KEY = "bs-meta";

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw);
      if (typeof m.xp === "number" && m.upgrades) return m;
    }
  } catch {}
  return { xp: 0, upgrades: {} };
}

export function saveMeta(m: MetaState) {
  localStorage.setItem(KEY, JSON.stringify(m));
}
