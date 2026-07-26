// Scène Three.js : vue du dessus orthographique, fond « soupe cellulaire »
// (réf. ambiance Nucleus), bloom pour le néon. La musique vit ici : le fond
// pulse avec la basse, la teinte suit l'énergie globale.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const ARENA = { hw: 110, hh: 70 }; // demi-largeur / demi-hauteur

// Zoom out demandé par N4 (2026-07-26, puis +20 %) : anticiper les attaques prime
const VIEW_HH = 72; // demi-hauteur de la vue en unités monde

/** Ce que le monde écoute de la musique et du jeu à chaque frame. */
export interface WorldAudio {
  bass: number; // enveloppe basse instantanée 0..1
  energy: number; // énergie globale 0..1
  intensity: number; // intensité lissée (chef d'orchestre)
  mid: number; // enveloppe médiums (nappes, leads) — guide la direction du voyage
  danger: number; // pression du jeu 0..1 (densité d'ennemis)
}

export class World {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  private bgMat: THREE.ShaderMaterial;
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

    // Fond organique plein écran (coordonnées monde)
    this.bgMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uEnergy: { value: 0 },
        uDrift: { value: new THREE.Vector2() },
        uJourney: { value: 0 },
        uHeat: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vPos;
        void main() {
          vPos = (modelMatrix * vec4(position, 1.0)).xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vPos;
        uniform float uTime, uBass, uEnergy, uJourney, uHeat;
        uniform vec2 uDrift;

        // Cellules molles : deux grilles de disques flous en dérive lente
        float cells(vec2 p, float t) {
          vec2 g = fract(p) - 0.5;
          float d = length(g + 0.14 * vec2(sin(t + p.y), cos(t * 0.8 + p.x)));
          return smoothstep(0.30, 0.10, d);
        }

        void main() {
          // Le voyage : la soupe défile (uDrift), la couche lointaine défile
          // moins vite (parallaxe) — on traverse un organisme, pas une arène
          vec2 p = (vPos + uDrift) * 0.045;
          vec2 pFar = (vPos + uDrift * 0.45) * 0.085 + 31.7;
          float t = uTime * 0.12;
          float c1 = cells(p, t);
          float c2 = cells(pFar, -t * 1.4);

          // Rester sombre : la lisibilité prime, le néon appartient aux entités
          vec3 deep = vec3(0.008, 0.018, 0.045);
          // La palette voyage lentement avec la distance parcourue (bleu↔teal↔violet)
          float j = 0.5 + 0.5 * sin(uJourney);
          vec3 tint = mix(vec3(0.010, 0.045, 0.065), vec3(0.030, 0.022, 0.075), j);
          tint = mix(tint, vec3(0.014, 0.052, 0.048), uEnergy * 0.5);
          // Les eaux chauffent quand c'est dangereux — souple et lent (uHeat lissé)
          deep = mix(deep, vec3(0.042, 0.014, 0.010), uHeat * 0.75);
          tint = mix(tint, vec3(0.085, 0.032, 0.016), uHeat * 0.7);
          vec3 col = deep + tint * (c1 * 0.6 + c2 * 0.3);

          // Pulse de basse : les membranes s'illuminent, sans atteindre le bloom
          vec3 pulse = mix(vec3(0.02, 0.07, 0.09), vec3(0.09, 0.035, 0.02), uHeat);
          col += pulse * uBass * uBass * (c1 + 0.15);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), this.bgMat);
    bg.position.z = -10;
    this.scene.add(bg);

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

    this.bgMat.uniforms.uTime.value = time;
    this.bgMat.uniforms.uBass.value = bass;
    this.bgMat.uniforms.uEnergy.value = energy;
    this.bgMat.uniforms.uDrift.value.copy(this.driftPos);
    this.bgMat.uniforms.uJourney.value = this.journey;
    this.bgMat.uniforms.uHeat.value = this.heat;

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
