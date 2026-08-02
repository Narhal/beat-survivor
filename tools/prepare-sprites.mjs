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
// Courbe par espèce. Le gain lumineux : les masters MJ sont sombres et le jeu
// vit sous un bloom à seuil haut. L'ordonnée à l'origine NÉGATIVE écrase le
// voile : sur le dard, la membrane translucide se réduit en tache dès qu'on
// l'affiche à 70 px (verdict N4 : « les dards sont trop blurry »). En coupant
// le bas de la courbe, il ne reste que les filaments — une silhouette nette
// plutôt qu'un frottis. Le renforcement rattrape la réduction 1024 → 512.
// Le plancher compte double sur les espèces ADDITIVES : leur quad n'a pas
// d'alpha, le presque-noir du cadre est ajouté tel quel à l'écran. Multiplié
// par cinquante bestioles, ça fait le voile laiteux que N4 voyait. Un offset
// négatif ramène ce plancher à zéro sans toucher au sujet.
const TONE = {
  dard: { gain: 2.8, offset: -42, sharpen: 1.5 },
  moucheron: { gain: 1.45, offset: -12, sharpen: 0 },
  pickups: { gain: 2.1, offset: -14, sharpen: 0 },
  "joueur/mitochondrie.png": { gain: 1.45, offset: -12, sharpen: 0 },
};
const TONE_DEFAULT = { gain: 1.45, offset: 0, sharpen: 0 };

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
    const tone = TONE[`${espece}/${file}`] ?? TONE[espece] ?? TONE_DEFAULT;
    let pipe = sharp(path.join(SRC, espece, file))
      .resize(SIZE, SIZE, { fit: "cover" })
      .removeAlpha()
      .linear(tone.gain, tone.offset);
    if (tone.sharpen > 0) pipe = pipe.sharpen({ sigma: tone.sharpen });
    const rgb = await pipe.toBuffer();
    const alpha = await sharp(rgb).greyscale().toBuffer();
    await sharp(rgb).joinChannel(alpha).webp({ quality: 88 }).toFile(path.join(DST, espece, out));
    manifest[espece].push(out);
    console.log(`${espece}/${file} → ${out}`);
  }
}

await writeFile(path.join(DST, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nmanifest.json : ${Object.entries(manifest).map(([k, v]) => `${k}=${v.length}`).join(", ")}`);
