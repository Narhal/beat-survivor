// ACID REVERIE - morceau de test pour Beat Survivor (mode Survie)
// Acid techno douce et reveuse - 122 BPM - La mineur - 72 mesures (~2 min 22)
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Tout est genere ici : la batterie est synthetisee, aucun sample externe.

const BPM = 122
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 72
const sr = sampleRate

const W: any = ClassicWaveform
const SAW = W.Saw ?? W.saw ?? 2
const TRI = W.Triangle ?? W.triangle ?? 1
const SINE = W.Sine ?? W.sine ?? 0
const V: any = VoicingMode
const MONO = V.Monophonic ?? V.monophonic
const POLY = V.Polyphonic ?? V.polyphonic

// ---------- Batterie synthetisee ----------
let seed = 1234567
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296 * 2 - 1
}

function makeKick() {
    const n = Math.floor(sr * 0.5)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let phase = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        const freq = 47 + 135 * Math.exp(-t * 34)
        phase += freq / sr
        const body = Math.sin(phase * 2 * Math.PI) * Math.exp(-t * 6.5)
        const click = rnd() * Math.exp(-t * 700) * 0.18
        const fade = Math.min(1, (n - i) / (sr * 0.01))
        f[i] = (Math.tanh(body * 1.8) * 0.85 + click) * fade
    }
    return audio
}

function makeHat(seconds: number, decay: number) {
    const n = Math.floor(sr * seconds)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let x1 = 0, x2 = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        const x = rnd()
        const hp = x - 2 * x1 + x2
        x2 = x1
        x1 = x
        const fade = Math.min(1, (n - i) / (sr * 0.005))
        f[i] = hp * 0.2 * Math.exp(-t * decay) * fade
    }
    return audio
}

function makeClap() {
    const n = Math.floor(sr * 0.32)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    const w0 = 2 * Math.PI * 1400 / sr
    const alpha = Math.sin(w0) / (2 * 1.4)
    const a0 = 1 + alpha
    const b0 = alpha / a0, b2 = -alpha / a0
    const a1 = -2 * Math.cos(w0) / a0, a2 = (1 - alpha) / a0
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        let env = 0
        for (let k = 0; k < 3; k++) {
            const tb = t - k * 0.012
            if (tb >= 0 && tb < 0.012) {env = Math.exp(-tb * 200)}
        }
        if (t >= 0.036) {env = Math.exp(-(t - 0.036) * 22)}
        const x = rnd()
        const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = x
        y2 = y1
        y1 = y
        const fade = Math.min(1, (n - i) / (sr * 0.01))
        f[i] = Math.tanh(y * env * 3.2) * 0.8 * fade
    }
    return audio
}

const kick = await openDAW.addSample(makeKick(), "AR Kick")
const hatClosed = await openDAW.addSample(makeHat(0.09, 70), "AR Hat ferme")
const hatOpen = await openDAW.addSample(makeHat(0.4, 11), "AR Hat ouvert")
const clap = await openDAW.addSample(makeClap(), "AR Clap")

// ---------- Projet ----------
const project = openDAW.newProject("Acid Reverie")
project.bpm = BPM

const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("Reverb", {decay: 0.82, damp: 0.45, preDelay: 0.02, wet: 0})

// Structure : la musique fait le niveau. L'intro ne dort pas (kick des la
// mesure 0), le break creuse une vraie accalmie, le drop relance tout.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 8},
    {name: "Montee", start: 8, bars: 16},
    {name: "Groove", start: 24, bars: 8},
    {name: "Break", start: 32, bars: 8},
    {name: "Drop", start: 40, bars: 24},
    {name: "Sortie", start: 64, bars: 8}
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

function automate(unit: any, target: any, path: string, points: number[][]) {
    const lane = unit.addValueTrack(target, path)
    const region = lane.addRegion({position: 0, duration: TOTAL * BAR})
    region.addEvents(points.map(p => ({
        position: Math.round(p[0] * BAR), value: p[1], interpolation: Interpolation.Linear
    })))
}

// Gamme de La mineur naturel, en degres : 0 = La2, 7 = La3...
const SCALE = [0, 2, 3, 5, 7, 8, 10]
const degree = (d: number) => 45 + 12 * Math.floor(d / 7) + SCALE[((d % 7) + 7) % 7]
// Grille de 4 mesures : Lam, Lam, Fa, Sol (fondamentale en degres)
const ROOTS = [0, 0, -2, -1]

// ---------- Batterie ----------
const drums = project.addInstrumentUnit("Playfield", {label: "Batterie", volume: -6})
drums.instrument.addSample(kick, {note: 36})
drums.instrument.addSample(clap, {note: 38})
drums.instrument.addSample(hatClosed, {note: 42, exclude: true})
drums.instrument.addSample(hatOpen, {note: 46, exclude: true})
drums.addSend(reverb, {amount: -22})

build(drums.noteTracks[0], "Batterie", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity})
    const full = (bar >= 16 && bar < 32) || (bar >= 40 && bar < 64)
    const kickOn = bar < 32 || (bar >= 40 && bar < 68)
    const hatsOn = (bar >= 4 && bar < 32) || (bar >= 40 && bar < 68)
    for (let step = 0; step < 16; step++) {
        if (kickOn && step % 4 === 0) {hit(step, 36, bar < 8 ? 0.72 : 1.0)}
        if (full && step % 8 === 4) {hit(step, 38, 0.85)}
        if (hatsOn) {
            const offbeat = step % 4 === 2
            if (offbeat) {hit(step, full ? 46 : 42, full ? 0.6 : 0.7)}
            else if (bar >= 8 && bar < 64) {hit(step, 42, step % 2 === 1 ? 0.28 : 0.4)}
        }
    }
    // Derniere mesure du break : roulement de claps qui annonce le drop
    if (bar === 39) {
        for (let step = 8; step < 16; step++) {hit(step, 38, 0.3 + (step - 8) * 0.085)}
    }
    return out
})

// ---------- Ligne acid (la 303) ----------
const acid = project.addInstrumentUnit("Vaporisateur", {label: "Acid", volume: -4}, {
    // ATTENTION : resonance = Q du filtre. Sous 1, il etouffe le son tres en
    // dessous de la coupure affichee (mesure : ordre 4 + Q 0.1 = silence).
    // Ordre 2 et Q 6 : la coupure se deplace vraiment, et ca couine.
    cutoff: 600, resonance: 6, filterOrder: 2, filterEnvelope: 0.25, filterKeyboard: 0.3,
    attack: 0.001, decay: 0.18, sustain: 0.3, release: 0.08,
    voicingMode: MONO, glideTime: 0.12,
    oscillators: [{waveform: SAW, volume: -6}, {volume: -Infinity}]
} as any)
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.3, wet: -16})
acid.addSend(reverb, {amount: -14})

const N = null
const P1 = {steps: [0, 0, 7, 0, N, 2, 0, 6, 0, 0, 4, N, 0, 7, 2, 3], accents: [2, 7, 10, 13], slides: [3, 10, 14]}
const P2 = {steps: [0, 7, 0, 9, 0, 6, N, 4, 0, 7, 2, 0, 9, 6, 4, 3], accents: [1, 3, 9, 12], slides: [3, 12, 13]}
const P3 = {steps: [0, N, N, 7, N, N, 4, N, N, 2, N, N, 6, N, 4, N], accents: [3, 12], slides: [] as number[]}

build(acid.noteTracks[0], "Acid", bar => {
    // Le break commence par un vrai creux : quatre mesures sans la ligne acid
    if (bar < 4 || bar >= 70 || (bar >= 32 && bar < 36)) {return []}
    const soft = bar >= 32 && bar < 40 ? 0.6 : 1
    let pattern = P1
    if (bar >= 32 && bar < 40) {pattern = P3}
    else if (bar >= 64) {pattern = P3}
    else if (bar >= 56) {pattern = bar % 4 === 2 ? P1 : P2}
    else if (bar % 8 === 7 || (bar >= 40 && bar % 4 === 3)) {pattern = P2}
    const root = ROOTS[bar % 4]
    const out: Note[] = []
    pattern.steps.forEach((d, step) => {
        if (d === null) {return}
        const slide = pattern.slides.includes(step)
        out.push({
            position: step * S16,
            duration: Math.round(S16 * (slide ? 1.15 : 0.55)),
            pitch: degree(root + d),
            velocity: (pattern.accents.includes(step) ? 1.0 : 0.62) * soft
        })
    })
    return out
})

// Le filtre raconte le morceau : ferme a l'intro, il s'ouvre dans la montee,
// se referme d'un coup au break, puis remonte jusqu'au drop.
automate(acid, acid.instrument, "cutoff", [
    [0, 0.366], [4, 0.366], [8, 0.44], [24, 0.62], [32, 0.652],
    [32, 0.40], [39, 0.70], [40, 0.68], [48, 0.75], [56, 0.70],
    [62, 0.78], [64, 0.60], [72, 0.42]
])

// ---------- Nappe ----------
const pad = project.addInstrumentUnit("Vaporisateur", {label: "Nappe", volume: -17}, {
    cutoff: 2000, resonance: 1, filterOrder: 1, filterEnvelope: 0.15,
    attack: 0.9, decay: 1.2, sustain: 0.8, release: 1.8,
    voicingMode: POLY, unisonCount: 3, unisonDetune: 22, unisonStereo: 1,
    oscillators: [{waveform: SAW, volume: -9}, {waveform: SAW, volume: -12, octave: 1, tune: 7}]
} as any)
pad.addSend(reverb, {amount: -6})

const CHORDS = [[57, 60, 64, 71], [53, 57, 60, 64], [55, 59, 62, 64]] // Lam9, Fa maj7, Sol6

build(pad.noteTracks[0], "Nappe", bar => {
    const slot = bar % 4
    if (bar >= 69 || slot === 1) {return []}
    const chord = slot === 0 ? CHORDS[0] : slot === 2 ? CHORDS[1] : CHORDS[2]
    const bars = bar === 68 ? 4 : slot === 0 ? 2 : 1
    return chord.map(pitch => ({position: 0, duration: bars * BAR - S16, pitch, velocity: 0.7}))
})

automate(pad, pad.instrument, "cutoff", [
    [0, 0.60], [32, 0.62], [39, 0.72], [40, 0.667], [64, 0.65], [72, 0.55]
])

// ---------- Cloche reveuse ----------
const bell = project.addInstrumentUnit("Vaporisateur", {label: "Cloche", volume: -12}, {
    cutoff: 7000, resonance: 1, filterOrder: 1, filterEnvelope: 0.3,
    attack: 0.002, decay: 0.35, sustain: 0.0, release: 0.5,
    voicingMode: POLY,
    oscillators: [{waveform: TRI, volume: -6}, {waveform: SINE, volume: -10, octave: 1}]
} as any)
bell.addAudioEffect("Delay", {delay: 13, feedback: 0.45, cross: 1, filter: -0.2, wet: -8})
bell.addSend(reverb, {amount: -5})

// Onze notes en croches pointees sur deux mesures : le motif tourne en
// decalage avec le pied, c'est ce flottement qui fait rever.
const BELL = [76, 72, 69, 74, 72, 67, 69, 76, 79, 74, 72]

build(bell.noteTracks[0], "Cloche", bar => {
    const on = (bar >= 20 && bar < 40) || (bar >= 48 && bar < 70)
    if (!on) {return []}
    const sparse = bar >= 64
    const out: Note[] = []
    const odd = bar % 2 === 1
    for (let k = 0; k < 11; k++) {
        const step = k * 3
        if (odd ? step < 16 : step >= 16) {continue}
        if (sparse && k % 2 === 1) {continue}
        out.push({
            position: (odd ? step - 16 : step) * S16,
            duration: S16 * 2,
            pitch: BELL[k],
            velocity: bar >= 32 && bar < 40 ? 0.6 : 0.55
        })
    }
    return out
})

// Limiteur de sortie : il rattrape les cretes de la resonance
project.output.addAudioEffect("Maximizer", {threshold: -3})

// Mesure du rendu, piste par piste : niveau (dB) et brillance (Hz equivalents)
// par section. Passer MESURER a true pour verifier un reglage sans l'ecouter.
const MESURER = false
if (MESURER) {
    const barSec = 240 / BPM
    const parts = [["intro", 0, 8], ["montee1", 8, 16], ["montee2", 16, 24], ["groove", 24, 32], ["break", 32, 40], ["drop1", 40, 48], ["drop2", 48, 56], ["drop3", 56, 64], ["sortie", 64, 72]]
    const report: string[] = []
    const units: any[] = [drums, acid, pad, bell]
    for (const solo of [null, drums, acid, pad, bell] as any[]) {
        units.forEach(u => u.mute = solo !== null && u !== solo)
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const n = L.length
        let peak = 0
        for (let i = 0; i < n; i++) {const a = Math.abs(L[i]); if (a > peak) {peak = a}}
        const cells: string[] = []
        for (const s of parts) {
            const from = Math.max(1, Math.floor((s[1] as number) * barSec * rate))
            const to = Math.min(n, Math.floor((s[2] as number) * barSec * rate))
            let sx = 0, sd = 0
            for (let i = from; i < to; i++) {const d = L[i] - L[i - 1]; sx += L[i] * L[i]; sd += d * d}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / (to - from))).toFixed(1) + "dB " + Math.round(Math.sqrt(sd / sx) * rate / (2 * Math.PI)) + "Hz" : "silence"))
        }
        report.push((solo === null ? "MIX" : solo.label) + " crete " + peak.toFixed(2) + " : " + cells.join(", "))
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", report.join(" ;; "))
}

project.openInStudio()
