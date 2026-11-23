// Met au format les images de la chaîne YouTube à partir des masters
// Midjourney déposés dans ../masters-beat-survivor/youtube/images/.
//
//   node tools/make-youtube-channel.mjs
//   node tools/make-youtube-channel.mjs --nom "BEAT SURVIVOR" --sous "BANDE ORIGINALE"
//
// Ce que YouTube demande :
//   - bannière : 2560 × 1440, 6 Mo au plus. Un ordinateur n'en montre que la
//     bande centrale de 2560 × 423, un téléphone 1546 × 423 : le texte tient
//     dans cette dernière zone.
//   - photo de profil : carrée, 800 × 800, affichée en rond.
//   - filigrane des vidéos : carré, 150 × 150 au moins, fond transparent.
//
// Entrées (dans images/) : banner.png et pppng.png sont les choix de N4 ; les
// autres fichiers, reconnus au début du prompt dans leur nom, sont les pistes
// écartées, mises au format quand même dans chaine/variantes/.
// Sortie : ../masters-beat-survivor/youtube/chaine/ (hors du dépôt).

import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nom, defaut) => { const i = process.argv.indexOf(nom); return i >= 0 ? process.argv[i + 1] : defaut; };
const BASE = path.resolve(arg("--vers", path.join(repoRoot, "..", "masters-beat-survivor", "youtube")));
const SRC = path.join(BASE, "images");
const DEST = path.join(BASE, "chaine");
const NOM = arg("--nom", "BEAT SURVIVOR");
const SOUS = arg("--sous", "BANDE ORIGINALE");

const fichiers = readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !/^\d\d - /.test(f));
const trouve = (motif) => { const f = fichiers.find((x) => x.toLowerCase().includes(motif)); return f ? path.join(SRC, f) : null; };
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const poids = (f) => `${(statSync(f).size / 1048576).toFixed(2)} Mo`;

const BW = 2560, BH = 1440;
// Les zones visibles, centrées : ordinateur, tablette, téléphone.
const ZONES = [["ordinateur", 2560, 423], ["tablette", 1855, 423], ["téléphone", 1546, 423]];

/** Le nom de la chaîne, au-dessus et au-dessous de la ligne de lumière. */
function titre() {
  const MONO = `font-family="Courier New, Courier, monospace"`;
  const fs = Math.min(96, Math.floor(1400 / (NOM.length * 0.83)));
  const ls = Math.round(fs * 0.23), ls2 = 18;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}">
    <defs>
      <filter id="lueur" x="-10%" y="-80%" width="120%" height="260%"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id="ombre" x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="40"/></filter>
    </defs>
    <ellipse cx="${BW / 2}" cy="606" rx="640" ry="62" fill="rgba(0,6,2,0.55)" filter="url(#ombre)"/>
    <ellipse cx="${BW / 2}" cy="850" rx="420" ry="40" fill="rgba(0,6,2,0.5)" filter="url(#ombre)"/>
    <text x="${BW / 2 + ls / 2}" y="638" ${MONO} font-size="${fs}" letter-spacing="${ls}" text-anchor="middle" fill="#8effc0" opacity="0.7" filter="url(#lueur)">${xml(NOM)}</text>
    <text x="${BW / 2 + ls / 2}" y="638" ${MONO} font-size="${fs}" letter-spacing="${ls}" text-anchor="middle" fill="#d9ffe8">${xml(NOM)}</text>
    <line x1="${BW / 2 - 440}" y1="849" x2="${BW / 2 - 360}" y2="849" stroke="#6fae8a" stroke-width="3"/>
    <line x1="${BW / 2 + 360}" y1="849" x2="${BW / 2 + 440}" y2="849" stroke="#6fae8a" stroke-width="3"/>
    <text x="${BW / 2 + ls2 / 2}" y="862" ${MONO} font-size="40" letter-spacing="${ls2}" text-anchor="middle" fill="#c8f5da">${xml(SOUS)}</text>
  </svg>`);
}

async function banniere(src, dest, avecTexte) {
  const fond = await sharp(src).resize(BW, BH, { fit: "cover", kernel: "lanczos3" }).sharpen({ sigma: 0.7 }).toBuffer();
  await sharp(fond).composite(avecTexte ? [{ input: titre() }] : []).jpeg({ quality: 93, chromaSubsampling: "4:4:4" }).toFile(dest);
  const p = statSync(dest).size / 1048576;
  console.log(`  ${path.basename(dest)} : ${BW} × ${BH}, ${poids(dest)}${p > 6 ? "  ATTENTION : plus de 6 Mo" : ""}`);
}

/** La bannière avec les trois zones visibles tracées dessus, pour vérifier. */
async function apercuZones(src, dest) {
  const traits = ZONES.map(([nom, w, h], i) => {
    const x = (BW - w) / 2, y = (BH - h) / 2, c = ["#ffffff", "#ffd67a", "#ff7a68"][i];
    return `<rect x="${x + 3}" y="${y + 3 + i * 4}" width="${w - 6}" height="${h - 6 - i * 8}" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="${i ? "24 14" : "none"}"/>
    <text x="${x + 8}" y="${y - 18 - i * 44}" font-family="Courier New, monospace" font-size="34" fill="${c}">${nom} ${w} × ${h}</text>`;
  }).join("");
  const voile = `<path d="M0 0H${BW}V${BH}H0Z M0 ${(BH - 423) / 2}V${(BH + 423) / 2}H${BW}V${(BH - 423) / 2}Z" fill="rgba(0,0,0,0.45)" fill-rule="evenodd"/>`;
  const trace = await sharp(src).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}">${voile}${traits}</svg>`) }])
    .png().toBuffer();
  await sharp(trace).resize(1600).jpeg({ quality: 86 }).toFile(dest);
}

/** Le carré qui cadre le sujet : ce qui dépasse nettement du fond, plus une marge. */
async function cadre(src, marge) {
  const { data, info } = await sharp(src).greyscale().blur(6).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const coins = [0, W - 1, (H - 1) * W, H * W - 1].map((i) => data[i]).sort((a, b) => a - b);
  const seuil = coins[2] + 28;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[y * W + x] > seuil) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return { left: 0, top: 0, width: Math.min(W, H), height: Math.min(W, H) };
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let cote = Math.max(x1 - x0, y1 - y0) * (1 + marge);
  cote = Math.min(cote, 2 * cx, 2 * (W - cx), 2 * cy, 2 * (H - cy));
  cote = Math.floor(cote);
  return { left: Math.round(cx - cote / 2), top: Math.round(cy - cote / 2), width: cote, height: cote };
}

async function profil(src, dest) {
  const c = await cadre(src, 0.1);
  await sharp(src).extract(c).resize(800, 800, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile(dest);
  console.log(`  ${path.basename(dest)} : 800 × 800, ${poids(dest)} (cadre ${c.width} px sur le sujet)`);
}

/** La photo de profil telle que YouTube la montre : en rond, en petit. */
async function apercuProfil(src, dest) {
  const tailles = [176, 98, 48, 32];
  const comps = [];
  let x = 24;
  for (const t of tailles) {
    const masque = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}"><circle cx="${t / 2}" cy="${t / 2}" r="${t / 2}" fill="#fff"/></svg>`);
    const rond = await sharp(src).resize(t, t).composite([{ input: masque, blend: "dest-in" }]).png().toBuffer();
    comps.push({ input: rond, left: x, top: Math.round((224 - t) / 2) });
    x += t + 32;
  }
  await sharp({ create: { width: x, height: 224, channels: 3, background: "#181818" } }).composite(comps).png().toFile(dest);
}

/** Le filigrane : la forme blanche, le noir devenu transparent. */
async function filigrane(src, dest, taille) {
  const c = await cadre(src, 0.12);
  const alpha = await sharp(src).extract(c).resize(taille, taille).greyscale().raw().toBuffer();
  await sharp({ create: { width: taille, height: taille, channels: 3, background: "#ffffff" } })
    .joinChannel(alpha, { raw: { width: taille, height: taille, channels: 1 } })
    .png({ compressionLevel: 9 }).toFile(dest);
  console.log(`  ${path.basename(dest)} : ${taille} × ${taille}, fond transparent, ${poids(dest)}`);
}

mkdirSync(path.join(DEST, "variantes"), { recursive: true });
const dans = (...p) => path.join(DEST, ...p);
const manque = [];

console.log("Bannière");
const srcBanniere = trouve("banner");
if (srcBanniere) {
  await banniere(srcBanniere, dans("banniere.jpg"), true);
  await banniere(srcBanniere, dans("banniere - sans texte.jpg"), false);
  await apercuZones(dans("banniere.jpg"), dans("apercu - zones de la banniere.jpg"));
} else manque.push("banner.png");

console.log("Photo de profil");
const srcProfil = trouve("pppng");
if (srcProfil) {
  await profil(srcProfil, dans("profil.png"));
  await apercuProfil(dans("profil.png"), dans("apercu - profil en rond.png"));
} else manque.push("pppng.png");

console.log("Filigrane");
const srcPicto = trouve("minimal_pictogram");
if (srcPicto) await filigrane(srcPicto, dans("filigrane.png"), 300);
else manque.push("le pictogramme");

console.log("Fond de miniature");
const srcFond = trouve("one_large_glowing_green_pathogen");
if (srcFond) {
  await sharp(srcFond).resize(1920, 1080, { fit: "cover", kernel: "lanczos3" }).sharpen({ sigma: 0.6 }).jpeg({ quality: 92 }).toFile(dans("fond de miniature.jpg"));
  console.log(`  fond de miniature.jpg : 1920 × 1080, ${poids(dans("fond de miniature.jpg"))}`);
} else manque.push("le fond de miniature");

console.log("Variantes");
for (const [motif, nom] of [
  ["ultra_wide_dark_field", "banniere - champ du microscope.jpg"],
  ["inside_a_living_organism", "banniere - plongee.jpg"],
  ["jellyfish-shaped", "banniere - carte du corps.jpg"],
  ["audio_spectrum", "banniere - spectre vivant.jpg"],
]) { const s = trouve(motif); if (s) await banniere(s, dans("variantes", nom), false); }
for (const [motif, nom] of [
  ["spiky_spherical", "profil - specimen.png"],
  ["translucent_cell", "profil - joueur.png"],
  ["flat_emblem", "profil - embleme.png"],
]) { const s = trouve(motif); if (s) await profil(s, dans("variantes", nom)); }

if (manque.length) console.log(`Absent de images/ : ${manque.join(", ")}`);
console.log(`→ ${DEST}${existsSync(DEST) ? "" : " (introuvable)"}`);
