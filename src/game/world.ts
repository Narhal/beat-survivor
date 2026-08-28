// Scène Three.js : vue du dessus orthographique, fond « soupe cellulaire »
// (réf. ambiance Nucleus), bloom pour le néon. La musique vit ici : le fond
// pulse avec la basse, dérive avec l'intensité (le voyage), chauffe au danger.
// Deux milieux : Plasma et Tissu. Une run tire le sien à la plongée et s'y tient —
// mélanger le shader d'un milieu et la texture de l'autre fabriquait un troisième
// look que personne n'avait demandé (N4 2026-08-28).

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Arène doublée le 2026-07-30, puis réduite de 30 % le 2026-08-02 (N4) :
// assez vaste pour voyager, assez resserrée pour que l'action se croise.
// (puis −10 % le 2026-08-02) — elle doit rester plus grande que la vue :
// à 16/9 on en voit 128 × 72, il faut garder une marge hors champ.
export const ARENA = { hw: 139, hh: 88 }; // demi-largeur / demi-hauteur

// Zoom out demandé par N4 (2026-07-26, puis +20 %) : anticiper les attaques prime
export const VIEW_HH = 72; // demi-hauteur de la vue en unités monde

// Abysses écartée par N4 (2026-07-28) : pas assez de variance ni de texture
export const BG_STYLES = ["Plasma", "Tissu"] as const;

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
  uniform vec2 uDrift, uView;

  /**
   * Caustiques : le réseau de lumière qu'une surface d'eau agitée projette
   * au fond. Deux trains de vagues croisés — mais on ne garde QUE les
   * crêtes (puissance 7). Sans ce seuil dur on obtiendrait un voile, et un
   * voile c'est exactement le laiteux qu'on a chassé. Là, c'est un filet de
   * lumière sur du noir.
   */
  float caustic(vec2 q, float t) {
    float a = sin(q.x * 1.7 + t) + sin(q.y * 1.3 - t * 0.8);
    float b = sin((q.x + q.y) * 1.1 + t * 1.3) + sin((q.x - q.y) * 0.9 - t);
    float v = (a + b) * 0.25 + 0.5;
    return pow(max(0.0, v), 7.0);
  }

  /**
   * Le fond du volume : les bords s'assombrissent. Ce n'est pas un cache
   * décoratif — c'est ce qui dit qu'on est DANS quelque chose, et ça pousse
   * l'œil vers le centre, là où se joue la partie.
   */
  float profondeur(vec2 pos) {
    float d = length(pos / uView);
    return 1.0 - 0.62 * pow(clamp(d, 0.0, 1.4), 2.0);
  }
`;

// Couches de textures Midjourney (masters de N4) : dérive en parallaxe,
// teintées par le jeu (palette voyageuse + chaleur), fondues en additif.
const FRAG_LAYER = /* glsl */ `
  varying vec2 vPos;
  uniform sampler2D uMap;
  uniform vec2 uDrift;
  uniform float uParallax, uTile, uOpacity, uDepth;
  uniform vec3 uTint;
  void main() {
    vec2 uv = (vPos + uDrift * uParallax) / uTile;
    // La texture est encodée en sRGB ; un ShaderMaterial ne la décode pas tout
    // seul. Lue telle quelle, un gris moyen vaut 0.5 au lieu de 0.21 — la
    // couche entière arriverait deux fois trop claire.
    vec3 tex = pow(texture2D(uMap, uv).rgb, vec3(2.2));
    float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));

    // On ne lisait QUE le canal vert, comme une luminance, et on repeignait
    // le tout d'une teinte unie : toute la couleur des masters de N4 partait
    // à la poubelle (verdict 2026-08-28 : « les sprites sont beaux mais pas
    // assez bien exploités »). On garde désormais leur couleur, et la palette
    // du jeu ne fait plus que la faire voyager.
    //
    // uDepth range les plans : plus une couche est loin, plus elle se
    // désature et rejoint le bleu du milieu. C'est la perspective aérienne —
    // sous l'eau, le lointain perd ses couleurs avant de perdre ses formes.
    vec3 col = mix(tex, vec3(lum), uDepth * 0.8);
    col = mix(col, uTint * (0.35 + lum), 0.5 + uDepth * 0.25);

    gl_FragColor = vec4(col, lum * uOpacity);
  }
`;

// ——— Variante 1 : PLASMA — cellules molles en dérive, l'actuel raffiné ———
const FRAG_PLASMA = FRAG_COMMON + /* glsl */ `
  float cells(vec2 p, float t) {
    vec2 g = fract(p) - 0.5;
    float d = length(g + 0.14 * vec2(sin(t + p.y), cos(t * 0.8 + p.x)));
    // Cellules resserrées : étalées, elles couvraient tout le cadre d'un
    // treillis pâle — la « couche laiteuse ». Elles respirent, elles ne
    // tapissent plus.
    return smoothstep(0.26, 0.07, d);
  }

  void main() {
    // Le voyage : la soupe défile (uDrift), la couche lointaine en parallaxe
    vec2 p = (vPos + uDrift) * 0.045;
    vec2 pFar = (vPos + uDrift * 0.45) * 0.085 + 31.7;
    float t = uTime * 0.12;
    float c1 = cells(p, t);
    float c2 = cells(pFar, -t * 1.4);

    // La soupe descend d'un cran (verdict N4 : « une couche laiteuse sur toute
    // la surface, j'ai besoin de beaucoup plus de contraste »). Un fond qui
    // vit à mi-gris écrase tout ce qui se joue devant : le socle est divisé
    // par deux, les cellules et la pulsion de basse par presque autant. Le
    // fond appartient à l'ambiance, la lueur appartient au gameplay.
    vec3 deep = vec3(0.004, 0.009, 0.022);
    float j = 0.5 + 0.5 * sin(uJourney);
    vec3 tint = mix(vec3(0.004, 0.017, 0.025), vec3(0.011, 0.008, 0.028), j);
    tint = mix(tint, vec3(0.005, 0.020, 0.018), uEnergy * 0.5);
    deep = mix(deep, vec3(0.021, 0.007, 0.005), uHeat * 0.75);
    tint = mix(tint, vec3(0.032, 0.012, 0.006), uHeat * 0.7);
    vec3 col = deep + tint * (c1 * 0.6 + c2 * 0.3);

    // La basse ne doit pas relever TOUT l'écran à chaque temps fort
    vec3 pulse = mix(vec3(0.010, 0.034, 0.044), vec3(0.044, 0.017, 0.010), uHeat);
    col += pulse * uBass * uBass * (c1 + 0.15);

    // Le filet de lumière de la surface, très haut au-dessus. Deux échelles
    // qui dérivent l'une sur l'autre : ce décalage lent est ce qui empêche
    // l'œil de voir un motif et lui fait voir de l'EAU.
    vec2 cq = (vPos + uDrift * 0.7) * 0.035;
    float ca = caustic(cq, uTime * 0.35) * 0.7
             + caustic(cq * 1.9 + 11.3, -uTime * 0.22) * 0.3;
    vec3 causCol = mix(vec3(0.10, 0.28, 0.36), vec3(0.30, 0.14, 0.08), uHeat);
    col += causCol * ca * (0.55 + uEnergy * 0.6);

    gl_FragColor = vec4(col * profondeur(vPos), 1.0);
  }
`;

// ——— Variante 2 : TISSU — membranes réticulées, vaisseaux, l'organisme littéral ———
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

    // Dans la chair, la lumière ne vient pas d'une surface : elle SUINTE.
    // Mêmes crêtes, plus lentes, plus larges, plus chaudes.
    vec2 cq = (vPos + uDrift * 0.7) * 0.024;
    float ca = caustic(cq, uTime * 0.20) * 0.75
             + caustic(cq * 2.1 + 4.7, -uTime * 0.13) * 0.25;
    vec3 causCol = mix(vec3(0.16, 0.06, 0.10), vec3(0.30, 0.10, 0.05), uHeat);
    col += causCol * ca * (0.5 + uEnergy * 0.5 + uBass * 0.4);

    gl_FragColor = vec4(col * profondeur(vPos), 1.0);
  }
`;

export class World {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  styleIndex = 0;
  layersEnabled = true;
  /** Les bulles qui remontent — coupables depuis les Options (N4 2026-08-28). */
  bubblesEnabled = true;

  private bgUniforms: Record<string, THREE.IUniform>;
  private bgMats: THREE.ShaderMaterial[];
  private bg: THREE.Mesh;
  private layers: {
    mesh: THREE.Mesh;
    mat: THREE.ShaderMaterial;
    hasTex: boolean;
    fade: number; // 0..1, fondu-enchaîné lors des rotations de textures
    pending: THREE.Texture | null;
  }[] = [];
  private bubbles: { mesh: THREE.Mesh; speed: number; sway: number; phase: number }[] = [];
  private tintColor = new THREE.Color();
  private tintCool = new THREE.Color(0.30, 0.62, 0.75);
  private tintWarm = new THREE.Color(0.85, 0.40, 0.22);
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
      uView: { value: new THREE.Vector2(VIEW_HH, VIEW_HH) },
    };
    // Un matériau par variante, tous branchés sur les MÊMES uniforms
    this.bgMats = [FRAG_PLASMA, FRAG_TISSU].map(
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

    // Deux couches de textures : proche (pleine dérive) et lointaine (parallaxe)
    for (const [parallax, tile, z] of [
      [1.0, 260, -8.5],
      [0.45, 420, -9],
    ] as const) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uDrift: { value: this.driftPos }, // référence partagée : suit le voyage
          uParallax: { value: parallax },
          uTile: { value: tile },
          uOpacity: { value: 0 },
          uDepth: { value: parallax < 0.6 ? 1 : 0 },
          uTint: { value: new THREE.Color() },
        },
        vertexShader: BG_VERTEX,
        fragmentShader: FRAG_LAYER,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), mat);
      mesh.position.z = z;
      mesh.visible = false;
      this.scene.add(mesh);
      this.layers.push({ mesh, mat, hasTex: false, fade: 1, pending: null });
    }

    // Bulles éparses qui remontent (réf. N4 : niveaux aquatiques de DKC2) —
    // la plupart derrière le gameplay, quelques grosses devant, très discrètes
    const bubbleGeo = new THREE.RingGeometry(0.72, 1, 16);
    const mkBubble = (front: boolean) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x9fd8e8,
        transparent: true,
        opacity: front ? 0.10 : 0.20,
      });
      const mesh = new THREE.Mesh(bubbleGeo, mat);
      mesh.position.set(
        (Math.random() * 2 - 1) * (ARENA.hw + 10),
        (Math.random() * 2 - 1) * (ARENA.hh + 8),
        front ? 6 : -7
      );
      mesh.scale.setScalar(front ? 2.5 + Math.random() * 2 : 0.5 + Math.random() * 1.1);
      this.scene.add(mesh);
      this.bubbles.push({
        mesh,
        speed: (front ? 7 : 4) + Math.random() * 3,
        sway: 0.6 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
    };
    for (let i = 0; i < 18; i++) mkBubble(false);
    for (let i = 0; i < 6; i++) mkBubble(true);

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
    // Bloom SERRÉ (verdict N4 : « une couche laiteuse sur toute la surface,
    // on y voit l'ombre des objets — j'ai besoin de beaucoup plus de
    // contraste »). Un rayon large étale la copie floue de la scène sur tout
    // l'écran : c'est ça, le voile et les silhouettes fantômes. Le seuil haut
    // réserve la lueur aux pixels VRAIMENT chauds, le rayon court la garde
    // collée à sa source. Une lueur appartient à l'objet, pas à l'écran.
    this.composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.2, 0.75)
    );
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  /** Change le milieu (0 = Plasma, 1 = Tissu). */
  setStyle(index: number) {
    this.styleIndex = ((index % this.bgMats.length) + this.bgMats.length) % this.bgMats.length;
    this.bg.material = this.bgMats[this.styleIndex];
  }

  /** Branche une texture Midjourney sur une couche (0 = proche, 1 = lointaine). */
  setLayerTexture(slot: 0 | 1, tex: THREE.Texture | null) {
    const layer = this.layers[slot];
    layer.mat.uniforms.uMap.value = tex;
    layer.hasTex = !!tex;
    layer.pending = null;
    layer.mesh.visible = layer.hasTex && this.layersEnabled;
  }

  /** Comme setLayerTexture, mais en fondu-enchaîné (rotation des variantes). */
  crossfadeLayer(slot: 0 | 1, tex: THREE.Texture) {
    const layer = this.layers[slot];
    if (!layer.hasTex) {
      this.setLayerTexture(slot, tex);
      layer.fade = 0; // apparition en fondu
      return;
    }
    layer.pending = tex;
  }

  /** Coupe ou rallume les bulles ; elles gardent leur position en coulisse. */
  setBubbles(on: boolean) {
    this.bubblesEnabled = on;
    for (const b of this.bubbles) b.mesh.visible = on;
  }

  toggleLayers(): boolean {
    this.layersEnabled = !this.layersEnabled;
    for (const l of this.layers) l.mesh.visible = l.hasTex && this.layersEnabled;
    return this.layersEnabled;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    this.camera.left = -VIEW_HH * aspect;
    this.camera.right = VIEW_HH * aspect;
    this.camera.top = VIEW_HH;
    this.camera.bottom = -VIEW_HH;
    this.camera.updateProjectionMatrix();
    // La vignette de profondeur se cadre sur la VUE, pas sur l'arène :
    // elle doit toucher les bords de l'écran quel que soit le format.
    (this.bgUniforms.uView.value as THREE.Vector2).set(VIEW_HH * aspect, VIEW_HH);
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

    // Couches textures : teinte voyageuse qui chauffe, opacité portée par
    // l'énergie, fondu-enchaîné lors des rotations
    this.tintColor.lerpColors(this.tintCool, this.tintWarm, this.heat);
    const breathe = 0.8 + 0.2 * Math.sin(this.journey);
    for (let i = 0; i < this.layers.length; i++) {
      const l = this.layers[i];
      if (l.pending) {
        l.fade -= dt / 0.9;
        if (l.fade <= 0) {
          l.mat.uniforms.uMap.value = l.pending;
          l.pending = null;
        }
      } else if (l.fade < 1) {
        l.fade = Math.min(1, l.fade + dt / 0.9);
      }
      (l.mat.uniforms.uTint.value as THREE.Color).copy(this.tintColor).multiplyScalar(breathe * (i === 0 ? 1 : 0.65));
      // En retrait (×2) : ces couches sont ADDITIVES, elles relèvent les noirs
      // sur toute la surface — c'est du contraste perdu partout pour de
      // l'ambiance nulle part. Le fond ne concurrence jamais les entités.
      l.mat.uniforms.uOpacity.value =
        (i === 0 ? 0.20 + energy * 0.16 : 0.13 + energy * 0.10) * Math.max(0, l.fade);
    }

    // Les bulles remontent, portées par l'intensité, et se rembobinent en bas
    for (const b of this.bubbles) {
      b.mesh.position.y += b.speed * (0.7 + intensity * 0.7) * dt;
      b.mesh.position.x += Math.sin(time * b.sway + b.phase) * 2.5 * dt;
      if (b.mesh.position.y > ARENA.hh + 10) {
        b.mesh.position.y = -ARENA.hh - 10;
        b.mesh.position.x = (Math.random() * 2 - 1) * (ARENA.hw + 10);
      }
    }

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
