// Analyse hors-ligne d'un AudioBuffer → enveloppes par bande + onsets datés.
// Contrat commun « FluxMusical » : le gameplay ne consomme que ça, quelle que
// soit la source (fichier local aujourd'hui, mode antenne temps réel demain).

export interface Onset {
  t: number; // secondes
  s: number; // force 0..1 (enveloppe au moment du pic)
}

export interface BandTrack {
  env: Float32Array; // enveloppe normalisée 0..1, une valeur par frame
  onsets: Onset[];
}

export interface TrackAnalysis {
  duration: number;
  fps: number; // frames d'enveloppe par seconde
  energy: Float32Array; // énergie globale 0..1
  /** Énergie lissée (~2 s) : le « chef d'orchestre » — calme vs intensité. */
  intensity: Float32Array;
  /** Instants de drop : l'intensité surgit après une accalmie. */
  drops: number[];
  bass: BandTrack;
  mid: BandTrack;
  high: BandTrack;
}

const HOP = 1024;

export async function analyseBuffer(buffer: AudioBuffer): Promise<TrackAnalysis> {
  const fps = buffer.sampleRate / HOP;
  const [bassBuf, midBuf, highBuf] = await Promise.all([
    renderFiltered(buffer, "lowpass", 140, 0.9),
    renderFiltered(buffer, "bandpass", 900, 0.6),
    renderFiltered(buffer, "highpass", 4200, 0.9),
  ]);

  const energy = normalize(envelope(buffer));
  const bass = bandTrack(bassBuf, fps, 0.13, 1.6);
  const mid = bandTrack(midBuf, fps, 0.11, 1.7);
  const high = bandTrack(highBuf, fps, 0.09, 1.8);

  // Intensité = énergie brute + « plénitude » du mix (activité des médiums/aigus) :
  // le RMS seul ne voit pas la différence entre une intro basse+kick et un mix
  // complet — les aigus (hats, cymbales) et médiums signent les sections chargées.
  const activity = new Float32Array(energy.length);
  for (let i = 0; i < energy.length; i++) {
    activity[i] = 0.5 * energy[i] + 0.3 * high.env[i] + 0.2 * mid.env[i];
  }
  const intensity = normalize(movingAverage(activity, Math.max(1, Math.round(fps * 1.8))));
  const drops = detectDrops(intensity, fps);

  return { duration: buffer.duration, fps, energy, intensity, drops, bass, mid, high };
}

/** Moyenne glissante centrée (fenêtre en frames), somme préfixe O(n). */
function movingAverage(src: Float32Array, win: number): Float32Array {
  const n = src.length;
  const half = Math.floor(win / 2);
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + src[i];
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - half);
    const b = Math.min(n, i + half + 1);
    out[i] = (prefix[b] - prefix[a]) / (b - a);
  }
  return out;
}

/**
 * Un drop = l'intensité franchit 0,65 en montant après être restée
 * sous 0,45 pendant au moins 1 s. Minimum 4 s entre deux drops.
 */
function detectDrops(intensity: Float32Array, fps: number): number[] {
  const drops: number[] = [];
  let calmFrames = 0;
  let lastDrop = -Infinity;
  for (let i = 0; i < intensity.length; i++) {
    if (intensity[i] < 0.45) {
      calmFrames++;
    } else if (intensity[i] >= 0.65) {
      const t = i / fps;
      if (calmFrames >= fps * 1.0 && t - lastDrop > 4) {
        drops.push(t);
        lastDrop = t;
      }
      calmFrames = 0;
    }
  }
  return drops;
}

export type Difficulty = "easy" | "normal" | "hard";

/**
 * Difficulté ESTIMÉE d'un morceau (pour la bibliothèque custom, idée N4).
 * Deux facteurs, exactement ceux qui pilotent les spawns : la densité
 * d'onsets (combien d'ennemis naissent) et l'intensité moyenne (combien
 * de temps les vannes restent ouvertes).
 *
 * Seuils CALIBRÉS (2026-07-31) sur la bibliothèque officielle, dont N4 a
 * jugé les difficultés à l'oreille — la métrique retrouve exactement son
 * classement : Never see the light again 5,00 (easy) · Dreamy Dive 6,57 et
 * Beyond abyss 6,75 (normal) · Anxious pathogene 7,11 (hard).
 * (Corpus d'un seul style : à revérifier si des customs très différents
 * — ambient, métal — donnent des verdicts surprenants.)
 */
export function estimateDifficulty(a: TrackAnalysis): Difficulty {
  const dur = Math.max(1, a.duration);
  const onsetsPerSec = (a.bass.onsets.length + a.mid.onsets.length + a.high.onsets.length) / dur;
  let sum = 0;
  for (let i = 0; i < a.intensity.length; i++) sum += a.intensity[i];
  const meanIntensity = sum / Math.max(1, a.intensity.length);
  const score = onsetsPerSec * 0.55 + meanIntensity * 3.2;
  return score < 5.8 ? "easy" : score < 6.95 ? "normal" : "hard";
}

/** Échantillonne une enveloppe au temps t (secondes). */
export function envAt(env: Float32Array, fps: number, t: number): number {
  const i = Math.floor(t * fps);
  if (i < 0 || i >= env.length) return 0;
  return env[i];
}

function bandTrack(buf: AudioBuffer, fps: number, minGap: number, sensitivity: number): BandTrack {
  const env = normalize(envelope(buf));
  return { env, onsets: detectOnsets(env, fps, minGap, sensitivity) };
}

async function renderFiltered(
  src: AudioBuffer,
  type: BiquadFilterType,
  freq: number,
  q: number
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, src.length, src.sampleRate);
  const node = ctx.createBufferSource();
  node.buffer = src;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  node.connect(filter);
  filter.connect(ctx.destination);
  node.start();
  return ctx.startRendering();
}

/** RMS par tranche de HOP échantillons (mixdown mono). */
function envelope(buf: AudioBuffer): Float32Array {
  const frames = Math.floor(buf.length / HOP);
  const out = new Float32Array(frames);
  const nCh = buf.numberOfChannels;
  const channels: Float32Array[] = [];
  for (let c = 0; c < nCh; c++) channels.push(buf.getChannelData(c));
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * HOP;
    for (let i = start; i < start + HOP; i++) {
      let s = 0;
      for (let c = 0; c < nCh; c++) s += channels[c][i];
      s /= nCh;
      sum += s * s;
    }
    out[f] = Math.sqrt(sum / HOP);
  }
  return out;
}

/** Normalise par le percentile 95 (robuste aux pics isolés). */
function normalize(env: Float32Array): Float32Array {
  const sorted = Float32Array.from(env).sort();
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const out = new Float32Array(env.length);
  for (let i = 0; i < env.length; i++) out[i] = Math.min(1, env[i] / p95);
  return out;
}

/** Pics de flux positif au-dessus d'un seuil adaptatif (moyenne + k·σ locale). */
function detectOnsets(env: Float32Array, fps: number, minGap: number, k: number): Onset[] {
  const n = env.length;
  const flux = new Float32Array(n);
  for (let i = 1; i < n; i++) flux[i] = Math.max(0, env[i] - env[i - 1]);

  const win = Math.round(fps * 0.7); // fenêtre adaptative ~1,4 s centrée
  const onsets: Onset[] = [];
  let lastT = -Infinity;

  for (let i = 2; i < n - 1; i++) {
    if (flux[i] < flux[i - 1] || flux[i] < flux[i + 1]) continue; // pas un pic local
    const a = Math.max(0, i - win);
    const b = Math.min(n, i + win);
    let mean = 0;
    for (let j = a; j < b; j++) mean += flux[j];
    mean /= b - a;
    let sd = 0;
    for (let j = a; j < b; j++) sd += (flux[j] - mean) ** 2;
    sd = Math.sqrt(sd / (b - a));

    const t = i / fps;
    if (flux[i] > mean + k * sd && env[i] > 0.12 && t - lastT >= minGap) {
      onsets.push({ t, s: Math.min(1, env[i]) });
      lastT = t;
    }
  }
  return onsets;
}
