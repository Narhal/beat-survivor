// DANGER DANGER - Beat Survivor, mode Survie
// Acid techno sombre - 132 BPM - La phrygien - 128 mesures (~3 min 53)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// danger.src.ts (le morceau), tb303-bass-line.js (la 303) et voix-sam.json
// (la voix robot).
//
// Parti pris : sec, sombre, hypnotique. Pas de nappe, pas de theme chante,
// presque pas de reverb. Une seule fondamentale (La) et sa seconde mineure
// (Si bemol) pour la menace. C'est le filtre de la 303 qui raconte.
//
// Palette : TR-909 (samples d'openDAW), deux TB-303 (script Apparat
// "TB-303 Bass Line" d'Andre Michelle, CC0), basse roulante, accord dub,
// bourdon, et la voix de SAM (synthese vocale 8 bits de 1982).

const BPM = 132
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 128
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM

const TB303: string = __TB303__
const VOIX: any = __VOIX__

const W: any = ClassicWaveform
const SAW = W.Saw ?? W.saw ?? 2
const SQUARE = W.Square ?? W.square ?? 3
const TRI = W.Triangle ?? W.triangle ?? 1
const SINE = W.Sine ?? W.sine ?? 0
const V: any = VoicingMode
const MONO = V.Monophonic ?? V.monophonic
const POLY = V.Polyphonic ?? V.polyphonic

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (La, 110 Hz).
// Ici on les decode, on les reechantillonne (et on les transpose au besoin),
// puis on les pose sur la grille du morceau.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const b64v: number[] = []
for (let i = 0; i < 128; i++) {b64v.push(0)}
for (let i = 0; i < 64; i++) {b64v[B64.charCodeAt(i)] = i}
const sources: any = {}
function source(nom: string): Float32Array {
    if (sources[nom]) {return sources[nom]}
    const m = VOIX.mots[nom]
    const out = new Float32Array(m.n)
    let o = 0
    for (let i = 0; i + 3 < m.b64.length && o < m.n; i += 4) {
        const v = (b64v[m.b64.charCodeAt(i)] << 18) | (b64v[m.b64.charCodeAt(i + 1)] << 12)
            | (b64v[m.b64.charCodeAt(i + 2)] << 6) | b64v[m.b64.charCodeAt(i + 3)]
        const bytes = [(v >> 16) & 255, (v >> 8) & 255, v & 255]
        for (let k = 0; k < 3 && o < m.n; k++) {out[o++] = (bytes[k] - 128) / 128}
    }
    sources[nom] = out
    return out
}

/** Un mot, a la frequence du projet. semis : transposition en demi-tons. */
function mot(nom: string, semis: number): Float32Array {
    const m = VOIX.mots[nom]
    const src = source(nom)
    const ratio = (VOIX.rate / sr) * (VOIX.cible / m.f0) * Math.pow(2, semis / 12)
    const n = Math.floor((src.length - 2) / ratio)
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        const p = i * ratio
        const k = Math.floor(p)
        out[i] = src[k] + (src[k + 1] - src[k]) * (p - k)
    }
    return out
}

// [mot, position en temps, demi-tons, duree max en temps (0 = mot entier)]
type Dit = [string, number, number, number]
async function phrase(label: string, dits: Dit[]) {
    let total = 0
    const parts = dits.map(d => {
        const buf = mot(d[0], d[2])
        const len = d[3] > 0 ? Math.min(buf.length, Math.floor(d[3] * beatSec * sr)) : buf.length
        const start = Math.floor(d[1] * beatSec * sr)
        total = Math.max(total, start + len)
        return {buf, start, len}
    })
    const audio = AudioData.create(sr, total, 1)
    const f = audio.frames[0]
    const fade = Math.floor(sr * 0.004)
    for (const p of parts) {
        for (let i = 0; i < p.len; i++) {
            f[p.start + i] += p.buf[i] * Math.min(1, i / 48, (p.len - i) / fade)
        }
    }
    let top = 0
    for (let i = 0; i < total; i++) {const a = Math.abs(f[i]); if (a > top) {top = a}}
    const k = top > 0 ? 0.9 / top : 1
    for (let i = 0; i < total; i++) {f[i] *= k}
    return await openDAW.addSample(audio, label)
}

// "Danger."
const vUn = await phrase("DD Danger", [["danger", 0, 0, 0]])
// "Danger, danger." - le second un demi-ton au-dessus : la seconde mineure
const vDeux = await phrase("DD Danger danger", [["danger", 0, 0, 0], ["danger", 2, 1, 0]])
// "Let's go faster."
const vGo = await phrase("DD Lets go faster", [["letsgo", 0, 0, 0], ["faster", 2, 0, 0]])
// "D-d-d-d-DANGER" : quatre amorces en doubles-croches, le mot tombe sur le temps
const vBegaie = await phrase("DD D-d-d-danger", [
    ["danger", 0, 0, 0.22], ["danger", 0.25, 0, 0.22], ["danger", 0.5, 0, 0.22], ["danger", 0.75, 0, 0.22],
    ["danger", 1, 0, 0]
])
// "Faster, faster, fasterfasterfaster" : le mot se resserre et grimpe
const vVite = await phrase("DD Faster qui accelere", [
    ["faster", 0, 0, 0.98], ["faster", 1, 1, 0.98], ["faster", 2, 2, 0.48], ["faster", 2.5, 3, 0.48],
    ["faster", 3, 4, 0.24], ["faster", 3.25, 5, 0.24], ["faster", 3.5, 6, 0.24], ["faster", 3.75, 7, 0.24]
])

// ---------- Effets synthetises : montees de bruit et impacts ----------
let seed = 20261111
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296 * 2 - 1
}

/** Montee : bruit blanc dans un passe-bande qui grimpe, volume qui enfle. */
function makeRiser(seconds: number) {
    const n = Math.floor(sr * seconds)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let low = 0, band = 0
    for (let i = 0; i < n; i++) {
        const t = i / n
        const fc = 180 * Math.pow(38, t)
        const k = 2 * Math.sin(Math.PI * Math.min(fc, sr / 7) / sr)
        const x = rnd()
        low += k * band
        const high = x - low - 0.35 * band
        band += k * high
        const fade = Math.min(1, (n - i) / (sr * 0.02))
        f[i] = Math.tanh(band * 0.9) * t * t * 0.7 * fade
    }
    return audio
}

/** Impact : un coup sourd qui descend, et un souffle court. */
function makeImpact() {
    const n = Math.floor(sr * 1.8)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let phase = 0, lp = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        const freq = 30 + 80 * Math.exp(-t * 6)
        phase += freq / sr
        const boom = Math.sin(phase * 2 * Math.PI) * Math.exp(-t * 3.2)
        lp += (rnd() - lp) * (0.02 + 0.4 * Math.exp(-t * 5))
        const air = lp * Math.exp(-t * 4) * 0.4
        const fade = Math.min(1, (n - i) / (sr * 0.05))
        f[i] = Math.tanh((boom * 0.9 + air) * 1.5) * 0.8 * fade
    }
    return audio
}

// La montee s'arrete un temps avant le drop : ce temps-la est pour la voix seule
const riserLong = await openDAW.addSample(makeRiser(barSec * 3.75), "DD Montee longue")
const riserShort = await openDAW.addSample(makeRiser(barSec * 1.75), "DD Montee courte")
const impact = await openDAW.addSample(makeImpact(), "DD Impact")

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Danger Danger")
project.bpm = BPM

// Une reverb courte, pour le clap et le bourdon seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.45, damping: 0.5, preDelay: 10, wet: 0, dry: -60} as any)

// Structure. Kick des la premiere mesure, un break qui creuse (48-56),
// le drop (56), un second trou (88-92) et le final (92).
const SECTIONS = [
    {name: "Intro", start: 0, bars: 8},
    {name: "Montee", start: 8, bars: 16},
    {name: "Groove", start: 24, bars: 24},
    {name: "Break", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 32},
    {name: "Trou", start: 88, bars: 4},
    {name: "Final", start: 92, bars: 24},
    {name: "Sortie", start: 116, bars: 12}
]

type Note = {position: number, duration: number, pitch: number, velocity: number}

function build(track: any, label: string, perBar: (bar: number) => Note[]) {
    for (const s of SECTIONS) {
        const events: Note[] = []
        for (let b = 0; b < s.bars; b++) {
            for (const e of perBar(s.start + b)) {
                events.push({position: b * BAR + e.position, duration: e.duration, pitch: e.pitch, velocity: e.velocity})
            }
        }
        if (events.length === 0) {continue}
        const region = track.addRegion({position: s.start * BAR, duration: s.bars * BAR, label: label + " - " + s.name})
        region.addEvents(events)
    }
}

/** Automation : points [mesure, valeur 0..1], interpolation lineaire. */
function automate(quoi: string, unit: any, target: any, path: string, points: number[][]) {
    essai("automation " + quoi, () => {
        const lane = unit.addValueTrack(target, path)
        const region = lane.addRegion({position: 0, duration: TOTAL * BAR})
        region.addEvents(points.map(p => ({
            position: Math.round(p[0] * BAR), value: p[1], interpolation: Interpolation.Linear
        })))
    })
}

const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 92)
const kickOn = (bar: number) => bar < 124 && !inBreak(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 92 && bar < 116)
const groove = (bar: number) => (bar >= 16 && bar < 48) || drop(bar)
const final = (bar: number) => bar >= 92 && bar < 116
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 91

// ---------- Batterie : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -5})
const KICK = 36, RIM = 37, SNARE = 38, CLAP = 39, TOM_L = 45, TOM_M = 47, TOM_H = 50
const HAT_C = 42, HAT_O = 46, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Bassdrum", KICK, {volume: 0}],
    ["Rimshot", RIM, {volume: -10, panning: -0.3}],
    ["Snare", SNARE, {volume: -8}],
    ["Clap", CLAP, {volume: -3}],
    ["Low Tom", TOM_L, {volume: -6, panning: -0.3}],
    ["Mid Tom", TOM_M, {volume: -7, panning: 0}],
    ["High Tom", TOM_H, {volume: -7, panning: 0.3}],
    ["Closed Hat", HAT_C, {volume: -8.5, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -8, panning: 0.1, exclude: true}],
    ["Crash", CRASH, {volume: -11}],
    ["Ride", RIDE, {volume: -13, panning: 0.22}]
]
let kickSlot: any = null
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    const slot = drums.instrument.addSample(smp, {note, ...props} as any)
    if (note === KICK) {kickSlot = slot}
}
// Un peu de saturation sur toute la batterie : ca soude et ca durcit
essai("saturation batterie", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -28})

// Les doubles-croches impaires trainent un peu : le balancement
const SWING = Math.round(S16 * 0.13)

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number, late: number = 0) =>
        out.push({position: step * S16 + late, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const sw = (step: number) => step % 2 === 1 ? SWING : 0
    const k = kickOn(bar), g = groove(bar), d = drop(bar), f = final(bar)
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (k && beat === 0) {hit(step, KICK, bar < 8 ? 0.9 : 1.0)}
        // Le pied double en fin de phrase
        if (d && bar % 8 === 7 && step === 14) {hit(step, KICK, 0.75)}
        if (g && bar < 120 && step % 8 === 4) {
            hit(step, CLAP, 0.95)
            if (d) {hit(step, SNARE, 0.35)}
        }
        // Charleys : contretemps seul, puis doubles-croches accentuees
        if (k && bar >= 4) {
            if (beat === 2) {hit(step, g ? HAT_O : HAT_C, g ? (d ? 0.85 : 0.7) : 0.6)}
            else if (bar >= 8) {hit(step, HAT_C, beat === 0 ? 0.42 : beat === 1 ? 0.2 : 0.32, sw(step))}
        }
        // Dans le break, les charleys reviennent a pas de loup
        if (bar >= 52 && bar < 55) {hit(step, HAT_C, 0.1 + (bar - 52) * 0.08 + (beat === 2 ? 0.12 : 0), sw(step))}
        if (bar === 90) {hit(step, HAT_C, 0.2 + (beat === 2 ? 0.12 : 0), sw(step))}
        // Ride : en retrait dans la seconde moitie du drop, devant au final
        if (((bar >= 72 && bar < 88) || f) && step % 2 === 0) {hit(step, RIDE, (beat === 2 ? 0.6 : 0.35) * (f ? 1 : 0.7))}
        // Rimshot : la syncope
        if (((bar >= 24 && bar < 48) || d) && (step === 3 || step === 10 || (bar % 2 === 1 && step === 14))) {
            hit(step, RIM, 0.5, sw(step))
        }
        // Tom grave : le roulis tribal
        if (((bar >= 40 && bar < 48) || (bar >= 72 && bar < 88) || f) && (step === 7 || step === 13)) {
            hit(step, TOM_L, step === 7 ? 0.55 : 0.45, sw(step))
        }
    }
    if (bar === 56 || bar === 92) {hit(0, CRASH, 0.8)}
    // Roulements de toms avant le groove et avant le break
    if (bar === 23) {[TOM_M, TOM_M, TOM_L, TOM_L].forEach((tom, i) => hit(12 + i, tom, 0.5 + i * 0.06))}
    if (bar === 47) {[TOM_H, TOM_H, TOM_M, TOM_H, TOM_M, TOM_M, TOM_L, TOM_L].forEach((tom, i) => hit(8 + i, tom, 0.55 + i * 0.05))}
    if (bar === 87) {for (let s = 12; s < 16; s++) {hit(s, SNARE, 0.5 + (s - 12) * 0.12)}}
    // Roulement de caisse claire : il s'arrete un temps avant le drop
    if (bar === 54) {for (let s = 0; s < 16; s += 2) {hit(s, SNARE, 0.3 + s * 0.015)}}
    if (avantDrop(bar)) {for (let s = 0; s < 12; s++) {hit(s, SNARE, 0.5 + s * 0.04)}}
    return out
})

// ---------- Les deux 303 ----------
function make303(label: string, volume: number, panning: number) {
    const unit: any = project.addInstrumentUnit("Apparat", {label, volume, panning} as any)
    unit.instrument.code = TB303
    return unit
}
const set303 = (unit: any, name: string, value: number) =>
    essai("303 " + name, () => {unit.instrument.parameter(name).value = value})

const N = null
// steps : demi-tons au-dessus de la note de base. 1 = Si bemol, 6 = Mi bemol.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// P0 : le squelette, trois contre quatre. P1 : le motif. P2 : sa fin de phrase.
// P3 : le sommet, une octave plus haut. P4 : le break, de longues notes liees.
const P0: Pattern = {steps: [0, N, N, 0, N, N, 0, N, N, 0, N, N, 0, N, 1, N], accents: [12], slides: []}
const P1: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 12, 0, N, 3, 0, 13, 12, -12], accents: [2, 8, 13], slides: [6, 13]}
const P2: Pattern = {steps: [0, 12, 0, 0, 6, 0, 12, N, 0, 0, 15, 12, 13, 12, 3, 1], accents: [4, 10, 12], slides: [10, 12, 14]}
const P3: Pattern = {steps: [12, 0, 12, 13, N, 12, 0, 12, 15, 12, N, 18, 12, 13, 0, 24], accents: [3, 8, 11, 15], slides: [3, 8, 11]}
const P4: Pattern = {steps: [0, N, N, N, 12, N, N, 1, N, N, 0, N, N, N, 13, 12], accents: [4, 14], slides: [14]}
// Seconde 303 : motif de 12 pas qui tourne contre la mesure de 16
const PD: Pattern = {steps: [0, N, 0, 1, N, 0, N, 12, 0, N, 3, N], accents: [7], slides: [3]}

function acidNote(pattern: Pattern, index: number, step: number, base: number): Note {
    const slide = pattern.slides.includes(index)
    return {
        position: step * S16,
        // Une note liee deborde sur la suivante : c'est le recouvrement qui
        // declenche le glissando dans la 303
        duration: Math.round(S16 * (slide ? 1.3 : 0.6)),
        pitch: base + (pattern.steps[index] as number),
        // L'accent de cette 303 se declenche a velocite 1.0 pile
        velocity: pattern.accents.includes(index) ? 1.0 : 0.7
    }
}

const acid = make303("303", -2, 0)
set303(acid, "cutoff", 70)
set303(acid, "resonance", 0.85)
set303(acid, "envmod", 0.3)
set303(acid, "decay", 300)
set303(acid, "accent", 1.0)
essai("saturation 303", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.85} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -18})

build(acid.noteTracks[0], "303", bar => {
    if (bar < 8 || bar >= 126) {return []}
    let pattern = P1
    if (bar < 16 || bar >= 116) {pattern = P0}
    else if (bar < 24) {pattern = bar % 8 === 7 ? P2 : P1}
    else if (bar < 48) {pattern = bar % 4 === 3 ? P2 : P1}
    else if (bar < 52) {pattern = P4}
    else if (bar < 56) {pattern = P1}
    else if (bar < 72) {pattern = bar % 4 === 3 ? P2 : P1}
    else if (bar < 88) {pattern = bar % 4 === 2 ? P3 : bar % 4 === 3 ? P2 : P1}
    else if (bar < 90) {pattern = P4}
    else if (bar < 92) {pattern = P1}
    else {pattern = bar % 8 === 7 ? P2 : bar % 2 === 0 ? P3 : P1}
    const out: Note[] = []
    for (let step = 0; step < (avantDrop(bar) ? 12 : 16); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, step, 45))
    }
    return out
})

// Le filtre raconte le morceau. Valeurs 0..1 sur la plage declaree par la
// 303 (coupure 60-300 Hz en exponentiel : c'est l'enveloppe qui fait le reste).
automate("303 cutoff", acid, acid.instrument.parameter("cutoff"), "value", [
    [0, 0.05], [8, 0.05], [16, 0.12], [24, 0.30], [40, 0.45], [48, 0.55],
    [48, 0.10], [52, 0.10], [55.75, 0.90], [56, 0.80], [72, 0.88], [88, 0.95],
    [88, 0.15], [91.75, 0.95], [92, 0.92], [108, 1.0], [116, 0.60], [124, 0.10], [128, 0.05]
])
automate("303 envmod", acid, acid.instrument.parameter("envmod"), "value", [
    [0, 0.10], [16, 0.20], [24, 0.40], [48, 0.55], [48, 0.25], [55.75, 0.60], [56, 0.75],
    [88, 0.85], [88, 0.30], [92, 0.90], [116, 0.60], [124, 0.15], [128, 0.15]
])
automate("303 resonance", acid, acid.instrument.parameter("resonance"), "value", [
    [0, 0.75], [24, 0.82], [48, 0.88], [52, 0.95], [56, 0.88], [88, 0.92], [90, 0.97], [92, 0.90],
    [116, 0.85], [128, 0.75]
])
automate("303 decay", acid, acid.instrument.parameter("decay"), "value", [
    [0, 0.10], [24, 0.20], [48, 0.25], [48, 0.70], [56, 0.30], [72, 0.40], [88, 0.50],
    [88, 0.80], [92, 0.45], [116, 0.25], [128, 0.10]
])
// Le niveau de la 303 retombe a l entree des breaks : le trou doit etre un vrai
// trou, pour l oreille comme pour la detection de drop du jeu.
automate("303 volume", acid, acid.instrument.parameter("volume"), "value", [
    [0, 0.70], [48, 0.70], [48, 0.35], [52, 0.45], [55.75, 0.70], [88, 0.70],
    [88, 0.40], [91.75, 0.70], [128, 0.70]
])

const acid2 = make303("303 Carree", -7, 0.25)
set303(acid2, "waveform", 1)
set303(acid2, "cutoff", 150)
set303(acid2, "resonance", 0.9)
set303(acid2, "envmod", 0.5)
set303(acid2, "decay", 300)
set303(acid2, "accent", 1.0)
acid2.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.5, wet: -10})

build(acid2.noteTracks[0], "303 carree", bar => {
    const on = (bar >= 72 && bar < 88) || (bar >= 96 && bar < 116)
    if (!on) {return []}
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        const index = ((bar - 72) * 16 + step) % 12
        if (PD.steps[index] === null) {continue}
        out.push(acidNote(PD, index, step, 57))
    }
    return out
})
automate("303 carree cutoff", acid2, acid2.instrument.parameter("cutoff"), "value", [
    [0, 0.30], [72, 0.30], [88, 0.70], [96, 0.50], [112, 0.90], [116, 0.40], [128, 0.40]
])

// ---------- Basse roulante : trois doubles-croches derriere chaque pied ----------
const rumble = project.addInstrumentUnit("Vaporisateur", {label: "Roulis", volume: -6}, {
    cutoff: 400, resonance: 1, filterOrder: 1, filterEnvelope: 0,
    attack: 0.004, decay: 0.15, sustain: 0.7, release: 0.06,
    voicingMode: MONO,
    oscillators: [{waveform: SINE, volume: -3}, {waveform: TRI, volume: -12}]
} as any)

build(rumble.noteTracks[0], "Roulis", bar => {
    if (!kickOn(bar)) {return []}
    const out: Note[] = []
    const soft = bar < 8 || bar >= 116 ? 0.7 : 1
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (beat === 0) {continue}
        // Fin de phrase : le dernier temps monte au Si bemol
        const pitch = bar % 4 === 3 && step >= 13 ? 34 : 33
        out.push({position: step * S16, duration: Math.round(S16 * 0.75), pitch,
            velocity: (beat === 1 ? 0.55 : beat === 2 ? 0.9 : 0.7) * soft})
    }
    return out
})

// ---------- Accord dub : un coup sec, l'echo fait le reste ----------
const stab = project.addInstrumentUnit("Vaporisateur", {label: "Accord", volume: -12, panning: -0.2}, {
    cutoff: 1100, resonance: 2, filterOrder: 2, filterEnvelope: 0.4,
    attack: 0.002, decay: 0.18, sustain: 0.0, release: 0.12,
    voicingMode: POLY,
    oscillators: [{waveform: SAW, volume: -8}, {waveform: SQUARE, volume: -12, tune: 7}]
} as any)
stab.addAudioEffect("Delay", {delay: 13, feedback: 0.55, cross: 1, filter: 0.3, wet: -8})
stab.addSend(reverb, {amount: -14})

const AM7 = [57, 60, 64, 67]
const BB = [58, 62, 65, 69]
build(stab.noteTracks[0], "Accord", bar => {
    const on = (bar >= 32 && bar < 48) || (bar >= 64 && bar < 88) || final(bar)
    if (!on) {return []}
    const chord = bar % 8 === 7 ? BB : AM7
    const steps = bar % 2 === 0 ? [3] : [3, 10]
    const out: Note[] = []
    for (const step of steps) {
        for (const pitch of chord) {out.push({position: step * S16, duration: S16, pitch, velocity: 0.8})}
    }
    return out
})

// ---------- Bourdon : le sol sous les pieds quand le kick se tait ----------
const drone = project.addInstrumentUnit("Vaporisateur", {label: "Bourdon", volume: -19}, {
    cutoff: 300, resonance: 1.0, filterOrder: 2, filterEnvelope: 0,
    attack: 1.5, decay: 1.0, sustain: 1.0, release: 2.0,
    voicingMode: POLY, unisonCount: 3, unisonDetune: 20, unisonStereo: 1,
    oscillators: [{waveform: SAW, volume: -8}, {waveform: SAW, volume: -12, octave: 1, tune: 5}]
} as any)
drone.addSend(reverb, {amount: -8})
const DRONE = [33, 45, 52, 58]
build(drone.noteTracks[0], "Bourdon", bar => {
    const hold = (bars: number) => DRONE.map(pitch => ({position: 0, duration: bars * BAR - S16, pitch, velocity: 0.6}))
    if (bar === 0) {return hold(8)}
    if (bar === 48) {return hold(8)}
    if (bar === 88) {return hold(4)}
    if (bar === 120) {return hold(8)}
    return []
})
automate("bourdon cutoff", drone, drone.instrument, "cutoff", [
    [0, 0.38], [8, 0.34], [48, 0.34], [55.75, 0.58], [56, 0.34], [88, 0.36], [91.75, 0.58], [92, 0.34],
    [120, 0.42], [128, 0.30]
])

// ---------- La voix ----------
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -2.5})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 1, filter: 0.3, wet: -12})
const dire = (quoi: string, sample: any, bar: number, step: number) =>
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
dire("intro", vUn, 7, 8)
dire("avant groove", vDeux, 23, 0)
dire("groove", vDeux, 39, 0)
dire("break 1", vDeux, 50, 0)
dire("break 2", vDeux, 52, 0)
dire("break go", vGo, 54, 0)
dire("break vite", vVite, 55, 0)
dire("drop 63", vBegaie, 63, 12)
dire("drop 71", vBegaie, 71, 12)
dire("drop 79", vBegaie, 79, 12)
dire("trou 1", vDeux, 88, 0)
dire("trou go", vGo, 90, 0)
dire("trou vite", vVite, 91, 0)
dire("final 99", vBegaie, 99, 12)
dire("final 107", vBegaie, 107, 12)
dire("final 115", vDeux, 115, 0)
dire("fin", vDeux, 126, 0)

// ---------- Effets : montees et impacts ----------
const fxRise: any = project.addInstrumentUnit("Tape", {label: "Montees", volume: -14})
essai("montee longue", () => fxRise.audioTracks[0].addRegion(riserLong, {position: 52 * BAR, playback: "no-sync"}))
essai("montee courte", () => fxRise.audioTracks[0].addRegion(riserShort, {position: 90 * BAR, playback: "no-sync"}))
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -6})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 56 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 92 * BAR, playback: "no-sync"}))

// ---------- Pompe : le pied creuse la basse et l'accord ----------
function pump(quoi: string, unit: any, threshold: number, ratio: number) {
    essai("pompe " + quoi, () => {
        const comp: any = unit.addAudioEffect("Compressor", {
            threshold, ratio, attack: 1, release: 140, knee: 6, automakeup: false, makeup: 0
        } as any)
        if (kickSlot) {comp.sideChain = kickSlot}
    })
}
pump("roulis", rumble, -20, 6)
pump("accord", stab, -18, 4)

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// STEMS = [] : mix seul. Sinon, la liste des pistes a isoler.
const MESURER = false
const units: any[] = [drums, acid, acid2, rumble, stab, drone, voix, fxRise, fxHit]
const STEMS: any[] = [drums, acid, acid2, rumble, stab, voix]
if (MESURER) {
    const parts = [["intro", 0, 8], ["montee", 8, 24], ["groove", 24, 48], ["break", 48, 56],
        ["drop1", 56, 72], ["drop2", 72, 88], ["trou", 88, 92], ["final", 92, 116], ["sortie", 116, 128]]
    const report: string[] = []
    for (const solo of [null].concat(STEMS) as any[]) {
        units.forEach(u => u.mute = solo !== null && u !== solo)
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const n = L.length
        let peakValue = 0
        for (let i = 0; i < n; i++) {const a = Math.abs(L[i]); if (a > peakValue) {peakValue = a}}
        const cells: string[] = []
        for (const s of parts) {
            const from = Math.max(1, Math.floor((s[1] as number) * barSec * rate))
            const to = Math.min(n, Math.floor((s[2] as number) * barSec * rate))
            let sx = 0, sd = 0
            for (let i = from; i < to; i++) {const d = L[i] - L[i - 1]; sx += L[i] * L[i]; sd += d * d}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / (to - from))).toFixed(1) + "dB " + Math.round(Math.sqrt(sd / sx) * rate / (2 * Math.PI)) + "Hz" : "silence"))
        }
        report.push((solo === null ? "MIX" : solo.label) + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " : " + cells.join(", "))
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
