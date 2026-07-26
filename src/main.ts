// Beat Survivor — prototype zéro.
// La musique génère les ennemis (onsets par bande), le décor respire avec elle,
// les armes sont un build aléatoire (choix parmi 3 à chaque jauge pleine).
// On conduit au stick gauche (clavier en secours).

import * as THREE from "three";
import { analyseBuffer, envAt, TrackAnalysis } from "./audio/analysis";
import { renderDemoTrack } from "./audio/demo";
import { World, BG_STYLES } from "./game/world";
import { Ship } from "./game/ship";
import { Enemies, ENEMY_DEFS, Enemy } from "./game/enemies";
import { Weapons, UPGRADE_INFO, UpgradeKind } from "./game/weapons";

// ---------- DOM ----------
const $ = (id: string) => document.getElementById(id)!;
const canvas = $("scene") as HTMLCanvasElement;
const titleEl = $("title"), hudEl = $("hud"), levelupEl = $("levelup"), endEl = $("end");
const statusEl = $("analyse-status"), cardsEl = $("cards");
const hpEl = $("hp"), scoreEl = $("score"), timeEl = $("time");
const gaugeFill = $("gauge-fill"), weaponsEl = $("weapons"), flashEl = $("damage-flash");

// ---------- Entrées : manette d'abord, clavier en secours ----------
const keys = new Set<string>();
addEventListener("keydown", (e) => keys.add(e.code));
addEventListener("keyup", (e) => keys.delete(e.code));

// Variantes de DA commutables (1-3) — méthode « DA en variantes », N4 tranche
addEventListener("keydown", (e) => {
  const m = e.code.match(/^(?:Digit|Numpad)([1-3])$/);
  if (m) {
    const i = Number(m[1]) - 1;
    world.setStyle(i);
    showToast(`DA : ${BG_STYLES[i]}`);
  }
});

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
interface Heart { pos: THREE.Vector2; mesh: THREE.Mesh; life: number; }
const hearts: Heart[] = [];
const heartGeo = new THREE.CircleGeometry(1.1, 16);
const heartMat = new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true });

function spawnHeart(pos: THREE.Vector2) {
  const mesh = new THREE.Mesh(heartGeo, heartMat);
  mesh.position.set(pos.x, pos.y, 1.2);
  world.scene.add(mesh);
  hearts.push({ pos: pos.clone(), mesh, life: 14 });
}

function clearHearts() {
  for (const h of hearts) world.scene.remove(h.mesh);
  hearts.length = 0;
}

// Protéines : l'XP lâchée par les pathogènes, à collecter en conduisant.
// La jauge ne se remplit plus au kill mais au ramassage (décision N4).
interface Protein { pos: THREE.Vector2; vel: THREE.Vector2; value: number; mesh: THREE.Mesh; life: number; }
const proteins: Protein[] = [];
const protGeo = new THREE.CircleGeometry(0.5, 8);
const protMat = new THREE.MeshBasicMaterial({ color: 0xcfff7a, transparent: true });
const MAX_PROTEINS = 350;
const dashHits = new Set<Enemy>();

function spawnProtein(pos: THREE.Vector2, value: number) {
  if (proteins.length >= MAX_PROTEINS) {
    gauge += value; // saturation : crédit direct plutôt que de noyer la scène
    return;
  }
  const a = Math.random() * Math.PI * 2;
  const mesh = new THREE.Mesh(protGeo, protMat.clone());
  mesh.position.set(pos.x, pos.y, 1.1);
  world.scene.add(mesh);
  proteins.push({
    pos: pos.clone(),
    vel: new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(5 + Math.random() * 9),
    value,
    mesh,
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
type Phase = "title" | "run" | "levelup" | "end";
let phase: Phase = "title";
let analysis: TrackAnalysis | null = null;
let trackName = "";
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
  statusEl.textContent = `Décodage de « ${file.name} »…`;
  try {
    const buf = await audioCtx.decodeAudioData(await file.arrayBuffer());
    trackName = file.name.replace(/\.[^.]+$/, "");
    await startFromBuffer(buf);
  } catch (err) {
    statusEl.textContent = "Impossible de décoder ce fichier — un autre format ?";
    console.error(err);
  }
}

async function loadDemo() {
  statusEl.textContent = "Synthèse de la piste démo…";
  trackName = "Piste démo";
  const buf = await renderDemoTrack();
  await startFromBuffer(buf);
}

async function startFromBuffer(buf: AudioBuffer) {
  statusEl.textContent = "Analyse du morceau (onsets, énergie)…";
  await new Promise((r) => setTimeout(r, 30)); // laisse respirer le DOM
  analysis = await analyseBuffer(buf);
  statusEl.textContent = "";
  startRun(buf);
}

function startRun(buf: AudioBuffer) {
  ship.reset();
  enemies.clear();
  weapons.reset();
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
  musicGain.gain.value = 1;
  musicSource.connect(musicGain);
  musicGain.connect(audioCtx.destination);
  audioCtx.resume();
  songStart = audioCtx.currentTime + 0.1;
  musicSource.start(songStart);

  phase = "run";
  show(titleEl, false);
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
  audioCtx.resume(); // si on arrive depuis le level-up (contexte suspendu), le fondu doit se jouer
  stopMusic(victory ? 2.5 : 1.0);
  $("end-title").textContent = aborted ? "RUN INTERROMPUE" : victory ? "MORCEAU SURVÉCU" : "SUBMERGÉ";
  $("end-stats").textContent =
    `${trackName} — score ${score} · ${formatTime(songTime())} · niveau ${gaugeLevel + 1}`;
  show(endEl, true);
}

// ---------- Level-up ----------
function openLevelUp() {
  cards = weapons.drawCards();
  if (cards.length === 0) return; // tout est au max
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

  // Drop : l'intensité surgit après une accalmie → déferlante + secousse
  while (dropIdx < analysis.drops.length && analysis.drops[dropIdx] <= t) {
    dropIdx++;
    world.kick(1.4);
    for (let i = 0; i < 8; i++) enemies.spawn("dard", ship.pos, 0.8, difficulty, speedScale);
    enemies.spawn("globule", ship.pos, 1, difficulty, speedScale);
    enemies.spawn("globule", ship.pos, 0.8, difficulty, speedScale);
  }

  while (spawnIdx.bass < analysis.bass.onsets.length && analysis.bass.onsets[spawnIdx.bass].t <= t) {
    const o = analysis.bass.onsets[spawnIdx.bass++];
    if (inten < 0.12) continue; // quasi-silence : la soupe se calme vraiment
    if (Math.random() > SPAWN_DENSITY) continue;
    enemies.spawn("globule", ship.pos, o.s, difficulty, speedScale);
    if (o.s > 0.75) world.kick(o.s);
    if (inten > 0.7 && o.s > 0.7) enemies.spawn("globule", ship.pos, o.s * 0.7, difficulty, speedScale);
  }
  while (spawnIdx.mid < analysis.mid.onsets.length && analysis.mid.onsets[spawnIdx.mid].t <= t) {
    const o = analysis.mid.onsets[spawnIdx.mid++];
    if (++counters.mid % 3 === 0 && inten > 0.25 && Math.random() <= SPAWN_DENSITY)
      enemies.spawn("meduse", ship.pos, o.s, difficulty, speedScale);
  }
  while (spawnIdx.high < analysis.high.onsets.length && analysis.high.onsets[spawnIdx.high].t <= t) {
    const o = analysis.high.onsets[spawnIdx.high++];
    if (++counters.high % 2 === 0 && inten > 0.4 && Math.random() <= SPAWN_DENSITY)
      enemies.spawn("dard", ship.pos, o.s, difficulty, speedScale);
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

  const t = phase === "run" ? songTime() : 0;
  const bassEnv = analysis ? envAt(analysis.bass.env, analysis.fps, t) : 0;
  const energyEnv = analysis ? envAt(analysis.energy, analysis.fps, t) : 0.15;
  const intenEnv = analysis ? envAt(analysis.intensity, analysis.fps, t) : 0.12;
  const midEnv = analysis ? envAt(analysis.mid.env, analysis.fps, t) : 0.4;

  if (phase === "run") {
    if (startEdge) {
      endRun(false, true); // Start / Échap : interrompre la run de test
      return;
    }
    ship.speedBonus = weapons.speedBonus;

    // Dash (R1) — la Saccade l'améliore
    if (dashEdge && ship.tryDash(weapons.dashCooldown)) {
      burst(ship.pos, 0xaffbff);
      rumble(0.25, 0.5, 90);
      dashHits.clear();
    }
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
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, p.life / 2.5);
      if (d < 2.2) {
        gauge += p.value;
        p.life = 0;
      }
      if (p.life <= 0) {
        world.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        proteins.splice(i, 1);
      }
    }
    checkGauge();

    // Cœurs de la Mitose : ramassage à la conduite
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.life -= dt;
      h.mesh.scale.setScalar(1 + Math.sin(t * 5) * 0.15);
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
$("btn-demo").addEventListener("click", () => {
  audioCtx.resume();
  loadDemo();
});
$("btn-restart").addEventListener("click", () => {
  show(endEl, false);
  show(titleEl, true);
  show(hudEl, false);
  statusEl.textContent = "";
  enemies.clear();
  phase = "title";
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
