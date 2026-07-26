// Scène Three.js : vue du dessus orthographique, fond « soupe cellulaire »
// (réf. ambiance Nucleus), bloom pour le néon. La musique vit ici : le fond
// pulse avec la basse, la teinte suit l'énergie globale.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const ARENA = { hw: 110, hh: 70 }; // demi-largeur / demi-hauteur

const VIEW_HH = 44; // demi-hauteur de la vue en unités monde

export class World {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  private bgMat: THREE.ShaderMaterial;
  private walls: THREE.LineSegments;
  private zoomKick = 0;

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
        uniform float uTime, uBass, uEnergy;

        // Cellules molles : deux grilles de disques flous en dérive lente
        float cells(vec2 p, float t) {
          vec2 g = fract(p) - 0.5;
          float d = length(g + 0.14 * vec2(sin(t + p.y), cos(t * 0.8 + p.x)));
          return smoothstep(0.30, 0.10, d);
        }

        void main() {
          vec2 p = vPos * 0.045;
          float t = uTime * 0.12;
          float c1 = cells(p, t);
          float c2 = cells(p * 1.9 + 31.7, -t * 1.4);

          // Rester sombre : la lisibilité prime, le néon appartient aux entités
          vec3 deep = vec3(0.008, 0.018, 0.045);
          vec3 tint = mix(vec3(0.010, 0.045, 0.065), vec3(0.030, 0.022, 0.075), uEnergy);
          vec3 col = deep + tint * (c1 * 0.6 + c2 * 0.3);

          // Pulse de basse : les membranes s'illuminent, sans atteindre le bloom
          col += vec3(0.02, 0.07, 0.09) * uBass * uBass * (c1 + 0.15);

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

  update(dt: number, time: number, bass: number, energy: number, target: THREE.Vector2) {
    this.bgMat.uniforms.uTime.value = time;
    this.bgMat.uniforms.uBass.value = bass;
    this.bgMat.uniforms.uEnergy.value = energy;

    const wallMat = this.walls.material as THREE.LineBasicMaterial;
    wallMat.color.setHSL(0.53 - energy * 0.08, 0.9, 0.28 + bass * 0.35);

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
