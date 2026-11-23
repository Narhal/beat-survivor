// Prépare la bande originale pour YouTube : une vidéo par morceau.
// YouTube ne prend pas de mp3 ; il lui faut une vidéo. Chaque morceau de
// public/music/ reçoit donc une pochette fixe, sa fiche de pathogène, la même
// que dans le menu Survie (nom, menace, portrait tiré des mesures,
// descriptif), et un mp4 fait de cette image et du son.
//
//   node tools/make-youtube.mjs                tout : images, vidéos, textes
//   node tools/make-youtube.mjs --images       les images et les textes seulement
//   node tools/make-youtube.mjs --seul Glas    un seul morceau (début du titre)
//   node tools/make-youtube.mjs --vers D:\ost  un autre dossier de sortie
//
// Sortie, par défaut hors du dépôt : ../masters-beat-survivor/youtube/
//   images/NN - Titre.png     la pochette, 1920 × 1080
//   images/NN - Titre.jpg     la miniature à donner à YouTube, 1280 × 720
//   videos/NN - Titre.mp4     la vidéo à envoyer
//   textes.txt                le titre et la description à coller, par vidéo
//
// Demande ffmpeg et ffprobe dans le PATH. Les titres et les menaces viennent
// de public/music/manifest.json, les mesures de tools/music-measures.json,
// les descriptifs de src/game/bodymap.ts : rien n'est recopié ici.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(repoRoot, "public", "music");
const arg = (nom) => { const i = process.argv.indexOf(nom); return i >= 0 ? process.argv[i + 1] : undefined; };
const OUT = path.resolve(arg("--vers") ?? path.join(repoRoot, "..", "masters-beat-survivor", "youtube"));
const IMAGES_SEULES = process.argv.includes("--images");
const SEUL = arg("--seul")?.toLowerCase();
const SITE = "https://narhal.github.io/play-beat-survivor/";

// ---------------------------------------------------------------- les données

const manifest = JSON.parse(readFileSync(path.join(DIR, "manifest.json"), "utf8"));
const mesures = JSON.parse(readFileSync(path.join(repoRoot, "tools", "music-measures.json"), "utf8"));
const bodymap = readFileSync(path.join(repoRoot, "src", "game", "bodymap.ts"), "utf8");

// Les descriptifs : le bloc FICHES de bodymap.ts, lu tel quel.
const FICHES = {};
{
  const bloc = bodymap.slice(bodymap.indexOf("const FICHES"), bodymap.indexOf("const FICHE_INCONNUE"));
  for (const m of bloc.matchAll(/"([^"]+)":\s*"([^"]*)"/g)) FICHES[m[1]] = m[2];
}
const FICHE_INCONNUE = /const FICHE_INCONNUE = "([^"]*)"/.exec(bodymap)?.[1] ?? "Souche récente.";

const THREAT_RGB = { easy: [142, 255, 192], normal: [255, 214, 122], hard: [255, 122, 104], test: [201, 184, 255] };
const THREAT_LABEL = { easy: "MENACE FAIBLE", normal: "MENACE MODÉRÉE", hard: "MENACE ÉLEVÉE", test: "NON CLASSÉE" };
const THREAT_PIPS = { easy: 1, normal: 2, hard: 3, test: 0 };
const ORDRE = { easy: 0, normal: 1, hard: 2, test: 3 };
const DEFAUT = { bpm: 110, seconds: 240, level: -12, density: 4.5, low: -3, high: -12 };

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
function rng(seed) {
  let s = Math.floor(seed * 4294967296) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function organe(v) {
  if (v < 0.14) return "calotte";
  if (v < 0.3) return "couronne";
  if (v < 0.42) return "collet";
  if (v < 0.52) return "cœur";
  if (v < 0.62) return "poches latérales";
  if (v < 0.74) return "viscères";
  return "filaments";
}

// Tous les morceaux du dossier, ceux du jeu comme ceux qui n'y sont pas encore
// (un fichier absent du manifest est une souche non classée).
const parFichier = new Map(manifest.tracks.map((t) => [t.file, t]));
const liste = readdirSync(DIR)
  .filter((f) => /\.(mp3|ogg|wav|flac|m4a)$/i.test(f))
  .map((file) => {
    const t = parFichier.get(file);
    return {
      file,
      title: t?.title ?? file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
      threat: t?.difficulty ?? "test",
      hidden: !!t?.hidden,
      horsJeu: !t,
      m: mesures[file] ?? t?.measures ?? DEFAUT,
    };
  })
  .sort((a, b) => ORDRE[a.threat] - ORDRE[b.threat] || a.title.localeCompare(b.title, "fr"));

// Les mêmes règles que la carte du corps : la clarté (l'aigu par rapport au
// grave, moitié valeur moitié rang), l'agitation, l'intensité.
{
  const clarte = liste.map((n) => n.m.high - n.m.low);
  const lo = Math.min(...clarte), hi = Math.max(...clarte);
  const ordre = clarte.map((c, i) => [c, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  const rang = [];
  ordre.forEach((i, k) => { rang[i] = liste.length > 1 ? k / (liste.length - 1) : 0.5; });
  liste.forEach((n, i) => {
    n.index = i;
    n.bright = 0.5 * (hi > lo ? (clarte[i] - lo) / (hi - lo) : 0.5) + 0.5 * rang[i];
    n.busy = clamp01((n.m.density - 2.8) / 3);
    n.intensity = clamp01(0.55 * clamp01((n.m.level + 19) / 11.5) + 0.45 * n.busy);
    n.v = 0.1 + (1 - n.bright) * 0.8;
    n.seed = hash(n.file);
    n.numero = String(i + 1).padStart(2, "0");
    n.base = `${n.numero} - ${n.title}`;
    const min = Math.floor(n.m.seconds / 60), sec = String(n.m.seconds % 60).padStart(2, "0");
    n.rows = [
      ["Foyer", organe(n.v)],
      ["Pouls", `${Math.round(n.m.bpm)} /min`],
      ["Incubation", `${min} min ${sec}`],
      ["Virulence", `${Math.round(n.intensity * 100)} %`],
      ["Agitation", `${n.m.density.toFixed(1).replace(".", ",")} attaques/s`],
    ];
    n.desc = FICHES[n.file] ?? FICHE_INCONNUE;
  });
}

// ---------------------------------------------------------------- la pochette

const W = 1920, H = 1080;
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (x) => x.toFixed(1);

/** Coupe un texte en lignes d'au plus n signes. */
function lignes(texte, n) {
  const out = [];
  let cur = "";
  for (const mot of texte.split(/\s+/)) {
    if (cur && (cur + " " + mot).length > n) { out.push(cur); cur = mot; } else cur = cur ? cur + " " + mot : mot;
  }
  if (cur) out.push(cur);
  // Pas de « » ni de ponctuation haute seule en début de ligne
  for (let i = 1; i < out.length; i++) {
    const m = /^([»:;!?])\s*(.*)$/.exec(out[i]);
    if (m) { out[i - 1] += " " + m[1]; out[i] = m[2]; }
  }
  return out.filter(Boolean);
}

/** Le nom, sur une ligne s'il est court, sur deux lignes équilibrées sinon. */
function nomEnLignes(nom) {
  if (nom.length <= 13 || !nom.includes(" ")) return [nom];
  const mots = nom.split(" ");
  let best = [nom], top = Infinity;
  for (let k = 1; k < mots.length; k++) {
    const a = mots.slice(0, k).join(" "), b = mots.slice(k).join(" ");
    const cout = Math.max(a.length, b.length);
    if (cout < top) { top = cout; best = [a, b]; }
  }
  return best;
}

/**
 * Le portrait : le dessin de drawPortrait (bodymap.ts), arrêté sur une image.
 * L'agitation fait le nombre de lobes, la clarté les pointes, l'intensité la
 * taille, la durée le nombre de noyaux.
 */
function portrait(n, cx, cy, S) {
  const col = THREAT_RGB[n.threat];
  const blanc = [255, 255, 255];
  const p = 0.5, t = 0;
  const r = rng(n.seed);
  const lobes = 5 + Math.round(n.busy * 6);
  const spike = 0.1 + 0.34 * n.bright;
  const sharpness = 0.8 + 3.2 * n.bright;
  const R = S * (0.17 + 0.09 * n.intensity) * (1 + 0.07 * p);
  const phi = r() * 6.28;
  const lop = 0.1 + 0.14 * r();
  const lopA = r() * 6.28;
  const flag = n.bright < 0.45 ? 2 + Math.floor(r() * 3) : Math.floor(r() * 2);
  const rad = (a) =>
    R * (1 + spike * Math.pow(Math.abs(Math.cos((lobes * (a + phi)) / 2 + 0.25 * Math.sin(t * 0.7))), sharpness)
      + lop * Math.cos(a - lopA) + 0.035 * Math.sin(3 * a + t * 1.3));
  const id = `p${n.numero}`;
  let s = `<defs>
    <radialGradient id="${id}h" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${f1(R * 2.3)}">
      <stop offset="0" stop-color="${rgba(col, 0.3)}"/><stop offset="0.174" stop-color="${rgba(col, 0.3)}"/><stop offset="1" stop-color="${rgba(col, 0)}"/>
    </radialGradient>
    <radialGradient id="${id}b" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${f1(R * 1.5)}" fx="${f1(cx - R * 0.2)}" fy="${f1(cy - R * 0.25)}">
      <stop offset="0" stop-color="${rgba(mix(col, blanc, 0.5), 0.55)}"/><stop offset="0.6" stop-color="${rgba(col, 0.22)}"/><stop offset="1" stop-color="${rgba(col, 0.08)}"/>
    </radialGradient>
  </defs>`;
  // Les flagelles, derrière
  for (let k = 0; k < flag; k++) {
    const a0 = 1.5708 + (k - (flag - 1) / 2) * 0.5;
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const u = i / 22;
      const d = rad(a0) * 0.9 + u * S * 0.26;
      const a = a0 + Math.sin(t * 2.2 + k * 1.7 + u * 6) * 0.16 * u;
      pts.push(`${f1(cx + Math.cos(a) * d)},${f1(cy + Math.sin(a) * d)}`);
    }
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="${rgba(col, 0.45)}" stroke-width="${f1(S * 0.012)}" stroke-linecap="round"/>`;
  }
  // Le halo
  s += `<circle cx="${cx}" cy="${cy}" r="${f1(R * 2.3)}" fill="url(#${id}h)"/>`;
  // Le corps
  const corps = [];
  for (let i = 0; i < 240; i++) {
    const a = (i / 240) * 6.2832;
    const d = rad(a);
    corps.push(`${f1(cx + Math.cos(a) * d)},${f1(cy + Math.sin(a) * d)}`);
  }
  s += `<polygon points="${corps.join(" ")}" fill="url(#${id}b)" stroke="${rgba(mix(col, blanc, 0.3), 0.95)}" stroke-width="${f1(S * 0.011)}" stroke-linejoin="round"/>`;
  // Les noyaux : un par deux minutes de morceau
  const noyaux = 1 + Math.floor(n.m.seconds / 120);
  for (let k = 0; k < noyaux; k++) {
    const a = r() * 6.28 + t * (0.15 + 0.1 * r()) * (k % 2 ? 1 : -1);
    const d = R * (0.12 + 0.34 * r());
    const nr = R * (0.1 + 0.08 * r()) * (1 + 0.25 * p);
    s += `<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d)}" r="${f1(nr)}" fill="${rgba(mix(col, blanc, 0.65), 0.78)}"/>`;
  }
  // Non classée : un pointillé autour, comme sur la carte
  if (n.threat === "test") {
    s += `<circle cx="${cx}" cy="${cy}" r="${f1(S * 0.44)}" fill="none" stroke="${rgba(col, 0.5)}" stroke-width="${f1(S * 0.008)}" stroke-dasharray="${f1(S * 0.03)} ${f1(S * 0.035)}"/>`;
  }
  return s;
}

function pochette(n) {
  const ink = THREAT_RGB[n.threat];
  const INK = `rgb(${ink.join(",")})`;
  const MONO = `font-family="Courier New, Courier, monospace"`;
  // Le cadre du portrait, à gauche
  const PX = 96, PY = 118, PS = 820;
  const pcx = PX + PS / 2, pcy = PY + PS / 2;
  // La fiche, à droite
  const CX = 996, CY = 118, CW = 828, CH = 820;
  const TX = CX + 66, TR = CX + CW - 44, TW = TR - TX;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="fond" gradientUnits="userSpaceOnUse" cx="${pcx}" cy="${pcy}" r="1250">
      <stop offset="0" stop-color="${rgba(mix([10, 38, 26], ink, 0.12), 1)}"/><stop offset="0.55" stop-color="#04130c"/><stop offset="1" stop-color="#020a06"/>
    </radialGradient>
    <pattern id="trame" width="8" height="8" patternUnits="userSpaceOnUse"><rect y="6" width="8" height="2" fill="${rgba(ink, 0.04)}"/></pattern>
    <pattern id="grille" width="72" height="72" patternUnits="userSpaceOnUse"><path d="M72 0H0V72" fill="none" stroke="rgba(126,240,160,0.035)" stroke-width="1"/></pattern>
    <filter id="lueur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="cadre"><rect x="${PX}" y="${PY}" width="${PS}" height="${PS}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="#020a06"/>
  <rect width="${W}" height="${H}" fill="url(#fond)"/>
  <rect width="${W}" height="${H}" fill="url(#grille)"/>`;

  // En-tête et pied de page
  s += `<text x="${PX}" y="76" ${MONO} font-size="27" letter-spacing="5" fill="#b9ffd2">BEAT SURVIVOR</text>
  <text x="${PX + 300}" y="76" ${MONO} font-size="27" letter-spacing="5" fill="#4f8a6c">— BANDE ORIGINALE</text>
  <text x="${CX + CW}" y="76" ${MONO} font-size="27" letter-spacing="3" fill="#4f8a6c" text-anchor="end">LABORATOIRE · ARCHIVES SONORES</text>
  <text x="${PX}" y="1012" ${MONO} font-size="24" letter-spacing="2" fill="#4f8a6c">Échantillon fixé pour la photo. Il battait à ${Math.round(n.m.bpm)} /min.</text>
  <text x="${CX + CW}" y="1012" ${MONO} font-size="24" letter-spacing="2" fill="#4f8a6c" text-anchor="end">Écoute sans danger. En principe.</text>`;

  // Le portrait dans son cadre : trame, repères, règle
  s += `<rect x="${PX}" y="${PY}" width="${PS}" height="${PS}" fill="rgba(2,9,6,0.9)"/>
  <rect x="${PX}" y="${PY}" width="${PS}" height="${PS}" fill="url(#trame)"/>
  <g clip-path="url(#cadre)">
    <line x1="${pcx}" y1="${PY}" x2="${pcx}" y2="${PY + PS}" stroke="${rgba(ink, 0.1)}" stroke-width="1"/>
    <line x1="${PX}" y1="${pcy}" x2="${PX + PS}" y2="${pcy}" stroke="${rgba(ink, 0.1)}" stroke-width="1"/>
    <circle cx="${pcx}" cy="${pcy}" r="${PS * 0.3}" fill="none" stroke="${rgba(ink, 0.08)}" stroke-width="1"/>
    ${portrait(n, pcx, pcy, PS)}
  </g>
  <rect x="${PX}" y="${PY}" width="${PS}" height="${PS}" fill="none" stroke="${rgba(ink, 0.4)}" stroke-width="2"/>`;
  for (let k = 0; k <= 22; k++) {
    const y = PY + (PS * k) / 22, long = k % 5 === 0 ? 22 : 10;
    s += `<line x1="${PX - long - 6}" y1="${f1(y)}" x2="${PX - 6}" y2="${f1(y)}" stroke="rgba(126,240,160,${k % 5 === 0 ? 0.5 : 0.25})" stroke-width="2"/>`;
  }
  for (const [x, y, dx, dy] of [[PX, PY, 1, 1], [PX + PS, PY, -1, 1], [PX, PY + PS, 1, -1], [PX + PS, PY + PS, -1, -1]]) {
    s += `<path d="M${x + dx * 34} ${y}H${x}V${y + dy * 34}" fill="none" stroke="${INK}" stroke-width="4"/>`;
  }

  // La fiche
  s += `<rect x="${CX}" y="${CY}" width="${CW}" height="${CH}" fill="rgba(4,16,11,0.82)" stroke="rgba(126,240,160,0.3)" stroke-width="2"/>
  <line x1="${CX + 30}" y1="${CY + 34}" x2="${CX + 30}" y2="${CY + CH - 34}" stroke="${rgba(ink, 0.5)}" stroke-width="6" stroke-dasharray="6 16"/>
  <text x="${TX}" y="${CY + 62}" ${MONO} font-size="27" letter-spacing="4" fill="#b9ffd2">&gt; FICHE PATHOGÈNE</text>
  <text x="${TR}" y="${CY + 62}" ${MONO} font-size="27" letter-spacing="2" fill="#6fae8a" text-anchor="end">N° ${n.numero} / ${String(liste.length).padStart(2, "0")}</text>
  <line x1="${TX}" y1="${CY + 86}" x2="${TR}" y2="${CY + 86}" stroke="rgba(126,240,160,0.22)" stroke-width="2"/>`;

  // Le nom
  const nom = nomEnLignes(n.title.toUpperCase());
  const plusLong = Math.max(...nom.map((l) => l.length)) + 1; // + le curseur
  const fs = Math.min(nom.length > 1 ? 76 : 84, Math.floor(TW / (plusLong * 0.68)));
  const ls = Math.round(fs * 0.08);
  let y = CY + 86 + 40 + fs * 0.78;
  nom.forEach((l, i) => {
    const texte = xml(l) + (i === nom.length - 1 ? `<tspan fill-opacity="0.55">_</tspan>` : "");
    s += `<text x="${TX}" y="${f1(y)}" ${MONO} font-size="${fs}" letter-spacing="${ls}" fill="${INK}" opacity="0.6" filter="url(#lueur)">${texte}</text>
    <text x="${TX}" y="${f1(y)}" ${MONO} font-size="${fs}" letter-spacing="${ls}" fill="${INK}">${texte}</text>`;
    if (i < nom.length - 1) y += fs * 1.16;
  });

  // La menace
  y += 58;
  const pips = THREAT_PIPS[n.threat];
  for (let k = 0; k < 3; k++) {
    const on = pips > k;
    s += `<rect x="${TX + k * 38}" y="${f1(y - 26)}" width="28" height="28" fill="${on ? INK : "none"}" stroke="${rgba(ink, on ? 1 : 0.55)}" stroke-width="2"${pips <= 0 ? ` stroke-dasharray="5 4"` : ""}/>`;
  }
  s += `<text x="${TX + 3 * 38 + 14}" y="${f1(y - 2)}" ${MONO} font-size="29" letter-spacing="5" fill="${INK}">${THREAT_LABEL[n.threat]}</text>`;

  // Les mesures
  y += 38;
  s += `<line x1="${TX}" y1="${f1(y)}" x2="${TR}" y2="${f1(y)}" stroke="rgba(126,240,160,0.22)" stroke-width="2"/>`;
  y += 12;
  for (const [k, v] of n.rows) {
    y += 46;
    s += `<text x="${TX}" y="${f1(y)}" ${MONO} font-size="29" letter-spacing="1.5" fill="#4f8a6c">${xml(k)}</text>
    <text x="${TR}" y="${f1(y)}" ${MONO} font-size="29" letter-spacing="1.5" fill="#a8e8c4" text-anchor="end">${xml(v)}</text>`;
  }
  y += 28;
  s += `<line x1="${TX}" y1="${f1(y)}" x2="${TR}" y2="${f1(y)}" stroke="rgba(126,240,160,0.22)" stroke-width="2"/>`;

  // Le descriptif
  const FD = 30;
  const texte = lignes(n.desc, Math.floor(TW / (FD * 0.6)));
  y += 14;
  for (const l of texte) {
    y += 44;
    s += `<text x="${TX}" y="${f1(y)}" ${MONO} font-size="${FD}" fill="#8fcaa8">${xml(l)}</text>`;
  }
  if (y > CY + CH - 30) console.log(`  attention : la fiche de « ${n.title} » déborde (${Math.round(y)} px)`);
  return s + "</svg>";
}

// ------------------------------------------------------------------ la vidéo

function duree(fichier) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fichier], { encoding: "utf8" });
  return parseFloat(out);
}

function video(n, png, mp4) {
  const src = path.join(DIR, n.file);
  const d = duree(src);
  // Une image fixe, dix fois par seconde : le fichier reste petit et YouTube
  // le prend sans discuter. Le son est recodé en AAC 320 kbit/s, le format
  // que YouTube demande ; il le recode de toute façon de son côté.
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-loop", "1", "-framerate", "10", "-i", png, "-i", src,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage", "-crf", "17", "-pix_fmt", "yuv420p", "-g", "100",
    "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
    "-t", d.toFixed(3), "-movflags", "+faststart",
    "-metadata", `title=Beat Survivor OST — ${n.title}`,
    mp4,
  ], { stdio: ["ignore", "inherit", "inherit"] });
  const dv = duree(mp4);
  const flux = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name", "-of", "csv=p=0", mp4], { encoding: "utf8" })
    .trim().split(/\s+/).join("+");
  const ok = Math.abs(dv - d) < 0.25 && flux === "h264+aac";
  console.log(`  ${ok ? "ok" : "À VÉRIFIER"} : ${path.basename(mp4)} — ${dv.toFixed(1)} s (mp3 ${d.toFixed(1)} s), ${flux}, ${(statSync(mp4).size / 1048576).toFixed(1)} Mo`);
  return ok;
}

// ------------------------------------------------------------------ les textes

function texteDe(n) {
  const note = n.hidden
    ? "   [réservé à la Campagne dans le jeu : à toi de voir si tu le montres déjà]\n"
    : n.horsJeu ? "   [pas encore dans le jeu]\n" : "";
  return [
    `──────── ${n.base}.mp4`,
    note + `TITRE`,
    `Beat Survivor OST — ${n.title}`,
    ``,
    `DESCRIPTION`,
    `« ${n.title} » — bande originale de Beat Survivor.`,
    ``,
    `FICHE PATHOGÈNE N° ${n.numero} / ${String(liste.length).padStart(2, "0")}`,
    `${THREAT_LABEL[n.threat].charAt(0)}${THREAT_LABEL[n.threat].slice(1).toLowerCase()}`,
    ...n.rows.map(([k, v]) => `${k} : ${v}`),
    ``,
    n.desc,
    ``,
    `Jouer : ${SITE}`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------- tout

mkdirSync(path.join(OUT, "images"), { recursive: true });
mkdirSync(path.join(OUT, "videos"), { recursive: true });
const choisis = SEUL ? liste.filter((n) => n.title.toLowerCase().startsWith(SEUL)) : liste;
if (!choisis.length) { console.log(`Aucun morceau ne commence par « ${SEUL} ».`); process.exit(1); }

let rates = 0;
for (const n of choisis) {
  const sain = n.base.replace(/[<>:"/\\|?*]/g, "");
  const png = path.join(OUT, "images", `${sain}.png`);
  const jpg = path.join(OUT, "images", `${sain}.jpg`);
  const mp4 = path.join(OUT, "videos", `${sain}.mp4`);
  console.log(`${n.base} [${THREAT_LABEL[n.threat]}]`);
  const svg = Buffer.from(pochette(n));
  await sharp(svg).png({ compressionLevel: 9 }).toFile(png);
  await sharp(svg).resize(1280, 720).jpeg({ quality: 90, mozjpeg: true }).toFile(jpg);
  if (!IMAGES_SEULES && !video(n, png, mp4)) rates++;
}

const entete = [
  `BEAT SURVIVOR — BANDE ORIGINALE : ce qu'il faut coller dans YouTube`,
  ``,
  `Une vidéo par morceau, dans videos/. Pour chacune : le titre et la description`,
  `ci-dessous, et la miniature du même nom dans images/ (le .jpg).`,
  `Liste de lecture conseillée : « Beat Survivor — Bande originale », dans l'ordre`,
  `des numéros (de la menace faible aux souches non classées).`,
  `Visibilité conseillée pour un cercle restreint : « Non répertoriée ».`,
  ``,
  ``,
].join("\n");
if (!SEUL) writeFileSync(path.join(OUT, "textes.txt"), entete + liste.map(texteDe).join("\n"), "utf8");
console.log(`${choisis.length} morceau(x) → ${OUT}${existsSync(path.join(OUT, "textes.txt")) ? " (textes.txt à jour)" : ""}`);
if (rates) { console.log(`${rates} vidéo(s) à vérifier.`); process.exit(1); }
