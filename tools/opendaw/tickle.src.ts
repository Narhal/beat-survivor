// TICKLE - Beat Survivor, mode Survie
// Bleep techno - 128 BPM - Mi mineur pentatonique - 144 mesures (4 min 30)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// tickle.src.ts (le morceau) et des instruments du dossier apparat/.
//
// Parti pris : presque rien, mais tres pres de l'oreille. Une grosse caisse,
// une basse tres grave qui glisse d'une note a l'autre (c'est elle la
// melodie), et des petits sons secs qui se repondent : le bip (sinusoide
// nue), le bop (sa reponse, plus carree), les gouttes (des bips qui montent
// sur leur note) et les tics (quelques millisecondes, tout en haut).
// Aucune nappe, presque pas de reverb : c'est le vide entre les sons qui
// les fait chatouiller. Chaque petit son sort a une place differente entre
// les deux oreilles.
// A la place des roulements de caisse claire : une balle qui rebondit, de
// plus en plus vite.
//
// Instruments : Coup (grosse caisse), Sub (basse) et Bip (les quatre petits
// sons, un seul instrument regle de quatre facons) sont ecrits pour ces
// morceaux (Apparat = instrument scriptable d'openDAW). Charleys et clap :
// TR-909.

const BPM = 128
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
const sr = sampleRate
const barSec = 240 / BPM

const COUP: string = __COUP__
const SUB: string = __SUB__
const BIP: string = __BIP__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// Hasard reproductible : le meme morceau a chaque execution
let seed = 20261114
const alea = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
}

// ---------- La TR-909 d'openDAW (charleys, clap) ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Tickle")
project.bpm = BPM

// Une reverb courte, pour le clap seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.35, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Structure. Les petits sons d'abord, le pied a la mesure 4, la basse a la 16.
// Un creux (48-56), le drop (56), un solo de basse (88-96), le final (96).
const SECTIONS = [
    {name: "Intro", start: 0, bars: 8},
    {name: "Mise", start: 8, bars: 24},
    {name: "Groove", start: 32, bars: 16},
    {name: "Break", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 32},
    {name: "Solo", start: 88, bars: 8},
    {name: "Final", start: 96, bars: 32},
    {name: "Sortie", start: 128, bars: 16}
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

const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 96)
const kickOn = (bar: number) => bar >= 4 && bar < 140 && !inBreak(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 96 && bar < 128)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 95
const limite = (bar: number) => avantDrop(bar) ? 12 : 16

/**
 * La balle qui rebondit : des notes de plus en plus rapprochees.
 * swell = true : elles enflent (avant un drop) ; false : elles s'eteignent.
 */
function rebond(fromStep: number, steps: number, count: number, ratio: number, pitch: number, climb: number, swell: boolean): Note[] {
    const first = steps * S16 * (1 - ratio) / (1 - Math.pow(ratio, count))
    const out: Note[] = []
    let at = fromStep * S16
    let gap = first
    for (let k = 0; k < count; k++) {
        out.push({
            position: Math.round(at), duration: 30, pitch: pitch + Math.round(k * climb),
            velocity: swell ? 0.35 + 0.65 * k / (count - 1) : Math.max(0.2, 1 - k * 0.07)
        })
        at += gap
        gap *= ratio
    }
    return out
}

/** Les coups de pied d'une mesure : [pas, velocite]. Le Sub s'en sert aussi. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Le pied garde de la reserve jusqu aux drops
    const v = bar < 8 || bar >= 128 ? 0.8 : drop(bar) ? 1 : 0.85
    const out = [[0, v], [4, v], [8, v], [12, v]]
    // Le pied boite un peu, comme dans l'electro : un coup en plus, a contretemps
    if (drop(bar) && bar % 2 === 1) {out.push([10, 0.7])}
    if (drop(bar) && bar % 8 === 7) {out.push([14, 0.75])}
    return out
}

// ---------- Coup : la grosse caisse ----------
const kick = apparat("Coup", COUP, -5)
regle("coup", kick, "tune", 44)
regle("coup", kick, "sweep", 0.7)
regle("coup", kick, "decay", 130)
regle("coup", kick, "click", 0.8)
regle("coup", kick, "drive", 0.2)
build(kick.noteTracks[0], "Coup", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))

// ---------- Sub : la basse, et c'est elle la melodie ----------
// Motifs de deux mesures : [pas 0..31, longueur en pas, note, liee].
// Une note liee deborde sur la suivante : la basse glisse au lieu de rattaquer.
// La note 12 ne sonne pas : elle declenche le creux, a chaque coup de pied.
const MI = 28, SOL = 31, LA = 33, SI = 35, RE = 38, MI2 = 40
const B_SIMPLE = [[0, 14, MI, 0], [16, 6, MI, 1], [22, 2, SOL, 0], [24, 7, MI, 0]]
const B_RIFF = [
    [0, 6, MI, 1], [6, 2, SOL, 0], [8, 6, MI, 0], [14, 2, SI, 0],
    [16, 6, MI, 1], [22, 4, LA, 1], [26, 2, SOL, 0], [28, 3, RE, 1], [31, 1, MI2, 0]
]
const B_SOLO = [[0, 12, MI, 1], [12, 4, MI2, 1], [16, 8, RE, 1], [24, 4, LA, 1], [28, 4, SOL, 0]]

const sub = apparat("Sub", SUB, -12)
regle("sub", sub, "depth", 0.85)
regle("sub", sub, "release", 150)
regle("sub", sub, "glide", 70)
regle("sub", sub, "drive", 0.5)
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))
    let pattern: number[][] | null = null
    if (bar >= 16 && bar < 24) {pattern = B_SIMPLE}
    else if (bar >= 24 && bar < 48) {pattern = B_RIFF}
    else if (bar >= 52 && bar < 56) {pattern = B_SIMPLE}
    else if (bar >= 56 && bar < 88) {pattern = B_RIFF}
    else if (bar >= 88 && bar < 96) {pattern = B_SOLO}
    else if (bar >= 96 && bar < 128) {pattern = B_RIFF}
    else if (bar >= 128 && bar < 136) {pattern = B_SIMPLE}
    if (pattern === null) {return out}
    const v = drop(bar) || (bar >= 88 && bar < 96) ? 1 : 0.8
    const offset = (bar % 2) * 16
    for (const n of pattern) {
        const step = n[0] - offset
        if (step < 0 || step >= limite(bar)) {continue}
        const length = Math.min(n[1], limite(bar) - step)
        out.push({position: step * S16, duration: length * S16 + (n[3] ? 30 : -40), pitch: n[2], velocity: v})
    }
    return out
})

// ---------- Les petits sons : un instrument, quatre reglages ----------
// Motifs de deux mesures : [pas 0..31, note, velocite].
const E5 = 76, G5 = 79, A5 = 81, B5 = 83, D6 = 86, E6 = 88, G6 = 91
// M1 : l'appel, cinq notes. M2 : la phrase. M3 : la phrase qui s'emballe.
const M1 = [[0, E5, 1], [3, B5, 0.8], [6, E5, 0.7], [19, E6, 1], [22, D6, 0.8]]
const M2 = [[0, E5, 1], [3, B5, 0.8], [6, E5, 0.7], [10, A5, 0.8], [12, B5, 0.9],
    [16, E5, 1], [19, E6, 1], [22, D6, 0.8], [25, B5, 0.7], [28, G5, 0.9], [30, A5, 0.7]]
const M3 = [[0, E6, 1], [2, E5, 0.7], [3, B5, 0.8], [6, E5, 0.7], [9, D6, 0.8], [10, A5, 0.8], [12, B5, 0.9], [14, G6, 1],
    [16, E5, 1], [19, E6, 1], [22, D6, 0.8], [24, E6, 0.7], [25, B5, 0.7], [28, G5, 0.9], [30, A5, 0.7], [31, B5, 0.8]]
// La reponse du bop, une octave plus bas, dans les trous du bip
const R1 = [[8, 64, 0.9], [11, 67, 0.7], [14, 64, 0.8], [24, 71, 0.9], [26, 69, 0.7], [27, 67, 0.7], [30, 64, 0.8]]
const R2 = [[3, 76, 0.7], [8, 64, 0.9], [11, 67, 0.7], [14, 64, 0.8], [19, 71, 0.8], [24, 71, 0.9], [26, 69, 0.7], [27, 67, 0.7], [30, 64, 0.8]]

function motif(bar: number, pattern: number[][] | null): Note[] {
    if (pattern === null) {return []}
    const offset = (bar % 2) * 16
    const out: Note[] = []
    for (const n of pattern) {
        const step = n[0] - offset
        if (step < 0 || step >= limite(bar)) {continue}
        out.push({position: step * S16, duration: S16 / 2, pitch: n[1], velocity: n[2]})
    }
    return out
}

// Le bip : sinusoide nue, la voix du morceau
const bip = apparat("Bip", BIP, -8)
regle("bip", bip, "decay", 70)
regle("bip", bip, "hold", 25)
regle("bip", bip, "shape", 0.05)
regle("bip", bip, "width", 0.35)
bip.addAudioEffect("Delay", {delay: 13, feedback: 0.35, cross: 1, filter: 0.2, wet: -12})
build(bip.noteTracks[0], "Bip", bar => {
    if (bar < 24) {return motif(bar, M1)}
    if (bar < 48) {return motif(bar, M2)}
    if (bar < 56) {return motif(bar, M1)}
    if (bar < 72) {return motif(bar, M2)}
    if (bar < 88) {return motif(bar, M3)}
    if (bar < 92) {return []}
    if (bar < 96) {return motif(bar, M1)}
    if (bar < 128) {return motif(bar, bar % 8 >= 6 ? M2 : M3)}
    return motif(bar, M1)
})
// decay 4..800 ms (70 ms = 0.54, 200 ms = 0.74) : le bip s'allonge quand le pied se tait
auto("bip", bip, "decay", [
    [0, 0.62], [4, 0.62], [8, 0.54], [48, 0.54], [48, 0.74], [56, 0.74], [56, 0.54], [88, 0.54],
    [88, 0.72], [96, 0.72], [96, 0.54], [128, 0.54], [136, 0.66], [144, 0.70]
])

// Le bop : la reponse. Plus carre, et il tombe sur sa note comme un coup sur du bois
const bop = apparat("Bop", BIP, -9)
regle("bop", bop, "decay", 50)
regle("bop", bop, "hold", 10)
regle("bop", bop, "bend", 0.3)
regle("bop", bop, "bendms", 8)
regle("bop", bop, "shape", 0.5)
regle("bop", bop, "width", 0.6)
build(bop.noteTracks[0], "Bop", bar => {
    if (bar >= 24 && bar < 48) {return motif(bar, R1)}
    if (bar >= 56 && bar < 88) {return motif(bar, bar >= 72 ? R2 : R1)}
    if (bar >= 96 && bar < 128) {return motif(bar, R2)}
    return []
})
// Le bop se durcit au fil du morceau
auto("bop", bop, "shape", [[0, 0.35], [48, 0.45], [56, 0.50], [88, 0.65], [96, 0.65], [128, 0.85], [144, 0.85]])

// Les gouttes : des bips tres courts qui montent d'une octave sur leur note.
// Une boucle de 8 mesures tiree au hasard une fois pour toutes, puis repetee :
// assez irreguliere pour surprendre, assez repetee pour qu'on l'attende.
const HAUT = [88, 91, 93, 95, 98, 100]
function boucleDeGouttes(parMesure: number): Note[][] {
    const loop: Note[][] = []
    for (let b = 0; b < 8; b++) {
        const notes: Note[] = []
        const pris: number[] = []
        const count = parMesure + (alea() < 0.4 ? 1 : 0)
        while (pris.length < count) {
            // Jamais sur le temps : les gouttes tombent entre les coups de pied
            const step = Math.floor(alea() * 16)
            if (step % 4 === 0 || pris.includes(step)) {continue}
            pris.push(step)
            notes.push({
                position: step * S16, duration: 30,
                pitch: HAUT[Math.floor(alea() * HAUT.length)], velocity: 0.45 + alea() * 0.55
            })
        }
        loop.push(notes)
    }
    return loop
}
const GOUTTES_A = boucleDeGouttes(2)
const GOUTTES_B = boucleDeGouttes(4)

const drops = apparat("Gouttes", BIP, -9)
regle("gouttes", drops, "decay", 35)
regle("gouttes", drops, "hold", 0)
regle("gouttes", drops, "bend", -1)
regle("gouttes", drops, "bendms", 25)
regle("gouttes", drops, "width", 1)
drops.addAudioEffect("Delay", {delay: 11, feedback: 0.45, cross: 1, filter: 0.3, wet: -10})
build(drops.noteTracks[0], "Gouttes", bar => {
    // Les balles : avant le creux elle s'eteint, avant les drops elle enfle
    if (bar === 47) {return rebond(0, 16, 14, 0.82, 100, -0.6, false)}
    if (bar === 51) {return rebond(4, 12, 12, 0.8, 88, 0.5, false)}
    if (bar === 55) {return rebond(0, 12, 14, 0.8, 88, 0.9, true)}
    if (bar === 91) {return rebond(0, 16, 14, 0.82, 100, -0.6, false)}
    if (bar === 95) {return rebond(0, 12, 14, 0.8, 88, 0.9, true)}
    let loop: Note[][] | null = null
    if (bar >= 32 && bar < 47) {loop = GOUTTES_A}
    else if (bar >= 48 && bar < 55) {loop = GOUTTES_A}
    else if (bar >= 56 && bar < 72) {loop = GOUTTES_A}
    else if (bar >= 72 && bar < 88) {loop = GOUTTES_B}
    else if (bar >= 88 && bar < 95) {loop = GOUTTES_A}
    else if (bar >= 96 && bar < 128) {loop = GOUTTES_B}
    else if (bar >= 128 && bar < 136) {loop = GOUTTES_A}
    return loop === null ? [] : loop[bar % 8]
})

// Les tics : quelques millisecondes, tout en haut, tout pres
const TICS = [108, 112, 115, 110]
const tics = apparat("Tics", BIP, -9)
regle("tics", tics, "decay", 6)
regle("tics", tics, "hold", 2)
regle("tics", tics, "bend", 1.5)
regle("tics", tics, "bendms", 4)
regle("tics", tics, "width", 1)
// Une mesure de tics, la meme tout le long : c'est leur place qui change
const POSE = [2, 3, 6, 9, 10, 11, 14]
build(tics.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const gain = inBreak(bar) ? 1 : bar < 8 || bar >= 136 ? 0.9 : 0.75
    for (const step of POSE) {
        if (step >= limite(bar)) {continue}
        out.push({
            position: step * S16, duration: 30, pitch: TICS[Math.floor(alea() * TICS.length)],
            velocity: Math.min(1, (0.4 + alea() * 0.6) * gain)
        })
    }
    // Fin de phrase : une rafale de six tics en triples-croches
    if (bar % 4 === 3 && !avantDrop(bar) && bar < 140) {
        for (let k = 0; k < 6; k++) {
            out.push({position: 12 * S16 + k * S16 / 2 + S16 / 4, duration: 30, pitch: 112 + (k % 3) * 2, velocity: 0.45 + k * 0.1})
        }
    }
    return out
})

// ---------- Charleys et clap : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -4})
const CLAP = 39, HAT_C = 42, HAT_O = 46
const kit: [string, number, any][] = [
    ["Clap", CLAP, {volume: -1}],
    ["Closed Hat", HAT_C, {volume: -6, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -6, panning: 0.1, exclude: true}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -24})

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const k = kickOn(bar), d = drop(bar)
    const full = k && bar >= 32 && bar < 128
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (k && bar >= 24 && bar < 136 && step % 8 === 4) {hit(step, CLAP, d ? 0.95 : 0.8)}
        if (k && bar >= 8) {
            if (beat === 2) {hit(step, full ? HAT_O : HAT_C, full ? (d ? 0.8 : 0.65) : 0.55)}
            // Peu de charleys : ce sont les tics qui font les doubles-croches
            else if (d && beat === 3) {hit(step, HAT_C, 0.3)}
        }
    }
    // Le clap bafouille en fin de phrase
    if (d && bar % 8 === 7) {hit(13, CLAP, 0.5); hit(15, CLAP, 0.65)}
    return out
})

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
const MESURER = true
const ISOLER = true
const units: any[] = [kick, sub, bip, bop, drops, tics, drums]
const STEMS: [string, any][] = [["Coup", kick], ["Sub", sub], ["Bip", bip], ["Bop", bop],
    ["Gouttes", drops], ["Tics", tics], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 8], ["mise", 8, 32], ["groove", 32, 48], ["break", 48, 56],
        ["drop1", 56, 72], ["drop2", 72, 88], ["solo", 88, 96], ["final", 96, 128], ["sortie", 128, 144]]
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
