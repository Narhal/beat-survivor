// DANGER DANGER v2 - Beat Survivor, mode Survie
// Acid techno sombre - 132 BPM - La phrygien - 140 mesures (4 min 15)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// danger2.src.ts (le morceau), tb303-bass-line.js (la 303), voix-sam.json
// (la voix) et des instruments du dossier apparat/.
// La premiere version reste telle quelle : danger.src.ts, projet "Danger Danger".
//
// Meme morceau, refait avec ce qui a ete appris depuis (chaine d'Underdog,
// retours de N4, deux references mesurees : Dusty Kid - Kore et Randomer -
// Bring). L'idee ne change pas : un La, son demi-ton de menace, une 303 dont
// le filtre raconte, et une voix de micro-ordinateur. Ce qui change :
// - Le grave. Une grosse caisse en couches (corps, coup dans la poitrine,
//   claquement, saturation en parallele), et derriere elle un grondement :
//   une masse de bruit grave qui s'efface a chaque coup, enfle, pousse sur
//   le contretemps et se referme avant le coup suivant. Il remplace la basse
//   roulante de la v1 : un seul acteur dans le grave a la fois.
// - La voix. Les mots de SAM passent aussi dans un vocodeur calcule ici : ils
//   chantent un accord (La, Mi, La), et le second "danger" monte au Si bemol.
//   La voix nue reste pour les mots qu'on doit comprendre.
// - Avant chaque drop, une aspiration : le mot "danger" noye dans une longue
//   reverb puis retourne. Elle s'arrete un temps avant le drop.
// - L'accord dub : trois dents de scie desaccordees par note, un filtre qui se
//   referme, un echo en croche pointee. Un coup par mesure, sur un temps faible.
// - Des charleys de synthese qui vivent (longueur et clarte bougent lentement).
// - L'arrangement : blocs de 16 mesures, les aigus changent de vitesse a
//   chaque bloc, un bloc demarre sans ses graves (72), un passage nu (108),
//   un creux en trois temps (chute, montee, suspension).
// - Le mix est regle contre les deux references : meme part de grave, meme
//   part d'aigu, meme ecart entre les cretes et le niveau moyen.
//
// Instruments : Frappe (grosse caisse), Grondement, Accord, Cymbale et Souffle
// sont ecrits pour ces morceaux (Apparat = instrument scriptable d'openDAW).
// Les deux 303 sont le script Apparat "TB-303 Bass Line" d'Andre Michelle
// (CC0). Clap, caisse claire, rimshot, toms, ride, crash : TR-909.

const BPM = 132
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 140
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM

const TB303: string = __TB303_L__
const VOIX_TXT: string = __VOIXTXT__
const VOIX: any = JSON.parse(VOIX_TXT)
const FRAPPE: string = __FRAPPE_L__
const GRONDEMENT: string = __GRONDEMENT_L__
const ACCORD: string = __ACCORD_L__
const CYMBALE: string = __CYMBALE_L__
const SOUFFLE: string = __SOUFFLE_L__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

let seed = 20261115
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296 * 2 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (La, 110 Hz).
// Ici on les decode, on les reechantillonne (et on les transpose au besoin).
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

/** Un mot nu, a la frequence du projet. semis : transposition en demi-tons. */
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

/** Ramene un son a une crete donnee. */
function norme(x: Float32Array, crete: number): Float32Array {
    let top = 0
    for (let i = 0; i < x.length; i++) {const a = Math.abs(x[i]); if (a > top) {top = a}}
    const k = top > 0 ? crete / top : 1
    for (let i = 0; i < x.length; i++) {x[i] *= k}
    return x
}

/** Passe-bande du second ordre (gain 1 au centre). */
function bande(x: Float32Array, fc: number, q: number): Float32Array {
    const w = 2 * Math.PI * fc / sr
    const alpha = Math.sin(w) / (2 * q)
    const a0 = 1 + alpha
    const b0 = alpha / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - alpha) / a0
    const y = new Float32Array(x.length)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let i = 0; i < x.length; i++) {
        const v = b0 * x[i] - b0 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = x[i]
        y2 = y1
        y1 = v
        y[i] = v
    }
    return y
}

/**
 * Le vocodeur. Le mot est decoupe en 14 bandes ; le volume de chaque bande
 * commande la meme bande d'un accord en dents de scie (La, Mi, La, et un Mi
 * plus haut). Le mot garde ses voyelles et ses consonnes, mais il chante
 * l'accord. Du bruit dans les quatre bandes du haut rend les sifflantes.
 */
function vocode(src: Float32Array, root: number): Float32Array {
    const n = src.length
    const car = new Float32Array(n), noise = new Float32Array(n)
    const ratios = [1, 1.498, 2, 3]
    const gains = [1, 0.7, 0.8, 0.35]
    for (let k = 0; k < ratios.length; k++) {
        let p = 0.37 * k
        const dt = root * ratios[k] / sr
        for (let i = 0; i < n; i++) {
            p += dt
            if (p >= 1) {p -= 1}
            car[i] += (2 * p - 1) * gains[k]
        }
    }
    for (let i = 0; i < n; i++) {noise[i] = rnd()}
    const out = new Float32Array(n)
    const BANDS = 14
    const up = 1 - Math.exp(-1 / (0.003 * sr)), down = 1 - Math.exp(-1 / (0.014 * sr))
    for (let b = 0; b < BANDS; b++) {
        const fc = 200 * Math.pow(7000 / 200, b / (BANDS - 1))
        const m = bande(src, fc, 5), c = bande(car, fc, 5)
        const nz = b >= BANDS - 4 ? bande(noise, fc, 5) : null
        let env = 0
        for (let i = 0; i < n; i++) {
            const a = Math.abs(m[i])
            env += (a - env) * (a > env ? up : down)
            out[i] += (c[i] + (nz ? nz[i] * 0.5 : 0)) * env
        }
    }
    return norme(out, 1)
}

/** Une reverb longue, pour l'aspiration : six peignes amortis et deux passe-tout. */
function reverbe(x: Float32Array, tail: number, rt: number): Float32Array {
    const n = x.length + Math.floor(tail * sr)
    const out = new Float32Array(n)
    for (const d of [0.0353, 0.0367, 0.0338, 0.0322, 0.0297, 0.0411]) {
        const len = Math.floor(d * sr)
        const buf = new Float32Array(len)
        const g = Math.pow(10, -3 * d / rt)
        let idx = 0, lp = 0
        for (let i = 0; i < n; i++) {
            const y = buf[idx]
            lp += (y - lp) * 0.45
            buf[idx] = (i < x.length ? x[i] : 0) + lp * g
            idx++
            if (idx >= len) {idx = 0}
            out[i] += y
        }
    }
    for (const d of [0.0051, 0.0017]) {
        const len = Math.floor(d * sr)
        const buf = new Float32Array(len)
        let idx = 0
        for (let i = 0; i < n; i++) {
            const b = buf[idx]
            const v = out[i] + b * 0.5
            buf[idx] = v
            out[i] = b - v * 0.5
            idx++
            if (idx >= len) {idx = 0}
        }
    }
    return out
}

// [mot, position en temps, demi-tons, duree max en temps (0 = mot entier)]
type Dit = [string, number, number, number]
/** nue = 1 : la voix de SAM ; voc = 1 : le vocodeur ; les deux se melangent. */
async function phrase(label: string, dits: Dit[], nue: number, voc: number) {
    let total = 0
    const parts = dits.map(d => {
        const raw = norme(mot(d[0], d[2]), 1)
        const buf = new Float32Array(raw.length)
        const v = voc > 0 ? vocode(raw, 110 * Math.pow(2, d[2] / 12)) : null
        for (let i = 0; i < raw.length; i++) {buf[i] = raw[i] * nue + (v ? v[i] * voc : 0)}
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
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}

// "Danger." : la voix nue, puis la meme en accord
const vUn = await phrase("D2 Danger", [["danger", 0, 0, 0]], 1, 0)
const vUnAccord = await phrase("D2 Danger en accord", [["danger", 0, 0, 0]], 0.25, 1)
// "Danger, danger." - le second un demi-ton au-dessus : la seconde mineure
const vDeux = await phrase("D2 Danger danger", [["danger", 0, 0, 0], ["danger", 2, 1, 0]], 1, 0)
const vDeuxAccord = await phrase("D2 Danger danger en accord", [["danger", 0, 0, 0], ["danger", 2, 1, 0]], 0.25, 1)
// "Let's go faster." : les deux voix ensemble
const vGo = await phrase("D2 Lets go faster", [["letsgo", 0, 0, 0], ["faster", 2, 0, 0]], 0.7, 0.7)
// "D-d-d-d-DANGER" : quatre amorces en doubles-croches, le mot tombe sur le temps
const vBegaie = await phrase("D2 D-d-d-danger", [
    ["danger", 0, 0, 0.22], ["danger", 0.25, 0, 0.22], ["danger", 0.5, 0, 0.22], ["danger", 0.75, 0, 0.22],
    ["danger", 1, 0, 0]
], 1, 0.35)
// "Faster" qui accelere pour de bon : l'ecart entre deux mots passe de 300 ms
// a 36 ms en trois temps, et la voix grimpe d'un demi-ton tous les deux mots
const accelere: Dit[] = []
{
    const count = 13
    const ratio = Math.pow(0.036 / 0.30, 1 / (count - 1))
    let gap = 0.30, sum = 0
    for (let k = 0; k < count; k++) {sum += gap; gap *= ratio}
    const scale = 2.95 * beatSec / sum
    let at = 0
    gap = 0.30
    for (let k = 0; k < count; k++) {
        accelere.push(["faster", at * scale / beatSec, Math.floor(k / 2), gap * scale / beatSec * 0.96])
        at += gap
        gap *= ratio
    }
}
const vVite = await phrase("D2 Faster qui accelere", accelere, 0.8, 0.5)

/** L'aspiration : "danger" en accord, noye dans la reverb, puis retourne. */
async function aspiration(label: string, seconds: number) {
    const dry = vocode(norme(mot("danger", 0), 1), 110)
    const wet = reverbe(dry, seconds + 0.6, 4)
    const n = Math.floor(seconds * sr)
    const skip = Math.floor(0.09 * sr)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    for (let i = 0; i < n; i++) {
        const t = i / n
        // On lit la queue a l'envers : elle enfle au lieu de s'eteindre
        f[i] = wet[skip + n - 1 - i] * t * Math.min(1, (n - i) / (sr * 0.006))
    }
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}
const aspireLong = await aspiration("D2 Aspiration longue", barSec * 2)
const aspireCourt = await aspiration("D2 Aspiration courte", barSec)

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
const impact = await openDAW.addSample(makeImpact(), "D2 Impact")

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Danger Danger v2")
project.bpm = BPM

// Une reverb courte, pour le clap et la caisse claire seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.4, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Des blocs de 16 mesures (29 secondes), un creux de 8 et un trou de 4.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Montee", start: 16, bars: 16},
    {name: "Groove", start: 32, bars: 16},
    {name: "Break", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 16},
    {name: "Plus", start: 72, bars: 16},
    {name: "Trou", start: 88, bars: 4},
    {name: "Final", start: 92, bars: 16},
    {name: "Sommet", start: 108, bars: 16},
    {name: "Sortie", start: 124, bars: 16}
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
const reglages = (quoi: string, unit: any, values: {[name: string]: number}) => {
    for (const name in values) {regle(quoi, unit, name, values[name])}
}

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
 * Une pente sur laquelle on pose une vague lente : la main qui tourne le
 * bouton sans jamais le lacher. Chaque reglage a sa vague, de periode
 * differente : ils ne repassent jamais ensemble par le meme point.
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
    for (let bar = 0; bar <= TOTAL; bar += 1) {
        while (next < trend.length && trend[next][0] <= bar) {
            out.push([trend[next][0], clamp(trend[next][1] + wave(trend[next][0]))])
            next++
        }
        if (!trend.some(p => p[0] === bar)) {out.push([bar, clamp(at(bar) + wave(bar))])}
    }
    return out
}

// ---------- La carte du morceau ----------
/** Les creux : le pied se tait. */
const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 92)
/** Le bloc qui demarre sans ses graves, une mesure, pour surprendre. */
const sansGraves = (bar: number) => bar === 72
/** Le passage nu : le pied, le grondement et la 303 seulement. */
const nu = (bar: number) => bar >= 108 && bar < 112
const tourne = (bar: number) => bar < 136 && !inBreak(bar)
const kickOn = (bar: number) => tourne(bar) && !sansGraves(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 92 && bar < 124)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 91
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une relance. */
const finDeBloc = (bar: number) => [15, 31, 47, 71, 87, 107, 123].includes(bar)
/** Place dans la phrase de quatre mesures. */
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Le pied garde de la reserve jusqu aux drops
    const v = bar < 16 || bar >= 124 ? 0.82 : drop(bar) ? 1 : 0.9
    const out = [[0, v], [4, v], [8, v], [12, v]]
    // Avant le groove, le pied lache son dernier temps : le bloc suivant tombe plus fort
    return bar === 31 ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -6.5)
reglages("frappe", kick, {tune: 52, start: 380, sweep: 50, decay: 150, punch: 0.6, click: 0.7, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
// Le pied arrive sourd et gagne son claquement en huit mesures ; il se durcit au final
auto("frappe", kick, "click", [[0, 0.15], [8, 0.7], [92, 0.7], [108, 0.85], [124, 0.7], [136, 0.3], [140, 0.3]])
auto("frappe", kick, "drive", [[0, 0.3], [56, 0.4], [92, 0.5], [124, 0.45], [140, 0.3]])

// ---------- Grondement : la masse grave qui roule entre les coups ----------
const rumble = apparat("Grondement", GRONDEMENT, -15.5)
reglages("grondement", rumble, {
    tone: 115, body: 46, weight: 0.6, duck: 0.95, swell: 110, hold: 330, grit: 0.3, drive: 0.5
})
build(rumble.noteTracks[0], "Grondement", bar => {
    const out: Note[] = []
    for (const k of kicks(bar)) {
        // La note 12 a chaque coup de pied, la note 13 sur le contretemps qui suit
        out.push({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: bar < 8 ? 0.6 : k[1]})
        if (bar >= 16) {out.push({position: (k[0] + 2) * S16, duration: S16 / 2, pitch: 13, velocity: 1})}
    }
    // A l'entree d'un creux, il reste ouvert : la chute
    if (bar === 48 || bar === 88) {out.push({position: 0, duration: S16, pitch: 14, velocity: 0.8})}
    return out
})
// tone 60..400 Hz (90 Hz = 0.21, 115 = 0.34, 150 = 0.48) : il s'eclaircit au fil du morceau
auto("grondement", rumble, "tone", vague([
    [0, 0.21], [16, 0.30], [56, 0.34], [92, 0.42], [124, 0.36], [140, 0.21]
], 24, 0.04))
auto("grondement", rumble, "grit", [[0, 0.15], [56, 0.3], [92, 0.45], [124, 0.3], [140, 0.15]])

// ---------- Les deux 303 ----------
const N = null
// steps : demi-tons au-dessus de la note de base. 1 = Si bemol, 6 = Mi bemol.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// P0 : le squelette, trois contre quatre. P1 : le motif. P2 : sa fin de phrase.
// P3 : le sommet, une octave plus haut. P4 : le creux, de longues notes liees.
const P0: Pattern = {steps: [0, N, N, 0, N, N, 0, N, N, 0, N, N, 0, N, 1, N], accents: [12], slides: []}
const P1: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 12, 0, N, 3, 0, 13, 12, -12], accents: [2, 8, 13], slides: [6, 13]}
const P2: Pattern = {steps: [0, 12, 0, 0, 6, 0, 12, N, 0, 0, 15, 12, 13, 12, 3, 1], accents: [4, 10, 12], slides: [10, 12, 14]}
const P3: Pattern = {steps: [12, 0, 12, 13, N, 12, 0, 12, 15, 12, N, 18, 12, 13, 0, 24], accents: [3, 8, 11, 15], slides: [3, 8, 11]}
const P4: Pattern = {steps: [0, N, N, N, 12, N, N, 1, N, N, 0, N, N, N, 13, 12], accents: [4, 14], slides: [14]}
// Seconde 303 : motif de 12 pas qui tourne contre la mesure de 16 (le seul polymetre)
const PD: Pattern = {steps: [0, N, 0, 1, N, 0, N, 12, 0, N, 3, N], accents: [7], slides: [3]}

function acidNote(pattern: Pattern, index: number, step: number, base: number): Note {
    const slide = pattern.slides.includes(index)
    return {
        position: step * S16,
        // Une note liee deborde sur la suivante : c'est le recouvrement qui
        // declenche le glissando dans la 303
        duration: Math.round(S16 * (slide ? 1.3 : 0.6)),
        pitch: base + (pattern.steps[index] as number),
        // L'accent de cette 303 se declenche a velocite 1.0 pile ; les autres
        // notes sont plus douces, pour que l'accent ressorte
        velocity: pattern.accents.includes(index) ? 1.0 : 0.62
    }
}

const acid = apparat("Acide", TB303, -4.5)
reglages("acide", acid, {cutoff: 70, resonance: 0.85, envmod: 0.3, decay: 300, accent: 1.0})
// Saturation en parallele : le son propre reste, sa copie ecrasee s'ajoute
essai("saturation acide", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.7} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -19})

build(acid.noteTracks[0], "Acide", bar => {
    let pattern: Pattern | null = null
    if (bar >= 8 && bar < 16) {pattern = P0}
    else if (bar >= 16 && bar < 48) {pattern = rang(bar) === 3 ? P2 : P1}
    else if (bar >= 48 && bar < 52) {pattern = null}
    else if (bar >= 52 && bar < 56) {pattern = P4}
    else if (bar >= 56 && bar < 88) {pattern = rang(bar) === 3 ? P2 : P1}
    else if (bar >= 90 && bar < 92) {pattern = P4}
    else if (bar >= 92 && bar < 124) {pattern = rang(bar) === 3 ? P2 : bar >= 112 && rang(bar) === 1 ? P3 : bar < 108 && rang(bar) === 1 ? P3 : P1}
    else if (bar >= 124 && bar < 132) {pattern = P1}
    else if (bar >= 132 && bar < 136) {pattern = P0}
    if (pattern === null) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, step, 45))
    }
    return out
})

// Le filtre raconte le morceau : une pente lente qui ne revient jamais a
// zero hors des creux. Valeurs 0..1 sur la plage declaree par la 303.
auto("acide", acid, "cutoff", vague([
    [0, 0.05], [8, 0.05], [16, 0.12], [32, 0.32], [48, 0.52],
    [48, 0.10], [52, 0.10], [55.75, 0.90], [56, 0.78], [72, 0.86], [88, 0.94],
    [88, 0.15], [91.75, 0.95], [92, 0.90], [108, 0.97], [124, 1.0], [132, 0.35], [140, 0.05]
], 12, 0.05))
auto("acide", acid, "envmod", vague([
    [0, 0.10], [16, 0.22], [32, 0.42], [48, 0.55], [48, 0.25], [55.75, 0.62], [56, 0.75],
    [88, 0.86], [88, 0.30], [92, 0.90], [124, 0.95], [132, 0.30], [140, 0.15]
], 20, 0.05))
auto("acide", acid, "resonance", vague([
    [0, 0.75], [32, 0.82], [48, 0.88], [52, 0.95], [56, 0.88], [88, 0.92], [90, 0.97], [92, 0.90],
    [124, 0.92], [140, 0.75]
], 28, 0.02))
// La longueur des notes ondule sur deux mesures, a peine : dense, puis claire
auto("acide", acid, "decay", vague([
    [0, 0.10], [32, 0.20], [48, 0.25], [48, 0.70], [56, 0.30], [72, 0.40], [88, 0.50],
    [88, 0.80], [92, 0.45], [124, 0.50], [132, 0.20], [140, 0.10]
], 2, 0.04))
// Le niveau de la 303 retombe a l entree des creux : un creux doit etre un vrai creux
auto("acide", acid, "volume", [
    [0, 0.62], [48, 0.66], [48, 0.35], [52, 0.45], [55.75, 0.70], [88, 0.70],
    [88, 0.40], [91.75, 0.70], [124, 0.70], [136, 0.5], [140, 0.5]
])

const acid2 = apparat("Acide carree", TB303, -8.5, 0.25)
reglages("acide carree", acid2, {waveform: 1, cutoff: 150, resonance: 0.9, envmod: 0.5, decay: 300, accent: 1.0})
acid2.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.5, wet: -10})
build(acid2.noteTracks[0], "Acide carree", bar => {
    const on = (bar >= 73 && bar < 88) || (bar >= 112 && bar < 124)
    if (!on) {return []}
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        const index = ((bar - 72) * 16 + step) % 12
        if (PD.steps[index] === null) {continue}
        out.push(acidNote(PD, index, step, 57))
    }
    return out
})
auto("acide carree", acid2, "cutoff", vague([
    [0, 0.30], [72, 0.30], [88, 0.70], [108, 0.50], [124, 0.92], [140, 0.40]
], 10, 0.06))

// ---------- Accord dub : un coup sec, l'echo fait le reste ----------
// La mineur septieme ; en fin de phrase, Si bemol : la menace.
const AM7 = [57, 60, 64, 67]
const BB = [58, 62, 65, 69]
const stab = apparat("Accord", ACCORD, 4, -0.1)
reglages("accord", stab, {
    decay: 160, cutoff: 420, envmod: 2.6, fdecay: 80, reso: 0.35, detune: 12, width: 0.7, duck: 0.5
})
// Un echo en croche pointee, qui se repete longtemps
stab.addAudioEffect("Delay", {delay: 13, feedback: 0.55, cross: 1, filter: 0.3, wet: -7})
build(stab.noteTracks[0], "Accord", bar => {
    const out = plongeons(bar)
    const hit = (step: number, notes: number[], velocity: number) => {
        if (step >= limite(bar)) {return}
        for (const pitch of notes) {out.push({position: step * S16, duration: S16, pitch, velocity})}
    }
    const chord = rang(bar) === 3 ? BB : AM7
    // Le marqueur : l'accord plein, sur le premier temps des drops et au retour des graves
    if (bar === 56 || bar === 92 || bar === 73 || bar === 112) {hit(0, AM7, 1)}
    if (nu(bar) || bar >= 132) {return out}
    if (bar >= 24 && bar < 48) {hit(6, chord, 0.8)}
    else if (bar >= 48 && bar < 54 && bar % 2 === 0) {hit(6, chord, 0.9)}
    else if (drop(bar)) {
        // Un coup par mesure sur un temps faible ; un second en reponse, une mesure sur quatre
        hit(6, chord, 0.85)
        if (rang(bar) === 1) {hit(13, chord, 0.6)}
    } else if (bar >= 124) {hit(6, chord, 0.7)}
    return out
})
// cutoff 100..6000 Hz (300 Hz = 0.27, 420 = 0.35, 800 = 0.51) : il ondule sur huit mesures
auto("accord", stab, "cutoff", vague([
    [0, 0.30], [24, 0.30], [48, 0.38], [48, 0.27], [56, 0.27], [56, 0.36], [88, 0.46], [92, 0.42],
    [124, 0.52], [140, 0.30]
], 8, 0.06))
// decay 40..1500 ms (160 ms = 0.38, 500 ms = 0.70) : l'accord s'allonge dans le creux
auto("accord", stab, "decay", [
    [0, 0.38], [48, 0.38], [48, 0.70], [56, 0.70], [56, 0.38], [124, 0.42], [140, 0.55]
])

// ---------- Cymbale : les charleys ----------
const hats = apparat("Cymbale", CYMBALE, 4)
reglages("cymbale", hats, {decay: 40, open: 7, tone: 7000, metal: 0.5, drift: 0.6, width: 0.5})
const FERME = 42, OUVERT = 46
/** La vitesse des aigus : elle change a chaque bloc. */
function vitesse(bar: number): number {
    if (!tourne(bar) || nu(bar) || bar < 8) {return 0}
    if (bar < 16) {return 1}    // charley ferme a contretemps
    if (bar < 32) {return 2}    // charley ouvert a contretemps, un ferme juste avant le temps
    if (bar < 72) {return 3}    // doubles-croches : faible, moyen, fort (ouvert), moyen
    if (bar < 112) {return 4}   // + un coup double par mesure
    if (bar < 124) {return 5}   // + la ride
    if (bar < 132) {return 2}
    return 1
}
build(hats.noteTracks[0], "Cymbale", bar => {
    const out: Note[] = []
    const hit = (ticks: number, pitch: number, velocity: number) =>
        out.push({position: Math.round(ticks), duration: 30, pitch, velocity: Math.min(1, velocity)})
    // Dans les creux, ils reviennent a pas de loup
    if ((bar >= 52 && bar < 55) || bar === 90) {
        const base = bar === 90 ? 0.3 : 0.12 + (bar - 52) * 0.1
        for (let step = 0; step < 16; step++) {hit(step * S16, FERME, base + step * 0.006 + (step % 4 === 2 ? 0.12 : 0))}
        return out
    }
    const v = vitesse(bar)
    if (v === 0) {return out}
    const gain = drop(bar) ? 1 : 0.85
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (v === 1) {if (beat === 2) {hit(step * S16, FERME, 0.6)}}
        else if (v === 2) {
            if (beat === 2) {hit(step * S16, OUVERT, 0.65)}
            if (beat === 3) {hit(step * S16, FERME, 0.5)}
        } else {
            // Le contour d'un shaker : faible sur le temps, moyen, fort a contretemps, moyen
            if (beat === 0) {hit(step * S16, FERME, 0.3 * gain)}
            else if (beat === 1) {hit(step * S16, FERME, 0.52 * gain)}
            else if (beat === 2) {hit(step * S16, OUVERT, 0.78 * gain)}
            else {hit(step * S16, FERME, 0.6 * gain)}
        }
    }
    // Le coup double : une triple-croche glissee, pas au meme endroit d'une mesure a l'autre
    if (v >= 4) {hit((rang(bar) % 2 === 0 ? 14 : 6) * S16 + S16 / 2, FERME, 0.45)}
    return out
})
// decay 10..300 ms (40 ms = 0.41, 60 ms = 0.53) : les charleys s'allongent quand ca monte
auto("cymbale", hats, "decay", vague([
    [0, 0.36], [32, 0.41], [56, 0.43], [88, 0.50], [92, 0.46], [124, 0.54], [140, 0.36]
], 3, 0.03))
auto("cymbale", hats, "width", [
    [0, 0.5], [48, 0.5], [52, 0.9], [56, 0.9], [56, 0.25], [64, 0.55], [88, 0.6], [91, 0.95], [92, 0.25],
    [100, 0.6], [140, 0.7]
])

// ---------- Clap, caisse claire, rimshot, toms, ride, crash : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -0.5})
const RIM = 37, SNARE = 38, CLAP = 39, TOM_L = 45, TOM_M = 47, TOM_H = 50, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -9, panning: -0.3}],
    ["Snare", SNARE, {volume: -8}],
    ["Clap", CLAP, {volume: -2}],
    ["Low Tom", TOM_L, {volume: -6, panning: -0.25}],
    ["Mid Tom", TOM_M, {volume: -7, panning: 0}],
    ["High Tom", TOM_H, {volume: -7, panning: 0.25}],
    ["Crash", CRASH, {volume: -12}],
    ["Ride", RIDE, {volume: -13, panning: 0.2}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
// Un peu de saturation sur toute la batterie : ca soude et ca durcit
essai("saturation batterie", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -26})

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: Math.round(step * S16), duration: S16, pitch, velocity: Math.min(1, velocity)})
    // Avant les drops : un rimshot qui accelere pour de bon (de 300 a 36 ms), puis un temps de silence
    if (avantDrop(bar)) {
        const count = 13
        const ratio = Math.pow(0.036 / 0.30, 1 / (count - 1))
        let gap = 0.30, sum = 0
        for (let k = 0; k < count; k++) {sum += gap; gap *= ratio}
        const scale = 2.95 * beatSec / sum
        let at = 0
        gap = 0.30
        for (let k = 0; k < count; k++) {
            hit(at * scale / beatSec * 4, RIM, 0.35 + 0.6 * k / (count - 1))
            at += gap
            gap *= ratio
        }
        return out
    }
    if (!tourne(bar) || nu(bar)) {return out}
    const d = drop(bar)
    for (let step = 0; step < 16; step++) {
        // Clap sur 2 et 4, des la mesure 24 ; dans les drops, une caisse claire dessous
        if (bar >= 24 && bar < 132 && step % 8 === 4) {
            hit(step, CLAP, d ? 0.95 : 0.8)
            if (d) {hit(step, SNARE, 0.3)}
        }
    }
    // Le rimshot : deux coups sur des pas faibles, toujours les memes
    if (bar >= 32) {hit(3, RIM, 0.5); hit(9, RIM, 0.4)}
    // Le tom grave : le roulis, dans la seconde moitie des drops
    if ((bar >= 73 && bar < 88) || (bar >= 112 && bar < 124)) {hit(7, TOM_L, 0.55); hit(13, TOM_L, 0.45)}
    // La ride, au sommet seulement
    if (vitesse(bar) >= 5) {for (let step = 0; step < 16; step += 2) {hit(step, RIDE, step % 4 === 2 ? 0.55 : 0.35)}}
    if (bar === 56 || bar === 92) {hit(0, CRASH, 0.8)}
    if (bar === 112) {hit(0, CRASH, 0.55)}
    // Fin de bloc : les toms descendent et le clap bafouille
    if (finDeBloc(bar) && bar >= 31) {
        hit(12, TOM_H, 0.5); hit(13, TOM_M, 0.58); hit(14, TOM_M, 0.66); hit(15, TOM_L, 0.75)
        hit(15, CLAP, 0.6)
    }
    return out
})

// ---------- Souffle : l'air de la piece, et les montees ----------
const breath = apparat("Souffle", SOUFFLE, -14)
reglages("souffle", breath, {reso: 0.6, drift: 0.6})
build(breath.noteTracks[0], "Souffle", bar => {
    const section = SECTIONS.find(s => s.start === bar)
    if (!section) {return []}
    return [{position: 0, duration: section.bars * BAR - 10, pitch: 60, velocity: 1}]
})
// freq 80..8000 Hz (300 Hz = 0.29, 600 = 0.44, 2000 = 0.70, 5000 = 0.90)
auto("souffle", breath, "freq", [
    [0, 0.30], [48, 0.36], [52, 0.48], [55.75, 0.92], [56, 0.45], [88, 0.45], [91.75, 0.92], [92, 0.50],
    [124, 0.42], [140, 0.30]
])
auto("souffle", breath, "volume", [
    [0, 0.50], [16, 0.25], [48, 0.25], [48, 0.50], [55.75, 1.0], [56, 0.20], [88, 0.22], [88, 0.55],
    [91.75, 1.0], [92, 0.22], [124, 0.30], [140, 0.55]
])

// ---------- La voix ----------
// Deux pistes : la voix, presque seche ; et ses lancers, les memes mots
// envoyes de temps en temps dans un long echo.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -3})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.3, wet: -17})
const lancer: any = project.addInstrumentUnit("Tape", {label: "Voix lancee", volume: -9})
lancer.addAudioEffect("Delay", {delay: 13, feedback: 0.62, cross: 1, filter: 0.3, wet: -2})
const dire = (quoi: string, sample: any, bar: number, step: number, lance: boolean = false) => {
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
    if (lance) {essai("lancer " + quoi, () => lancer.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))}
}
dire("intro", vUn, 7, 8, true)
dire("fin intro", vUnAccord, 15, 8)
dire("avant groove", vDeuxAccord, 31, 0)
dire("avant creux", vBegaie, 47, 12)
dire("creux 1", vDeux, 50, 0)
dire("creux 2", vDeuxAccord, 52, 0, true)
dire("creux go", vGo, 54, 0)
dire("creux vite", vVite, 55, 0)
dire("drop 63", vBegaie, 63, 12)
dire("avant le bloc sans graves", vUnAccord, 71, 8, true)
dire("drop 79", vBegaie, 79, 12)
dire("trou 1", vDeuxAccord, 88, 0, true)
dire("trou go", vGo, 90, 0)
dire("trou vite", vVite, 91, 0)
dire("final 99", vBegaie, 99, 12)
dire("avant le passage nu", vUn, 107, 8, true)
dire("sommet 115", vBegaie, 115, 12)
dire("sommet 123", vDeuxAccord, 123, 0, true)
dire("fin", vUn, 138, 0, true)

// ---------- Aspirations et impacts ----------
// L'aspiration s'arrete un temps avant le drop : ce temps-la reste vide
const fxRise: any = project.addInstrumentUnit("Tape", {label: "Aspirations", volume: -4})
essai("aspiration longue", () => fxRise.audioTracks[0].addRegion(aspireLong, {position: Math.round(53.75 * BAR), playback: "no-sync"}))
essai("aspiration courte", () => fxRise.audioTracks[0].addRegion(aspireCourt, {position: Math.round(90.75 * BAR), playback: "no-sync"}))
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -6})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 56 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 92 * BAR, playback: "no-sync"}))

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Pour le mix, on mesure sur le premier drop ce qu'on a mesure sur les deux
// references : l'energie par bande d'octave, la part du grave et de l'aigu,
// l'ecart entre la crete et le niveau moyen, et la force des attaques sur
// chacun des 16 pas de la mesure (0 a 9) dans le grave, le medium et l'aigu.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, rumble, acid, acid2, stab, hats, drums, breath, voix, lancer, fxRise, fxHit]
const STEMS: [string, any][] = [["Frappe", kick], ["Grondement", rumble], ["Acide", acid], ["Acide carree", acid2],
    ["Accord", stab], ["Cymbale", hats], ["909", drums], ["Voix", voix], ["Voix lancee", lancer], ["Aspirations", fxRise]]
if (MESURER) {
    const parts = [["intro", 0, 16], ["montee", 16, 32], ["groove", 32, 48], ["break", 48, 56], ["drop", 56, 72],
        ["plus", 72, 88], ["trou", 88, 92], ["final", 92, 108], ["nu", 108, 112], ["sommet", 112, 124],
        ["sortie", 124, 140]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const R = audio.frames.length > 1 ? audio.frames[1] : L
        const n = L.length
        /** Filtre du second ordre : 0 = passe-haut, 1 = passe-bas, 2 = passe-bande. */
        const filtre = (kind: number, fc: number, q: number) => {
            const w = 2 * Math.PI * fc / rate, alpha = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + alpha
            const b0 = kind === 0 ? (1 + c) / 2 : kind === 1 ? (1 - c) / 2 : alpha
            const b1 = kind === 0 ? -(1 + c) : kind === 1 ? 1 - c : 0
            const b2 = kind === 2 ? -alpha : b0
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0
            return (x: number) => {
                const y = (b0 * x + b1 * x1 + b2 * x2 + 2 * c * y1 - (1 - alpha) * y2) / a0
                x2 = x1; x1 = x; y2 = y1; y1 = y
                return y
            }
        }
        const f1 = filtre(0, 2000, 0.707), f2 = filtre(0, 2000, 0.707), f3 = filtre(1, 6000, 0.707), f4 = filtre(1, 6000, 0.707)
        let peakValue = 0, sumL = 0, sumR = 0, sumM = 0, sumZone = 0
        for (let i = 0; i < n; i++) {
            const a = Math.abs(L[i])
            if (a > peakValue) {peakValue = a}
            const m = (L[i] + R[i]) / 2
            sumL += L[i] * L[i]
            sumR += R[i] * R[i]
            sumM += m * m
            const z = f4(f3(f2(f1(m))))
            sumZone += z * z
        }
        const mono = sumL + sumR > 0 ? (10 * Math.log10(2 * sumM / (sumL + sumR))).toFixed(1) : "0"
        const zone = sumM > 0 ? (100 * sumZone / sumM).toFixed(1) : "0"
        const cells: string[] = []
        for (const s of parts) {
            const from = Math.max(1, Math.floor((s[1] as number) * barSec * rate))
            const to = Math.min(n, Math.floor((s[2] as number) * barSec * rate))
            // Une piste isolee peut finir avant la fin de la fenetre : on divise par la duree prevue
            const plein = Math.floor((s[2] as number) * barSec * rate) - from
            let sx = 0, sd = 0
            for (let i = from; i < to; i++) {const d = L[i] - L[i - 1]; sx += L[i] * L[i]; sd += d * d}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / plein)).toFixed(1) + "dB " + Math.round(Math.sqrt(sd / sx) * rate / (2 * Math.PI)) + "Hz" : "silence"))
        }
        let line = stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " mono " + mono + "dB zone " + zone + "% : " + cells.join(", ")
        if (stem[1] === null) {
            // Les memes mesures que sur les references, sur le premier drop (mesures 56 a 72)
            const from = Math.floor(56 * barSec * rate), to = Math.min(n, Math.floor(72 * barSec * rate))
            const hop = 512
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            const kA = 1 - Math.exp(-2 * Math.PI * 300 / rate), kB = 1 - Math.exp(-2 * Math.PI * 3000 / rate)
            const centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
            const bancs = centres.map(c => filtre(2, Math.min(c, rate * 0.45), 1.414))
            const energies: number[] = centres.map(() => 0)
            let lp = 0, lp2 = 0, hl = 0, ma = 0, mb = 0, sLow = 0, sHigh = 0, sTot = 0, top = 0
            const eL: number[] = [], eM: number[] = [], eH: number[] = []
            for (let i = from; i < to; i += hop) {
                let l = 0, m = 0, h = 0
                for (let j = i; j < i + hop && j < to; j++) {
                    const x = (L[j] + R[j]) / 2
                    const ax = Math.abs(x)
                    if (ax > top) {top = ax}
                    lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                    hl += (x - hl) * kHigh
                    ma += (x - ma) * kA; mb += (x - mb) * kB
                    const hh = x - hl, mm = mb - ma
                    l += lp2 * lp2; m += mm * mm; h += hh * hh; sTot += x * x
                    for (let b = 0; b < bancs.length; b++) {const y = bancs[b](x); energies[b] += y * y}
                }
                eL.push(Math.sqrt(l)); eM.push(Math.sqrt(m)); eH.push(Math.sqrt(h))
                sLow += l; sHigh += h
            }
            const perBar = barSec * rate / hop
            const pas = (e: number[]) => {
                const acc: number[] = []
                for (let s = 0; s < 16; s++) {acc.push(0)}
                for (let i = 1; i < e.length; i++) {
                    const d = e[i] - e[i - 1]
                    if (d > 0) {acc[Math.floor(((i / perBar) % 1) * 16 + 0.2) % 16] += d}
                }
                let mx = 0
                for (const v of acc) {if (v > mx) {mx = v}}
                return acc.map(v => String(Math.round(9 * v / (mx || 1)))).join("")
            }
            let somme = 0
            for (const e of energies) {somme += e}
            const rmsDrop = Math.sqrt(sTot / (to - from))
            line += " || drop : bandes " + centres.map((c, b) => (c >= 1000 ? c / 1000 + "k" : String(c)) + ":" + (10 * Math.log10(energies[b] / somme)).toFixed(0)).join(" ") +
                " | grave " + pas(eL) + " medium " + pas(eM) + " aigu " + pas(eH) +
                " | partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
                " | crete-moyenne " + (20 * Math.log10(top / rmsDrop)).toFixed(1) + "dB"
        }
        report.push(line)
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
