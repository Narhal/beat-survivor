// STAY ALIVE - Beat Survivor, mode Survie
// Acid a voix robot - 130 BPM - Sol diese phrygien - 144 mesures (4 min 26)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// stay-alive.src.ts (le morceau), de voix-stay.json (la voix robot, rendue
// par voix.mjs) et des instruments du dossier apparat/.
//
// La surprise : le robot connait le jeu. Il annonce son nom ("Beat.
// Survivor."), donne la consigne ("Stay alive"), compte avant le premier drop
// ("three, two, one"), et quand le morceau s'acheve, donc quand le joueur a
// tenu jusqu'au bout, il le lui dit : "You survived."
// Deux autres tours : dans les creux il chante (ses mots passent dans un
// vocodeur, sur les notes du morceau) ; et avant le second drop il repete
// "beat" de plus en plus vite, jusqu'a ce que les repetitions soient si
// serrees qu'on n'entend plus un mot mais une note qui monte.
//
// La voix : SAM (Software Automatic Mouth, 1982), le synthetiseur vocal des
// micro-ordinateurs 8 bits, sur une seule note comme le robot de Kraftwerk.
// Tout son traitement est calcule ici, avant meme de creer le projet.
//
// Le reste applique les notes Dash Glitch et Underdog du vault : basse en
// deux chemins aux durees comptees en pas (Roulante), voix acid a accent dont
// la velocite porte la couleur (Venin), percussions seches sans bruit blanc
// (Gresil), boucles de longueurs inegales sous un squelette carre, blocs de
// 16 mesures, un bloc qui demarre sans sa basse. Aucun souffle.
// Pour le jeu : avant chaque drop, le dernier temps est vide.
//
// Instruments : Frappe, Roulante, Venin, Gresil sont ecrits pour ces morceaux
// (Apparat = instrument scriptable d'openDAW). Clap, ride : TR-909.

const BPM = 130
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM
/** La duree d'une double-croche, en ms : la basse compte en pas. */
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const ROULANTE: string = __ROULANTE_L__
const VENIN: string = __VENIN_L__
const GRESIL: string = __GRESIL_L__
const VOIX_TXT: string = __VOIXSTAY__
const VOIX: any = JSON.parse(VOIX_TXT)

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
let graine = 20261113
const rnd = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0
    return graine / 2147483648 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (Sol diese,
// 104 Hz). Ici on les decode et on les reechantillonne.
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

// "Beat. Survivor." : le nom du jeu, nu, puis en accord
const vTitre = await phrase("SA Beat Survivor", [["beat", 0, 0, 0], ["survivor", 1, 0, 0]], 1, 0.15)
const vTitreAccord = await phrase("SA Beat Survivor en accord", [["beat", 0, 0, 0], ["survivor", 1, 0, 0]], 0.25, 1)
// "Stay alive." : la consigne
const vStay = await phrase("SA Stay alive", [["stay", 0, 0, 0], ["alive", 1, 0, 0]], 1, 0.15)
const vStayAccord = await phrase("SA Stay alive en accord", [["stay", 0, 0, 0], ["alive", 1, 0, 0]], 0.25, 1)
// Le robot chante : "stay" sur la tonique, "alive" une tierce au-dessus ; puis plus haut
const vChante = await phrase("SA Stay alive chante", [["stay", 0, 0, 0], ["alive", 2, 3, 0]], 0.15, 1)
const vChanteHaut = await phrase("SA Stay alive chante haut", [["stay", 0, 5, 0], ["alive", 2, 7, 0]], 0.15, 1)
// "Three, two, one" : un mot par temps, le quatrieme temps reste vide
const vCompte = await phrase("SA Three two one", [["three", 0, 0, 0], ["two", 1, 0, 0], ["one", 2, 0, 0]], 0.9, 0.5)
// "B-b-b-beat survivor" : trois amorces en doubles-croches, le mot tombe sur le temps
const vBegaie = await phrase("SA B-b-b-beat survivor", [
    ["beat", 0, 0, 0.22], ["beat", 0.25, 0, 0.22], ["beat", 0.5, 0, 0.22], ["beat", 0.75, 0, 0.22],
    ["beat", 1, 0, 0], ["survivor", 2, 0, 0]
], 1, 0.3)
// "Alive, alive, alive" : trois fois, en croches pointees
const vAlive = await phrase("SA Alive alive alive", [["alive", 0, 0, 0.7], ["alive", 0.75, 0, 0.7], ["alive", 1.5, 0, 0]], 0.9, 0.4)
// "Beat" de plus en plus vite : l'ecart entre deux repetitions passe de 230 ms a
// 3 ms en onze temps. A la fin, on n'entend plus un mot mais une note.
const grains: Dit[] = []
{
    const count = 110
    const ratio = Math.pow(0.004 / 0.23, 1 / (count - 1))
    let gap = 0.23, sum = 0
    for (let k = 0; k < count; k++) {sum += gap; gap *= ratio}
    const scale = 11 * beatSec / sum
    let at = 0
    gap = 0.23
    for (let k = 0; k < count; k++) {
        grains.push(["beat", at * scale / beatSec, 0, gap * scale / beatSec * 0.96])
        at += gap
        gap *= ratio
    }
}
const vGrain = await phrase("SA Beat qui devient une note", grains, 1, 0)
// "You survived." : le dernier mot du morceau
const vFin = await phrase("SA You survived", [["you", 0, 0, 0], ["survived", 1, 0, 0]], 1, 0.4)

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Stay Alive")
project.bpm = BPM

const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Roule", start: 16, bars: 16},
    {name: "Acide", start: 32, bars: 16},
    {name: "Creux", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 16},
    {name: "Plus", start: 72, bars: 16},
    {name: "Suspens", start: 88, bars: 8},
    {name: "Final", start: 96, bars: 16},
    {name: "Sommet", start: 112, bars: 16},
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

/** Une pente sur laquelle on pose une vague lente : la main qui ne lache jamais le bouton. */
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
    const out: number[][] = []
    let next = 0
    for (let bar = 0; bar <= TOTAL; bar += 2) {
        while (next < trend.length && trend[next][0] <= bar) {
            out.push([trend[next][0], trend[next][1] + wave(trend[next][0])])
            next++
        }
        if (!trend.some(p => p[0] === bar)) {out.push([bar, at(bar) + wave(bar)])}
    }
    return out
}

// ---------- La carte du morceau ----------
/** Les creux : le pied et la basse se taisent, la voix chante. */
const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 96)
/** Le bloc qui demarre sans sa basse. */
const nu = (bar: number) => bar >= 72 && bar < 76
const kickOn = (bar: number) => bar >= 8 && bar < 140 && !inBreak(bar)
const bassOn = (bar: number) => bar >= 16 && bar < 136 && !inBreak(bar) && !nu(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 96 && bar < 128)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 95
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. */
const finDeBloc = (bar: number) => [31, 47, 71, 87, 111, 127].includes(bar)
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Avant le premier drop, le pied retient un peu ses coups
    const v = bar < 16 || bar >= 136 ? 0.8 : drop(bar) ? 1 : 0.86
    const out = [[0, v], [4, v], [8, v], [12, v]]
    return finDeBloc(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Sol diese 1 = 52 Hz : le pied et la basse.
const SOL1 = 32, SOL2 = 44

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -6.5)
reglages("frappe", kick, {tune: 51.9, start: 380, sweep: 48, decay: 135, punch: 0.6, click: 0.55, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
auto("frappe", kick, "click", [[0, 0.1], [8, 0.1], [16, 0.55], [128, 0.55], [140, 0.2], [144, 0.2]])

// ---------- Roulante : la basse ----------
// Trois notes entre deux coups de pied. La premiere, celle qui suit le pied,
// se joue sans sa fondamentale (velocite 0,35).
const bass = apparat("Roulante", ROULANTE, -3)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.8, cutoff: 100, envmod: 3.4, fdecay: 0.45, pinch: 0.55,
    sub: 0.75, sublen: 0.6, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    const out: Note[] = []
    const note = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16 / 2, pitch, velocity})}
    }
    for (let beat = 0; beat < 4; beat++) {
        const s = beat * 4
        if (bar >= 32) {note(s + 1, SOL1, 0.35)}
        note(s + 2, SOL1, 0.8)
        // Dans le final, la fin de phrase monte au La : le demi-ton de menace
        const menace = bar >= 96 && beat === 3 && rang(bar) === 3
        note(s + 3, menace ? SOL1 + 1 : SOL1, 0.8)
    }
    return finDeBloc(bar) ? out.filter(e => e.position < 12 * S16) : out
})
auto("roulante", bass, "envmod", vague(enDroit([
    [0, 2.6], [32, 3.0], [56, 3.6], [96, 3.8], [112, 4.2], [128, 3.4], [144, 2.4]
], 0, 6), 12, 0.04))

// ---------- Venin : la voix acid ----------
// Le rythme tient sur 16 pas ; les hauteurs tournent sur 7 notes et les
// couleurs sur 5. La velocite ne regle pas le volume : de 0,5 a 0,85 elle
// ferme ou ouvre le filtre de la note, et a partir de 0,9 la note est accentuee.
type Motif = {steps: number[], accents: number[], slides: number[]}
const V0: Motif = {steps: [0, 3, 8, 11, 14], accents: [3, 11], slides: []}
const V1: Motif = {steps: [0, 2, 3, 6, 7, 8, 10, 11, 14], accents: [3, 7, 14], slides: [2, 6, 10]}
const V2: Motif = {steps: [0, 2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 15], accents: [3, 7, 11, 15], slides: [2, 6, 10, 14]}
// Demi-tons au-dessus du Sol diese 2 : 12 = l'octave, 1 = le La, 10 = le Fa diese
const HAUTEURS_SAGES = [0, 0, 12, 0, 0, 0, 12]
const HAUTEURS = [0, 0, 12, 0, 1, 0, 10]
const HAUTEURS_SOMMET = [0, 12, 12, 0, 1, 12, 10]
const COULEURS = [0.25, 0.6, 0.95, 0.4, 0.75]
const couleur = (accent: boolean, c: number) => accent ? 0.9 + 0.1 * c : 0.5 + 0.35 * c

const acid = apparat("Venin", VENIN, -1)
reglages("venin", acid, {
    cutoff: 260, reso: 0.78, envmod: 2.2, decay: 300, accent: 0.7, tint: 1.0, glide: 80,
    shape: 0.25, drive: 0.45, lowcut: 190, tonic: SOL2, just: 0, duck: 0.35
})
essai("saturation venin", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.32, cross: 1, filter: 0.45, wet: -21})

function motifAcid(bar: number): Motif | null {
    if (bar < 40) {return V0}
    if (bar >= 40 && bar < 48) {return V1}
    if (bar >= 52 && bar < 72) {return V1}
    if (bar >= 76 && bar < 88) {return V1}
    if (bar >= 96 && bar < 112) {return V1}
    if (bar >= 112 && bar < 128) {return V2}
    if (bar >= 128 && bar < 136) {return V0}
    return null
}
build(acid.noteTracks[0], "Venin", bar => {
    const out: Note[] = plongeons(bar)
    const motif = motifAcid(bar)
    if (motif === null) {return out}
    const hauteurs = bar < 56 ? HAUTEURS_SAGES : bar >= 112 && bar < 128 ? HAUTEURS_SOMMET : HAUTEURS
    motif.steps.forEach((step, k) => {
        if (step >= limite(bar)) {return}
        const n = bar * motif.steps.length + k
        const slide = motif.slides.includes(step)
        out.push({
            position: step * S16,
            duration: Math.round(S16 * (slide ? 1.3 : 0.55)),
            pitch: SOL2 + hauteurs[n % 7],
            velocity: couleur(motif.accents.includes(step), COULEURS[n % 5])
        })
    })
    return out
})
auto("venin", acid, "cutoff", vague(enLog([
    [0, 150], [8, 170], [32, 220], [48, 300], [52, 160], [55.75, 480], [56, 380], [88, 520],
    [96, 480], [112, 600], [128, 760], [136, 200], [144, 150]
], 60, 4000), 12, 0.03))
auto("venin", acid, "envmod", vague(enDroit([
    [0, 1.6], [32, 1.8], [56, 2.4], [96, 2.8], [128, 3.2], [136, 1.6], [144, 1.4]
], 0, 5), 20, 0.03))
auto("venin", acid, "tint", enDroit([
    [0, 0.5], [32, 0.6], [56, 1.2], [96, 1.6], [112, 2.0], [128, 2.0], [136, 0.8], [144, 0.5]
], 0, 3))
auto("venin", acid, "reso", vague([
    [0, 0.74], [56, 0.78], [96, 0.80], [128, 0.84], [144, 0.74]
], 28, 0.015))

// ---------- Gresil : les tics ----------
const ticks = apparat("Tics", GRESIL, 6)
reglages("tics", ticks, {
    decay: 30, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.5, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
function vitesse(bar: number): number {
    if (!kickOn(bar) || bar < 16) {return 0}
    if (bar < 32) {return 1}                 // un tic a contretemps
    if (bar < 56) {return 2}                 // + le pas d'apres, en sourdine
    if (nu(bar)) {return 1}
    if (bar < 96) {return 3}                 // + le pas d'avant
    if (bar < 112) {return 4}                // toutes les doubles-croches
    if (bar < 128) {return 5}                // + la ride
    if (bar < 136) {return 2}
    return 1
}
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        const force = beat === 2 ? 0.85 : beat === 3 && v >= 2 ? 0.48 : beat === 1 && v >= 3 ? 0.36 : beat === 0 && v >= 4 ? 0.26 : 0
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force})}
    }
    return out
})

// ---------- Gresil : les tocs ----------
// Une syncope seche. Ils ne roulent pas avant les drops : c'est la voix qui s'en charge.
const TOCS = [63, 56, 68]
const tocs = apparat("Tocs", GRESIL, -11, 0.15)
reglages("tocs", tocs, {
    decay: 70, index: 2.5, snap: 4, body: 0.1, r2: 1.48, r3: 3.7, noise: 0.1, chirp: 7,
    lowcut: 150, drift: 0.5, width: 0.4, duck: 0.2
})
build(tocs.noteTracks[0], "Tocs", bar => {
    const out: Note[] = plongeons(bar)
    const on = bar >= 32 && bar < 136 && !inBreak(bar) && !nu(bar)
    if (!on) {return out}
    const hit = (step: number, k: number, velocity: number) => out.push({position: step * S16, duration: S16 / 2, pitch: TOCS[k], velocity})
    hit(7, 0, 0.8)
    if (rang(bar) === 1 || rang(bar) === 3) {hit(13, 1, 0.6)}
    if (rang(bar) === 2) {hit(10, 2, 0.5)}
    if (finDeBloc(bar)) {hit(12, 1, 0.6); hit(14, 2, 0.7); hit(15, 0, 0.9)}
    return out
})

// ---------- Clap, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const CLAP = 39, RIDE = 51
const kit: [string, number, any][] = [
    ["Clap", CLAP, {volume: -3}],
    ["Ride", RIDE, {volume: -13, panning: -0.15}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})}
    }
    if (!kickOn(bar)) {return out}
    if (drop(bar) && !nu(bar)) {hit(4, CLAP, 0.85); hit(12, CLAP, 0.9)}
    if (vitesse(bar) >= 5) {hit(0, RIDE, 0.45); hit(4, RIDE, 0.35); hit(8, RIDE, 0.45); hit(12, RIDE, 0.35)}
    if (finDeBloc(bar)) {hit(14, CLAP, 0.5); hit(15, CLAP, 0.7)}
    return out
})

// ---------- La voix ----------
// Deux pistes : la voix, presque seche ; et ses lancers, les memes mots
// envoyes de temps en temps dans un long echo.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -3})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.3, wet: -17})
const lancer: any = project.addInstrumentUnit("Tape", {label: "Voix lancee", volume: -10})
lancer.addAudioEffect("Delay", {delay: 13, feedback: 0.6, cross: 1, filter: 0.3, wet: -2})
const dire = (quoi: string, sample: any, bar: number, step: number, lance: boolean = false) => {
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
    if (lance) {essai("lancer " + quoi, () => lancer.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))}
}
// Le morceau s'ouvre sur le nom du jeu, seul avec la ligne acid ; la consigne tombe juste avant le pied
dire("titre intro", vTitre, 0, 0, true)
dire("consigne avant le pied", vStay, 7, 8, true)
dire("consigne intro", vStayAccord, 15, 8)
dire("consigne avant acide", vStay, 31, 8)
dire("begaie 39", vBegaie, 39, 12)
dire("alive avant creux", vAlive, 47, 8, true)
// Premier creux : le robot chante, annonce le jeu, puis compte
dire("chante 48", vChante, 48, 0)
dire("chante haut 50", vChanteHaut, 50, 0, true)
dire("chante 52", vChante, 52, 0)
dire("titre en accord 54", vTitreAccord, 54, 0)
dire("compte", vCompte, 55, 0)
// Premier drop : "Beat" sur le premier temps, "Survivor" sur le deuxieme
dire("titre drop 1", vTitre, 56, 0, true)
dire("begaie 63", vBegaie, 63, 12)
dire("consigne avant le bloc nu", vStay, 71, 8, true)
dire("begaie 79", vBegaie, 79, 12)
dire("alive avant suspens", vAlive, 87, 8, true)
// Second creux : il chante encore, puis "beat" accelere jusqu'a devenir une note
dire("chante 88", vChante, 88, 0, true)
dire("chante haut 90", vChanteHaut, 90, 0)
dire("beat qui devient une note", vGrain, 93, 0)
// Second drop
dire("titre drop 2", vTitre, 96, 0, true)
dire("titre en accord drop 2", vTitreAccord, 96, 0)
dire("begaie 103", vBegaie, 103, 12)
dire("consigne 111", vStay, 111, 8)
dire("consigne en accord 112", vStayAccord, 112, 8, true)
dire("begaie 119", vBegaie, 119, 12)
dire("alive 127", vAlive, 127, 8, true)
dire("consigne sortie", vStayAccord, 135, 8)
// Le morceau s'acheve : le joueur a tenu
dire("fin", vFin, 141, 0, true)

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le premier drop, on mesure aussi ce qu'on a mesure sur les references.
const MESURER = true
const ISOLER = true
const units: any[] = [kick, bass, acid, ticks, tocs, drums, voix, lancer]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Venin", acid], ["Tics", ticks],
    ["Tocs", tocs], ["909", drums], ["Voix", voix], ["Lancer", lancer]]
if (MESURER) {
    const parts = [["intro", 0, 16], ["roule", 16, 32], ["acide", 32, 48], ["creux", 48, 56], ["drop", 56, 72],
        ["nu", 72, 76], ["plus", 76, 88], ["suspens", 88, 96], ["final", 96, 112], ["sommet", 112, 128],
        ["sortie", 128, 144]]
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
        // Les memes mesures que sur les references, sur le premier drop (mesures 56 a 72)
        const from = Math.floor(56 * barSec * rate), to = Math.min(n, Math.floor(72 * barSec * rate))
        if (to > from) {
            const hop = 512
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            const kA = 1 - Math.exp(-2 * Math.PI * 300 / rate), kB = 1 - Math.exp(-2 * Math.PI * 3000 / rate)
            let lp = 0, lp2 = 0, hl = 0, ma = 0, mb = 0, sLow = 0, sHigh = 0, sTot = 0, pk = 0
            const eL: number[] = [], eM: number[] = [], eH: number[] = []
            const centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
            const bandes = centres.map(c => filtre(2, c, 1.414))
            const sBandes = centres.map(() => 0)
            for (let i = from; i < to; i += hop) {
                let l = 0, m = 0, h = 0
                for (let j = i; j < i + hop && j < to; j++) {
                    const x = (L[j] + R[j]) / 2
                    if (Math.abs(x) > pk) {pk = Math.abs(x)}
                    lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                    hl += (x - hl) * kHigh
                    ma += (x - ma) * kA; mb += (x - mb) * kB
                    const hh = x - hl, mm = mb - ma
                    l += lp2 * lp2; m += mm * mm; h += hh * hh; sTot += x * x
                    for (let b = 0; b < bandes.length; b++) {const y = bandes[b](x); sBandes[b] += y * y}
                }
                eL.push(Math.sqrt(l)); eM.push(Math.sqrt(m)); eH.push(Math.sqrt(h))
                sLow += l; sHigh += h
            }
            if (sTot > 0) {
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
                const rms = Math.sqrt(sTot / (to - from))
                line += " || drop : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
                    " creteSurMoyen " + (20 * Math.log10(pk / rms)).toFixed(1) +
                    " bandes " + sBandes.map(v => (10 * Math.log10(v / sTot + 1e-12)).toFixed(0)).join(" ")
                if (stem[1] === null) {line += " pas grave " + pas(eL) + " medium " + pas(eM) + " aigu " + pas(eH)}
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
