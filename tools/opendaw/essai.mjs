// Répétition à blanc : exécute le script d'un morceau hors d'openDAW, contre un
// faux openDAW qui note ce qu'on lui demande. Ça attrape les erreurs de script
// avant le passage dans le navigateur, et ça va plus loin pour deux choses :
//
// - les samples que le script fabrique (voix, montées) sortent en .wav ;
// - les instruments Apparat (du code, pas des samples) sont réellement joués :
//   notes, paramètres et automations compris. On obtient leur niveau et leur
//   brillance par section, sans navigateur.
//
// Ce n'est PAS le rendu d'openDAW : ni ses effets (delay, limiteur…), ni ses
// instruments à lui (Playfield, Vaporisateur). C'est un banc d'essai.
//
//   node tools/opendaw/essai.mjs tools/opendaw/fever.ts [dossier pour les .wav]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { transformSync } from "esbuild";

const file = process.argv[2];
const wavDir = process.argv[3];
if (!file) throw new Error("usage : node essai.mjs <morceau.ts> [dossier wav]");

const RATE = 48000;
const PPQN = { Bar: 3840, SemiQuaver: 240 };
const source = readFileSync(file, "utf8").replace("const MESURER = true", "const MESURER = false");
const js = transformSync(`async function __run(){\n${source}\n}`, { loader: "ts" }).code;

const samples = [];
const units = [];

function makeUnit(kind, props = {}) {
  const unit = {
    kind, label: props.label ?? kind, volume: props.volume ?? 0, mute: false,
    notes: [], audio: [], lanes: [], effects: [], params: {}, code: null,
  };
  unit.instrument = {
    set code(v) { unit.code = v; },
    parameter: (name) => ({ name, set value(v) { unit.params[name] = v; } }),
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
  unit.addAudioEffect = (name) => { unit.effects.push(name); return {}; };
  unit.addSend = () => {};
  unit.addValueTrack = (target, p) => ({
    addRegion: () => ({ addEvents: (events) => unit.lanes.push({ param: target?.name ?? p, events }) }),
  });
  units.push(unit);
  return unit;
}

const project = {
  addAuxUnit: (p) => makeUnit("Aux", p),
  addInstrumentUnit: (key, p) => makeUnit(key, p),
  output: { addAudioEffect: () => ({}) },
  mixdown: async () => ({ sampleRate: RATE, frames: [new Float32Array(RATE)] }),
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
  PPQN, sampleRate: RATE, openDAW, AudioData,
  ClassicWaveform: {}, VoicingMode: {}, Interpolation: { Linear: 0 },
  gainToDb: (g) => 20 * Math.log10(g),
};

const run = new Function(...Object.keys(globals), js + "\nreturn __run();");
await run(...Object.values(globals));

// ---------- Ce que le script a demandé ----------
console.log(`projet « ${project.name} », ${project.bpm} BPM`);
for (const u of units) {
  const all = u.notes.flatMap((r) => r.events);
  const bad = all.filter((e) => !(e.velocity > 0 && e.velocity <= 1) || !Number.isFinite(e.pitch) || !(e.duration > 0) || e.position < 0);
  const line = [`${u.label} (${u.kind}, ${u.volume} dB)`];
  if (u.notes.length) line.push(`${u.notes.length} régions, ${all.length} notes` + (bad.length ? `, ${bad.length} NOTES INVALIDES` : ""));
  if (u.audio.length) line.push("audio : " + u.audio.map((a) => `${a.name}@${(a.position / PPQN.Bar).toFixed(2)}`).join(", "));
  if (u.lanes.length) line.push("automations : " + u.lanes.map((l) => `${l.param}(${l.events.length})`).join(" "));
  if (u.effects.length) line.push("effets : " + u.effects.join("+"));
  console.log("  " + line.join(" | "));
}
for (const s of samples) {
  const f = s.audio.frames[0];
  let peak = 0, sum = 0;
  for (const v of f) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  console.log(`  sample ${s.name} : ${(f.length / s.audio.sampleRate).toFixed(2)} s, crête ${peak.toFixed(2)}, RMS ${(10 * Math.log10(sum / f.length)).toFixed(1)} dB`);
}

// ---------- Les instruments Apparat, joués pour de vrai ----------
const barSec = 240 / project.bpm;
const toSamples = (ppq) => Math.round((ppq / PPQN.Bar) * barSec * RATE);
const lastBar = Math.max(1, ...units.flatMap((u) => u.notes.map((r) => Math.ceil((r.position + r.duration) / PPQN.Bar))));
const total = toSamples(lastBar * PPQN.Bar) + RATE;

function compile(code) {
  const params = [];
  for (const line of code.split("\n")) {
    const m = line.match(/^\/\/\s*@param\s+(\S+)\s+(\S+)(?:\s+(\S+)\s+(\S+)(?:\s+(\S+))?)?/);
    if (!m) continue;
    const bool = m[2] === "true" || m[2] === "false";
    params.push({
      name: m[1], def: bool ? (m[2] === "true" ? 1 : 0) : Number(m[2]),
      min: m[3] !== undefined ? Number(m[3]) : 0, max: m[4] !== undefined ? Number(m[4]) : 1, curve: m[5] ?? "linear",
    });
  }
  return { params, Processor: new Function("sampleRate", code + "\nreturn Processor;")(RATE) };
}

/** Valeur 0..1 d'une automation → valeur réelle du paramètre (hypothèse : exp = géométrique). */
const denorm = (p, v) => p.curve === "exp" ? p.min * Math.pow(p.max / p.min, v) : p.min + v * (p.max - p.min);

function valueAt(events, ppq) {
  let before = null, after = null;
  for (const e of events) {
    if (e.position <= ppq) before = e;
    else { after = e; break; }
  }
  if (!before) return events[0].value;
  if (!after || after.position === before.position) return before.value;
  return before.value + (after.value - before.value) * (ppq - before.position) / (after.position - before.position);
}

function render(u) {
  const { params, Processor } = compile(u.code);
  const proc = new Processor();
  const byName = Object.fromEntries(params.map((p) => [p.name, p]));
  const current = {};
  for (const p of params) { current[p.name] = p.def; proc.paramChanged(p.name, p.def); }
  for (const [name, value] of Object.entries(u.params)) {
    if (!byName[name]) throw new Error(`${u.label} : paramètre inconnu « ${name} »`);
    current[name] = value; proc.paramChanged(name, value);
  }
  for (const lane of u.lanes) if (!byName[lane.param]) throw new Error(`${u.label} : automation d'un paramètre inconnu « ${lane.param} »`);

  const events = [];
  let id = 0;
  for (const r of u.notes) for (const e of r.events) {
    const nid = ++id;
    events.push({ t: toSamples(r.position + e.position), on: 1, pitch: e.pitch, velocity: e.velocity, id: nid });
    events.push({ t: toSamples(r.position + e.position + e.duration), on: 0, id: nid });
  }
  events.sort((a, b) => a.t - b.t || a.on - b.on);

  const gain = Math.pow(10, u.volume / 20);
  const L = new Float32Array(total), R = new Float32Array(total);
  const bufL = new Float32Array(128), bufR = new Float32Array(128);
  let next = 0;
  for (let b = 0; b < total; b += 128) {
    const ppq = (b / RATE / barSec) * PPQN.Bar;
    for (const lane of u.lanes) {
      const v = denorm(byName[lane.param], valueAt(lane.events, ppq));
      if (v !== current[lane.param]) { current[lane.param] = v; proc.paramChanged(lane.param, v); }
    }
    bufL.fill(0); bufR.fill(0);
    const end = Math.min(128, total - b);
    let s0 = 0;
    while (s0 < end) {
      while (next < events.length && events[next].t <= b + s0) {
        const e = events[next++];
        if (e.on) proc.noteOn(e.pitch, e.velocity, 0, e.id); else proc.noteOff(e.id);
      }
      const s1 = next < events.length ? Math.min(end, events[next].t - b) : end;
      proc.process([bufL, bufR], { s0, s1 });
      s0 = s1;
    }
    for (let i = 0; i < end; i++) { L[b + i] = bufL[i] * gain; R[b + i] = bufR[i] * gain; }
  }
  return { L, R };
}

function wav(name, L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(path.join(wavDir, name.replace(/[^\w-]+/g, "_") + ".wav"), buf);
}

// Découpage en tranches de 8 mesures : assez fin pour voir un break
const slices = [];
for (let bar = 0; bar < lastBar; bar += 8) slices.push([bar, Math.min(lastBar, bar + 8)]);

function report(label, L, R) {
  let peak = 0, nan = 0;
  for (let i = 0; i < L.length; i++) {
    if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) { nan++; continue; }
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const cells = slices.map(([a, z]) => {
    const from = Math.max(1, toSamples(a * PPQN.Bar)), to = toSamples(z * PPQN.Bar);
    let sx = 0, sd = 0;
    for (let i = from; i < to; i++) { const m = (L[i] + R[i]) / 2, p = (L[i - 1] + R[i - 1]) / 2; sx += m * m; sd += (m - p) * (m - p); }
    if (sx === 0) return "   —   ";
    return `${(10 * Math.log10(sx / (to - from))).toFixed(0).padStart(3)}/${String(Math.round(Math.sqrt(sd / sx) * RATE / (2 * Math.PI))).padStart(4)}`;
  });
  console.log(`  ${label.padEnd(10)} crête ${peak.toFixed(2)}${nan ? ` ${nan} NaN !` : ""} | ${cells.join(" ")}`);
}

const apparats = units.filter((u) => u.code);
if (apparats.length) {
  console.log(`\nInstruments Apparat joués hors navigateur — par tranche de 8 mesures : niveau dB / brillance Hz`);
  console.log(`  ${"mesure".padEnd(10)}            | ${slices.map(([a]) => String(a).padStart(4).padEnd(8)).join(" ")}`);
  const mixL = new Float32Array(total), mixR = new Float32Array(total);
  if (wavDir) mkdirSync(wavDir, { recursive: true });
  for (const u of apparats) {
    const { L, R } = render(u);
    report(u.label, L, R);
    for (let i = 0; i < total; i++) { mixL[i] += L[i]; mixR[i] += R[i]; }
    if (wavDir) wav("piste " + u.label, L, R);
  }
  report("SOMME", mixL, mixR);
  if (wavDir) wav("somme des Apparat", mixL, mixR);
}

if (wavDir) {
  mkdirSync(wavDir, { recursive: true });
  for (const s of samples) wav(s.name, s.audio.frames[0], s.audio.frames[0]);
  console.log(`fichiers .wav écrits dans ${wavDir}`);
}
