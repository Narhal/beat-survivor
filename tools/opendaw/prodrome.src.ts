// PRODROME - Beat Survivor, mode Survie
// Techno minimale, un peu industrielle - 126 BPM - La - 160 mesures (5 min 05)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// prodrome.src.ts (le morceau) et des instruments du dossier apparat/.
//
// Le morceau qui fait la paire avec "Friche" : memes annees (Berlin, 2009),
// memes reperes mesures ("Pick a Chick" de Harry Axt, "Subzero" de Ben
// Klock), memes cibles de mix. Sa ligne principale est le Revers, choisi par
// N4 sur le banc d ecoute ("revers est top ! on garde").
//
// Un prodrome, c est le symptome qui annonce une maladie avant qu elle se
// declare.
// L idee, en une phrase : chaque note de metal a l envers annonce un coup.
// - Le Revers : une note qui sort du silence, enfle, s eclaircit et s arrete
//   net. On l ecrit avant l instant vise ; elle finit dessus.
// - D abord elle n annonce rien : elle s arrete sur du vide. Puis les coups
//   arrivent : au bout de certaines notes, la meme note frappee a l endroit
//   (une tole qu on laisse sonner). A l envers puis a l endroit : la note
//   devient un palindrome. Au sommet, chaque mesure a le sien.
// - Dans le creux, la machine s arrete et les notes s allongent (sept pas
//   au lieu de trois) : de longues inspirations, chacune suivie de son coup.
//
// Le dosage suit la regle tiree des deux references (voir le vault) : la
// ligne est absente pendant 24 mesures ; elle arrive une note toutes les
// quatre mesures, puis toutes les deux, puis par phrases ; elle n est chargee
// que pendant deux mesures (126 et 127), a la fin du sommet.
//
// Les notes : quatre seulement (Fa, Do, Re, Sol) sur un La. Ni la tonique, ni
// sa quinte, ni le demi-ton au-dessus d elle. Des phrases de trois mesures
// dans des blocs de seize : elles ne retombent pas sur leurs pieds. Apres le
// creux, la phrase est jouee dans l autre sens.
//
// Instruments (Apparat = instrument scriptable d openDAW) : Revers (choisi sur
// le banc), Tole (les coups a l endroit, le gong), Frappe (grosse caisse),
// Roulante (basse), Gresil (tics). Rim et clap : TR-909.

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 160
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : la basse et le Revers comptent en pas. */
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const ROULANTE: string = __ROULANTE_L__
const REVERS: string = __REVERS_L__
const TOLE: string = __TOLE_L__
const GRESIL: string = __GRESIL_L__

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
const project = openDAW.newProject("Prodrome")
project.bpm = BPM

// Une petite salle, pour les coups de tole seulement. Le genre est sec.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.6, preDelay: 10, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seuil", start: 0, bars: 16},
    {name: "Machine", start: 16, bars: 16},
    {name: "Signes", start: 32, bars: 16},
    {name: "Annonce", start: 48, bars: 16},
    {name: "Incubation", start: 64, bars: 16},
    {name: "Creux", start: 80, bars: 16},
    {name: "Retour", start: 96, bars: 16},
    {name: "Declaration", start: 112, bars: 16},
    {name: "Usure", start: 128, bars: 16},
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
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)

// ---------- La carte du morceau ----------
/** Le creux : la machine s arrete (mesures 80 a 96). */
const creux = (bar: number) => bar >= 80 && bar < 96
/** Le bloc qui demarre sans son grave : quatre mesures sans pied ni basse. */
const nu = (bar: number) => bar >= 128 && bar < 132
const kickOn = (bar: number) => !creux(bar) && !nu(bar) && bar < 156
/** La basse : elle entre au deuxieme bloc, revient avant le pied dans le creux, sort avant la fin. */
const bassOn = (bar: number) => bar >= 16 && bar < 152 && !(bar >= 80 && bar < 88) && !nu(bar)
/** La mesure qui precede un retour : le dernier temps reste vide. */
const avantRetour = (bar: number) => bar === 95 || bar === 131
const limite = (bar: number) => avantRetour(bar) ? 12 : 16

/**
 * La courbe protagoniste : la declaration, de 0 a 1, sur tout le morceau. Le
 * metal s eclaircit et se tend avec elle ; les tics s allongent.
 */
const DECLARATION = [[0, 0.1], [24, 0.15], [48, 0.4], [64, 0.55], [80, 0.45], [96, 0.7], [112, 0.9], [120, 1],
    [128, 0.7], [144, 0.4], [160, 0.1]]
const suit = (bas: number, haut: number, echelle: (v: number) => number) =>
    DECLARATION.map(p => [p[0], echelle(bas + (haut - bas) * p[1])])

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 55, start: 360, sweep: 46, decay: 165, punch: 0.6, click: 0.45, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar => {
    if (!kickOn(bar)) {return []}
    const force = bar < 48 || bar >= 144 ? 0.85 : 0.97
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step += 4) {out.push({position: step * S16, duration: S16, pitch: 36, velocity: force})}
    return out
})
auto("frappe", kick, "click", [[0, 0.15], [16, 0.45], [144, 0.45], [160, 0.15]])

// ---------- Roulante : la basse ----------
// Le meme La que le pied, jamais en meme temps que lui.
const LA1 = 33
const bass = apparat("Roulante", ROULANTE, -2)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    return (bar % 2 === 0 ? [3, 6, 11, 14] : [3, 6, 10, 14]).filter(step => step < limite(bar))
        .map((step, k) => ({position: step * S16, duration: S16, pitch: LA1, velocity: k === 0 ? 0.65 : 0.8}))
})
auto("roulante", bass, "envmod", suit(2.6, 3.6, v => droit(v, 0, 6)))

// ---------- Le metal a l envers ----------
// Une note finit "long" pas apres son debut : on l ecrit AVANT l instant vise.
// Chaque annonce : [pas ou elle FINIT (16 = le premier temps de la mesure
// suivante), note, 1 si un coup a l endroit la suit].
// Quatre notes sur un La : Fa, Do, Re, Sol. Au sommet, deux d entre elles
// sautent d une octave.
const FA3 = 53, DO4 = 60, RE3 = 50, SOL3 = 55, DO3 = 48, FA4 = 65
/** Le Revers court : la note dure trois pas. */
const LONG = 3
/** Le Revers long, pour le creux : sept pas. */
const LONG2 = 7
type Annonces = number[][]
/** Les premiers signes : une note toutes les quatre mesures, puis toutes les deux. Aucun coup ne suit. */
const SIGNES: {[bar: number]: Annonces} = {
    24: [[12, FA3, 0]], 28: [[6, DO4, 0]],
    32: [[12, FA3, 0]], 34: [[6, DO4, 0]], 37: [[12, RE3, 0]], 39: [[16, SOL3, 0]],
    40: [[12, FA3, 0]], 42: [[6, DO4, 0]], 43: [[14, FA3, 0]], 45: [[12, RE3, 0]], 47: [[16, SOL3, 1]]
}
/** La phrase : trois mesures. Le coup tombe au bout de sa derniere note. */
const PHRASE: Annonces[] = [
    [[4, FA3, 0], [14, DO4, 0]],
    [[8, RE3, 0], [12, FA3, 0]],
    [[6, SOL3, 1]]
]
/** La meme, avec une note de plus par mesure pleine. */
const PHRASE_PLUS: Annonces[] = [
    [[4, FA3, 0], [10, RE3, 0], [14, DO4, 0]],
    [[8, RE3, 0], [12, FA3, 1]],
    [[6, SOL3, 0], [16, DO4, 1]]
]
/** La phrase dans l autre sens : les memes instants, les notes prises par la fin. */
const ENVERS: Annonces[] = [
    [[4, SOL3, 0], [14, FA3, 0]],
    [[8, RE3, 0], [12, DO4, 0]],
    [[6, FA3, 1]]
]
/** Le sommet : quatre mesures qui tournent, un coup par mesure, deux sauts d octave. */
const SOMMET: Annonces[] = [
    [[4, FA3, 1], [10, DO4, 0], [14, RE3, 0]],
    [[6, SOL3, 0], [12, FA4, 1]],
    [[4, DO4, 1], [8, DO3, 0], [14, SOL3, 0]],
    [[4, FA3, 0], [8, DO4, 0], [12, RE3, 1], [15, FA3, 0]]
]
/** Les annonces courtes d une mesure. */
function annonces(bar: number): Annonces {
    if (bar < 48) {return SIGNES[bar] ?? []}
    if (bar < 64) {return PHRASE[(bar - 48) % 3]}
    if (bar < 80) {return PHRASE_PLUS[(bar - 64) % 3]}
    // Avant le retour de la machine : trois annonces qui montent, une par temps, puis un temps de vide
    if (bar === 95) {return [[4, FA3, 0], [8, SOL3, 0], [12, DO4, 0]]}
    if (bar < 96) {return []}
    if (bar < 112) {return ENVERS[(bar - 96) % 3]}
    // Les deux dernieres mesures du sommet : les seules vraiment chargees. Une annonce tous les deux pas.
    if (bar === 126) {return [[4, FA3, 1], [6, DO4, 0], [8, RE3, 0], [10, SOL3, 0], [12, FA4, 1], [14, DO4, 0], [16, RE3, 0]]}
    if (bar === 127) {return [[3, DO3, 0], [5, RE3, 0], [7, FA3, 0], [9, SOL3, 0], [11, DO4, 0], [13, FA4, 0], [16, FA3, 1]]}
    if (bar < 128) {return SOMMET[(bar - 112) % 4]}
    // Le bloc sans grave : la phrase seule, puis elle se defait
    if (bar === 131) {return [[4, FA3, 0], [8, SOL3, 0], [12, DO4, 0]]}
    if (bar < 144) {return PHRASE[(bar - 128) % 3]}
    // La sortie : une note toutes les deux mesures, puis toutes les quatre ; la derniere a son coup
    const SORTIE: {[bar: number]: Annonces} = {144: [[12, FA3, 0]], 146: [[6, DO4, 0]], 148: [[12, RE3, 0]], 152: [[12, FA3, 0]], 155: [[16, SOL3, 1]]}
    return SORTIE[bar] ?? []
}
/** Les annonces longues du creux : une inspiration de sept pas, et son coup. */
const LONGUES: {[bar: number]: Annonces} = {
    80: [[16, RE3, 1]], 82: [[16, FA3, 1]], 84: [[16, DO3, 1]], 86: [[16, FA3, 1]],
    88: [[8, RE3, 0], [16, SOL3, 1]], 90: [[16, FA3, 1]], 92: [[8, DO3, 0], [16, RE3, 1]], 94: [[16, FA3, 1]]
}

const revers = apparat("Revers", REVERS, 0)
reglages("revers", revers, {
    tune: 0, pas: PAS_MS, long: LONG, curve: 0.3, metal: 0.6, bright: 0.6, bend: 2, tail: 6, drive: 0.25, lowcut: 120
})
build(revers.noteTracks[0], "Revers", bar =>
    annonces(bar).map(a => ({position: (a[0] - LONG) * S16, duration: S16, pitch: a[1], velocity: 0.8})))
// Le voyage : le metal s eclaircit, et sa hauteur se tend davantage avant l arret
auto("revers", revers, "bright", suit(0.4, 0.85, v => v))
auto("revers", revers, "bend", suit(1.5, 4.5, v => droit(v, 0, 12)))

const reversLong = apparat("Revers long", REVERS, 1)
reglages("revers long", reversLong, {
    tune: 0, pas: PAS_MS, long: LONG2, curve: 0.4, metal: 0.7, bright: 0.5, bend: 3, tail: 8, drive: 0.25, lowcut: 110
})
build(reversLong.noteTracks[0], "Revers long", bar =>
    (LONGUES[bar] ?? []).map(a => ({position: (a[0] - LONG2) * S16, duration: S16, pitch: a[1], velocity: 0.85})))

// ---------- Tole : les coups a l endroit ----------
// Au bout de certaines annonces, la meme note frappee sur une tole qu on
// laisse sonner. Un peu d echo et de salle : c est le seul son qui y a droit.
const coups = apparat("Tole", TOLE, -1)
reglages("tole", coups, {tune: 0, decay: 800, damp: 0.9, metal: 0.7, strike: 0.3, drive: 0.5, gate: 0})
essai("echo tole", () => coups.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 0, filter: 0.3, wet: -16}))
coups.addSend(reverb, {amount: -14})
/** Les coups qui tombent dans une mesure : ceux qu annoncent les notes de cette mesure ou de la precedente. */
function coupsDe(bar: number): Note[] {
    const out: Note[] = []
    for (const b of [bar - 1, bar]) {
        if (b < 0) {continue}
        for (const a of annonces(b).concat(LONGUES[b] ?? [])) {
            if (a[2] !== 1) {continue}
            const abs = b * 16 + a[0]
            if (Math.floor(abs / 16) !== bar) {continue}
            out.push({position: (abs % 16) * S16, duration: S16, pitch: a[1], velocity: creux(b) ? 0.95 : 0.8})
        }
    }
    return out
}
build(coups.noteTracks[0], "Tole", coupsDe)
auto("tole", coups, "damp", suit(0.94, 0.78, v => v))
auto("tole", coups, "decay", [[0, 800], [79.9, 800], [80, 2200], [96, 800], [160, 800]].map(p => [p[0], loga(p[1], 20, 8000)]))

// ---------- Gresil : les tics ----------
// Un tic a contretemps, qui ne bouge pas ; autour de lui, des tics plus
// faibles dont le nombre change a chaque bloc. Aucun charley ouvert.
const ticks = apparat("Tics", GRESIL, -4.5)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
/** 0 = rien ; 1 = le contretemps ; 2 = + le pas d apres ; 3 = + le pas d avant ; 4 = toutes les doubles-croches ; 5 = des fantomes seuls. */
function vitesse(bar: number): number {
    if (bar < 8 || bar >= 152) {return 0}
    if (bar < 16) {return 5}
    if (bar < 48) {return 1}
    if (bar < 64) {return 2}
    if (bar < 80) {return 3}
    if (bar < 88) {return 0}
    if (bar < 96) {return 5}
    if (bar < 112) {return 3}
    if (bar < 128) {return 4}
    if (nu(bar)) {return 5}
    return bar < 144 ? 2 : 1
}
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        let force = 0
        if (v === 5) {force = beat === 2 ? 0.4 : 0}
        else {force = beat === 2 ? 0.85 : beat === 3 && v >= 2 ? 0.48 : beat === 1 && v >= 3 ? 0.36 : beat === 0 && v >= 4 ? 0.26 : 0}
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force})}
    }
    return out
})
auto("tics", ticks, "decay", suit(22, 36, v => loga(v, 5, 600)))

// ---------- Rim et clap : TR-909 ----------
// Le rim sur les temps 2 et 4, a partir des premiers signes. Le clap ne le
// double que pendant le sommet.
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -6.5})
const RIM = 37, CLAP = 39
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -6}],
    ["Clap", CLAP, {volume: -6}]
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
    if (bar >= 32 && bar < 144) {hit(4, RIM, 0.7); hit(12, RIM, 0.75)}
    if (bar >= 112 && bar < 128) {hit(4, CLAP, 0.7); hit(12, CLAP, 0.75)}
    return out
})

// Limiteur de sortie : les deux references sont tres tenues (10 dB entre les cretes et le niveau moyen)
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le bloc du retour (mesures 96 a 112), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, revers, reversLong, coups, ticks, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Revers", revers], ["Revers long", reversLong],
    ["Tole", coups], ["Tics", ticks], ["909", drums]]
if (MESURER) {
    const parts = [["seuil", 0, 16], ["machine", 16, 32], ["signes", 32, 48], ["annonce", 48, 64], ["incubation", 64, 80],
        ["creux", 80, 88], ["attente", 88, 96], ["retour", 96, 112], ["declaration", 112, 128], ["nu", 128, 132],
        ["usure", 132, 144], ["sortie", 144, 160]]
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
        // Les memes mesures que sur les references, sur le bloc du retour (mesures 96 a 112)
        const from = Math.floor(96 * barSec * rate), to = Math.min(n, Math.floor(112 * barSec * rate))
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
                line += " || retour : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
