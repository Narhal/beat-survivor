// GLAS - Beat Survivor, mode Survie
// Dubstep lourde et lugubre - 140 BPM - Sol phrygien - 144 mesures (4 min 07)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de glas.src.ts
// (le morceau) et des instruments du dossier apparat/.
//
// Le glas, c'est la cloche des morts. Ici : une cloche grave qui sonne deux
// notes a un demi-ton l'une de l'autre, Sol et La bemol, et qui revient
// seule entre les blocs. Dessous, la dubstep : un tempo de 140 joue a
// demi-vitesse (le pied sur le premier temps, la caisse claire sur le
// troisieme), un sub tres bas qui porte tout le poids, et au-dessus de lui
// une basse qui gronde et qui parle.
//
// Deux references ont ete mesurees avant d'ecrire (Kryptic Minds - Six
// Degrees, Distance - Night Vision) : sub vers 49-50 Hz dans les deux, donc
// le morceau est en Sol ; grave plus lourd et aigu bien plus sombre que dans
// nos morceaux techno. Ce sont les cibles du mix.
//
// Ce qui vient des notes du vault (Dash Glitch, Underdog) :
// - deux instruments neufs. Gouffre : le sub, une sinusoide dont chaque note
//   detachee repart de la meme phase. Gueule : la basse qui gronde, trois
//   dents de scie desaccordees et un grognement d'harmoniques ecrases, dans
//   un filtre que fait bouger une horloge ;
// - la vitesse de cette horloge est ecrite dans chaque note, par la velocite :
//   noire, croche, triolet, double-croche. Le timbre change a chaque note,
//   sans automation ;
// - le grave est a un seul instrument (le sub), la basse qui gronde est
//   coupee en dessous de 90 Hz et saturee sans lui ;
// - arrangement par soustraction, un bloc qui demarre sans sa basse.
// Aucun souffle, aucune nappe : le lugubre vient de la cloche, du silence et
// du demi-ton. Pour le jeu : avant chaque drop, une demi-mesure de silence.
//
// Instruments : Frappe (grosse caisse), Gouffre (sub), Gueule (basse et
// bourdon), Lueur (le glas, les os) et Gresil (tics, tocs) sont ecrits pour
// ces morceaux (Apparat = instrument scriptable d'openDAW). Caisse claire et
// clap : TR-909.

const BPM = 140
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : l'horloge de la basse compte en pas. */
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const GOUFFRE: string = __GOUFFRE_L__
const GUEULE: string = __GUEULE_L__
const LUEUR: string = __LUEUR_L__
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
const project = openDAW.newProject("Glas")
project.bpm = BPM

// Une reverb : la caisse claire, le glas et les os. Rien d'autre.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.7, damping: 0.55, preDelay: 18, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seul", start: 0, bars: 8},
    {name: "Approche", start: 8, bars: 16},
    {name: "Drop 1a", start: 24, bars: 16},
    {name: "Drop 1b", start: 40, bars: 16},
    {name: "Creux", start: 56, bars: 16},
    {name: "Drop 2a", start: 72, bars: 16},
    {name: "Drop 2b", start: 88, bars: 16},
    {name: "Drop 2c", start: 104, bars: 16},
    {name: "Sortie", start: 120, bars: 24}
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

// ---------- La carte du morceau ----------
/** Les drops : la batterie entiere, le sub et la basse qui gronde. */
const drop = (bar: number) => (bar >= 24 && bar < 56) || (bar >= 72 && bar < 120)
/** Le bloc qui demarre sans sa basse : quatre mesures de batterie et de sub. */
const nu = (bar: number) => bar >= 88 && bar < 92
/** La mesure qui precede un drop : la seconde moitie reste vide. */
const avantDrop = (bar: number) => bar === 23 || bar === 71
const limite = (bar: number) => avantDrop(bar) ? 8 : 16
/** Derniere mesure d'un bloc de seize : une relance. */
const finDeBloc = (bar: number) => [39, 55, 87, 103, 119].includes(bar)
const rang = (bar: number) => bar % 4
/** Le pied et la caisse claire : absents au debut, legers a l'approche et dans la sortie. */
const batterie = (bar: number): number =>
    drop(bar) ? 1 : (bar >= 16 && bar < 24) || (bar >= 64 && bar < 72) || (bar >= 120 && bar < 132) ? 0.8 : 0

/** Les coups de pied d'une mesure : [pas, velocite]. Demi-vitesse : le pied tombe sur le premier temps. */
function kicks(bar: number): number[][] {
    const b = batterie(bar)
    if (b === 0) {return bar >= 8 && bar < 16 ? [[0, 0.6]] : []}
    const out: number[][] = [[0, b]]
    if (b === 1) {
        // Un second coup, deplace d'une mesure a l'autre ; trois en fin de phrase
        if (rang(bar) === 1) {out.push([11, 0.85])} else {out.push([10, 0.9])}
        if (rang(bar) === 3) {out.push([6, 0.75])}
    }
    return out.filter(k => k[0] < limite(bar))
}
/** La note 12 ne sonne pas : elle creuse le sub a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Sol 1 = 49 Hz : le sub. La basse qui gronde joue une octave au-dessus.
const SOL1 = 31, SOL2 = 43

// ---------- Les phrases de basse ----------
// Chaque note : [pas, longueur en pas, demi-tons au-dessus du Sol, vitesse de l'horloge].
// La vitesse est la velocite que lit la Gueule : 0,3 = le filtre retombe
// ("ouaaa") ; 0,4 = blanche ; 0,5 = noire ; 0,6 = triolet de noires ; 0,7 =
// croche ; 0,8 = triolet de croches ; 0,9 = double-croche ; 1,0 = triolet de
// doubles-croches. Les longueurs tombent juste : trois battements de triolet
// dans une blanche, deux croches dans une noire.
// 1 = La bemol (le demi-ton), 3 = Si bemol, -2 = Fa.
type Phrase = number[][][]
const P1: Phrase = [
    [[0, 8, 0, 0.6], [8, 4, 0, 0.7], [12, 4, 1, 0.3]],
    [[0, 8, 0, 0.5], [8, 4, 3, 0.8], [12, 2, 0, 0.9]],
    [[0, 8, 0, 0.6], [8, 4, 0, 0.7], [12, 4, 1, 0.3]],
    [[0, 8, 0, 0.6], [8, 8, -2, 0.4]]
]
const P2: Phrase = [
    [[0, 4, 0, 0.8], [4, 4, 0, 0.7], [8, 8, 1, 0.6]],
    [[0, 6, 0, 0.7], [8, 4, 3, 0.8], [12, 4, 1, 0.3]],
    [[0, 4, 0, 0.8], [4, 4, 0, 0.7], [8, 8, 1, 0.6]],
    [[0, 8, -2, 0.5], [8, 4, 0, 0.9], [12, 4, 1, 0.3]]
]
const P3: Phrase = [
    [[0, 2, 0, 0.9], [2, 6, 0, 0.7], [8, 4, 0, 1.0], [12, 4, 1, 0.5]],
    [[0, 8, 0, 0.6], [8, 2, 3, 0.9], [10, 2, 1, 0.9], [12, 4, 0, 0.3]],
    [[0, 2, 0, 0.9], [2, 6, 0, 0.7], [8, 4, 0, 1.0], [12, 4, 1, 0.5]],
    [[0, 8, 0, 0.5], [8, 8, -2, 0.6]]
]
/** La phrase d'un bloc. */
function phraseDe(bar: number): Phrase | null {
    if (!drop(bar) || nu(bar)) {return null}
    if (bar < 40) {return P1}
    if (bar < 56) {return P2}
    if (bar < 88) {return P3}
    if (bar < 104) {return P1}
    return rang(Math.floor(bar / 4)) % 2 === 0 ? P3 : P2
}
/** Les notes de la mesure, coupees avant un drop. */
const notesDe = (bar: number): number[][] => {
    const p = phraseDe(bar)
    return p === null ? [] : p[rang(bar)].filter(n => n[0] < limite(bar))
}

// ---------- Frappe : la grosse caisse ----------
// Courte, accordee au-dessus du sub (58 Hz) : elle claque, et laisse le
// grave au sub.
const kick = apparat("Frappe", FRAPPE, -6)
reglages("frappe", kick, {tune: 58, start: 420, sweep: 40, decay: 95, punch: 0.7, click: 0.6, drive: 0.5})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))

// ---------- Gouffre : le sub ----------
// Il suit la basse qui gronde, une octave en dessous. Dans une mesure, ses
// notes se chevauchent : la hauteur glisse de l'une a l'autre. Il s'arrete
// avant la mesure suivante : chaque mesure repart de la meme phase, sous le
// meme coup de pied.
const sub = apparat("Gouffre", GOUFFRE, -12)
reglages("gouffre", sub, {attack: 14, release: 70, glide: 70, harm: 0.25, depth: 0.85, dipms: 130})
build(sub.noteTracks[0], "Gouffre", bar => {
    const out: Note[] = plongeons(bar)
    let notes = notesDe(bar)
    // Le bloc nu et la sortie : une seule note longue, le Sol. Avant un drop, pas de sub :
    // c'est le drop qui l'apporte.
    if (nu(bar) || (bar >= 120 && bar < 132)) {
        notes = [[0, Math.min(14, limite(bar)), rang(bar) === 3 && !avantDrop(bar) ? 1 : 0, 0]]
    }
    notes.forEach((n, k) => {
        const suivante = notes[k + 1]
        const liee = suivante !== undefined && suivante[0] === n[0] + n[1]
        const fin = Math.min(n[0] + n[1], 15.5)
        out.push({
            position: n[0] * S16,
            duration: Math.round((fin - n[0]) * S16 + (liee ? 40 : -30)),
            pitch: SOL1 + n[2], velocity: 1
        })
    })
    return out
})

// ---------- Gueule : la basse qui gronde ----------
const growl = apparat("Gueule", GUEULE, 2)
reglages("gueule", growl, {
    pas: PAS_MS, detune: 16, growl: 0.5, rank: 11, cutoff: 170, depth: 4, reso: 0.45, vowel: 0.45,
    shape: 0.3, drive: 0.65, tone: 4600, lowcut: 95, width: 0.6, glide: 60
})
build(growl.noteTracks[0], "Gueule", bar =>
    notesDe(bar).map(n => ({
        position: n[0] * S16, duration: Math.round(n[1] * S16 - 24), pitch: SOL2 + n[2], velocity: n[3]
    })))
// Elle parle de plus en plus : la bouche s'ouvre d'un bloc a l'autre
auto("gueule", growl, "vowel", [
    [0, 0.3], [24, 0.3], [40, 0.45], [56, 0.5], [72, 0.6], [88, 0.4], [104, 0.7], [120, 0.7], [144, 0.3]
])
auto("gueule", growl, "depth", enDroit([
    [0, 3.4], [24, 3.4], [56, 4.0], [72, 4.2], [104, 4.6], [120, 4.6], [144, 3.4]
], 0, 6))
auto("gueule", growl, "growl", [
    [0, 0.35], [24, 0.35], [56, 0.5], [72, 0.6], [88, 0.45], [104, 0.7], [144, 0.35]
])
// "shape" : ronde dans le premier drop ("woub"), plus tranchante dans le second ("yoi")
auto("gueule", growl, "shape", [[0, 0.2], [56, 0.3], [72, 0.5], [104, 0.6], [144, 0.2]])

// ---------- Le bourdon ----------
// La meme basse, fermee et lente, hors des drops : une note tenue qui
// respire une fois par blanche. Elle tient les passages vides sans les remplir.
const drone = apparat("Bourdon", GUEULE, -5)
reglages("bourdon", drone, {
    pas: PAS_MS, detune: 9, growl: 0.2, rank: 7, cutoff: 80, depth: 2.2, reso: 0.3, vowel: 0.55,
    shape: 0, drive: 0.4, tone: 1400, lowcut: 80, width: 0.8, glide: 300
})
build(drone.noteTracks[0], "Bourdon", bar => {
    const on = bar < 24 || (bar >= 56 && bar < 72) || bar >= 120
    if (!on || avantDrop(bar) || bar >= 142) {return []}
    // Une note par mesure, liee a la suivante : Sol, et le La bemol une mesure sur quatre
    const pitch = rang(bar) === 3 ? SOL2 + 1 : SOL2
    const suite = !avantDrop(bar + 1) && bar + 1 !== 24 && bar + 1 !== 72 && bar + 1 < 142
    return [{position: 0, duration: BAR + (suite ? 40 : -200), pitch, velocity: 0.4}]
})
auto("bourdon", drone, "volume", [
    [0, 0.35], [8, 0.5], [22, 0.6], [24, 0.6], [56, 0.5], [70, 0.62], [72, 0.6], [120, 0.5], [136, 0.5], [142, 0.3], [144, 0.3]
])

// ---------- Le glas ----------
// Une cloche grave, tres longue, qui sonne deux notes a un demi-ton : Sol et
// La bemol. Elle ouvre le morceau seule, marque les blocs, et le referme.
const GLAS: {[bar: number]: number[]} = {
    0: [55, 56], 4: [55], 8: [55, 56], 16: [55], 24: [43, 55], 40: [55, 56], 56: [55, 56], 60: [55],
    64: [55, 56], 72: [43, 55], 104: [55, 56], 120: [55, 56], 128: [55], 136: [55, 56], 140: [43]
}
const bell = apparat("Glas", LUEUR, -4)
reglages("glas", bell, {
    decay: 3800, matter: 0.6, strike: 0.5, damp: 0.3, chirp: 0, grain: 0.5, tonic: SOL2, just: 0,
    drift: 0.2, duck: 0, width: 0.6, drive: 0.15
})
bell.addAudioEffect("Delay", {delay: 13, feedback: 0.45, cross: 1, filter: 0.3, wet: -14})
bell.addSend(reverb, {amount: -8})
build(bell.noteTracks[0], "Glas", bar => {
    const notes = GLAS[bar]
    if (!notes) {return []}
    // La seconde note tombe un temps apres la premiere : les deux battent l'une contre l'autre
    return notes.map((pitch, k) => ({position: k * 4 * S16, duration: S16, pitch, velocity: k === 0 ? 1 : 0.75}))
})

// ---------- Les os ----------
// La meme percussion, tres courte, haute, en matiere de lame : un cliquetis
// rare, pris dans un echo.
const OS = [86, 89, 91]
const bones = apparat("Os", LUEUR, -2, 0.2)
reglages("os", bones, {
    decay: 55, matter: 0.95, strike: 0.75, damp: 0.7, chirp: 0, grain: 0.6, tonic: SOL2, just: 0,
    drift: 0.6, duck: 0, width: 0.8, drive: 0.1
})
bones.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.35, wet: -9})
bones.addSend(reverb, {amount: -16})
build(bones.noteTracks[0], "Os", bar => {
    const out: Note[] = []
    const on = (bar >= 8 && bar < 24) || (bar >= 40 && bar < 72) || (bar >= 104 && bar < 136)
    if (!on || avantDrop(bar)) {return out}
    const hit = (pos: number, k: number, velocity: number) => out.push({position: Math.round(pos * S16), duration: S16 / 2, pitch: OS[k], velocity})
    if (rang(bar) === 0) {hit(6, 0, 0.8)}
    if (rang(bar) === 1) {hit(3, 1, 0.6); hit(14, 0, 0.7)}
    // Une mesure sur quatre : trois coups en triolet
    if (rang(bar) === 3) {hit(4, 2, 0.8); hit(4 + 4 / 3, 1, 0.6); hit(4 + 8 / 3, 0, 0.7)}
    return out
})

// ---------- Gresil : les tics ----------
// Peu d'aigus : la dubstep sombre en a tres peu. Des croches a contretemps,
// et un triolet en fin de phrase.
const ticks = apparat("Tics", GRESIL, 6)
reglages("tics", ticks, {
    decay: 26, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7000, drift: 0.5, width: 0.5, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    if (b === 0 && !(bar >= 8 && bar < 16)) {return out}
    const hit = (pos: number, velocity: number) => {
        if (pos < limite(bar)) {out.push({position: Math.round(pos * S16), duration: S16 / 2, pitch: TIC, velocity})}
    }
    hit(2, 0.7); hit(6, 0.5); hit(10, 0.7); hit(14, 0.5)
    if (b === 1 && bar >= 40) {hit(13, 0.3); hit(15, 0.35)}
    if (b === 1 && rang(bar) === 3) {hit(12, 0.6); hit(12 + 4 / 3, 0.45); hit(12 + 8 / 3, 0.55)}
    return out
})

// ---------- Gresil : les tocs ----------
// Un coup sourd, grave, rare : la reponse au pied.
const tocs = apparat("Tocs", GRESIL, -9, -0.15)
reglages("tocs", tocs, {
    decay: 110, index: 2.2, snap: 5, body: 0.1, r2: 1.48, r3: 3.7, noise: 0.1, chirp: 9,
    lowcut: 110, drift: 0.5, width: 0.4, duck: 0
})
tocs.addAudioEffect("Delay", {delay: 13, feedback: 0.35, cross: 1, filter: 0.3, wet: -15})
build(tocs.noteTracks[0], "Tocs", bar => {
    const out: Note[] = []
    if (avantDrop(bar) || bar >= 136) {return out}
    const hit = (step: number, pitch: number, velocity: number) => out.push({position: step * S16, duration: S16 / 2, pitch, velocity})
    // Au debut et dans le creux, il est presque seul
    if (bar < 24 || (bar >= 56 && bar < 72) || bar >= 120) {
        if (rang(bar) === 1) {hit(4, 50, 0.8); hit(7, 46, 0.6)}
        if (rang(bar) === 3) {hit(10, 50, 0.7); hit(14, 53, 0.8)}
        return out
    }
    if (nu(bar)) {return out}
    if (rang(bar) === 1) {hit(14, 50, 0.7)}
    if (rang(bar) === 3) {hit(3, 46, 0.7)}
    if (finDeBloc(bar)) {hit(12, 53, 0.7); hit(13, 50, 0.8); hit(14, 46, 0.9)}
    return out
})

// ---------- Caisse claire et clap : TR-909 ----------
// La caisse claire tombe sur le troisieme temps, le clap la double. Un peu
// de reverb : c'est le seul son du morceau qui a droit a une salle.
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: 0})
const SNARE = 38, CLAP = 39
const kit: [string, number, any][] = [
    ["Snare", SNARE, {volume: -2}],
    ["Clap", CLAP, {volume: -7}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 6, outputGain: -4, mix: 0.6} as any))
drums.addSend(reverb, {amount: -13})
build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    if (b === 0) {return out}
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})}
    }
    hit(8, SNARE, b); hit(8, CLAP, b * 0.8)
    if (b === 1 && (rang(bar) === 1 || rang(bar) === 3)) {hit(15, SNARE, 0.35)}
    // En fin de bloc, la caisse claire roule
    if (finDeBloc(bar)) {hit(12, SNARE, 0.5); hit(13, SNARE, 0.6); hit(14, SNARE, 0.75); hit(15, SNARE, 0.9)}
    return out
})

// Limiteur de sortie. Un cran de moins que dans les morceaux techno : les references de
// dubstep gardent plus d'ecart entre la crete et le niveau moyen.
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -2} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le premier drop, on mesure aussi ce qu'on a mesure sur les references.
const MESURER = true
const ISOLER = false
const units: any[] = [kick, sub, growl, drone, bell, bones, ticks, tocs, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Gouffre", sub], ["Gueule", growl], ["Bourdon", drone],
    ["Glas", bell], ["Os", bones], ["Tics", ticks], ["Tocs", tocs], ["909", drums]]
if (MESURER) {
    const parts = [["seul", 0, 8], ["approche", 8, 24], ["drop1a", 24, 40], ["drop1b", 40, 56], ["creux", 56, 72],
        ["drop2a", 72, 88], ["nu", 88, 92], ["drop2b", 92, 104], ["drop2c", 104, 120], ["sortie", 120, 144]]
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
        // Les memes mesures que sur les references, sur le premier drop (mesures 24 a 40)
        const from = Math.floor(24 * barSec * rate), to = Math.min(n, Math.floor(40 * barSec * rate))
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
                line += " || drop : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
