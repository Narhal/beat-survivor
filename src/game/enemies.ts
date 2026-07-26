// Les ennemis SONT la musique : chaque bande de fréquence a son espèce.
// Basse → globules (lents, massifs), médiums → méduses (dérive sinueuse),
// aigus → dards (rapides, en ligne droite). Bestiaire volontairement micro-
// organique (réf. Nucleus) : on tue des pathogènes, pas des vaisseaux.

import * as THREE from "three";
import { ARENA } from "./world";

export type EnemyKind = "globule" | "meduse" | "dard";

interface EnemyDef {
  color: number;
  radius: number;
  hp: number;
  speed: number;
  xp: number;
  score: number;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  globule: { color: 0xff3d6e, radius: 2.6, hp: 3, speed: 8, xp: 3, score: 30 },
  meduse: { color: 0xb06cff, radius: 1.9, hp: 2, speed: 12, xp: 2, score: 20 },
  dard: { color: 0x35e8ff, radius: 1.1, hp: 1, speed: 27, xp: 1, score: 10 },
};

export interface Enemy {
  kind: EnemyKind;
  pos: THREE.Vector2;
  dir: THREE.Vector2; // pour les dards (trajectoire figée au spawn)
  hp: number;
  radius: number;
  speed: number;
  phase: number; // pour l'ondulation des méduses
  mesh: THREE.Mesh;
  orbHitCd: number; // anti-spam dégâts de contact des orbes
  tentHitCd: number; // idem pour le tentacule
}

const MAX_ENEMIES = 150;

export class Enemies {
  list: Enemy[] = [];
  private scene: THREE.Scene;
  private geos: Record<EnemyKind, THREE.BufferGeometry>;
  private mats: Record<EnemyKind, THREE.MeshBasicMaterial>;
  private pool: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geos = {
      globule: new THREE.CircleGeometry(1, 10), // blob grossier
      meduse: new THREE.CircleGeometry(1, 6),
      dard: new THREE.CircleGeometry(1, 3), // triangle
    };
    this.mats = {
      globule: new THREE.MeshBasicMaterial({ color: ENEMY_DEFS.globule.color }),
      meduse: new THREE.MeshBasicMaterial({ color: ENEMY_DEFS.meduse.color }),
      dard: new THREE.MeshBasicMaterial({ color: ENEMY_DEFS.dard.color }),
    };
  }

  /**
   * Spawn sur le bord, à l'écart du joueur ; force ∈ 0..1 module la taille/PV,
   * speedScale (l'intensité du morceau) module la vitesse.
   */
  spawn(kind: EnemyKind, player: THREE.Vector2, strength: number, difficulty: number, speedScale = 1) {
    if (this.list.length >= MAX_ENEMIES) return;
    const def = ENEMY_DEFS[kind];

    // Point sur le périmètre, à au moins 35 unités du joueur
    let pos = new THREE.Vector2();
    for (let tries = 0; tries < 8; tries++) {
      const side = Math.floor(Math.random() * 4);
      const rx = (Math.random() * 2 - 1) * ARENA.hw;
      const ry = (Math.random() * 2 - 1) * ARENA.hh;
      pos =
        side === 0 ? new THREE.Vector2(rx, ARENA.hh - 1)
        : side === 1 ? new THREE.Vector2(rx, -ARENA.hh + 1)
        : side === 2 ? new THREE.Vector2(ARENA.hw - 1, ry)
        : new THREE.Vector2(-ARENA.hw + 1, ry);
      if (pos.distanceTo(player) > 35) break;
    }

    const scale = 0.8 + strength * 0.5;
    const mesh = this.pool.pop() ?? new THREE.Mesh();
    mesh.geometry = this.geos[kind];
    mesh.material = this.mats[kind];
    mesh.scale.setScalar(def.radius * scale);
    mesh.position.set(pos.x, pos.y, 1);
    mesh.visible = true;
    this.scene.add(mesh);

    this.list.push({
      kind,
      pos,
      dir: new THREE.Vector2().subVectors(player, pos).normalize(),
      hp: Math.ceil(def.hp * scale * (1 + (difficulty - 1) * 0.5)),
      radius: def.radius * scale,
      speed: def.speed * (0.9 + Math.random() * 0.2) * (1 + (difficulty - 1) * 0.25) * speedScale,
      phase: Math.random() * Math.PI * 2,
      mesh,
      orbHitCd: 0,
      tentHitCd: 0,
    });
  }

  update(dt: number, time: number, player: THREE.Vector2) {
    for (const e of this.list) {
      e.orbHitCd = Math.max(0, e.orbHitCd - dt);
      e.tentHitCd = Math.max(0, e.tentHitCd - dt);
      switch (e.kind) {
        case "globule": {
          const d = new THREE.Vector2().subVectors(player, e.pos).normalize();
          e.pos.addScaledVector(d, e.speed * dt);
          break;
        }
        case "meduse": {
          const d = new THREE.Vector2().subVectors(player, e.pos).normalize();
          const perp = new THREE.Vector2(-d.y, d.x).multiplyScalar(Math.sin(time * 3 + e.phase) * 0.8);
          e.pos.addScaledVector(d.add(perp).normalize(), e.speed * dt);
          break;
        }
        case "dard": {
          e.pos.addScaledVector(e.dir, e.speed * dt);
          break;
        }
      }
      e.mesh.position.set(e.pos.x, e.pos.y, 1);
      e.mesh.rotation.z = time * (e.kind === "globule" ? 0.6 : 2) + e.phase;
    }

    // Les dards sortis de l'arène disparaissent
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (
        e.kind === "dard" &&
        (Math.abs(e.pos.x) > ARENA.hw + 6 || Math.abs(e.pos.y) > ARENA.hh + 6)
      ) {
        this.remove(i);
      }
    }
  }

  remove(index: number) {
    const e = this.list[index];
    this.scene.remove(e.mesh);
    e.mesh.visible = false;
    this.pool.push(e.mesh);
    this.list.splice(index, 1);
  }

  clear() {
    while (this.list.length) this.remove(this.list.length - 1);
  }
}
