// Habillage sonore des menus, entièrement synthétisé (placeholders de qualité
// en attendant les éventuels assets de N4) : barbotage d'intro, goutte,
// voix robotique, et boucle de menu planante/acid avec textures éparses.

const SR = 44100;

/** Fréquence alignée sur la durée de boucle : nombre entier de cycles = zéro clic. */
function aligned(freq: number, dur: number): number {
  return Math.round(freq * dur) / dur;
}

/**
 * Boucle de menu (~12,8 s, boucle parfaite) : nappe planante filtrée,
 * sub, ligne acid discrète, blips de texture éparpillés avec échos.
 */
export async function renderMenuLoop(): Promise<AudioBuffer> {
  const DUR = 12.8;
  const ctx = new OfflineAudioContext(2, Math.round(DUR * SR), SR);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  // Nappe : accord La mineur add9, chaque note doublée à +1 cycle/boucle
  // (battement de chorus dont la période EST la boucle — ça tourne sans couture)
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 520;
  padFilter.Q.value = 1.2;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.055;
  padFilter.connect(padGain);
  padGain.connect(master);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = aligned(0.156, DUR); // 2 cycles par boucle
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 280;
  lfo.connect(lfoDepth);
  lfoDepth.connect(padFilter.frequency);
  lfo.start(0);
  for (const f of [110, 130.8, 164.8, 196, 246.9]) {
    for (const off of [0, 1 / DUR]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = aligned(f, DUR) + off;
      osc.connect(padFilter);
      osc.start(0);
    }
  }

  // Sub : bourdon La grave
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = aligned(55, DUR);
  const subGain = ctx.createGain();
  subGain.gain.value = 0.11;
  sub.connect(subGain);
  subGain.connect(master);
  sub.start(0);

  // Ligne acid : douce, clairsemée, filtre résonnant qui claque
  const scale = [110, 130.8, 146.8, 164.8, 196, 220];
  const pattern = [0, -1, 3, -1, 5, -1, 2, -1, 0, -1, 4, 3, -1, 2, -1, 1];
  const step = 0.2;
  for (let rep = 0; rep < 4; rep++) {
    for (let i = 0; i < pattern.length; i++) {
      const idx = pattern[i];
      if (idx < 0) continue;
      const t = rep * pattern.length * step + i * step;
      if (t > DUR - 0.3) continue;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = scale[idx] * 2;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.Q.value = 11;
      f.frequency.setValueAtTime(240, t);
      f.frequency.exponentialRampToValueAtTime(1500, t + 0.05);
      f.frequency.exponentialRampToValueAtTime(280, t + 0.16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(f);
      f.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }

  // Blips de texture éparpillés, avec échos manuels qui meurent avant la fin
  const rand = mulberry(42);
  for (let i = 0; i < 12; i++) {
    const t0 = 0.5 + rand() * (DUR - 3.2);
    const freq = 1400 + rand() * 2800;
    for (let echo = 0; echo < 3; echo++) {
      const t = t0 + echo * 0.34;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const amp = 0.035 * Math.pow(0.45, echo);
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  return ctx.startRendering();
}

/** Barbotage : l'eau qui bulle pendant l'apparition du logo (~3,5 s). */
export async function renderBubbles(): Promise<AudioBuffer> {
  const DUR = 3.5;
  const ctx = new OfflineAudioContext(2, Math.round(DUR * SR), SR);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  // Clapotis de fond : bruit très filtré, en fondu
  const noiseBuf = ctx.createBuffer(1, SR * DUR, SR);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const nf = ctx.createBiquadFilter();
  nf.type = "lowpass";
  nf.frequency.value = 320;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, 0);
  ng.gain.linearRampToValueAtTime(0.05, 0.8);
  ng.gain.linearRampToValueAtTime(0.0001, DUR);
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(master);
  noise.start(0);

  // Les bulles : petits glissandos montants
  const rand = mulberry(7);
  for (let i = 0; i < 22; i++) {
    const t = 0.15 + rand() * (DUR - 0.6);
    const f0 = 260 + rand() * 620;
    const dur = 0.05 + rand() * 0.05;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.7, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.03);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return ctx.startRendering();
}

/** La goutte : plic + échos, ponctue l'arrivée du menu. */
export async function renderDrop(): Promise<AudioBuffer> {
  const DUR = 1.4;
  const ctx = new OfflineAudioContext(2, Math.round(DUR * SR), SR);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  for (let echo = 0; echo < 3; echo++) {
    const t = echo * 0.28;
    const amp = 0.5 * Math.pow(0.38, echo);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1350, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  return ctx.startRendering();
}

/** Voix robotique « Beat Survivor » — placeholder via synthèse vocale système. */
export function speakTitle() {
  try {
    const u = new SpeechSynthesisUtterance("Beat Survivor");
    u.pitch = 0.15;
    u.rate = 0.72;
    u.volume = 0.9;
    const voices = speechSynthesis.getVoices();
    const fr = voices.find((v) => v.lang.startsWith("fr")) ?? voices[0];
    if (fr) u.voice = fr;
    speechSynthesis.speak(u);
  } catch {
    // pas de synthèse vocale disponible : silence digne
  }
}

/** PRNG déterministe : mêmes textures à chaque rendu. */
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
