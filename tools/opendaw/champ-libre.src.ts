// CHAMP LIBRE - Beat Survivor, mode Survie
// Tekno de free party, acid et tribale - 180 BPM - Do diese phrygien - 202 mesures (4 min 29)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// champ-libre.src.ts (le morceau), de tb303-bass-line.js (la 303) et des
// instruments du dossier apparat/.
//
// Une interpretation des Boucles Etranges (duo francais de free party,
// publie sur Network 23, le label des Spiral Tribe). La reference a ete
// mesuree, pas seulement lue : une dizaine d'extraits de deux lives (Toulouse
// 2000, Cracovie) analyses dans le navigateur. Ce qui en sort :
// - 180 a 187 BPM, tres stable ;
// - un pied sur tous les temps, fondamental vers 53 Hz, qui porte presque
//   toute l'energie ; des mediums creux ; un niveau constant, sans pause ;
// - la signature : basse, toms et charleys appuient sur la double-croche
//   juste avant le temps. Ca donne un galop : "ta-BOUM, ta-BOUM" ;
// - des boucles qui tournent longtemps pendant que des mains tournent les
//   boutons, et des passages ou le pied part en breakbeat.
//
// Parti pris : le galop. Tout ce qui n'est pas le pied s'appuie sur le meme
// pas, celui qui precede le temps. Une ligne acid de seize pas ne change
// presque jamais ; c'est son filtre qui raconte, sur une pente lente qui
// court tout le morceau. Un bloc entier passe en breakbeat pendant que la
// boucle acid continue comme si de rien n'etait.
//
// Applique des notes Underdog (vault, Concepts/Musique) : une seule idee ;
// blocs de 16 mesures ou les aigus changent de vitesse ; arrangement par
// soustraction ; accents partages par toutes les voix ; un seul polymetre
// (la cloche, 5 pas) ; le grave court, un seul acteur dans le sub a la fois ;
// deux mesures glissees avant le final ; un passage nu ; rien de sature dans
// les mediums aigus.
//
// Instruments : Coup (grosse caisse), Sub (basse), Peaux (toms), Blip (la
// cloche et les marqueurs) et Souffle sont ecrits pour ces morceaux (Apparat
// = instrument scriptable d'openDAW). La 303 est le script Apparat "TB-303
// Bass Line" d'Andre Michelle (CC0). Charleys, caisse claire, clap, ride : TR-909.

const BPM = 180
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 202
const barSec = 240 / BPM

const TB303: string = __TB303__
const COUP: string = __COUP__
const SUB: string = __SUB__
const PEAUX: string = __PEAUX__
const BLIP: string = __BLIP__
const SOUFFLE: string = __SOUFFLE__

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
const project = openDAW.newProject("Champ libre")
project.bpm = BPM

// Une reverb courte, pour la caisse claire et les marqueurs seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.35, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Des blocs de 16 mesures (21 secondes a ce tempo). Un creux de 8 mesures et
// deux mesures glissees avant le final.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Galop", start: 16, bars: 16},
    {name: "Acide", start: 32, bars: 16},
    {name: "Ouverture", start: 48, bars: 16},
    {name: "Plein", start: 64, bars: 16},
    {name: "Casse", start: 80, bars: 16},
    {name: "Creux", start: 96, bars: 8},
    {name: "Drop", start: 104, bars: 16},
    {name: "Plus", start: 120, bars: 18},
    {name: "Final", start: 138, bars: 16},
    {name: "Sommet", start: 154, bars: 16},
    {name: "Descente", start: 170, bars: 16},
    {name: "Sortie", start: 186, bars: 16}
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
    for (let bar = 0; bar <= TOTAL; bar += 2) {
        while (next < trend.length && trend[next][0] <= bar) {
            out.push([trend[next][0], clamp(trend[next][1] + wave(trend[next][0]))])
            next++
        }
        if (!trend.some(p => p[0] === bar)) {out.push([bar, clamp(at(bar) + wave(bar))])}
    }
    return out
}

// ---------- La carte du morceau ----------
/** Le bloc en breakbeat : le pied quitte les temps, la boucle acid continue. */
const casse = (bar: number) => bar >= 80 && bar < 96
/** Les creux : le pied se tait. Le second, ce sont les deux mesures glissees. */
const inBreak = (bar: number) => (bar >= 96 && bar < 104) || (bar >= 136 && bar < 138)
/** Le passage nu : le pied et l'acid seulement, avant que tout revienne. */
const nu = (bar: number) => bar >= 154 && bar < 158
const kickOn = (bar: number) => bar < 198 && !inBreak(bar)
const drop = (bar: number) => (bar >= 104 && bar < 136) || (bar >= 138 && bar < 170)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 103 || bar === 137
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. Faible : c'est une musique de transe. */
const finDeBloc = (bar: number) => [31, 47, 63, 79, 119, 153, 169, 185].includes(bar)
/** Les relances ou le pied lache son dernier temps. */
const relanceForte = (bar: number) => bar === 79 || bar === 119 || bar === 153
/** Les deux mesures glissees decalent tout : on compte comme si elles n'existaient pas. */
const rel = (bar: number) => bar < 138 ? bar : bar - 2
/** Place dans la phrase de quatre mesures : 0 = A, 1 = B, 2 = A, 3 = C. */
const rang = (bar: number) => rel(bar) % 4

/** Les coups de pied d'une mesure : [pas, velocite]. Le Sub s'en sert aussi. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    if (casse(bar)) {
        // Le breakbeat : le pied sur 1, puis deux coups a contretemps
        const out = [[0, 1], [6, 0.85], [10, 0.9]]
        if (bar % 2 === 1) {out.push([13, 0.7])}
        return out
    }
    const v = bar < 16 || bar >= 186 ? 0.8 : drop(bar) ? 1 : 0.9
    const out = [[0, v], [4, v], [8, v], [12, v]]
    return relanceForte(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// ---------- Coup : la grosse caisse ----------
// Court (le temps ne dure que 333 ms), accorde a 52 Hz comme la reference, dur.
const kick = apparat("Coup", COUP, -7)
reglages("coup", kick, {tune: 52, sweep: 0.8, decay: 105, click: 0.55, drive: 0.3})
build(kick.noteTracks[0], "Coup", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
// Le pied arrive etouffe et gagne son claquement en huit mesures
auto("coup", kick, "click", [[0, 0.15], [8, 0.55], [170, 0.55], [198, 0.25], [202, 0.25]])

// ---------- Sub : la basse du galop ----------
// Une note courte sur le pas qui precede chaque temps : "ta-BOUM". Elle se
// tait avant que le pied retombe : un seul acteur dans le grave a la fois.
// Do diese 2 (69 Hz), a la quarte au-dessus du pied : ils ne battent pas.
const DO = 37, RE = 38
const sub = apparat("Sub", SUB, -16)
reglages("sub", sub, {depth: 0.9, release: 90, glide: 20, drive: 0.5})
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = plongeons(bar)
    if (bar < 16 || bar >= 186 || inBreak(bar) || nu(bar)) {return out}
    const v = drop(bar) ? 1 : 0.85
    // Deux formes : la note seule sur le dernier pas, ou une note plus longue
    // qui part du contretemps ("boum-baaa")
    const longue = (bar >= 120 && bar < 136) || (bar >= 138 && bar < 170)
    const beats = casse(bar) ? [0, 3] : [0, 1, 2, 3]
    for (const beat of beats) {
        const step = beat * 4 + (longue ? 2 : 3)
        if (step >= limite(bar)) {continue}
        // Fin de phrase : le Re, le demi-ton au-dessus de la tonique
        const pitch = rang(bar) === 3 && beat === 3 ? RE : DO
        out.push({position: step * S16, duration: Math.round(S16 * (longue ? 1.8 : 0.85)), pitch, velocity: v})
    }
    return out
})

// ---------- Peaux : les toms du galop ----------
// Le meme pas que la basse. Le troisieme coup tombe cinq demi-tons plus bas.
// Ils jouent dans le medium (200 a 400 Hz) : le grave reste au pied et a la basse,
// et c est la que la reference appuie le plus fort sur le pas du galop.
const TOM = 61, TOM_BAS = 56, TOM_HAUT = 68
const toms = apparat("Peaux", PEAUX, -8)
reglages("peaux", toms, {decay: 120, bend: 0.5, slap: 0.7, drive: 0.5, width: 0.3})
/** Un roulement : doubles-croches, un accent tous les trois pas, de plus en plus fort. */
function roulement(from: number, to: number, base: number, gain: number): Note[] {
    const out: Note[] = []
    for (let step = from; step < to; step++) {
        const k = step - from
        const accent = k % 3 === 0
        out.push({
            position: step * S16, duration: S16 / 2,
            pitch: accent ? TOM_HAUT : k % 2 === 0 ? TOM : TOM_BAS,
            velocity: Math.min(1, (accent ? 0.75 : 0.45) * (base + gain * k / (to - from)))
        })
    }
    return out
}
build(toms.noteTracks[0], "Peaux", bar => {
    if (bar < 8 || bar >= 198 || nu(bar)) {return []}
    // Les deux mesures glissees : les toms seuls, qui roulent et enflent
    if (bar === 136) {return roulement(0, 16, 0.7, 0.3)}
    if (bar === 137) {return roulement(0, 12, 1.0, 0.4)}
    // Dans le creux, ils tiennent le galop puis roulent
    if (bar === 102) {return roulement(0, 16, 0.6, 0.3)}
    if (bar === 103) {return roulement(0, 12, 0.9, 0.4)}
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16 / 2, pitch, velocity})}
    }
    if (casse(bar)) {hit(7, TOM, 0.9); hit(15, TOM_BAS, 1); return out}
    const r = rang(bar)
    hit(3, TOM, 1); hit(7, TOM, 0.85); hit(11, TOM_BAS, 1); hit(15, TOM, 0.85)
    if (r === 1 && bar >= 16) {hit(6, TOM_HAUT, 0.55)}
    if ((r === 3 || finDeBloc(bar)) && bar >= 16) {hit(12, TOM_BAS, 0.5); hit(13, TOM_BAS, 0.6); hit(14, TOM, 0.75)}
    return out
})
// decay 60..900 ms (120 ms = 0.26, 200 ms = 0.44) : les peaux resonnent plus quand le pied se tait
auto("peaux", toms, "decay", [
    [0, 0.26], [96, 0.26], [96, 0.44], [104, 0.44], [104, 0.26], [136, 0.26], [136, 0.40],
    [138, 0.40], [138, 0.26], [202, 0.26]
])

// ---------- La 303 : la boucle ----------
const N = null
// steps : demi-tons au-dessus du Do diese 3. 1 = Re, 12 = l'octave, 13 = Re aigu.
// Les accents tombent sur le dernier pas de chaque temps : le galop.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// A0 : le squelette. A1 : la boucle. A2 : sa fin de phrase. A4 : le creux.
const A0: Pattern = {steps: [0, N, N, 12, N, N, N, 12, 0, N, N, 12, N, N, 1, 12], accents: [3, 7, 11, 15], slides: []}
const A1: Pattern = {steps: [0, N, 0, 12, 0, N, 1, 12, 0, N, 0, 12, 0, 1, N, 13], accents: [3, 7, 11, 15], slides: [2, 6, 10]}
const A2: Pattern = {steps: [0, N, 0, 12, 0, N, 1, 12, 3, N, 1, 12, 0, 12, 1, 13], accents: [3, 7, 11, 13, 15], slides: [2, 6, 10, 14]}
const A4: Pattern = {steps: [0, N, N, N, N, N, N, 12, N, N, N, N, N, N, 1, N], accents: [7], slides: []}

function acidNote(pattern: Pattern, step: number, base: number): Note {
    const slide = pattern.slides.includes(step)
    return {
        position: step * S16,
        // Une note liee deborde sur la suivante : c'est le recouvrement qui
        // declenche le glissando dans la 303
        duration: Math.round(S16 * (slide ? 1.3 : 0.6)),
        pitch: base + (pattern.steps[step] as number),
        // L'accent de cette 303 se declenche a velocite 1.0 pile
        velocity: pattern.accents.includes(step) ? 1.0 : 0.65
    }
}

const acid = apparat("Acide", TB303, -4.5)
reglages("acide", acid, {cutoff: 70, resonance: 0.85, envmod: 0.3, decay: 300, accent: 1.0})
essai("saturation acide", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.85} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -22})

build(acid.noteTracks[0], "Acide", bar => {
    let pattern: Pattern | null = null
    if (bar >= 32 && bar < 40) {pattern = A0}
    else if (bar >= 40 && bar < 96) {pattern = rang(bar) === 3 ? A2 : A1}
    else if (bar >= 96 && bar < 100) {pattern = A4}
    else if (bar >= 100 && bar < 104) {pattern = A1}
    else if (bar >= 104 && bar < 136) {pattern = rang(bar) === 3 ? A2 : A1}
    else if (bar >= 138 && bar < 178) {pattern = rang(bar) === 3 ? A2 : A1}
    else if (bar >= 178 && bar < 186) {pattern = A0}
    if (pattern === null) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, 49))
    }
    return out
})

// Le filtre raconte le morceau : une pente lente qui ne revient jamais a zero,
// sauf dans le creux. Valeurs 0..1 sur la plage declaree par la 303.
auto("acide", acid, "cutoff", vague([
    [0, 0.05], [32, 0.05], [48, 0.25], [64, 0.45], [80, 0.55], [96, 0.62],
    [96, 0.12], [100, 0.15], [103.75, 0.85], [104, 0.70], [136, 0.88], [138, 0.85], [154, 0.94],
    [170, 1.0], [186, 0.20], [202, 0.05]
], 12, 0.06))
auto("acide", acid, "envmod", vague([
    [0, 0.20], [32, 0.20], [64, 0.45], [96, 0.60], [96, 0.30], [103.75, 0.65], [104, 0.72],
    [170, 0.95], [186, 0.30], [202, 0.20]
], 20, 0.06))
auto("acide", acid, "resonance", vague([
    [0, 0.80], [64, 0.85], [96, 0.90], [96, 0.96], [104, 0.88], [170, 0.93], [202, 0.80]
], 28, 0.02))
auto("acide", acid, "decay", [
    [0, 0.12], [64, 0.22], [96, 0.30], [96, 0.75], [104, 0.30], [170, 0.50], [186, 0.15], [202, 0.12]
])
auto("acide", acid, "volume", [
    [0, 0.62], [96, 0.66], [96, 0.40], [103.75, 0.68], [104, 0.70], [170, 0.70], [186, 0.45], [202, 0.45]
])

// ---------- La cloche : le seul polymetre ----------
// Cinq pas contre seize : elle ne retombe sur ses pieds que toutes les cinq
// mesures. Ses pas sont comptes depuis le drop (mesure 104). Un timbre de
// metal (rapport a virgule), tres court, sur les cotes.
const ORIGINE = 104 * 16
const tour = (bar: number, step: number, period: number) =>
    (((bar * 16 + step - ORIGINE) % period) + period) % period
const bell = apparat("Cloche", BLIP, -12)
reglages("cloche", bell, {
    long: 40, tone: 0.4, bite: 1.5, ratio: 3.5, snap: 0.5, sub: 0, chirp: 3,
    drift: 0.5, duck: 0.4, width: 0.7, haas: 8
})
bell.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 1, filter: 0.3, wet: -14})
build(bell.noteTracks[0], "Cloche", bar => {
    const out = plongeons(bar)
    const on = (bar >= 56 && bar < 80) || (bar >= 104 && bar < 136) || (bar >= 138 && bar < 170)
    if (!on || nu(bar)) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const t = tour(bar, step, 5)
        if (t === 0) {out.push({position: step * S16, duration: S16 / 2, pitch: 61, velocity: 1})}
        if (t === 3) {out.push({position: step * S16, duration: S16 / 2, pitch: 56, velocity: 0.6})}
    }
    return out
})
auto("cloche", bell, "tone", [[0, 0.30], [56, 0.30], [80, 0.42], [104, 0.38], [170, 0.52], [202, 0.35]])

// ---------- Les marqueurs ----------
// La meme voix, longue, noyee dans son echo, sur le premier temps de trois blocs seulement
const MARQUES = [[104, 61, 73], [138, 68, 73], [158, 61, 73]]
const mark = apparat("Marque", BLIP, -13)
reglages("marque", mark, {
    long: 500, tone: 0.5, bite: 1.6, ratio: 3.5, snap: 0.3, sub: 0.3, chirp: 12,
    drift: 0, duck: 0, width: 0, haas: 0
})
mark.addAudioEffect("Delay", {delay: 13, feedback: 0.6, cross: 1, filter: 0.3, wet: -8})
mark.addSend(reverb, {amount: -16})
build(mark.noteTracks[0], "Marque", bar => {
    const m = MARQUES.find(x => x[0] === bar)
    if (!m) {return []}
    return [
        {position: 0, duration: S16, pitch: m[1], velocity: 1},
        {position: S16, duration: S16, pitch: m[2], velocity: 0.7},
        {position: 7 * S16, duration: S16, pitch: m[1] - 12, velocity: 0.6}
    ]
})

// ---------- Souffle : l'air du hangar, et les montees ----------
const breath = apparat("Souffle", SOUFFLE, -15)
reglages("souffle", breath, {reso: 0.6, drift: 0.6})
build(breath.noteTracks[0], "Souffle", bar => {
    const section = SECTIONS.find(s => s.start === bar)
    if (!section) {return []}
    return [{position: 0, duration: section.bars * BAR - 10, pitch: 60, velocity: 1}]
})
// freq 80..8000 Hz (300 Hz = 0.29, 600 = 0.44, 2000 = 0.70, 5000 = 0.90)
auto("souffle", breath, "freq", [
    [0, 0.30], [96, 0.38], [100, 0.50], [103.75, 0.92], [104, 0.45], [134, 0.45], [137.75, 0.92],
    [138, 0.50], [186, 0.40], [202, 0.30]
])
auto("souffle", breath, "volume", [
    [0, 0.50], [16, 0.25], [96, 0.25], [96, 0.50], [103.75, 1.0], [104, 0.20], [134, 0.22],
    [137.75, 0.95], [138, 0.22], [186, 0.30], [202, 0.55]
])

// ---------- Charleys, caisse claire, clap, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const SNARE = 38, CLAP = 39, HAT_C = 42, HAT_O = 46, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Snare", SNARE, {volume: -4}],
    ["Clap", CLAP, {volume: -3}],
    ["Closed Hat", HAT_C, {volume: -6, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -8, panning: 0.1, exclude: true}],
    ["Crash", CRASH, {volume: -15}],
    ["Ride", RIDE, {volume: -12, panning: -0.15}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -24})

/** La vitesse des aigus : elle change a chaque bloc. */
function vitesse(bar: number): number {
    if (!kickOn(bar) || nu(bar) || bar < 8) {return 0}
    if (bar < 32) {return 1}                 // charley ouvert a contretemps
    if (bar < 64) {return 2}                 // + un charley ferme sur le pas du galop
    if (bar < 80) {return 3}                 // + un autre juste apres le temps
    if (bar < 96) {return 9}                 // le breakbeat
    if (bar < 120) {return 2}
    if (bar < 158) {return 3}
    if (bar < 170) {return 4}                // + la ride
    if (bar < 178) {return 2}
    return 1
}

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const v = vitesse(bar)
    // Dans le creux, les charleys reviennent a pas de loup
    if (bar >= 100 && bar < 103) {
        for (let step = 0; step < 16; step++) {hit(step, HAT_C, 0.1 + (bar - 100) * 0.1 + (step % 4 === 3 ? 0.15 : 0))}
    }
    if (v === 0) {return out}
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (v === 9) {
            // Breakbeat : caisse claire sur 2 et 4, une note fantome a la fin, charleys en croches
            if (step === 4 || step === 12) {hit(step, SNARE, 0.9)}
            if (step === 15) {hit(step, SNARE, 0.4)}
            if (step % 2 === 0) {hit(step, HAT_C, beat === 2 ? 0.6 : 0.4)}
            continue
        }
        if (beat === 2) {hit(step, HAT_O, drop(bar) ? 0.7 : 0.6)}
        if (v >= 2 && beat === 3) {hit(step, HAT_C, 0.8)}
        if (v >= 3 && beat === 1) {hit(step, HAT_C, 0.55)}
        if (v >= 4 && beat === 0) {hit(step, RIDE, 0.4)}
    }
    if (bar === 104 || bar === 138) {hit(0, CRASH, 0.6)}
    // Fin de bloc : le clap bafouille sur les deux derniers pas faibles
    if (finDeBloc(bar)) {hit(13, CLAP, 0.5); hit(15, CLAP, 0.7)}
    return out
})

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Pour le mix, on mesure aussi ce qu'on a mesure sur la reference : la part du
// grave et de l'aigu, et la force des attaques sur chacun des 16 pas de la
// mesure (0 a 9), dans le grave, le medium et l'aigu.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, sub, toms, acid, bell, mark, breath, drums]
const STEMS: [string, any][] = [["Coup", kick], ["Sub", sub], ["Peaux", toms], ["Acide", acid],
    ["Cloche", bell], ["Marque", mark], ["Souffle", breath], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 16], ["galop", 16, 32], ["acide", 32, 64], ["plein", 64, 80], ["casse", 80, 96],
        ["creux", 96, 104], ["drop", 104, 136], ["final", 138, 154], ["sommet", 154, 170],
        ["descente", 170, 186], ["sortie", 186, 202]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const R = audio.frames.length > 1 ? audio.frames[1] : L
        const n = L.length
        // Deux passe-haut a 2 kHz puis deux passe-bas a 6 kHz, du second ordre
        const filtre = (haut: boolean, fc: number) => {
            const w = 2 * Math.PI * fc / rate, alpha = Math.sin(w) / Math.sqrt(2), c = Math.cos(w), a0 = 1 + alpha
            const b0 = haut ? (1 + c) / 2 : (1 - c) / 2, b1 = haut ? -(1 + c) : 1 - c
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0
            return (x: number) => {
                const y = (b0 * x + b1 * x1 + b0 * x2 + 2 * c * y1 - (1 - alpha) * y2) / a0
                x2 = x1; x1 = x; y2 = y1; y1 = y
                return y
            }
        }
        const f1 = filtre(true, 2000), f2 = filtre(true, 2000), f3 = filtre(false, 6000), f4 = filtre(false, 6000)
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
            // La meme mesure que sur la reference, sur le drop (mesures 104 a 136)
            const from = Math.floor(104 * barSec * rate), to = Math.min(n, Math.floor(136 * barSec * rate))
            // Meme pas d analyse que pour la reference (512 echantillons)
            const hop = 512
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            const kA = 1 - Math.exp(-2 * Math.PI * 300 / rate), kB = 1 - Math.exp(-2 * Math.PI * 3000 / rate)
            let lp = 0, lp2 = 0, hl = 0, ma = 0, mb = 0, sLow = 0, sHigh = 0, sTot = 0
            const eL: number[] = [], eM: number[] = [], eH: number[] = []
            for (let i = from; i < to; i += hop) {
                let l = 0, m = 0, h = 0
                for (let j = i; j < i + hop && j < to; j++) {
                    const x = (L[j] + R[j]) / 2
                    lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                    hl += (x - hl) * kHigh
                    ma += (x - ma) * kA; mb += (x - mb) * kB
                    const hh = x - hl, mm = mb - ma
                    l += lp2 * lp2; m += mm * mm; h += hh * hh; sTot += x * x
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
            line += " || drop : grave " + pas(eL) + " medium " + pas(eM) + " aigu " + pas(eH) +
                " partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1)
        }
        report.push(line)
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
