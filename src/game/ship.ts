// Le vaisseau : on CONDUIT — jamais à l'arrêt, le stick oriente et module la
// vitesse, l'inertie est fluide (on nage dans la soupe, réf. Nucleus).

import * as THREE from "three";
import { ARENA } from "./world";

const BASE_SPEED = 13; // vitesse plancher (on ne s'arrête pas)
const MAX_SPEED = 32;
const TURN_RATE = 5.2; // rad/s
const SMOOTH = 3.2; // inertie (plus bas = plus flottant)

export class Ship {
  pos = new THREE.Vector2(0, 0);
  vel = new THREE.Vector2(BASE_SPEED, 0);
  heading = 0;
  hp = 3;
  invuln = 0;
  group = new THREE.Group();

  private body: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    // Triangle pointé vers +X
    const shape = new THREE.Shape();
    shape.moveTo(2.2, 0);
    shape.lineTo(-1.4, 1.3);
    shape.lineTo(-0.7, 0);
    shape.lineTo(-1.4, -1.3);
    shape.closePath();
    this.body = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: 0xaffbff })
    );
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 24),
      new THREE.MeshBasicMaterial({ color: 0x1a6f8a, transparent: true, opacity: 0.35 })
    );
    halo.position.z = -0.5;
    this.group.add(halo);
    this.group.add(this.body);
    this.group.position.z = 2;
    scene.add(this.group);
  }

  reset() {
    this.pos.set(0, 0);
    this.vel.set(BASE_SPEED, 0);
    this.heading = 0;
    this.hp = 3;
    this.invuln = 0;
  }

  update(dt: number, input: THREE.Vector2) {
    const mag = Math.min(1, input.length());
    if (mag > 0.15) {
      const target = Math.atan2(input.y, input.x);
      let diff = target - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const step = TURN_RATE * dt;
      this.heading += THREE.MathUtils.clamp(diff, -step, step);
    }

    const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (mag > 0.15 ? mag : 0);
    const want = new THREE.Vector2(Math.cos(this.heading), Math.sin(this.heading)).multiplyScalar(speed);
    const k = 1 - Math.exp(-dt * SMOOTH);
    this.vel.lerp(want, k);
    this.pos.addScaledVector(this.vel, dt);

    // Bords : glissement doux le long des parois
    if (Math.abs(this.pos.x) > ARENA.hw - 2) {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, -(ARENA.hw - 2), ARENA.hw - 2);
      this.vel.x *= -0.25;
    }
    if (Math.abs(this.pos.y) > ARENA.hh - 2) {
      this.pos.y = THREE.MathUtils.clamp(this.pos.y, -(ARENA.hh - 2), ARENA.hh - 2);
      this.vel.y *= -0.25;
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.group.position.set(this.pos.x, this.pos.y, 2);
    this.group.rotation.z = Math.atan2(this.vel.y, this.vel.x);
    this.group.visible = this.invuln <= 0 || Math.floor(this.invuln * 12) % 2 === 0;
  }

  /** Retourne true si le coup a porté (pas d'invulnérabilité en cours). */
  hit(): boolean {
    if (this.invuln > 0) return false;
    this.hp -= 1;
    this.invuln = 1.2;
    return true;
  }
}
