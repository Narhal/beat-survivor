// Beat Survivor — prototype zéro.
// La musique génère les ennemis (onsets par bande), le décor respire avec elle,
// les armes sont un build aléatoire (choix parmi 3 à chaque jauge pleine).
// On conduit au stick gauche (clavier en secours).

import * as THREE from "three";
import { analyseBuffer, envAt, TrackAnalysis } from "./audio/analysis";
import { renderDemoTrack } from "./audio/demo";
import { World, BG_STYLES } from "./game/world";
import { Ship } from "./game/ship";
import { Enemies, ENEMY_DEFS, Enemy, EnemyKind } from "./game/enemies";
import { Weapons, UPGRADE_INFO, UpgradeKind } from "./game/weapons";
import { renderMenuLoop, renderBubbles, renderDrop, speakTitle } from "./audio/menuAudio";
import { META_DEFS, costOf, loadMeta, saveMeta } from "./game/meta";
import { glowMaterial } from "./game/glow";

// ---------- DOM ----------
const $ = (id: string) => document.getElementById(id)!;
const canvas = $("scene") as HTMLCanvasElement;
const titleEl = $("title"), hudEl = $("hud"), levelupEl = $("levelup"), endEl = $("end");
const pauseEl = $("pause"), optionsEl = $("options");
const customEl = $("custom"), pharmacieEl = $("pharmacie"), introEl = $("intro");
const controlesEl = $("controles");
const statusEl = $("analyse-status"), cardsEl = $("cards");
const hpEl = $("hp"), scoreEl = $("score"), timeEl = $("time");
const gaugeFill = $("gauge-fill"), weaponsEl = $("weapons"), flashEl = $("damage-flash");

// ---------- Entrées : manette d'abord, clavier en secours ----------
const keys = new Set<string>();
addEventListener("keydown", (e) => keys.add(e.code));
addEventListener("keyup", (e) => keys.delete(e.code));

// Variantes de DA commutables (1-2) — méthode « DA en variantes », N4 tranche.
// Rotation AUTO des textures par défaut (fraîcheur, décision N4 2026-07-28) ;
// F/G : cycle manuel proche/lointaine, R : rotation auto on/off, V : couches on/off.
addEventListener("keydown", (e) => {
  const m = e.code.match(/^(?:Digit|Numpad)([1-2])$/);
  if (m) {
    const i = Number(m[1]) - 1;
    autoRotate = false;
    nearIdx = firstPoolIndexOf(i);
    farIdx = nearIdx + 1;
    applyLayers(true);
    showToast(`DA : ${BG_STYLES[i]} (rotation auto coupée — R pour reprendre)`);
  }
  if (e.code === "KeyF") {
    autoRotate = false;
    nearIdx++;
    loadLayer(0);
  }
  if (e.code === "KeyG") {
    autoRotate = false;
    farIdx++;
    loadLayer(1);
  }
  if (e.code === "KeyR") {
    autoRotate = !autoRotate;
    showToast(`Rotation auto des textures : ${autoRotate ? "ON" : "OFF"}`);
  }
  if (e.code === "KeyV") {
    showToast(`Couches textures : ${world.toggleLayers() ? "ON" : "OFF"}`);
  }
  if (e.code === "KeyB") {
    enemies.spritesEnabled = !enemies.spritesEnabled;
    showToast(`Sprites du bestiaire : ${enemies.spritesEnabled ? "ON" : "OFF (vectoriel)"} — nouveaux spawns`);
  }
});

// ---------- Textures Midjourney (masters de N4, pipeline prepare-textures) ----------
// Pool COMBINÉ plasma+tissu : la rotation alterne toutes les variantes pour
// garder de la fraîcheur et repousser la redondance (décision N4 2026-07-28).
const PISTES = ["plasma", "tissu"] as const;
let texManifest: Record<string, string[]> | null = null;
let texPool: { piste: (typeof PISTES)[number]; file: string }[] = [];
const texLoader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();
let nearIdx = 0;
let farIdx = 1;
let autoRotate = true;
let nearTimer = 40;
let farTimer = 65;

function firstPoolIndexOf(styleIndex: number): number {
  const piste = PISTES[styleIndex];
  const i = texPool.findIndex((e) => e.piste === piste);
  return i < 0 ? 0 : i;
}

function loadLayer(slot: 0 | 1, silent = false) {
  if (texPool.length === 0) {
    world.setLayerTexture(slot, null);
    return;
  }
  const idx = slot === 0 ? nearIdx : farIdx;
  const entry = texPool[((idx % texPool.length) + texPool.length) % texPool.length];
  const url = `/textures/${entry.piste}/${entry.file}`;
  let tex = texCache.get(url);
  if (!tex) {
    tex = texLoader.load(url);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(url, tex);
  }
  world.crossfadeLayer(slot, tex);
  // Le shader socle suit la matière de la couche proche (cohérence du monde)
  if (slot === 0) world.setStyle(entry.piste === "plasma" ? 0 : 1);
  if (!silent) showToast(`Couche ${slot === 0 ? "proche" : "lointaine"} : ${entry.file.replace(".webp", "")}`);
}

function applyLayers(silent = false) {
  loadLayer(0, silent);
  loadLayer(1, silent);
}

/** Rotation auto : la couche proche change toutes les ~40 s, la lointaine ~65 s. */
function updateTextureRotation(dt: number) {
  if (!autoRotate || texPool.length === 0) return;
  nearTimer -= dt;
  farTimer -= dt;
  if (nearTimer <= 0) {
    nearTimer = 40;
    nearIdx += 1 + Math.floor(Math.random() * 3);
    loadLayer(0, true);
  }
  if (farTimer <= 0) {
    farTimer = 65;
    farIdx += 1 + Math.floor(Math.random() * 3);
    loadLayer(1, true);
  }
}

fetch("/textures/manifest.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((m) => {
    texManifest = m;
    texPool = [];
    for (const piste of PISTES) {
      for (const file of texManifest?.[piste] ?? []) texPool.push({ piste, file });
    }
    applyLayers(true);
  })
  .catch(() => {}); // pas de textures = pas de couches, le shader reste en socle

// ---------- Sprites Midjourney : bestiaire, joueur, pickups ----------
const spriteQuad = new THREE.PlaneGeometry(2, 2);
let heartSpriteMat: THREE.MeshBasicMaterial | null = null;
let proteinSpriteMat: THREE.MeshBasicMaterial | null = null;

function loadSpriteTex(url: string): THREE.Texture {
  const tex = texLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

fetch("/sprites/manifest.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((m: Record<string, string[]> | null) => {
    if (!m) return;
    // Bioluminescents en additif, translucides en alpha-luminance (cuit au
    // pipeline) ; scale compense la marge du cadre, rot l'angle du sujet.
    const cfg: Record<string, { additive: boolean; scale: number; rot: number }> = {
      globule: { additive: false, scale: 1.6, rot: 0 },
      meduse: { additive: false, scale: 1.9, rot: -0.09 },
      dard: { additive: true, scale: 3.1, rot: -0.27 },
      kyste: { additive: false, scale: 1.7, rot: 0 },
      moucheron: { additive: true, scale: 2.5, rot: -Math.PI / 2 },
      colosse: { additive: false, scale: 1.5, rot: 0 },
    };
    for (const kind of Object.keys(cfg) as EnemyKind[]) {
      const files = m[kind];
      if (!files || files.length === 0) continue;
      enemies.setSprites(kind, {
        textures: files.map((f) => loadSpriteTex(`/sprites/${kind}/${f}`)),
        additive: cfg[kind].additive,
        scale: cfg[kind].scale,
        rotOffset: cfg[kind].rot,
      });
    }
    if (m.joueur) {
      const mem = m.joueur.find((f) => f.includes("membrane"));
      const mito = m.joueur.find((f) => f.includes("mito"));
      if (mem && mito) {
        ship.setSprites(
          loadSpriteTex(`/sprites/joueur/${mem}`),
          loadSpriteTex(`/sprites/joueur/${mito}`)
        );
      }
    }
    if (m.pickups) {
      const coeur = m.pickups.find((f) => f.includes("coeur"));
      const prot = m.pickups.find((f) => f.includes("prot"));
      const mk = (f: string) =>
        new THREE.MeshBasicMaterial({
          map: loadSpriteTex(`/sprites/pickups/${f}`),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
      if (coeur) heartSpriteMat = mk(coeur);
      if (prot) proteinSpriteMat = mk(prot);
    }
  })
  .catch(() => {}); // pas de sprites = silhouettes vectorielles

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(text: string) {
  const el = $("toast");
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 1600);
}

function gamepad(): Gamepad | null {
  for (const gp of navigator.getGamepads()) if (gp && gp.connected) return gp;
  return null;
}

// Fronts montants lus UNE fois par frame. N'importe quel bouton de façade
// valide (les mappings manette varient : ✕/A/B selon les pads), Start ou
// Échap interrompt la run en cours.
const FACE_BUTTONS = [0, 1, 2, 3];
let confirmWas = false;
let startWas = false;
let dashWas = false;
let nukeWas = false;
let confirmEdge = false;
let startEdge = false;
let dashEdge = false;
let nukeEdge = false;

function readInputEdges() {
  const gp = gamepad();
  const face =
    FACE_BUTTONS.some((i) => gp?.buttons[i]?.pressed ?? false) ||
    keys.has("Enter") ||
    keys.has("Space");
  const start = (gp?.buttons[9]?.pressed ?? false) || keys.has("Escape");
  // R1/RB = dash ; L2/LT (gâchette analogique) = Apoptose
  const dash = (gp?.buttons[5]?.pressed ?? false) || keys.has("ShiftLeft") || keys.has("ShiftRight");
  const nukeBtn = gp?.buttons[6];
  const nuke = (nukeBtn ? nukeBtn.pressed || nukeBtn.value > 0.5 : false) || keys.has("KeyE");
  confirmEdge = face && !confirmWas;
  confirmWas = face;
  startEdge = start && !startWas;
  startWas = start;
  dashEdge = dash && !dashWas;
  dashWas = dash;
  nukeEdge = nuke && !nukeWas;
  nukeWas = nuke;
}

function inputVector(): THREE.Vector2 {
  const gp = gamepad();
  if (gp) {
    const x = gp.axes[0] ?? 0;
    const y = -(gp.axes[1] ?? 0);
    const v = new THREE.Vector2(x, y);
    if (v.length() > 0.15) return v;
  }
  const v = new THREE.Vector2(0, 0);
  if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ")) v.x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) v.x += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW") || keys.has("KeyZ")) v.y += 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) v.y -= 1;
  return v.normalize();
}

function rumble(strong: number, weak: number, ms: number) {
  const gp = gamepad();
  const act = (gp as any)?.vibrationActuator;
  act?.playEffect?.("dual-rumble", {
    duration: ms,
    strongMagnitude: strong,
    weakMagnitude: weak,
  });
}

// ---------- Audio ----------
const audioCtx = new AudioContext();
let musicSource: AudioBufferSourceNode | null = null;
let musicGain: GainNode | null = null;
let songStart = 0; // en temps AudioContext

function songTime(): number {
  return audioCtx.currentTime - songStart;
}

// ---------- Monde & entités ----------
const world = new World(canvas);
const ship = new Ship(world.scene);
const enemies = new Enemies(world.scene);
const weapons = new Weapons(world.scene);

// Éclats de mort : anneaux qui s'évanouissent
interface Burst { mesh: THREE.Mesh; life: number; }
const bursts: Burst[] = [];
const burstGeo = new THREE.RingGeometry(0.8, 1, 20);

// Cœurs de la Mitose : à ramasser en conduisant dessus
interface Heart { pos: THREE.Vector2; mesh: THREE.Mesh; life: number; base: number; }
const hearts: Heart[] = [];
const heartGeo = new THREE.CircleGeometry(1.1, 16);
const heartMat = new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true });

function spawnHeart(pos: THREE.Vector2) {
  const mesh = heartSpriteMat
    ? new THREE.Mesh(spriteQuad, heartSpriteMat.clone())
    : new THREE.Mesh(heartGeo, heartMat);
  const base = heartSpriteMat ? 2.8 : 1;
  const halo = new THREE.Mesh(spriteQuad, glowMaterial(0xff7aa8, 0.5));
  halo.scale.setScalar(heartSpriteMat ? 1.4 : 3);
  halo.position.z = -0.05;
  mesh.add(halo);
  mesh.scale.setScalar(base);
  mesh.position.set(pos.x, pos.y, 1.2);
  world.scene.add(mesh);
  hearts.push({ pos: pos.clone(), mesh, life: 14, base });
}

function clearHearts() {
  for (const h of hearts) world.scene.remove(h.mesh);
  hearts.length = 0;
}

// Protéines : l'XP lâchée par les pathogènes, à collecter en conduisant.
// La jauge ne se remplit plus au kill mais au ramassage (décision N4).
interface Protein { pos: THREE.Vector2; vel: THREE.Vector2; value: number; mesh: THREE.Mesh; haloMat: THREE.MeshBasicMaterial; life: number; }
const proteins: Protein[] = [];
const protGeo = new THREE.CircleGeometry(0.5, 8);
const protMat = new THREE.MeshBasicMaterial({ color: 0xcfff7a, transparent: true });
const MAX_PROTEINS = 350;
const dashHits = new Set<Enemy>();

// Sillage : l'onde qu'on laisse en nageant (sensation d'eau, réf. DKC2)
interface Ripple { mesh: THREE.Mesh; life: number; scale: number; }
const ripples: Ripple[] = [];
const rippleGeo = new THREE.RingGeometry(0.85, 1, 24);
let rippleTimer = 0;

function spawnRipple(pos: THREE.Vector2, scale: number) {
  const mesh = new THREE.Mesh(
    rippleGeo,
    new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.28 * scale })
  );
  mesh.position.set(pos.x, pos.y, 4); // au-dessus de la couche joueur
  world.scene.add(mesh);
  ripples.push({ mesh, life: 0.7, scale });
}

function spawnProtein(pos: THREE.Vector2, value: number) {
  if (proteins.length >= MAX_PROTEINS) {
    gauge += value; // saturation : crédit direct plutôt que de noyer la scène
    xpEarned += value;
    return;
  }
  const a = Math.random() * Math.PI * 2;
  const mesh = proteinSpriteMat
    ? new THREE.Mesh(spriteQuad, proteinSpriteMat.clone())
    : new THREE.Mesh(protGeo, protMat.clone());
  if (proteinSpriteMat) mesh.scale.setScalar(2.0);
  // Halo de luminescence : l'XP doit se voir de loin (lisibilité, N4)
  const haloMat = glowMaterial(0xd4ff7a, 0.55);
  const halo = new THREE.Mesh(spriteQuad, haloMat);
  halo.scale.setScalar(proteinSpriteMat ? 1.3 : 2.6);
  halo.position.z = -0.05;
  mesh.add(halo);
  mesh.position.set(pos.x, pos.y, 1.1);
  world.scene.add(mesh);
  proteins.push({
    pos: pos.clone(),
    vel: new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(5 + Math.random() * 9),
    value,
    mesh,
    haloMat,
    life: 18,
  });
}

function clearProteins() {
  for (const p of proteins) world.scene.remove(p.mesh);
  proteins.length = 0;
}

function burst(pos: THREE.Vector2, color: number) {
  const mesh = new THREE.Mesh(
    burstGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  mesh.position.set(pos.x, pos.y, 1.8);
  world.scene.add(mesh);
  bursts.push({ mesh, life: 0.45 });
}

// ---------- État de partie ----------
type Phase = "title" | "run" | "levelup" | "pause" | "end";
let phase: Phase = "title";
let analysis: TrackAnalysis | null = null;
let lastBuffer: AudioBuffer | null = null; // pour « Rejouer ce morceau »
let loading = false;
let trackName = "";

// ---------- Pharmacie : méta-progression persistante ----------
const meta = loadMeta();
const metaLvl = (id: string) => meta.upgrades[id] ?? 0;
let metaSpeedMul = 1;
let autopilot = false;
let xpEarned = 0;
const GAUGE_BASE = 15; // +50 % de lenteur demandé par N4 (2026-07-26)
const SPAWN_DENSITY = 0.8; // −20 % de densité d'ennemis (N4)
let score = 0;
let gauge = 0;
let gaugeMax = GAUGE_BASE;
let gaugeLevel = 0;
let cards: { kind: UpgradeKind; level: number }[] = [];
let cardIndex = 0;
let killsSinceHeart = 0;
let spawnIdx = { bass: 0, mid: 0, high: 0 };
let dropIdx = 0;
let counters = { high: 0, mid: 0 };

// ---------- Écrans ----------
function show(el: HTMLElement, on: boolean) {
  el.classList.toggle("hidden", !on);
}

async function loadFile(file: File) {
  if (loading) return;
  loading = true;
  statusEl.textContent = `Décodage de « ${file.name} »…`;
  try {
    const buf = await audioCtx.decodeAudioData(await file.arrayBuffer());
    trackName = file.name.replace(/\.[^.]+$/, "");
    await startFromBuffer(buf);
  } catch (err) {
    statusEl.textContent = "Impossible de décoder ce fichier — un autre format ?";
    loading = false;
    console.error(err);
  }
}

async function loadDemo() {
  if (loading) return;
  loading = true;
  statusEl.textContent = "Synthèse de la piste démo…";
  trackName = "Piste démo";
  const buf = await renderDemoTrack();
  await startFromBuffer(buf);
}

async function startFromBuffer(buf: AudioBuffer) {
  statusEl.textContent = "Analyse du morceau (onsets, énergie)…";
  await new Promise((r) => setTimeout(r, 30)); // laisse respirer le DOM
  analysis = await analyseBuffer(buf);
  lastBuffer = buf;
  statusEl.textContent = "";
  loading = false;
  startRun(buf);
}

function startRun(buf: AudioBuffer) {
  ship.reset();
  enemies.clear();
  weapons.reset();
  // La Pharmacie s'applique : les acquis permanents du joueur
  ship.hp = 3 + metaLvl("vacuole");
  metaSpeedMul = 1 + 0.04 * metaLvl("cils");
  weapons.metaDamageMul = 1 + 0.08 * metaLvl("concentres");
  weapons.metaMagnet = 2.5 * metaLvl("phago");
  weapons.bonusNukes = metaLvl("reserve");
  autopilot = metaLvl("symbiote") > 0;
  xpEarned = 0;
  stopMenuMusic(0.4);
  score = 0;
  gauge = 0;
  gaugeLevel = 0;
  gaugeMax = GAUGE_BASE;
  spawnIdx = { bass: 0, mid: 0, high: 0 };
  dropIdx = 0;
  counters = { high: 0, mid: 0 };
  killsSinceHeart = 0;
  clearHearts();
  clearProteins();

  musicSource?.stop();
  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = buf;
  musicGain = audioCtx.createGain();
  musicGain.gain.value = musicVolume;
  musicSource.connect(musicGain);
  musicGain.connect(audioCtx.destination);
  audioCtx.resume();
  songStart = audioCtx.currentTime + 0.1;
  musicSource.start(songStart);

  phase = "run";
  show(titleEl, false);
  show(customEl, false);
  show(pharmacieEl, false);
  show(controlesEl, false);
  show(endEl, false);
  show(hudEl, true);
  refreshWeaponsHud();
}

/** Coupe la musique en fondu — perdre en écoutant le morceau jusqu'au bout empêche de se concentrer (N4). */
function stopMusic(fade: number) {
  if (!musicGain || !musicSource) return;
  const now = audioCtx.currentTime;
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(0, now + fade);
  const src = musicSource;
  musicSource = null;
  setTimeout(() => {
    try { src.stop(); } catch {}
  }, fade * 1000 + 200);
}

function endRun(victory: boolean, aborted = false) {
  phase = "end";
  audioCtx.resume(); // si on arrive depuis la pause (contexte suspendu), le fondu doit se jouer
  show(pauseEl, false);
  stopMusic(victory ? 2.5 : 1.0);
  // L'XP de la run rejoint la banque de la Pharmacie
  meta.xp += xpEarned;
  saveMeta(meta);
  $("end-title").textContent = aborted ? "RUN INTERROMPUE" : victory ? "MORCEAU SURVÉCU" : "SUBMERGÉ";
  $("end-stats").textContent =
    `${trackName} — score ${score} · ${formatTime(songTime())} · niveau ${gaugeLevel + 1}` +
    ` · +${xpEarned} XP (banque : ${meta.xp})`;
  show(endEl, true);
  setMenu([$("btn-replay"), $("btn-restart")], "x");
}

// ---------- Pause ----------
function openPause() {
  phase = "pause";
  audioCtx.suspend();
  show(pauseEl, true);
  setMenu([$("btn-resume"), $("btn-abort")], "y");
}

function resumeRun() {
  show(pauseEl, false);
  audioCtx.resume();
  phase = "run";
}

// ---------- Navigation manette des menus ----------
let menuEls: HTMLElement[] = [];
let menuIdx = 0;
let menuCooldown = 0;
let menuAxis: "x" | "y" = "x";

function setMenu(els: HTMLElement[], axis: "x" | "y" = "x") {
  menuEls.forEach((el) => el.classList.remove("sel"));
  menuEls = els;
  menuAxis = axis;
  menuIdx = 0;
  syncMenu();
}

function syncMenu() {
  menuEls.forEach((el, i) => el.classList.toggle("sel", i === menuIdx));
}

/** Stick pour naviguer (axe du menu courant), ✕/A/Entrée pour valider. */
function updateMenuNav(dt: number) {
  if (menuEls.length === 0) return;
  menuCooldown = Math.max(0, menuCooldown - dt);
  const v = inputVector();
  const val = menuAxis === "x" ? v.x : -v.y;
  if (menuCooldown <= 0 && Math.abs(val) > 0.5) {
    menuIdx = THREE.MathUtils.euclideanModulo(menuIdx + Math.sign(val), menuEls.length);
    menuCooldown = 0.25;
    syncMenu();
  }
  if (confirmEdge) menuEls[menuIdx].click();
}

// ---------- Level-up ----------
function openLevelUp() {
  cards = weapons.drawCards();
  if (cards.length === 0) return; // tout est au max
  // Pilote symbiote (Pharmacie) : il choisit, la run ne s'interrompt pas
  if (autopilot) {
    const c = cards[Math.floor(Math.random() * cards.length)];
    weapons.pick(c.kind);
    refreshWeaponsHud();
    showToast(`Symbiote : ${UPGRADE_INFO[c.kind].name}`);
    return;
  }
  phase = "levelup";
  cardIndex = 0;
  audioCtx.suspend();
  cardsEl.innerHTML = "";
  cards.forEach((c, i) => {
    const info = UPGRADE_INFO[c.kind];
    const div = document.createElement("div");
    div.className = "card" + (i === 0 ? " sel" : "");
    div.dataset.cat = info.cat;
    div.innerHTML =
      `<span class="cat">${info.cat}</span>` +
      `<h3>${info.name}</h3>` +
      `<p>${info.desc}</p>` +
      `<span class="lvl">${c.level === 1 ? "NOUVEAU" : "niveau " + c.level}</span>`;
    div.addEventListener("click", () => pickCard(i));
    cardsEl.appendChild(div);
  });
  show(levelupEl, true);
}

function pickCard(i: number) {
  weapons.pick(cards[i].kind);
  refreshWeaponsHud();
  show(levelupEl, false);
  audioCtx.resume();
  phase = "run";
}

let cardStickCooldown = 0;
let weaponsHudTimer = 0;

function updateLevelUp(dt: number) {
  cardStickCooldown = Math.max(0, cardStickCooldown - dt);
  const v = inputVector();
  if (cardStickCooldown <= 0 && Math.abs(v.x) > 0.5) {
    cardIndex = THREE.MathUtils.euclideanModulo(cardIndex + Math.sign(v.x), cards.length);
    cardStickCooldown = 0.25;
    [...cardsEl.children].forEach((c, i) => c.classList.toggle("sel", i === cardIndex));
  }
  if (confirmEdge) pickCard(cardIndex);
}

// ---------- Spawns pilotés par la musique ----------
// L'ÉNERGIE est le chef d'orchestre (décision N4 2026-07-26) : les onsets par
// bande donnent le TIMING des spawns, l'intensité lissée du morceau donne la
// QUANTITÉ et la vitesse. Période calme = accalmie réelle ; drop = déferlante.
function updateSpawns(t: number) {
  if (!analysis) return;
  const difficulty = 1 + (t / 60) * 0.4;
  const inten = envAt(analysis.intensity, analysis.fps, t);
  const speedScale = 0.75 + inten * 0.5;

  // Courbe de rentrée (N4, 2026-07-28) : la musique donne le rythme, mais la
  // PROGRESSION dans la run donne le volume — départ léger pour laisser le
  // joueur s'installer, fin dense. De ~1/3 de la densité au début à 115 % à la fin.
  const progress = Math.min(1, t / (analysis.duration || 60));
  const ramp = 0.35 + 0.8 * Math.pow(progress, 0.8);
  const density = SPAWN_DENSITY * ramp;

  // Drop : l'intensité surgit après une accalmie → déferlante + secousse
  // (elle aussi grossit avec la progression)
  while (dropIdx < analysis.drops.length && analysis.drops[dropIdx] <= t) {
    dropIdx++;
    world.kick(1.4);
    const nDards = Math.max(3, Math.round(8 * ramp));
    for (let i = 0; i < nDards; i++) enemies.spawn("dard", ship.pos, 0.8, difficulty, speedScale);
    enemies.spawn("globule", ship.pos, 1, difficulty, speedScale);
    if (ramp > 0.6) enemies.spawn("globule", ship.pos, 0.8, difficulty, speedScale);
  }

  // La progression débloque les ESPÈCES (note N4 : les coriaces arrivent tard)
  while (spawnIdx.bass < analysis.bass.onsets.length && analysis.bass.onsets[spawnIdx.bass].t <= t) {
    const o = analysis.bass.onsets[spawnIdx.bass++];
    if (inten < 0.12) continue; // quasi-silence : la soupe se calme vraiment
    if (Math.random() > density) continue;
    if (progress > 0.6 && Math.random() < 0.16) {
      enemies.spawn("colosse", ship.pos, o.s, difficulty, speedScale);
    } else {
      enemies.spawn("globule", ship.pos, o.s, difficulty, speedScale);
    }
    if (o.s > 0.75) world.kick(o.s);
    if (inten > 0.7 && o.s > 0.7 && ramp > 0.7)
      enemies.spawn("globule", ship.pos, o.s * 0.7, difficulty, speedScale);
  }
  while (spawnIdx.mid < analysis.mid.onsets.length && analysis.mid.onsets[spawnIdx.mid].t <= t) {
    const o = analysis.mid.onsets[spawnIdx.mid++];
    if (++counters.mid % 3 === 0 && inten > 0.25 && Math.random() <= density) {
      if (progress > 0.25 && Math.random() < 0.35) {
        enemies.spawn("kyste", ship.pos, o.s, difficulty, speedScale);
      } else {
        enemies.spawn("meduse", ship.pos, o.s, difficulty, speedScale);
      }
    }
  }
  while (spawnIdx.high < analysis.high.onsets.length && analysis.high.onsets[spawnIdx.high].t <= t) {
    const o = analysis.high.onsets[spawnIdx.high++];
    if (++counters.high % 2 === 0 && inten > 0.4 && Math.random() <= density) {
      if (progress > 0.45 && Math.random() < 0.35) {
        enemies.squad("moucheron", ship.pos, 3, o.s, difficulty, speedScale);
      } else {
        enemies.spawn("dard", ship.pos, o.s, difficulty, speedScale);
      }
    }
  }
}

// ---------- HUD ----------
function refreshWeaponsHud() {
  weaponsEl.innerHTML = weapons.describe().map((s) => `<div>${s}</div>`).join("");
}

function formatTime(t: number): string {
  const clamped = Math.max(0, t);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function onKill(e: Enemy) {
  const def = ENEMY_DEFS[e.kind];
  score += def.score;
  burst(e.pos, def.color);
  spawnProtein(e.pos, def.xp);
  // Le colosse se scinde en globules — la mitose joue aussi contre nous
  if (e.kind === "colosse") enemies.burstAt("globule", e.pos, ship.pos, 3, 1);
  // Passif Mitose : régulièrement, un pathogène détruit laisse un cœur
  const threshold = weapons.mitoseThreshold;
  if (threshold > 0 && ++killsSinceHeart >= threshold) {
    killsSinceHeart = 0;
    spawnHeart(e.pos);
  }
}

function checkGauge() {
  if (gauge >= gaugeMax) {
    gauge = 0;
    gaugeLevel += 1;
    gaugeMax = Math.round(GAUGE_BASE * Math.pow(1.4, gaugeLevel));
    openLevelUp();
  }
}

/** L'Apoptose : purge de l'écran, pluie de protéines. */
function fireApoptose() {
  world.kick(2);
  rumble(1, 1, 500);
  flashEl.classList.add("on", "nuke");
  setTimeout(() => flashEl.classList.remove("on", "nuke"), 220);
  for (let j = enemies.list.length - 1; j >= 0; j--) {
    const e = enemies.list[j];
    e.hp = 0;
    onKill(e);
    enemies.remove(j);
  }
}

// ---------- Boucle ----------
let lastFrame = performance.now();
let lastTick = 0;

function tick(now: number) {
  lastTick = now;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  readInputEdges();

  if (phase === "levelup") {
    if (startEdge) {
      endRun(false, true);
      return;
    }
    updateLevelUp(dt);
    return; // simulation ET musique en pause
  }

  if (phase === "pause") {
    if (startEdge) {
      resumeRun();
      return;
    }
    updateMenuNav(dt);
    return; // simulation ET musique en pause
  }

  const t = phase === "run" ? songTime() : 0;
  // Hors run (titre, fin) : une respiration ambiante pour que la soupe vive
  const ambient = phase !== "run";
  const bassEnv = !ambient && analysis ? envAt(analysis.bass.env, analysis.fps, t)
    : 0.12 + 0.12 * Math.sin(now / 1000 * 2.1);
  const energyEnv = !ambient && analysis ? envAt(analysis.energy, analysis.fps, t) : 0.2;
  const intenEnv = !ambient && analysis ? envAt(analysis.intensity, analysis.fps, t) : 0.15;
  const midEnv = !ambient && analysis ? envAt(analysis.mid.env, analysis.fps, t) : 0.45;

  if (!introDone) {
    if (confirmEdge || startEdge) advanceIntro();
  } else {
    if (phase === "title" && !optionsOpen && !loading) updateMenuNav(dt);
    if (phase === "end") updateMenuNav(dt);
  }

  if (phase === "run") {
    if (startEdge) {
      openPause(); // Start / Échap : pause (Interrompre y coupe la musique)
      return;
    }
    ship.speedBonus = weapons.speedBonus * metaSpeedMul;
    ship.beat = bassEnv;

    // Dash (R1) — la Saccade l'améliore
    if (dashEdge && ship.tryDash(weapons.dashCooldown)) {
      burst(ship.pos, 0xaffbff);
      spawnRipple(ship.pos, 1.8);
      rumble(0.25, 0.5, 90);
      dashHits.clear();
    }

    // Sillage : on trouble l'eau quand on nage vite
    rippleTimer -= dt;
    if (rippleTimer <= 0 && ship.vel.length() > 16) {
      rippleTimer = 0.14;
      spawnRipple(ship.pos, 0.9);
    }

    updateTextureRotation(dt);
    ship.update(dt, inputVector());
    if (ship.dashing) {
      if (weapons.dashInvuln) ship.invuln = Math.max(ship.invuln, 0.06);
      const dashDmg = weapons.dashDamage;
      if (dashDmg > 0) {
        for (let j = enemies.list.length - 1; j >= 0; j--) {
          const e = enemies.list[j];
          if (dashHits.has(e)) continue;
          if (e.pos.distanceTo(ship.pos) < e.radius + 2.4) {
            dashHits.add(e);
            e.hp -= dashDmg;
            if (e.hp <= 0) {
              onKill(e);
              enemies.remove(j);
            }
          }
        }
      }
    }

    // Apoptose (L2) si chargée
    if (nukeEdge && weapons.fireNuke()) fireApoptose();

    updateSpawns(t);
    enemies.update(dt, t, ship.pos);
    weapons.update(dt, ship, enemies, (ev) => onKill(ev.enemy));

    // Protéines : aimant (Phagocytose), ramassage → jauge
    const magnetR = weapons.magnetRadius;
    for (let i = proteins.length - 1; i >= 0; i--) {
      const p = proteins[i];
      p.life -= dt;
      p.vel.multiplyScalar(Math.max(0, 1 - dt * 3));
      const d = p.pos.distanceTo(ship.pos);
      if (d < magnetR) {
        const pull = new THREE.Vector2().subVectors(ship.pos, p.pos).normalize();
        p.vel.addScaledVector(pull, dt * 160);
      }
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.set(p.pos.x, p.pos.y, 1.1);
      const fade = Math.min(1, p.life / 2.5);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
      p.haloMat.opacity = 0.55 * fade;
      if (d < 2.2) {
        gauge += p.value;
        xpEarned += p.value;
        p.life = 0;
      }
      if (p.life <= 0) {
        world.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        p.haloMat.dispose();
        proteins.splice(i, 1);
      }
    }
    checkGauge();

    // Cœurs de la Mitose : ramassage à la conduite
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.life -= dt;
      h.mesh.scale.setScalar(h.base * (1 + Math.sin(t * 5) * 0.15));
      (h.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, h.life / 2);
      if (h.pos.distanceTo(ship.pos) < 3) {
        ship.heal();
        burst(h.pos, 0xff7aa8);
        h.life = 0;
      }
      if (h.life <= 0) {
        world.scene.remove(h.mesh);
        hearts.splice(i, 1);
      }
    }

    // Contact ennemi → membrane d'abord, sinon dégâts
    for (const e of enemies.list) {
      if (e.pos.distanceTo(ship.pos) < e.radius + 1.6) {
        if (ship.invuln <= 0 && weapons.absorbHit()) {
          ship.invuln = 1.2;
          burst(ship.pos, 0x7df9ff); // la membrane éclate
          rumble(0.4, 0.3, 120);
        } else if (ship.hit()) {
          rumble(0.9, 0.6, 220);
          flashEl.classList.add("on");
          setTimeout(() => flashEl.classList.remove("on"), 120);
          if (ship.hp <= 0) endRun(false);
        }
      }
    }

    if (analysis && t >= analysis.duration - 0.05) endRun(true);

    hpEl.textContent = "♥".repeat(Math.max(0, ship.hp));
    scoreEl.textContent = String(score);
    timeEl.textContent = formatTime(t);
    gaugeFill.style.width = `${Math.min(100, (gauge / gaugeMax) * 100)}%`;
    // La charge d'Apoptose vit en continu dans le HUD
    weaponsHudTimer -= dt;
    if (weaponsHudTimer <= 0) {
      refreshWeaponsHud();
      weaponsHudTimer = 0.3;
    }
  }

  // Sillage : les anneaux s'élargissent et s'estompent
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.life -= dt;
    const k = 1 - r.life / 0.7;
    r.mesh.scale.setScalar((1.2 + k * 4.5) * r.scale);
    (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.28 * r.scale * (1 - k);
    if (r.life <= 0) {
      world.scene.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
      ripples.splice(i, 1);
    }
  }

  // Éclats
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life -= dt;
    const k = 1 - b.life / 0.45;
    b.mesh.scale.setScalar(1 + k * 6);
    (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    if (b.life <= 0) {
      world.scene.remove(b.mesh);
      (b.mesh.material as THREE.Material).dispose();
      bursts.splice(i, 1);
    }
  }

  world.update(
    dt,
    now / 1000,
    {
      bass: bassEnv,
      energy: energyEnv,
      intensity: phase === "run" ? intenEnv : 0.12,
      mid: midEnv,
      danger: phase === "run" ? Math.min(1, enemies.list.length / 70) : 0,
    },
    ship.pos
  );
}

function rafLoop(now: number) {
  tick(now);
  requestAnimationFrame(rafLoop);
}
requestAnimationFrame(rafLoop);

// Boucle de secours pour les environnements sans compositing (tests headless) :
// ne prend le relais que si requestAnimationFrame ne tourne pas.
if (new URLSearchParams(location.search).has("autotick")) {
  setInterval(() => {
    const now = performance.now();
    if (now - lastTick > 100) tick(now);
  }, 33);
}

// ---------- Branchements UI ----------
let optionsOpen = false;
let musicVolume = Number(localStorage.getItem("bs-volume") ?? "1");

// ---------- Musique de menu (boucle planante/acid synthétisée) ----------
let menuLoopBuf: AudioBuffer | null = null;
let dropBuf: AudioBuffer | null = null;
let menuSrc: AudioBufferSourceNode | null = null;
let menuGain: GainNode | null = null;

function playOneShot(buf: AudioBuffer, vol: number) {
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(audioCtx.destination);
  src.start();
}

async function startMenuMusic() {
  if (menuSrc) return;
  if (!menuLoopBuf) menuLoopBuf = await renderMenuLoop();
  if (menuSrc) return; // une autre montée a gagné la course
  menuSrc = audioCtx.createBufferSource();
  menuSrc.buffer = menuLoopBuf;
  menuSrc.loop = true;
  menuGain = audioCtx.createGain();
  menuGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  menuGain.gain.linearRampToValueAtTime(0.35 * musicVolume, audioCtx.currentTime + 2.8);
  menuSrc.connect(menuGain);
  menuGain.connect(audioCtx.destination);
  menuSrc.start();
}

function stopMenuMusic(fade: number) {
  if (!menuSrc || !menuGain) return;
  const src = menuSrc, g = menuGain;
  menuSrc = null;
  menuGain = null;
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(0, now + fade);
  setTimeout(() => {
    try { src.stop(); } catch {}
  }, fade * 1000 + 100);
}

// ---------- Intro : Narhal's Gaming ----------
let introDone = false;
let introState: "wait" | "logo" | "done" = "wait";

function advanceIntro() {
  if (introState === "wait") {
    introState = "logo";
    audioCtx.resume();
    renderBubbles().then((b) => playOneShot(b, 0.55)); // ça barbote
    renderDrop().then((b) => (dropBuf = b));
    renderMenuLoop().then((b) => (menuLoopBuf = b)); // pré-rendu pendant le logo
    $("intro-prompt").classList.add("hidden");
    $("intro-logo").classList.add("on");
    setTimeout(() => {
      if (introState === "logo") finishIntro();
    }, 4300);
  } else if (introState === "logo") {
    finishIntro(); // toute entrée saute l'intro
  }
}

function finishIntro() {
  if (introState === "done") return;
  introState = "done";
  introEl.classList.add("fadeout");
  setTimeout(() => {
    introEl.classList.add("hidden");
    introDone = true;
    speakTitle(); // « Beat Survivor » au vocoder (placeholder synthèse système)
    if (dropBuf) playOneShot(dropBuf, 0.6);
    startMenuMusic();
    homeMenu();
  }, 950);
}

introEl.addEventListener("click", advanceIntro);
addEventListener("keydown", () => {
  if (!introDone) advanceIntro();
});

// ---------- Écrans du titre : Accueil / Custom / Pharmacie ----------
type TitleScreen = "home" | "custom" | "pharmacie" | "controles";

function homeMenu() {
  setMenu(
    [$("btn-survie"), $("btn-custom"), $("btn-pharmacie"), $("btn-controles"), $("btn-options")],
    "y"
  );
}

function showTitleScreen(which: TitleScreen) {
  show(titleEl, which === "home");
  show(customEl, which === "custom");
  show(pharmacieEl, which === "pharmacie");
  show(controlesEl, which === "controles");
  if (which === "home") homeMenu();
  if (which === "custom") setMenu([$("btn-custom-back")], "y");
  if (which === "pharmacie") renderPharmacie();
  if (which === "controles") setMenu([$("btn-controles-back")], "y");
}

function renderPharmacie() {
  $("pharma-xp").textContent = `${meta.xp} XP en banque`;
  const list = $("pharma-list");
  list.innerHTML = "";
  const navEls: HTMLElement[] = [];
  for (const def of META_DEFS) {
    const lvl = metaLvl(def.id);
    const row = document.createElement("div");
    row.className = "pharma-row";
    const cost = costOf(def, lvl);
    const maxed = lvl >= def.max;
    row.innerHTML =
      `<div class="pharma-info">` +
      `<div class="pharma-name">${def.name}</div>` +
      `<div class="pharma-desc">${def.desc}</div>` +
      `<div class="pharma-lvl">${"●".repeat(lvl)}${"○".repeat(def.max - lvl)}</div>` +
      `</div>`;
    const btn = document.createElement("button");
    btn.textContent = maxed ? "MAX" : `${cost} XP`;
    btn.disabled = maxed || meta.xp < cost;
    if (!maxed) {
      btn.addEventListener("click", () => {
        if (meta.xp >= cost && metaLvl(def.id) < def.max) {
          meta.xp -= cost;
          meta.upgrades[def.id] = metaLvl(def.id) + 1;
          saveMeta(meta);
          showToast(`Pharmacie : ${def.name} amélioré`);
          renderPharmacie();
        }
      });
    }
    row.appendChild(btn);
    list.appendChild(row);
    navEls.push(btn);
  }
  navEls.push($("btn-pharma-back"));
  setMenu(navEls, "y");
}

$("btn-survie").addEventListener("click", () => {
  audioCtx.resume();
  loadDemo();
});
$("btn-custom").addEventListener("click", () => showTitleScreen("custom"));
$("btn-pharmacie").addEventListener("click", () => showTitleScreen("pharmacie"));
$("btn-controles").addEventListener("click", () => showTitleScreen("controles"));
$("btn-custom-back").addEventListener("click", () => showTitleScreen("home"));
$("btn-pharma-back").addEventListener("click", () => showTitleScreen("home"));
$("btn-controles-back").addEventListener("click", () => showTitleScreen("home"));

$("btn-restart").addEventListener("click", () => {
  show(endEl, false);
  show(hudEl, false);
  statusEl.textContent = "";
  enemies.clear();
  phase = "title";
  showTitleScreen("home");
  startMenuMusic();
});
$("btn-replay").addEventListener("click", () => {
  if (lastBuffer && analysis) {
    show(endEl, false);
    startRun(lastBuffer);
  }
});
$("btn-resume").addEventListener("click", resumeRun);
$("btn-abort").addEventListener("click", () => endRun(false, true));

// Options : volume persistant, couches et rotation en direct
const optVolume = $("opt-volume") as HTMLInputElement;
const optLayers = $("opt-layers") as HTMLInputElement;
const optRotate = $("opt-rotate") as HTMLInputElement;
optVolume.value = String(musicVolume);

$("btn-options").addEventListener("click", () => {
  optionsOpen = true;
  optLayers.checked = world.layersEnabled;
  optRotate.checked = autoRotate;
  show(optionsEl, true);
});
$("btn-options-close").addEventListener("click", () => {
  optionsOpen = false;
  show(optionsEl, false);
  homeMenu();
});
addEventListener("keydown", (e) => {
  if (e.code === "Escape" && optionsOpen) $("btn-options-close").click();
});
optVolume.addEventListener("input", () => {
  musicVolume = Number(optVolume.value);
  localStorage.setItem("bs-volume", optVolume.value);
  if (musicGain && phase === "run") musicGain.gain.value = musicVolume;
  if (menuGain) menuGain.gain.value = 0.35 * musicVolume;
});
optLayers.addEventListener("change", () => {
  if (optLayers.checked !== world.layersEnabled) world.toggleLayers();
});
optRotate.addEventListener("change", () => {
  autoRotate = optRotate.checked;
});

const dropzone = $("dropzone");
addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag");
});
addEventListener("dragleave", () => dropzone.classList.remove("drag"));
addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  if (phase !== "title") return;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    audioCtx.resume();
    loadFile(file);
  }
});

// Poignée de debug pour la vérification headless
(window as any).__bs = {
  get analysis() { return analysis; },
  get phase() { return phase; },
  get weapons() { return weapons; },
  get ship() { return ship; },
  get enemies() { return enemies; },
};
