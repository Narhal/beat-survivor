// PHOSPHORE - Beat Survivor, mode Survie
// Techno hypnotique - 124 BPM - Sol, gamme des harmoniques naturels - 144 mesures (4 min 39)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// phosphore.src.ts (le morceau) et des instruments du dossier apparat/.
//
// L'idee : une seule note grave, le Sol, tenue par le pied et la basse, et
// au-dessus d'elle ses propres harmoniques. Les voix aigues ne jouent pas les
// notes du clavier : elles sont accordees sur les harmoniques naturels du Sol
// (la quinte, la tierce, la septieme, et la onzieme, cette note entre deux
// touches qui n'existe sur aucun piano). Tout ce qui brille dans le morceau
// sort du grave, comme une lueur : d'ou le titre. Les notes etranges
// n'arrivent qu'une a une, bloc apres bloc.
//
// Premier morceau ecrit apres la lecture de la chaine Dash Glitch (vault,
// Concepts/Musique, "Dash Glitch - la boite a sons"). Ce qui en vient :
// - trois instruments neufs. Lueur : une percussion qui chante, un coup bref
//   dans des resonateurs accordes, sans oscillateur. Venin : une voix acid
//   dont l'accent frappe ensemble filtre, resonance et saturation. Roulante :
//   une basse en deux chemins, fondamentale propre d'un cote, harmoniques
//   satures de l'autre ;
// - chaque note repart du meme point et retombe a zero avant la suivante ;
//   les durees de la basse se comptent en pas, pas en millisecondes ;
// - la note de basse qui suit le pied se joue sans sa fondamentale ;
// - des motifs immobiles dont le timbre change a chaque pas : la velocite
//   ecrite dans les notes porte la couleur, pas le volume ;
// - des boucles de longueurs inegales (3 pas, 5 et 7 notes) contre les 16 pas
//   de la mesure : le motif complet ne revient qu'apres de longues minutes ;
// - un squelette regulier (pied, basse, clap) sous des voix qui tournent.
// Et d'Underdog : blocs de 16 mesures, arrangement par soustraction, un bloc
// qui demarre sans sa basse, les aigus qui changent de vitesse a chaque bloc.
//
// Pour le jeu : avant chaque drop, le dernier temps est vide et rien n'enfle.
// Le jeu repere un drop a la montee du niveau ; elle doit tomber sur le drop.
//
// Instruments : Frappe (grosse caisse), Roulante (basse), Venin (acid), Lueur
// (treillis, bois, halo) et Cymbale (charleys) sont ecrits pour ces
// morceaux (Apparat = instrument scriptable d'openDAW). Clap, rim, ride : TR-909.

const BPM = 124
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : la basse compte en pas. */
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const ROULANTE: string = __ROULANTE_L__
const VENIN: string = __VENIN_L__
const LUEUR: string = __LUEUR_L__
const CYMBALE: string = __CYMBALE_L__

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
const project = openDAW.newProject("Phosphore")
project.bpm = BPM

// Une reverb, pour le halo et le clap seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.45, preDelay: 12, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Eveil", start: 0, bars: 16},
    {name: "Roule", start: 16, bars: 16},
    {name: "Venin", start: 32, bars: 16},
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
/** Une valeur reelle ramenee entre 0 et 1, pour un bouton a echelle droite ou logarithmique. */
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)

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
const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 96)
/** Le bloc qui demarre sans sa basse : quatre mesures de pied, de treillis et de charleys. */
const nu = (bar: number) => bar >= 72 && bar < 76
const kickOn = (bar: number) => bar >= 8 && bar < 140 && !inBreak(bar)
const bassOn = (bar: number) => bar >= 16 && bar < 136 && !inBreak(bar) && !nu(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 96 && bar < 128)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 95
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. */
const finDeBloc = (bar: number) => [31, 47, 71, 87, 111, 127].includes(bar)
/** Place dans la phrase de quatre mesures. */
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    const v = bar < 16 || bar >= 136 ? 0.8 : drop(bar) ? 1 : 0.92
    const out = [[0, v], [4, v], [8, v], [12, v]]
    // En fin de bloc, le pied lache son dernier temps : un trou avant la relance
    return finDeBloc(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Le Sol et ses harmoniques. Sol 1 = 49 Hz : le pied et la basse.
const SOL1 = 31, SOL2 = 43, SOL3 = 55, SOL4 = 67

// ---------- Frappe : la grosse caisse ----------
// Accordee sur le Sol (49 Hz), courte : elle doit avoir fini avant la deuxieme
// note de basse.
const kick = apparat("Frappe", FRAPPE, -6.5)
reglages("frappe", kick, {tune: 49, start: 360, sweep: 48, decay: 140, punch: 0.6, click: 0.55, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
// Le pied arrive etouffe et gagne son claquement en huit mesures
auto("frappe", kick, "click", [[0, 0.1], [8, 0.1], [16, 0.55], [128, 0.55], [140, 0.2], [144, 0.2]])

// ---------- Roulante : la basse ----------
// Trois notes entre deux coups de pied : "BOUM-ta-ta-ta". La premiere, celle
// qui suit le pied, se joue sans sa fondamentale (velocite 0,35) : la queue du
// pied et le grave de la basse ne s'additionnent jamais.
const bass = apparat("Roulante", ROULANTE, -3)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.8, cutoff: 95, envmod: 3.4, fdecay: 0.45, pinch: 0.55,
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
        // Le premier bloc roule a deux notes ("BOUM - ta-ta"), puis a trois
        if (bar >= 32) {note(s + 1, SOL1, 0.35)}
        note(s + 2, SOL1, 0.8)
        // Dans le final, la fin de phrase saute a l'octave
        const saut = bar >= 96 && beat === 3 && (rang(bar) === 1 || rang(bar) === 3)
        note(s + 3, saut ? SOL2 : SOL1, saut ? 0.6 : 0.8)
    }
    // En fin de bloc, la basse se tait avec le pied
    return finDeBloc(bar) ? out.filter(e => e.position < 12 * S16) : out
})
// La basse s'ouvre un peu a chaque bloc, et respire sur une vague de 12 mesures
auto("roulante", bass, "envmod", vague([
    [0, droit(2.6, 0, 6)], [32, droit(3.0, 0, 6)], [56, droit(3.6, 0, 6)], [96, droit(3.8, 0, 6)],
    [112, droit(4.2, 0, 6)], [128, droit(3.4, 0, 6)], [144, droit(2.4, 0, 6)]
], 12, 0.04))
auto("roulante", bass, "long", [
    [0, droit(0.72, 0.2, 1.5)], [56, droit(0.8, 0.2, 1.5)], [112, droit(0.88, 0.2, 1.5)], [128, droit(0.78, 0.2, 1.5)], [144, droit(0.7, 0.2, 1.5)]
])

// ---------- Venin : la voix acid ----------
// Le rythme tient sur 16 pas et ne bouge pas ; les hauteurs tournent sur 7
// notes et les couleurs sur 5. La velocite ne regle pas le volume : de 0,5 a
// 0,85 elle ferme ou ouvre le filtre de la note, et a partir de 0,9 la note
// est accentuee.
type Motif = {steps: number[], accents: number[], slides: number[]}
// V0 : le squelette. V1 : la boucle. V2 : le sommet.
const V0: Motif = {steps: [0, 3, 8, 11, 14], accents: [3, 11], slides: []}
const V1: Motif = {steps: [0, 2, 3, 5, 7, 8, 10, 11, 14], accents: [3, 7, 14], slides: [2, 10]}
const V2: Motif = {steps: [0, 2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 15], accents: [3, 7, 11, 15], slides: [2, 6, 10, 14]}
// Demi-tons au-dessus du Sol 2 : 12 = l'octave, -2 = le Fa (la septieme), 6 = le Do diese (la onzieme)
const HAUTEURS_SAGES = [0, 0, 12, 0, 0, 0, 12]
const HAUTEURS = [0, 0, 12, 0, -2, 0, 6]
const HAUTEURS_SOMMET = [0, 12, 12, 0, -2, 12, 6]
const COULEURS = [0.2, 0.55, 0.95, 0.35, 0.75]
const couleur = (accent: boolean, c: number) => accent ? 0.9 + 0.1 * c : 0.5 + 0.35 * c

const acid = apparat("Venin", VENIN, -1)
reglages("venin", acid, {
    cutoff: 260, reso: 0.78, envmod: 2.2, decay: 300, accent: 0.7, tint: 1.0, glide: 80,
    shape: 0, drive: 0.45, lowcut: 190, tonic: SOL2, just: 1, duck: 0.35
})
// Les accents sortaient en pointes (20 dB au-dessus du niveau moyen) : une saturation les rabote avant l'echo
essai("saturation venin", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.32, cross: 1, filter: 0.45, wet: -21})

function motifAcid(bar: number): Motif | null {
    if (bar >= 32 && bar < 40) {return V0}
    if (bar >= 40 && bar < 48) {return V1}
    if (bar >= 48 && bar < 52) {return V0}
    if (bar >= 52 && bar < 72) {return V1}
    if (bar >= 76 && bar < 88) {return V1}
    if (bar >= 92 && bar < 112) {return V1}
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
        // Le rang de la note depuis le debut du morceau : les deux boucles tournent sans se soucier des mesures
        const n = bar * motif.steps.length + k
        const slide = motif.slides.includes(step)
        out.push({
            position: step * S16,
            // Une note liee deborde sur la suivante : c'est le chevauchement qui fait glisser
            duration: Math.round(S16 * (slide ? 1.3 : 0.55)),
            pitch: SOL2 + hauteurs[n % 7],
            velocity: couleur(motif.accents.includes(step), COULEURS[n % 5])
        })
    })
    return out
})
// Le filtre monte lentement tout le morceau ; dans les creux il se referme puis s'ouvre
auto("venin", acid, "cutoff", vague([
    [0, loga(170, 60, 4000)], [32, loga(170, 60, 4000)], [48, loga(300, 60, 4000)], [48, loga(150, 60, 4000)],
    [55.75, loga(520, 60, 4000)], [56, loga(380, 60, 4000)], [88, loga(520, 60, 4000)], [88, loga(200, 60, 4000)],
    [95.75, loga(700, 60, 4000)], [96, loga(480, 60, 4000)], [112, loga(600, 60, 4000)], [128, loga(760, 60, 4000)],
    [136, loga(200, 60, 4000)], [144, loga(150, 60, 4000)]
], 12, 0.03))
auto("venin", acid, "envmod", vague([
    [0, droit(1.6, 0, 5)], [32, droit(1.6, 0, 5)], [56, droit(2.4, 0, 5)], [96, droit(2.8, 0, 5)],
    [128, droit(3.2, 0, 5)], [136, droit(1.6, 0, 5)], [144, droit(1.4, 0, 5)]
], 20, 0.03))
// L'ecart de couleur entre deux notes grandit bloc apres bloc
auto("venin", acid, "tint", [
    [0, droit(0.5, 0, 3)], [32, droit(0.5, 0, 3)], [56, droit(1.2, 0, 3)], [96, droit(1.6, 0, 3)],
    [112, droit(2.0, 0, 3)], [128, droit(2.0, 0, 3)], [136, droit(0.8, 0, 3)], [144, droit(0.5, 0, 3)]
])
auto("venin", acid, "reso", vague([
    [0, 0.74], [48, 0.78], [48, 0.88], [56, 0.78], [88, 0.82], [88, 0.90], [96, 0.80], [128, 0.84], [144, 0.74]
], 28, 0.015))
auto("venin", acid, "decay", [
    [0, loga(240, 60, 2000)], [48, loga(280, 60, 2000)], [48, loga(600, 60, 2000)], [56, loga(300, 60, 2000)],
    [88, loga(340, 60, 2000)], [88, loga(700, 60, 2000)], [96, loga(320, 60, 2000)], [128, loga(380, 60, 2000)],
    [136, loga(220, 60, 2000)], [144, loga(200, 60, 2000)]
])

// ---------- Le treillis : la lueur ----------
// Un coup tous les trois pas, sans jamais s'arreter : trois contre seize, il
// ne retombe sur le premier temps que toutes les trois mesures. Ses notes
// tournent sur 7, ses forces sur 5. Les pas sont comptes depuis le premier
// drop (mesure 56) : c'est la que toutes les boucles repartent ensemble.
const ORIGINE = 56 * 16
/** Le rang du coup de treillis qui tombe sur ce pas (negatif avant le drop), ou null s'il n'y en a pas. */
const coup = (bar: number, step: number): number | null => {
    const t = bar * 16 + step - ORIGINE
    return ((t % 3) + 3) % 3 === 0 ? t / 3 : null
}
// Les harmoniques du Sol, une octave sous la zone ou l'oreille fatigue :
// 67 = Sol, 74 = Re (3/2), 79 = Sol, 77 = Fa (7/4), 71 = Si (5/4), 73 = Do diese (11/8)
const TREILLIS = [
    {jusqua: 32, notes: [67, 74, 67, 74, 67, 79, 74]},
    {jusqua: 56, notes: [67, 74, 67, 77, 67, 79, 74]},
    {jusqua: 96, notes: [67, 74, 71, 77, 67, 73, 74]},
    {jusqua: 128, notes: [67, 73, 71, 77, 79, 73, 74]},
    {jusqua: 999, notes: [67, 74, 67, 74, 67, 79, 74]}
]
const FORCES = [1, 0.5, 0.72, 0.42, 0.85]
const tirageTreillis = hasard(20261112)
const lattice = apparat("Treillis", LUEUR, -2.5)
reglages("treillis", lattice, {
    decay: 190, matter: 0.2, strike: 0.5, damp: 0.5, chirp: 0, grain: 0.3, tonic: SOL2, just: 1,
    drift: 0.5, duck: 0.35, width: 0.7, drive: 0.15
})
lattice.addAudioEffect("Delay", {delay: 13, feedback: 0.42, cross: 1, filter: 0.35, wet: -15})
build(lattice.noteTracks[0], "Treillis", bar => {
    const out: Note[] = plongeons(bar)
    const notes = (TREILLIS.find(t => bar < t.jusqua) as {notes: number[]}).notes
    // Un coup sur deux au reveil et a la sortie, un sur quatre tout a la fin
    const pas = bar < 8 || (bar >= 136 && bar < 142) ? 2 : bar >= 142 ? 4 : 1
    for (let step = 0; step < limite(bar); step++) {
        const n = coup(bar, step)
        if (n === null) {continue}
        const i = ((n % 35) + 35) % 35
        const jitter = (tirageTreillis() - 0.5) * 0.1
        if (((n % pas) + pas) % pas !== 0) {continue}
        out.push({position: step * S16, duration: S16 / 2, pitch: notes[i % 7], velocity: Math.max(0.3, Math.min(1, FORCES[i % 5] + jitter))})
    }
    return out
})
// La matiere passe lentement du verre au metal ; les notes sonnent plus longtemps quand le pied se tait
auto("treillis", lattice, "matter", vague([
    [0, 0.12], [56, 0.22], [96, 0.40], [128, 0.55], [144, 0.15]
], 16, 0.04))
auto("treillis", lattice, "decay", [
    [0, loga(420, 30, 4000)], [8, loga(420, 30, 4000)], [16, loga(190, 30, 4000)], [48, loga(190, 30, 4000)],
    [48, loga(480, 30, 4000)], [56, loga(480, 30, 4000)], [56, loga(200, 30, 4000)], [88, loga(220, 30, 4000)],
    [88, loga(520, 30, 4000)], [96, loga(520, 30, 4000)], [96, loga(210, 30, 4000)], [136, loga(240, 30, 4000)],
    [140, loga(600, 30, 4000)], [144, loga(900, 30, 4000)]
])
auto("treillis", lattice, "strike", vague([
    [0, 0.35], [56, 0.5], [112, 0.62], [128, 0.5], [144, 0.3]
], 10, 0.05))

// ---------- Le bois : la reponse ----------
// Une octave plus bas, une matiere de lame, une petite chute de hauteur a
// l'attaque. Il ne joue que la ou le treillis et le pied se taisent : les deux
// voix ne tombent jamais ensemble. Trois notes : Sol, Re, Fa.
const BOIS = [SOL3, 62, 53]
const tirageBois = hasard(4711)
const wood = apparat("Bois", LUEUR, -3, -0.15)
reglages("bois", wood, {
    decay: 130, matter: 0.8, strike: 0.45, damp: 0.6, chirp: 5, grain: 0.5, tonic: SOL2, just: 1,
    drift: 0.6, duck: 0.3, width: 0.4, drive: 0.25
})
wood.addSend(reverb, {amount: -22})
/** Un roulement de bois qui enfle : la relance avant un drop. */
function roulement(from: number, to: number, base: number, gain: number): Note[] {
    const out: Note[] = []
    for (let step = from; step < to; step++) {
        const k = step - from
        out.push({
            position: step * S16, duration: S16 / 2, pitch: BOIS[k % 3 === 0 ? 1 : k % 2 === 0 ? 0 : 2],
            velocity: Math.min(1, (k % 3 === 0 ? 0.8 : 0.5) * (base + gain * k / (to - from)))
        })
    }
    return out
}
build(wood.noteTracks[0], "Bois", bar => {
    if (bar === 55 || bar === 95) {return roulement(0, 12, 0.6, 0.6)}
    const on = (bar >= 32 && bar < 48) || (bar >= 56 && bar < 72) || (bar >= 76 && bar < 88) || (bar >= 96 && bar < 136)
    const out: Note[] = plongeons(bar)
    if (!on) {return out}
    // Les pas possibles : hors des temps. On garde ceux que le treillis laisse libres.
    const candidats = [3, 6, 10, 14]
    candidats.forEach((step, k) => {
        const garde = tirageBois() < 0.82
        if (coup(bar, step) !== null || !garde) {return}
        out.push({position: step * S16, duration: S16 / 2, pitch: BOIS[(bar + k) % 3], velocity: k % 2 === 0 ? 0.9 : 0.6})
    })
    // En fin de bloc, trois coups qui montent
    if (finDeBloc(bar)) {
        out.push({position: 12 * S16, duration: S16 / 2, pitch: BOIS[2], velocity: 0.6})
        out.push({position: 13 * S16, duration: S16 / 2, pitch: BOIS[0], velocity: 0.75})
        out.push({position: 15 * S16, duration: S16 / 2, pitch: BOIS[1], velocity: 0.95})
    }
    return out
})

// ---------- Le halo : les marqueurs ----------
// La meme percussion, tres longue, noyee dans son echo. Elle ouvre les blocs,
// et dans le second creux elle deplie un a un les harmoniques du Sol :
// Sol, Si, Re, Fa, La, Do diese (4, 5, 6, 7, 9, 11 fois la note grave).
const HALOS: {[bar: number]: number[]} = {
    0: [SOL4, 74], 16: [SOL4], 32: [SOL4, 77], 48: [77, 73], 56: [SOL4, 74, 79], 76: [SOL4],
    88: [SOL3, SOL4], 89: [71], 90: [74], 91: [77], 92: [81], 93: [85], 94: [73, 77],
    96: [SOL4, 74, 79], 112: [SOL4, 73], 128: [SOL4, 74], 140: [SOL4, 74, 79]
}
const halo = apparat("Halo", LUEUR, -11)
reglages("halo", halo, {
    decay: 2600, matter: 0.45, strike: 0.55, damp: 0.35, chirp: 0, grain: 0.4, tonic: SOL2, just: 1,
    drift: 0.3, duck: 0, width: 0.8, drive: 0.1
})
halo.addAudioEffect("Delay", {delay: 13, feedback: 0.58, cross: 1, filter: 0.3, wet: -10})
halo.addSend(reverb, {amount: -10})
build(halo.noteTracks[0], "Halo", bar => {
    const notes = HALOS[bar]
    if (!notes) {return []}
    return notes.map((pitch, k) => ({position: k * 3 * S16, duration: S16, pitch, velocity: k === 0 ? 1 : 0.7}))
})

// ---------- Cymbale : les charleys ----------
// Leur vitesse change a chaque bloc. Note 42 = ferme, 46 = ouvert.
const hats = apparat("Cymbale", CYMBALE, 5.5)
reglages("cymbale", hats, {decay: 38, open: 5, tone: 5800, metal: 0.5, drift: 0.6, width: 0.5})
function vitesse(bar: number): number {
    if (!kickOn(bar) || bar < 16) {return 0}
    if (bar < 32) {return 1}                 // un charley a contretemps
    if (bar < 56) {return 2}                 // + les doubles-croches en sourdine
    if (bar < 72) {return 3}                 // le contretemps s'ouvre
    if (bar < 76) {return 1}                 // le bloc nu
    if (bar < 96) {return 3}
    if (bar < 112) {return 4}                // toutes les doubles-croches, accent a contretemps
    if (bar < 128) {return 5}                // + la ride
    if (bar < 136) {return 2}
    return 1
}
build(hats.noteTracks[0], "Cymbale", bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        if (beat === 2) {
            out.push({position: step * S16, duration: S16 / 2, pitch: v >= 3 ? 46 : 42, velocity: v >= 3 ? 0.8 : 0.7})
        } else if (v >= 4 || (v >= 2 && beat === 3) || (v >= 3 && beat === 1)) {
            // Un pas sur deux un rien plus faible : la main qui retombe
            out.push({position: step * S16, duration: S16 / 2, pitch: 42, velocity: beat === 0 ? 0.3 : beat === 3 ? 0.5 : 0.38})
        }
    }
    return out
})
auto("cymbale", hats, "decay", vague([
    [0, loga(30, 10, 300)], [56, loga(38, 10, 300)], [112, loga(48, 10, 300)], [128, loga(34, 10, 300)], [144, loga(28, 10, 300)]
], 6, 0.04))

// ---------- Clap, rim, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const RIM = 37, CLAP = 39, RIDE = 51
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -9, panning: 0.2}],
    ["Clap", CLAP, {volume: -3}],
    ["Ride", RIDE, {volume: -13, panning: -0.15}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -20})
build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})}
    }
    if (!kickOn(bar)) {return out}
    // Le clap n'arrive qu'au premier drop : deuxieme et quatrieme temps
    if (drop(bar) && !nu(bar)) {hit(4, CLAP, 0.85); hit(12, CLAP, 0.9)}
    // Le rim : une syncope, deux mesures sur quatre
    if (bar >= 32 && bar < 136 && !nu(bar) && (rang(bar) === 1 || rang(bar) === 3)) {hit(7, RIM, 0.6); hit(13, RIM, 0.45)}
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
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, acid, lattice, wood, halo, hats, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Venin", acid], ["Treillis", lattice],
    ["Bois", wood], ["Halo", halo], ["Cymbale", hats], ["909", drums]]
if (MESURER) {
    const parts = [["eveil", 0, 16], ["roule", 16, 32], ["venin", 32, 48], ["creux", 48, 56], ["drop", 56, 72],
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
            for (let i = from; i < to; i++) {sx += L[i] * L[i]}
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
