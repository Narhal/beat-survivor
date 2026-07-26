// Scène Three.js : vue du dessus orthographique, fond « soupe cellulaire »
// (réf. ambiance Nucleus), bloom pour le néon. La musique vit ici : le fond
// pulse avec la basse, dérive avec l'intensité (le voyage), chauffe au danger.
// DA en variantes commutables (touches 1-3) : Plasma / Abysses / Tissu — N4 tranche.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const ARENA = { hw: 110, hh: 70 }; // demi-largeur / demi-hauteur

// Zoom out demandé par N4 (2026-07-26, puis +20 %) : anticiper les attaques prime
const VIEW_HH = 72; // demi-hauteur de la vue en unités monde

export const BG_STYLES = ["Plasma", "Abysses", "Tissu"] as const;

/** Ce que le monde écoute de la musique et du jeu à chaque frame. */
export interface WorldAudio {
  bass: number; // enveloppe basse instantanée 0..1
  energy: number; // énergie globale 0..1
  intensity: number; // intensité lissée (chef d'orchestre)
  mid: number; // enveloppe médiums (nappes, leads) — guide la direction du voyage
  danger: number; // pression du jeu 0..1 (densité d'ennemis)
}

const BG_VERTEX = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = (modelMatrix * vec4(position, 1.0)).xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG_COMMON = /* glsl */ `
  varying vec2 vPos;
  uniform float uTime, uBass, uEnergy, uJourney, uHeat;
  uniform vec2 uDrift;
`;

// ——— Variante 1 : PLASMA — cellules molles en dérive, l'actuel raffiné ———
const FRAG_PLASMA = FRAG_COMMON + /* glsl */ `
  float cells(vec2 p, float t) {
    vec2 g = fract(p) - 0.5;
    float d = length(g + 0.14 * vec2(sin(t + p.y), cos(t * 0.8 + p.x)));
    return smoothstep(0.30, 0.10, d);
  }

  void main() {
    // Le voyage : la soupe défile (uDrift), la couche lointaine en parallaxe
    vec2 p = (vPos + uDrift) * 0.045;
    vec2 pFar = (vPos + uDrift * 0.45) * 0.085 + 31.7;
    float t = uTime * 0.12;
    float c1 = cells(p, t);
    float c2 = cells(pFar, -t * 1.4);

    vec3 deep = vec3(0.008, 0.018, 0.045);
    float j = 0.5 + 0.5 * sin(uJourney);
    vec3 tint = mix(vec3(0.010, 0.045, 0.065), vec3(0.030, 0.022, 0.075), j);
    tint = mix(tint, vec3(0.014, 0.052, 0.048), uEnergy * 0.5);
    deep = mix(deep, vec3(0.042, 0.014, 0.010), uHeat * 0.75);
    tint = mix(tint, vec3(0.085, 0.032, 0.016), uHeat * 0.7);
    vec3 col = deep + tint * (c1 * 0.6 + c2 * 0.3);

    vec3 pulse = mix(vec3(0.02, 0.07, 0.09), vec3(0.09, 0.035, 0.02), uHeat);
    col += pulse * uBass * uBass * (c1 + 0.15);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ——— Variante 2 : ABYSSES — presque noir, faisceaux de microscope, particules ———
const FRAG_ABYSSES = FRAG_COMMON + /* glsl */ `
  float dots(vec2 q, float s) {
    vec2 g = fract(q) - 0.5;
    float d = length(g + 0.25 * vec2(sin(uTime * 0.3 + q.y * 2.0), cos(uTime * 0.22 + q.x * 1.7)));
    return smoothstep(s, s * 0.3, d);
  }

  void main() {
    vec2 p1 = (vPos + uDrift) * 0.06;
    vec2 p2 = (vPos + uDrift * 0.5) * 0.12 + 17.3;
    float d1 = dots(p1, 0.10);
    float d2 = dots(p2, 0.055);

    // Faisceaux diagonaux qui balaient lentement — la lumière du microscope
    float beamCoord = (vPos.x + uDrift.x * 0.3) * 0.020 + vPos.y * 0.008;
    float beam = pow(0.5 + 0.5 * sin(beamCoord * 6.2831 + uTime * 0.15 + uJourney), 3.0);

    vec3 deep = mix(vec3(0.003, 0.008, 0.020), vec3(0.030, 0.008, 0.008), uHeat * 0.8);
    vec3 beamCol = mix(vec3(0.012, 0.035, 0.050), vec3(0.055, 0.022, 0.012), uHeat) * (0.6 + uEnergy * 0.7);
    vec3 dotCol = mix(vec3(0.10, 0.16, 0.18), vec3(0.20, 0.10, 0.06), uHeat);

    vec3 col = deep + beamCol * beam + dotCol * (d1 * 0.35 + d2 * 0.2) * (0.5 + beam);
    col += vec3(0.015, 0.05, 0.06) * uBass * uBass * (0.3 + beam);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ——— Variante 3 : TISSU — membranes réticulées, vaisseaux, l'organisme littéral ———
const FRAG_TISSU = FRAG_COMMON + /* glsl */ `
  vec2 wob(vec2 q, float t) {
    return vec2(sin(t + q.y), cos(t * 0.7 + q.x)) * 0.15;
  }
  float vein(vec2 q, float t) {
    vec2 g = fract(q) - 0.5;
    float d = length(g + wob(q, t));
    return smoothstep(0.028, 0.0, abs(d - 0.34));
  }
  float cellsT(vec2 q, float t) {
    vec2 g = fract(q) - 0.5;
    float d = length(g + wob(q, t));
    return smoothstep(0.30, 0.05, d);
  }

  void main() {
    // Motif large et calme — la lisibilité prime, les veines restent discrètes
    vec2 p = (vPos + uDrift) * 0.030;
    vec2 pf = (vPos + uDrift * 0.45) * 0.055 + 31.7;
    float t = uTime * 0.1;
    float v1 = vein(p, t);
    float v2 = vein(pf, -t * 1.3);
    float c1 = cellsT(p, t);

    // Chair sombre, chaude par nature, plus chaude encore au danger
    float j = 0.5 + 0.5 * sin(uJourney * 0.8);
    vec3 flesh = mix(vec3(0.018, 0.008, 0.013), vec3(0.013, 0.011, 0.021), j);
    flesh = mix(flesh, vec3(0.034, 0.010, 0.007), uHeat * 0.8);
    vec3 veinCol = mix(vec3(0.035, 0.012, 0.020), vec3(0.055, 0.018, 0.009), uHeat)
      * (0.35 + uBass * 0.5 + uEnergy * 0.2);

    vec3 col = flesh + flesh * c1 * 0.4 + veinCol * (v1 + v2 * 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class World {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  styleIndex = 0;

  private bgUniforms: Record<string, THREE.IUniform>;
  private bgMats: THREE.ShaderMaterial[];
  private bg: THREE.Mesh;
  private walls: THREE.LineSegments;
  private zoomKick = 0;
  // Le voyage : la soupe défile sous l'arène, poussée par l'énergie du morceau
  private driftAngle = Math.random() * Math.PI * 2;
  private driftPos = new THREE.Vector2();
  private journey = 0; // distance parcourue — fait voyager la palette
  private heat = 0; // 0 = eaux froides, 1 = zone dangereuse (souple, lent)

  constructor(canvas: HTMLCanvasElement) {
    // preserveDrawingBuffer : permet la capture du canvas (tests, photos de run)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -VIEW_HH * aspect, VIEW_HH * aspect, VIEW_HH, -VIEW_HH, 0.1, 100
    );
    this.camera.position.set(0, 0, 50);

    this.bgUniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uEnergy: { value: 0 },
      uDrift: { value: new THREE.Vector2() },
      uJourney: { value: 0 },
      uHeat: { value: 0 },
    };
    // Un matériau par variante, tous branchés sur les MÊMES uniforms
    this.bgMats = [FRAG_PLASMA, FRAG_ABYSSES, FRAG_TISSU].map(
      (fs) =>
        new THREE.ShaderMaterial({
          uniforms: this.bgUniforms,
          vertexShader: BG_VERTEX,
          fragmentShader: fs,
          depthWrite: false,
        })
    );
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), this.bgMats[0]);
    this.bg.position.z = -10;
    this.scene.add(this.bg);

    // Parois de l'arène
    const w = ARENA.hw, h = ARENA.hh;
    const pts = [
      new THREE.Vector3(-w, -h, 0), new THREE.Vector3(w, -h, 0),
      new THREE.Vector3(w, -h, 0), new THREE.Vector3(w, h, 0),
      new THREE.Vector3(w, h, 0), new THREE.Vector3(-w, h, 0),
      new THREE.Vector3(-w, h, 0), new THREE.Vector3(-w, -h, 0),
    ];
    const wallGeo = new THREE.BufferGeometry().setFromPoints(pts);
    this.walls = new THREE.LineSegments(
      wallGeo,
      new THREE.LineBasicMaterial({ color: 0x2fb8d8 })
    );
    this.scene.add(this.walls);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.5, 0.5)
    );
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  /** Change la variante de DA (0 = Plasma, 1 = Abysses, 2 = Tissu). */
  setStyle(index: number) {
    this.styleIndex = ((index % this.bgMats.length) + this.bgMats.length) % this.bgMats.length;
    this.bg.material = this.bgMats[this.styleIndex];
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    this.camera.left = -VIEW_HH * aspect;
    this.camera.right = VIEW_HH * aspect;
    this.camera.top = VIEW_HH;
    this.camera.bottom = -VIEW_HH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  /** Coup de zoom organique sur les gros onsets de basse. */
  kick(strength: number) {
    this.zoomKick = Math.min(1, this.zoomKick + strength * 0.7);
  }

  update(dt: number, time: number, audio: WorldAudio, target: THREE.Vector2) {
    const { bass, energy, intensity, mid, danger } = audio;

    // Le voyage : vitesse de dérive ∝ intensité (calme = lent, intense = rapide),
    // direction infléchie par les nappes/leads (bande médiums)
    const driftSpeed = 3 + intensity * 17;
    this.driftAngle += (mid - 0.45) * 0.9 * dt + Math.sin(time * 0.07) * 0.06 * dt;
    this.driftPos.x += Math.cos(this.driftAngle) * driftSpeed * dt;
    this.driftPos.y += Math.sin(this.driftAngle) * driftSpeed * dt;
    this.journey += driftSpeed * dt * 0.012;

    // Chaleur du danger : lissée fort (~4 s) pour rester souple
    const heatTarget = Math.max(intensity * 0.65, danger);
    this.heat += (heatTarget - this.heat) * (1 - Math.exp(-dt * 0.45));

    this.bgUniforms.uTime.value = time;
    this.bgUniforms.uBass.value = bass;
    this.bgUniforms.uEnergy.value = energy;
    (this.bgUniforms.uDrift.value as THREE.Vector2).copy(this.driftPos);
    this.bgUniforms.uJourney.value = this.journey;
    this.bgUniforms.uHeat.value = this.heat;

    const wallMat = this.walls.material as THREE.LineBasicMaterial;
    wallMat.color.setHSL(
      Math.max(0.02, 0.53 - energy * 0.08 - this.heat * 0.4),
      0.9,
      0.28 + bass * 0.35
    );

    // Caméra : suit le vaisseau, bornée à l'arène
    const aspect = window.innerWidth / window.innerHeight;
    const maxX = Math.max(0, ARENA.hw - VIEW_HH * aspect);
    const maxY = Math.max(0, ARENA.hh - VIEW_HH);
    const cx = THREE.MathUtils.clamp(target.x, -maxX, maxX);
    const cy = THREE.MathUtils.clamp(target.y, -maxY, maxY);
    this.camera.position.x += (cx - this.camera.position.x) * Math.min(1, dt * 5);
    this.camera.position.y += (cy - this.camera.position.y) * Math.min(1, dt * 5);

    this.zoomKick = Math.max(0, this.zoomKick - dt * 3.5);
    this.camera.zoom = 1 + this.zoomKick * 0.045;
    this.camera.updateProjectionMatrix();

    this.composer.render();
  }
}
