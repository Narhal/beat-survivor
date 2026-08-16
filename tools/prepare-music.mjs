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
};
const ORDRE = { easy: 0, normal: 1, hard: 2 };

const tracks = files
  .map((file) => ({
    file,
    title: file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
    difficulty: DIFFICULTES[file] ?? "normal",
  }))
  .sort((a, b) => ORDRE[a.difficulty] - ORDRE[b.difficulty] || a.title.localeCompare(b.title));

await writeFile(path.join(DIR, "manifest.json"), JSON.stringify({ tracks }, null, 2));
console.log(
  `manifest.json : ${tracks.length} morceau(x) — ` +
    (tracks.map((t) => `${t.title} [${t.difficulty}]`).join(", ") || "aucun")
);
