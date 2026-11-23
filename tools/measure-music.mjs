// Mesure les morceaux de public/music/ pour la carte du menu Survie.
// Chaque morceau y est un point ; sa place, sa taille et son battement
// viennent de ce qu'il est vraiment :
//   - bpm       : le tempo (le point bat à cette vitesse) ;
//   - seconds   : la durée ;
//   - level     : le niveau moyen, en dB ;
//   - density   : le nombre d'attaques par seconde ;
//   - low, high : la part de l'énergie sous 150 Hz et au-dessus de 2 kHz, en
//                 dB (grave en bas du corps, aigu en haut).
//
//   node tools/measure-music.mjs          mesure ce qui a changé
//   node tools/measure-music.mjs --tout   remesure tout
//
// Demande ffmpeg dans le PATH (il décode les fichiers). Le résultat va dans
// tools/music-measures.json, que prepare-music.mjs recopie dans le manifest :
// sans ffmpeg, les mesures déjà faites restent valables.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(repoRoot, "public", "music");
const OUT = path.join(repoRoot, "tools", "music-measures.json");
const RATE = 22050;

// Tempos connus : les morceaux composés pour le jeu ont leur tempo écrit dans
// leur script (tools/opendaw/). La mesure retrouve les cinq premiers à moins
// de 1 BPM ; elle se trompe sur « 4 h 04 » (131 au lieu de 98), dont les échos
// en croche pointée battent plus fort que la batterie. Le tempo écrit fait foi.
const CONNUS = {
  "Danger.mp3": 132, "Phosphore.mp3": 124, "Derive.mp3": 126, "Stay Alive.mp3": 130,
  "Glas.mp3": 140, "4 h 04.mp3": 98,
  // « Friche », exporté par N4 sous son nom de pathogène (même durée, 276 s)
  "Dendrobat paralysis.mp3": 126,
};

let cache = {};
try { cache = JSON.parse(readFileSync(OUT, "utf8")); } catch { /* première fois */ }
const tout = process.argv.includes("--tout");

function decode(file) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], {
    maxBuffer: 1 << 30,
  });
  return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
}

/** Passe-bas à un pôle, deux fois : assez pour séparer le grave du reste. */
function lowpass(x, fc) {
  const k = 1 - Math.exp((-2 * Math.PI * fc) / RATE);
  const y = new Float32Array(x.length);
  let a = 0, b = 0;
  for (let i = 0; i < x.length; i++) { a += (x[i] - a) * k; b += (a - b) * k; y[i] = b; }
  return y;
}

function measure(x) {
  const n = x.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += x[i] * x[i];
  const total = sum || 1e-12;
  const lowBand = lowpass(x, 150);
  const midBand = lowpass(x, 2000);
  let sLow = 0, sHigh = 0;
  for (let i = 0; i < n; i++) { sLow += lowBand[i] * lowBand[i]; const h = x[i] - midBand[i]; sHigh += h * h; }

  // Enveloppe d'attaques : la hausse d'énergie d'une tranche à la suivante,
  // sur le grave et sur l'ensemble (le pied compte double).
  const HOP = 128;
  const frames = Math.floor(n / HOP);
  const eFull = new Float32Array(frames), eLow = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let a = 0, b = 0;
    for (let i = f * HOP; i < (f + 1) * HOP; i++) { a += x[i] * x[i]; b += lowBand[i] * lowBand[i]; }
    eFull[f] = Math.log(1 + 1000 * Math.sqrt(a / HOP));
    eLow[f] = Math.log(1 + 1000 * Math.sqrt(b / HOP));
  }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, eFull[f] - eFull[f - 1]) + Math.max(0, eLow[f] - eLow[f - 1]);
  const fps = RATE / HOP;

  // Attaques par seconde : les pics de l'enveloppe nettement au-dessus de
  // leur voisinage (une seconde), pas plus d'un tous les 90 ms.
  let onsets = 0;
  const W = Math.round(fps * 1.0);
  let run = 0;
  const mean = new Float32Array(frames);
  for (let f = 0; f < frames; f++) { run += flux[f]; if (f >= W) run -= flux[f - W]; mean[f] = run / Math.min(f + 1, W); }
  let last = -1e9;
  for (let f = 2; f < frames - 2; f++) {
    if (flux[f] > 3 * mean[f] + 0.15 && flux[f] >= flux[f - 1] && flux[f] > flux[f + 1] && f - last > fps * 0.09) { onsets++; last = f; }
  }

  // Tempo : le décalage auquel l'enveloppe se ressemble le plus à elle-même,
  // entre 60 et 180 battements par minute. Un vrai battement se retrouve
  // aussi à deux, trois et quatre fois son décalage ; un faux (cinq quarts de
  // temps, par exemple) non : on additionne donc ces quatre ressemblances.
  // Une préférence douce pour le milieu de la fourchette départage un
  // tempo et sa moitié.
  let moy = 0;
  for (let f = 0; f < frames; f++) moy += flux[f];
  moy /= frames;
  const lagMin = Math.floor((fps * 60) / 180), lagMax = Math.ceil((fps * 60) / 60);
  const ac = new Float64Array(4 * lagMax + 4);
  for (let lag = lagMin - 1; lag < ac.length; lag++) {
    let t = 0;
    for (let f = lag; f < frames; f++) t += (flux[f] - moy) * (flux[f - lag] - moy);
    ac[lag] = t / (frames - lag);
  }
  const somme = (lag) => {
    let t = 0;
    for (let k = 1; k <= 4; k++) {
      const p = k * lag, i = Math.floor(p), fr = p - i;
      t += (ac[i] * (1 - fr) + ac[i + 1] * fr) / k;
    }
    return t;
  };
  let best = lagMin, top = -Infinity;
  for (let lag = lagMin; lag <= lagMax; lag += 0.25) {
    const bpmLag = (fps * 60) / lag;
    const pref = Math.exp(-0.5 * Math.pow(Math.log2(bpmLag / 118) / 0.9, 2));
    const score = somme(lag) * pref;
    if (score > top) { top = score; best = lag; }
  }
  const bpm = (fps * 60) / best;
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    bpm: r1(bpm),
    seconds: Math.round(n / RATE),
    level: r1(10 * Math.log10(total / n)),
    density: Math.round((onsets / (n / RATE)) * 100) / 100,
    low: r1(10 * Math.log10(sLow / total)),
    high: r1(10 * Math.log10(sHigh / total + 1e-12)),
  };
}

const files = readdirSync(DIR).filter((f) => /\.(mp3|ogg|wav|flac|m4a)$/i.test(f)).sort();
const out = {};
for (const file of files) {
  const st = statSync(path.join(DIR, file));
  const sig = `${st.size}`;
  if (!tout && cache[file]?.sig === sig) { out[file] = cache[file]; continue; }
  const m = measure(decode(path.join(DIR, file)));
  if (CONNUS[file]) { m.bpmMesure = m.bpm; m.bpm = CONNUS[file]; }
  out[file] = { sig, ...m };
  console.log(`${file} : ${m.bpm} BPM, ${m.seconds} s, ${m.level} dB, ${m.density} attaques/s, grave ${m.low}, aigu ${m.high}`);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`${Object.keys(out).length} morceaux dans tools/music-measures.json`);
