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
const DIFFICULTES = {
  "Never see the light again.mp3": "easy",
  "Beyond abyss.mp3": "normal",
  "Dreamy Dive.mp3": "normal",
  "Anxious pathogene.mp3": "hard",
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
