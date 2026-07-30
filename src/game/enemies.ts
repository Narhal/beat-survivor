// Les ennemis SONT la musique : chaque bande de fréquence a ses espèces.
// Bestiaire micro-organique (réf. Nucleus) — 6 espèces, comportements
// spécifiques (tous ne chassent pas le joueur), les coriaces n'apparaissent
// que tard dans la run (la progression débloque les TYPES — note N4 2026-07-28).
//
//   basse   → globule (chasseur)          / colosse (tank, se scinde) [tardif]
//   médiums → méduse (dérive sinueuse)    / kyste (mine dérivante)    [médian]
//   aigus   → dard (trajectoire droite)   / moucherons (essaim)       [médian+]

import * as THREE from "three";
import { ARENA } from "./world";
import { glowMaterial } from "./glow";

export type EnemyKind = "globule" | "meduse" | "dard" | "kyste" | "moucheron" | "colosse";

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
  kyste: { color: 0xffa050, radius: 2.2, hp: 2, speed: 3, xp: 2, score: 25 },
  moucheron: { color: 0x7dffea, radius: 0.8, hp: 1, speed: 21, xp: 1, score: 8 },
  colosse: { color: 0xd02858, radius: 4.6, hp: 14, speed: 5, xp: 8, score: 80 },
};

export interface Enemy {
  kind: EnemyKind;
  pos: THREE.Vector2;
  dir: THREE.Vector2; // dards : trajectoire figée ; kystes : cap de dérive
  hp: number;
  radius: number;
  speed: number;
  phase: number;
  baseScale: number;
  spriteRot: number; // offset d'angle du sprite Midjourney (0 en vectoriel)
  telegraph: number; // kyste : compte à rebours avant éclatement
  /** Colosse : instant (temps-morceau) de l'auto-explosion, calé sur un beat
   *  par main. 0 = repli sur COLOSSE_LIFE. */
  deadline: number;
  mesh: THREE.Mesh;
  orbHitCd: number; // anti-spam dégâts de contact des orbes
  tentHitCd: number; // idem pour le tentacule
}

/** Sprites Midjourney d'une espèce : textures, blending, échelle, offset d'angle. */
export interface SpriteSet {
  textures: THREE.Texture[];
  additive: boolean; // bioluminescent (additif) vs translucide (alpha-luminance)
  scale: number; // le sujet ne remplit pas le cadre : facteur de compensation
  rotOffset: number; // le sprite ne pointe pas exactement +X : correction
}

const MAX_ENEMIES = 150;
/** Le mastodonte explose de lui-même après ce temps à l'écran (idée N4). */
const COLOSSE_LIFE = 12;
/** Éclatement du kyste : rayon et dégâts de l'AoE — contre les ENNEMIS. */
const KYSTE_AOE_RADIUS = 13;
const KYSTE_AOE_DMG = 6;

/** Effets remontés à main (visuels, sons, crédit des kills). */
export interface EnemyFx {
  onKill?: (e: Enemy) => void;
  onPop?: (pos: THREE.Vector2, kind: EnemyKind) => void;
}

/** Blob organique irrégulier (silhouette vivante, pas un cercle parfait). */
function blobGeometry(points: number, wobble: number, seed: number): THREE.ShapeGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = 1 + Math.sin(seed + i * 2.4) * wobble + Math.cos(seed * 1.7 + i * 3.1) * wobble * 0.6;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  shape.splineThru([...pts.slice(1), pts[0]]);
  return new THREE.ShapeGeometry(shape);
}

/** Méduse : dôme vers +X (l'avant), tentilles qui traînent derrière. */
function meduseGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.15, 0.85);
  s.quadraticCurveTo(1.15, 0, 0.15, -0.85);
  s.lineTo(-0.85, -0.65);
  s.lineTo(-0.35, -0.32);
  s.lineTo(-1.05, -0.05);
  s.lineTo(-0.35, 0.22);
  s.lineTo(-0.85, 0.6);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

/** Dard : flagelle effilé pointé vers +X. */
function dardGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(1.5, 0);
  s.lineTo(-0.3, 0.45);
  s.lineTo(-1.1, 0);
  s.lineTo(-0.3, -0.45);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

/** Kyste : mine molle à pointes douces. */
function kysteGeometry(): THREE.ShapeGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.72;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  shape.splineThru([...pts.slice(1), pts[0]]);
  return new THREE.ShapeGeometry(shape);
}

/** Ces espèces s'orientent dans le sens de leur déplacement. */
const ORIENTED: Set<EnemyKind> = new Set(["meduse", "dard", "moucheron"]);

/**
 * Échelle (x, y) du halo relative au corps — serré sur la silhouette.
 * Le dard a un halo étiré le long de sa course, pas un rond.
 */
// Ultra-fin (verdict N4 ×2) : le halo vit SOUS la silhouette, en liseré —
// une bioluminescence intérieure, jamais une aura qui déborde.
const HALO_SCALE: Partial<Record<EnemyKind, [number, number]>> = {
  dard: [0.95, 0.3],
  moucheron: [0.55, 0.45],
  meduse: [0.52, 0.48],
  kyste: [0.6, 0.6],
  colosse: [0.7, 0.7],
};
const HALO_DEFAULT: [number, number] = [0.6, 0.6];

export class Enemies {
  list: Enemy[] = [];
  /** true = sprites Midjourney (si fournis), false = silhouettes vectorielles. */
  spritesEnabled = true;
  private sprites: Partial<Record<EnemyKind, SpriteSet>> = {};
  private spriteGeo = new THREE.PlaneGeometry(2, 2);
  private spriteMats = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
  private scene: THREE.Scene;
  private geos: Record<EnemyKind, THREE.BufferGeometry>;
  private mats: Record<EnemyKind, THREE.MeshBasicMaterial>;
  private pool: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geos = {
      globule: blobGeometry(10, 0.15, 3),
      meduse: meduseGeometry(),
      dard: dardGeometry(),
      kyste: kysteGeometry(),
      moucheron: new THREE.CircleGeometry(1, 3),
      colosse: blobGeometry(12, 0.2, 7),
    };
    this.mats = Object.fromEntries(
      (Object.keys(ENEMY_DEFS) as EnemyKind[]).map((k) => [
        k,
        new THREE.MeshBasicMaterial({ color: ENEMY_DEFS[k].color }),
      ])
    ) as Record<EnemyKind, THREE.MeshBasicMaterial>;
  }

  setSprites(kind: EnemyKind, set: SpriteSet) {
    this.sprites[kind] = set;
  }

  private haloMats: Partial<Record<EnemyKind, THREE.MeshBasicMaterial>> = {};

  private haloFor(kind: EnemyKind): THREE.MeshBasicMaterial {
    let mat = this.haloMats[kind];
    if (!mat) {
      mat = glowMaterial(ENEMY_DEFS[kind].color, 0.85);
      this.haloMats[kind] = mat;
    }
    return mat;
  }

  private matFor(tex: THREE.Texture, additive: boolean): THREE.MeshBasicMaterial {
    let mat = this.spriteMats.get(tex);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.spriteMats.set(tex, mat);
    }
    return mat;
  }

  /**
   * Spawn sur le bord, à l'écart du joueur — sauf le kyste : lui apparaît
   * n'importe où DANS l'arène (idée N4), stationnaire, loin du joueur.
   */
  spawn(kind: EnemyKind, player: THREE.Vector2, strength: number, difficulty: number, speedScale = 1) {
    const pos = kind === "kyste" ? this.interiorPoint(player) : this.edgePoint(player);
    this.add(kind, pos, player, strength, difficulty, speedScale);
  }

  private interiorPoint(player: THREE.Vector2): THREE.Vector2 {
    let pos = new THREE.Vector2();
    for (let tries = 0; tries < 10; tries++) {
      pos.set(
        (Math.random() * 2 - 1) * (ARENA.hw - 8),
        (Math.random() * 2 - 1) * (ARENA.hh - 8)
      );
      if (pos.distanceTo(player) > 28) break;
    }
    return pos;
  }

  /** Escouade : plusieurs individus depuis le MÊME point du bord (essaims). */
  squad(kind: EnemyKind, player: THREE.Vector2, count: number, strength: number, difficulty: number, speedScale = 1) {
    const pos = this.edgePoint(player);
    for (let i = 0; i < count; i++) {
      const p = pos.clone().add(new THREE.Vector2((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6));
      this.add(kind, p, player, strength, difficulty, speedScale);
    }
  }

  /** Apparition sur place, en éventail vers une cible (éclatement du kyste). */
  burstAt(kind: EnemyKind, at: THREE.Vector2, target: THREE.Vector2, count: number, speedScale = 1) {
    for (let i = 0; i < count; i++) {
      const p = at.clone().add(new THREE.Vector2((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3));
      this.add(kind, p, target, 0.6, 1, speedScale, (i - (count - 1) / 2) * 0.45);
    }
  }

  /**
   * Éclatement radial (le colosse) : count ennemis partent en étoile depuis
   * un point, chacun en ligne droite vers l'extérieur de l'arène.
   */
  emitRadial(kind: EnemyKind, at: THREE.Vector2, count: number, speedScale = 1) {
    const base = Math.random() * Math.PI * 2;
    for (let k = 0; k < count; k++) {
      const a = base + (k * Math.PI * 2) / count;
      const target = at.clone().add(new THREE.Vector2(Math.cos(a), Math.sin(a)));
      this.add(kind, at.clone(), target, 0.6, 1, speedScale);
    }
  }

  private edgePoint(player: THREE.Vector2): THREE.Vector2 {
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
    return pos;
  }

  private add(
    kind: EnemyKind,
    pos: THREE.Vector2,
    target: THREE.Vector2,
    strength: number,
    difficulty: number,
    speedScale: number,
    dirSpread = 0
  ) {
    if (this.list.length >= MAX_ENEMIES) return;
    const def = ENEMY_DEFS[kind];
    const scale = 0.8 + strength * 0.5;

    // Cap initial : vers la cible (dards, moucherons), aléatoire pour les
    // kystes (dériveurs) ; le colosse TRAVERSE l'arène en ligne droite,
    // indifférent au joueur (verdict N4 : un mastodonte, pas un chasseur)
    let dir: THREE.Vector2;
    if (kind === "kyste") {
      const a = Math.random() * Math.PI * 2;
      dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    } else if (kind === "colosse") {
      const interior = new THREE.Vector2(
        (Math.random() * 2 - 1) * ARENA.hw * 0.5,
        (Math.random() * 2 - 1) * ARENA.hh * 0.5
      );
      dir = interior.sub(pos).normalize();
    } else {
      dir = new THREE.Vector2().subVectors(target, pos).normalize();
      if (dirSpread !== 0) dir.rotateAround(new THREE.Vector2(), dirSpread);
    }

    const mesh = this.pool.pop() ?? new THREE.Mesh();
    const sp = this.spritesEnabled ? this.sprites[kind] : undefined;
    let baseScale = def.radius * scale;
    let spriteRot = 0;
    if (sp && sp.textures.length > 0) {
      mesh.geometry = this.spriteGeo;
      mesh.material = this.matFor(
        sp.textures[Math.floor(Math.random() * sp.textures.length)],
        sp.additive
      );
      baseScale *= sp.scale;
      spriteRot = sp.rotOffset;
    } else {
      mesh.geometry = this.geos[kind];
      mesh.material = this.mats[kind];
    }
    // Halo de luminescence : détache l'entité du fond, couleur de l'espèce
    let halo = mesh.userData.halo as THREE.Mesh | undefined;
    if (!halo) {
      halo = new THREE.Mesh(this.spriteGeo, this.haloFor(kind));
      halo.position.z = -0.06;
      mesh.userData.halo = halo;
      mesh.add(halo);
    }
    halo.material = this.haloFor(kind);
    const [hx, hy] = HALO_SCALE[kind] ?? HALO_DEFAULT;
    halo.scale.set(hx, hy, 1);

    mesh.scale.setScalar(baseScale);
    mesh.position.set(pos.x, pos.y, 1);
    mesh.visible = true;
    this.scene.add(mesh);

    this.list.push({
      kind,
      pos: pos.clone(),
      dir,
      hp: Math.ceil(def.hp * scale * (1 + (difficulty - 1) * 0.5)),
      radius: def.radius * scale,
      speed: def.speed * (0.9 + Math.random() * 0.2) * (1 + (difficulty - 1) * 0.25) * speedScale,
      phase: Math.random() * Math.PI * 2,
      baseScale,
      spriteRot,
      telegraph: 0,
      deadline: 0,
      mesh,
      orbHitCd: 0,
      tentHitCd: 0,
    });
  }

  update(dt: number, time: number, player: THREE.Vector2, fx?: EnemyFx) {
    const popped: Enemy[] = [];
    const expired: Enemy[] = [];

    for (const e of this.list) {
      e.orbHitCd = Math.max(0, e.orbHitCd - dt);
      e.tentHitCd = Math.max(0, e.tentHitCd - dt);

      switch (e.kind) {
        case "globule": {
          const d = new THREE.Vector2().subVectors(player, e.pos).normalize();
          e.pos.addScaledVector(d, e.speed * dt);
          e.dir.copy(d);
          break;
        }
        case "colosse": {
          // Le mastodonte trace sa route, imperturbable — mais il est
          // instable : il explose SUR UN BEAT (deadline calée par main sur
          // un onset de basse ; N4 : « ce sera du plus bel effet »)
          e.pos.addScaledVector(e.dir, e.speed * dt);
          e.telegraph += dt;
          const boom = e.deadline > 0 ? time >= e.deadline : e.telegraph >= COLOSSE_LIFE;
          if (boom) expired.push(e);
          break;
        }
        case "meduse": {
          const d = new THREE.Vector2().subVectors(player, e.pos).normalize();
          const perp = new THREE.Vector2(-d.y, d.x).multiplyScalar(Math.sin(time * 3 + e.phase) * 0.8);
          const move = d.add(perp).normalize();
          e.pos.addScaledVector(move, e.speed * dt);
          e.dir.copy(move);
          break;
        }
        case "moucheron": {
          const d = new THREE.Vector2().subVectors(player, e.pos).normalize();
          const perp = new THREE.Vector2(-d.y, d.x).multiplyScalar(Math.sin(time * 7 + e.phase) * 1.2);
          const move = d.add(perp).normalize();
          e.pos.addScaledVector(move, e.speed * dt);
          e.dir.copy(move);
          break;
        }
        case "dard": {
          e.pos.addScaledVector(e.dir, e.speed * dt);
          break;
        }
        case "kyste": {
          // Mine STATIONNAIRE posée dans l'arène (idée N4). Le joueur qui
          // s'approche la fait télégrapher puis éclater — et l'éclatement
          // blesse les ENNEMIS alentour : c'est un outil tactique à déclencher.
          if (e.pos.distanceTo(player) < 12) {
            e.telegraph += dt;
            if (e.telegraph >= 0.9) popped.push(e);
          } else {
            e.telegraph = Math.max(0, e.telegraph - dt * 1.5);
          }
          break;
        }
      }

      e.mesh.position.set(e.pos.x, e.pos.y, 1);
      if (ORIENTED.has(e.kind)) {
        e.mesh.rotation.z = Math.atan2(e.dir.y, e.dir.x) + e.spriteRot;
        e.mesh.scale.setScalar(e.baseScale);
      } else if (e.kind === "kyste") {
        e.mesh.rotation.z = time * 0.4 + e.phase;
        // Télégraphe : pulsation de plus en plus violente avant l'éclatement
        e.mesh.scale.setScalar(e.baseScale * (1 + e.telegraph * 0.5 * (1 + Math.sin(time * 22))));
      } else {
        e.mesh.rotation.z = time * 0.6 + e.phase;
        // Le mastodonte proche de l'explosion pulse de plus en plus fort
        const timeLeft =
          e.kind === "colosse"
            ? (e.deadline > 0 ? e.deadline - time : COLOSSE_LIFE - e.telegraph)
            : Infinity;
        const urgency = Math.min(1, Math.max(0, (3 - timeLeft) / 3));
        e.mesh.scale.setScalar(
          e.baseScale * (1 + (0.06 + urgency * 0.2) * Math.sin(time * (2.8 + urgency * 14) + e.phase))
        );
      }
    }

    // Kystes déclenchés : AoE contre les ennemis alentour (le joueur est épargné)
    for (const e of popped) {
      const i = this.list.indexOf(e);
      if (i < 0) continue;
      this.remove(i);
      fx?.onPop?.(e.pos, "kyste");
      for (let j = this.list.length - 1; j >= 0; j--) {
        const o = this.list[j];
        if (o.pos.distanceTo(e.pos) < KYSTE_AOE_RADIUS) {
          o.hp -= KYSTE_AOE_DMG;
          if (o.hp <= 0) {
            fx?.onKill?.(o);
            this.remove(j);
          }
        }
      }
    }

    // Mastodontes périmés : explosion spontanée en étoile de dards
    for (const e of expired) {
      const i = this.list.indexOf(e);
      if (i < 0) continue;
      this.remove(i);
      fx?.onPop?.(e.pos, "colosse");
      this.emitRadial("dard", e.pos, 6, 1.05);
    }

    // Les dards, moucherons et colosses sortis de l'arène disparaissent
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (
        (e.kind === "dard" || e.kind === "moucheron" || e.kind === "colosse") &&
        (Math.abs(e.pos.x) > ARENA.hw + 8 || Math.abs(e.pos.y) > ARENA.hh + 8)
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
