// 4 H 04 - Beat Survivor
// Electronica sur bande usee - 98 BPM - Si mineur, 35 cents sous le diapason - 112 mesures (4 min 34)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de 4h04.src.ts
// (le morceau), voix-404.json (la voix) et des instruments du dossier apparat/.
//
// Quatre heures quatre du matin, devant un ecran. 404, c est aussi le code
// d une page qui n existe plus. Une voix de micro-ordinateur lit des nombres,
// comme ces stations de radio qui ne s adressent a personne : "four, zero,
// four", puis quatre octets (42 45 41 54 : en clair, BEAT), et pour finir
// "not found".
//
// Demande de N4 : un morceau dans l esprit de Boards of Canada ("1969",
// "Happy Cycling"), macabre, lugubre, une nuit a pirater. Les deux morceaux
// ont ete mesures avant d ecrire. Ce qui en sort :
// - le tempo : 98 a 100 BPM ;
// - l accordage : "1969" est 40 cents sous le diapason, "Happy Cycling"
//   flotte entre 10 et 40 cents au-dessus. Ici tout est accorde 35 cents trop
//   bas, et chaque instrument derive lentement autour, chacun de son cote ;
// - le niveau : rien n est ecrase (13 a 16 dB entre les cretes et le niveau
//   moyen, contre 11 dans nos morceaux techno) ; le poids est dans le bas
//   medium, tres peu d aigu.
// Rien n est repris de ces morceaux : ni notes, ni sons.
//
// L harmonie : une quinte (Si et Fa diese) qui ne bouge jamais, et sous elle
// une basse qui descend de tierce en tierce : Si, Sol, Mi, Do. Le dernier
// accord, Do, est a un demi-ton au-dessus du ton : il ne se resout que si la
// boucle recommence. Le morceau finit dessus, la bande ralentit ; relance en
// boucle (un menu), il retombe sur le Si.
//
// Deux instruments neufs, ecrits pour ce morceau (Apparat = instrument
// scriptable d openDAW) :
// - Magneto : un synthe a huit voix enregistre sur une vieille bande. Il fait
//   la nappe, la basse, la melodie, l arpege, les bips du terminal ;
// - Poussiere : une batterie qui passe par un echantillonneur des annees 80.
// Aucun souffle, aucun bruit de fond : l usure vient de la hauteur qui
// derive, de la saturation, des aigus perdus et des chutes de niveau.

const BPM = 98
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 112
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM
/** Tout le morceau est accorde 35 cents sous le diapason. */
const FAUX = -35

const MAGNETO: string = __MAGNETO_L__
const POUSSIERE: string = __POUSSIERE_L__
const VOIX_TXT: string = __VOIX404__
const VOIX: any = JSON.parse(VOIX_TXT)

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
let graine = 40404
const rnd = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0
    return graine / 2147483648 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (Si, 35 cents
// trop bas : 121 Hz). Ici on les decode et on les reechantillonne.
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
    radio(f)
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}

/** La voix sort d un petit haut-parleur : on garde surtout le medium. */
function radio(x: Float32Array) {
    const m = bande(x, 1300, 0.8)
    for (let i = 0; i < x.length; i++) {x[i] = x[i] * 0.3 + m[i]}
}

// "Four. Zero. Four." : un mot tous les deux temps, sur le Si
const vOuvre = await phrase("404 four zero four", [["four", 0, 0, 0], ["zero", 2, 0, 0], ["four", 4, 0, 0]], 1, 0.3)
// "Zero", une quarte plus bas : le dernier mot avant la panne
const vZero = await phrase("404 zero", [["zero", 0, -5, 0]], 1, 0.4)
// Quatre octets, lus chiffre par chiffre : 42 45 41 54
const OCTETS: string[][] = [["four", "two"], ["four", "five"], ["four", "one"], ["five", "four"]]
const vOctets: any[] = []
for (let k = 0; k < OCTETS.length; k++) {
    vOctets.push(await phrase("404 octet " + (k + 1), [[OCTETS[k][0], 0, 0, 0], [OCTETS[k][1], 1.5, 0, 0]], 1, 0.3))
}
// "Not found", une quinte plus bas, donc plus lent
const vPerdu = await phrase("404 not found", [["not", 0, -7, 0], ["found", 1.5, -7, 0]], 1, 0.5)

// ---------- Projet ----------
const project = openDAW.newProject("4 h 04")
project.bpm = BPM

// Une seule salle pour tout le monde
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.8, damping: 0.6, preDelay: 25, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Veille", start: 0, bars: 8},
    {name: "Signal", start: 8, bars: 8},
    {name: "Boucle 1", start: 16, bars: 16},
    {name: "Boucle 2", start: 32, bars: 16},
    {name: "Panne", start: 48, bars: 16},
    {name: "Boucle 3", start: 64, bars: 16},
    {name: "Boucle 4", start: 80, bars: 16},
    {name: "Extinction", start: 96, bars: 16}
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
    let s = (a * 374761393 + b * 668265263 + 404) >>> 0
    s = ((s ^ (s >>> 13)) * 1274126177) >>> 0
    s = (s ^ (s >>> 16)) >>> 0
    return s / 4294967296
}

// ---------- La carte du morceau ----------
/** Les boucles : la batterie entiere et la basse. */
const boucle = (bar: number) => (bar >= 16 && bar < 48) || (bar >= 64 && bar < 96)
/** La panne : tout s arrete sauf la nappe, la voix et le terminal. */
const panne = (bar: number) => bar >= 48 && bar < 64
/** La mesure avant la panne s arrete un temps plus tot : la voix dit "zero" dans le vide. */
const limite = (bar: number) => bar === 47 ? 12 : 16
/**
 * L accord de la mesure : 0 = Si mineur, 1 = Sol, 2 = Mi mineur, 3 = Do. Deux mesures chacun.
 * Pendant la panne la basse ne descend plus : Si mineur, puis Do pose sur le Si, quatre mesures chacun.
 */
const accord = (bar: number): number =>
    panne(bar) ? (Math.floor((bar - 48) / 4) % 2 === 0 ? 0 : 3) : Math.floor((bar % 8) / 2)
/** Les doubles-croches impaires arrivent un peu tard : la batterie et la basse trainent. */
const SWING = 30
const pos = (step: number) => Math.round(step * S16 + (step % 2 === 1 ? SWING : 0))

/** Les reglages de bande communs. Chaque instrument a sa phase : chacun derive de son cote. */
const bande404 = (phase: number, wow: number) => ({tune: FAUX, wow, flutter: 3, phase})

// ---------- La nappe ----------
// Quatre notes par accord. Le Fa diese ne bouge jamais ; d un accord au suivant
// une seule note change, parfois aucune (Sol et Mi mineur ont les memes notes :
// seule la basse descend).
const NAPPE = [[50, 54, 57, 61], [50, 54, 55, 59], [50, 54, 55, 59], [52, 54, 55, 59]]
const NAPPE_PANNE = [[47, 54, 57, 61], [47, 54, 55, 59], [47, 54, 55, 59], [47, 52, 55, 60]]
const V_NAPPE = 0.5
const pad = apparat("Nappe", MAGNETO, -8)
reglages("nappe", pad, {
    ...bande404(0, 18), shape: 0.35, pwm: 0.5, detune: 12, sub: 0, cutoff: 420, envmod: 1.4, track: 0.3, reso: 0.15,
    attack: 1100, decay: 3500, sustain: 0.75, release: 2200, vibrato: 0, drift: 8, glide: 1,
    drive: 0.35, age: 0.45, dropout: 0.25, width: 0.8, volume: V_NAPPE
})
pad.addSend(reverb, {amount: -12})
build(pad.noteTracks[0], "Nappe", bar => {
    const out: Note[] = []
    if (panne(bar)) {
        if ((bar - 48) % 4 !== 0) {return out}
        for (const pitch of NAPPE_PANNE[accord(bar)]) {out.push({position: 0, duration: 4 * BAR - 240, pitch, velocity: 0.7})}
        return out
    }
    if (bar % 2 !== 0) {return out}
    const notes = NAPPE[accord(bar)].slice()
    // Au sommet du morceau, une cinquieme voix une octave au-dessus du Fa diese
    if (bar >= 80 && bar < 96) {notes.push(66)}
    for (const pitch of notes) {out.push({position: 0, duration: 2 * BAR - 160, pitch, velocity: 0.7})}
    return out
})
// Le filtre s ouvre de boucle en boucle et se referme dans la panne
auto("nappe", pad, "cutoff", enLog([
    [0, 200], [8, 330], [16, 420], [32, 520], [47.9, 560], [48, 260], [56, 300], [64, 520], [80, 680],
    [96, 480], [104, 330], [112, 180]
], 40, 12000))
// La bande lache davantage quand la nappe est seule
auto("nappe", pad, "dropout", [
    [0, 0.6], [8, 0.4], [16, 0.12], [47.9, 0.12], [48, 0.75], [62, 0.6], [64, 0.12], [96, 0.12], [104, 0.6], [112, 0.8]
])
// La bande demarre (elle monte jusqu a sa vitesse), cale au debut de la panne, et ralentit a la fin
auto("nappe", pad, "tune", enDroit([
    [0, -260], [0.55, FAUX], [47.7, FAUX], [48, -150], [48.8, FAUX], [110.2, FAUX], [112, -400]
], -400, 100))
auto("nappe", pad, "volume", [[0, V_NAPPE], [110.5, V_NAPPE], [112, 0]])

// ---------- La basse ----------
// Une sinusoide sous une dent de scie tres fermee. Elle descend de tierce en
// tierce : Si, Sol, Mi, Do. Les notes sont ecrites une octave au-dessus de ce
// qu on entend (l instrument ajoute l octave du dessous).
const FOND = [47, 43, 52, 48]
/** La note qui mene a l accord suivant. */
const APPROCHE = [45, 50, 50, 45]
const bass = apparat("Basse", MAGNETO, -3.5)
reglages("basse", bass, {
    ...bande404(0.3, 8), shape: 0.2, pwm: 0.2, detune: 5, sub: 0.8, cutoff: 140, envmod: 1.6, track: 0.2, reso: 0.1,
    attack: 8, decay: 700, sustain: 0.55, release: 140, vibrato: 0, drift: 3, glide: 1,
    drive: 0.5, age: 0.7, dropout: 0, width: 0.15, volume: 0.5
})
build(bass.noteTracks[0], "Basse", bar => {
    const out: Note[] = []
    const n = (step: number, len: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: pos(step), duration: Math.round(Math.min(len, limite(bar) - step) * S16 - 40), pitch, velocity})}
    }
    const a = accord(bar), f = FOND[a]
    if (boucle(bar)) {
        if (bar % 2 === 0) {
            n(0, 6, f, 0.9); n(10, 3, f, 0.7)
        } else {
            n(0, 9, f, 0.85); n(12, 2, f, 0.6); n(14, 2, APPROCHE[a], 0.7)
        }
        return out
    }
    // La fin de la panne : le Si revient, une note longue toutes les deux mesures
    if (bar >= 56 && bar < 64 && bar % 2 === 0) {n(0, 14, 47, 0.7)}
    // L extinction : une note par mesure
    if (bar >= 96 && bar < 104) {n(0, bar % 2 === 0 ? 14 : 10, f, 0.75)}
    return out
})

// ---------- La melodie ----------
// Cinq notes (Si, Re, Mi, Fa diese, La), des valeurs longues, une voix qui
// glisse d une note a l autre et qui tremble en retard. Et une note en trop :
// le Do, a la fin de chaque phrase.
// Chaque mesure : [pas, longueur en pas, note].
type Ligne = number[][][]
const MEL_A: Ligne = [
    [[0, 6, 66], [6, 2, 64], [8, 6, 62], [14, 2, 59]],
    [[0, 10, 62], [12, 4, 64]],
    [[0, 6, 66], [6, 2, 69], [8, 6, 66], [14, 2, 64]],
    [[0, 12, 62]],
    [[0, 6, 59], [6, 2, 62], [8, 6, 64], [14, 2, 66]],
    [[0, 10, 64], [12, 4, 62]],
    [[0, 6, 64], [6, 2, 67], [8, 8, 66]],
    [[0, 12, 60]]
]
const MEL_B: Ligne = [
    [[0, 4, 71], [4, 4, 69], [8, 6, 66], [14, 2, 69]],
    [[0, 12, 66]],
    [[0, 4, 71], [4, 4, 74], [8, 6, 71], [14, 2, 69]],
    [[0, 10, 66], [12, 4, 64]],
    [[0, 6, 67], [6, 2, 66], [8, 6, 64], [14, 2, 59]],
    [[0, 12, 64]],
    [[0, 6, 64], [6, 2, 66], [8, 4, 67], [12, 4, 71]],
    [[0, 8, 72], [8, 6, 71]]
]
function melodie(bar: number): number[][] {
    const k = bar % 8
    if (bar >= 8 && bar < 16) {return MEL_A[k]}
    if (bar >= 24 && bar < 40) {return MEL_A[k]}
    if (bar >= 40 && bar < 48) {return MEL_B[k]}
    if (bar >= 64 && bar < 72) {return MEL_B[k]}
    if (bar >= 72 && bar < 80) {return MEL_A[k]}
    if (bar >= 80 && bar < 88) {return MEL_B[k]}
    // Au sommet, la premiere phrase une octave plus haut
    if (bar >= 88 && bar < 96) {return MEL_A[k].map(n => [n[0], n[1], n[2] + 12])}
    // L extinction : il n en reste que des bouts
    if (bar >= 96 && bar < 104) {return k < 2 || k === 4 || k === 5 ? MEL_A[k] : []}
    return []
}
const lead = apparat("Melodie", MAGNETO, -7, -0.1)
reglages("melodie", lead, {
    ...bande404(0.55, 22), flutter: 4, shape: 0.12, pwm: 0.2, detune: 6, sub: 0, cutoff: 750, envmod: 1.2, track: 0.5,
    reso: 0.3, attack: 35, decay: 900, sustain: 0.6, release: 500, vibrato: 16, drift: 6, glide: 70,
    drive: 0.25, age: 0.4, dropout: 0.1, width: 0.35, volume: 0.5
})
lead.addAudioEffect("Delay", {delay: 13, feedback: 0.42, cross: 1, filter: 0.3, wet: -11})
lead.addSend(reverb, {amount: -9})
build(lead.noteTracks[0], "Melodie", bar => {
    const notes = melodie(bar).filter(n => n[0] < limite(bar))
    return notes.map((n, k) => {
        // Deux notes qui se touchent sont liees : la voix glisse de l une a l autre
        const suivante = notes[k + 1]
        const liee = suivante !== undefined && suivante[0] === n[0] + n[1]
        return {
            position: n[0] * S16, duration: Math.round(Math.min(n[1], limite(bar) - n[0]) * S16 + (liee ? 30 : -40)),
            pitch: n[2], velocity: 0.8
        }
    })
})
auto("melodie", lead, "cutoff", enLog([
    [8, 520], [16, 650], [24, 700], [40, 850], [64, 850], [88, 1000], [96, 650], [104, 450]
], 40, 12000))

// ---------- L arpege ----------
// Des croches. Six notes par accord, dans une mesure qui en contient huit : le
// dessin ne retombe sur ses pieds que toutes les trois mesures.
const ARP = [[59, 62, 66, 73, 69, 66], [59, 62, 66, 71, 67, 62], [59, 64, 67, 71, 66, 64], [60, 64, 67, 71, 66, 64]]
const arp = apparat("Arpege", MAGNETO, -2, 0.15)
reglages("arpege", arp, {
    ...bande404(0.8, 14), shape: 0.55, pwm: 0.3, detune: 7, sub: 0, cutoff: 420, envmod: 2.8, track: 0.4, reso: 0.3,
    attack: 2, decay: 190, sustain: 0, release: 160, vibrato: 0, drift: 5, glide: 1,
    drive: 0.2, age: 0.25, dropout: 0, width: 0.6, volume: 0.5
})
arp.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.25, wet: -8})
arp.addSend(reverb, {amount: -13})
build(arp.noteTracks[0], "Arpege", bar => {
    const out: Note[] = []
    const on = (bar >= 16 && bar < 48) || (bar >= 56 && bar < 104)
    if (!on) {return out}
    const notes = ARP[accord(bar)]
    // Il entre et il sort doucement
    const force = bar < 24 || bar >= 96 || bar < 60 && bar >= 56 ? 0.75 : 1
    for (let i = 0; i < 8; i++) {
        if (i * 2 >= limite(bar)) {continue}
        const k = (bar * 8 + i) % 6
        const velocity = ((k === 0 ? 0.8 : 0.55) + (tirage(bar, i) - 0.5) * 0.12) * force
        out.push({position: i * 2 * S16, duration: S16, pitch: notes[k], velocity})
    }
    return out
})
auto("arpege", arp, "cutoff", enLog([
    [16, 300], [24, 480], [32, 560], [48, 620], [56, 190], [64, 560], [80, 680], [96, 620], [104, 250]
], 40, 12000))

// ---------- Le terminal ----------
// Des bips carres, tres courts, tres hauts, par rafales : une machine qui
// travaille dans la piece d a cote. Droits, sans swing : c est une machine.
// Les notes et les trous sont tires au sort, toujours de la meme facon.
const BIPS = [83, 86, 88, 90, 93, 95]
const term = apparat("Terminal", MAGNETO, -6, 0.35)
reglages("terminal", term, {
    ...bande404(0.2, 5), flutter: 1, shape: 1, pwm: 0, detune: 0, sub: 0, cutoff: 2600, envmod: 0.6, track: 0.3, reso: 0.2,
    attack: 1, decay: 40, sustain: 0, release: 25, vibrato: 0, drift: 2, glide: 1,
    drive: 0.2, age: 0.15, dropout: 0, width: 0, volume: 0.5
})
term.addAudioEffect("Delay", {delay: 11, feedback: 0.35, cross: 1, filter: 0.3, wet: -10})
term.addSend(reverb, {amount: -15})
build(term.noteTracks[0], "Terminal", bar => {
    const out: Note[] = []
    let from = -1, to = -1
    if (panne(bar)) {
        from = Math.floor(tirage(bar, 1) * 3) * 4
        to = from + 4 + Math.floor(tirage(bar, 2) * 8)
    } else if (bar === 6 || bar === 7) {
        from = 10; to = 16
    } else if ((boucle(bar) && bar >= 32) || (bar >= 96 && bar < 110)) {
        if (bar % 8 === 7) {from = 8; to = 16} else if (bar % 8 === 3) {from = 12; to = 16}
    }
    for (let step = from; step >= 0 && step < Math.min(to, limite(bar)); step++) {
        if (tirage(bar, 10 + step) < 0.22) {continue}
        out.push({
            position: step * S16, duration: 60, pitch: BIPS[Math.floor(tirage(bar, 40 + step) * 6)],
            velocity: 0.45 + 0.4 * tirage(bar, 70 + step)
        })
        // De temps en temps deux bips dans le meme pas
        if (tirage(bar, 90 + step) < 0.25) {
            out.push({position: step * S16 + 120, duration: 50, pitch: BIPS[Math.floor(tirage(bar, 120 + step) * 6)], velocity: 0.4})
        }
    }
    return out
})

// ---------- L aspiration ----------
// La meme quinte, Si et Fa diese, qui enfle pendant une mesure et s arrete net
// sur le premier temps de la suivante. Elle annonce chaque changement.
const swell = apparat("Aspiration", MAGNETO, -10)
reglages("aspiration", swell, {
    ...bande404(0.7, 20), shape: 0.3, pwm: 0.6, detune: 14, sub: 0, cutoff: 260, envmod: 3.2, track: 0.3, reso: 0.25,
    attack: 2400, decay: 400, sustain: 1, release: 45, vibrato: 0, drift: 10, glide: 1,
    drive: 0.3, age: 0.4, dropout: 0, width: 0.9, volume: 0.5
})
swell.addSend(reverb, {amount: -4})
build(swell.noteTracks[0], "Aspiration", bar => {
    if (![15, 31, 47, 63, 79, 95].includes(bar)) {return []}
    return [71, 78].map(pitch => ({position: 0, duration: limite(bar) * S16 - 20, pitch, velocity: 0.7}))
})

// ---------- La batterie ----------
// Une boucle lente qui traine : le pied, la caisse claire sur les temps 2 et
// 4, des croches de charley. Une mesure sur deux, le pied se deplace.
const KICK = 36, RIM = 37, SNARE = 38, HAT = 42, OPEN = 46
/** 0 = rien ; 1 = un coeur qui bat ; 2 = la boucle ; 3 = la boucle et ses notes fantomes ; 4 = et le charley ouvert ; 5 = ce qu il en reste. */
function batterie(bar: number): number {
    if (bar >= 8 && bar < 16) {return 1}
    if (bar >= 16 && bar < 32) {return 2}
    if (bar >= 32 && bar < 48) {return 3}
    if (bar >= 56 && bar < 64) {return 1}
    if (bar >= 64 && bar < 80) {return 3}
    if (bar >= 80 && bar < 96) {return 4}
    if (bar >= 96 && bar < 104) {return 5}
    if (bar >= 104 && bar < 110) {return 1}
    return 0
}
const drums = apparat("Poussiere", POUSSIERE, -4)
reglages("poussiere", drums, {
    tune: 54, punch: 0.6, kdecay: 220, stone: 185, snap: 0.6, sdecay: 160, htone: 8500, hdecay: 36, odecay: 240,
    rate: 24000, bits: 10, drive: 0.55, tone: 11000, volume: 0.6
})
drums.addSend(reverb, {amount: -24})
build(drums.noteTracks[0], "Poussiere", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step >= limite(bar)) {return}
        const v = velocity + (tirage(bar, step * 7 + pitch) - 0.5) * 0.08
        out.push({position: pos(step), duration: S16 / 2, pitch, velocity: Math.max(0.05, Math.min(1, v))})
    }
    if (b === 0) {return out}
    if (b === 1) {
        // Deux coups rapproches, puis rien : un coeur
        hit(0, KICK, 0.75); hit(3, KICK, 0.45)
        if (bar % 2 === 1) {hit(12, RIM, 0.45)}
        return out
    }
    if (b === 5) {
        hit(0, KICK, 0.85); hit(10, KICK, 0.7); hit(4, RIM, 0.6); hit(12, RIM, 0.6)
        for (let s = 0; s < 16; s += 2) {hit(s, HAT, s % 4 === 0 ? 0.5 : 0.35)}
        return out
    }
    const pair = bar % 2 === 0
    hit(0, KICK, 1)
    if (pair) {
        hit(7, KICK, 0.7); hit(10, KICK, 0.9)
    } else {
        hit(6, KICK, 0.6); hit(10, KICK, 0.9)
        if (b >= 3) {hit(13, KICK, 0.5)}
    }
    hit(4, SNARE, 0.95); hit(12, SNARE, 1)
    // Les notes fantomes : une caisse claire a peine touchee
    if (b >= 3) {
        if (pair) {hit(15, SNARE, 0.3)} else {hit(9, SNARE, 0.28)}
    }
    for (let s = 0; s < 16; s += 2) {
        const ouvert = (b >= 3 && bar % 4 === 3 && s === 14) || (b === 4 && !pair && s === 6)
        hit(s, ouvert ? OPEN : HAT, s % 4 === 0 ? 0.75 : 0.5)
    }
    if (b >= 3) {hit(3, HAT, 0.3); hit(11, HAT, 0.3)}
    // Fin de phrase : la caisse claire relance
    if (bar % 8 === 7) {hit(14, SNARE, 0.55); hit(15, SNARE, 0.75)}
    return out
})

// ---------- La voix ----------
// Une seule piste, dans un echo et dans la salle. Deux regions ne doivent
// jamais se chevaucher.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -6})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.3, wet: -8})
voix.addSend(reverb, {amount: -7})
const dire = (quoi: string, sample: any, bar: number, step: number) =>
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
// "Four, zero, four", seule avec la nappe
dire("ouverture", vOuvre, 2, 0)
// "Zero" : la batterie vient de s arreter, la panne commence
dire("zero", vZero, 47, 12)
// La panne : quatre octets, un toutes les deux mesures
vOctets.forEach((sample, k) => dire("octet " + (k + 1), sample, 50 + 2 * k, 0))
// L extinction : les nombres reviennent, puis le verdict
dire("rappel", vOuvre, 100, 0)
dire("not found", vPerdu, 106, 0)

// Limiteur de sortie, leger : les deux references ne sont presque pas limitees
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -1.5} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur la deuxieme boucle (mesures 32 a 48), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [pad, bass, lead, arp, term, swell, drums, voix]
const STEMS: [string, any][] = [["Nappe", pad], ["Basse", bass], ["Melodie", lead], ["Arpege", arp],
    ["Terminal", term], ["Aspiration", swell], ["Poussiere", drums]]
if (MESURER) {
    const parts = [["veille", 0, 8], ["signal", 8, 16], ["boucle1", 16, 32], ["boucle2", 32, 48], ["panne", 48, 64],
        ["boucle3", 64, 80], ["boucle4", 80, 96], ["extinction", 96, 112]]
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
        // Les memes mesures que sur les references, sur la deuxieme boucle (mesures 32 a 48)
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
                line += " || boucle2 : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
