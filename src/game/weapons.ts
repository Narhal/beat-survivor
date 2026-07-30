// Le build : armes, atouts, passifs — en tir/effet automatique, le joueur
// conduit. Découplé de la musique par décision de N4 (2026-07-26) : la musique
// = la menace, le build = le joueur. Choix parmi 3 cartes à chaque jauge
// pleine (réf. Geometry Survivor). Trois catégories (N4, 2026-07-26) :
// Arme (attaque), Atout (survie active), Passif (bonus permanents).

import * as THREE from "three";
import { Enemies, Enemy } from "./enemies";
import { Ship } from "./ship";

export type UpgradeCategory = "Arme" | "Atout" | "Passif";
export type UpgradeKind =
  | "blaster" | "eventail" | "orbes" | "onde" | "tentacule" | "apoptose" | "mine" | "arc" // armes
  | "flagelles" | "membrane" // atouts
  | "mitose" | "enzymes" | "phagocytose"; // passifs

export const UPGRADE_INFO: Record<UpgradeKind, { name: string; desc: string; cat: UpgradeCategory }> = {
  blaster: { name: "Anticorps", desc: "Tire sur le pathogène le plus proche.", cat: "Arme" },
  eventail: { name: "Éventail", desc: "Gerbe de projectiles vers l'arrière — couvre ta fuite.", cat: "Arme" },
  mine: { name: "Mine", desc: "Pond régulièrement une mine qui explose à l'approche des pathogènes.", cat: "Arme" },
  arc: { name: "Arc voltaïque", desc: "Cône électrique devant toi : tout ce qui y entre grille. Bref aux premiers paliers, puis plus long et plus ample.", cat: "Arme" },
  orbes: { name: "Orbes", desc: "Satellites en orbite, dégâts de contact.", cat: "Arme" },
  onde: { name: "Onde de choc", desc: "Anneau périodique qui balaie autour de toi.", cat: "Arme" },
  tentacule: { name: "Filament", desc: "Un long filament urticant traîne paresseusement derrière toi (réf. méduse). Paliers : longueur, dégâts, jusqu'à 3 filaments.", cat: "Arme" },
  apoptose: { name: "Apoptose", desc: "L2 : purge tout l'écran une fois chargée — se charge plus vite par palier.", cat: "Arme" },
  flagelles: { name: "Flagelles", desc: "Vitesse de nage augmentée à chaque palier.", cat: "Atout" },
  membrane: { name: "Membrane", desc: "Absorbe un coup, puis se recharge — de plus en plus vite par palier.", cat: "Atout" },
  mitose: { name: "Mitose", desc: "Régulièrement, un pathogène détruit laisse un cœur — plus souvent par palier.", cat: "Passif" },
  enzymes: { name: "Enzymes", desc: "+15 % de dégâts pour toutes les armes par palier.", cat: "Passif" },
  phagocytose: { name: "Phagocytose", desc: "Attire les protéines des pathogènes de plus en plus loin.", cat: "Passif" },
};

const MAX_LEVEL = 5;
// Filament TRÈS fin (N4) : beaucoup de perles minuscules = sensation de
// filament, pas de queue. L'hitbox est découplée du visuel pour ne pas
// affaiblir l'arme.
const FILAMENT_SEGS = 22;
const FILAMENT_HIT_R = 0.5;
/** Nombre maximum d'ARMES simultanées : il faut faire des choix (N4). */
const MAX_WEAPONS = 5;

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
  /** Charge de l'Apoptose, 0..1. */
  nukeCharge = 0;
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
  private arcMesh: THREE.Mesh | null = null;
  private arcTimer = 0;
  private arcParams = { len: 0, half: 0 };
  private shieldMesh: THREE.Mesh;
  private time = 0;

  private projGeo = new THREE.CircleGeometry(0.55, 8);
  private projMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
  private waveGeo = new THREE.RingGeometry(0.92, 1, 48);
  private orbGeo = new THREE.CircleGeometry(1.15, 12);
  private orbMat = new THREE.MeshBasicMaterial({ color: 0x8effc0 });
  private tentGeo = new THREE.CircleGeometry(1, 10);
  private tentMat = new THREE.MeshBasicMaterial({ color: 0x66f0d8 });
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
    this.nukeCharge = 0;
    for (const mn of this.mines) this.scene.remove(mn.mesh);
    this.mines = [];
    for (const ex of this.explosions) this.scene.remove(ex.mesh);
    this.explosions = [];
    if (this.arcMesh) {
      this.scene.remove(this.arcMesh);
      this.arcMesh.geometry.dispose();
      this.arcMesh = null;
    }
    this.arcTimer = 0;
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

  /** Déclenche l'Apoptose : réserve de la Pharmacie d'abord, puis la charge. */
  fireNuke(): boolean {
    if (this.bonusNukes > 0) {
      this.bonusNukes--;
      return true;
    }
    if ((this.levels.get("apoptose") ?? 0) > 0 && this.nukeCharge >= 1) {
      this.nukeCharge = 0;
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

    // Charge de l'Apoptose : 45 s au palier 1, de plus en plus vite ensuite
    const nukeLvl = this.levels.get("apoptose") ?? 0;
    if (nukeLvl > 0 && this.nukeCharge < 1) {
      const chargeTime = 45 * Math.pow(0.8, nukeLvl - 1);
      this.nukeCharge = Math.min(1, this.nukeCharge + dt / chargeTime);
    }
    this.shieldMesh.visible = this.shieldCharged;
    if (this.shieldMesh.visible) {
      this.shieldMesh.position.set(ship.pos.x, ship.pos.y, 1.9);
      this.shieldMesh.rotation.z = this.time * 0.8;
    }

    for (const [kind, lvl] of this.levels) {
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
          // Pond une mine sous la cellule ; elle s'arme puis guette
          const mesh = new THREE.Mesh(this.mineGeo, this.mineMat);
          mesh.position.set(ship.pos.x, ship.pos.y, 0.8);
          this.scene.add(mesh);
          this.mines.push({ pos: ship.pos.clone(), mesh, age: 0 });
          this.cooldowns.set(kind, 3.5 / (1 + (lvl - 1) * 0.22));
          break;
        }
        case "arc": {
          // Active le cône électrique devant la cellule — bref mais létal
          const len = 14 + lvl * 3;
          const half = 0.35 + lvl * 0.06;
          this.arcParams = { len, half };
          this.arcTimer = 0.7 + lvl * 0.25;
          if (this.arcMesh) {
            this.scene.remove(this.arcMesh);
            this.arcMesh.geometry.dispose();
          }
          const shape = new THREE.Shape();
          shape.moveTo(0, 0);
          const STEPS = 14;
          for (let i = 0; i <= STEPS; i++) {
            const a = -half + (2 * half * i) / STEPS;
            shape.lineTo(Math.cos(a), Math.sin(a));
          }
          shape.closePath();
          this.arcMesh = new THREE.Mesh(
            new THREE.ShapeGeometry(shape),
            new THREE.MeshBasicMaterial({
              color: 0xbef3ff,
              transparent: true,
              opacity: 0.35,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          this.arcMesh.scale.setScalar(len);
          this.scene.add(this.arcMesh);
          this.cooldowns.set(kind, 6.5);
          break;
        }
        default:
          break; // orbes, tentacule et les non-armes sont passifs, gérés plus bas
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
        const radius = 8 + mineLvl * 1.5;
        const mineDmg = (5 + mineLvl * 2) * mul;
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

    // Arc voltaïque actif : suit la cellule, grésille, foudroie ce qui entre
    if (this.arcTimer > 0 && this.arcMesh) {
      this.arcTimer -= dt;
      const heading = Math.atan2(ship.lastDir.y, ship.lastDir.x);
      this.arcMesh.position.set(ship.pos.x, ship.pos.y, 1.45);
      this.arcMesh.rotation.z = heading;
      (this.arcMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.random() * 0.28;
      const { len, half } = this.arcParams;
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
      if (this.arcTimer <= 0) {
        this.scene.remove(this.arcMesh);
        this.arcMesh.geometry.dispose();
        this.arcMesh = null;
      }
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
            e.hp -= p.dmg;
            dead = true;
            if (e.hp <= 0) {
              onKill({ enemy: e });
              enemies.remove(j);
            }
            break;
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
      const r = 8.5;
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
            e.hp -= (1 + Math.floor(orbLvl / 2)) * mul;
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

  private syncTentacle() {
    for (const m of this.tentacleMeshes) this.scene.remove(m);
    this.tentacleMeshes = [];
    this.filaments = []; // update() reconstruit au besoin, ancré sur la cellule
  }

  describe(): string[] {
    const out: string[] = [];
    if (this.bonusNukes > 0) out.push(`Réserve d'Apoptose ×${this.bonusNukes} (L2)`);
    for (const [kind, lvl] of this.levels) {
      if (kind === "apoptose") {
        const state = this.nukeCharge >= 1 ? "PRÊTE — L2 !" : `${Math.floor(this.nukeCharge * 100)} %`;
        out.push(`Apoptose · niv ${lvl} · ${state}`);
      } else {
        out.push(`${UPGRADE_INFO[kind].name} · niv ${lvl}`);
      }
    }
    return out;
  }
}
