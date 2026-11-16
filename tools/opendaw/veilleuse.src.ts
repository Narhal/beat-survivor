// VEILLEUSE - Beat Survivor
// Electronica sur bande usee - 80 BPM en 12/8 - Sol majeur, 28 cents au-dessus du diapason - 96 mesures (4 min 48)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// veilleuse.src.ts (le morceau), voix-veille.json (la voix) et des
// instruments du dossier apparat/.
//
// Demande de N4 : un second morceau dans le genre de "4 h 04" (Boards of
// Canada). Le theme : l insomnie fievreuse et la nostalgie.
//
// L idee, en une phrase : une berceuse de boite a musique que la fievre
// deforme au fil de la nuit.
// - La nostalgie : une boite a musique, une mesure qui berce (chaque temps
//   est divise en trois), et quatre accords dont le dernier est le meme que le
//   troisieme, devenu mineur : Sol, Si mineur, Do, Do mineur. Deux notes ne
//   bougent jamais (Si et Re) ; une seule descend, d un demi-ton a la fois.
// - La fievre : tout est accorde 28 cents trop haut, et la bande derive de
//   plus en plus a mesure que la nuit avance. Elle est au pire dans le
//   "delire" (mesures 48 a 64), ou la batterie s arrete, puis elle retombe a
//   l aube. C est ecrit comme une courbe de temperature, dans les automations.
// - L insomnie : quelqu un compte les moutons. "One", "two", "three" au
//   coucher ; de "four" a "eight" dans le delire ; et a la fin, "sleep", puis
//   "one" : ca recommence. Le morceau finit sur l accord mineur, la bande
//   ralentit ; relance en boucle, il retombe sur le Sol.
//
// Ce qui vient des retours de N4 sur "4 h 04" :
// - aucun bruit qui dure : ni souffle, ni caisse claire qui traine, ni
//   charley ouvert. La batterie (Poussiere 2) est seche, courte, et passe
//   derriere la nappe ;
// - tout ce qui a une hauteur est accorde avec le morceau, la caisse claire
//   aussi (un Si, la note qui ne bouge jamais) ;
// - l aigu ne vient pas du bruit : il vient de la boite a musique.
//
// Instruments (Apparat = instrument scriptable d openDAW) : Peigne (la boite
// a musique, ecrite pour ce morceau), Magneto (nappe, basse, chant), Poussiere 2
// (batterie).

const BPM = 80
const BAR = PPQN.Bar
/** Un pas = un tiers de temps : douze par mesure. */
const PAS = BAR / 12
const TOTAL = 96
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM
/** Tout le morceau est accorde 28 cents au-dessus du diapason. */
const FIEVRE = 28

const MAGNETO: string = __MAGNETO_L__
const PEIGNE: string = __PEIGNE_L__
const POUSSIERE: string = __POUSSIERE2_L__
const VOIX_TXT: string = __VOIXVEILLE__
const VOIX: any = JSON.parse(VOIX_TXT)
// Un mot dont la hauteur a ete mal mesuree (une voyelle trop courte) prend la
// hauteur des autres : sinon il serait corrige de travers et chanterait faux.
{
    const noms = Object.keys(VOIX.mots)
    const hauteurs = noms.map(k => VOIX.mots[k].f0 as number).sort((a, b) => a - b)
    const mediane = hauteurs[Math.floor(hauteurs.length / 2)]
    for (const k of noms) {
        if (Math.abs(VOIX.mots[k].f0 / mediane - 1) > 0.03) {VOIX.mots[k].f0 = mediane}
    }
}

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
let graine = 3955
const rnd = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0
    return graine / 2147483648 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (Si, 28 cents
// trop haut : 125,5 Hz). Ici on les decode et on les reechantillonne.
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
 * commande la meme bande d'un accord en dents de scie (la note, sa quinte,
 * son octave). Le mot garde ses voyelles et ses consonnes, mais il chante la
 * note qu'on lui donne. Du bruit dans les quatre bandes du haut rend les
 * sifflantes.
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

// [mot, position en temps, demi-tons, duree max en temps (0 = mot entier)]
type Dit = [string, number, number, number]
/** nue = 1 : la voix de SAM ; voc = 1 : le vocodeur ; les deux se melangent. */
async function phrase(label: string, dits: Dit[], nue: number, voc: number) {
    let total = 0
    const parts = dits.map(d => {
        const raw = norme(mot(d[0], d[2]), 1)
        const buf = new Float32Array(raw.length)
        const v = voc > 0 ? vocode(raw, VOIX.cible * Math.pow(2, d[2] / 12)) : null
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
        const entree = Math.min(48, Math.max(1, Math.floor(p.len / 4)))
        const sortie = Math.min(fade, Math.max(1, Math.floor(p.len / 3)))
        for (let i = 0; i < p.len; i++) {
            f[p.start + i] += p.buf[i] * Math.min(1, i / entree, (p.len - i) / sortie)
        }
    }
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}

// Les moutons : un mot par sample. La voix chante le Si, la note qui ne bouge pas.
const MOUTONS = ["one", "two", "three", "four", "five", "six", "seven", "eight"]
const vMoutons: any[] = []
for (let k = 0; k < MOUTONS.length; k++) {
    vMoutons.push(await phrase("Veilleuse " + MOUTONS[k], [[MOUTONS[k], 0, 0, 0]], 0.8, 0.5))
}
// "Sleep", une tierce plus bas (le Sol : enfin la tonique), donc plus lent
const vSleep = await phrase("Veilleuse sleep", [["sleep", 0, -4, 0]], 0.8, 0.5)

// ---------- Projet ----------
const project = openDAW.newProject("Veilleuse")
project.bpm = BPM

// Une seule salle pour tout le monde
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.82, damping: 0.6, preDelay: 25, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Coucher", start: 0, bars: 8},
    {name: "Veille", start: 8, bars: 8},
    {name: "Nuit", start: 16, bars: 16},
    {name: "Fievre 1", start: 32, bars: 16},
    {name: "Delire", start: 48, bars: 16},
    {name: "Fievre 2", start: 64, bars: 16},
    {name: "Aube", start: 80, bars: 16}
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
            position: Math.round(p[0] * BAR), value: Math.max(0, Math.min(1, p[1])), interpolation: Interpolation.Linear
        })))
    })
}
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)
const enLog = (points: number[][], lo: number, hi: number) => points.map(p => [p[0], loga(p[1], lo, hi)])
const enDroit = (points: number[][], lo: number, hi: number) => points.map(p => [p[0], droit(p[1], lo, hi)])

/** Un tirage entre 0 et 1 qui ne depend que de ses deux nombres : le meme a chaque fois. */
const tirage = (a: number, b: number): number => {
    let s = (a * 374761393 + b * 668265263 + 3955) >>> 0
    s = ((s ^ (s >>> 13)) * 1274126177) >>> 0
    s = (s ^ (s >>> 16)) >>> 0
    return s / 4294967296
}

// ---------- La carte du morceau ----------
/** Les passages avec la batterie entiere et la basse. */
const nuit = (bar: number) => (bar >= 16 && bar < 48) || (bar >= 64 && bar < 80)
/** Le delire : la batterie s arrete, la fievre est au plus haut. */
const delire = (bar: number) => bar >= 48 && bar < 64
/** La mesure avant le delire s arrete un temps plus tot. */
const limite = (bar: number) => bar === 47 ? 9 : 12
/**
 * L accord de la mesure : 0 = Sol, 1 = Si mineur, 2 = Do, 3 = Do mineur. Deux mesures chacun.
 * Dans le delire on ne fait plus que se balancer entre Do mineur et Sol, puis Do, Do mineur.
 */
const accord = (bar: number): number => {
    if (!delire(bar)) {return Math.floor((bar % 8) / 2)}
    const k = Math.floor((bar - 48) / 2)
    return k < 6 ? (k % 2 === 0 ? 3 : 0) : k === 6 ? 2 : 3
}
/** Les reglages de bande communs. Chaque instrument a sa phase : chacun derive de son cote. */
const ruban = (phase: number, wow: number) => ({tune: FIEVRE, wow, flutter: 3, phase})

/**
 * La courbe de temperature : [mesure, fievre de 0 a 1]. Elle monte toute la nuit,
 * culmine dans le delire et retombe a l aube. Toutes les derives de bande en sortent.
 */
const TEMPERATURE = [[0, 0.1], [16, 0.2], [32, 0.42], [47.9, 0.6], [48, 0.85], [56, 1], [62, 0.8], [64, 0.55], [80, 0.25], [96, 0.05]]
/** Un parametre qui suit la fievre, de `calme` a `chaud`, ramene entre 0 et 1 pour l automation. */
const fievre = (calme: number, chaud: number, lo: number, hi: number) =>
    TEMPERATURE.map(p => [p[0], droit(calme + (chaud - calme) * p[1], lo, hi)])

// ---------- La nappe ----------
// Quatre notes par accord. Le Si et le Re ne bougent jamais. La note du haut
// descend : Fa diese, Fa diese, Mi, Mi bemol.
const NAPPE = [[55, 59, 62, 66], [57, 59, 62, 66], [55, 59, 62, 64], [55, 59, 62, 63]]
const V_NAPPE = 0.5
const pad = apparat("Nappe", MAGNETO, -8.5)
reglages("nappe", pad, {
    ...ruban(0, 12), shape: 0.35, pwm: 0.5, detune: 12, sub: 0, cutoff: 380, envmod: 1.4, track: 0.3, reso: 0.15,
    attack: 1200, decay: 3500, sustain: 0.75, release: 2400, vibrato: 0, drift: 8, glide: 1,
    drive: 0.35, age: 0.3, dropout: 0.25, width: 0.8, volume: V_NAPPE
})
pad.addSend(reverb, {amount: -12})
build(pad.noteTracks[0], "Nappe", bar => {
    const out: Note[] = []
    if (bar < 4 || bar % 2 !== 0) {return out}
    const notes = NAPPE[accord(bar)].slice()
    // Au plus fort, une cinquieme voix : le Si, une octave plus haut
    if (bar >= 64 && bar < 80) {notes.push(71)}
    for (const pitch of notes) {out.push({position: 0, duration: 2 * BAR - 180, pitch, velocity: 0.7})}
    return out
})
auto("nappe", pad, "cutoff", enLog([
    [0, 240], [16, 380], [32, 480], [47.9, 520], [48, 300], [64, 560], [80, 400], [96, 200]
], 40, 12000))
auto("nappe", pad, "wow", fievre(8, 42, 0, 60))
auto("nappe", pad, "flutter", fievre(2, 8, 0, 20))
auto("nappe", pad, "dropout", [
    [0, 0.4], [16, 0.1], [47.9, 0.1], [48, 0.7], [62, 0.5], [64, 0.1], [80, 0.25], [96, 0.6]
])
// A la fin, la bande ralentit
auto("nappe", pad, "tune", enDroit([[0, FIEVRE], [94.6, FIEVRE], [96, -300]], -400, 100))
auto("nappe", pad, "volume", [[0, V_NAPPE], [94.6, V_NAPPE], [96, 0]])

// ---------- La basse ----------
// Elle monte : Sol, Si, Do, et reste sur le Do quand il devient mineur. Les
// notes sont ecrites une octave au-dessus de ce qu on entend.
const FOND = [43, 47, 48, 48]
/** La note qui mene a l accord suivant (-1 : aucune). */
const APPROCHE = [45, -1, -1, 50]
const bass = apparat("Basse", MAGNETO, -2)
reglages("basse", bass, {
    ...ruban(0.3, 8), shape: 0.2, pwm: 0.2, detune: 5, sub: 1, cutoff: 200, envmod: 1.6, track: 0.2, reso: 0.1,
    attack: 8, decay: 700, sustain: 0.55, release: 140, vibrato: 0, drift: 3, glide: 1,
    drive: 0.5, age: 0.7, dropout: 0, width: 0.15, volume: 0.5
})
build(bass.noteTracks[0], "Basse", bar => {
    const out: Note[] = []
    const n = (step: number, len: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * PAS, duration: Math.round(Math.min(len, limite(bar) - step) * PAS - 40), pitch, velocity})}
    }
    const a = accord(bar), f = FOND[a]
    if (nuit(bar)) {
        if (bar % 2 === 0) {
            n(0, 5, f, 0.9); n(6, 2, f, 0.7); n(9, 2, f, 0.6)
        } else {
            n(0, 7, f, 0.85)
            n(9, 2, APPROCHE[a] >= 0 ? APPROCHE[a] : f, 0.65)
        }
        return out
    }
    // La fin du delire et l aube : une note longue par mesure
    if ((bar >= 56 && bar < 64) || (bar >= 80 && bar < 88)) {n(0, bar % 2 === 0 ? 10 : 8, f, 0.75)}
    return out
})

// ---------- La boite a musique ----------
// La berceuse. Cinq notes (Sol, La, Si, Re, Mi), et sur le dernier accord le Mi
// devient bemol. Chaque mesure : [pas, note, force].
type Air = number[][][]
const BERCEUSE: Air = [
    [[0, 74, 0.8], [2, 76, 0.55], [3, 79, 0.75], [6, 74, 0.7], [9, 71, 0.6]],
    [[0, 74, 0.75], [3, 71, 0.6], [6, 67, 0.7]],
    [[0, 78, 0.8], [2, 76, 0.55], [3, 74, 0.7], [6, 71, 0.7], [9, 74, 0.6]],
    [[0, 74, 0.7], [3, 78, 0.65], [6, 81, 0.75]],
    [[0, 79, 0.8], [2, 76, 0.55], [3, 79, 0.7], [6, 83, 0.75], [9, 79, 0.6]],
    [[0, 76, 0.75], [3, 74, 0.6], [6, 76, 0.7]],
    [[0, 79, 0.8], [2, 75, 0.6], [3, 79, 0.7], [6, 74, 0.7], [9, 75, 0.65]],
    [[0, 74, 0.75], [6, 71, 0.6]]
]
/** Dans le delire : la berceuse se defait. Une note tous les deux temps, qui tombe. Par accord, sur deux mesures. */
const CHUTE: {[accord: number]: number[]} = {
    3: [75, 74, 71, 67], 0: [74, 71, 79, 74], 2: [76, 74, 71, 67]
}
const box = apparat("Boite a musique", PEIGNE, 2, -0.12)
reglages("boite", box, {
    ...ruban(0.15, 8), flutter: 2, decay: 1600, bright: 0.75, metal: 0.35, strike: 0.35, soft: 4, beat: 1.2,
    drift: 4, width: 0.6, volume: 0.5
})
essai("echo boite", () => box.addAudioEffect("Delay", {delay: 11, feedback: 0.3, cross: 1, filter: 0.3, wet: -13}))
box.addSend(reverb, {amount: -9})
build(box.noteTracks[0], "Boite a musique", bar => {
    const out: Note[] = []
    const note = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * PAS, duration: PAS, pitch, velocity})}
    }
    if (delire(bar)) {
        if (bar >= 60) {return out}
        const chute = CHUTE[accord(bar)]
        const k = (bar - 48) % 2
        note(0, chute[k * 2], 0.7); note(6, chute[k * 2 + 1], 0.6)
        return out
    }
    // La derniere phrase s arrete avant la fin : le dernier accord reste seul
    if (bar >= 94) {return out}
    // Elle joue moins fort quand le chant est la
    const force = (bar >= 24 && bar < 32) || (bar >= 40 && bar < 48) || (bar >= 64 && bar < 72) ? 0.82 : 1
    for (const n of BERCEUSE[bar % 8]) {note(n[0], n[1], n[2] * force)}
    return out
})
// La fievre : la boite derive, ses notes se faussent, ses deux lames s ecartent
auto("boite", box, "wow", fievre(6, 36, 0, 60))
auto("boite", box, "drift", fievre(3, 16, 0, 30))
auto("boite", box, "beat", fievre(1, 6, 0, 12))

// ---------- Le carillon ----------
// Une seconde boite, plus petite : les notes de l accord, trois par temps, sans
// arret. Une seule note change d un accord a l autre. C est la fievre qui monte.
const CARILLON = [[67, 71, 74, 78, 74, 71], [69, 71, 74, 78, 74, 71], [67, 71, 74, 76, 74, 71], [67, 71, 74, 75, 74, 71]]
const chime = apparat("Carillon", PEIGNE, -5, 0.25)
reglages("carillon", chime, {
    ...ruban(0.6, 12), decay: 520, bright: 0.3, metal: 0.15, strike: 0.15, soft: 6, beat: 2,
    drift: 6, width: 0.8, volume: 0.5
})
chime.addSend(reverb, {amount: -11})
build(chime.noteTracks[0], "Carillon", bar => {
    const out: Note[] = []
    const on = (bar >= 32 && bar < 48) || (bar >= 56 && bar < 80)
    if (!on) {return out}
    const notes = CARILLON[accord(bar)]
    const force = bar >= 56 && bar < 64 ? 0.7 : 1
    for (let step = 0; step < limite(bar); step++) {
        const velocity = ((step % 3 === 0 ? 0.7 : 0.45) + (tirage(bar, step) - 0.5) * 0.1) * force
        out.push({position: step * PAS, duration: PAS, pitch: notes[step % 6], velocity})
    }
    return out
})
auto("carillon", chime, "wow", fievre(8, 34, 0, 60))
auto("carillon", chime, "bright", [[32, 0.35], [48, 0.6], [56, 0.3], [64, 0.55], [80, 0.35]])

// ---------- Le chant ----------
// Une voix de synthe qui glisse d une note a l autre et tremble en retard :
// des notes longues, deux par mesure au plus. Chaque mesure : [pas, longueur, note].
type Ligne = number[][][]
const CHANT: Ligne = [
    [[0, 6, 71], [6, 6, 74]],
    [[0, 9, 79], [9, 3, 78]],
    [[0, 6, 78], [6, 6, 74]],
    [[0, 12, 69]],
    [[0, 6, 67], [6, 6, 71]],
    [[0, 9, 76], [9, 3, 74]],
    [[0, 6, 75], [6, 6, 74]],
    [[0, 12, 71]]
]
const lead = apparat("Chant", MAGNETO, -7.5, 0.1)
reglages("chant", lead, {
    ...ruban(0.55, 18), flutter: 4, shape: 0.12, pwm: 0.2, detune: 6, sub: 0, cutoff: 850, envmod: 1.2, track: 0.5,
    reso: 0.3, attack: 60, decay: 1200, sustain: 0.65, release: 700, vibrato: 12, drift: 6, glide: 90,
    drive: 0.25, age: 0.3, dropout: 0.1, width: 0.35, volume: 0.5
})
essai("echo chant", () => lead.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 1, filter: 0.3, wet: -12}))
lead.addSend(reverb, {amount: -8})
build(lead.noteTracks[0], "Chant", bar => {
    const on = (bar >= 24 && bar < 32) || (bar >= 40 && bar < 48) || (bar >= 64 && bar < 72)
    if (!on) {return []}
    const notes = CHANT[bar % 8].filter(n => n[0] < limite(bar))
    return notes.map((n, k) => {
        const suivante = notes[k + 1]
        const liee = suivante !== undefined && suivante[0] === n[0] + n[1]
        return {
            position: n[0] * PAS, duration: Math.round(Math.min(n[1], limite(bar) - n[0]) * PAS + (liee ? 30 : -60)),
            pitch: n[2], velocity: 0.8
        }
    })
})
auto("chant", lead, "vibrato", fievre(8, 28, 0, 50))
auto("chant", lead, "wow", fievre(14, 34, 0, 60))

// ---------- L aspiration ----------
// Le Si et le Re, les deux notes qui ne bougent pas, qui enflent pendant une
// mesure et s arretent net sur le premier temps de la suivante.
const swell = apparat("Aspiration", MAGNETO, -11.5)
reglages("aspiration", swell, {
    ...ruban(0.7, 20), shape: 0.3, pwm: 0.6, detune: 14, sub: 0, cutoff: 260, envmod: 3.2, track: 0.3, reso: 0.25,
    attack: 2800, decay: 400, sustain: 1, release: 45, vibrato: 0, drift: 10, glide: 1,
    drive: 0.3, age: 0.4, dropout: 0, width: 0.9, volume: 0.5
})
swell.addSend(reverb, {amount: -4})
build(swell.noteTracks[0], "Aspiration", bar => {
    if (![15, 31, 47, 63, 79].includes(bar)) {return []}
    return [71, 74].map(pitch => ({position: 0, duration: limite(bar) * PAS - 20, pitch, velocity: 0.7}))
})

// ---------- La batterie ----------
// Seche et courte. Le pied sur les temps 1 et 3, un coup sur les temps 2 et 4,
// et des tics qui boitent (le premier et le dernier tiers de chaque temps) :
// une pendule. Aucun charley ouvert, aucun bruit qui traine.
const KICK = 36, RIM = 37, SNARE = 38, HAT = 42
/** 0 = rien ; 1 = un coeur qui bat ; 2 = le pied, le cercle et la pendule ; 3 = avec la caisse claire ; 4 = ce qu il en reste. */
function batterie(bar: number): number {
    if (bar >= 8 && bar < 16) {return 1}
    if (bar >= 16 && bar < 32) {return 2}
    if (bar >= 32 && bar < 48) {return 3}
    if (bar >= 56 && bar < 64) {return 1}
    if (bar >= 64 && bar < 80) {return 3}
    if (bar >= 80 && bar < 88) {return 4}
    if (bar >= 88 && bar < 94) {return 1}
    return 0
}
const drums = apparat("Poussiere", POUSSIERE, -8)
reglages("poussiere", drums, {
    // La peau de la caisse claire est un Si, accorde avec le morceau (251 Hz) ; son second partiel tombe sur un La
    tune: 56, punch: 0.6, kdecay: 190, stone: 251, snap: 0.35, sdecay: 90, nlen: 30, ntone: 3200, slevel: 0.5,
    htone: 7000, hdecay: 30, odecay: 90,
    rate: 48000, bits: 10, drive: 0.15, tone: 16000, volume: 0.6
})
drums.addSend(reverb, {amount: -22})
build(drums.noteTracks[0], "Poussiere", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step >= limite(bar)) {return}
        const v = velocity + (tirage(bar, step * 7 + pitch) - 0.5) * 0.08
        out.push({position: step * PAS, duration: PAS / 2, pitch, velocity: Math.max(0.05, Math.min(1, v))})
    }
    if (b === 0) {return out}
    if (b === 1) {
        // Deux coups rapproches, puis rien : un coeur
        hit(0, KICK, 0.75); hit(2, KICK, 0.45)
        return out
    }
    const pair = bar % 2 === 0
    if (b === 4) {
        hit(0, KICK, 0.85); hit(6, KICK, 0.7); hit(3, RIM, 0.5); hit(9, RIM, 0.5)
        for (const s of [0, 3, 6, 9]) {hit(s, HAT, 0.4)}
        return out
    }
    hit(0, KICK, 1); hit(6, KICK, 0.9)
    if (pair) {hit(5, KICK, 0.55)} else {hit(11, KICK, 0.5)}
    // Les temps 2 et 4 : le cercle d abord, la caisse claire quand la fievre monte
    if (b === 2) {hit(3, RIM, 0.6); hit(9, RIM, 0.65)}
    if (b === 3) {
        hit(3, SNARE, 0.9); hit(9, SNARE, 1)
        if (!pair) {hit(8, SNARE, 0.3)}
    }
    // La pendule
    for (const s of [0, 2, 3, 5, 6, 8, 9, 11]) {hit(s, HAT, s % 3 === 0 ? 0.85 : 0.6)}
    // Fin de phrase : trois coups sur le dernier temps
    if (bar % 8 === 7 && b === 3) {hit(10, SNARE, 0.5); hit(11, SNARE, 0.7)}
    return out
})

// ---------- La voix ----------
// Quelqu un compte. Une seule piste, dans un echo et dans la salle ; deux
// regions ne se chevauchent jamais.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -9})
essai("echo voix", () => voix.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.3, wet: -8}))
voix.addSend(reverb, {amount: -6})
const dire = (quoi: string, sample: any, bar: number, step: number) =>
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * PAS, playback: "no-sync"}))
// Le coucher : un, deux, trois. Un mouton toutes les deux mesures.
dire("one", vMoutons[0], 9, 6)
dire("two", vMoutons[1], 11, 6)
dire("three", vMoutons[2], 13, 6)
// Le delire : de quatre a huit, de plus en plus pres
dire("four", vMoutons[3], 49, 6)
dire("five", vMoutons[4], 51, 6)
dire("six", vMoutons[5], 53, 6)
dire("seven", vMoutons[6], 55, 0)
dire("eight", vMoutons[7], 56, 6)
// L aube : "sleep". Puis ca recommence.
dire("sleep", vSleep, 90, 0)
dire("one encore", vMoutons[0], 94, 6)

// Limiteur de sortie, leger : les references ne sont presque pas limitees
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -0.8} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur la premiere fievre (mesures 32 a 48), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [pad, bass, box, chime, lead, swell, drums, voix]
const STEMS: [string, any][] = [["Nappe", pad], ["Basse", bass], ["Boite", box], ["Carillon", chime],
    ["Chant", lead], ["Aspiration", swell], ["Poussiere", drums]]
if (MESURER) {
    const parts = [["coucher", 0, 8], ["veille", 8, 16], ["nuit", 16, 32], ["fievre1", 32, 48], ["delire", 48, 64],
        ["fievre2", 64, 80], ["aube", 80, 96]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const R = audio.frames.length > 1 ? audio.frames[1] : L
        const n = L.length
        const filtre = (genre: number, fc: number, q: number) => {
            // genre 0 = passe-bas, 1 = passe-haut, 2 = passe-bande
            const w = 2 * Math.PI * fc / rate, alpha = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + alpha
            const b0 = genre === 1 ? (1 + c) / 2 : genre === 0 ? (1 - c) / 2 : alpha
            const b1 = genre === 1 ? -(1 + c) : genre === 0 ? 1 - c : 0
            const b2 = genre === 2 ? -alpha : b0
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0
            return (x: number) => {
                const y = (b0 * x + b1 * x1 + b2 * x2 + 2 * c * y1 - (1 - alpha) * y2) / a0
                x2 = x1; x1 = x; y2 = y1; y1 = y
                return y
            }
        }
        const q0 = Math.sqrt(0.5)
        const f1 = filtre(1, 2000, q0), f2 = filtre(1, 2000, q0), f3 = filtre(0, 6000, q0), f4 = filtre(0, 6000, q0)
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
            let sx = 0
            for (let i = from; i < to; i++) {sx += (L[i] * L[i] + R[i] * R[i]) / 2}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / plein)).toFixed(1) : "-"))
        }
        let line = stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " mono " + mono + " zone " + zone + "% : " + cells.join(", ")
        // Les memes mesures que sur les references, sur la premiere fievre (mesures 32 a 48)
        const from = Math.floor(32 * barSec * rate), to = Math.min(n, Math.floor(48 * barSec * rate))
        if (to > from) {
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            let lp = 0, lp2 = 0, hl = 0, sLow = 0, sHigh = 0, sTot = 0, pk = 0
            const centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
            const bandes = centres.map(c => filtre(2, c, 1.414))
            const sBandes = centres.map(() => 0)
            for (let j = from; j < to; j++) {
                const x = (L[j] + R[j]) / 2
                if (Math.abs(x) > pk) {pk = Math.abs(x)}
                lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                hl += (x - hl) * kHigh
                const hh = x - hl
                sLow += lp2 * lp2; sHigh += hh * hh; sTot += x * x
                for (let b = 0; b < bandes.length; b++) {const y = bandes[b](x); sBandes[b] += y * y}
            }
            if (sTot > 0) {
                const rms = Math.sqrt(sTot / (to - from))
                line += " || fievre1 : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
                    " creteSurMoyen " + (20 * Math.log10(pk / rms)).toFixed(1) +
                    " bandes " + sBandes.map(v => (10 * Math.log10(v / sTot + 1e-12)).toFixed(0)).join(" ")
            }
        }
        report.push(line)
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
