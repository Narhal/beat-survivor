// L'écran titre organique (direction B, N4 2026-08-01) : les entrées de menu
// sont des VÉSICULES en orbite autour du spécimen observé, reliées à lui par
// des filaments. Elles pulsent sur la boucle de menu — la pulsation est
// pilotée par l'analyse audio réelle, donc n'importe quelle boucle marche.

export interface Vesicle {
  el: HTMLElement;
  angle: number; // position sur l'orbite (radians)
  radius: number; // 0..1, fraction du conteneur
  phase: number;
}

export class Organism {
  vesicles: Vesicle[] = [];
  /** Index sélectionné — piloté par la navigation. */
  selected = 0;
  private root: HTMLElement;
  private svg: SVGSVGElement;
  private t = 0;

  constructor(root: HTMLElement, svg: SVGSVGElement) {
    this.root = root;
    this.svg = svg;
  }

  /** (Re)construit la grappe à partir des boutons présents. */
  setEntries(els: HTMLElement[]) {
    this.svg.innerHTML = "";
    this.vesicles = els.map((el, i) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      this.svg.appendChild(path);
      el.dataset.filament = String(i);
      return {
        el,
        // Réparties sur une orbite, en partant du haut
        angle: -Math.PI / 2 + (i / els.length) * Math.PI * 2,
        radius: 0.42,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }

  /**
   * @param dt    secondes
   * @param beat  0..1 — enveloppe de basse de la boucle de menu
   * @param sel   index sélectionné
   */
  update(dt: number, beat: number, sel: number) {
    this.t += dt;
    this.selected = sel;
    // Pas de rotation libre : la vésicule choisie doit TOUJOURS venir au même
    // point d'ancrage (en bas, là où l'œil se pose). La vie vient de la
    // respiration individuelle, pas d'une dérive qui déplacerait le repère.
    const n = this.vesicles.length;
    if (n === 0) return;

    const paths = this.svg.querySelectorAll("path");
    for (let i = 0; i < n; i++) {
      const v = this.vesicles[i];
      const isSel = i === sel;
      // Angle cible : la sélection tourne la grappe pour l'amener en bas
      const target = -Math.PI / 2 + ((i - sel) / n) * Math.PI * 2 + Math.PI;
      let diff = target - v.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      v.angle += diff * Math.min(1, dt * 6);

      // La POSITION reste stable — le battement ne doit jamais faire trembler
      // un menu (verdict N4) : il vit dans l'échelle et la lueur, pas dans
      // les coordonnées.
      const r = v.radius + (isSel ? 0.035 : 0);
      const x = 50 + Math.cos(v.angle) * r * 100;
      const y = 50 + Math.sin(v.angle) * r * 100;
      v.el.style.left = `${x}%`;
      v.el.style.top = `${y}%`;
      const pulse = 1 + Math.sin(this.t * 1.4 + v.phase) * 0.012 + beat * (isSel ? 0.07 : 0.035);
      v.el.style.setProperty("--pulse", pulse.toFixed(3));
      v.el.style.setProperty("--glow", (beat * (isSel ? 1 : 0.6)).toFixed(3));

      // Renvoi technique (N4) : deux segments DROITS, un seul coude, comme
      // les lignes d'annotation des HUD scientifiques — la diagonale part du
      // centre, le palier horizontal rejoint l'étiquette.
      const path = paths[i];
      if (path) {
        const lead = 9; // longueur du palier horizontal
        const side = x >= 50 ? -1 : 1; // le palier arrive par l'intérieur
        const kx = x + lead * side;
        path.setAttribute("d", `M50 50 L${kx.toFixed(2)} ${y.toFixed(2)} L${x.toFixed(2)} ${y.toFixed(2)}`);
        path.classList.toggle("sel", isSel);
      }
    }
  }
}
