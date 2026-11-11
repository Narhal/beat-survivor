// TICKLE - Beat Survivor, mode Survie
// Bleep techno - 128 BPM - Mi mineur, avec le Fa du phrygien en passage - 146 mesures (4 min 34)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// tickle.src.ts (le morceau) et des instruments du dossier apparat/.
//
// Parti pris : presque rien, mais tres pres de l'oreille. Une grosse caisse,
// une basse tres grave qui glisse d'une note a l'autre (c'est elle la
// melodie), et des petits sons secs. Aucune nappe.
//
// Troisieme version. Retour de N4 sur la deuxieme : "le son du bip est
// desagreable, il detruit les oreilles ; naif dans sa conception, on dirait
// une simple cloche de base mais saturee". Mesure faite, ses notes hautes et
// leur doublure a l'octave tombaient entre 2,3 et 2,6 kHz, la ou l'oreille
// est la plus sensible, tenues et ecrasees. Ce qui change, d'apres l'etude
// complete de la chaine d'Underdog (voir le vault : "Underdog - Sound design") :
// - Un nouvel instrument, le Blip, pour le bip, le bop, les gouttes et les
//   marqueurs. Chaque note a une attaque (un souffle, un eclat qui s'eteint),
//   un corps rond et une fin ; rien n'est sature ; une note plus forte est
//   plus claire et plus longue.
// - Tout descend d'une octave. Plus de doublure a l'octave au final : l'eclat
//   vient du timbre, qui s'ouvre lentement tout le long du morceau.
// - Les notes ordinaires sont plus douces, seuls les accents brillent.
// - Deux notes de suite ne sont jamais identiques (ecart a peine audible).
// - Le bip et le bop plongent un peu sous chaque coup de pied.
// - L'echo n'est plus permanent : il n'est lance que sur une ou deux notes par
//   phrase, par une piste a part.
// - Les tics montent au-dessus de 6 kHz, hors de la zone qui fatigue.
// - La basse touche le Fa (le demi-ton au-dessus de la tonique) en fin de riff.
// Ce qui reste de la deuxieme version : une seule cellule rythmique (trois
// coups espaces de trois pas) partagee par le bip (appel), le bop (reponse)
// et les gouttes (ombre) ; des phrases A B A C ; des blocs de 16 mesures ou
// les aigus changent de vitesse ; un passage sombre, un bloc sans ses graves,
// deux mesures glissees avant le final, un passage nu ; la largeur stereo
// comme tension.
//
// Instruments : Coup (grosse caisse), Sub (basse), Blip (les petits sons) et
// Bip (les tics seulement) sont ecrits pour ces morceaux (Apparat =
// instrument scriptable d'openDAW). Charleys, clap, ride : TR-909.

const BPM = 128
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 146
const barSec = 240 / BPM

const COUP: string = __COUP__
const SUB: string = __SUB__
const BIP: string = __BIP__
const BLIP: string = __BLIP__

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
const project = openDAW.newProject("Tickle v3")
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
/** Regle plusieurs parametres d'un instrument d'un coup. */
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
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// ---------- Coup : la grosse caisse ----------
const kick = apparat("Coup", COUP, -5)
reglages("coup", kick, {tune: 44, sweep: 0.7, decay: 130, click: 0.8, drive: 0.2})
build(kick.noteTracks[0], "Coup", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
// Dans le passage sombre, le pied perd son claquement : il ne reste que le coup sourd
auto("coup", kick, "click", [
    [0, 0.8], [44, 0.8], [46, 0], [55.9, 0], [56, 0.8], [86, 0.8], [87, 0], [97.9, 0], [98, 0.8], [146, 0.8]
])

// ---------- Sub : la basse, et c'est elle la melodie ----------
// Motifs de deux mesures : [pas 0..31, longueur en pas, note, liee].
// Une note liee deborde sur la suivante : la basse glisse au lieu de rattaquer.
const MI = 28, SOL = 31, LA = 33, SI = 35, RE = 38, MI2 = 40, FA2 = 41
const B_SIMPLE = [[0, 14, MI, 0], [16, 6, MI, 1], [22, 2, SOL, 0], [24, 7, MI, 0]]
// Le riff finit sur Re, Fa, Mi : le Fa (demi-ton au-dessus de la tonique) assombrit le retour
const B_RIFF = [
    [0, 6, MI, 1], [6, 2, SOL, 0], [8, 6, MI, 0], [14, 2, SI, 0],
    [16, 6, MI, 1], [22, 4, LA, 1], [26, 2, SOL, 0], [28, 2, RE, 1], [30, 1, FA2, 1], [31, 1, MI2, 0]
]
const B_SOLO = [[0, 12, MI, 1], [12, 4, MI2, 1], [16, 8, RE, 1], [24, 4, LA, 1], [28, 4, SOL, 0]]

const sub = apparat("Sub", SUB, -13)
reglages("sub", sub, {depth: 0.85, release: 150, glide: 70, drive: 0.4})
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = plongeons(bar)
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
// Le premier coup est l'accent ; les autres sont plus doux, donc plus sombres
// et plus courts (l'instrument lie la force a la clarte et a la longueur).
const E4 = 64, G4 = 67, A4 = 69, B4 = 71, D5 = 74, E5 = 76
type Cell = number[][]
// L'appel du bip, en debut de mesure. A, B, et C : la cellule file tout droit
const APPEL_A: Cell = [[0, E4, 1], [3, B4, 0.65], [6, E4, 0.6]]
const APPEL_B: Cell = [[0, E5, 1], [3, D5, 0.65], [6, B4, 0.6]]
const APPEL_C: Cell = [[0, E4, 1], [3, G4, 0.6], [6, A4, 0.65], [9, B4, 0.7], [12, D5, 0.8], [15, E5, 1]]
// La reponse du bop, a la demi-mesure, une octave plus bas. En C il se tait
const REPONSE_A: Cell = [[8, 52, 0.9], [11, 55, 0.6], [14, 52, 0.7]]
const REPONSE_B: Cell = [[8, 59, 0.9], [11, 57, 0.6], [14, 55, 0.7]]
// L'ombre des gouttes : la meme cellule, deux pas apres chacun des deux autres
const OMBRE_A: Cell = [[2, 83, 0.8], [5, 86, 0.55], [10, 81, 0.8], [13, 79, 0.55]]
const OMBRE_B: Cell = [[2, 86, 0.8], [5, 88, 0.55], [10, 83, 0.8], [13, 81, 0.55]]

/** La cellule d'une mesure selon sa place dans la phrase A B A C. */
function cellule(bar: number, a: Cell, b: Cell, c: Cell | null): Cell | null {
    const r = rang(bar)
    return r === 1 ? b : r === 3 ? c : a
}
/** Les notes d'une cellule ; gain sert au passage sombre. */
function joue(bar: number, cell: Cell | null, gain: number = 1): Note[] {
    if (cell === null) {return []}
    const out: Note[] = []
    for (const n of cell) {
        if (n[0] >= limite(bar)) {continue}
        out.push({position: n[0] * S16, duration: S16 / 2, pitch: n[1], velocity: Math.min(1, n[2] * gain)})
    }
    return out
}
/** La cellule du bip a une mesure donnee (rien quand il se tait). */
function appel(bar: number): Cell | null {
    if ((bar >= 88 && bar < 92) || (bar >= 96 && bar < 98)) {return null}
    if (bar >= 138 && rang(bar) % 2 === 1) {return null}
    // Avant la basse et dans la sortie, la phrase n'a pas encore (ou plus) sa fin
    const entiere = bar >= 24 && bar < 130
    return cellule(bar, APPEL_A, APPEL_B, entiere ? APPEL_C : null)
}

// Le bip : la voix du morceau. Au centre, sans retard ni echo : c'est
// l'essentiel, il doit rester net et solide partout
const bip = apparat("Bip", BLIP, -3.5)
reglages("bip", bip, {
    long: 60, tone: 0.35, bite: 0.9, ratio: 2, snap: 0.3, sub: 0.2, chirp: 0,
    drift: 0.5, duck: 0.35, width: 0.2, haas: 0
})
build(bip.noteTracks[0], "Bip", bar => {
    const out = plongeons(bar)
    for (const n of joue(bar, appel(bar), sombre(bar) ? 0.8 : 1)) {out.push(n)}
    return out
})
// long 15..1500 ms (60 ms = 0.30, 150 ms = 0.50, 200 ms = 0.56) : le bip
// s'allonge quand le pied se tait
auto("bip", bip, "long", [
    [0, 0.35], [8, 0.30], [48, 0.30], [48, 0.52], [56, 0.52], [56, 0.30], [88, 0.30],
    [88, 0.50], [98, 0.50], [98, 0.30], [130, 0.30], [138, 0.42], [146, 0.48]
])
// Le timbre du bip s'ouvre lentement tout le long du morceau, sans jamais
// revenir a zero ; il se referme d'un coup dans les deux passages sombres
auto("bip", bip, "tone", [
    [0, 0.30], [32, 0.35], [43.9, 0.38], [44, 0.08], [48, 0.08], [48, 0.40], [56, 0.40], [56, 0.38],
    [72, 0.42], [85.9, 0.45], [86, 0.08], [88, 0.08], [88, 0.40], [98, 0.45], [114, 0.50],
    [118, 0.55], [130, 0.50], [138, 0.35], [146, 0.30]
])
// bite 0..4 (0.8 = 0.20, 1.4 = 0.35) : l'eclat de l'attaque suit la meme pente
auto("bip", bip, "bite", [[0, 0.18], [56, 0.22], [98, 0.28], [118, 0.35], [130, 0.25], [146, 0.18]])

// L'echo : la meme voix, sur une piste a part qui ne joue qu'une ou deux
// notes par phrase et les lance dans un long echo. Un effet partout fatigue ;
// rare, il devient un evenement.
const echo = apparat("Echo", BLIP, -8)
reglages("echo", echo, {
    long: 70, tone: 0.3, bite: 0.7, ratio: 2, snap: 0.2, sub: 0.2, chirp: 0,
    drift: 0.5, duck: 0.5, width: 0.5, haas: 0
})
// Un echo a trois pas (l'ecart de la cellule), qui se repete longtemps
essai("echo delay", () => echo.addAudioEffect("Delay", {delay: 13, feedback: 0.6, cross: 1, filter: 0.3, wet: -4} as any))
build(echo.noteTracks[0], "Echo", bar => {
    const out = plongeons(bar)
    const cell = appel(bar)
    if (cell === null || sombre(bar) || nu(bar) || avantDrop(bar)) {return out}
    const r = rang(bar)
    // En B, une phrase sur deux : la derniere note de l'appel. En C : la derniere de la course
    const lancee = r === 3 ? cell[cell.length - 1] : r === 1 && rel(bar) % 8 === 1 ? cell[2] : null
    if (lancee) {out.push({position: lancee[0] * S16, duration: S16 / 2, pitch: lancee[1], velocity: 0.8})}
    return out
})

// Le bop : la reponse. Plus creux, et il tombe sur sa note comme un coup sur du bois
const bop = apparat("Bop", BLIP, -5)
reglages("bop", bop, {
    long: 45, tone: 0.3, bite: 1.2, ratio: 3, snap: 0.6, sub: 0.3, chirp: 5,
    drift: 0.5, duck: 0.35, width: 0.45, haas: 0
})
build(bop.noteTracks[0], "Bop", bar => {
    const out = plongeons(bar)
    const on = (bar >= 24 && bar < 48) || (bar >= 56 && bar < 88) || (bar >= 98 && bar < 130)
    if (!on || nu(bar)) {return out}
    for (const n of joue(bar, cellule(bar, REPONSE_A, REPONSE_B, null), sombre(bar) ? 0.8 : 1)) {out.push(n)}
    return out
})
// Le bop se durcit au fil du morceau (bite 0..4 : 1,0 = 0.25, 1,8 = 0.45)
auto("bop", bop, "bite", [[0, 0.25], [56, 0.30], [98, 0.38], [130, 0.45], [146, 0.40]])
auto("bop", bop, "tone", [
    [0, 0.30], [43.9, 0.30], [44, 0.08], [56, 0.08], [56, 0.30], [85.9, 0.32], [86, 0.08],
    [98, 0.08], [98, 0.35], [146, 0.35]
])

// Les gouttes : des notes tres courtes qui montent d'une octave sur leur note.
// Elles n'arrivent que dans certains blocs : c'est la couche en plus. On les
// decouvre seules dans le premier creux. Sur les cotes, avec du retard.
const drops = apparat("Gouttes", BLIP, -10)
reglages("gouttes", drops, {
    long: 22, tone: 0.5, bite: 0.3, ratio: 2, snap: 0.1, sub: 0, chirp: -12,
    drift: 0.5, duck: 0, width: 0.8, haas: 10
})
drops.addAudioEffect("Delay", {delay: 11, feedback: 0.35, cross: 1, filter: 0.3, wet: -14})
build(drops.noteTracks[0], "Gouttes", bar => {
    // Les balles : avant un creux elle s'eteint, avant un drop elle enfle
    if (bar === 47 || bar === 87 || bar === 96) {return rebond(0, 16, 14, 0.82, 88, -0.6, false)}
    if (avantDrop(bar)) {return rebond(0, 12, 14, 0.8, 76, 0.9, true)}
    if (finDeBloc(bar)) {return rebond(8, 8, 9, 0.8, 83, -0.5, false)}
    const on = (bar >= 48 && bar < 55) || (bar >= 72 && bar < 86) || (bar >= 98 && bar < 130)
    if (!on || nu(bar)) {return []}
    return joue(bar, cellule(bar, OMBRE_A, OMBRE_B, null))
})

// Les tics : quelques millisecondes, tout en haut, tout pres. Une pulsation
// droite (croches, puis doubles-croches), plus forte sur le temps, et un coup
// double par mesure. En fin de phrase, une rafale. Ils sont au-dessus de
// 6 kHz : plus haut que la zone ou l'oreille fatigue.
const tics = apparat("Tics", BIP, -10)
reglages("tics", tics, {decay: 5, hold: 1, bend: 1, bendms: 4, shape: 0, width: 0.7, haas: 8})
const FORCE = [0.9, 0.4, 0.65, 0.4]
const HAUTEUR = [117, 120, 115, 120]
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
        out.push({position: double * S16 + S16 / 2, duration: 30, pitch: 120, velocity: 0.55 * gain})
    }
    if (rafale) {
        for (let k = 0; k < 6; k++) {
            out.push({position: 12 * S16 + k * S16 / 2 + S16 / 4, duration: 30, pitch: 116 + (k % 3) * 2, velocity: 0.45 + k * 0.1})
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

// Les marqueurs : la voix du bip, longue, qui tombe d'une octave sur sa note
// et se noie dans son echo, sur le premier temps de quelques blocs seulement.
// Une reponse le suit, un pas avant le troisieme temps.
// [mesure, note, note decalee d'un pas].
const MARQUES = [[16, 64, 76], [56, 71, 76], [73, 64, 76], [98, 74, 79], [118, 64, 76]]
const mark = apparat("Marque", BLIP, -10)
reglages("marque", mark, {
    long: 600, tone: 0.5, bite: 1.0, ratio: 2, snap: 0.3, sub: 0.3, chirp: 12,
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
// "2-6k" : la part de l'energie entre 2 et 6 kHz, la zone ou l'oreille fatigue.
const MESURER = true
const ISOLER = true
const units: any[] = [kick, sub, bip, echo, bop, drops, tics, mark, drums]
const STEMS: [string, any][] = [["Coup", kick], ["Sub", sub], ["Bip", bip], ["Echo", echo], ["Bop", bop],
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
        // Deux passe-haut a 2 kHz puis deux passe-bas a 6 kHz, du second ordre
        const filtre = (haut: boolean, fc: number) => {
            const w = 2 * Math.PI * fc / rate, alpha = Math.sin(w) / Math.SQRT2, c = Math.cos(w), a0 = 1 + alpha
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
            let sx = 0, sd = 0
            for (let i = from; i < to; i++) {const d = L[i] - L[i - 1]; sx += L[i] * L[i]; sd += d * d}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / (to - from))).toFixed(1) + "dB " + Math.round(Math.sqrt(sd / sx) * rate / (2 * Math.PI)) + "Hz" : "silence"))
        }
        report.push(stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " mono " + mono + "dB zone " + zone + "% : " + cells.join(", "))
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
