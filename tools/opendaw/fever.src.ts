// FEVER - Beat Survivor, mode Survie
// Techno hypnotique et tribale - 130 BPM - Sol phrygien - 128 mesures (~3 min 56)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// fever.src.ts (le morceau) et des instruments du dossier apparat/.
//
// Parti pris : une seule note, et tout le reste bouge. Pas de melodie, pas
// d'accord. Des peaux accordees qui tournent en boucles de longueurs
// differentes (16 pas contre 5), un riff sur une note dont on change la
// matiere, et une montee sans fin en arriere-plan : la fievre qui grimpe.
//
// Tous les instruments sont ecrits pour ce morceau (Apparat = instrument
// scriptable d'openDAW) : Coup (grosse caisse), Peaux (toms et congas),
// Fievre (riff FM), Sub (basse creusee par le pied), Shepard (montee sans
// fin). Seuls charleys, clap, ride et caisse claire viennent de la TR-909.

const BPM = 130
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 128
const sr = sampleRate
const barSec = 240 / BPM

const COUP: string = __COUP__
const PEAUX: string = __PEAUX__
const FIEVRE: string = __FIEVRE__
const SUB: string = __SUB__
const SHEPARD: string = __SHEPARD__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- Effets synthetises : montees de bruit et impacts ----------
let seed = 20261112
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

// La montee s'arrete un temps avant le drop : ce temps-la reste vide
const riserLong = await openDAW.addSample(makeRiser(barSec * 3.75), "FV Montee longue")
const riserShort = await openDAW.addSample(makeRiser(barSec * 1.75), "FV Montee courte")
const impact = await openDAW.addSample(makeImpact(), "FV Impact")

// ---------- La TR-909 d'openDAW (cymbales, clap, caisse claire) ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Fever")
project.bpm = BPM

// Une reverb courte, pour le clap et les peaux seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.4, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Structure. Kick des la premiere mesure, un break qui creuse (48-56),
// le drop (56), un solo de peaux (88-92) et le final (92).
const SECTIONS = [
    {name: "Intro", start: 0, bars: 8},
    {name: "Montee", start: 8, bars: 16},
    {name: "Groove", start: 24, bars: 24},
    {name: "Break", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 32},
    {name: "Solo", start: 88, bars: 4},
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

/** Un instrument maison : une unite Apparat et son code. */
function apparat(label: string, code: string, volume: number, panning: number = 0) {
    const unit: any = project.addInstrumentUnit("Apparat", {label, volume, panning} as any)
    unit.instrument.code = code
    return unit
}
const regle = (quoi: string, unit: any, name: string, value: number) =>
    essai(quoi + " " + name, () => {unit.instrument.parameter(name).value = value})

/** Automation d'un parametre : points [mesure, valeur 0..1], interpolation lineaire. */
function auto(quoi: string, unit: any, name: string, points: number[][]) {
    essai("automation " + quoi + " " + name, () => {
        const lane = unit.addValueTrack(unit.instrument.parameter(name), "value")
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

/** Les coups de pied d'une mesure : [pas, velocite]. Le Sub s'en sert aussi. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    const v = bar < 8 ? 0.85 : 1
    const out = [[0, v], [4, v], [8, v], [12, v]]
    // Coups fantomes : la phrase trebuche avant de repartir
    if (final(bar) && bar % 2 === 1) {out.push([11, 0.55])}
    if (drop(bar) && bar % 4 === 3) {out.push([14, 0.7])}
    return out
}

// ---------- Coup : la grosse caisse ----------
const kick = apparat("Coup", COUP, -5)
regle("coup", kick, "tune", 49)
// Peu de saturation et un corps court : mesure, un corps sature qui tient
// 350 ms ecrase tout le mix. Ici il tient 180 ms et la crete depasse de 8 dB.
regle("coup", kick, "sweep", 0.7)
regle("coup", kick, "decay", 150)
regle("coup", kick, "click", 0.7)
regle("coup", kick, "drive", 0.15)
build(kick.noteTracks[0], "Coup", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))

// ---------- Sub : une note tenue, que le pied creuse ----------
// Le creux est dans l'instrument : la note 12 ne sonne pas, elle le declenche.
const sub = apparat("Sub", SUB, -15)
regle("sub", sub, "depth", 0.9)
regle("sub", sub, "release", 160)
regle("sub", sub, "drive", 0.4)
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))
    if (!kickOn(bar)) {return out}
    const velocity = bar < 8 || bar >= 116 ? 0.75 : 1
    if (bar % 8 === 7) {
        // Fin de phrase : la basse glisse au La bemol, la seconde mineure
        out.push({position: 0, duration: 8 * S16 + 20, pitch: 31, velocity})
        out.push({position: 8 * S16, duration: 8 * S16 - 30, pitch: 32, velocity})
    } else {
        out.push({position: 0, duration: BAR - 30, pitch: 31, velocity})
    }
    return out
})

// ---------- Peaux : toms et congas ----------
const N = null
const SWING = Math.round(S16 * 0.1)
const TL = 43, TM = 46, TH = 50, TX = 53 // Sol, Si bemol, Re, Fa
// T0 : le tom grave seul. T1 : l'ostinato. T3 : sa version serree du final.
const T0 = [N, N, N, TL, N, N, TL, N, N, N, N, TL, N, N, TL, N]
const T1 = [N, N, N, TL, N, N, TL, N, N, TM, N, TL, N, TH, TL, N]
const T3 = [N, N, TH, TL, N, TM, TL, N, N, TM, N, TL, TH, N, TL, TX]
// Les congas tournent sur 5 pas : contre les 16 de la mesure, elles ne
// retombent sur leurs pieds que toutes les 5 mesures
const CONGA = [58, N, N, 62, N]

const skins = apparat("Peaux", PEAUX, -7.5)
regle("peaux", skins, "decay", 220)
regle("peaux", skins, "bend", 0.5)
regle("peaux", skins, "slap", 0.4)
regle("peaux", skins, "drive", 0.45)
regle("peaux", skins, "width", 0.7)
skins.addAudioEffect("Delay", {delay: 13, feedback: 0.25, cross: 1, filter: 0.3, wet: -15})
skins.addSend(reverb, {amount: -16})

build(skins.noteTracks[0], "Peaux", bar => {
    const out: Note[] = []
    const limit = avantDrop(bar) ? 12 : 16
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limit) {
            out.push({position: step * S16 + (step % 2 === 1 ? SWING : 0), duration: S16, pitch, velocity: Math.min(1, velocity)})
        }
    }
    const play = (pattern: (number | null)[], gain: number) => pattern.forEach((pitch, step) => {
        if (pitch !== null) {hit(step, pitch, (step === 3 || step === 9 || step === 13 ? 1 : 0.75) * gain)}
    })
    const congas = (from: number, gain: number) => {
        for (let step = 0; step < 16; step++) {
            const pitch = CONGA[((bar - from) * 16 + step) % 5]
            if (pitch !== null) {hit(step, pitch, (pitch === 58 ? 0.8 : 0.6) * gain)}
        }
    }
    if (bar >= 8 && bar < 16) {play(T0, 0.8)}
    else if (bar < 48 && bar >= 16) {play(T1, 0.9)}
    else if (bar < 52 && bar >= 48) {congas(48, 1)}
    else if (bar < 56 && bar >= 52) {congas(48, 1); play(T0, 0.85)}
    else if (bar < 72 && bar >= 56) {play(T1, 1)}
    else if (bar < 88 && bar >= 72) {play(T1, 1); congas(72, 0.85)}
    else if (bar === 88) {play(T1, 1); congas(72, 1)}
    else if (bar === 89) {play(T3, 1); congas(72, 1)}
    else if (bar === 90) {
        // Le solo : seize doubles-croches qui montent en force
        const roll = [TL, TM, TL, TH, TL, TM, TH, TX, TL, TM, TH, TX, TM, TH, TX, 55]
        roll.forEach((pitch, step) => hit(step, pitch, 0.5 + step * 0.03))
    } else if (bar === 91) {
        const climb = [TL, TL, TM, TM, TH, TH, TX, TX, 55, 55, 58, 58]
        climb.forEach((pitch, step) => hit(step, pitch, 0.6 + step * 0.035))
    } else if (bar < 116 && bar >= 92) {play(T3, 1); congas(92, 0.85)}
    else if (bar < 124 && bar >= 116) {play(T0, 0.8)}
    return out
})
// Les peaux sonnent plus long quand le pied se tait
auto("peaux", skins, "decay", [
    [0, 0.48], [48, 0.48], [48, 0.62], [56, 0.62], [56, 0.48], [88, 0.48], [88, 0.60], [92, 0.60],
    [92, 0.50], [128, 0.50]
])

// ---------- Fievre : le riff ----------
// steps : demi-tons au-dessus du Sol. 1 = La bemol, 6 = Re bemol (le triton).
type Pattern = {steps: (number | null)[], accents: number[]}
// R1 : le galop. R2 : sa fin de phrase. R3 : le final, en doubles-croches.
const R1: Pattern = {steps: [0, N, 0, 0, N, 0, 1, N, 0, N, 0, 0, N, 0, 1, 0], accents: [0, 6, 14]}
const R2: Pattern = {steps: [0, N, 0, 12, N, 0, 1, N, 0, N, 12, 0, N, 6, 1, 0], accents: [3, 10, 13]}
const R3: Pattern = {steps: [0, 0, 12, 0, 1, 0, 12, 0, 0, 6, 12, 0, 1, 0, 12, 13], accents: [2, 6, 10, 15]}

const riff = apparat("Fievre", FIEVRE, -8)
regle("fievre", riff, "ratio", 1)
regle("fievre", riff, "index", 2)
regle("fievre", riff, "idecay", 80)
regle("fievre", riff, "decay", 130)
regle("fievre", riff, "drive", 0.35)
regle("fievre", riff, "spread", 0.6)
riff.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.3, wet: -9})

build(riff.noteTracks[0], "Fievre", bar => {
    let pattern: Pattern | null = null
    if (bar >= 16 && bar < 48) {pattern = bar % 4 === 3 ? R2 : R1}
    else if (bar >= 52 && bar < 56) {pattern = R1}
    else if (bar >= 56 && bar < 72) {pattern = bar % 4 === 3 ? R2 : R1}
    else if (bar >= 72 && bar < 88) {pattern = bar % 4 === 3 ? R2 : bar % 2 === 1 ? R3 : R1}
    else if (bar >= 90 && bar < 92) {pattern = R3}
    else if (bar >= 92 && bar < 116) {pattern = bar % 4 === 3 ? R2 : R3}
    else if (bar >= 116 && bar < 124) {pattern = R1}
    if (pattern === null) {return []}
    const out: Note[] = []
    for (let step = 0; step < (avantDrop(bar) ? 12 : 16); step++) {
        const semis = pattern.steps[step]
        if (semis === null) {continue}
        out.push({
            position: step * S16, duration: S16 / 2, pitch: 55 + semis,
            // L'accent de Fievre se declenche a velocite 1.0 pile
            velocity: pattern.accents.includes(step) ? 1.0 : 0.72
        })
    }
    return out
})

// Le mordant monte tout le long du morceau : c'est la fievre.
// index 0..10 ; ratio 0,5..7 (1 = 0.077, 2 = 0.231, 3 = 0.385, 3,5 = 0.462).
auto("fievre", riff, "index", [
    [0, 0.06], [16, 0.06], [24, 0.15], [40, 0.25], [48, 0.30], [52, 0.10], [55.75, 0.45], [56, 0.32],
    [72, 0.38], [88, 0.44], [90, 0.20], [91.75, 0.50], [92, 0.44], [108, 0.55], [116, 0.40], [124, 0.10], [128, 0.10]
])
// La matiere change sans que la note bouge : pleine, puis creuse, puis metal.
// Les glissements (break, mesures 72-76, solo) passent par des rapports non
// entiers : pendant ces mesures-la, le riff se desaccorde et se reforme.
auto("fievre", riff, "ratio", [
    [0, 0.077], [48, 0.077], [56, 0.231], [72, 0.231], [76, 0.385], [88, 0.385], [92, 0.462],
    [116, 0.462], [124, 0.077], [128, 0.077]
])
auto("fievre", riff, "idecay", [
    [0, 0.34], [48, 0.45], [52, 0.70], [56, 0.45], [92, 0.55], [128, 0.34]
])
auto("fievre", riff, "decay", [
    [0, 0.35], [48, 0.45], [52, 0.70], [56, 0.45], [92, 0.50], [116, 0.40], [128, 0.35]
])

// ---------- Shepard : la montee sans fin ----------
const shepard = apparat("Shepard", SHEPARD, -10)
regle("shepard", shepard, "low", 40)
regle("shepard", shepard, "span", 7)
regle("shepard", shepard, "tone", 0.3)
build(shepard.noteTracks[0], "Shepard", bar => {
    const section = SECTIONS.find(s => s.start === bar)
    if (!section) {return []}
    const bars = section.name === "Sortie" ? 10 : section.bars
    return [{position: 0, duration: bars * BAR - 10, pitch: 60, velocity: 1}]
})
// rate -0,5..0,5 octave par seconde (0.5 = immobile). Elle accelere avant
// chaque drop, et dans la sortie elle redescend : la fievre tombe.
auto("shepard", shepard, "rate", [
    [0, 0.53], [48, 0.55], [55.75, 0.75], [56, 0.58], [88, 0.60], [91.75, 0.80], [92, 0.62],
    [116, 0.66], [116, 0.35], [128, 0.40]
])
auto("shepard", shepard, "volume", [
    [0, 0.25], [48, 0.30], [52, 0.60], [55.75, 0.80], [56, 0.30], [88, 0.35], [88, 0.60],
    [91.75, 0.85], [92, 0.35], [116, 0.40], [128, 0.15]
])

// ---------- Cymbales, clap, caisse claire : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -2})
const SNARE = 38, CLAP = 39, HAT_C = 42, HAT_O = 46, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Snare", SNARE, {volume: -8}],
    ["Clap", CLAP, {volume: -1}],
    ["Closed Hat", HAT_C, {volume: -6, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -6, panning: 0.1, exclude: true}],
    ["Crash", CRASH, {volume: -15}],
    ["Ride", RIDE, {volume: -11, panning: 0.22}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -26})

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number, late: number = 0) =>
        out.push({position: step * S16 + late, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const sw = (step: number) => step % 2 === 1 ? SWING : 0
    const k = kickOn(bar), g = groove(bar), d = drop(bar), f = final(bar)
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (g && bar >= 24 && bar < 120 && step % 8 === 4) {
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
        // Ride : en retrait dans la seconde moitie du drop, devant au final
        if (((bar >= 72 && bar < 88) || f) && step % 2 === 0) {hit(step, RIDE, (beat === 2 ? 0.6 : 0.35) * (f ? 1 : 0.7))}
    }
    if (bar === 56 || bar === 92) {hit(0, CRASH, 0.8)}
    if (bar === 87) {for (let s = 12; s < 16; s++) {hit(s, SNARE, 0.5 + (s - 12) * 0.12)}}
    // Roulement de caisse claire : il s'arrete un temps avant le drop
    if (bar === 54) {for (let s = 0; s < 16; s += 2) {hit(s, SNARE, 0.3 + s * 0.015)}}
    if (bar === 55) {for (let s = 0; s < 12; s++) {hit(s, SNARE, 0.5 + s * 0.04)}}
    return out
})

// ---------- Effets : montees et impacts ----------
const fxRise: any = project.addInstrumentUnit("Tape", {label: "Montees", volume: -16})
essai("montee longue", () => fxRise.audioTracks[0].addRegion(riserLong, {position: 52 * BAR, playback: "no-sync"}))
essai("montee courte", () => fxRise.audioTracks[0].addRegion(riserShort, {position: 90 * BAR, playback: "no-sync"}))
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -6})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 56 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 92 * BAR, playback: "no-sync"}))

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// STEMS = [] : mix seul. Sinon, la liste des pistes a isoler.
const MESURER = true
const units: any[] = [kick, sub, skins, riff, shepard, drums, fxRise, fxHit]
const STEMS: [string, any][] = [["Coup", kick], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 8], ["montee", 8, 24], ["groove", 24, 48], ["break", 48, 56],
        ["drop1", 56, 72], ["drop2", 72, 88], ["solo", 88, 92], ["final", 92, 116], ["sortie", 116, 128]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(STEMS)) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
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
        report.push(stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " : " + cells.join(", "))
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
