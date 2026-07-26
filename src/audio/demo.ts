// Piste démo synthétisée hors-ligne (64 s, 120 BPM) — permet de tester tout le
// pipeline (analyse → spawn → décor) sans fichier musical ni question de droits.

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM; // 0,5 s
const BARS = 32; // 64 s

export async function renderDemoTrack(): Promise<AudioBuffer> {
  const length = Math.ceil(BARS * 4 * BEAT * SR);
  const ctx = new OfflineAudioContext(2, length, SR);
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  const noise = makeNoiseBuffer(ctx);

  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * 4 * BEAT;
    const section = sectionOf(bar);

    // Kick sur chaque temps (sauf respiration)
    if (section !== "break") {
      for (let b = 0; b < 4; b++) kick(ctx, master, t0 + b * BEAT);
    }
    // Snare sur 2 et 4
    if (section === "full" || section === "drop") {
      snare(ctx, master, noise, t0 + 1 * BEAT);
      snare(ctx, master, noise, t0 + 3 * BEAT);
    }
    // Hats en croches
    if (section !== "intro") {
      for (let i = 0; i < 8; i++) hat(ctx, master, noise, t0 + i * BEAT * 0.5, i % 2 === 1);
    }
    // Ligne de basse en croches
    const root = [55, 55, 49, 65.4][bar % 4];
    for (let i = 0; i < 8; i++) {
      if (section === "break" && i % 4 !== 0) continue;
      bass(ctx, master, t0 + i * BEAT * 0.5, i % 3 === 2 ? root * 1.5 : root);
    }
    // Lead sur les sections chargées
    if (section === "drop" || (section === "full" && bar % 2 === 0)) {
      const scale = [220, 261.6, 293.7, 329.6, 392, 440];
      for (let i = 0; i < 8; i++) {
        if ((bar * 7 + i * 3) % 5 < 2) continue;
        lead(ctx, master, t0 + i * BEAT * 0.5, scale[(bar * 3 + i * 2) % scale.length]);
      }
    }
  }
  return ctx.startRendering();
}

function sectionOf(bar: number): "intro" | "build" | "full" | "break" | "drop" {
  if (bar < 4) return "intro";
  if (bar < 8) return "build";
  if (bar < 16) return "full";
  if (bar < 18) return "break";
  return "drop";
}

function makeNoiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, SR, SR);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function kick(ctx: OfflineAudioContext, out: AudioNode, t: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(1.0, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + 0.3);
}

function snare(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1900;
  f.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5, 0.2);
}

function hat(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, open: boolean) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 8000;
  const g = ctx.createGain();
  const dur = open ? 0.12 : 0.05;
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5, dur + 0.02);
}

function bass(ctx: OfflineAudioContext, out: AudioNode, t: number, freq: number) {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 320;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.34, t);
  g.gain.setValueAtTime(0.34, t + 0.16);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(f);
  f.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + 0.25);
}

function lead(ctx: OfflineAudioContext, out: AudioNode, t: number, freq: number) {
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(900, t + 0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.13, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(f);
  f.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + 0.25);
}
