// Le menu Survie (N4 2026-11-16) : plus de liste. Le joueur regarde le corps
// d'une créature inconnue, translucide, et chaque morceau y est un FOYER
// d'infection : un point lumineux.
//
// - La place d'un point dit ce qu'est le morceau : grave en bas du corps, aigu
//   en haut ; il bat à son tempo ; sa taille suit son intensité. Ces mesures
//   viennent du manifest (tools/measure-music.mjs).
// - Les traits sont un PARCOURS : les menaces faibles sont ouvertes au départ,
//   réussir un morceau ouvre ses voisins. Les souches non classées (les bancs
//   d'essai) restent libres, hors parcours.
// - S'arrêter sur un point sort la fiche du pathogène : son nom, sa menace,
//   son portrait (une forme vivante tirée de ses mesures), ses constantes, et
//   un descriptif que personne n'a relu.
//
// La créature est dessinée ici, par le code : aucune image.

export interface MapMeasures {
  bpm: number;
  seconds: number;
  level: number;
  density: number;
  low: number;
  high: number;
}
export interface MapTrack {
  file: string;
  title: string;
  difficulty?: "easy" | "normal" | "hard" | "test";
  hidden?: boolean;
  measures?: MapMeasures;
}

type Threat = "easy" | "normal" | "hard" | "test";
type State = "open" | "cleared" | "locked";

const THREAT_RGB: Record<Threat, [number, number, number]> = {
  easy: [142, 255, 192],
  normal: [255, 214, 122],
  hard: [255, 122, 104],
  test: [201, 184, 255],
};
const THREAT_LABEL: Record<Threat, string> = {
  easy: "MENACE FAIBLE",
  normal: "MENACE MODÉRÉE",
  hard: "MENACE ÉLEVÉE",
  test: "NON CLASSÉE",
};
const THREAT_PIPS: Record<Threat, number> = { easy: 1, normal: 2, hard: 3, test: 0 };

/** Les descriptifs. Rédigés par le laboratoire, relus par personne. */
const FICHES: Record<string, string> = {
  "Luxury.mp3":
    "Se propage dans les milieux aisés. Symptômes : une envie de velours et de champagne tiède. Aucun décès signalé, quelques vanités froissées.",
  "Space wind.mp3":
    "Entrée par un hublot mal fermé. Dérive lentement, ne mord presque pas. Les sujets infectés regardent le plafond en souriant.",
  "Wonderland.mp3":
    "Contractée en suivant un lapin. Hallucinations bénignes, perte du sens de l’échelle. Se soigne en cessant de boire ce qui dit « bois-moi ».",
  "Beyond abyss.mp3":
    "Prélevée plus bas que prévu. Elle regarde en retour. Le laboratoire recommande de ne pas soutenir son regard, par politesse.",
  "Dreamy Dive.mp3":
    "Endort le sujet avant de l’attaquer, ce qui est déloyal. Taux de réveil : correct. Taux de réveil reposé : nul.",
  "Liquid.mp3":
    "Prend la forme de son hôte. Impossible à saisir avec des pincettes, nous avons essayé. Tache.",
  "Anxious pathogene.mp3":
    "S’inquiète de tout, surtout de vous. Se multiplie dès qu’on la regarde. Taux de survie : décevant.",
  "4 h 04.mp3":
    "Ne sort que la nuit, devant un écran. Introuvable aux heures de bureau. Le technicien de garde jure qu’elle compte.",
  "Danger.mp3":
    "Elle prévient deux fois. Les sujets n’écoutent aucune des deux. Nous avons cessé d’imprimer les étiquettes.",
  "Derive.mp3":
    "Deux colonies qui tournent à des vitesses presque égales. Presque. Les observateurs y perdent un après-midi et la notion de mardi.",
  "Glas.mp3":
    "Sonne avant de frapper. Lourde, lente, très sûre d’elle. Le plancher du laboratoire est à refaire.",
  "Phosphore.mp3":
    "Luit dans le noir, ce qui facilite le dépistage et gâche les nuits. Jolie. Ne pas s’attacher.",
  "Stay Alive.mp3":
    "Seule souche connue qui encourage son hôte. Nous ignorons si c’est sincère. Les résultats suggèrent que non.",
  "Dendrobat paralysis.mp3":
    "Paralyse en commençant par les jambes, ce qui laisse le temps de regretter. Très jolie couleur. Ne pas lécher.",
  "Lumenhole.mp3":
    "Un trou par lequel passe de la lumière. Personne ne sait d’où. Le budget ne couvre pas la réponse.",
  "Never see the light again.mp3":
    "Le nom a été donné par le premier sujet. Nous n’avons pas pu lui demander de préciser.",
  "Yawn phase.mp3":
    "Contagieuse par simple bâillement. Vous venez de bâiller. Désolé.",
  "Tap.mp3":
    "Frappe à la porte, poliment, sans s’arrêter. Courte durée, longue rancune.",
};
const FICHE_INCONNUE = "Souche récente. Personne n’a encore eu le courage de la décrire. Vous serez le premier à savoir.";
const FICHE_VERROU =
  "Foyer hors d’atteinte. Éradique un foyer voisin pour remonter jusqu’ici. Nous attendons. Nous avons l’habitude.";

const DEFAUT: MapMeasures = { bpm: 110, seconds: 240, level: -12, density: 4.5, low: -3, high: -12 };

interface MapNode {
  track: MapTrack;
  threat: Threat;
  state: State;
  /** Position dans le corps : v de 0 (haut) à 1 (bas), dx en fraction de la hauteur. */
  v: number;
  dx: number;
  x: number;
  y: number;
  r: number;
  bpm: number;
  /** 0..1 : intensité, clarté (grave → aigu), agitation. */
  intensity: number;
  bright: number;
  busy: number;
  links: number[];
  el: HTMLButtonElement;
  born: number;
  seed: number;
  index: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round) as [number, number, number];
const VERT: [number, number, number] = [142, 255, 192];
const ETEINT: [number, number, number] = [96, 140, 118];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
/** Un hasard qui se rejoue : même graine, mêmes tirages. */
function rng(seed: number) {
  let s = Math.floor(seed * 4294967296) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * La silhouette : demi-largeur du corps à la hauteur v, en fraction de la
 * hauteur totale. Une ombrelle en haut, un col, un sac ventral, puis les
 * filaments qui s'évasent.
 */
function halfWidth(v: number): number {
  const bell = v < 0.4 ? 0.27 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.2) / 0.2, 2))) : 0;
  const torso = v > 0.39 && v < 0.73 ? 0.16 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.56) / 0.17, 2))) : 0;
  const tail = v > 0.66 ? 0.05 + 0.17 * smooth((v - 0.66) / 0.34) : 0;
  return Math.max(bell, torso, tail, 0.05);
}
/** Le nom de l'endroit, pour la fiche. */
function organe(v: number): string {
  if (v < 0.14) return "calotte";
  if (v < 0.3) return "couronne";
  if (v < 0.42) return "collet";
  if (v < 0.52) return "cœur";
  if (v < 0.62) return "poches latérales";
  if (v < 0.74) return "viscères";
  return "filaments";
}

export class BodyMap {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLElement;
  private card: HTMLElement;
  private portrait: HTMLCanvasElement;
  private pctx: CanvasRenderingContext2D;
  private backBtn: HTMLElement;
  private nodes: MapNode[] = [];
  private sel = -1; // index dans nodes ; nodes.length = le bouton Retour
  private opened = false;
  private t = 0;
  private openT = 0;
  private selT = 0;
  private cooldown = 0;
  private W = 0;
  private H = 0;
  private dpr = 1;
  /** Le corps : centre en x, haut, hauteur (pixels CSS). */
  private bx = 0;
  private by = 0;
  private bh = 0;
  private onPick: (track: MapTrack) => void = () => {};
  private lastFile: string | null = null;
  private motes: { x: number; y: number; s: number; p: number }[] = [];
  private tentacles: { u: number; len: number; ph: number; w: number }[] = [];
  private typed = "";
  private typeT = 0;

  constructor(root: HTMLElement, backBtn: HTMLElement) {
    this.root = root;
    this.backBtn = backBtn;
    this.canvas = document.createElement("canvas");
    this.canvas.id = "bm-canvas";
    this.ctx = this.canvas.getContext("2d")!;
    this.layer = document.createElement("div");
    this.layer.id = "bm-layer";
    this.card = document.createElement("div");
    this.card.id = "bm-card";
    this.card.innerHTML =
      `<div class="bm-head"><span>&gt; FICHE PATHOGÈNE</span><span class="bm-code"></span></div>` +
      `<div class="bm-top"><canvas class="bm-portrait"></canvas>` +
      `<div class="bm-id"><div class="bm-name"></div>` +
      `<div class="bm-threat"><span class="bm-pips"><i></i><i></i><i></i></span><span class="bm-threat-lab"></span></div></div></div>` +
      `<dl class="bm-meta"></dl><p class="bm-desc"></p>` +
      `<button class="bm-go" type="button"></button>`;
    this.portrait = this.card.querySelector(".bm-portrait") as HTMLCanvasElement;
    this.pctx = this.portrait.getContext("2d")!;
    const legend = document.createElement("div");
    legend.id = "bm-legend";
    legend.innerHTML =
      `<span data-k="easy">faible</span><span data-k="normal">modérée</span><span data-k="hard">élevée</span>` +
      `<span data-k="test">non classée</span><span data-k="cleared">éradiqué</span><span data-k="locked">hors d’atteinte</span>`;
    const title = document.createElement("div");
    title.id = "bm-title";
    title.innerHTML = `<h2>SURVIE</h2><p class="tagline">Où plonges-tu ?</p>`;
    root.prepend(this.canvas, this.layer, title, this.card, legend);
    (this.card.querySelector(".bm-go") as HTMLElement).addEventListener("click", () => this.confirm());
    window.addEventListener("resize", () => { if (this.opened) this.layout(); });
    const r = rng(0.4242);
    for (let i = 0; i < 70; i++) this.motes.push({ x: r(), y: r(), s: 0.4 + r() * 1.4, p: r() * 6.28 });
    for (let i = 0; i < 9; i++) {
      this.tentacles.push({ u: -1 + (2 * i) / 8, len: 0.26 + 0.08 * r(), ph: r() * 6.28, w: i % 4 === 0 ? 2.2 : 1 });
    }
  }

  /** Ouvre la carte. `cleared` : les fichiers déjà réussis. */
  open(tracks: MapTrack[], cleared: string[], onPick: (track: MapTrack) => void) {
    this.onPick = onPick;
    this.layer.innerHTML = "";
    const done = new Set(cleared);
    const list = tracks.filter((tr) => !tr.hidden);
    const M = list.map((tr) => tr.measures ?? DEFAUT);
    // Clarté : l'aigu par rapport au grave. Moitié valeur, moitié rang, pour que
    // les morceaux qui se ressemblent ne s'empilent pas au même étage.
    const clarte = M.map((m) => m.high - m.low);
    const lo = Math.min(...clarte), hi = Math.max(...clarte);
    const ordre = clarte.map((c, i) => [c, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
    const rang: number[] = [];
    ordre.forEach((i, k) => { rang[i] = list.length > 1 ? k / (list.length - 1) : 0.5; });
    this.nodes = list.map((track, i) => {
      const m = M[i];
      const threat: Threat = track.difficulty ?? "normal";
      const bright = 0.5 * (hi > lo ? (clarte[i] - lo) / (hi - lo) : 0.5) + 0.5 * rang[i];
      const busy = clamp01((m.density - 2.8) / 3);
      const intensity = clamp01(0.55 * clamp01((m.level + 19) / 11.5) + 0.45 * busy);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "bm-node";
      el.setAttribute("aria-label", track.title);
      el.addEventListener("pointerenter", () => this.select(i));
      el.addEventListener("click", () => { this.select(i); this.confirm(); });
      this.layer.appendChild(el);
      return {
        track, threat, state: "open" as State, v: 0.1 + (1 - bright) * 0.8, dx: 0, x: 0, y: 0, r: 8,
        bpm: m.bpm, intensity, bright, busy, links: [], el, born: 0, seed: hash(track.file), index: i,
      };
    });
    // De part et d'autre de l'axe, en zigzag de haut en bas ; plus le morceau
    // est agité, plus il s'écarte.
    const parHauteur = this.nodes.map((n) => n.index).sort((a, b) => this.nodes[a].v - this.nodes[b].v);
    parHauteur.forEach((i, k) => {
      const n = this.nodes[i];
      n.dx = (k % 2 === 0 ? -1 : 1) * (0.22 + 0.58 * n.busy) * halfWidth(n.v);
      n.born = 0.55 + k * 0.07;
    });
    this.relax();
    this.buildLinks();
    // Le parcours : faible = ouvert ; réussi = éradiqué ; sinon il faut un voisin éradiqué
    for (const n of this.nodes) {
      if (done.has(n.track.file)) n.state = "cleared";
      else if (n.threat === "test" || n.threat === "easy") n.state = "open";
      else n.state = "locked";
    }
    for (const n of this.nodes) {
      if (n.state === "locked" && n.links.some((j) => done.has(this.nodes[j].track.file))) n.state = "open";
    }
    for (const n of this.nodes) n.el.dataset.state = n.state;
    this.opened = true;
    this.openT = 0;
    this.layout();
    // On revient sur le dernier foyer visité ; sinon le premier foyer ouvert qui reste à faire
    let start = this.nodes.findIndex((n) => n.track.file === this.lastFile);
    if (start < 0) start = this.nodes.findIndex((n) => n.state === "open" && n.threat !== "test");
    if (start < 0) start = this.nodes.findIndex((n) => n.state !== "locked");
    this.sel = -1;
    this.select(Math.max(0, start));
  }

  close() {
    this.opened = false;
  }

  /** Écarte les points trop proches, surtout de côté : la hauteur dit vrai, on y touche peu. */
  private relax() {
    const dmin = 0.095;
    for (let it = 0; it < 80; it++) {
      for (let a = 0; a < this.nodes.length; a++) {
        for (let b = a + 1; b < this.nodes.length; b++) {
          const A = this.nodes[a], B = this.nodes[b];
          let ex = B.dx - A.dx;
          const ey = B.v - A.v;
          const d = Math.hypot(ex, ey);
          if (d >= dmin) continue;
          if (Math.abs(ex) < 0.001) ex = (A.seed > B.seed ? 1 : -1) * 0.001;
          const push = (dmin - d) / 2;
          const sx = Math.sign(ex);
          A.dx -= sx * push * 0.9; B.dx += sx * push * 0.9;
          const sy = ey >= 0 ? 1 : -1;
          A.v -= sy * push * 0.18; B.v += sy * push * 0.18;
        }
      }
      for (const n of this.nodes) {
        n.v = Math.max(0.07, Math.min(0.95, n.v));
        const lim = 0.84 * halfWidth(n.v);
        n.dx = Math.max(-lim, Math.min(lim, n.dx));
      }
    }
  }

  /** Les traits du parcours, entre morceaux classés : au plus court, sans laisser personne seul. */
  private buildLinks() {
    const ids = this.nodes.filter((n) => n.threat !== "test").map((n) => n.index);
    if (ids.length < 2) return;
    const dist = (a: number, b: number) => Math.hypot(this.nodes[a].dx - this.nodes[b].dx, this.nodes[a].v - this.nodes[b].v);
    const dedans = new Set<number>([ids[0]]);
    const link = (a: number, b: number) => { this.nodes[a].links.push(b); this.nodes[b].links.push(a); };
    const longueurs: number[] = [];
    while (dedans.size < ids.length) {
      let best = Infinity, ba = -1, bb = -1;
      for (const a of dedans) for (const b of ids) {
        if (dedans.has(b)) continue;
        const d = dist(a, b);
        if (d < best) { best = d; ba = a; bb = b; }
      }
      link(ba, bb);
      longueurs.push(best);
      dedans.add(bb);
    }
    // Quelques traits de plus entre voisins très proches : le parcours a des embranchements
    longueurs.sort((a, b) => a - b);
    const seuil = longueurs[Math.floor(longueurs.length / 2)] * 1.15;
    let extra = 0;
    for (const a of ids) for (const b of ids) {
      if (a >= b || extra >= 2) continue;
      const A = this.nodes[a], B = this.nodes[b];
      if (A.links.includes(b) || A.links.length >= 3 || B.links.length >= 3) continue;
      if (dist(a, b) <= seuil) { link(a, b); extra++; }
    }
  }

  private layout() {
    const rect = this.root.getBoundingClientRect();
    this.W = Math.max(320, rect.width);
    this.H = Math.max(320, rect.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    // La fiche grandit avec la fenêtre (tout y est en em)
    const fs = Math.max(13, Math.min(18, this.H / 56));
    this.card.style.fontSize = `${fs}px`;
    const cardW = this.card.getBoundingClientRect().width || fs * 28;
    const etroit = this.W <= 860; // la fiche passe en bandeau sous la carte (CSS)
    const libre = this.W - (etroit ? 0 : cardW + 70);
    this.bh = Math.min(this.H * (etroit ? 0.6 : 0.86), (libre * 0.94) / 0.56);
    // La créature et sa fiche forment un bloc, centré : sur un grand écran la
    // fiche ne reste pas collée au bord, loin de ce qu'elle décrit.
    const gauche = this.bh * 0.335 + 96; // la règle et ses étiquettes
    const droite = this.bh * 0.3;
    const ecart = Math.max(56, Math.min(170, this.W * 0.07));
    const bloc = gauche + droite + ecart + cardW;
    if (!etroit && bloc < this.W - 68) {
      const marge = (this.W - bloc) / 2;
      this.bx = marge + gauche;
      this.card.style.right = `${Math.max(34, marge)}px`;
    } else {
      this.bx = Math.max(this.bh * 0.3, libre / 2 + (etroit ? 0 : 10));
      this.card.style.right = "";
    }
    this.by = etroit ? this.H * 0.08 : (this.H - this.bh) / 2 + this.H * 0.01;
    for (const n of this.nodes) {
      n.x = this.bx + n.dx * this.bh;
      n.y = this.by + n.v * this.bh;
      n.r = (5.5 + 6.5 * n.intensity) * Math.max(0.8, Math.min(1.5, this.bh / 640));
      const hit = Math.max(30, n.r * 3.4);
      n.el.style.left = `${n.x - hit / 2}px`;
      n.el.style.top = `${n.y - hit / 2}px`;
      n.el.style.width = n.el.style.height = `${hit}px`;
    }
    const ps = Math.round((this.portrait.getBoundingClientRect().width || 132) * this.dpr);
    this.portrait.width = this.portrait.height = ps;
  }

  private select(i: number) {
    if (i === this.sel) return;
    this.sel = i;
    this.selT = 0;
    this.backBtn.classList.toggle("sel", i === this.nodes.length);
    this.nodes.forEach((n, k) => n.el.classList.toggle("sel", k === i));
    if (i < this.nodes.length && i >= 0) {
      this.lastFile = this.nodes[i].track.file;
      this.fillCard(this.nodes[i]);
    }
  }

  private fillCard(n: MapNode) {
    const $ = (q: string) => this.card.querySelector(q) as HTMLElement;
    const locked = n.state === "locked";
    const m = n.track.measures ?? DEFAUT;
    this.card.dataset.threat = locked ? "locked" : n.threat;
    $(".bm-code").textContent = `N° ${String(n.index + 1).padStart(2, "0")} / ${String(this.nodes.length).padStart(2, "0")}`;
    this.typed = locked ? "NON IDENTIFIÉ" : n.track.title.toUpperCase();
    this.typeT = 0;
    $(".bm-name").textContent = "";
    $(".bm-threat-lab").textContent = locked ? "MENACE ?" : THREAT_LABEL[n.threat];
    const pips = locked ? -1 : THREAT_PIPS[n.threat];
    this.card.querySelectorAll(".bm-pips i").forEach((el, k) => {
      el.classList.toggle("on", pips > k);
      el.classList.toggle("unk", pips <= 0);
    });
    const min = Math.floor(m.seconds / 60), sec = String(m.seconds % 60).padStart(2, "0");
    const rows: [string, string][] = locked
      ? [["Foyer", organe(n.v)], ["Pouls", "—"], ["Incubation", "—"], ["Virulence", "—"], ["Agitation", "—"]]
      : [
          ["Foyer", organe(n.v)],
          ["Pouls", `${Math.round(m.bpm)} /min`],
          ["Incubation", `${min} min ${sec}`],
          ["Virulence", `${Math.round(n.intensity * 100)} %`],
          ["Agitation", `${m.density.toFixed(1).replace(".", ",")} attaques/s`],
        ];
    $(".bm-meta").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    $(".bm-desc").textContent = locked ? FICHE_VERROU : FICHES[n.track.file] ?? FICHE_INCONNUE;
    const go = $(".bm-go") as HTMLButtonElement;
    go.textContent = locked ? "Hors d’atteinte" : "Plonger";
    go.disabled = locked;
    // Relance l'animation d'apparition de la fiche
    this.card.classList.remove("in");
    void this.card.offsetWidth;
    this.card.classList.add("in");
  }

  private confirm() {
    if (this.sel === this.nodes.length) { this.backBtn.click(); return; }
    const n = this.nodes[this.sel];
    if (!n) return;
    if (n.state === "locked") {
      this.card.classList.remove("no");
      void this.card.offsetWidth;
      this.card.classList.add("no");
      return;
    }
    this.onPick(n.track);
  }

  /** Stick ou flèches : on saute au point le plus proche dans la direction donnée. */
  private move(dx: number, dy: number) {
    const total = this.nodes.length + 1;
    const pos = (i: number): [number, number] => {
      if (i < this.nodes.length) return [this.nodes[i].x, this.nodes[i].y];
      const r = this.backBtn.getBoundingClientRect(), o = this.root.getBoundingClientRect();
      return [r.left - o.left + r.width / 2, r.top - o.top + r.height / 2];
    };
    const [cx, cy] = pos(this.sel);
    let best = -1, top = Infinity;
    for (let i = 0; i < total; i++) {
      if (i === this.sel) continue;
      const [x, y] = pos(i);
      const ex = x - cx, ey = y - cy;
      const d = Math.hypot(ex, ey);
      if (d < 1) continue;
      const cos = (ex * dx + ey * dy) / d;
      if (cos < 0.38) continue;
      const score = d / (cos * cos);
      if (score < top) { top = score; best = i; }
    }
    if (best >= 0) this.select(best);
  }

  /** À appeler à chaque image tant que l'écran Survie est ouvert. */
  update(dt: number, vx: number, vy: number, confirmEdge: boolean) {
    if (!this.opened) return;
    this.t += dt;
    this.openT += dt;
    this.selT += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown <= 0 && Math.hypot(vx, vy) > 0.5) {
      const l = Math.hypot(vx, vy);
      this.move(vx / l, -vy / l);
      this.cooldown = 0.2;
    }
    if (confirmEdge) this.confirm();
    // Le nom s'écrit
    if (this.typed) {
      this.typeT += dt;
      const k = Math.min(this.typed.length, Math.floor(this.typeT / 0.022) + 1);
      const el = this.card.querySelector(".bm-name") as HTMLElement;
      if (el.textContent !== this.typed.slice(0, k)) el.textContent = this.typed.slice(0, k);
    }
    this.draw();
    this.drawPortrait();
  }

  // ---------- Dessin ----------

  private beat(bpm: number, offset = 0): number {
    const ph = ((this.t * bpm) / 60 + offset) % 1;
    return Math.exp(-ph * 5.5);
  }

  private draw() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    const cur = this.sel >= 0 && this.sel < this.nodes.length ? this.nodes[this.sel] : null;
    const appear = smooth(this.openT / 0.9);
    // Le corps prend la teinte de la menace observée, très légèrement
    const tint = cur && cur.state !== "locked" ? mix(VERT, THREAT_RGB[cur.threat], 0.35) : VERT;
    const pulse = cur && cur.state !== "locked" ? this.beat(cur.bpm) : this.beat(54);
    this.drawMotes(c, appear);
    c.save();
    c.globalAlpha = appear;
    this.drawCreature(c, tint, pulse);
    c.restore();
    this.drawRuler(c, cur, appear);
    this.drawLinks(c);
    this.drawNodes(c, cur);
    if (cur) this.drawLeader(c, cur);
  }

  /**
   * La règle, à gauche du corps : elle dit ce que la hauteur veut dire (aigu
   * en haut, grave en bas) et nomme les organes. Celui du foyer observé s'allume.
   */
  private drawRuler(c: CanvasRenderingContext2D, cur: MapNode | null, appear: number) {
    const x = this.bx - this.bh * 0.335;
    if (x < 225) return; // pas la place : le titre et la légende sont là
    const Y = (v: number) => this.by + v * this.bh;
    const etages: [number, number, string][] = [
      [0.02, 0.14, "calotte"], [0.14, 0.3, "couronne"], [0.3, 0.42, "collet"], [0.42, 0.52, "cœur"],
      [0.52, 0.62, "poches"], [0.62, 0.74, "viscères"], [0.74, 0.98, "filaments"],
    ];
    c.save();
    c.globalAlpha = appear;
    c.font = `11px "Courier New", Courier, monospace`;
    c.textBaseline = "middle";
    c.strokeStyle = "rgba(126,240,160,0.3)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, Y(0.02));
    c.lineTo(x, Y(0.98));
    c.stroke();
    // Les graduations fines
    for (let k = 0; k <= 48; k++) {
      const v = 0.02 + (k / 48) * 0.96;
      c.beginPath();
      c.moveTo(x, Y(v));
      c.lineTo(x - (k % 4 === 0 ? 7 : 3), Y(v));
      c.stroke();
    }
    c.textAlign = "right";
    for (const [a, b, nom] of etages) {
      const ici = cur !== null && cur.v >= a && cur.v < b;
      c.beginPath();
      c.moveTo(x, Y(a));
      c.lineTo(x + 10, Y(a));
      c.stroke();
      c.fillStyle = ici ? "rgba(215,255,232,0.95)" : "rgba(111,174,138,0.6)";
      c.fillText(nom.toUpperCase(), x - 13, Y((a + b) / 2));
    }
    c.textAlign = "center";
    c.fillStyle = "rgba(142,255,192,0.75)";
    c.fillText("AIGU ▲", x, Y(0.02) - 13);
    c.fillText("GRAVE ▼", x, Y(0.98) + 14);
    // Le curseur : la hauteur du foyer observé
    if (cur) {
      const y = cur.y;
      c.fillStyle = "rgba(225,255,238,0.95)";
      c.beginPath();
      c.moveTo(x + 2, y);
      c.lineTo(x + 11, y - 5);
      c.lineTo(x + 11, y + 5);
      c.closePath();
      c.fill();
      c.setLineDash([1, 5]);
      c.strokeStyle = "rgba(190,255,220,0.35)";
      c.beginPath();
      c.moveTo(x + 13, y);
      c.lineTo(cur.x - cur.r * 3.4, y);
      c.stroke();
    }
    c.restore();
  }

  /** Le plancton : des grains qui montent lentement dans le liquide. */
  private drawMotes(c: CanvasRenderingContext2D, appear: number) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const m of this.motes) {
      const y = (((m.y - this.t * 0.006 * m.s) % 1) + 1) % 1;
      const x = m.x + 0.006 * Math.sin(this.t * 0.3 + m.p);
      const a = (0.1 + 0.14 * (0.5 + 0.5 * Math.sin(this.t * 0.9 + m.p))) * appear;
      c.fillStyle = `rgba(150,255,205,${a})`;
      c.beginPath();
      c.arc(x * this.W, y * this.H, m.s, 0, 6.2832);
      c.fill();
    }
    c.restore();
  }

  private drawCreature(c: CanvasRenderingContext2D, tint: [number, number, number], pulse: number) {
    const { bx, by, bh, t } = this;
    const X = (dx: number) => bx + dx * bh;
    const Y = (v: number) => by + v * bh;
    const breath = Math.sin(t * 0.75);
    const sw = 1 + 0.035 * breath; // l'ombrelle s'ouvre
    const sh = 1 - 0.03 * breath; // et s'aplatit
    c.lineJoin = "round";
    c.lineCap = "round";
    c.globalCompositeOperation = "lighter";

    // Un halo derrière tout le corps
    const halo = c.createRadialGradient(bx, Y(0.45), bh * 0.05, bx, Y(0.45), bh * 0.62);
    halo.addColorStop(0, rgba(tint, 0.085));
    halo.addColorStop(1, rgba(tint, 0));
    c.fillStyle = halo;
    c.fillRect(bx - bh * 0.7, by - bh * 0.1, bh * 1.4, bh * 1.2);

    // --- Les filaments : ils pendent sous le sac et ondulent ---
    for (const f of this.tentacles) {
      const x0 = f.u * 0.1, v0 = 0.7;
      c.beginPath();
      for (let k = 0; k <= 26; k++) {
        const s = k / 26;
        const v = v0 + s * f.len * (1.05 + 0.25 * Math.abs(f.u));
        const sway = Math.sin(t * 0.8 + f.ph + s * 5.2) * 0.022 * s + Math.sin(t * 0.33 + f.ph * 2 + s * 2.1) * 0.03 * s * s;
        const x = x0 + f.u * 0.2 * smooth(s * 1.15) + sway;
        if (k === 0) c.moveTo(X(x), Y(v)); else c.lineTo(X(x), Y(v));
      }
      const g = c.createLinearGradient(0, Y(v0), 0, Y(v0 + f.len * 1.3));
      g.addColorStop(0, rgba(tint, 0.5));
      g.addColorStop(0.7, rgba(tint, 0.26));
      g.addColorStop(1, rgba(tint, 0));
      c.strokeStyle = g;
      c.lineWidth = f.w * 5;
      c.globalAlpha *= 0.28;
      c.stroke();
      c.globalAlpha /= 0.28;
      c.lineWidth = f.w;
      c.stroke();
    }

    // --- Le sac ventral : une membrane, et dedans les organes ---
    const sac = (grow: number) => {
      c.beginPath();
      for (let k = 0; k <= 60; k++) {
        const a = (k / 60) * 6.2832;
        const wob = 1 + 0.025 * Math.sin(a * 3 + t * 0.9) + 0.02 * Math.sin(a * 5 - t * 0.6);
        const x = Math.sin(a) * 0.165 * wob * grow;
        const v = 0.56 - Math.cos(a) * 0.175 * wob * grow;
        if (k === 0) c.moveTo(X(x), Y(v)); else c.lineTo(X(x), Y(v));
      }
      c.closePath();
    };
    sac(1);
    const gs = c.createRadialGradient(bx, Y(0.54), 0, bx, Y(0.56), bh * 0.19);
    gs.addColorStop(0, rgba(tint, 0.09));
    gs.addColorStop(0.8, rgba(tint, 0.035));
    gs.addColorStop(1, rgba(tint, 0.09));
    c.fillStyle = gs;
    c.fill();
    c.strokeStyle = rgba(tint, 0.42);
    c.lineWidth = 1.1;
    c.stroke();
    sac(0.93);
    c.strokeStyle = rgba(tint, 0.1);
    c.lineWidth = 0.8;
    c.stroke();
    // Les viscères : une spirale lâche
    c.beginPath();
    for (let k = 0; k <= 70; k++) {
      const s = k / 70;
      const a = s * 15 + t * 0.12;
      const rr = 0.012 + 0.062 * s;
      const x = Math.cos(a) * rr * 1.15;
      const v = 0.655 + Math.sin(a) * rr * 0.6;
      if (k === 0) c.moveTo(X(x), Y(v)); else c.lineTo(X(x), Y(v));
    }
    c.strokeStyle = rgba(tint, 0.2);
    c.lineWidth = 2.2;
    c.stroke();
    // Les deux poches latérales : elles se gonflent à contretemps
    for (const side of [-1, 1]) {
      const g2 = 1 + 0.08 * Math.sin(t * 0.75 + (side > 0 ? 1.4 : 0));
      c.beginPath();
      c.ellipse(X(side * 0.085), Y(0.565), bh * 0.04 * g2, bh * 0.058 * g2, side * 0.25, 0, 6.2832);
      c.fillStyle = rgba(tint, 0.06);
      c.fill();
      c.strokeStyle = rgba(tint, 0.3);
      c.lineWidth = 0.9;
      c.stroke();
    }
    // Le cœur : il bat au tempo du foyer observé
    const hr = bh * (0.026 + 0.012 * pulse);
    const gh = c.createRadialGradient(bx, Y(0.475), 0, bx, Y(0.475), hr * 3.2);
    gh.addColorStop(0, rgba(tint, 0.5 + 0.4 * pulse));
    gh.addColorStop(0.35, rgba(tint, 0.16 + 0.2 * pulse));
    gh.addColorStop(1, rgba(tint, 0));
    c.fillStyle = gh;
    c.beginPath();
    c.arc(bx, Y(0.475), hr * 3.2, 0, 6.2832);
    c.fill();
    c.beginPath();
    c.ellipse(bx - hr * 0.45, Y(0.475), hr * 0.75, hr, -0.35, 0, 6.2832);
    c.ellipse(bx + hr * 0.45, Y(0.475), hr * 0.75, hr, 0.35, 0, 6.2832);
    c.strokeStyle = rgba(tint, 0.75);
    c.lineWidth = 1;
    c.stroke();

    // --- La corde : l'axe du corps, et un influx qui la descend à chaque battement ---
    c.beginPath();
    for (let k = 0; k <= 40; k++) {
      const v = 0.3 + (k / 40) * 0.62;
      const x = Math.sin(v * 9 + t * 0.5) * 0.006 * (v - 0.3) * 3;
      if (k === 0) c.moveTo(X(x), Y(v)); else c.lineTo(X(x), Y(v));
    }
    c.strokeStyle = rgba(tint, 0.2);
    c.lineWidth = 1.2;
    c.stroke();
    for (let k = 0; k < 14; k++) {
      const v = 0.32 + (k / 13) * 0.58;
      const wave = Math.exp(-Math.pow((((t * 0.9 + 1 - k / 13) % 1) + 1) % 1, 1) * 4);
      c.fillStyle = rgba(tint, 0.14 + 0.5 * wave);
      c.beginPath();
      c.arc(X(Math.sin(v * 9 + t * 0.5) * 0.006 * (v - 0.3) * 3), Y(v), 1.3 + 1.4 * wave, 0, 6.2832);
      c.fill();
    }

    // --- L'ombrelle ---
    const rim = (k: number, n: number) => {
      // Le bord : festonné, il ondule
      const s = k / n;
      const x = (-1 + 2 * s) * 0.27 * sw;
      const scallop = 0.012 * Math.abs(Math.sin(s * Math.PI * 9)) + 0.006 * Math.sin(s * 14 + t * 1.4);
      const v = 0.2 + (0.165 * sh + scallop) * (1 - 0.18 * Math.pow(Math.abs(-1 + 2 * s), 2));
      return [x, v] as [number, number];
    };
    c.beginPath();
    // Le dôme, de gauche à droite par le haut
    for (let k = 0; k <= 50; k++) {
      const a = Math.PI + (k / 50) * Math.PI;
      const x = Math.cos(a) * 0.27 * sw;
      const v = 0.2 + Math.sin(a) * 0.19 * sh - 0.006 * breath;
      if (k === 0) c.moveTo(X(x), Y(v)); else c.lineTo(X(x), Y(v));
    }
    // puis le bord, de droite à gauche
    for (let k = 44; k >= 0; k--) { const [x, v] = rim(k, 44); c.lineTo(X(x), Y(v)); }
    c.closePath();
    const gb = c.createRadialGradient(bx, Y(0.16), bh * 0.02, bx, Y(0.2), bh * 0.3);
    gb.addColorStop(0, rgba(tint, 0.13));
    gb.addColorStop(0.7, rgba(tint, 0.045));
    gb.addColorStop(1, rgba(tint, 0.11));
    c.fillStyle = gb;
    c.fill();
    c.strokeStyle = rgba(tint, 0.1);
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = rgba(tint, 0.55);
    c.lineWidth = 1.2;
    c.stroke();
    // Les canaux : du sommet vers le bord
    for (let k = 0; k < 9; k++) {
      const s = (k + 0.5) / 9;
      const [rx, rv] = rim(Math.round(s * 44), 44);
      c.beginPath();
      c.moveTo(X(0), Y(0.045));
      c.quadraticCurveTo(X(rx * 0.75), Y(0.07), X(rx), Y(rv));
      c.strokeStyle = rgba(tint, 0.085);
      c.lineWidth = 1;
      c.stroke();
    }
    // La couronne : quatre lobes au cœur de l'ombrelle
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * 6.2832 + 0.785 + 0.05 * Math.sin(t * 0.4);
      const px = Math.cos(a) * 0.058 * sw, pv = 0.185 + Math.sin(a) * 0.04 * sh;
      c.beginPath();
      c.ellipse(X(px), Y(pv), bh * 0.036, bh * 0.024, a, 0.4, 5.9);
      c.strokeStyle = rgba(tint, 0.34 + 0.12 * Math.sin(t * 1.1 + k));
      c.lineWidth = 1.4;
      c.stroke();
    }
    // Le collet : l'ombrelle se resserre vers le sac
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(X(side * 0.1 * sw), Y(0.36));
      c.bezierCurveTo(X(side * 0.05), Y(0.4), X(side * 0.035), Y(0.4), X(side * 0.06), Y(0.43));
      c.strokeStyle = rgba(tint, 0.3);
      c.lineWidth = 1;
      c.stroke();
    }
    c.globalCompositeOperation = "source-over";
  }

  /** Les traits du parcours. Allumés depuis un foyer éradiqué, éteints ailleurs. */
  private drawLinks(c: CanvasRenderingContext2D) {
    const grow = smooth((this.openT - 0.5) / 1.1);
    if (grow <= 0) return;
    c.save();
    c.lineCap = "round";
    for (const a of this.nodes) for (const j of a.links) {
      if (j < a.index) continue;
      const b = this.nodes[j];
      const lit = a.state === "cleared" || b.state === "cleared";
      // Le trait part du foyer éradiqué
      const from = b.state === "cleared" && a.state !== "cleared" ? b : a;
      const to = from === a ? b : a;
      const mx = (from.x + to.x) / 2 + (to.y - from.y) * 0.12;
      const my = (from.y + to.y) / 2 - (to.x - from.x) * 0.12;
      const P = (s: number): [number, number] => [
        (1 - s) * (1 - s) * from.x + 2 * (1 - s) * s * mx + s * s * to.x,
        (1 - s) * (1 - s) * from.y + 2 * (1 - s) * s * my + s * s * to.y,
      ];
      c.beginPath();
      for (let k = 0; k <= 24; k++) {
        const [x, y] = P((k / 24) * grow);
        if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      if (lit) {
        c.setLineDash([]);
        c.globalCompositeOperation = "lighter";
        c.strokeStyle = "rgba(170,255,215,0.12)";
        c.lineWidth = 6;
        c.stroke();
        c.strokeStyle = "rgba(190,255,225,0.7)";
        c.lineWidth = 1.2;
        c.stroke();
        // Ce qui circule : trois grains qui remontent le trait
        for (let k = 0; k < 3; k++) {
          const s = ((this.t * 0.35 + k / 3) % 1) * grow;
          const [x, y] = P(s);
          c.fillStyle = `rgba(230,255,240,${0.85 * Math.sin(s * Math.PI)})`;
          c.beginPath();
          c.arc(x, y, 1.8, 0, 6.2832);
          c.fill();
        }
        c.globalCompositeOperation = "source-over";
      } else {
        c.setLineDash([3, 6]);
        c.strokeStyle = "rgba(150,215,185,0.55)";
        c.lineWidth = 1.2;
        c.stroke();
      }
    }
    c.restore();
  }

  private drawNodes(c: CanvasRenderingContext2D, cur: MapNode | null) {
    c.save();
    for (const n of this.nodes) {
      const born = smooth((this.openT - n.born) / 0.35);
      if (born <= 0) continue;
      const pop = born * (1 + 0.35 * Math.sin(born * Math.PI));
      const locked = n.state === "locked";
      const col = locked ? ETEINT : THREAT_RGB[n.threat];
      const p = locked ? 0 : this.beat(n.bpm, n.seed);
      const test = n.threat === "test" && n.state !== "cleared";
      // Une souche non classée se fait discrète : les portes du parcours passent devant
      const calm = n.state === "cleared" ? 0.35 : test ? 0.6 : 1;
      const r = n.r * pop * (1 + 0.32 * p * calm) * (locked ? 0.8 : test ? 0.62 : 1);
      // Le halo
      c.globalCompositeOperation = "lighter";
      const hr = r * (locked ? 2.4 : 4.4 + 1.6 * p * calm);
      const g = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, hr);
      g.addColorStop(0, rgba(col, (locked ? 0.16 : test ? 0.3 + 0.2 * p : 0.45 + 0.35 * p * calm) * born));
      g.addColorStop(0.4, rgba(col, (locked ? 0.04 : test ? 0.07 : 0.14) * born));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(n.x, n.y, hr, 0, 6.2832);
      c.fill();
      c.globalCompositeOperation = "source-over";
      if (n.state === "cleared") {
        // Éradiqué : il n'en reste que la paroi, et un point de cendre
        c.strokeStyle = rgba(mix(col, [235, 255, 245], 0.55), 0.9 * born);
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(n.x, n.y, r, 0, 6.2832);
        c.stroke();
        c.fillStyle = rgba([235, 255, 245], 0.8 * born);
        c.beginPath();
        c.arc(n.x, n.y, Math.max(1.2, r * 0.22), 0, 6.2832);
        c.fill();
      } else if (locked) {
        // Hors d'atteinte : un anneau gris, fermé sur un grain
        c.strokeStyle = rgba([150, 200, 175], 0.75 * born);
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(n.x, n.y, r, 0, 6.2832);
        c.stroke();
        c.fillStyle = rgba([150, 200, 175], 0.6 * born);
        c.beginPath();
        c.arc(n.x, n.y, Math.max(1.1, r * 0.3), 0, 6.2832);
        c.fill();
      } else {
        c.fillStyle = rgba(mix(col, [255, 255, 255], 0.35 + 0.4 * p), (test ? 0.85 : 1) * born);
        c.beginPath();
        c.arc(n.x, n.y, r, 0, 6.2832);
        c.fill();
        if (n.threat === "test") {
          // Non classée : un cercle en pointillés, qui tourne
          c.setLineDash([3, 4]);
          c.lineDashOffset = -this.t * 6;
          c.strokeStyle = rgba(col, 0.7 * born);
          c.lineWidth = 1;
          c.beginPath();
          c.arc(n.x, n.y, r * 2.6, 0, 6.2832);
          c.stroke();
          c.setLineDash([]);
        } else {
          // Classée et ouverte : l'onde du battement s'éloigne, deux fois
          const ph = ((this.t * n.bpm) / 60 + n.seed) % 1;
          for (const off of [0, 0.5]) {
            const q = (ph + off) % 1;
            c.strokeStyle = rgba(col, 0.6 * (1 - q) * born);
            c.lineWidth = 1.2;
            c.beginPath();
            c.arc(n.x, n.y, n.r * (1.3 + 2.6 * q), 0, 6.2832);
            c.stroke();
          }
        }
      }
    }
    // Le viseur du foyer observé : quatre crochets qui tournent lentement
    if (cur) {
      const k = smooth(this.selT / 0.22);
      const R = cur.r * 3.1 + 10 * (1 - k);
      const col = cur.state === "locked" ? ETEINT : THREAT_RGB[cur.threat];
      c.strokeStyle = rgba(mix(col, [255, 255, 255], 0.4), 0.95 * k);
      c.lineWidth = 1.6;
      for (let q = 0; q < 4; q++) {
        const a = q * 1.5708 + this.t * 0.5;
        c.beginPath();
        c.arc(cur.x, cur.y, R, a + 0.28, a + 1.29);
        c.stroke();
      }
    }
    c.restore();
  }

  /** Le fil qui relie le foyer observé à sa fiche. */
  private drawLeader(c: CanvasRenderingContext2D, n: MapNode) {
    const k = smooth(this.selT / 0.3);
    const o = this.root.getBoundingClientRect(), r = this.card.getBoundingClientRect();
    const tx = r.left - o.left, ty = r.top - o.top + 30;
    if (tx < n.x + 40) return; // fenêtre étroite : la fiche passe dessous, pas de fil
    const x0 = n.x + n.r * 3.3, y0 = n.y;
    const elbow = Math.min(tx - 34, Math.max(x0 + 30, tx - 90));
    const pts: [number, number][] = [[x0, y0], [elbow, y0], [tx - 14, ty], [tx, ty]];
    let total = 0;
    const seg: number[] = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    const at = (s: number): [number, number] => {
      let d = s * total;
      for (let i = 0; i < seg.length; i++) {
        if (d <= seg[i] || i === seg.length - 1) {
          const f = seg[i] > 0 ? Math.min(1, d / seg[i]) : 0;
          return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
        }
        d -= seg[i];
      }
      return pts[pts.length - 1];
    };
    const col = n.state === "locked" ? ETEINT : THREAT_RGB[n.threat];
    c.save();
    c.strokeStyle = rgba(col, 0.55);
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= 40; i++) { const [x, y] = at((i / 40) * k); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
    const [gx, gy] = at(((this.t * 0.45) % 1) * k);
    c.fillStyle = rgba(mix(col, [255, 255, 255], 0.6), 0.9 * k);
    c.beginPath();
    c.arc(gx, gy, 2, 0, 6.2832);
    c.fill();
    c.restore();
  }

  /**
   * Le portrait : une forme vivante tirée des mesures du morceau. L'agitation
   * donne le nombre de lobes, la clarté les rend ronds ou piquants, l'intensité
   * la taille, la durée le nombre de noyaux ; elle bat à son tempo.
   */
  private drawPortrait() {
    const c = this.pctx;
    const S = this.portrait.width;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, S, S);
    const n = this.sel >= 0 && this.sel < this.nodes.length ? this.nodes[this.sel] : null;
    if (!n) return;
    const cx = S / 2, cy = S / 2, t = this.t;
    if (n.state === "locked") {
      // Rien à voir : de la neige, et une question
      const r = rng((Math.floor(t * 12) % 97) / 97 + 0.013);
      for (let i = 0; i < 90; i++) {
        c.fillStyle = `rgba(120,170,145,${0.08 + 0.2 * r()})`;
        c.fillRect(r() * S, r() * S, 2 + r() * 5, 1.5);
      }
      c.fillStyle = "rgba(150,200,175,0.75)";
      c.font = `${Math.round(S * 0.42)}px "Courier New", monospace`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("?", cx, cy + S * 0.02);
      return;
    }
    const col = THREAT_RGB[n.threat];
    const p = this.beat(n.bpm, n.seed);
    const r = rng(n.seed);
    const lobes = 5 + Math.round(n.busy * 6);
    const spike = 0.1 + 0.34 * n.bright;
    const sharp = 0.8 + 3.2 * n.bright;
    const R = S * (0.17 + 0.09 * n.intensity) * (1 + 0.07 * p);
    const phi = r() * 6.28;
    const lop = 0.1 + 0.14 * r(); // chaque souche est un peu de travers, à sa façon
    const lopA = r() * 6.28;
    const flag = n.bright < 0.45 ? 2 + Math.floor(r() * 3) : Math.floor(r() * 2);
    const rad = (a: number) =>
      R * (1 + spike * Math.pow(Math.abs(Math.cos((lobes * (a + phi)) / 2 + 0.25 * Math.sin(t * 0.7))), sharp)
        + lop * Math.cos(a - lopA) + 0.035 * Math.sin(3 * a + t * 1.3));
    c.globalCompositeOperation = "lighter";
    // Les flagelles, derrière
    for (let k = 0; k < flag; k++) {
      const a0 = 1.5708 + (k - (flag - 1) / 2) * 0.5;
      c.beginPath();
      for (let i = 0; i <= 22; i++) {
        const s = i / 22;
        const d = rad(a0) * 0.9 + s * S * 0.26;
        const a = a0 + Math.sin(t * 2.2 + k * 1.7 + s * 6) * 0.16 * s;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = rgba(col, 0.4);
      c.lineWidth = S * 0.012;
      c.stroke();
    }
    // Le halo
    const gh = c.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.3);
    gh.addColorStop(0, rgba(col, 0.2 + 0.2 * p));
    gh.addColorStop(1, rgba(col, 0));
    c.fillStyle = gh;
    c.fillRect(0, 0, S, S);
    // Le corps
    c.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * 6.2832;
      const d = rad(a);
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
    const gb = c.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R * 1.5);
    gb.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.5), 0.5));
    gb.addColorStop(0.6, rgba(col, 0.2));
    gb.addColorStop(1, rgba(col, 0.06));
    c.fillStyle = gb;
    c.fill();
    c.strokeStyle = rgba(mix(col, [255, 255, 255], 0.3), 0.95);
    c.lineWidth = S * 0.011;
    c.stroke();
    // Les noyaux : un par deux minutes de morceau
    const noyaux = 1 + Math.floor((n.track.measures ?? DEFAUT).seconds / 120);
    for (let k = 0; k < noyaux; k++) {
      const a = r() * 6.28 + t * (0.15 + 0.1 * r()) * (k % 2 ? 1 : -1);
      const d = R * (0.12 + 0.34 * r());
      const nr = R * (0.1 + 0.08 * r()) * (1 + 0.25 * p);
      c.fillStyle = rgba(mix(col, [255, 255, 255], 0.65), 0.75);
      c.beginPath();
      c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, nr, 0, 6.2832);
      c.fill();
    }
    // Non classée : un pointillé autour, comme sur la carte
    if (n.threat === "test") {
      c.setLineDash([S * 0.03, S * 0.035]);
      c.lineDashOffset = -t * S * 0.05;
      c.strokeStyle = rgba(col, 0.5);
      c.lineWidth = S * 0.008;
      c.beginPath();
      c.arc(cx, cy, S * 0.44, 0, 6.2832);
      c.stroke();
      c.setLineDash([]);
    }
    c.globalCompositeOperation = "source-over";
  }
}
