// Le build : armes, atouts, passifs — en tir/effet automatique, le joueur
// conduit. Découplé de la musique par décision de N4 (2026-07-26) : la musique
// = la menace, le build = le joueur. Choix parmi 3 cartes à chaque jauge
// pleine (réf. Geometry Survivor). Trois catégories (N4, 2026-07-26) :
// Arme (attaque), Atout (survie active), Passif (bonus permanents).

import * as THREE from "three";
import { Enemies, Enemy } from "./enemies";
import { Ship } from "./ship";

export type UpgradeCategory = "Arme" | "Atout" | "Passif";
// L'Apoptose a quitté les cartes de run : ses charges s'achètent désormais
// en Pharmacie (décision N4 2026-08-02).
export type UpgradeKind =
  | "blaster" | "eventail" | "orbes" | "onde" | "tentacule" | "mine" | "arc"
  | "lance" | "bourgeon" // armes
  | "flagelles" | "membrane" | "viscosite" // atouts
  | "mitose" | "enzymes" | "phagocytose"; // passifs

export const UPGRADE_INFO: Record<UpgradeKind, { name: string; desc: string; cat: UpgradeCategory }> = {
  blaster: { name: "Anticorps", desc: "Ton tir de base : vise seul le pathogène le plus proche.", cat: "Arme" },
  eventail: { name: "Éventail", desc: "Gerbe de projectiles vers l'arrière.", cat: "Arme" },
  mine: { name: "Mine", desc: "Sème trois mines qui explosent à l'approche des pathogènes.", cat: "Arme" },
  lance: { name: "Lance", desc: "Un dard part au hasard et transperce tout sur sa route.", cat: "Arme" },
  bourgeon: { name: "Bourgeon", desc: "Un bourgeon papillonne autour de toi et tire de son côté.", cat: "Arme" },
  arc: { name: "Arc voltaïque", desc: "Un cône électrique foudroie tout devant toi.", cat: "Arme" },
  orbes: { name: "Orbes", desc: "Satellites en orbite, dégâts de contact.", cat: "Arme" },
  onde: { name: "Onde de choc", desc: "Anneau périodique qui balaie autour de toi.", cat: "Arme" },
  tentacule: { name: "Filament", desc: "Un filament urticant traîne derrière toi. Jusqu'à 3.", cat: "Arme" },
  flagelles: { name: "Flagelles", desc: "Vitesse de nage augmentée.", cat: "Atout" },
  membrane: { name: "Membrane", desc: "Absorbe un coup, puis se recharge — de plus en plus vite par palier.", cat: "Atout" },
  viscosite: { name: "Viscosité", desc: "Par vagues, l'eau s'épaissit autour de toi et ralentit les pathogènes.", cat: "Atout" },
  mitose: { name: "Mitose", desc: "Régulièrement, un pathogène détruit laisse un cœur.", cat: "Passif" },
  enzymes: { name: "Enzymes", desc: "+15 % de dégâts pour toutes les armes.", cat: "Passif" },
  phagocytose: { name: "Phagocytose", desc: "Augmente la distance d'aspiration des protéines.", cat: "Passif" },
};

const MAX_LEVEL = 5;
// Filament TRÈS fin (N4) : beaucoup de perles minuscules = sensation de
// filament, pas de queue. L'hitbox est découplée du visuel pour ne pas
// affaiblir l'arme.
const FILAMENT_SEGS = 22;
const FILAMENT_HIT_R = 0.5;
/** Nombre maximum d'ARMES simultanées : il faut faire des choix (N4). */
const MAX_WEAPONS = 5;
/** Période de la Viscosité : l'eau s'épaissit une fois toutes les 12 s. */
const VISC_CYCLE = 12;
/** Montée et retombée du champ — l'eau ne s'épaissit pas d'un coup sec. */
const VISC_FADE_IN = 0.35;
const VISC_FADE_OUT = 0.7;

// Le Filament va plus loin : 7 paliers (longueur, dégâts, jusqu'à 3 filaments).
export function maxLevelOf(kind: UpgradeKind): number {
  return kind === "tentacule" ? 7 : MAX_LEVEL;
}

interface Projectile {
  pos: THREE.Vector2;
  vel: THREE.Vector2;
  life: number;
  dmg: number;
  mesh: THREE.Mesh;
  /** La Lance ne meurt pas au premier contact : elle traverse. */
  pierce?: boolean;
  /** Ce qu'elle a déjà touché — sans ça elle frapperait la même cible 60×/s. */
  hit?: Set<Enemy>;
}

interface Shockwave {
  radius: number;
  maxRadius: number;
  dmg: number;
  hitSet: Set<Enemy>;
  mesh: THREE.Mesh;
}

export interface KillEvent {
  enemy: Enemy;
}

export class Weapons {
  levels = new Map<UpgradeKind, number>();
  /** Bouclier : chargé = le prochain coup est absorbé. */
  shieldCharged = false;
  // Bonus permanents de la Pharmacie (réassignés par main à chaque run)
  metaDamageMul = 1;
  metaMagnet = 0;
  bonusNukes = 0;
  /** Saccade (Pharmacie, décision N4 2026-07-29) : le dash est un acquis de pilote. */
  saccadeLevel = 0;
  /** Vrai sur les frames où un beat de basse tombe (poussé par main). */
  beatNow = false;
  private ondeWait = 0;
  private shieldTimer = 0;

  private scene: THREE.Scene;
  private cooldowns = new Map<UpgradeKind, number>();
  private projectiles: Projectile[] = [];
  private waves: Shockwave[] = [];
  private orbMeshes: THREE.Mesh[] = [];
  private orbAngle = 0;
  private tentacleMeshes: THREE.Mesh[] = [];
  private filaments: THREE.Vector2[][] = [];
  private mines: { pos: THREE.Vector2; mesh: THREE.Mesh; age: number }[] = [];
  private explosions: { mesh: THREE.Mesh; life: number; max: number }[] = [];
  private boltLines: THREE.Mesh[] = [];
  private arcTimer = 0;
  private arcParams = { len: 0, half: 0, bolts: 3 };
  private shieldMesh: THREE.Mesh;
  private time = 0;
  /** Viscosité : la lentille d'eau épaissie autour de la cellule. */
  private lensMesh: THREE.Mesh;
  private lensMat: THREE.ShaderMaterial;
  /** Secondes restantes de champ actif (0 = l'eau est redevenue fluide). */
  private viscTimer = 0;
  /** Bourgeon : le compagnon et sa danse autour du joueur. */
  private budMesh: THREE.Mesh | null = null;
  private budPos = new THREE.Vector2();
  private budPhase = Math.random() * Math.PI * 2;

  private projGeo = new THREE.CircleGeometry(0.55, 8);
  private projMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
  /** La Lance en vert néon (N4) : on doit la distinguer du tir de base. */
  private lanceMat = new THREE.MeshBasicMaterial({ color: 0x39ff6e });
  private waveGeo = new THREE.RingGeometry(0.92, 1, 48);
  private orbGeo = new THREE.CircleGeometry(1.15, 12);
  private orbMat = new THREE.MeshBasicMaterial({ color: 0x8effc0 });
  private tentGeo = new THREE.CircleGeometry(1, 10);
  private tentMat = new THREE.MeshBasicMaterial({ color: 0x66f0d8 });
  private budGeo = new THREE.CircleGeometry(0.95, 14);
  private budMat = new THREE.MeshBasicMaterial({ color: 0xbdffe6 });
  private mineGeo = new THREE.CircleGeometry(0.8, 12);
  private mineMat = new THREE.MeshBasicMaterial({ color: 0xffc36e });
  private projPool: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.levels.set("blaster", 1);
    this.shieldMesh = new THREE.Mesh(
      new THREE.RingGeometry(3.0, 3.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.55 })
    );
    this.shieldMesh.visible = false;
    scene.add(this.shieldMesh);

    // ---- La lentille de Viscosité ----
    // Une lentille ne se voit PAS par son intérieur : elle se voit par son
    // bord, là où la lumière rase le verre. D'où un liseré fin et net,
    // doublé d'une frange chromatique décalée vers l'extérieur (l'eau ne
    // dévie pas toutes les longueurs d'onde pareil), et un intérieur presque
    // vide. C'est le contraire d'un halo : rien au centre, tout au bord.
    this.lensMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uStrength: { value: 1 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime, uStrength;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          float a = atan(p.y, p.x);
          // Le volume d'eau respire : le bord ondule lentement, sans jamais
          // déplacer la zone utile (le gameplay ne doit pas mentir)
          float wob = 1.0 + 0.012 * sin(a * 5.0 + uTime * 0.9) + 0.008 * sin(a * 9.0 - uTime * 1.4);
          float rr = r / wob;
          // Liseré principal : net, fin
          float rim = smoothstep(0.90, 0.985, rr) * (1.0 - smoothstep(0.985, 1.0, rr));
          // Frange chromatique, un cheveu plus à l'intérieur
          float fringe = smoothstep(0.84, 0.93, rr) * (1.0 - smoothstep(0.93, 0.975, rr));
          // Intérieur : un souffle, pas un voile — 4 % suffisent à dire « dedans »
          float inner = smoothstep(1.0, 0.15, rr) * 0.04;
          vec3 col = vec3(0.42, 0.86, 1.00) * rim
                   + vec3(0.78, 0.42, 1.00) * fringe * 0.30
                   + vec3(0.30, 0.62, 0.85) * inner;
          float alpha = (rim * 0.9 + fringe * 0.28 + inner) * uStrength;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.lensMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.lensMat);
    this.lensMesh.position.z = 0.6; // sous le gameplay : la lentille est le milieu
    this.lensMesh.visible = false;
    scene.add(this.lensMesh);
  }

  /** Rayon du champ de Viscosité — il s'élargit à chaque palier. */
  get viscosityRadius(): number {
    const lvl = this.levels.get("viscosite") ?? 0;
    return lvl > 0 ? 15 + lvl * 3.5 : 0;
  }

  /** Facteur de temps des ennemis dans le champ (0,46 → 0,30 au palier 5). */
  get viscosityFactor(): number {
    const lvl = this.levels.get("viscosite") ?? 0;
    return 1 - Math.min(0.7, 0.54 + (lvl - 1) * 0.04);
  }

  /**
   * Durée d'une prise (N4 2026-08-28) : la Viscosité ne peut pas tenir toute
   * la run, sinon ce n'est plus un abri, c'est une règle du jeu. Même logique
   * que l'arc voltaïque — ça monte, ça tient, ça s'en va, ça revient. Les
   * paliers allongent l'abri sans toucher au délai : de 4,2 s toutes les
   * 12 s (35 % du temps) à 7 s toutes les 12 s (58 %).
   */
  get viscosityDuration(): number {
    const lvl = this.levels.get("viscosite") ?? 0;
    return 3.5 + lvl * 0.7;
  }

  reset() {
    this.levels.clear();
    this.levels.set("blaster", 1);
    this.cooldowns.clear();
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const w of this.waves) this.scene.remove(w.mesh);
    this.waves = [];
    this.shieldCharged = false;
    this.shieldTimer = 0;
    for (const mn of this.mines) this.scene.remove(mn.mesh);
    this.mines = [];
    for (const ex of this.explosions) this.scene.remove(ex.mesh);
    this.explosions = [];
    this.clearBolts();
    this.arcTimer = 0;
    this.viscTimer = 0;
    this.lensMesh.visible = false;
    if (this.budMesh) this.budMesh.visible = false;
    this.syncOrbs();
    this.syncTentacle();
  }

  /** Multiplicateur de dégâts global (passif Enzymes × Pharmacie). */
  get damageMul(): number {
    return (1 + 0.15 * (this.levels.get("enzymes") ?? 0)) * this.metaDamageMul;
  }

  /** Bonus de vitesse du vaisseau (atout Flagelles). */
  get speedBonus(): number {
    return 1 + 0.06 * (this.levels.get("flagelles") ?? 0);
  }

  /** Seuil de kills du passif Mitose (0 = inactif). */
  get mitoseThreshold(): number {
    const lvl = this.levels.get("mitose") ?? 0;
    return lvl > 0 ? Math.max(10, 45 - 8 * (lvl - 1)) : 0;
  }

  /** Rayon d'attraction des protéines (passif Phagocytose + Pharmacie). */
  get magnetRadius(): number {
    return 6 + 4 * (this.levels.get("phagocytose") ?? 0) + this.metaMagnet;
  }

  /** Récupération du dash — la Saccade (Pharmacie) le rend plus prompt. */
  get dashCooldown(): number {
    return 2.4 * (1 - 0.09 * this.saccadeLevel);
  }

  /** Palier 3 de la Saccade : invulnérable pendant le dash. */
  get dashInvuln(): boolean {
    return this.saccadeLevel >= 3;
  }

  /** Palier 5 de la Saccade : le dash blesse sur son passage. */
  get dashDamage(): number {
    return this.saccadeLevel >= 5 ? 2 * this.damageMul : 0;
  }

  /** Déclenche l'Apoptose : uniquement sur les charges de la Pharmacie. */
  fireNuke(): boolean {
    if (this.bonusNukes > 0) {
      this.bonusNukes--;
      return true;
    }
    return false;
  }

  /** Tente d'absorber un coup avec la membrane. Retourne true si absorbé. */
  absorbHit(): boolean {
    if ((this.levels.get("membrane") ?? 0) > 0 && this.shieldCharged) {
      this.shieldCharged = false;
      const lvl = this.levels.get("membrane") ?? 1;
      this.shieldTimer = 22 * Math.pow(0.75, lvl - 1); // recharge de plus en plus vite
      return true;
    }
    return false;
  }

  /**
   * Les 3 cartes du level-up. Règles (N4 2026-07-29) :
   * - maximum 5 armes possédées → plus de nouvelles armes proposées au-delà ;
   * - tirage pondéré : ce qu'on possède déjà revient 3× plus souvent
   *   (on construit un build, on ne papillonne pas).
   */
  drawCards(): { kind: UpgradeKind; level: number }[] {
    const weaponsOwned = [...this.levels.keys()].filter((k) => UPGRADE_INFO[k].cat === "Arme").length;
    const options: { kind: UpgradeKind; level: number; weight: number }[] = [];
    for (const kind of Object.keys(UPGRADE_INFO) as UpgradeKind[]) {
      const lvl = this.levels.get(kind) ?? 0;
      if (lvl >= maxLevelOf(kind)) continue;
      const isNewWeapon = lvl === 0 && UPGRADE_INFO[kind].cat === "Arme";
      if (isNewWeapon && weaponsOwned >= MAX_WEAPONS) continue;
      options.push({ kind, level: lvl + 1, weight: lvl > 0 ? 3 : 1 });
    }
    const out: { kind: UpgradeKind; level: number }[] = [];
    while (out.length < 3 && options.length > 0) {
      const total = options.reduce((s, o) => s + o.weight, 0);
      let roll = Math.random() * total;
      let idx = 0;
      while (idx < options.length - 1 && (roll -= options[idx].weight) > 0) idx++;
      const picked = options.splice(idx, 1)[0];
      out.push({ kind: picked.kind, level: picked.level });
    }
    return out;
  }

  pick(kind: UpgradeKind) {
    this.levels.set(kind, (this.levels.get(kind) ?? 0) + 1);
    if (kind === "membrane" && (this.levels.get("membrane") ?? 0) === 1) {
      this.shieldCharged = true; // premier palier : bouclier chargé d'office
    }
    if (kind === "orbes") this.syncOrbs();
    // Les filaments se reconstruisent d'eux-mêmes quand leur nombre change
  }

  update(dt: number, ship: Ship, enemies: Enemies, onKill: (e: KillEvent) => void) {
    this.time += dt;
    const mul = this.damageMul;

    // Recharge de la membrane
    if ((this.levels.get("membrane") ?? 0) > 0 && !this.shieldCharged) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shieldCharged = true;
    }

    this.shieldMesh.visible = this.shieldCharged;
    if (this.shieldMesh.visible) {
      this.shieldMesh.position.set(ship.pos.x, ship.pos.y, 1.9);
      this.shieldMesh.rotation.z = this.time * 0.8;
    }

    // ---- Viscosité : une PRISE, pas un état permanent ----
    // L'eau s'épaissit, tient quelques secondes, se redilue — puis recommence.
    // La montée et la retombée passent par uStrength ET par le rayon : un
    // abri qui apparaît d'un coup ne se lit pas, un abri qui s'installe si.
    const viscR = this.viscosityRadius;
    if (this.viscTimer > 0 && viscR > 0) {
      this.viscTimer -= dt;
      const total = this.viscosityDuration;
      const ecoule = total - this.viscTimer;
      const monte = Math.min(1, ecoule / VISC_FADE_IN);
      const retombe = Math.min(1, Math.max(0, this.viscTimer) / VISC_FADE_OUT);
      const k = Math.min(monte, retombe);
      const r = viscR * (0.75 + 0.25 * k); // il s'ouvre en s'installant
      this.lensMesh.visible = true;
      this.lensMesh.position.set(ship.pos.x, ship.pos.y, 0.6);
      this.lensMesh.scale.setScalar(r);
      this.lensMat.uniforms.uTime.value = this.time;
      this.lensMat.uniforms.uStrength.value = k;
      // La zone suit EXACTEMENT ce qu'on voit : le gameplay ne ment pas.
      // Le ralentissement monte et retombe avec elle.
      enemies.slowZone = {
        pos: ship.pos,
        radius: r,
        factor: 1 - (1 - this.viscosityFactor) * k,
      };
    } else {
      this.viscTimer = 0;
      this.lensMesh.visible = false;
      enemies.slowZone = null;
    }

    // ---- Bourgeon : le compagnon papillonne et tire pour son compte ----
    const budLvl = this.levels.get("bourgeon") ?? 0;
    if (budLvl > 0) {
      if (!this.budMesh) {
        this.budMesh = new THREE.Mesh(this.budGeo, this.budMat);
        this.scene.add(this.budMesh);
        this.budPos.copy(ship.pos);
      }
      this.budMesh.visible = true;
      // Vol de papillon : deux sinusoïdes décalées, jamais une orbite propre.
      // Et il POURSUIT sa cible molle plutôt que d'y être collé — c'est ce
      // retard qui fait vivant.
      this.budPhase += dt * 1.7;
      const target = new THREE.Vector2(
        ship.pos.x + Math.cos(this.budPhase) * 6.5 + Math.sin(this.budPhase * 2.3) * 2.2,
        ship.pos.y + Math.sin(this.budPhase * 1.4) * 5.5 + Math.cos(this.budPhase * 3.1) * 1.8
      );
      this.budPos.lerp(target, 1 - Math.exp(-dt * 4.5));
      this.budMesh.position.set(this.budPos.x, this.budPos.y, 1.6);
      this.budMesh.scale.setScalar(0.85 + 0.15 * Math.sin(this.time * 6));

      // Il naît déjà bien armé, puis gagne en cadence ET en dégâts (N4)
      const budCd = (this.cooldowns.get("bourgeon") ?? 0) - dt;
      if (budCd <= 0) {
        const target2 = this.nearest(this.budPos, enemies);
        if (target2) {
          const dir = new THREE.Vector2().subVectors(target2.pos, this.budPos).normalize();
          this.fire(this.budPos, dir, 70, (3 + budLvl * 1.4) * mul);
          this.cooldowns.set("bourgeon", 0.62 / (1 + (budLvl - 1) * 0.34));
        } else {
          this.cooldowns.set("bourgeon", 0.1); // rien en vue : on regarde souvent
        }
      } else {
        this.cooldowns.set("bourgeon", budCd);
      }
    } else if (this.budMesh) {
      this.budMesh.visible = false;
    }

    for (const [kind, lvl] of this.levels) {
      // Le Bourgeon a déjà été servi plus haut avec sa propre horloge : le
      // laisser passer ici décrémenterait son cooldown une seconde fois.
      if (kind === "bourgeon") continue;
      const cd = (this.cooldowns.get(kind) ?? 0) - dt;
      if (cd > 0) {
        this.cooldowns.set(kind, cd);
        continue;
      }
      switch (kind) {
        case "blaster": {
          const target = this.nearest(ship.pos, enemies);
          if (target) {
            const dir = new THREE.Vector2().subVectors(target.pos, ship.pos).normalize();
            this.fire(ship.pos, dir, 65, (1 + Math.floor(lvl / 2)) * mul);
            this.cooldowns.set(kind, 0.5 / (1 + (lvl - 1) * 0.35));
          }
          break;
        }
        case "eventail": {
          // Tire vers l'ARRIÈRE (N4 2026-07-30) : l'éventail couvre la fuite
          const heading = Math.atan2(ship.lastDir.y, ship.lastDir.x) + Math.PI;
          const n = 3 + lvl;
          const spread = Math.PI / 5;
          for (let i = 0; i < n; i++) {
            const a = heading - spread / 2 + (spread * i) / (n - 1);
            this.fire(ship.pos, new THREE.Vector2(Math.cos(a), Math.sin(a)), 55, 1 * mul);
          }
          this.cooldowns.set(kind, 1.15 / (1 + (lvl - 1) * 0.25));
          break;
        }
        case "onde": {
          // Recharge finie → l'onde part SUR le prochain beat de basse
          // (N4 : alignement musical sans changer la cadence des paliers) ;
          // repli à 0,6 s si la musique ne bat pas
          if (!this.beatNow && this.ondeWait < 0.6) {
            this.ondeWait += dt;
            break;
          }
          this.ondeWait = 0;
          const wave: Shockwave = {
            radius: 2,
            maxRadius: 14 + lvl * 4,
            dmg: (2 + Math.floor(lvl / 2)) * mul,
            hitSet: new Set(),
            mesh: new THREE.Mesh(
              this.waveGeo,
              new THREE.MeshBasicMaterial({ color: 0x35e8ff, transparent: true, opacity: 0.8 })
            ),
          };
          wave.mesh.position.set(ship.pos.x, ship.pos.y, 1.5);
          this.scene.add(wave.mesh);
          this.waves.push(wave);
          this.cooldowns.set(kind, 2.4 / (1 + (lvl - 1) * 0.2));
          break;
        }
        case "mine": {
          // TROIS mines écartées au lieu d'une (N4 2026-08-28) : on sème un
          // champ, pas un point. Elles se posent en triangle derrière la
          // cellule, assez loin les unes des autres pour couvrir un passage.
          const heading = Math.atan2(ship.lastDir.y, ship.lastDir.x);
          for (let k = 0; k < 3; k++) {
            const a = heading + Math.PI + (k - 1) * 0.9;
            const d = 4.5 + Math.abs(k - 1) * 1.5;
            const pos = new THREE.Vector2(
              ship.pos.x + Math.cos(a) * d,
              ship.pos.y + Math.sin(a) * d
            );
            const mesh = new THREE.Mesh(this.mineGeo, this.mineMat);
            mesh.position.set(pos.x, pos.y, 0.8);
            this.scene.add(mesh);
            this.mines.push({ pos, mesh, age: 0 });
          }
          this.cooldowns.set(kind, 3.5 / (1 + (lvl - 1) * 0.22));
          break;
        }
        case "lance": {
          // Un dard lancé AU HASARD qui transperce tout (N4) : on ne vise
          // pas, on couvre — et il ne s'arrête à personne.
          const a = Math.random() * Math.PI * 2;
          const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
          this.firePierce(ship.pos, dir, 78, (3 + lvl * 1.6) * mul);
          this.cooldowns.set(kind, 1.5 / (1 + (lvl - 1) * 0.3));
          break;
        }
        case "viscosite": {
          this.viscTimer = this.viscosityDuration;
          this.cooldowns.set(kind, VISC_CYCLE);
          break;
        }
        case "arc": {
          // Progression voulue par N4 : au palier 1 une décharge quasi
          // rectiligne, peu fournie mais LONGUE et tenue ; aux derniers,
          // un large éventail. Le nombre d'éclairs compense l'ouverture.
          const len = 24 + lvl * 2.5;
          const half = 0.1 + lvl * 0.1;
          this.arcParams = { len, half, bolts: Math.round(1 + lvl * 1.6) };
          this.arcTimer = 1.15 + lvl * 0.18;
          this.cooldowns.set(kind, 6.5);
          break;
        }
        default:
          break; // orbes, tentacule, bourgeon et les non-armes sont gérés plus bas
      }
    }

    // Mines : armement, détection de proximité, explosion en AoE
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mn = this.mines[i];
      mn.age += dt;
      mn.mesh.scale.setScalar(1 + 0.15 * Math.sin(mn.age * 8));
      let boom = mn.age > 6; // au bout du compte, elle saute seule
      if (!boom && mn.age > 0.4) {
        for (const e of enemies.list) {
          if (e.pos.distanceTo(mn.pos) < 3.6) {
            boom = true;
            break;
          }
        }
      }
      if (boom) {
        const mineLvl = this.levels.get("mine") ?? 1;
        // Le rayon doit VRAIMENT monter avec les paliers (N4). La pente
        // passe de 1,5 à 3,5 par palier : +42 % de portée au palier 1,
        // +77 % au palier 5 (9,5 → 13,5 et 15,5 → 27,5). Pour l'échelle :
        // l'Apoptose couvre 57,6 — trois mines à 27,5 restent un champ, pas
        // une purge d'arène. Dégâts +25 % au passage.
        const radius = 10 + mineLvl * 3.5;
        const mineDmg = (5 + mineLvl * 2) * 1.25 * mul;
        for (let j = enemies.list.length - 1; j >= 0; j--) {
          const e = enemies.list[j];
          if (e.pos.distanceTo(mn.pos) < radius) {
            e.hp -= mineDmg;
            if (e.hp <= 0) {
              onKill({ enemy: e });
              enemies.remove(j);
            }
          }
        }
        const ring = new THREE.Mesh(
          this.waveGeo,
          new THREE.MeshBasicMaterial({ color: 0xffc36e, transparent: true, opacity: 0.85 })
        );
        ring.position.set(mn.pos.x, mn.pos.y, 1.5);
        this.scene.add(ring);
        this.explosions.push({ mesh: ring, life: 0.35, max: radius });
        this.scene.remove(mn.mesh);
        this.mines.splice(i, 1);
      }
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= dt;
      const k = 1 - ex.life / 0.35;
      ex.mesh.scale.setScalar(Math.max(0.01, ex.max * k));
      (ex.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
      if (ex.life <= 0) {
        this.scene.remove(ex.mesh);
        (ex.mesh.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
      }
    }

    // Arc voltaïque actif : de vraies décharges redessinées à chaque frame
    if (this.arcTimer > 0) {
      this.arcTimer -= dt;
      const heading = Math.atan2(ship.lastDir.y, ship.lastDir.x);
      const { len, half, bolts } = this.arcParams;
      this.drawBolts(ship.pos, heading, len, half, bolts);
      for (let j = enemies.list.length - 1; j >= 0; j--) {
        const e = enemies.list[j];
        const to = new THREE.Vector2().subVectors(e.pos, ship.pos);
        const d = to.length();
        if (d < len + e.radius) {
          let ang = Math.atan2(to.y, to.x) - heading;
          while (ang > Math.PI) ang -= Math.PI * 2;
          while (ang < -Math.PI) ang += Math.PI * 2;
          if (Math.abs(ang) < half) {
            e.hp = 0; // le cône oneshot (N4)
            onKill({ enemy: e });
            enemies.remove(j);
          }
        }
      }
      if (this.arcTimer <= 0) this.clearBolts();
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.pos.addScaledVector(p.vel, dt);
      p.life -= dt;
      p.mesh.position.set(p.pos.x, p.pos.y, 1.5);
      let dead = p.life <= 0;
      if (!dead) {
        for (let j = enemies.list.length - 1; j >= 0; j--) {
          const e = enemies.list[j];
          if (p.pos.distanceTo(e.pos) < e.radius + 0.6) {
            // La Lance traverse : elle blesse et continue, mais ne frappe
            // jamais deux fois la même cible (sinon 60 coups par seconde).
            if (p.pierce) {
              if (p.hit!.has(e)) continue;
              p.hit!.add(e);
            } else {
              dead = true;
            }
            e.hp -= p.dmg;
            if (e.hp <= 0) {
              onKill({ enemy: e });
              enemies.remove(j);
            }
            if (!p.pierce) break;
          }
        }
      }
      if (dead) {
        this.scene.remove(p.mesh);
        this.projPool.push(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Ondes de choc
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.radius += dt * 34;
      w.mesh.scale.setScalar(w.radius);
      const mat = w.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 * (1 - w.radius / w.maxRadius);
      const center = new THREE.Vector2(w.mesh.position.x, w.mesh.position.y);
      for (let j = enemies.list.length - 1; j >= 0; j--) {
        const e = enemies.list[j];
        if (w.hitSet.has(e)) continue;
        const d = center.distanceTo(e.pos);
        if (Math.abs(d - w.radius) < e.radius + 1.2) {
          w.hitSet.add(e);
          e.hp -= w.dmg;
          if (e.hp <= 0) {
            onKill({ enemy: e });
            enemies.remove(j);
          }
        }
      }
      if (w.radius >= w.maxRadius) {
        this.scene.remove(w.mesh);
        (w.mesh.material as THREE.Material).dispose();
        this.waves.splice(i, 1);
      }
    }

    // Orbes
    const orbLvl = this.levels.get("orbes") ?? 0;
    if (orbLvl > 0) {
      this.orbAngle += dt * 2.6;
      // Les paliers écartent les orbes du joueur en plus d'en ajouter (N4)
      const r = 8.5 + (orbLvl - 1) * 3.2;
      for (let k = 0; k < this.orbMeshes.length; k++) {
        const a = this.orbAngle + (k * Math.PI * 2) / this.orbMeshes.length;
        const ox = ship.pos.x + Math.cos(a) * r;
        const oy = ship.pos.y + Math.sin(a) * r;
        this.orbMeshes[k].position.set(ox, oy, 1.5);
        const opos = new THREE.Vector2(ox, oy);
        for (let j = enemies.list.length - 1; j >= 0; j--) {
          const e = enemies.list[j];
          if (e.orbHitCd > 0) continue;
          if (opos.distanceTo(e.pos) < e.radius + 1.15) {
            e.orbHitCd = 0.5;
            // Un contact = une destruction pour le tout-venant (N4) ; seuls
            // les colosses encaissent plus d'un passage
            e.hp -= (9 + orbLvl * 2) * mul;
            if (e.hp <= 0) {
              onKill({ enemy: e });
              enemies.remove(j);
            }
          }
        }
      }
    }

    // Filaments (ex-Tentacule, refonte N4 2026-07-29) : de longs filaments
    // urticants qui traînent paresseusement derrière la cellule, comme
    // certaines méduses. Paliers : longueur, dégâts, jusqu'à 3 filaments
    // (2e au palier 3, 3e au palier 5).
    const filLvl = this.levels.get("tentacule") ?? 0;
    if (filLvl > 0) {
      const count = filLvl >= 5 ? 3 : filLvl >= 3 ? 2 : 1;
      const length = 13 + filLvl * 2;
      const spacing = length / FILAMENT_SEGS;
      const filDmg = (1.2 + filLvl * 0.25) * mul;

      // (Re)construction quand le nombre de filaments change
      if (this.filaments.length !== count) {
        for (const m of this.tentacleMeshes) this.scene.remove(m);
        this.tentacleMeshes = [];
        this.filaments = [];
        for (let f = 0; f < count; f++) {
          const pts: THREE.Vector2[] = [];
          for (let i = 0; i < FILAMENT_SEGS; i++) pts.push(ship.pos.clone());
          this.filaments.push(pts);
          for (let i = 0; i < FILAMENT_SEGS; i++) {
            const m = new THREE.Mesh(this.tentGeo, this.tentMat);
            this.scene.add(m);
            this.tentacleMeshes.push(m);
          }
        }
      }

      const heading = ship.lastDir;
      const perp = new THREE.Vector2(-heading.y, heading.x);
      for (let f = 0; f < count; f++) {
        const pts = this.filaments[f];
        // Ancre : derrière la cellule, écartée latéralement par filament
        const anchor = ship.pos
          .clone()
          .addScaledVector(heading, -1.4)
          .addScaledVector(perp, (f - (count - 1) / 2) * 1.8);
        pts[0].lerp(anchor, 1 - Math.exp(-dt * 14));
        // Contrainte de distance adoucie : c'est elle qui fait la paresse
        for (let i = 1; i < FILAMENT_SEGS; i++) {
          const d = pts[i].clone().sub(pts[i - 1]);
          const dist = Math.max(0.0001, d.length());
          const target = pts[i - 1].clone().addScaledVector(d.multiplyScalar(1 / dist), spacing);
          pts[i].lerp(target, 1 - Math.exp(-dt * 9));
        }
        for (let i = 0; i < FILAMENT_SEGS; i++) {
          const m = this.tentacleMeshes[f * FILAMENT_SEGS + i];
          const segR = 0.24 * (1 - (i / FILAMENT_SEGS) * 0.5); // perles minuscules, effilées
          m.position.set(pts[i].x, pts[i].y, 1.4);
          m.scale.setScalar(segR);
          for (let j = enemies.list.length - 1; j >= 0; j--) {
            const e = enemies.list[j];
            if (e.tentHitCd > 0) continue;
            if (pts[i].distanceTo(e.pos) < e.radius + FILAMENT_HIT_R) {
              e.tentHitCd = 0.3;
              e.hp -= filDmg;
              if (e.hp <= 0) {
                onKill({ enemy: e });
                enemies.remove(j);
              }
            }
          }
        }
      }
    }
  }

  private fire(from: THREE.Vector2, dir: THREE.Vector2, speed: number, dmg: number) {
    const mesh = this.projPool.pop() ?? new THREE.Mesh(this.projGeo, this.projMat);
    mesh.material = this.projMat; // le pool est partagé : on repose la matière
    mesh.position.set(from.x, from.y, 1.5);
    this.scene.add(mesh);
    this.projectiles.push({
      pos: from.clone(),
      vel: dir.clone().multiplyScalar(speed),
      life: 2.2,
      dmg,
      mesh,
    });
  }

  /** Tir transperçant (Lance) : plus long, plus rapide, et il ne s'arrête pas. */
  private firePierce(from: THREE.Vector2, dir: THREE.Vector2, speed: number, dmg: number) {
    const mesh = this.projPool.pop() ?? new THREE.Mesh(this.projGeo, this.lanceMat);
    mesh.material = this.lanceMat;
    mesh.position.set(from.x, from.y, 1.5);
    this.scene.add(mesh);
    this.projectiles.push({
      pos: from.clone(),
      vel: dir.clone().multiplyScalar(speed),
      life: 3.2, // il doit pouvoir traverser toute l'arène
      dmg,
      mesh,
      pierce: true,
      hit: new Set(),
    });
  }

  private nearest(from: THREE.Vector2, enemies: Enemies): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of enemies.list) {
      const d = from.distanceToSquared(e.pos);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private syncOrbs() {
    for (const m of this.orbMeshes) this.scene.remove(m);
    this.orbMeshes = [];
    const lvl = this.levels.get("orbes") ?? 0;
    if (lvl > 0) {
      const n = 1 + lvl;
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(this.orbGeo, this.orbMat);
        this.scene.add(m);
        this.orbMeshes.push(m);
      }
    }
  }

  /**
   * Décharges électriques : des éclairs brisés redessinés à chaque frame,
   * du corps de la cellule vers des points du cône (refonte N4 : le cône
   * plat faisait placeholder). Chaque éclair zigzague, perd de l'intensité
   * vers la pointe, et quelques-uns bifurquent — c'est le désordre qui fait
   * lire « électricité », pas la forme.
   */
  private drawBolts(origin: THREE.Vector2, heading: number, len: number, half: number, bolts: number) {
    const BOLTS = Math.max(1, bolts);
    const SEGS = 9;
    while (this.boltLines.length < BOLTS) {
      const mesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({
          color: 0xdffcff,
          transparent: true,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      mesh.position.z = 1.6;
      this.scene.add(mesh);
      this.boltLines.push(mesh);
    }
    // Les rubans en trop (paliers précédents) restent muets
    for (let i = BOLTS; i < this.boltLines.length; i++) this.boltLines[i].visible = false;
    for (let b = 0; b < BOLTS; b++) {
      const mesh = this.boltLines[b];
      mesh.visible = true;
      // Chaque éclair vise un angle du cône, avec sa propre longueur
      const a = heading + (Math.random() * 2 - 1) * half;
      const reach = len * (0.55 + Math.random() * 0.45);
      const nx = Math.cos(a + Math.PI / 2);
      const ny = Math.sin(a + Math.PI / 2);
      // Les départs sont dispersés sur un court arc devant la cellule :
      // sinon les sept éclairs empilent leur lumière en un point unique
      const spread = BOLTS > 1 ? (b / (BOLTS - 1) - 0.5) * 3.4 : 0;
      const ox = origin.x + Math.cos(heading) * 1.6 + nx * spread;
      const oy = origin.y + Math.sin(heading) * 1.6 + ny * spread;
      // Ruban : deux sommets par point, écartés perpendiculairement — une
      // ligne WebGL fait 1 px et disparaît sous le bloom, un ruban non.
      const verts: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= SEGS; i++) {
        const t = i / SEGS;
        const jitter = Math.sin(t * Math.PI) * (Math.random() * 2 - 1) * 2.8;
        const d = reach * t;
        const cx = ox + Math.cos(a) * d + nx * jitter;
        const cy = oy + Math.sin(a) * d + ny * jitter;
        const w = 0.42 * (1 - t * 0.7); // s'affine vers la pointe
        verts.push(cx + nx * w, cy + ny * w, 0, cx - nx * w, cy - ny * w, 0);
        if (i < SEGS) {
          const o = i * 2;
          idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
        }
      }
      mesh.geometry.dispose();
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      g.setIndex(idx);
      mesh.geometry = g;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.random() * 0.4;
    }
  }

  private clearBolts() {
    for (const l of this.boltLines) l.visible = false;
  }

  private syncTentacle() {
    for (const m of this.tentacleMeshes) this.scene.remove(m);
    this.tentacleMeshes = [];
    this.filaments = []; // update() reconstruit au besoin, ancré sur la cellule
  }

  describe(): string[] {
    const out: string[] = [];
    if (this.bonusNukes > 0) out.push(`Réserve d'Apoptose ×${this.bonusNukes} (L2)`);
    for (const [kind, lvl] of this.levels) {
      out.push(`${UPGRADE_INFO[kind].name} · niv ${lvl}`);
    }
    return out;
  }
}
