// MOEBIUS - Beat Survivor, mode Survie
// Techno mentale, hypnotique et acide - 133 BPM - Fa phrygien - 200 mesures (~6 min)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// moebius.src.ts (le morceau), de tb303-bass-line.js (la 303) et des
// instruments du dossier apparat/.
//
// Parti pris : des boucles de longueurs differentes qui tournent les unes
// contre les autres. La mesure fait 16 pas ; la seconde 303 en fait 7, le
// bois 5, l'escalier 15 (5 notes, une tous les 3 pas). Elles ne retombent
// toutes ensemble qu'une seule fois dans le morceau : a la mesure 104,
// et c'est la que tombe le drop final. Tout le reste du temps, l'oreille
// cherche le point de rencontre.
//
// L'escalier est un arpege en sons de Shepard : il monte pendant cinq minutes
// sans jamais arriver nulle part, puis il redescend. Le morceau finit comme
// il commence (souffle, pied, bois) : mis en boucle, il n'a pas de couture.
//
// Instruments : Coup (grosse caisse), Sub (basse creusee par le pied), Peaux
// (ici le bois), Escalier et Souffle sont ecrits pour ces morceaux (Apparat =
// instrument scriptable d'openDAW). Les deux 303 sont le script Apparat
// "TB-303 Bass Line" d'Andre Michelle (CC0). Cymbales et clap : TR-909.

const BPM = 133
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 200
const sr = sampleRate
const barSec = 240 / BPM

const TB303: string = __TB303__
const COUP: string = __COUP__
const SUB: string = __SUB__
const PEAUX: string = __PEAUX__
const ESCALIER: string = __ESCALIER__
const SOUFFLE: string = __SOUFFLE__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- Impact : un coup sourd qui descend, et un souffle court ----------
let seed = 20261113
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296 * 2 - 1
}
function makeImpact() {
    const n = Math.floor(sr * 1.8)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let phase = 0, lp = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        const freq = 28 + 80 * Math.exp(-t * 6)
        phase += freq / sr
        const boom = Math.sin(phase * 2 * Math.PI) * Math.exp(-t * 3.2)
        lp += (rnd() - lp) * (0.02 + 0.4 * Math.exp(-t * 5))
        const air = lp * Math.exp(-t * 4) * 0.4
        const fade = Math.min(1, (n - i) / (sr * 0.05))
        f[i] = Math.tanh((boom * 0.9 + air) * 1.5) * 0.8 * fade
    }
    return audio
}
const impact = await openDAW.addSample(makeImpact(), "MB Impact")

// ---------- La TR-909 d'openDAW (cymbales, clap, caisse claire) ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Moebius")
project.bpm = BPM

// Une reverb courte, pour le clap seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.4, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Structure. Deux creux (56-64 et 96-104), deux drops (64 et 104), un sommet
// (128-152), puis une longue descente qui ramene au point de depart.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 8},
    {name: "Eveil", start: 8, bars: 16},
    {name: "Groove", start: 24, bars: 32},
    {name: "Break", start: 56, bars: 8},
    {name: "Drop", start: 64, bars: 32},
    {name: "Vide", start: 96, bars: 8},
    {name: "Final", start: 104, bars: 24},
    {name: "Sommet", start: 128, bars: 24},
    {name: "Descente", start: 152, bars: 32},
    {name: "Sortie", start: 184, bars: 16}
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

/** Un instrument Apparat : une unite et son code. */
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

/**
 * Une pente sur laquelle on pose une vague lente. Chaque reglage a sa vague,
 * de periode differente (12, 20, 28 mesures...) : les reglages ne repassent
 * jamais ensemble par le meme point, le son ne se repete pas.
 */
function vague(trend: number[][], period: number, depth: number): number[][] {
    const at = (bar: number) => {
        let before = trend[0], after = trend[trend.length - 1]
        for (const p of trend) {
            if (p[0] <= bar) {before = p} else {after = p; break}
        }
        if (after[0] <= before[0]) {return before[1]}
        return before[1] + (after[1] - before[1]) * (bar - before[0]) / (after[0] - before[0])
    }
    const wave = (bar: number) => depth * Math.sin(2 * Math.PI * bar / period)
    const clamp = (v: number) => Math.max(0, Math.min(1, v))
    const out: number[][] = []
    let next = 0
    for (let bar = 0; bar <= TOTAL; bar += 2) {
        while (next < trend.length && trend[next][0] <= bar) {
            out.push([trend[next][0], clamp(trend[next][1] + wave(trend[next][0]))])
            next++
        }
        if (!trend.some(p => p[0] === bar)) {out.push([bar, clamp(at(bar) + wave(bar))])}
    }
    return out
}

const inBreak = (bar: number) => (bar >= 56 && bar < 64) || (bar >= 96 && bar < 104)
const kickOn = (bar: number) => bar < 192 && !inBreak(bar)
const drop = (bar: number) => (bar >= 64 && bar < 96) || (bar >= 104 && bar < 152)
const sommet = (bar: number) => bar >= 128 && bar < 152
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 63 || bar === 103
const limite = (bar: number) => avantDrop(bar) ? 12 : 16

// Les boucles de longueur impaire comptent leurs pas depuis la mesure 104 :
// c'est la, et seulement la, qu'elles repartent toutes de leur premier pas.
const ORIGINE = 104 * 16
const tour = (bar: number, step: number, period: number) =>
    (((bar * 16 + step - ORIGINE) % period) + period) % period

/** Les coups de pied d'une mesure : [pas, velocite]. Le Sub s'en sert aussi. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Le pied garde de la reserve jusqu aux drops : c est la que le niveau monte
    const v = bar < 8 || bar >= 184 ? 0.8 : drop(bar) ? 1 : 0.85
    const out = [[0, v], [4, v], [8, v], [12, v]]
    if (drop(bar) && bar % 8 === 7) {out.push([14, 0.7])}
    return out
}

// ---------- Coup : la grosse caisse ----------
const kick = apparat("Coup", COUP, -5)
regle("coup", kick, "tune", 44)
regle("coup", kick, "sweep", 0.7)
regle("coup", kick, "decay", 150)
regle("coup", kick, "click", 0.7)
regle("coup", kick, "drive", 0.15)
build(kick.noteTracks[0], "Coup", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))

// ---------- Sub : la basse qui roule derriere le pied ----------
// La note 12 ne sonne pas : elle declenche le creux, a chaque coup de pied.
const sub = apparat("Sub", SUB, -12)
regle("sub", sub, "depth", 0.9)
regle("sub", sub, "release", 120)
regle("sub", sub, "drive", 0.45)
const FA = 29, SOLB = 30, LAB = 32
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))
    if (!kickOn(bar) || bar < 8) {return out}
    const v = bar < 24 || bar >= 184 ? 0.7 : drop(bar) ? 1 : 0.8
    for (let beat = 0; beat < 4; beat++) {
        // Fin de phrase : la basse touche le Sol bemol, la seconde mineure
        let pitch = FA
        if (bar % 4 === 3 && beat === 3) {pitch = SOLB}
        if (bar % 16 === 15 && beat === 2) {pitch = LAB}
        const at = beat * 4
        if (beat % 2 === 1) {out.push({position: (at + 1) * S16, duration: Math.round(S16 * 0.8), pitch, velocity: v * 0.6})}
        out.push({position: (at + 2) * S16, duration: Math.round(S16 * 0.9), pitch, velocity: v})
        out.push({position: (at + 3) * S16, duration: Math.round(S16 * 0.85), pitch, velocity: v * 0.85})
    }
    return out
})

// ---------- Les deux 303 ----------
const N = null
// steps : demi-tons au-dessus de la note de base. 1 = Sol bemol, 3 = La bemol.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// A0 : le squelette. A1 : le motif, qui ne change presque jamais (c'est le
// filtre qui raconte). A2 : sa fin de phrase. A3 : le sommet. A4 : les creux.
const A0: Pattern = {steps: [0, N, 0, N, N, 0, N, 0, N, 0, N, N, 0, N, 1, N], accents: [14], slides: []}
const A1: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 0, 12, N, 0, 3, 0, 1, 12], accents: [2, 9, 12], slides: [6, 14]}
const A2: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 13, 12, N, 0, 8, 7, 1, 0], accents: [8, 12], slides: [8, 12, 14]}
const A3: Pattern = {steps: [0, 12, 0, 13, 12, 0, 1, 0, 15, 12, 0, 12, 3, 0, 13, 12], accents: [3, 8, 14], slides: [3, 8, 14]}
const A4: Pattern = {steps: [0, N, N, N, N, N, 1, N, 0, N, N, N, N, N, 13, 12], accents: [6], slides: [14]}
// La seconde 303 : sept pas, contre les seize de la mesure
const E7: Pattern = {steps: [0, N, 7, N, 1, 0, N], accents: [2], slides: [4]}

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

const acid = apparat("Acide", TB303, -2)
regle("acide", acid, "cutoff", 70)
regle("acide", acid, "resonance", 0.85)
regle("acide", acid, "envmod", 0.3)
regle("acide", acid, "decay", 300)
regle("acide", acid, "accent", 1.0)
essai("saturation acide", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.85} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -18})

build(acid.noteTracks[0], "Acide", bar => {
    let pattern: Pattern | null = null
    if (bar >= 16 && bar < 24) {pattern = A0}
    else if (bar >= 24 && bar < 56) {pattern = bar % 8 === 7 ? A2 : A1}
    else if (bar >= 56 && bar < 62) {pattern = A4}
    else if (bar >= 62 && bar < 64) {pattern = A1}
    else if (bar >= 64 && bar < 96) {pattern = bar % 8 === 7 ? A2 : A1}
    else if (bar >= 100 && bar < 102) {pattern = A4}
    else if (bar >= 102 && bar < 104) {pattern = A1}
    else if (bar >= 104 && bar < 128) {pattern = bar % 8 === 7 ? A2 : A1}
    else if (bar >= 128 && bar < 152) {pattern = bar % 8 === 7 ? A2 : bar % 2 === 1 ? A3 : A1}
    else if (bar >= 152 && bar < 176) {pattern = A1}
    else if (bar >= 176 && bar < 184) {pattern = A0}
    if (pattern === null) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, step, 41))
    }
    return out
})

// Le filtre raconte le morceau. Valeurs 0..1 sur la plage declaree par la
// 303 (coupure 60-300 Hz en exponentiel : c'est l'enveloppe qui fait le reste).
auto("acide", acid, "cutoff", vague([
    [0, 0.05], [16, 0.05], [24, 0.14], [40, 0.32], [56, 0.50],
    [56, 0.12], [60, 0.14], [63.75, 0.80], [64, 0.66], [96, 0.86],
    [96, 0.10], [100, 0.12], [103.75, 0.92], [104, 0.80], [128, 0.90], [152, 0.94],
    [152, 0.75], [176, 0.30], [184, 0.12], [200, 0.05]
], 12, 0.07))
auto("acide", acid, "envmod", vague([
    [0, 0.20], [16, 0.20], [56, 0.50], [56, 0.25], [63.75, 0.60], [64, 0.70], [96, 0.80],
    [96, 0.30], [103.75, 0.70], [104, 0.82], [152, 0.92], [184, 0.25], [200, 0.15]
], 20, 0.07))
auto("acide", acid, "resonance", vague([
    [0, 0.78], [24, 0.80], [56, 0.87], [56, 0.94], [64, 0.88], [96, 0.91], [96, 0.96],
    [104, 0.89], [152, 0.93], [184, 0.80], [200, 0.78]
], 28, 0.025))
auto("acide", acid, "decay", [
    [0, 0.12], [24, 0.18], [56, 0.28], [56, 0.70], [64, 0.30], [96, 0.42], [96, 0.80],
    [104, 0.38], [128, 0.46], [152, 0.50], [184, 0.15], [200, 0.12]
])
// Le niveau de la 303 : en retrait dans le groove, plein dans les drops, et il
// retombe a l entree des creux (un creux doit etre un vrai creux, pour l oreille
// comme pour la detection de drop du jeu). Dans la descente, il s efface.
auto("acide", acid, "volume", [
    [0, 0.60], [56, 0.60], [56, 0.36], [60, 0.42], [63.75, 0.66], [64, 0.70], [96, 0.70],
    [96, 0.36], [103.75, 0.68], [104, 0.70], [152, 0.70], [176, 0.52], [184, 0.45], [200, 0.45]
])

const echo = apparat("Echo", TB303, -5, 0.3)
regle("echo", echo, "waveform", 1)
regle("echo", echo, "cutoff", 150)
regle("echo", echo, "resonance", 0.9)
regle("echo", echo, "envmod", 0.5)
regle("echo", echo, "decay", 300)
regle("echo", echo, "accent", 1.0)
echo.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.5, wet: -10})

build(echo.noteTracks[0], "Echo", bar => {
    const on = (bar >= 80 && bar < 96) || (bar >= 104 && bar < 168)
    if (!on) {return []}
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        const index = tour(bar, step, 7)
        if (E7.steps[index] === null) {continue}
        out.push(acidNote(E7, index, step, 53))
    }
    return out
})
auto("echo", echo, "cutoff", vague([
    [0, 0.30], [80, 0.30], [96, 0.60], [104, 0.50], [152, 0.90], [168, 0.30], [200, 0.30]
], 18, 0.08))

// ---------- Escalier : l'arpege qui monte sans fin ----------
// Cinq notes de Fa phrygien, une tous les trois pas. En sons de Shepard,
// apres le Mi bemol vient le Fa "du dessus", qui est le meme Fa : ca monte
// toujours. Dans la descente, la suite est lue a l'envers.
const MARCHES = [53, 54, 56, 60, 63] // Fa, Sol bemol, La bemol, Do, Mi bemol
const stairs = apparat("Escalier", ESCALIER, -6)
regle("escalier", stairs, "width", 1.2)
regle("escalier", stairs, "sweep", 1.6)
regle("escalier", stairs, "fdecay", 80)
regle("escalier", stairs, "grain", 0.5)
regle("escalier", stairs, "drive", 0.35)
regle("escalier", stairs, "spread", 0.7)
stairs.addAudioEffect("Delay", {delay: 11, feedback: 0.4, cross: 1, filter: 0.3, wet: -12})

build(stairs.noteTracks[0], "Escalier", bar => {
    if (bar < 40 || bar >= 184) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        const index = tour(bar, step, 15)
        if (index % 3 !== 0) {continue}
        const marche = index / 3
        const pitch = MARCHES[bar >= 152 ? (5 - marche) % 5 : marche]
        out.push({position: step * S16, duration: S16, pitch, velocity: marche === 0 ? 1 : 0.7})
    }
    return out
})
// decay 40..2000 ms (150 ms = 0.34, 260 = 0.48, 600 = 0.69) ;
// center 120..3000 Hz (400 Hz = 0.37, 800 = 0.59, 1200 = 0.72).
auto("escalier", stairs, "volume", [
    [0, 0.30], [40, 0.30], [56, 0.50], [56, 0.58], [63.75, 0.66], [64, 0.50], [96, 0.55],
    [96, 0.66], [103.75, 0.74], [104, 0.55], [152, 0.66], [168, 0.52], [184, 0.25], [200, 0.25]
])
auto("escalier", stairs, "decay", [
    [0, 0.40], [56, 0.42], [56, 0.66], [63.75, 0.70], [64, 0.40], [96, 0.44], [96, 0.70],
    [103.75, 0.74], [104, 0.42], [152, 0.46], [184, 0.62], [200, 0.62]
])
auto("escalier", stairs, "center", vague([
    [0, 0.36], [56, 0.42], [63.75, 0.60], [64, 0.48], [96, 0.56], [103.75, 0.70], [104, 0.56],
    [152, 0.70], [184, 0.36], [200, 0.36]
], 9, 0.05))

// ---------- Bois : cinq pas contre seize ----------
const wood = apparat("Bois", PEAUX, -8)
regle("bois", wood, "decay", 90)
regle("bois", wood, "bend", 0.3)
regle("bois", wood, "slap", 0.7)
regle("bois", wood, "drive", 0.3)
regle("bois", wood, "width", 0.8)
const BOIS = [65, N, N, 72, N]
build(wood.noteTracks[0], "Bois", bar => {
    if (bar < 4 || bar >= 196) {return []}
    const gain = inBreak(bar) ? 1 : bar < 24 || bar >= 184 ? 0.7 : 0.85
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        const pitch = BOIS[tour(bar, step, 5)]
        if (pitch === null) {continue}
        out.push({position: step * S16, duration: S16 / 2, pitch, velocity: (pitch === 65 ? 1 : 0.75) * gain})
    }
    return out
})

// ---------- Souffle : l'air de la piece, et les montees ----------
const breath = apparat("Souffle", SOUFFLE, -8)
regle("souffle", breath, "reso", 0.6)
regle("souffle", breath, "drift", 0.6)
build(breath.noteTracks[0], "Souffle", bar => {
    const section = SECTIONS.find(s => s.start === bar)
    if (!section) {return []}
    return [{position: 0, duration: section.bars * BAR - 10, pitch: 60, velocity: 1}]
})
// freq 80..8000 Hz (300 Hz = 0.29, 600 = 0.44, 1500 = 0.64, 4000 = 0.85).
// Avant chaque drop le souffle grimpe et enfle : c'est la montee.
auto("souffle", breath, "freq", [
    [0, 0.30], [24, 0.40], [56, 0.35], [60, 0.45], [63.75, 0.88], [64, 0.45], [96, 0.35], [100, 0.48],
    [103.75, 0.92], [104, 0.50], [152, 0.55], [184, 0.35], [200, 0.30]
])
auto("souffle", breath, "volume", [
    [0, 0.55], [8, 0.50], [24, 0.25], [56, 0.25], [56, 0.45], [63.75, 0.95], [64, 0.20], [96, 0.22],
    [96, 0.50], [103.75, 1.0], [104, 0.22], [152, 0.25], [184, 0.50], [200, 0.55]
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
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const k = kickOn(bar), d = drop(bar)
    const full = k && bar >= 24 && bar < 176
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        // Clap sur 2 et 4 : il arrive tard, et il se retire avant la fin
        if (k && step % 8 === 4 && ((bar >= 40 && bar < 56) || d || (bar >= 152 && bar < 168))) {
            hit(step, CLAP, d ? 0.95 : 0.8)
            if (d) {hit(step, SNARE, 0.3)}
        }
        if (k && bar >= 8) {
            if (beat === 2) {hit(step, full ? HAT_O : HAT_C, full ? (d ? 0.85 : 0.7) : 0.55)}
            else if (full) {
                // Dans les drops, un accent tous les trois pas : trois contre quatre
                const accent = d && tour(bar, step, 3) === 0 ? 0.2 : 0
                hit(step, HAT_C, (beat === 0 ? 0.4 : beat === 1 ? 0.2 : 0.3) + accent)
            }
        }
        // Dans les creux, les charleys reviennent a pas de loup
        if ((bar >= 60 && bar < 63) || (bar >= 100 && bar < 103)) {
            hit(step, HAT_C, 0.1 + (bar % 4) * 0.09 + step * 0.004 + (beat === 2 ? 0.1 : 0))
        }
        // Ride : en retrait dans la seconde moitie du premier drop, devant au sommet
        if (((bar >= 80 && bar < 96) || sommet(bar)) && step % 2 === 0) {
            hit(step, RIDE, (beat === 2 ? 0.6 : 0.35) * (sommet(bar) ? 1 : 0.7))
        }
    }
    if (bar === 64 || bar === 104) {hit(0, CRASH, 0.8)}
    if (bar === 128) {hit(0, CRASH, 0.5)}
    if (d && bar % 16 === 15) {hit(13, SNARE, 0.4); hit(15, SNARE, 0.55)}
    // Roulement de caisse claire : court, et il s'arrete un temps avant le drop
    if (avantDrop(bar)) {for (let s = 4; s < 12; s++) {hit(s, SNARE, 0.35 + (s - 4) * 0.06)}}
    return out
})

// ---------- Impacts ----------
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -6})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 64 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 104 * BAR, playback: "no-sync"}))

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
const MESURER = false
const ISOLER = false
const units: any[] = [kick, sub, acid, echo, stairs, wood, breath, drums, fxHit]
const STEMS: [string, any][] = [["Coup", kick], ["Sub", sub], ["Acide", acid], ["Echo", echo],
    ["Escalier", stairs], ["Bois", wood], ["Souffle", breath], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 8], ["eveil", 8, 24], ["groove", 24, 56], ["break", 56, 64],
        ["drop", 64, 96], ["vide", 96, 104], ["final", 104, 128], ["sommet", 128, 152],
        ["descente", 152, 184], ["sortie", 184, 200]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
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
