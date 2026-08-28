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

  // --- Bruit organique ---
  // fract() posait un RESEAU : une cellule par case, toutes de la meme
  // taille, toutes a la meme distance. C'est ca, les cercles geometriques
  // repartis uniformement que N4 voyait par-dessus ses images (2026-09-04).
  // Un milieu vivant n'a pas de maille. On passe donc a un bruit a valeurs
  // interpolees, empile sur plusieurs octaves : aucune periode visible.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float bruit(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // lissage : pas d'arete entre les cases
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // Quatre octaves : les grandes masses portent les petits details.
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * bruit(p);
      p = p * 2.03 + vec2(17.3, 9.1); // 2,03 et pas 2 : evite l'alignement des octaves
      a *= 0.5;
    }
    return v;
  }
  // Deformation du domaine : c'est elle qui tord tout motif regulier.
  vec2 tord(vec2 p, float t) {
    return p + vec2(fbm(p * 0.5 + t * 0.05), fbm(p * 0.5 + 5.2 - t * 0.04)) * 1.6 - 0.8;
  }

  // Caustiques : le reseau de lumiere qu'une surface d'eau agitee projette
  // au fond. Deux trains de vagues croises sur un domaine TORDU - sans la
  // torsion, l'interference de sinus redevient une grille. On ne garde que
  // les cretes (puissance 7) : sans ce seuil dur on obtient un voile, et un
  // voile c'est le laiteux qu'on a chasse.
  float caustic(vec2 q, float t) {
    vec2 w = tord(q, t);
    float a = sin(w.x * 1.7 + t) + sin(w.y * 1.3 - t * 0.8);
    float b = sin((w.x + w.y) * 1.1 + t * 1.3) + sin((w.x - w.y) * 0.9 - t);
    float v = (a + b) * 0.25 + 0.5;
    return pow(max(0.0, v), 11.0); // 11 et non 7 : des filaments, pas une nappe
  }

  // Rais de lumiere : ce qui descend de la surface, tres haut au-dessus.
  // Ils tombent en biais, s'eteignent vers le bas, et leur largeur respire.
  // C'est le repere vertical du volume - sans lui on flotte dans du noir.
  float rais(vec2 pos, float t) {
    float x = (pos.x + pos.y * 0.42 + uDrift.x * 0.25) * 0.014;
    float s = sin(x * 2.7 + t * 0.09) * sin(x * 1.13 - t * 0.05) + 0.25 * sin(x * 5.3 + t * 0.13);
    // Puissance 11 et non 5 : un rai est un FAISCEAU, une bande étroite de
    // lumière séparée de la suivante par du noir. À la puissance 5 les
    // bandes se touchaient et repeignaient tout le haut de l'écran — le
    // laiteux, encore lui (N4 2026-09-04).
    s = pow(max(0.0, s), 11.0);
    // Brisés par le bruit : un faisceau réel n'a pas une intensité égale
    // sur toute sa longueur, l'eau le mange par endroits
    s *= 0.45 + 0.55 * fbm(vec2(x * 6.0, pos.y * 0.01 - t * 0.06));
    float haut = smoothstep(-0.4, 1.05, pos.y / uView.y); // ils naissent en haut
    return s * haut;
  }

  // Le fond du volume : les bords s'assombrissent. Ce n'est pas un cache
  // decoratif - c'est ce qui dit qu'on est DANS quelque chose, et ca pousse
  // l'oeil vers le centre, la ou se joue la partie.
  float profondeur(vec2 pos) {
    float d = length(pos / uView);
    return 1.0 - 0.78 * pow(clamp(d, 0.0, 1.4), 1.7);
  }
`;

// Couches de textures Midjourney (masters de N4) : dérive en parallaxe,
// teintées par le jeu (palette voyageuse + chaleur), fondues en additif.
const FRAG_LAYER = /* glsl */ `
  varying vec2 vPos;
  uniform sampler2D uMap;
  uniform vec2 uDrift, uView;
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

    // La vignette de profondeur s'applique AUSSI ici. Tant qu'elle ne vivait
    // que dans le socle, les couches additives passaient par-dessus et la
    // remplissaient : mesuré, le bord du Tissu était plus CLAIR que son
    // centre. Le volume s'assombrit en entier, pas seulement son fond.
    float d = length(vPos / uView);
    float vig = 1.0 - 0.78 * pow(clamp(d, 0.0, 1.4), 1.7);

    // Courbe de contraste sur l'alpha de la couche. Trois couches ADDITIVES,
    // c'est trois planchers qui s'additionnent : la seule façon d'avoir du
    // noir au bout, c'est que chacune parte de zéro.
    //
    // Un simple carré ne suffisait pas : les masters Tissu vivent dans une
    // bande étroite de gris moyens, et une puissance les aurait tous éteints
    // ensemble, sans hautes lumières. C'est un réglage de NIVEAUX qu'il faut
    // — on écrase sous le point noir, on étire ce qu'il y a entre, on sature
    // au-dessus du point blanc. Le fond gagne des noirs ET des éclats.
    float a = smoothstep(0.075, 0.55, lum) * uOpacity;

    gl_FragColor = vec4(col * vig, a);
  }
`;

// --- Milieu 1 : PLASMA - la soupe froide, des masses molles en derive ---
const FRAG_PLASMA = FRAG_COMMON + /* glsl */ `
  void main() {
    // Le voyage : la soupe defile (uDrift), le lointain suit en parallaxe.
    // Plus aucune maille : de grandes masses de bruit, tordues sur
    // elles-memes, qui n'ont ni taille ni espacement reguliers.
    vec2 p = (vPos + uDrift) * 0.012;
    vec2 pFar = (vPos + uDrift * 0.45) * 0.022 + 31.7;
    float t = uTime * 0.06;
    float m1 = fbm(tord(p, t));
    float m2 = fbm(pFar + vec2(0.0, t * 0.4));
    // On resserre : les masses respirent, elles ne tapissent pas
    m1 = smoothstep(0.42, 0.78, m1);
    m2 = smoothstep(0.45, 0.85, m2);

    // La soupe reste basse (verdict N4 sur le contraste) : le fond appartient
    // a l'ambiance, la lueur appartient au gameplay.
    // Le noir doit être NOIR (verdict N4 2026-09-04). Ce socle est une
    // couleur unie posée sur CHAQUE pixel : à 0.022 de bleu il s'affichait
    // en (13,24,41) partout, avant même qu'on ait rien dessiné. C'était ça,
    // la couche laiteuse qui revenait — divisé par quatre, il tombe à
    // (4,8,17) et le fond retrouve un vrai plancher.
    vec3 deep = vec3(0.0010, 0.0022, 0.0052);
    float j = 0.5 + 0.5 * sin(uJourney);
    vec3 tint = mix(vec3(0.006, 0.024, 0.036), vec3(0.016, 0.011, 0.040), j);
    tint = mix(tint, vec3(0.007, 0.028, 0.026), uEnergy * 0.5);
    deep = mix(deep, vec3(0.0075, 0.0022, 0.0016), uHeat * 0.75);
    tint = mix(tint, vec3(0.045, 0.017, 0.009), uHeat * 0.7);
    vec3 col = deep + tint * (m1 * 0.7 + m2 * 0.35);

    // La basse ne doit pas relever TOUT l'ecran a chaque temps fort
    vec3 pulse = mix(vec3(0.010, 0.034, 0.044), vec3(0.044, 0.017, 0.010), uHeat);
    col += pulse * uBass * uBass * (m1 + 0.15);

    // Le filet de lumiere de la surface, a deux echelles qui derivent
    vec2 cq = (vPos + uDrift * 0.7) * 0.035;
    float ca = caustic(cq, uTime * 0.35) * 0.7
             + caustic(cq * 1.9 + 11.3, -uTime * 0.22) * 0.3;
    vec3 causCol = mix(vec3(0.10, 0.28, 0.36), vec3(0.30, 0.14, 0.08), uHeat);
    col += causCol * ca * (0.55 + uEnergy * 0.6);

    // Les rais qui tombent de la surface
    vec3 raisCol = mix(vec3(0.07, 0.20, 0.30), vec3(0.24, 0.11, 0.07), uHeat);
    col += raisCol * rais(vPos, uTime) * (0.35 + uEnergy * 0.45);

    gl_FragColor = vec4(col * profondeur(vPos), 1.0);
  }
`;

// --- Milieu 2 : TISSU - la chair, ses membranes et ses vaisseaux ---
const FRAG_TISSU = FRAG_COMMON + /* glsl */ `
  // Une veine : la CRETE d'un champ de bruit, donc une ligne qui serpente
  // sans jamais se refermer en cercle ni se repeter.
  float veine(vec2 q, float t) {
    float n = fbm(tord(q, t));
    return smoothstep(0.030, 0.0, abs(n - 0.5));
  }

  void main() {
    // Motif large et calme - la lisibilite prime, les veines restent discretes
    vec2 p = (vPos + uDrift) * 0.013;
    vec2 pf = (vPos + uDrift * 0.45) * 0.024 + 31.7;
    float t = uTime * 0.05;
    float v1 = veine(p, t);
    float v2 = veine(pf, -t * 1.3);
    float c1 = smoothstep(0.40, 0.80, fbm(tord(p * 0.7, t * 0.6)));

    // Chair sombre, chaude par nature, plus chaude encore au danger
    float j = 0.5 + 0.5 * sin(uJourney * 0.8);
    // Même traitement : le socle de chair s'affichait en (36,22,30) partout
    vec3 flesh = mix(vec3(0.0038, 0.0016, 0.0026), vec3(0.0028, 0.0022, 0.0042), j);
    flesh = mix(flesh, vec3(0.0090, 0.0026, 0.0018), uHeat * 0.8);
    vec3 veinCol = mix(vec3(0.035, 0.012, 0.020), vec3(0.055, 0.018, 0.009), uHeat)
      * (0.35 + uBass * 0.5 + uEnergy * 0.2);

    vec3 col = flesh + flesh * c1 * 0.4 + veinCol * (v1 + v2 * 0.5);

    // Dans la chair, la lumiere ne vient pas d'une surface : elle SUINTE.
    // Memes cretes, plus lentes, plus larges, plus chaudes.
    vec2 cq = (vPos + uDrift * 0.7) * 0.024;
    float ca = caustic(cq, uTime * 0.20) * 0.75
             + caustic(cq * 2.1 + 4.7, -uTime * 0.13) * 0.25;
    vec3 causCol = mix(vec3(0.16, 0.06, 0.10), vec3(0.30, 0.10, 0.05), uHeat);
    col += causCol * ca * (0.5 + uEnergy * 0.5 + uBass * 0.4);

    vec3 raisCol = mix(vec3(0.14, 0.05, 0.08), vec3(0.26, 0.09, 0.05), uHeat);
    col += raisCol * rais(vPos, uTime * 0.7) * (0.30 + uEnergy * 0.35);

    gl_FragColor = vec4(col * profondeur(vPos), 1.0);
  }
`;

/** 0 = proche, 1 = médiane, 2 = lointaine. */
export type LayerSlot = 0 | 1 | 2;

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

    // TROIS couches (N4 2026-09-04) : deux vitesses de défilement donnaient
    // un devant et un derrière ; trois donnent une PROFONDEUR. L'œil ne lit
    // pas une distance absolue, il lit des écarts de vitesse — et il en faut
    // au moins trois pour que la série se poursuive vers le lointain.
    // La plus lointaine est aussi la plus large et la plus discrète.
    for (const [parallax, tile, z] of [
      [1.0, 260, -8.5],
      [0.45, 420, -9],
      [0.18, 700, -9.4],
    ] as const) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uDrift: { value: this.driftPos }, // référence partagée : suit le voyage
          uParallax: { value: parallax },
          uTile: { value: tile },
          uOpacity: { value: 0 },
          uView: this.bgUniforms.uView, // même cadrage que le socle
          uDepth: { value: parallax > 0.6 ? 0 : parallax > 0.3 ? 0.7 : 1 },
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
  setLayerTexture(slot: LayerSlot, tex: THREE.Texture | null) {
    const layer = this.layers[slot];
    layer.mat.uniforms.uMap.value = tex;
    layer.hasTex = !!tex;
    layer.pending = null;
    layer.mesh.visible = layer.hasTex && this.layersEnabled;
  }

  /** Comme setLayerTexture, mais en fondu-enchaîné (rotation des variantes). */
  crossfadeLayer(slot: LayerSlot, tex: THREE.Texture) {
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
      (l.mat.uniforms.uTint.value as THREE.Color)
        .copy(this.tintColor)
        .multiplyScalar(breathe * (i === 0 ? 1 : i === 1 ? 0.65 : 0.45));
      // En retrait (×2) : ces couches sont ADDITIVES, elles relèvent les noirs
      // sur toute la surface — c'est du contraste perdu partout pour de
      // l'ambiance nulle part. Le fond ne concurrence jamais les entités.
      l.mat.uniforms.uOpacity.value =
        (i === 0 ? 0.20 + energy * 0.16 : i === 1 ? 0.13 + energy * 0.10 : 0.07 + energy * 0.05) *
        Math.max(0, l.fade);
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
