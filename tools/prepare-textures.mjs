// Intègre les masters Midjourney de N4 (hors repo) dans le jeu :
// masters-beat-survivor/textures/<piste>/*.png → public/textures/<piste>/*.webp
// (1024 px, q82 — les masters restent intacts sur la machine de N4)
// + écrit public/textures/manifest.json pour le comparateur en jeu.

import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(repoRoot, "../masters-beat-survivor/textures");
const DST = path.join(repoRoot, "public", "textures");
const SIZE = 1024;

// Pistes écartées par N4 (2026-07-28 : abysses « pas fou, trop léger ») —
// les masters restent sur sa machine, ils ne sont juste plus intégrés.
const EXCLUDE = new Set(["abysses"]);

const manifest = {};
const pistes = (await readdir(SRC, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && !EXCLUDE.has(d.name))
  .map((d) => d.name);

for (const piste of pistes) {
  const files = (await readdir(path.join(SRC, piste))).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (files.length === 0) continue;
  await mkdir(path.join(DST, piste), { recursive: true });
  manifest[piste] = [];
  for (const file of files.sort()) {
    const out = file.replace(/\.[^.]+$/, ".webp");
    await sharp(path.join(SRC, piste, file))
      .resize(SIZE, SIZE, { fit: "cover" })
      .webp({ quality: 82 })
      .toFile(path.join(DST, piste, out));
    manifest[piste].push(out);
    console.log(`${piste}/${file} → ${out}`);
  }
}

await writeFile(path.join(DST, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nmanifest.json : ${Object.entries(manifest).map(([k, v]) => `${k}=${v.length}`).join(", ")}`);
