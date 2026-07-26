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

  return { duration: buffer.duration, fps, energy, bass, mid, high };
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
