// DERIVE - Beat Survivor, mode Survie
// Acid hypnotique - 126 BPM - Fa diese phrygien - 160 mesures (5 min 05)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// derive.src.ts (le morceau) et des instruments du dossier apparat/.
//
// L'idee : deux voix acid jouent la meme boucle. La premiere la joue sur 16
// pas ; la seconde saute le dernier pas, qui est un silence, et la joue sur
// 15. Elles partent ensemble, puis la seconde prend un pas d'avance a chaque
// mesure : l'unisson devient un echo, l'echo un canon, le canon un tissu ou
// l'on ne sait plus qui joue quoi. Au bout de quinze mesures elles se
// retrouvent. A chaque drop elles repartent ensemble, comme une seule voix.
// C'est le dephasage des musiques repetitives, pose sur un pied de techno :
// rien ne change et tout bouge, de quoi laisser l'esprit se perdre.
//
// Pendant la derive, la boucle elle-meme glisse : toutes les huit mesures une
// de ses notes change, pour les deux voix. Avant le dernier drop, elle
// revient a sa forme de depart.
//
// Ce qui vient de la chaine Dash Glitch (vault, Concepts/Musique) : la voix
// acid a accent dont la velocite porte la couleur de chaque note (Venin), la
// basse en deux chemins aux durees comptees en pas (Roulante), un hasard a
// graine fixe, donc rejouable, et un instrument neuf : Gresil, des
// percussions seches faites de trois sinusoides en cascade, sans bruit blanc.
// D'Underdog : blocs de 16 mesures, arrangement par soustraction, un bloc qui
// demarre sans sa basse, un seul jeu de boucles inegales (16 contre 15).
//
// Aucun souffle, aucune nappe : les creux tiennent par les deux voix seules.
// Pour le jeu : avant chaque drop, le dernier temps est vide et rien n'enfle.
//
// Instruments : Frappe (grosse caisse), Roulante (basse), Venin (les deux voix
// acid), Gresil (tics et tocs) et Lueur (le gong) sont ecrits pour ces
// morceaux (Apparat = instrument scriptable d'openDAW). Rim, clap, ride : TR-909.

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 160
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : la basse compte en pas. */
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const ROULANTE: string = __ROULANTE_L__
const VENIN: string = __VENIN_L__
const GRESIL: string = __GRESIL_L__
const LUEUR: string = __LUEUR_L__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Derive")
project.bpm = BPM

// Une reverb, pour le gong seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.6, damping: 0.5, preDelay: 12, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seuil", start: 0, bars: 16},
    {name: "Pente", start: 16, bars: 16},
    {name: "Double", start: 32, bars: 16},
    {name: "Large", start: 48, bars: 16},
    {name: "Creux", start: 64, bars: 8},
    {name: "Derive", start: 72, bars: 16},
    {name: "Loin", start: 88, bars: 16},
    {name: "Retour", start: 104, bars: 8},
    {name: "Unisson", start: 112, bars: 16},
    {name: "Large 2", start: 128, bars: 16},
    {name: "Sortie", start: 144, bars: 16}
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
/** Une valeur reelle ramenee entre 0 et 1, pour un bouton a echelle droite ou logarithmique. */
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)
/** Des points [mesure, valeur reelle] convertis d'un coup. */
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

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
function hasard(graine: number) {
    let a = graine >>> 0
    return () => {
        a = (a + 0x6D2B79F5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ---------- La carte du morceau ----------
/** Les creux : le pied et la basse se taisent. */
const inBreak = (bar: number) => (bar >= 64 && bar < 72) || (bar >= 104 && bar < 112)
/** Le bloc qui demarre sans sa basse. */
const nu = (bar: number) => bar >= 88 && bar < 92
const kickOn = (bar: number) => bar >= 8 && bar < 152 && !inBreak(bar)
const bassOn = (bar: number) => bar >= 16 && bar < 144 && !inBreak(bar) && !nu(bar)
const drop = (bar: number) => (bar >= 72 && bar < 104) || (bar >= 112 && bar < 144)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 71 || bar === 111
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. */
const finDeBloc = (bar: number) => [31, 47, 63, 87, 103, 127, 143].includes(bar)
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Avant le premier drop, le pied retient un peu ses coups : le drop doit monter d'un cran
    const v = bar < 16 || bar >= 144 ? 0.8 : drop(bar) ? 1 : 0.86
    const out = [[0, v], [4, v], [8, v], [12, v]]
    return finDeBloc(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Fa diese 1 = 46 Hz : le pied et la basse.
const FA1 = 30, FA2 = 42

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -6.5)
reglages("frappe", kick, {tune: 46.3, start: 340, sweep: 48, decay: 150, punch: 0.6, click: 0.5, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
auto("frappe", kick, "click", [[0, 0.1], [8, 0.1], [16, 0.5], [144, 0.5], [152, 0.2], [160, 0.2]])

// ---------- Roulante : la basse ----------
// Une seule note par temps, a contretemps, plus longue qu'un pas : "BOUM-baa".
// Elle a fini avant le coup suivant : un seul acteur dans le grave a la fois.
const bass = apparat("Roulante", ROULANTE, -3.5)
reglages("roulante", bass, {
    pas: PAS_MS, long: 1.3, cutoff: 85, envmod: 3.2, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.75, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    const out: Note[] = []
    for (let beat = 0; beat < 4; beat++) {
        const step = beat * 4 + 2
        if (step >= limite(bar) || (finDeBloc(bar) && beat === 3)) {continue}
        out.push({position: step * S16, duration: S16, pitch: FA1, velocity: drop(bar) ? 0.8 : 0.7})
    }
    return out
})
auto("roulante", bass, "envmod", vague(enDroit([
    [0, 2.6], [48, 3.0], [72, 3.4], [112, 3.8], [144, 3.0], [160, 2.4]
], 0, 6), 12, 0.04))

// ---------- La boucle ----------
// Demi-tons au-dessus du Fa diese 2. 12 = l'octave, 1 = le Sol (le demi-ton
// de menace), 10 = le Mi. Le dernier pas est un silence : c'est lui que la
// seconde voix saute.
const N = null
type Boucle = (number | null)[]
const BOUCLE: Boucle = [0, N, 0, 12, N, 0, 1, N, 0, N, 0, 10, N, 0, 12, N]
const ACCENTS = [3, 6, 11]
const SLIDES = [2, 10]
/** La derive : une note de la boucle change, parmi celles qui ne portent pas d'accent. */
const CHOIX = [0, 12, 1, 7, 3, 10]
const tirageBoucle = hasard(1126)
function glisse(boucle: Boucle): Boucle {
    const libres: number[] = []
    boucle.forEach((v, step) => {if (v !== null && !ACCENTS.includes(step) && step !== 0) {libres.push(step)}})
    const step = libres[Math.floor(tirageBoucle() * libres.length)]
    let note = boucle[step]
    while (note === boucle[step]) {note = CHOIX[Math.floor(tirageBoucle() * CHOIX.length)]}
    const out = boucle.slice()
    out[step] = note
    return out
}
// Une boucle par fenetre de huit mesures. Elle ne bouge pas pendant 80
// mesures, glisse trois fois, revient, puis glisse encore trois fois.
const BOUCLES: Boucle[] = []
for (let w = 0; w < 20; w++) {
    const glisser = (w >= 10 && w <= 12) || (w >= 15 && w <= 17)
    const retour = w === 13 || w === 18
    BOUCLES.push(w === 0 || retour ? BOUCLE : glisser ? glisse(BOUCLES[w - 1]) : BOUCLES[w - 1])
}
const boucleDe = (bar: number): Boucle => BOUCLES[Math.min(19, Math.floor(bar / 8))]
const couleur = (accent: boolean, c: number) => accent ? 0.9 + 0.1 * c : 0.5 + 0.35 * c

/** La note de la boucle qui tombe au rang "rangDansBoucle", posee sur le pas "step" de la mesure. */
function noteAcid(boucle: Boucle, rangDansBoucle: number, longueur: number, step: number, c: number): Note | null {
    const semi = boucle[rangDansBoucle]
    if (semi === null) {return null}
    // Une note liee deborde sur la suivante : c'est le chevauchement qui fait glisser
    const liee = SLIDES.includes(rangDansBoucle) && boucle[(rangDansBoucle + 1) % longueur] !== null
    return {
        position: step * S16, duration: Math.round(S16 * (liee ? 1.3 : 0.55)),
        pitch: FA2 + semi, velocity: couleur(ACCENTS.includes(rangDansBoucle), c)
    }
}

// ---------- Venin A : la voix qui tient la mesure (16 pas) ----------
const COULEURS_A = [0.3, 0.6, 0.95, 0.45, 0.75]
const voixA = apparat("Venin A", VENIN, -1, -0.3)
reglages("venin a", voixA, {
    cutoff: 200, reso: 0.78, envmod: 2.0, decay: 280, accent: 0.7, tint: 0.8, glide: 80,
    shape: 0, drive: 0.45, lowcut: 180, tonic: FA2, just: 0, duck: 0.35
})
essai("saturation venin a", () => voixA.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
voixA.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.45, wet: -20})
/** Les pas que la voix A joue : un squelette d'abord, la boucle entiere ensuite. */
function pasDeA(bar: number): number[] | null {
    const S1 = [0, 3, 8, 11], S2 = [0, 2, 3, 5, 8, 10, 11, 13]
    if (bar < 8) {return S1}
    if (bar < 32) {return S2}
    if (bar >= 104 && bar < 108) {return S1}
    if (bar >= 108 && bar < 112) {return S2}
    if (bar >= 144 && bar < 152) {return S2}
    if (bar >= 152) {return S1}
    return null
}
build(voixA.noteTracks[0], "Venin A", bar => {
    const out: Note[] = plongeons(bar)
    const boucle = boucleDe(bar)
    const garde = pasDeA(bar)
    for (let step = 0; step < limite(bar); step++) {
        if (garde !== null && !garde.includes(step)) {continue}
        const note = noteAcid(boucle, step, 16, step, COULEURS_A[(bar * 16 + step) % 5])
        if (note !== null) {out.push(note)}
    }
    return out
})
auto("venin a", voixA, "cutoff", vague(enLog([
    [0, 150], [16, 170], [32, 220], [64, 330], [64, 170], [71.75, 420], [72, 330], [104, 460],
    [104, 160], [111.75, 560], [112, 420], [144, 620], [152, 220], [160, 150]
], 60, 4000), 12, 0.035))
auto("venin a", voixA, "envmod", vague(enDroit([
    [0, 1.6], [32, 1.8], [72, 2.4], [112, 2.8], [144, 3.0], [152, 1.6], [160, 1.4]
], 0, 5), 20, 0.03))
auto("venin a", voixA, "tint", enDroit([
    [0, 0.5], [32, 0.7], [72, 1.2], [112, 1.6], [144, 1.8], [152, 0.6], [160, 0.5]
], 0, 3))
auto("venin a", voixA, "reso", vague([
    [0, 0.76], [64, 0.80], [64, 0.88], [72, 0.80], [104, 0.82], [104, 0.90], [112, 0.82], [144, 0.84], [160, 0.76]
], 28, 0.015))
auto("venin a", voixA, "decay", enLog([
    [0, 240], [64, 280], [64, 520], [72, 300], [104, 320], [104, 700], [112, 320], [144, 360], [160, 220]
], 60, 2000))

// ---------- Venin B : la voix qui derive (15 pas) ----------
// Les memes notes, sans le silence final. Elle part avec la voix A a la
// mesure 32, puis a chaque drop ; entre deux, elle gagne un pas par mesure.
// Un carre plutot qu'une dent de scie, de l'autre cote, et son filtre
// respire sur une vague plus lente : les deux voix ne s'ouvrent jamais ensemble.
const DEPARTS = [32, 72, 112]
const COULEURS_B = [0.6, 0.2, 0.85, 0.4, 0.7, 0.1, 0.5]
const voixB = apparat("Venin B", VENIN, -3, 0.3)
reglages("venin b", voixB, {
    cutoff: 220, reso: 0.72, envmod: 1.8, decay: 260, accent: 0.6, tint: 1.0, glide: 80,
    shape: 0.7, drive: 0.4, lowcut: 200, tonic: FA2, just: 0, duck: 0.35
})
essai("saturation venin b", () => voixB.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
voixB.addAudioEffect("Delay", {delay: 11, feedback: 0.34, cross: 1, filter: 0.4, wet: -18})
build(voixB.noteTracks[0], "Venin B", bar => {
    const out: Note[] = plongeons(bar)
    const on = (bar >= 32 && bar < 104) || (bar >= 112 && bar < 144)
    if (!on) {return out}
    let depart = DEPARTS[0]
    for (const d of DEPARTS) {if (d <= bar) {depart = d}}
    const boucle = boucleDe(bar)
    for (let step = 0; step < limite(bar); step++) {
        const t = (bar - depart) * 16 + step
        const note = noteAcid(boucle, t % 15, 15, step, COULEURS_B[t % 7])
        if (note !== null) {out.push(note)}
    }
    return out
})
auto("venin b", voixB, "cutoff", vague(enLog([
    [0, 200], [32, 200], [48, 260], [64, 300], [72, 300], [104, 430], [112, 380], [144, 560], [160, 200]
], 60, 4000), 20, 0.05))
auto("venin b", voixB, "envmod", vague(enDroit([
    [0, 1.4], [32, 1.4], [72, 2.0], [112, 2.4], [144, 2.6], [160, 1.4]
], 0, 5), 14, 0.03))
auto("venin b", voixB, "tint", enDroit([
    [0, 0.8], [32, 0.8], [72, 1.4], [112, 1.8], [144, 2.0], [160, 0.8]
], 0, 3))
// Elle entre de loin, sur huit mesures
auto("venin b", voixB, "volume", [[0, 0.28], [32, 0.28], [40, 0.6], [160, 0.6]])

// ---------- Gresil : les tics ----------
// Des percussions sans bruit blanc : trois sinusoides en cascade. Leur vitesse
// change a chaque bloc.
const ticks = apparat("Tics", GRESIL, 6)
reglages("tics", ticks, {
    decay: 30, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.5, duck: 0
})
// Un tic est si bref que sa pointe depassait son niveau moyen de 23 dB : une saturation la rabote
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
function vitesse(bar: number): number {
    if (!kickOn(bar) || bar < 16) {return 0}
    if (bar < 48) {return 1}                 // un tic a contretemps
    if (bar < 64) {return 2}                 // + le pas d'apres, en sourdine
    if (nu(bar)) {return 1}
    if (bar < 104) {return 3}                // + le pas d'avant
    if (bar < 128) {return 4}                // toutes les doubles-croches
    if (bar < 144) {return 5}                // + la ride
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
auto("tics", ticks, "decay", vague(enLog([
    [0, 25], [72, 30], [112, 36], [144, 26], [160, 22]
], 5, 600), 6, 0.02))

// ---------- Gresil : les tocs ----------
// Le meme instrument, plus grave et plus long, avec une chute de hauteur a
// l'attaque : une syncope seche, et le roulement qui annonce les drops.
const TOCS = [62, 57, 65]
const tocs = apparat("Tocs", GRESIL, -11, 0.15)
reglages("tocs", tocs, {
    decay: 70, index: 2.5, snap: 4, body: 0.1, r2: 1.48, r3: 3.7, noise: 0.1, chirp: 7,
    lowcut: 150, drift: 0.5, width: 0.4, duck: 0.2
})
tocs.addSend(reverb, {amount: -24})
build(tocs.noteTracks[0], "Tocs", bar => {
    // Le roulement avant un drop : il enfle, puis laisse le dernier temps vide
    if (avantDrop(bar)) {
        const out: Note[] = []
        for (let step = 0; step < 12; step++) {
            out.push({
                position: step * S16, duration: S16 / 2, pitch: TOCS[step % 3 === 0 ? 0 : step % 2 === 0 ? 1 : 2],
                velocity: Math.min(1, (step % 3 === 0 ? 0.75 : 0.45) * (0.6 + 0.7 * step / 12))
            })
        }
        return out
    }
    const out: Note[] = plongeons(bar)
    const on = bar >= 32 && bar < 144 && !inBreak(bar) && !nu(bar)
    if (!on) {return out}
    const hit = (step: number, k: number, velocity: number) => out.push({position: step * S16, duration: S16 / 2, pitch: TOCS[k], velocity})
    hit(7, 0, 0.8)
    if (rang(bar) === 1 || rang(bar) === 3) {hit(13, 1, 0.6)}
    if (rang(bar) === 3) {hit(10, 2, 0.5)}
    if (finDeBloc(bar)) {hit(12, 1, 0.6); hit(14, 2, 0.7); hit(15, 0, 0.9)}
    return out
})

// ---------- Lueur : le gong ----------
// Une percussion tres longue, en tete de bloc seulement. Avant le dernier
// drop, elle frappe le Fa diese et le Sol ensemble : le demi-ton qui frotte.
const GONGS: {[bar: number]: number[]} = {
    0: [54], 32: [54, 61], 64: [54], 72: [54, 61, 66], 104: [54, 55], 112: [54, 61, 66], 144: [54, 61]
}
const gong = apparat("Gong", LUEUR, -9)
reglages("gong", gong, {
    decay: 2200, matter: 0.9, strike: 0.4, damp: 0.4, chirp: 0, grain: 0.5, tonic: FA2, just: 1,
    drift: 0.3, duck: 0, width: 0.7, drive: 0.1
})
gong.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.3, wet: -12})
gong.addSend(reverb, {amount: -10})
build(gong.noteTracks[0], "Gong", bar => {
    const notes = GONGS[bar]
    if (!notes) {return []}
    return notes.map((pitch, k) => ({position: k * 2 * S16, duration: S16, pitch, velocity: k === 0 ? 1 : 0.7}))
})

// ---------- Rim, clap, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const RIM = 37, CLAP = 39, RIDE = 51
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -6, panning: -0.1}],
    ["Clap", CLAP, {volume: -4}],
    ["Ride", RIDE, {volume: -13, panning: 0.15}]
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
    if (!kickOn(bar) || nu(bar)) {return out}
    // Le rim sur le deuxieme et le quatrieme temps ; le clap ne le double qu'au dernier drop
    if (bar >= 48 && bar < 144) {hit(4, RIM, 0.7); hit(12, RIM, 0.75)}
    if (bar >= 112 && bar < 144) {hit(4, CLAP, 0.8); hit(12, CLAP, 0.85)}
    if (vitesse(bar) >= 5) {hit(0, RIDE, 0.45); hit(4, RIDE, 0.35); hit(8, RIDE, 0.45); hit(12, RIDE, 0.35)}
    if (finDeBloc(bar)) {hit(14, CLAP, 0.5); hit(15, CLAP, 0.7)}
    return out
})

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le premier drop, on mesure aussi ce qu'on a mesure sur les references :
// la part du grave et de l'aigu, l'energie par bande d'octave, l'ecart entre
// la crete et le niveau moyen, et la force des attaques sur les 16 pas.
const MESURER = true
const ISOLER = false
const units: any[] = [kick, bass, voixA, voixB, ticks, tocs, gong, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["VeninA", voixA], ["VeninB", voixB],
    ["Tics", ticks], ["Tocs", tocs], ["Gong", gong], ["909", drums]]
if (MESURER) {
    const parts = [["seuil", 0, 16], ["pente", 16, 32], ["double", 32, 48], ["large", 48, 64], ["creux", 64, 72],
        ["derive", 72, 88], ["nu", 88, 92], ["loin", 92, 104], ["retour", 104, 112], ["unisson", 112, 128],
        ["large2", 128, 144], ["sortie", 144, 160]]
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
        // Les memes mesures que sur les references, sur le premier drop (mesures 72 a 88)
        const from = Math.floor(72 * barSec * rate), to = Math.min(n, Math.floor(88 * barSec * rate))
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
