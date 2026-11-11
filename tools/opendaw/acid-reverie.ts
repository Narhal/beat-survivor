// ACID REVERIE - Beat Survivor, mode Survie
// Acid techno reveuse - 124 BPM - La mineur - 128 mesures (~4 min 08)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// acid-reverie.src.ts (le morceau) et tb303-bass-line.js (la 303).
//
// Palette : TR-909 (samples d'openDAW), deux TB-303 (script Apparat
// "TB-303 Bass Line" d'Andre Michelle, CC0), nappe, basse, theme, cloche.

const BPM = 124
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 128
const sr = sampleRate
const barSec = 240 / BPM

// Le code de la 303 (instrument scriptable Apparat)
const TB303: string = "// @label TB-303 Bass Line\n// @param waveform   false\n// @param tuning     0     -12   12     linear  st\n// @param cutoff     80    60    300    exp     Hz\n// @param resonance  1.0   0     1      linear\n// @param envmod     0.0   0     1      linear\n// @param decay      300   200   2000   exp     ms\n// @param accent     1.0   0     1      linear\n// @param volume     0.7   0     1      linear\n\nclass Processor {\n    waveform = 0\n    tuning = 0\n    cutoffHz = 80\n    resonance = 0.8\n    envmod = 0.2\n    decayMs = 300\n    accentAmount = 1.0\n    volume = 0.7\n    phase = 0\n    freqTarget = 220\n    freqSmoothed = 220\n    y1 = 0\n    y2 = 0\n    y3 = 0\n    y4 = 0\n    fbHpState = 0\n    oscHpState = 0\n    postHpState = 0\n    vcaGate = 0\n    vcaDecay = 0\n    megEnv = 0\n    megDecayCoeff = 0.9999\n    vcaDecayCoeff = 0.9999\n    vcaGateCoeff = 0.999\n    accentCap = 0\n    isAccented = false\n    gate = false\n    sliding = false\n    heldNotes = []\n    cutoffSmoothed = 200\n    ampSmoothed = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"waveform\": this.waveform = value; break\n            case \"tuning\": this.tuning = value; break\n            case \"cutoff\": this.cutoffHz = value; break\n            case \"resonance\": this.resonance = value; break\n            case \"envmod\": this.envmod = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"accent\": this.accentAmount = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100 + this.tuning) / 12)\n        const isSlide = this.heldNotes.length > 0\n        this.heldNotes.push({id, pitch, cent})\n        this.freqTarget = freq\n        if (isSlide) {\n            this.sliding = true\n        } else {\n            this.sliding = false\n            this.freqSmoothed = freq\n            this.gate = true\n            this.vcaDecay = 1.0\n            this.megEnv = 1.0\n            this.isAccented = velocity >= 1.0\n            if (this.isAccented) {\n                this.megDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.05 * sampleRate))\n            } else {\n                this.megDecayCoeff = Math.exp(-1 / (this.decayMs * 0.001 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (1.23 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.001 * sampleRate))\n            }\n        }\n    }\n    noteOff(id) {\n        this.heldNotes = this.heldNotes.filter(note => note.id !== id)\n        if (this.heldNotes.length === 0) {\n            this.gate = false\n            this.sliding = false\n        } else {\n            const prev = this.heldNotes[this.heldNotes.length - 1]\n            this.freqTarget = 440 * Math.pow(2, (prev.pitch - 69 + prev.cent / 100 + this.tuning) / 12)\n            this.sliding = true\n        }\n    }\n    reset() {\n        this.gate = false\n        this.sliding = false\n        this.vcaGate = 0\n        this.ampSmoothed = 0\n        this.vcaGateCoeff = Math.exp(-1 / (0.005 * sampleRate))\n        this.heldNotes = []\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const invSr = 1 / sr\n        const sr2 = sr * 2\n        const PI = Math.PI\n        const gateAttack = 1 - Math.exp(-1 / (0.003 * sr))\n        const slideAlpha = 1 - Math.exp(-1 / (0.012 * sr))\n        const accChargeAlpha = 1 - Math.exp(-1 / (0.147 * sr))\n        const accDischargeMul = Math.exp(-1 / (0.1 * sr))\n        const resoSkewed = this.resonance * this.resonance\n        const kFeedback = resoSkewed * 28\n        const gNorm = kFeedback / 17\n        let gComp = (gNorm - 1) * resoSkewed + 1\n        gComp *= (1 + resoSkewed)\n        const fbHpAlpha = 1 - Math.exp(-2 * PI * 150 / sr2)\n        const oscHpAlpha = 1 - Math.exp(-2 * PI * 44 / sr)\n        const postHpAlpha = 1 - Math.exp(-2 * PI * 24 / sr)\n        const cutoffAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const ampAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const envDepth = 1.5 + this.envmod * 4.0\n        const envOffset = this.envmod * 0.33\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.sliding) {\n                this.freqSmoothed += (this.freqTarget - this.freqSmoothed) * slideAlpha\n            } else {\n                this.freqSmoothed = this.freqTarget\n            }\n            const freq = this.freqSmoothed\n            const phaseInc = freq * invSr\n            let osc = 0\n            if (this.waveform === 0) {\n                osc = 2 * this.phase - 1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            } else {\n                const duty = Math.max(0.1, Math.min(0.9, 0.71 - 0.26 * (freq - 65) / 595))\n                osc = this.phase < duty ? 1 : -1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc += t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc += t * t + t + t + 1\n                }\n                let rd = this.phase - duty\n                if (rd < 0) rd += 1\n                if (rd < phaseInc && rd >= 0) {\n                    const t = rd / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (rd > 1 - phaseInc) {\n                    const t = (rd - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            }\n            this.oscHpState += oscHpAlpha * (osc - this.oscHpState)\n            osc -= this.oscHpState\n            this.megEnv *= this.megDecayCoeff\n            if (this.isAccented && this.gate) {\n                this.accentCap += accChargeAlpha * (this.megEnv * this.accentAmount - this.accentCap)\n            } else {\n                this.accentCap *= accDischargeMul\n            }\n            let targetCutoff = this.cutoffHz * Math.pow(2, envDepth * (this.megEnv - envOffset))\n            if (this.isAccented) {\n                targetCutoff *= Math.pow(2, this.accentAmount * this.megEnv * 2.5)\n            }\n            targetCutoff *= Math.pow(2, this.accentCap * 1.0)\n            if (targetCutoff < 60) targetCutoff = 60\n            if (targetCutoff > sr * 0.45) targetCutoff = sr * 0.45\n            this.cutoffSmoothed += (targetCutoff - this.cutoffSmoothed) * cutoffAlpha\n            const gf = Math.tan(PI * this.cutoffSmoothed / sr2)\n            const b0 = gf / (1 + gf)\n            for (let os = 0; os < 2; os++) {\n                const fbRaw = kFeedback * this.y4\n                this.fbHpState += fbHpAlpha * (fbRaw - this.fbHpState)\n                const fbHp = fbRaw - this.fbHpState\n                const y0 = Math.tanh(osc - fbHp)\n                this.y1 += 2 * b0 * (y0 - this.y1 + this.y2)\n                this.y1 = Math.tanh(this.y1)\n                this.y2 += b0 * (this.y1 - 2 * this.y2 + this.y3)\n                this.y2 = Math.tanh(this.y2)\n                this.y3 += b0 * (this.y2 - 2 * this.y3 + this.y4)\n                this.y3 = Math.tanh(this.y3)\n                this.y4 += b0 * (this.y3 - 2 * this.y4)\n                this.y4 = Math.tanh(this.y4)\n            }\n            let filtered = 2.5 * gComp * this.y4\n            this.postHpState += postHpAlpha * (filtered - this.postHpState)\n            filtered -= this.postHpState\n            if (this.gate) {\n                this.vcaGate += (1 - this.vcaGate) * gateAttack\n            } else {\n                this.vcaGate *= this.vcaGateCoeff\n            }\n            this.vcaDecay *= this.vcaDecayCoeff\n            let amp = this.vcaGate * this.vcaDecay\n            if (this.gate) {\n                amp += 0.45 * this.megEnv\n                if (this.isAccented) {\n                    amp += this.accentAmount * 4.0 * this.megEnv\n                }\n            }\n            this.ampSmoothed += (amp - this.ampSmoothed) * ampAlpha\n            const sample = Math.tanh(filtered * this.ampSmoothed) * this.volume\n            outL[s] += sample\n            outR[s] += sample\n            this.phase += phaseInc\n            if (this.phase >= 1) this.phase -= 1\n        }\n    }\n}"

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

/** Impact : une grosse caisse de cathedrale et un souffle qui retombe. */
function makeImpact() {
    const n = Math.floor(sr * 2.6)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let phase = 0, lp = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        const freq = 32 + 70 * Math.exp(-t * 5)
        phase += freq / sr
        const boom = Math.sin(phase * 2 * Math.PI) * Math.exp(-t * 2.1)
        lp += (rnd() - lp) * (0.02 + 0.5 * Math.exp(-t * 3))
        const air = lp * Math.exp(-t * 2.6) * 0.5
        const fade = Math.min(1, (n - i) / (sr * 0.05))
        f[i] = Math.tanh((boom * 0.9 + air) * 1.4) * 0.8 * fade
    }
    return audio
}

const riserLong = await openDAW.addSample(makeRiser(barSec * 8), "AR Montee 8 mesures")
const riserShort = await openDAW.addSample(makeRiser(barSec * 2), "AR Montee 2 mesures")
const impact = await openDAW.addSample(makeImpact(), "AR Impact")

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Acid Reverie")
project.bpm = BPM

const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.8, damping: 0.3, preDelay: 18, wet: 0, dry: -60} as any)

// Structure. La musique fait le niveau : l'intro ne dort pas, le break creuse
// un vrai trou, deux drops (mesures 64 et 96).
const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Montee", start: 16, bars: 16},
    {name: "Groove", start: 32, bars: 16},
    {name: "Break", start: 48, bars: 16},
    {name: "Drop", start: 64, bars: 32},
    {name: "Final", start: 96, bars: 16},
    {name: "Sortie", start: 112, bars: 16}
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

// Harmonie : La mineur. Grille de 8 mesures, deux mesures par accord :
// Lam - Fa - Do - Sol (i - VI - III - VII), la grille qui serre la gorge.
const SCALE = [0, 2, 3, 5, 7, 8, 10]
const degree = (base: number, d: number) => base + 12 * Math.floor(d / 7) + SCALE[((d % 7) + 7) % 7]
const chordAt = (bar: number) => Math.floor((bar % 8) / 2)
const ROOTS = [0, -2, 2, -1]

const inBreak = (bar: number) => bar >= 48 && bar < 64
const inGap = (bar: number) => bar >= 94 && bar < 96
const groove = (bar: number) => (bar >= 16 && bar < 48) || (bar >= 64 && bar < 94) || (bar >= 96 && bar < 116)
const peak = (bar: number) => (bar >= 64 && bar < 94) || (bar >= 96 && bar < 112)

// ---------- Batterie : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -5})
const KICK = 36, RIM = 37, SNARE = 38, CLAP = 39, TOM_L = 45, TOM_M = 47, TOM_H = 50
const HAT_C = 42, HAT_O = 46, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Bassdrum", KICK, {volume: 0}],
    ["Rimshot", RIM, {volume: -11, panning: -0.3}],
    ["Snare", SNARE, {volume: -8}],
    ["Clap", CLAP, {volume: -5}],
    ["Low Tom", TOM_L, {volume: -7, panning: -0.35}],
    ["Mid Tom", TOM_M, {volume: -7, panning: 0}],
    ["High Tom", TOM_H, {volume: -7, panning: 0.35}],
    ["Closed Hat", HAT_C, {volume: -11, panning: 0.12, exclude: true}],
    ["Open Hat", HAT_O, {volume: -10, panning: 0.12, exclude: true}],
    ["Crash", CRASH, {volume: -9}],
    ["Ride", RIDE, {volume: -14, panning: 0.25}]
]
let kickSlot: any = null
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    const slot = drums.instrument.addSample(smp, {note, ...props} as any)
    if (note === KICK) {kickSlot = slot}
}
drums.addSend(reverb, {amount: -24})

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const kickOn = (bar < 48 || bar >= 64) && !inGap(bar) && bar < 124
    const g = groove(bar)
    const p = peak(bar)
    for (let step = 0; step < 16; step++) {
        const offbeat = step % 4 === 2
        if (kickOn && step % 4 === 0) {hit(step, KICK, bar < 8 ? 0.85 : 1.0)}
        // Le pied respire en fin de phrase : un rappel avant la mesure suivante
        if (kickOn && bar % 8 === 7 && step === 14 && bar >= 16) {hit(step, KICK, 0.7)}
        if (g && step % 8 === 4) {hit(step, CLAP, 0.9)}
        if (p && step % 8 === 4) {hit(step, SNARE, 0.45)}
        // Charleys : contretemps seuls au debut, doubles-croches ensuite
        if (bar >= 4 && !inBreak(bar) && !inGap(bar) && bar < 124) {
            if (offbeat) {hit(step, g ? HAT_O : HAT_C, g ? 0.7 : 0.6)}
            else if (bar >= 8 && bar < 120) {hit(step, HAT_C, step % 2 === 1 ? 0.3 : 0.5)}
        }
        // Dans le break, les charleys reviennent a pas de loup
        if (bar >= 56 && bar < 64) {hit(step, HAT_C, 0.12 + (bar - 56) * 0.05 + (step % 2 === 0 ? 0.08 : 0))}
        // Ride : la cymbale qui dit qu'on est au sommet
        const ride = (bar >= 40 && bar < 48) || (bar >= 80 && bar < 94) || (bar >= 96 && bar < 112)
        if (ride && step % 2 === 0) {hit(step, RIDE, offbeat ? 0.65 : 0.4)}
        // Rimshot : la syncope qui fait hocher la tete
        if (bar >= 8 && bar < 32 && (step === 3 || step === 10)) {hit(step, RIM, 0.5)}
        if (((bar >= 32 && bar < 48) || p) && (step === 7 || step === 10 || step === 15)) {hit(step, RIM, 0.45)}
    }
    // Crash a l'entree de chaque grande section
    if (bar === 16 || bar === 32 || bar === 64 || bar === 80 || bar === 96 || bar === 112) {hit(0, CRASH, 0.8)}
    // Roulements de toms avant les relances
    if (bar === 31 || bar === 79 || bar === 111) {
        const fill = [TOM_H, TOM_H, TOM_M, TOM_H, TOM_M, TOM_M, TOM_L, TOM_L]
        fill.forEach((tom, i) => hit(8 + i, tom, 0.55 + i * 0.05))
    }
    // Roulement de caisse claire : quatre mesures qui se resserrent vers le drop
    if (bar === 60) {for (let s = 0; s < 16; s += 4) {hit(s, SNARE, 0.3 + s * 0.008)}}
    if (bar === 61) {for (let s = 0; s < 16; s += 2) {hit(s, SNARE, 0.4 + s * 0.012)}}
    if (bar === 62) {for (let s = 0; s < 16; s++) {hit(s, SNARE, 0.5 + s * 0.02)}}
    if (bar === 63) {for (let s = 0; s < 12; s++) {hit(s, SNARE, 0.75 + s * 0.02)}}
    // Seconde relance, plus courte
    if (bar === 94) {for (let s = 0; s < 16; s += 2) {hit(s, SNARE, 0.45 + s * 0.02)}}
    if (bar === 95) {for (let s = 0; s < 12; s++) {hit(s, SNARE, 0.65 + s * 0.03)}}
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
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// A : le motif roulant. B : sa variation qui monte. C : le squelette.
const PA: Pattern = {steps: [0, N, 7, 0, N, 0, 7, N, 0, 4, N, 0, 7, 0, 2, 4], accents: [2, 6, 12], slides: [8, 13, 14]}
const PB: Pattern = {steps: [0, 0, 7, N, 9, 7, 0, N, 0, 7, 11, 9, 7, N, 4, 6], accents: [4, 10], slides: [4, 10, 14]}
const PC: Pattern = {steps: [0, N, N, 0, N, N, 7, N, 0, N, N, 0, N, 4, N, 7], accents: [6], slides: []}
// Seconde 303 : motif de 12 pas qui tourne contre la mesure de 16
const PD: Pattern = {steps: [7, N, 9, 7, N, 11, N, 7, 9, N, 4, 6], accents: [5], slides: [2, 10]}

function acidNote(pattern: Pattern, index: number, step: number, base: number, root: number): Note {
    const slide = pattern.slides.includes(index)
    return {
        position: step * S16,
        // Une note liee deborde sur la suivante : c'est le recouvrement qui
        // declenche le glissando dans la 303
        duration: Math.round(S16 * (slide ? 1.3 : 0.6)),
        pitch: degree(base, root + (pattern.steps[index] as number)),
        // L'accent de cette 303 se declenche a velocite 1.0 pile
        velocity: pattern.accents.includes(index) ? 1.0 : 0.7
    }
}

const acid = make303("303 Basse", -9, -0.08)
set303(acid, "cutoff", 90)
set303(acid, "resonance", 0.8)
set303(acid, "envmod", 0.3)
set303(acid, "decay", 300)
set303(acid, "accent", 0.9)
essai("saturation 303", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 10, outputGain: -7, mix: 0.7} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.35, cross: 1, filter: 0.4, wet: -15})
acid.addSend(reverb, {amount: -16})

build(acid.noteTracks[0], "303", bar => {
    if (bar < 8 || bar >= 124 || (bar >= 48 && bar < 56)) {return []}
    let pattern = PA
    if (bar < 16 || bar >= 112) {pattern = PC}
    else if (bar < 32) {pattern = bar % 8 >= 6 ? PB : PA}
    else if (bar < 48) {pattern = bar % 4 === 3 ? PB : PA}
    else if (bar < 64) {pattern = bar >= 62 ? PB : PA}
    else if (bar < 80) {pattern = bar % 4 === 3 ? PB : PA}
    else if (bar < 96) {pattern = bar % 2 === 1 ? PB : PA}
    else {pattern = bar % 2 === 0 ? PB : PA}
    const root = ROOTS[chordAt(bar)]
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, step, 45, root))
    }
    return out
})

// Le filtre raconte le morceau. Valeurs 0..1 sur la plage declaree par la
// 303 (coupure 60-300 Hz en exponentiel : c'est l'enveloppe qui fait le reste).
automate("303 cutoff", acid, acid.instrument.parameter("cutoff"), "value", [
    [0, 0.10], [8, 0.10], [16, 0.25], [32, 0.55], [48, 0.65],
    [48, 0.15], [56, 0.15], [63.5, 0.95], [64, 0.80], [80, 0.90], [94, 0.70],
    [96, 1.0], [112, 0.85], [124, 0.15], [128, 0.15]
])
automate("303 envmod", acid, acid.instrument.parameter("envmod"), "value", [
    [0, 0.15], [8, 0.15], [32, 0.45], [48, 0.55], [56, 0.30], [64, 0.70],
    [96, 0.85], [112, 0.60], [124, 0.20], [128, 0.20]
])
automate("303 resonance", acid, acid.instrument.parameter("resonance"), "value", [
    [0, 0.70], [32, 0.80], [56, 0.85], [63.5, 0.95], [64, 0.86], [96, 0.90], [124, 0.75], [128, 0.75]
])
automate("303 decay", acid, acid.instrument.parameter("decay"), "value", [
    [0, 0.15], [48, 0.30], [64, 0.45], [96, 0.55], [124, 0.20], [128, 0.20]
])

const acid2 = make303("303 Aigue", -14, 0.3)
set303(acid2, "waveform", 1)
set303(acid2, "cutoff", 140)
set303(acid2, "resonance", 0.9)
set303(acid2, "envmod", 0.6)
set303(acid2, "decay", 400)
set303(acid2, "accent", 1.0)
acid2.addAudioEffect("Delay", {delay: 11, feedback: 0.45, cross: 1, filter: 0.5, wet: -9})
acid2.addSend(reverb, {amount: -10})

build(acid2.noteTracks[0], "303 aigue", bar => {
    const on = (bar >= 80 && bar < 94) || (bar >= 96 && bar < 116)
    if (!on) {return []}
    const root = ROOTS[chordAt(bar)]
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        const index = ((bar - 80) * 16 + step) % 12
        if (PD.steps[index] === null) {continue}
        out.push(acidNote(PD, index, step, 57, root))
    }
    return out
})
automate("303 aigue cutoff", acid2, acid2.instrument.parameter("cutoff"), "value", [
    [0, 0.40], [80, 0.40], [94, 0.85], [96, 0.70], [112, 0.95], [116, 0.50], [128, 0.50]
])

// ---------- Basse : une sinusoide qui tient la fondamentale ----------
const sub = project.addInstrumentUnit("Vaporisateur", {label: "Basse", volume: -10}, {
    cutoff: 500, resonance: 1, filterOrder: 1, filterEnvelope: 0,
    attack: 0.012, decay: 0.3, sustain: 1.0, release: 0.12,
    voicingMode: MONO,
    oscillators: [{waveform: SINE, volume: -3}, {volume: -Infinity}]
} as any)

build(sub.noteTracks[0], "Basse", bar => {
    const on = groove(bar) || (bar >= 116 && bar < 120)
    if (!on || bar % 2 === 1) {return []}
    return [{position: 0, duration: 2 * BAR - S16, pitch: degree(33, ROOTS[chordAt(bar)]), velocity: 0.9}]
})

// ---------- Nappe ----------
const pad = project.addInstrumentUnit("Vaporisateur", {label: "Nappe", volume: -15}, {
    // resonance = Q du filtre : sous 0.7 il etouffe tout (mesure le 2026-11-11)
    cutoff: 1500, resonance: 0.9, filterOrder: 2, filterEnvelope: 0.1,
    attack: 0.7, decay: 1.5, sustain: 0.85, release: 2.4,
    voicingMode: POLY, unisonCount: 5, unisonDetune: 28, unisonStereo: 1,
    oscillators: [{waveform: SAW, volume: -9}, {waveform: SAW, volume: -13, octave: 1, tune: 9}]
} as any)
pad.addSend(reverb, {amount: -4})

const CHORDS = [
    [57, 60, 64, 67, 71], // Lam9
    [53, 57, 60, 64, 65], // Fa maj7
    [48, 55, 60, 62, 64, 67], // Do add9
    [55, 59, 62, 64, 67] // Sol6
]
build(pad.noteTracks[0], "Nappe", bar => {
    if (bar % 2 === 1 || bar >= 126) {return []}
    return CHORDS[chordAt(bar)].map(pitch => ({position: 0, duration: 2 * BAR - S16, pitch, velocity: 0.7}))
})
automate("nappe cutoff", pad, pad.instrument, "cutoff", [
    [0, 0.46], [16, 0.52], [48, 0.60], [56, 0.74], [63, 0.80], [64, 0.66],
    [96, 0.70], [112, 0.62], [128, 0.45]
])

// ---------- Theme : la phrase qu'on fredonne en sortant ----------
const lead = project.addInstrumentUnit("Vaporisateur", {label: "Theme", volume: -15}, {
    cutoff: 2600, resonance: 1.2, filterOrder: 2, filterEnvelope: 0.25,
    attack: 0.01, decay: 0.45, sustain: 0.6, release: 0.55,
    voicingMode: POLY, unisonCount: 3, unisonDetune: 14, unisonStereo: 0.8,
    oscillators: [{waveform: SAW, volume: -8}, {waveform: SQUARE, volume: -14, tune: 6}]
} as any)
lead.addAudioEffect("Delay", {delay: 13, feedback: 0.42, cross: 1, filter: 0.2, wet: -9})
lead.addSend(reverb, {amount: -7})

// Huit mesures, [pas, duree en doubles-croches, note]
const HOOK: number[][][] = [
    [[0, 6, 76], [6, 2, 74], [8, 8, 72]],
    [[0, 4, 71], [4, 4, 72], [8, 8, 76]],
    [[0, 6, 77], [6, 2, 76], [8, 8, 72]],
    [[0, 4, 69], [4, 4, 72], [8, 8, 74]],
    [[0, 6, 76], [6, 2, 79], [8, 8, 76]],
    [[0, 4, 74], [4, 4, 72], [8, 8, 67]],
    [[0, 6, 71], [6, 2, 74], [8, 8, 79]],
    [[0, 4, 79], [4, 4, 76], [8, 8, 74]]
]
build(lead.noteTracks[0], "Theme", bar => {
    let velocity = 0
    if (bar >= 40 && bar < 48) {velocity = 0.5}
    else if (bar >= 48 && bar < 64) {velocity = 0.8}
    else if (bar >= 80 && bar < 94) {velocity = 0.7}
    else if (bar >= 96 && bar < 112) {velocity = 0.85}
    if (velocity === 0) {return []}
    return HOOK[bar % 8].map(n => ({position: n[0] * S16, duration: n[1] * S16 - 40, pitch: n[2], velocity}))
})

// ---------- Cloche : croches pointees, le flottement ----------
const bell = project.addInstrumentUnit("Vaporisateur", {label: "Cloche", volume: -16}, {
    cutoff: 7000, resonance: 1, filterOrder: 1, filterEnvelope: 0.3,
    attack: 0.002, decay: 0.35, sustain: 0.0, release: 0.5,
    voicingMode: POLY,
    oscillators: [{waveform: TRI, volume: -6}, {waveform: SINE, volume: -10, octave: 1}]
} as any)
bell.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: -0.2, wet: -7})
bell.addSend(reverb, {amount: -5})

const BELL = [76, 72, 69, 74, 72, 67, 69, 76, 79, 74, 72]
build(bell.noteTracks[0], "Cloche", bar => {
    const on = (bar >= 24 && bar < 94) || (bar >= 96 && bar < 122)
    if (!on) {return []}
    const odd = bar % 2 === 1
    const out: Note[] = []
    for (let k = 0; k < 11; k++) {
        const step = k * 3
        if (odd ? step < 16 : step >= 16) {continue}
        if (bar >= 112 && k % 2 === 1) {continue}
        out.push({
            position: (odd ? step - 16 : step) * S16,
            duration: S16 * 2,
            pitch: BELL[k],
            velocity: inBreak(bar) ? 0.7 : 0.5
        })
    }
    return out
})

// ---------- Effets : montees et impacts ----------
const fxRise: any = project.addInstrumentUnit("Tape", {label: "Montees", volume: -13})
essai("montee longue", () => fxRise.audioTracks[0].addRegion(riserLong, {position: 56 * BAR, playback: "no-sync"}))
essai("montee courte", () => fxRise.audioTracks[0].addRegion(riserShort, {position: 94 * BAR, playback: "no-sync"}))
fxRise.addSend(reverb, {amount: -10})
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -7})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 64 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 96 * BAR, playback: "no-sync"}))
fxHit.addSend(reverb, {amount: -8})

// ---------- Pompe : le pied creuse la nappe et la basse ----------
function pump(quoi: string, unit: any, threshold: number) {
    essai("pompe " + quoi, () => {
        const comp: any = unit.addAudioEffect("Compressor", {
            threshold, ratio: 10, attack: 2, release: 170, knee: 6, automakeup: false, makeup: 0
        } as any)
        if (kickSlot) {comp.sideChain = kickSlot}
    })
}
pump("nappe", pad, -34)
pump("basse", sub, -30)
pump("theme", lead, -30)

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// STEMS = [] : mix seul. Sinon, la liste des pistes a isoler.
const MESURER = true
const units: any[] = [drums, acid, acid2, sub, pad, lead, bell, fxRise, fxHit]
const STEMS: any[] = [drums, acid, acid2, sub, pad, lead, bell]
if (MESURER) {
    const parts = [["intro", 0, 16], ["montee", 16, 32], ["groove", 32, 48], ["break1", 48, 56], ["break2", 56, 64],
        ["drop1", 64, 80], ["drop2", 80, 94], ["trou", 94, 96], ["final", 96, 112], ["sortie", 112, 128]]
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
