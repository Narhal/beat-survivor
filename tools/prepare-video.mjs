// Intègre les animations Midjourney de N4 (hors repo) dans le jeu :
// masters-beat-survivor/video/*.mp4 → public/video/*.webm (VP9, 512 px).
// Les masters font ~8 Mo, les WebM ~1 Mo : indispensable pour le web.

import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(repoRoot, "../masters-beat-survivor/video");
const DST = path.join(repoRoot, "public", "video");
const SIZE = 512;

let files = [];
try {
  files = (await readdir(SRC)).filter((f) => /\.(mp4|mov|webm|m4v)$/i.test(f));
} catch {
  console.log("Pas de dossier masters-beat-survivor/video — rien à faire.");
  process.exit(0);
}

await mkdir(DST, { recursive: true });
const manifest = [];

for (const file of files.sort()) {
  const out = file.replace(/\.[^.]+$/, ".webm");
  // Boucle ALLER-RETOUR (N4 : le retour au début se voyait) : la vidéo est
  // suivie de sa version inversée, donc la fin rejoint exactement le début.
  // La 1re image du retour est retirée, sinon l'image de bascule est doublée.
  await run("ffmpeg", [
    "-v", "error", "-i", path.join(SRC, file),
    "-filter_complex",
    `[0:v]scale=${SIZE}:${SIZE},split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[out]`,
    "-map", "[out]",
    "-c:v", "libvpx-vp9", "-crf", "40", "-b:v", "0",
    "-an", "-deadline", "good", "-cpu-used", "4",
    "-y", path.join(DST, out),
  ]);
  const { size } = await stat(path.join(DST, out));
  manifest.push(out);
  console.log(`${file} → ${out} (${(size / 1048576).toFixed(2)} Mo)`);
}

await writeFile(path.join(DST, "manifest.json"), JSON.stringify({ clips: manifest }, null, 2));
console.log(`\nmanifest.json : ${manifest.length} clip(s)`);
