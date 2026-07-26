// Le vaisseau : une cellule. Le déplacement est ALIGNÉ sur le stick
// (décision N4 2026-07-26 : pas de modèle cap+rotation type voiture) —
// le stick pointe, la cellule va, avec juste assez d'inertie pour nager.

import * as THREE from "three";
import { ARENA } from "./world";

const MAX_SPEED = 32;
const HP_MAX = 5; // 3 au départ, la Mitose peut soigner au-delà
// Réglage N4 (2026-07-26, ×2) : plus nerveux à l'attaque, plus de glisse au relâché
const SMOOTH_ACCEL = 6.0; // survivre exige de répondre tout de suite
const SMOOTH_DRIFT = 4.1;

export class Ship {
  pos = new THREE.Vector2(0, 0);
  vel = new THREE.Vector2(0, 0);
  lastDir = new THREE.Vector2(1, 0); // dernière direction de déplacement (armes directionnelles)
  hp = 3;
  invuln = 0;
  speedBonus = 1; // atout Flagelles, piloté depuis main
  group = new THREE.Group();

  private t = 0;

  constructor(scene: THREE.Scene) {
    // Cellule symétrique bleutée : membrane, liseré, noyau
    const membrane = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x2a7f9a, transparent: true, opacity: 0.45 })
    );
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x9fe8ff })
    );
    const nucleus = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 24),
      new THREE.MeshBasicMaterial({ color: 0xd8fbff })
    );
    nucleus.position.z = 0.1;
    rim.position.z = 0.05;
    this.group.add(membrane, rim, nucleus);
    this.group.position.z = 2;
    scene.add(this.group);
  }

  reset() {
    this.pos.set(0, 0);
    this.vel.set(0, 0);
    this.lastDir.set(1, 0);
    this.hp = 3;
    this.invuln = 0;
  }

  update(dt: number, input: THREE.Vector2) {
    this.t += dt;
    const mag = Math.min(1, input.length());
    const want = new THREE.Vector2();
    if (mag > 0.12) {
      want.copy(input).normalize().multiplyScalar(MAX_SPEED * this.speedBonus * mag);
      this.lastDir.copy(input).normalize();
    }
    const k = 1 - Math.exp(-dt * (mag > 0.12 ? SMOOTH_ACCEL : SMOOTH_DRIFT));
    this.vel.lerp(want, k);
    this.pos.addScaledVector(this.vel, dt);

    // Bords : on glisse le long des parois
    if (Math.abs(this.pos.x) > ARENA.hw - 2) {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, -(ARENA.hw - 2), ARENA.hw - 2);
      this.vel.x = 0;
    }
    if (Math.abs(this.pos.y) > ARENA.hh - 2) {
      this.pos.y = THREE.MathUtils.clamp(this.pos.y, -(ARENA.hh - 2), ARENA.hh - 2);
      this.vel.y = 0;
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.group.position.set(this.pos.x, this.pos.y, 2);
    // Respiration de la membrane — la cellule est vivante, pas orientée
    this.group.scale.setScalar(1 + Math.sin(this.t * 3.2) * 0.05);
    this.group.visible = this.invuln <= 0 || Math.floor(this.invuln * 12) % 2 === 0;
  }

  /** Retourne true si le coup a porté (pas d'invulnérabilité en cours). */
  hit(): boolean {
    if (this.invuln > 0) return false;
    this.hp -= 1;
    this.invuln = 1.2;
    return true;
  }

  heal(amount = 1) {
    this.hp = Math.min(HP_MAX, this.hp + amount);
  }
}
