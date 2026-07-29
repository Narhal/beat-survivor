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
const DASH_SPEED = 95;
const DASH_DURATION = 0.16;

export class Ship {
  pos = new THREE.Vector2(0, 0);
  vel = new THREE.Vector2(0, 0);
  lastDir = new THREE.Vector2(1, 0); // dernière direction de déplacement (armes directionnelles)
  hp = 3;
  invuln = 0;
  speedBonus = 1; // atout Flagelles, piloté depuis main
  /** Enveloppe de basse 0..1, poussée par main — fait battre la mitochondrie. */
  beat = 0;
  dashCd = 0;
  group = new THREE.Group();

  private dashTime = 0;
  private t = 0;
  private mitoMesh: THREE.Mesh | null = null;
  private membraneMesh: THREE.Mesh | null = null;

  get dashing(): boolean {
    return this.dashTime > 0;
  }

  /** Dash dans la direction de déplacement. Retourne true s'il part. */
  tryDash(cooldown: number): boolean {
    if (this.dashCd > 0 || this.dashTime > 0) return false;
    this.dashTime = DASH_DURATION;
    this.dashCd = cooldown;
    return true;
  }

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
    this.dashCd = 0;
    this.dashTime = 0;
  }

  update(dt: number, input: THREE.Vector2) {
    this.t += dt;
    this.dashCd = Math.max(0, this.dashCd - dt);
    const mag = Math.min(1, input.length());
    if (mag > 0.12) this.lastDir.copy(input).normalize();

    if (this.dashTime > 0) {
      // Dash : la cellule fuse dans sa direction, le pilotage reprend après
      this.dashTime -= dt;
      this.vel.copy(this.lastDir).multiplyScalar(DASH_SPEED);
    } else {
      const want = new THREE.Vector2();
      if (mag > 0.12) {
        want.copy(input).normalize().multiplyScalar(MAX_SPEED * this.speedBonus * mag);
      }
      const k = 1 - Math.exp(-dt * (mag > 0.12 ? SMOOTH_ACCEL : SMOOTH_DRIFT));
      this.vel.lerp(want, k);
    }
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
    this.group.scale.setScalar((1 + Math.sin(this.t * 3.2) * 0.05) * (this.dashing ? 1.3 : 1));
    // La mitochondrie bat le rythme depuis l'intérieur (bioluminescence)
    if (this.mitoMesh) {
      (this.mitoMesh.material as THREE.MeshBasicMaterial).opacity = 0.32 + this.beat * 0.75;
      this.mitoMesh.scale.setScalar(2.6 * (1 + this.beat * 0.16));
      this.mitoMesh.rotation.z += dt * 0.18;
    }
    if (this.membraneMesh) this.membraneMesh.rotation.z -= dt * 0.06;
    this.group.visible = this.invuln <= 0 || Math.floor(this.invuln * 12) % 2 === 0;
  }

  /**
   * Bascule la cellule en sprites Midjourney : membrane translucide +
   * mitochondrie bioluminescente qui pulse sur la basse (envie forte de N4).
   */
  setSprites(membrane: THREE.Texture, mito: THREE.Texture) {
    this.group.clear();
    const quad = new THREE.PlaneGeometry(2, 2);
    this.membraneMesh = new THREE.Mesh(
      quad,
      new THREE.MeshBasicMaterial({ map: membrane, transparent: true, depthWrite: false })
    );
    this.membraneMesh.scale.setScalar(3.1);
    this.mitoMesh = new THREE.Mesh(
      quad,
      new THREE.MeshBasicMaterial({
        map: mito,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
      })
    );
    this.mitoMesh.scale.setScalar(2.6);
    this.mitoMesh.position.z = 0.1;
    this.group.add(this.membraneMesh, this.mitoMesh);
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
