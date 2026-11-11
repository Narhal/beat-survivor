// Répétition à blanc : exécute le script d'un morceau hors d'openDAW, contre un
// faux openDAW qui se contente de noter ce qu'on lui demande. Ça ne dit rien du
// son, mais ça attrape les erreurs de script avant le passage dans le navigateur
// et ça permet d'écouter les samples que le script fabrique (la voix).
//
//   node tools/opendaw/essai.mjs tools/opendaw/danger.ts [dossier pour les .wav]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { transformSync } from "esbuild";

const file = process.argv[2];
const wavDir = process.argv[3];
if (!file) throw new Error("usage : node essai.mjs <morceau.ts> [dossier wav]");

const source = readFileSync(file, "utf8").replace("const MESURER = true", "const MESURER = false");
const js = transformSync(`async function __run(){\n${source}\n}`, { loader: "ts" }).code;

const PPQN = { Bar: 3840, SemiQuaver: 240 };
const samples = [];
const units = [];

function makeUnit(kind, props = {}) {
  const unit = {
    kind, label: props.label ?? kind, volume: props.volume, mute: false,
    notes: [], audio: [], lanes: [], effects: [], params: {},
  };
  unit.instrument = {
    set code(v) { unit.code = v.length; },
    parameter: (name) => ({ set value(v) { unit.params[name] = v; }, name }),
    addSample: (smp, p) => ({ smp, p }),
  };
  unit.noteTracks = [{
    addRegion: (r) => ({ addEvents: (events) => unit.notes.push({ ...r, events }) }),
  }];
  unit.audioTracks = [{
    addRegion: (sample, r) => {
      if (!sample) throw new Error("région audio sans sample");
      unit.audio.push({ name: sample.name, ...r });
    },
  }];
  unit.addAudioEffect = (name, p) => { unit.effects.push(name); return {}; };
  unit.addSend = () => {};
  unit.addValueTrack = (target, p) => ({
    addRegion: () => ({ addEvents: (events) => unit.lanes.push({ path: target?.name ?? p, points: events.length }) }),
  });
  units.push(unit);
  return unit;
}

const project = {
  addAuxUnit: (p) => makeUnit("Aux", p),
  addInstrumentUnit: (key, p) => makeUnit(key, p),
  output: { addAudioEffect: () => ({}) },
  mixdown: async () => ({ sampleRate: 48000, frames: [new Float32Array(48000)] }),
  openInStudio: () => {},
};

const kit909 = ["Bassdrum", "Snare", "Clap", "Closed Hat", "Open Hat", "Ride", "Crash", "Rimshot", "Low Tom", "Mid Tom", "High Tom"];
const openDAW = {
  newProject: (name) => { project.name = name; return project; },
  listSamples: async () => kit909.map((n) => ({ name: "909 " + n })),
  addSample: async (audio, name) => { samples.push({ name, audio }); return { name }; },
  showInfo: async (title, text) => console.log(`[${title}] ${text}`),
};
const AudioData = { create: (rate, n, ch) => ({ sampleRate: rate, frames: Array.from({ length: ch }, () => new Float32Array(n)) }) };
const globals = {
  PPQN, sampleRate: 48000, openDAW, AudioData,
  ClassicWaveform: {}, VoicingMode: {}, Interpolation: { Linear: 0 },
  gainToDb: (g) => 20 * Math.log10(g),
};

const run = new Function(...Object.keys(globals), js + "\nreturn __run();");
await run(...Object.values(globals));

console.log(`projet « ${project.name} », ${project.bpm} BPM`);
for (const u of units) {
  const notes = u.notes.reduce((n, r) => n + r.events.length, 0);
  const bad = u.notes.flatMap((r) => r.events).filter((e) => !(e.velocity > 0 && e.velocity <= 1) || !Number.isFinite(e.pitch) || !(e.duration > 0) || e.position < 0);
  const line = [`${u.label} (${u.kind}, ${u.volume ?? "-"} dB)`];
  if (u.notes.length) line.push(`${u.notes.length} régions, ${notes} notes` + (bad.length ? `, ${bad.length} NOTES INVALIDES` : ""));
  if (u.audio.length) line.push("audio : " + u.audio.map((a) => `${a.name}@${(a.position / PPQN.Bar).toFixed(2)}`).join(", "));
  if (u.lanes.length) line.push("automations : " + u.lanes.map((l) => `${l.path}(${l.points})`).join(" "));
  if (u.effects.length) line.push("effets : " + u.effects.join("+"));
  console.log("  " + line.join(" | "));
}
for (const s of samples) {
  const f = s.audio.frames[0];
  let peak = 0, sum = 0;
  for (const v of f) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  console.log(`  sample ${s.name} : ${(f.length / s.audio.sampleRate).toFixed(2)} s, crête ${peak.toFixed(2)}, RMS ${(10 * Math.log10(sum / f.length)).toFixed(1)} dB`);
}

if (wavDir) {
  mkdirSync(wavDir, { recursive: true });
  for (const s of samples) {
    const f = s.audio.frames[0];
    const buf = Buffer.alloc(44 + f.length * 2);
    buf.write("RIFF", 0); buf.writeUInt32LE(36 + f.length * 2, 4); buf.write("WAVEfmt ", 8);
    buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(s.audio.sampleRate, 24); buf.writeUInt32LE(s.audio.sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(f.length * 2, 40);
    for (let i = 0; i < f.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, f[i])) * 32767), 44 + i * 2);
    writeFileSync(path.join(wavDir, s.name.replace(/[^\w-]+/g, "_") + ".wav"), buf);
  }
  console.log(`${samples.length} fichiers .wav écrits dans ${wavDir}`);
}
