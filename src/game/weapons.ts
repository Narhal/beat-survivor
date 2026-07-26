// Armes en tir automatique — le joueur conduit, le build tire. Découplées de
// la musique par décision de N4 (2026-07-26) : la musique = la menace,
// le build = le joueur. Choix parmi 3 à chaque jauge pleine (réf. Geometry
// Survivor).

import * as THREE from "three";
import { Enemies, Enemy } from "./enemies";
import { Ship } from "./ship";

export type WeaponKind = "blaster" | "eventail" | "orbes" | "onde";

export const WEAPON_INFO: Record<WeaponKind, { name: string; desc: string }> = {
  blaster: { name: "Anticorps", desc: "Tire sur le pathogène le plus proche." },
  eventail: { name: "Éventail", desc: "Gerbe de 5 projectiles vers l'avant." },
  orbes: { name: "Orbes", desc: "Satellites en orbite, dégâts de contact." },
  onde: { name: "Onde de choc", desc: "Anneau périodique qui balaie autour de toi." },
};

const MAX_LEVEL = 5;

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
  levels = new Map<WeaponKind, number>();
  private scene: THREE.Scene;
  private cooldowns = new Map<WeaponKind, number>();
  private projectiles: Projectile[] = [];
  private waves: Shockwave[] = [];
  private orbMeshes: THREE.Mesh[] = [];
  private orbAngle = 0;

  private projGeo = new THREE.CircleGeometry(0.55, 8);
  private projMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
  private waveGeo = new THREE.RingGeometry(0.92, 1, 48);
  private orbGeo = new THREE.CircleGeometry(1.15, 12);
  private orbMat = new THREE.MeshBasicMaterial({ color: 0x8effc0 });
  private projPool: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.levels.set("blaster", 1);
  }

  reset() {
    this.levels.clear();
    this.levels.set("blaster", 1);
    this.cooldowns.clear();
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const w of this.waves) this.scene.remove(w.mesh);
    this.waves = [];
    this.syncOrbs();
  }

  /** Les 3 cartes du level-up : nouvelles armes ou améliorations, jamais de doublon. */
  drawCards(): { kind: WeaponKind; level: number }[] {
    const options: { kind: WeaponKind; level: number }[] = [];
    for (const kind of Object.keys(WEAPON_INFO) as WeaponKind[]) {
      const lvl = this.levels.get(kind) ?? 0;
      if (lvl < MAX_LEVEL) options.push({ kind, level: lvl + 1 });
    }
    // Mélange de Fisher-Yates
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options.slice(0, 3);
  }

  pick(kind: WeaponKind) {
    this.levels.set(kind, (this.levels.get(kind) ?? 0) + 1);
    this.syncOrbs();
  }

  update(dt: number, ship: Ship, enemies: Enemies, onKill: (e: KillEvent) => void) {
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
            this.fire(ship.pos, dir, 65, 1 + Math.floor(lvl / 2));
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
            this.fire(ship.pos, new THREE.Vector2(Math.cos(a), Math.sin(a)), 55, 1);
          }
          this.cooldowns.set(kind, 1.15 / (1 + (lvl - 1) * 0.25));
          break;
        }
        case "onde": {
          const wave: Shockwave = {
            radius: 2,
            maxRadius: 14 + lvl * 4,
            dmg: 2 + Math.floor(lvl / 2),
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
        case "orbes":
          break; // passif, géré plus bas
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
            e.hp -= 1 + Math.floor(orbLvl / 2);
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

  describe(): string[] {
    const out: string[] = [];
    for (const [kind, lvl] of this.levels) {
      out.push(`${WEAPON_INFO[kind].name} · niv ${lvl}`);
    }
    return out;
  }
}
