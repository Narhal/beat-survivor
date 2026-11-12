// Rend les mots de la voix robot avec SAM (Software Automatic Mouth, 1982),
// le synthétiseur vocal des micro-ordinateurs 8 bits, et les range dans
// voix-sam.json pour que build.mjs les injecte dans le script openDAW.
//
// SAM n'est PAS une dépendance du projet (licence floue : logiciel abandonné,
// rétro-ingénierie — voir le README de sam-js). On l'installe à part :
//   mkdir sam && cd sam && npm init -y && npm install sam-js
//   node tools/opendaw/voix.mjs <chemin vers ce dossier sam>
// Seul le résultat (les échantillons de voix) est versionné.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const samDir = process.argv[2];
if (!samDir) throw new Error("usage : node voix.mjs <dossier où sam-js est installé>");
const require = createRequire(path.join(path.resolve(samDir), "x.js"));
const mod = require("sam-js/dist/samjs.common.min.js");
const SamJs = mod.default || mod;

// Un jeu de mots par morceau, chacun dans son fichier : le jeu "danger" (les deux
// Danger Danger) ne doit plus jamais changer.
//   node tools/opendaw/voix.mjs <dossier sam> [jeu]
const JEUX = {
  danger: { fichier: "voix-sam.json", cible: 110, temoin: "danger", mots: { danger: "DEYNJER", letsgo: "LEHTS GOW", faster: "FAESTER" } },
  // Stay Alive : Sol diese 2 (103,83 Hz)
  stay: { fichier: "voix-stay.json", cible: 103.83, temoin: "alive", mots: {
    beat: "BIYT", survivor: "SERVAYVER", stay: "STEY", alive: "AHLAYV",
    three: "THRIY", two: "TUW", one: "WAHN", you: "YUW", survived: "SERVAYVD" } },
};
const JEU = JEUX[process.argv[3] || "danger"];
if (!JEU) throw new Error("jeu inconnu : " + process.argv[3]);

const RATE = 22050;
const CIBLE = JEU.cible; // la voix chante la tonique du morceau
// Phonèmes de SAM, SANS marque d'accent tonique : l'accent fait monter la voix
// (« DEY4NJER » part de 110 Hz et retombe à 90). Sans lui, la voix reste sur
// une seule note — le robot de Kraftwerk — et c'est le morceau qui la transpose.
const MOTS = JEU.mots;

// Période de SAM, mesurée : 3,25 échantillons par unité de réglage.
const periodeAttendue = (pitch) => 3.25 * pitch;

/**
 * Fondamentale médiane, par autocorrélation normalisée. On ne cherche qu'autour
 * de la période attendue : sans ce garde-fou, l'estimateur accroche un formant
 * ou une sous-harmonique sur les mots courts.
 */
function f0(buf, pitch) {
  const T = periodeAttendue(pitch);
  const W = 1024, H = 128, lo = Math.floor(T * 0.8), hi = Math.ceil(T * 1.2);
  const found = [];
  for (let a = 0; a + W + hi + 1 < buf.length; a += H) {
    let e = 0;
    for (let i = a; i < a + W; i++) e += buf[i] * buf[i];
    if (e / W < 0.002) continue;
    const ns = new Float64Array(hi + 2);
    let top = 0, at = 0;
    for (let lag = lo - 1; lag <= hi + 1; lag++) {
      let num = 0, den = 0;
      for (let i = a; i < a + W; i++) {
        num += buf[i] * buf[i + lag];
        den += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
      }
      ns[lag] = den > 0 ? (2 * num) / den : 0;
      if (lag >= lo && lag <= hi && ns[lag] > top) { top = ns[lag]; at = lag; }
    }
    if (top < 0.6) continue;
    const d = ns[at - 1] - 2 * ns[at] + ns[at + 1];
    const frac = d !== 0 ? (0.5 * (ns[at - 1] - ns[at + 1])) / d : 0;
    found.push(RATE / (at + frac));
  }
  found.sort((x, y) => x - y);
  return { f0: found.length ? found[Math.floor(found.length / 2)] : 0, trames: found.length, min: found[0] || 0, max: found[found.length - 1] || 0 };
}

const rendre = (texte, pitch) => new SamJs({ phonetic: true, singmode: true, pitch, speed: 72, mouth: 128, throat: 128 }).buf8(texte);
const flottant = (b8) => Float32Array.from(b8, (v) => (v - 128) / 128);

// 1. Le réglage de hauteur de SAM le plus proche de la cible
let pitch = 64, ecart = Infinity;
for (let p = 55; p <= 70; p++) {
  const m = f0(flottant(rendre(MOTS[JEU.temoin], p)), p);
  const cents = Math.abs(1200 * Math.log2(m.f0 / CIBLE));
  if (m.f0 > 0 && cents < ecart) { ecart = cents; pitch = p; }
}
for (const p of [48, 64, 80, 96]) console.log(`  réglage ${p} → ${f0(flottant(rendre(MOTS[JEU.temoin], p)), p).f0.toFixed(1)} Hz`);
console.log(`hauteur SAM retenue : ${pitch} (écart ${ecart.toFixed(0)} cents sur « ${JEU.temoin} »)`);

// 2. Les mots : coupe des silences, niveaux distincts, encodage
const sortie = { rate: RATE, cible: CIBLE, pitch, mots: {} };
const bruts = {};
for (const [nom, texte] of Object.entries(MOTS)) {
  const b8 = rendre(texte, pitch);
  let a = 0, z = b8.length - 1;
  while (a < z && Math.abs(b8[a] - 128) < 3) a++;
  while (z > a && Math.abs(b8[z] - 128) < 3) z--;
  a = Math.max(0, a - 60); z = Math.min(b8.length - 1, z + 200);
  bruts[nom] = b8.slice(a, z + 1);
}
for (const [nom, b8] of Object.entries(bruts)) {
  const m = f0(flottant(b8), pitch);
  sortie.mots[nom] = { f0: Math.round(m.f0 * 100) / 100, n: b8.length, b64: Buffer.from(b8).toString("base64") };
  console.log(`${nom} : ${(b8.length / RATE).toFixed(3)} s, f0 ${m.f0.toFixed(1)} Hz sur ${m.trames} trames (de ${m.min.toFixed(1)} à ${m.max.toFixed(1)})`);
}

const dir = path.dirname(fileURLToPath(import.meta.url));
writeFileSync(path.join(dir, JEU.fichier), JSON.stringify(sortie));
console.log(JEU.fichier + " écrit");
