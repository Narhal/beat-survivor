// Intègre les sprites Midjourney de N4 (hors repo) dans le jeu :
// masters-beat-survivor/sprites/<espèce>/*.png → public/sprites/<espèce>/*.webp
// 512 px, avec ALPHA DÉRIVÉ DE LA LUMINANCE (fond noir pur = transparent) —
// les espèces translucides se rendent en blending normal sans détourage,
// les bioluminescentes en additif (l'alpha y est ignoré mais ne gêne pas).

import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(repoRoot, "../masters-beat-survivor/sprites");
const DST = path.join(repoRoot, "public", "sprites");
const SIZE = 512;
// Gain lumineux par espèce : les pickups doivent être NÉON (verdict N4 —
// brillants par eux-mêmes, sans halo), le reste garde le gain standard.
const GAIN = { pickups: 2.1 };
const GAIN_DEFAULT = 1.45;

const manifest = {};
const especes = (await readdir(SRC, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const espece of especes) {
  const files = (await readdir(path.join(SRC, espece))).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (files.length === 0) continue;
  await mkdir(path.join(DST, espece), { recursive: true });
  manifest[espece] = [];
  for (const file of files.sort()) {
    const out = file.replace(/\.[^.]+$/, ".webp");
    const rgb = await sharp(path.join(SRC, espece, file))
      .resize(SIZE, SIZE, { fit: "cover" })
      .removeAlpha()
      // Gain lumineux : les masters MJ sont sombres, le jeu vit sous un bloom
      // à seuil haut — sans ça les sprites sont moins lisibles que le vectoriel
      .linear(GAIN[espece] ?? GAIN_DEFAULT, 0)
      .toBuffer();
    const alpha = await sharp(rgb).greyscale().toBuffer();
    await sharp(rgb).joinChannel(alpha).webp({ quality: 88 }).toFile(path.join(DST, espece, out));
    manifest[espece].push(out);
    console.log(`${espece}/${file} → ${out}`);
  }
}

await writeFile(path.join(DST, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nmanifest.json : ${Object.entries(manifest).map(([k, v]) => `${k}=${v.length}`).join(", ")}`);
