// TICKLE - Beat Survivor, mode Survie
// Bleep techno - 128 BPM - Mi mineur pentatonique - 146 mesures (4 min 34)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// tickle.src.ts (le morceau) et des instruments du dossier apparat/.
//
// Parti pris : presque rien, mais tres pres de l'oreille. Une grosse caisse,
// une basse tres grave qui glisse d'une note a l'autre (c'est elle la
// melodie), et des petits sons secs. Aucune nappe.
//
// Deuxieme version, reprise a la lumiere des videos d'Underdog (Oscar,
// Underdog Electronic Music School). Ce qui en vient :
// - Une seule idee, bien vendue. Tout sort d'une meme cellule rythmique, trois
//   coups espaces de trois pas (pas 0, 3, 6). Le bip la joue en debut de
//   mesure (l'appel), le bop la rejoue a la demi-mesure (la reponse), les
//   gouttes la rejouent deux pas plus tard (l'ombre). Rien n'est tire au
//   hasard : chaque son parle a un autre et lui laisse sa place.
// - Des phrases de quatre mesures A B A C : la quatrieme tourne autrement
//   (la cellule file tout droit, de trois en trois) pour relancer.
// - Des blocs de 16 mesures, et a chaque bloc quelque chose change de vitesse
//   dans les aigus (charleys, clap, ride, tics).
// - Du contraste plutot que des idees en plus : un passage sombre (tout
//   s'assourdit, seuls les tics restent brillants), un bloc qui demarre sans
//   les graves (mesure 72), deux mesures glissees en trop avant le final
//   (96-98), un passage nu (114-118) avant que tout revienne.
// - Les tics sont une pulsation droite, avec un coup double par mesure.
// - L'important au centre, les details sur les cotes ; jamais tout d'un cote ;
//   la largeur sert de tension (large avant un drop, resserre au drop).
// - Des marqueurs sur le premier temps de quelques blocs, pas de tous.
//
// Instruments : Coup (grosse caisse), Sub (basse) et Bip (les petits sons, un
// seul instrument regle de cinq facons) sont ecrits pour ces morceaux
// (Apparat = instrument scriptable d'openDAW). Charleys, clap, ride : TR-909.

const BPM = 128
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 146
const barSec = 240 / BPM

const COUP: string = __COUP__
const SUB: string = __SUB__
const BIP: string = __BIP__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- La TR-909 d'openDAW (charleys, clap, ride) ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Tickle v2")
project.bpm = BPM

// Une reverb courte, pour le clap et les marqueurs seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.35, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Des blocs de 16 mesures (une demi-minute), sauf les deux creux de 8 et les
// deux mesures glissees avant le final.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Mise", start: 16, bars: 16},
    {name: "Groove", start: 32, bars: 16},
    {name: "Break", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 16},
    {name: "Plus", start: 72, bars: 16},
    {name: "Solo", start: 88, bars: 10},
    {name: "Final", start: 98, bars: 16},
    {name: "Sommet", start: 114, bars: 16},
    {name: "Sortie", start: 130, bars: 16}
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

// ---------- La carte du morceau ----------
/** Les creux : le pied se tait. Le second dure 8 mesures + 2 glissees en trop. */
const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 98)
/** Le bloc qui demarre sans ses graves, une mesure, pour surprendre. */
const sansGraves = (bar: number) => bar === 72
/** Le passage nu : pied, basse et bip seulement, avant que tout revienne. */
const nu = (bar: number) => bar >= 114 && bar < 118
/** Le passage sombre : tout s'assourdit, seuls les tics restent brillants. */
const sombre = (bar: number) => (bar >= 44 && bar < 48) || (bar >= 86 && bar < 88)
/** Le morceau tourne (hors creux, hors toute fin). */
const tourne = (bar: number) => bar >= 4 && bar < 142 && !inBreak(bar)
const kickOn = (bar: number) => tourne(bar) && !sansGraves(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 98 && bar < 130)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 97
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : le pied lache la seconde moitie, ca relance. */
const finDeBloc = (bar: number) => bar === 31 || bar === 71 || bar === 113 || bar === 129
/** Les deux mesures glissees decalent tout : on compte comme si elles n'existaient pas. */
const rel = (bar: number) => bar < 98 ? bar : bar - 2
/** Place dans la phrase de quatre mesures : 0 = A, 1 = B, 2 = A, 3 = C. */
const rang = (bar: number) => rel(bar) % 4

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
    const v = bar < 8 || bar >= 130 ? 0.8 : drop(bar) ? 1 : 0.85
    let out = [[0, v], [4, v], [8, v], [12, v]]
    // Le pied boite un peu, comme dans l'electro : un coup en plus, a contretemps
    if (drop(bar) && rel(bar) % 2 === 1) {out.push([10, 0.7])}
    if (drop(bar) && rel(bar) % 8 === 7) {out.push([14, 0.75])}
    if (finDeBloc(bar)) {out = out.filter(k => k[0] < 8)}
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
// Dans le passage sombre, le pied perd son claquement : il ne reste que le coup sourd
auto("coup", kick, "click", [
    [0, 0.8], [44, 0.8], [46, 0], [55.9, 0], [56, 0.8], [86, 0.8], [87, 0], [97.9, 0], [98, 0.8], [146, 0.8]
])

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

const sub = apparat("Sub", SUB, -13)
regle("sub", sub, "depth", 0.85)
regle("sub", sub, "release", 150)
regle("sub", sub, "glide", 70)
regle("sub", sub, "drive", 0.4)
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))
    let pattern: number[][] | null = null
    if (bar >= 16 && bar < 24) {pattern = B_SIMPLE}
    else if (bar >= 24 && bar < 48) {pattern = B_RIFF}
    else if (bar >= 52 && bar < 56) {pattern = B_SIMPLE}
    else if (bar >= 56 && bar < 88 && !sansGraves(bar)) {pattern = B_RIFF}
    else if (bar >= 88 && bar < 96) {pattern = B_SOLO}
    else if (bar >= 98 && bar < 130) {pattern = B_RIFF}
    else if (bar >= 130 && bar < 138) {pattern = B_SIMPLE}
    if (pattern === null) {return out}
    const v = drop(bar) || (bar >= 88 && bar < 96) ? 1 : 0.8
    const offset = (rel(bar) % 2) * 16
    for (const n of pattern) {
        const step = n[0] - offset
        if (step < 0 || step >= limite(bar)) {continue}
        const length = Math.min(n[1], limite(bar) - step)
        out.push({position: step * S16, duration: length * S16 + (n[3] ? 30 : -40), pitch: n[2], velocity: v})
    }
    return out
})
// La basse se durcit au fil du morceau (0..1 : la saturation)
auto("sub", sub, "drive", [[0, 0.4], [56, 0.5], [98, 0.6], [130, 0.65], [146, 0.5]])

// ---------- La phrase : appel, reponse, ombre ----------
// Une cellule : trois coups espaces de trois pas. [pas, note, velocite].
const E5 = 76, G5 = 79, A5 = 81, B5 = 83, D6 = 86, E6 = 88
type Cell = number[][]
// L'appel du bip, en debut de mesure. A, B, et C : la cellule file tout droit
const APPEL_A: Cell = [[0, E5, 1], [3, B5, 0.8], [6, E5, 0.7]]
const APPEL_B: Cell = [[0, E6, 1], [3, D6, 0.8], [6, B5, 0.7]]
const APPEL_C: Cell = [[0, E5, 1], [3, G5, 0.75], [6, A5, 0.8], [9, B5, 0.85], [12, D6, 0.9], [15, E6, 1]]
// La reponse du bop, a la demi-mesure, une octave plus bas. En C il se tait
const REPONSE_A: Cell = [[8, 64, 0.9], [11, 67, 0.7], [14, 64, 0.8]]
const REPONSE_B: Cell = [[8, 71, 0.9], [11, 69, 0.7], [14, 67, 0.8]]
// L'ombre des gouttes : la meme cellule, deux pas apres chacun des deux autres
const OMBRE_A: Cell = [[2, 95, 0.8], [5, 98, 0.6], [10, 93, 0.8], [13, 91, 0.6]]
const OMBRE_B: Cell = [[2, 98, 0.8], [5, 100, 0.6], [10, 95, 0.8], [13, 93, 0.6]]

/** La cellule d'une mesure selon sa place dans la phrase A B A C. */
function cellule(bar: number, a: Cell, b: Cell, c: Cell | null): Cell | null {
    const r = rang(bar)
    return r === 1 ? b : r === 3 ? c : a
}
/** Les notes d'une cellule ; transpose et gain servent au passage sombre et aux doublures. */
function joue(bar: number, cell: Cell | null, transpose: number = 0, gain: number = 1): Note[] {
    if (cell === null) {return []}
    const out: Note[] = []
    for (const n of cell) {
        if (n[0] >= limite(bar)) {continue}
        out.push({position: n[0] * S16, duration: S16 / 2, pitch: n[1] + transpose, velocity: Math.min(1, n[2] * gain)})
    }
    return out
}

// Le bip : sinusoide nue, la voix du morceau. Au centre, sans retard : c'est
// l'essentiel, il doit rester solide partout
const bip = apparat("Bip", BIP, -6.5)
regle("bip", bip, "decay", 70)
regle("bip", bip, "hold", 25)
regle("bip", bip, "shape", 0.05)
regle("bip", bip, "width", 0.25)
regle("bip", bip, "haas", 0)
// Un echo a trois pas : l'ecart de la cellule
bip.addAudioEffect("Delay", {delay: 13, feedback: 0.35, cross: 1, filter: 0.2, wet: -12})
build(bip.noteTracks[0], "Bip", bar => {
    if ((bar >= 88 && bar < 92) || (bar >= 96 && bar < 98)) {return []}
    // Avant la basse et dans la sortie, la phrase n'a pas encore (ou plus) sa fin
    const entiere = bar >= 24 && bar < 130
    if (bar >= 138 && rang(bar) % 2 === 1) {return []}
    const cell = cellule(bar, APPEL_A, APPEL_B, entiere ? APPEL_C : null)
    if (sombre(bar)) {return joue(bar, cell, -12, 0.8)}
    const out = joue(bar, cell)
    // Au final, le bip se double a l'octave, tout bas : plus d'eclat, pas plus de notes
    if (bar >= 98 && bar < 130 && !nu(bar) && (bar >= 118 || rang(bar) !== 3)) {
        for (const n of joue(bar, cell, 12, 0.45)) {out.push(n)}
    }
    return out
})
// decay 4..800 ms (70 ms = 0.54, 200 ms = 0.74) : le bip s'allonge quand le pied se tait
auto("bip", bip, "decay", [
    [0, 0.62], [8, 0.54], [48, 0.54], [48, 0.74], [56, 0.74], [56, 0.54], [88, 0.54],
    [88, 0.72], [98, 0.72], [98, 0.54], [130, 0.54], [138, 0.66], [146, 0.70]
])
// Le bip se durcit un peu de bloc en bloc, et redevient pur dans le passage sombre
auto("bip", bip, "shape", [
    [0, 0.05], [43.9, 0.05], [44, 0], [56, 0], [56, 0.05], [72, 0.12], [85.9, 0.12], [86, 0],
    [98, 0], [98, 0.15], [118, 0.25], [130, 0.10], [146, 0.05]
])

// Le bop : la reponse. Plus carre, et il tombe sur sa note comme un coup sur du bois
const bop = apparat("Bop", BIP, -7.5)
regle("bop", bop, "decay", 50)
regle("bop", bop, "hold", 10)
regle("bop", bop, "bend", 0.3)
regle("bop", bop, "bendms", 8)
regle("bop", bop, "shape", 0.5)
regle("bop", bop, "width", 0.45)
regle("bop", bop, "haas", 0)
build(bop.noteTracks[0], "Bop", bar => {
    const on = (bar >= 24 && bar < 48) || (bar >= 56 && bar < 88) || (bar >= 98 && bar < 130)
    if (!on || nu(bar)) {return []}
    const cell = cellule(bar, REPONSE_A, REPONSE_B, null)
    if (sombre(bar)) {return joue(bar, cell, -12, 0.8)}
    const out = joue(bar, cell)
    if (bar >= 118) {for (const n of joue(bar, cell, -12, 0.5)) {out.push(n)}}
    return out
})
// Le bop se durcit au fil du morceau
auto("bop", bop, "shape", [[0, 0.35], [48, 0.45], [56, 0.50], [88, 0.65], [98, 0.65], [130, 0.85], [146, 0.85]])

// Les gouttes : des bips tres courts qui montent d'une octave sur leur note.
// Elles n'arrivent que dans certains blocs : c'est la couche en plus. On les
// decouvre seules dans le premier creux. Sur les cotes, avec du retard.
const drops = apparat("Gouttes", BIP, -8)
regle("gouttes", drops, "decay", 35)
regle("gouttes", drops, "hold", 0)
regle("gouttes", drops, "bend", -1)
regle("gouttes", drops, "bendms", 25)
regle("gouttes", drops, "width", 0.8)
regle("gouttes", drops, "haas", 10)
drops.addAudioEffect("Delay", {delay: 11, feedback: 0.35, cross: 1, filter: 0.3, wet: -13})
build(drops.noteTracks[0], "Gouttes", bar => {
    // Les balles : avant un creux elle s'eteint, avant un drop elle enfle
    if (bar === 47 || bar === 87 || bar === 96) {return rebond(0, 16, 14, 0.82, 100, -0.6, false)}
    if (avantDrop(bar)) {return rebond(0, 12, 14, 0.8, 88, 0.9, true)}
    if (finDeBloc(bar)) {return rebond(8, 8, 9, 0.8, 95, -0.5, false)}
    const on = (bar >= 48 && bar < 55) || (bar >= 72 && bar < 86) || (bar >= 98 && bar < 130)
    if (!on || nu(bar)) {return []}
    return joue(bar, cellule(bar, OMBRE_A, OMBRE_B, null))
})

// Les tics : quelques millisecondes, tout en haut, tout pres. Une pulsation
// droite (croches, puis doubles-croches), plus forte sur le temps, et un coup
// double par mesure. En fin de phrase, une rafale.
const tics = apparat("Tics", BIP, -9)
regle("tics", tics, "decay", 6)
regle("tics", tics, "hold", 2)
regle("tics", tics, "bend", 1.5)
regle("tics", tics, "bendms", 4)
regle("tics", tics, "width", 0.7)
regle("tics", tics, "haas", 8)
const FORCE = [0.9, 0.4, 0.65, 0.4]
const HAUTEUR = [112, 115, 108, 115]
build(tics.noteTracks[0], "Tics", bar => {
    if (nu(bar)) {return []}
    const out: Note[] = []
    const croches = bar < 32 || inBreak(bar) || bar >= 138
    const gain = inBreak(bar) || sombre(bar) ? 1 : bar < 8 || bar >= 138 ? 0.9 : 0.75
    const r = rang(bar)
    const rafale = r === 3 && !avantDrop(bar) && bar < 142
    const fin = rafale ? 12 : limite(bar)
    for (let step = 0; step < fin; step += croches ? 2 : 1) {
        out.push({position: step * S16, duration: 30, pitch: HAUTEUR[step % 4], velocity: FORCE[step % 4] * gain})
    }
    // Le coup double : une fois par mesure, pas au meme endroit en A et en B
    const double = r === 1 ? 14 : 6
    if (!rafale && double < fin) {
        out.push({position: double * S16 + S16 / 2, duration: 30, pitch: 115, velocity: 0.55 * gain})
    }
    if (rafale) {
        for (let k = 0; k < 6; k++) {
            out.push({position: 12 * S16 + k * S16 / 2 + S16 / 4, duration: 30, pitch: 112 + (k % 3) * 2, velocity: 0.45 + k * 0.1})
        }
    }
    return out
})

// La largeur sert de tension : large quand ca monte, resserre au drop, puis ca se rouvre
auto("tics", tics, "width", [
    [0, 0.7], [44, 0.7], [46, 1], [56, 1], [56, 0.25], [64, 0.7], [86, 0.7], [87, 1], [98, 1],
    [98, 0.25], [106, 0.7], [118, 0.7], [118, 0.3], [126, 0.75], [138, 0.8], [146, 1]
])
auto("gouttes", drops, "width", [
    [0, 0.8], [48, 1], [56, 1], [56, 0.3], [72, 0.3], [80, 0.8], [98, 0.8], [98, 0.3], [106, 0.8],
    [118, 0.8], [118, 0.3], [126, 0.85], [146, 0.85]
])

// Les marqueurs : un bip long qui tombe sur sa note et se noie dans son echo,
// sur le premier temps de quelques blocs seulement. Une reponse le suit, un
// pas avant le troisieme temps. [mesure, note, note decalee d'un pas].
const MARQUES = [[16, 76, 88], [56, 83, 88], [73, 76, 88], [98, 86, 91], [118, 76, 88]]
const mark = apparat("Marque", BIP, -10)
regle("marque", mark, "decay", 500)
regle("marque", mark, "hold", 40)
regle("marque", mark, "bend", 1)
regle("marque", mark, "bendms", 60)
regle("marque", mark, "shape", 0.15)
regle("marque", mark, "width", 0)
regle("marque", mark, "haas", 0)
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

// ---------- Charleys, clap, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -4})
const CLAP = 39, HAT_C = 42, HAT_O = 46, RIDE = 51
const kit: [string, number, any][] = [
    ["Clap", CLAP, {volume: -1}],
    ["Closed Hat", HAT_C, {volume: -6, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -6, panning: 0.1, exclude: true}],
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
    if (!tourne(bar) || sombre(bar) || nu(bar) || bar < 8) {return 0}
    if (bar < 32) {return 1}   // charley ferme a contretemps
    if (bar < 72) {return 2}   // charley ouvert a contretemps (et les tics passent en doubles-croches)
    if (bar < 118) {return 3}  // + un charley ferme juste avant chaque temps, tout bas
    if (bar < 130) {return 4}  // + la ride
    return 1
}

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const v = vitesse(bar), d = drop(bar)
    if (v === 0) {return out}
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        // Le clap sur 2 et 4 arrive a la mesure 24, avec le riff de basse
        if (bar >= 24 && bar < 138 && step % 8 === 4) {hit(step, CLAP, d ? 0.95 : 0.8)}
        if (beat === 2) {hit(step, v >= 2 ? HAT_O : HAT_C, v >= 2 ? (d ? 0.8 : 0.65) : 0.55)}
        // Un seul charley en plus : les doubles-croches, ce sont les tics qui les font
        if (v >= 3 && beat === 3) {hit(step, HAT_C, 0.25)}
        if (v >= 4 && step % 2 === 0) {hit(step, RIDE, beat === 2 ? 0.5 : 0.35)}
    }
    // Fin de bloc : le clap bafouille
    if (finDeBloc(bar)) {hit(13, CLAP, 0.5); hit(15, CLAP, 0.65)}
    return out
})

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees
// (0 dB = rien, c'est au centre ; -3 dB = normal pour un son large ; bien
// en dessous = des choses s'annulent).
const MESURER = true
const ISOLER = false
const units: any[] = [kick, sub, bip, bop, drops, tics, mark, drums]
const STEMS: [string, any][] = [["Coup", kick], ["Sub", sub], ["Bip", bip], ["Bop", bop],
    ["Gouttes", drops], ["Tics", tics], ["Marque", mark], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 16], ["mise", 16, 32], ["groove", 32, 44], ["sombre", 44, 48], ["break", 48, 56],
        ["drop", 56, 72], ["plus", 72, 88], ["solo", 88, 98], ["final", 98, 114], ["nu", 114, 118],
        ["sommet", 118, 130], ["sortie", 130, 146]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const R = audio.frames.length > 1 ? audio.frames[1] : L
        const n = L.length
        let peakValue = 0, sumL = 0, sumR = 0, sumM = 0
        for (let i = 0; i < n; i++) {
            const a = Math.abs(L[i])
            if (a > peakValue) {peakValue = a}
            const m = (L[i] + R[i]) / 2
            sumL += L[i] * L[i]
            sumR += R[i] * R[i]
            sumM += m * m
        }
        const mono = sumL + sumR > 0 ? (10 * Math.log10(2 * sumM / (sumL + sumR))).toFixed(1) : "0"
        const cells: string[] = []
        for (const s of parts) {
            const from = Math.max(1, Math.floor((s[1] as number) * barSec * rate))
            const to = Math.min(n, Math.floor((s[2] as number) * barSec * rate))
            let sx = 0, sd = 0
            for (let i = from; i < to; i++) {const d = L[i] - L[i - 1]; sx += L[i] * L[i]; sd += d * d}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / (to - from))).toFixed(1) + "dB " + Math.round(Math.sqrt(sd / sx) * rate / (2 * Math.PI)) + "Hz" : "silence"))
        }
        report.push(stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " mono " + mono + "dB : " + cells.join(", "))
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
