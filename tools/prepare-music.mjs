// Construit le manifest des morceaux du mode Survie.
// Dépose les fichiers audio (mp3/ogg/wav/flac — droits en règle uniquement !)
// dans public/music/ puis lance : node tools/prepare-music.mjs
// Le titre affiché = nom du fichier sans extension, tirets/underscores → espaces.

import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(repoRoot, "public", "music");

let files = [];
try {
  files = (await readdir(DIR)).filter((f) => /\.(mp3|ogg|wav|flac|m4a)$/i.test(f));
} catch {
  console.log("public/music/ n'existe pas encore — crée-le et déposes-y les morceaux.");
  process.exit(1);
}

// Difficulté par morceau (verdicts N4). Les inconnus passent en "normal".
// La bibliothèque est TRIÉE par difficulté croissante : elle se lit comme
// une campagne, du plus accessible au plus exigeant.
// Les quatre premiers viennent de l'oreille de N4 ; les trois suivants de
// l'estimateur (src/audio/analysis.ts), qui retrouve exactement ces quatre
// verdicts — score entre parenthèses, seuils à 5,8 et 6,95.
const DIFFICULTES = {
  "Yawn phase.mp3": "easy", // 4,84
  "Never see the light again.mp3": "easy", // 5,06
  "Lumenhole.mp3": "easy", // 5,40
  "Dreamy Dive.mp3": "normal", // 6,53
  "Beyond abyss.mp3": "normal", // 6,54
  "Anxious pathogene.mp3": "hard", // 7,13
  "Tap.mp3": "hard", // 7,28
  // Les bancs d'essai du 2026-08-28, sortis du statut « test » à la demande
  // de N4 le 2026-11-12, classés par l'estimateur (mesure du même jour) :
  "Space wind.mp3": "easy", // 4,10
  "Wonderland.mp3": "easy", // 4,42
  "Luxury.mp3": "easy", // 5,47
  "Liquid.mp3": "normal", // 6,19
  // Bancs d'essai : pas encore jugés, donc pas de place dans l'échelle.
  // L'étiquette « test » les met en bout de bibliothèque et dit au joueur
  // qu'ils ne sont pas calibrés.
  // « Danger Danger v2 » (N4 2026-11-11) : premier morceau composé pour le jeu
  // (script dans tools/opendaw/danger2.ts). Pas encore jugé en partie.
  "Danger.mp3": "test",
  // Les trois morceaux du 2026-11-12, écrits après la lecture de Dash Glitch
  // (scripts phosphore.ts, derive.ts et stay-alive.ts). Pas encore jugés en partie.
  "Phosphore.mp3": "test",
  "Derive.mp3": "test",
  "Stay Alive.mp3": "test",
};
// « test » vaut 3 : les bancs d'essai passent APRÈS la campagne, jamais au
// milieu de l'échelle de difficulté.
const ORDRE = { easy: 0, normal: 1, hard: 2, test: 3 };

// Morceaux MASQUÉS du mode Survie (N4 2026-08-07) : ils restent dans le
// dépôt, analysés et prêts, mais n'apparaissent plus dans la bibliothèque.
// Ils sont réservés au futur mode Campagne. Retirer un nom d'ici suffit à le
// remettre en jeu — rien d'autre à refaire.
const MASQUES = new Set([
  "Lumenhole.mp3",
  "Never see the light again.mp3",
  "Yawn phase.mp3",
  "Tap.mp3",
]);

// Titres affichés qui ne se déduisent pas du nom du fichier.
const TITRES = {
  "Danger.mp3": "Danger Danger",
  "Derive.mp3": "Dérive",
};

const tracks = files
  .map((file) => ({
    file,
    title: TITRES[file] ?? file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
    difficulty: DIFFICULTES[file] ?? "normal",
    ...(MASQUES.has(file) ? { hidden: true } : {}),
  }))
  .sort((a, b) => ORDRE[a.difficulty] - ORDRE[b.difficulty] || a.title.localeCompare(b.title));

await writeFile(path.join(DIR, "manifest.json"), JSON.stringify({ tracks }, null, 2));
const visibles = tracks.filter((t) => !t.hidden);
console.log(
  `manifest.json : ${visibles.length} morceau(x) en jeu — ` +
    (visibles.map((t) => `${t.title} [${t.difficulty}]`).join(", ") || "aucun")
);
const caches = tracks.filter((t) => t.hidden);
if (caches.length) console.log(`masqués (Campagne) : ${caches.map((t) => t.title).join(", ")}`);
