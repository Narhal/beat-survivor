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
  | "blaster" | "eventail" | "orbes" | "onde" | "tentacule" | "apoptose" // armes
  | "flagelles" | "membrane" // atouts
  | "mitose" | "enzymes" | "phagocytose" | "saccade"; // passifs

export const UPGRADE_INFO: Record<UpgradeKind, { name: string; desc: string; cat: UpgradeCategory }> = {
  blaster: { name: "Anticorps", desc: "Tire sur le pathogène le plus proche.", cat: "Arme" },
  eventail: { name: "Éventail", desc: "Gerbe de projectiles vers l'avant.", cat: "Arme" },
  orbes: { name: "Orbes", desc: "Satellites en orbite, dégâts de contact.", cat: "Arme" },
  onde: { name: "Onde de choc", desc: "Anneau périodique qui balaie autour de toi.", cat: "Arme" },
  tentacule: { name: "Tentacule", desc: "Ondule autour de toi et tue sur son passage. Se multiplie par palier (jusqu'à 5 bras), puis frappe plus fort.", cat: "Arme" },
  apoptose: { name: "Apoptose", desc: "L2 : purge tout l'écran une fois chargée — se charge plus vite par palier.", cat: "Arme" },
  flagelles: { name: "Flagelles", desc: "Vitesse de nage augmentée à chaque palier.", cat: "Atout" },
  membrane: { name: "Membrane", desc: "Absorbe un coup, puis se recharge — de plus en plus vite par palier.", cat: "Atout" },
  mitose: { name: "Mitose", desc: "Régulièrement, un pathogène détruit laisse un cœur — plus souvent par palier.", cat: "Passif" },
  enzymes: { name: "Enzymes", desc: "+15 % de dégâts pour toutes les armes par palier.", cat: "Passif" },
  phagocytose: { name: "Phagocytose", desc: "Attire les protéines des pathogènes de plus en plus loin.", cat: "Passif" },
  saccade: { name: "Saccade", desc: "Dash (R1) plus prompt ; palier 3 : invulnérable pendant ; palier 5 : il déchire sur son passage.", cat: "Passif" },
};

const MAX_LEVEL = 5;
const TENTACLE_SEGMENTS = 8;

// Le Tentacule va plus loin (décision N4 2026-07-28) : paliers 1-5 = un bras
// de plus (jusqu'à 5), paliers 6-7 = dégâts globaux des bras.
function maxLevelOf(kind: UpgradeKind): number {
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
  private shieldTimer = 0;

  private scene: THREE.Scene;
  private cooldowns = new Map<UpgradeKind, number>();
  private projectiles: Projectile[] = [];
  private waves: Shockwave[] = [];
  private orbMeshes: THREE.Mesh[] = [];
  private orbAngle = 0;
  private tentacleMeshes: THREE.Mesh[] = [];
  private tentacleAngle = 0;
  private shieldMesh: THREE.Mesh;
  private time = 0;

  private projGeo = new THREE.CircleGeometry(0.55, 8);
  private projMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
  private waveGeo = new THREE.RingGeometry(0.92, 1, 48);
  private orbGeo = new THREE.CircleGeometry(1.15, 12);
  private orbMat = new THREE.MeshBasicMaterial({ color: 0x8effc0 });
  private tentGeo = new THREE.CircleGeometry(1, 10);
  private tentMat = new THREE.MeshBasicMaterial({ color: 0x66f0d8 });
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
    this.syncOrbs();
    this.syncTentacle();
  }

  /** Multiplicateur de dégâts global (passif Enzymes). */
  get damageMul(): number {
    return 1 + 0.15 * (this.levels.get("enzymes") ?? 0);
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

  /** Rayon d'attraction des protéines (passif Phagocytose). */
  get magnetRadius(): number {
    return 6 + 4 * (this.levels.get("phagocytose") ?? 0);
  }

  /** Récupération du dash — la Saccade le rend plus prompt. */
  get dashCooldown(): number {
    return 2.4 * (1 - 0.09 * (this.levels.get("saccade") ?? 0));
  }

  /** Palier 3 de la Saccade : invulnérable pendant le dash. */
  get dashInvuln(): boolean {
    return (this.levels.get("saccade") ?? 0) >= 3;
  }

  /** Palier 5 de la Saccade : le dash blesse sur son passage. */
  get dashDamage(): number {
    return (this.levels.get("saccade") ?? 0) >= 5 ? 2 * this.damageMul : 0;
  }

  /** Déclenche l'Apoptose si elle est chargée. */
  fireNuke(): boolean {
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

  /** Les 3 cartes du level-up : armes, atouts et passifs mélangés. */
  drawCards(): { kind: UpgradeKind; level: number }[] {
    const options: { kind: UpgradeKind; level: number }[] = [];
    for (const kind of Object.keys(UPGRADE_INFO) as UpgradeKind[]) {
      const lvl = this.levels.get(kind) ?? 0;
      if (lvl < maxLevelOf(kind)) options.push({ kind, level: lvl + 1 });
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options.slice(0, 3);
  }

  pick(kind: UpgradeKind) {
    this.levels.set(kind, (this.levels.get(kind) ?? 0) + 1);
    if (kind === "membrane" && (this.levels.get("membrane") ?? 0) === 1) {
      this.shieldCharged = true; // premier palier : bouclier chargé d'office
    }
    this.syncOrbs();
    this.syncTentacle();
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
          const heading = Math.atan2(ship.lastDir.y, ship.lastDir.x);
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
        default:
          break; // orbes, tentacule et les non-armes sont passifs, gérés plus bas
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

    // Tentacules : des bras organiques qui ondulent en tournant, léthals sur
    // leur passage. Un bras de plus par palier (max 5), puis dégâts globaux.
    const tentLvl = this.levels.get("tentacule") ?? 0;
    if (tentLvl > 0) {
      const arms = Math.min(5, tentLvl);
      const dmgBoost = 1 + 0.35 * Math.max(0, tentLvl - 5);
      this.tentacleAngle += dt * 1.9;
      const length = 11 + arms * 0.8;
      for (let k = 0; k < this.tentacleMeshes.length; k++) {
        const arm = Math.floor(k / TENTACLE_SEGMENTS);
        const seg = k % TENTACLE_SEGMENTS;
        const frac = (seg + 1) / TENTACLE_SEGMENTS;
        // Ondulation : chaque segment traîne et serpente derrière le précédent,
        // chaque bras a sa phase propre
        const a =
          this.tentacleAngle +
          (arm * Math.PI * 2) / arms +
          Math.sin(this.time * 2.6 - seg * 0.65 + arm * 1.7) * 0.22 -
          seg * 0.06;
        const sx = ship.pos.x + Math.cos(a) * length * frac;
        const sy = ship.pos.y + Math.sin(a) * length * frac;
        const m = this.tentacleMeshes[k];
        m.position.set(sx, sy, 1.4);
        const segR = 1.3 * (1 - frac * 0.55); // s'affine vers le bout
        m.scale.setScalar(segR);
        const spos = new THREE.Vector2(sx, sy);
        for (let j = enemies.list.length - 1; j >= 0; j--) {
          const e = enemies.list[j];
          if (e.tentHitCd > 0) continue;
          if (spos.distanceTo(e.pos) < e.radius + segR) {
            e.tentHitCd = 0.35;
            e.hp -= 1.5 * dmgBoost * mul;
            if (e.hp <= 0) {
              onKill({ enemy: e });
              enemies.remove(j);
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
    const lvl = this.levels.get("tentacule") ?? 0;
    if (lvl > 0) {
      const arms = Math.min(5, lvl);
      for (let k = 0; k < arms * TENTACLE_SEGMENTS; k++) {
        const m = new THREE.Mesh(this.tentGeo, this.tentMat);
        this.scene.add(m);
        this.tentacleMeshes.push(m);
      }
    }
  }

  describe(): string[] {
    const out: string[] = [];
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
