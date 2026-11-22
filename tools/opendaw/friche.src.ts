// FRICHE - Beat Survivor, mode Survie
// Techno minimale, un peu industrielle - 126 BPM - Si bemol phrygien - 144 mesures (4 min 34)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de friche.src.ts
// (le morceau) et des instruments du dossier apparat/.
//
// Demande de N4 : de la techno minimale, un peu industrielle, comme a Berlin
// autour de 2009 ; un morceau de tendance, "Pick a Chick" de Harry Axt ; pas
// une copie, un voyage mental, avec les recettes d Underdog et de Dash Glitch.
//
// Deux morceaux de 2009 ont ete mesures avant d ecrire ("Pick a Chick", et
// "Subzero" de Ben Klock pour ne pas tout caler sur un seul). Ils disent la
// meme chose : 125 a 127 BPM ; presque tout le poids entre 55 et 59 Hz ;
// presque rien au-dessus de 6 kHz ; tout au centre, aucune largeur ; tres peu
// d ecart entre les cretes et le niveau moyen. Ce sont les cibles du mix.
// Rien n est repris de ces morceaux : ni notes, ni sons, ni motifs.
//
// L idee, en une phrase : une machine a seize pas qui ne change jamais, et
// sur elle une boucle de cinq coups de metal qui ne retombe jamais au meme
// endroit.
// - La machine : le pied sur chaque temps, une basse qui ne joue jamais en
//   meme temps que lui, un tic a contretemps. Elle ne varie pas.
// - Le metal : cinq pas contre seize (la boucle retrouve le premier temps
//   toutes les cinq mesures), et la force des coups suit une autre boucle, de
//   sept. Un coup fort sonne plus long et plus clair. Les deux boucles et la
//   mesure ne se retrouvent ensemble que toutes les trente-cinq mesures : on
//   n entend jamais deux fois la meme chose, et rien ne change.
// - Le voyage : une seule courbe lente, sur tout le morceau, ouvre le metal
//   (il sonne plus longtemps, plus plein, plus sature) puis le referme.
// - Au milieu, la machine s arrete et la boucle de cinq reste seule : on
//   cherche le premier temps.
//
// Les recettes employees :
// - Underdog : les quatre regles du minimalisme (deux elements qui se
//   repondent dans chaque bande, un mouvement dose dans le timbre, un seul
//   polymetre, la tension par le retrait) ; un seul acteur dans le grave a la
//   fois ; plus fort veut dire plus clair et plus long ; un effet rare ; une
//   courbe protagoniste ; le filtre qui chante comme source de bleeps, sur
//   une boucle de cinq pas.
// - Dash Glitch : un filtre tres resonant est une source (Rivet) ; un retard
//   tres court reboucle est un resonateur accorde (Tole) ; un motif immobile
//   dont le timbre change a chaque pas ; une longueur de boucle par
//   parametre ; chaque note repart du meme point.
// Aucun bruit : ni souffle, ni nappe, ni charley ouvert.
//
// Instruments (Apparat = instrument scriptable d openDAW) : Rivet et Tole
// sont ecrits pour ce morceau ; Frappe (grosse caisse), Roulante (basse) et
// Gresil (tics) viennent des morceaux precedents. Rim et clap : TR-909.

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : la basse compte en pas. */
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const ROULANTE: string = __ROULANTE_L__
const RIVET: string = __RIVET_L__
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
const project = openDAW.newProject("Friche")
project.bpm = BPM

// Une petite salle, pour la tole seulement. Le genre est sec.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.6, preDelay: 10, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seuil", start: 0, bars: 16},
    {name: "Machine", start: 16, bars: 16},
    {name: "Rouages", start: 32, bars: 16},
    {name: "Plein", start: 48, bars: 16},
    {name: "Friche", start: 64, bars: 16},
    {name: "Retour", start: 80, bars: 16},
    {name: "Fonte", start: 96, bars: 16},
    {name: "Usure", start: 112, bars: 16},
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

// ---------- La carte du morceau ----------
/** Le creux : la machine s arrete (mesures 64 a 80). */
const creux = (bar: number) => bar >= 64 && bar < 80
/** Le bloc qui demarre sans son grave : quatre mesures sans pied ni basse. */
const nu = (bar: number) => bar >= 112 && bar < 116
/** Le pied. */
const kickOn = (bar: number) => !creux(bar) && !nu(bar) && bar < 140
/** La basse : elle entre au deuxieme bloc, revient avant le pied dans le creux, sort avant la fin. */
const bassOn = (bar: number) => bar >= 16 && bar < 136 && !(bar >= 64 && bar < 72) && !nu(bar)
/** La mesure qui precede un retour : le dernier temps reste vide. */
const avantRetour = (bar: number) => bar === 79 || bar === 115
const limite = (bar: number) => avantRetour(bar) ? 12 : 16
/** Derniere mesure d un bloc de seize. */
const finDeBloc = (bar: number) => bar % 16 === 15
const rang = (bar: number) => bar % 4

/**
 * La courbe protagoniste : l ouverture du metal, de 0 a 1, sur tout le morceau.
 * Elle monte par paliers, retombe un peu dans le creux, culmine a la mesure 104
 * et se referme. Tout ce qui change dans le timbre en sort.
 */
const OUVERTURE = [[0, 0.12], [16, 0.25], [32, 0.4], [48, 0.6], [64, 0.5], [72, 0.7], [80, 0.65], [96, 0.85],
    [104, 1], [112, 0.7], [128, 0.45], [144, 0.1]]
/** Un parametre qui suit l ouverture, de `ferme` a `ouvert` ; `echelle` le ramene entre 0 et 1. */
const suit = (ferme: number, ouvert: number, echelle: (v: number) => number) =>
    OUVERTURE.map(p => [p[0], echelle(ferme + (ouvert - ferme) * p[1])])

// ---------- Frappe : la grosse caisse ----------
// Un Si bemol (58 Hz), la ou les deux references ont leur poids. Elle garde
// de la reserve jusqu au bloc plein.
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 58.3, start: 360, sweep: 46, decay: 160, punch: 0.6, click: 0.45, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar => {
    if (!kickOn(bar)) {return []}
    const force = bar < 48 || bar >= 128 ? 0.85 : 1
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step += 4) {out.push({position: step * S16, duration: S16, pitch: 36, velocity: force})}
    return out
})
auto("frappe", kick, "click", [[0, 0.15], [16, 0.45], [128, 0.45], [144, 0.15]])

// ---------- Roulante : la basse ----------
// Le meme Si bemol que le pied, jamais en meme temps que lui : elle joue
// juste avant ou juste apres les temps. Un seul acteur dans le grave a la fois.
// Une mesure sur quatre, sa derniere note monte d un demi-ton : la menace.
const SIB1 = 34
const bass = apparat("Roulante", ROULANTE, 0)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    const out: Note[] = []
    const pas = bar % 2 === 0 ? [3, 6, 11, 14] : [3, 6, 10, 14]
    pas.forEach((step, k) => {
        if (step >= limite(bar)) {return}
        const menace = rang(bar) === 3 && k === 3
        out.push({position: step * S16, duration: S16, pitch: menace ? SIB1 + 1 : SIB1, velocity: k === 0 ? 0.65 : 0.8})
    })
    return out
})
auto("roulante", bass, "envmod", suit(2.6, 3.8, v => droit(v, 0, 6)))

// ---------- Rivet : la boucle de cinq ----------
// Un filtre qu on frappe. Cinq pas, qui tournent sans arret depuis la premiere
// mesure : la boucle ne repart jamais avec la mesure. Les notes sont en
// demi-tons au-dessus du Si bemol ; 1 = le Do bemol (le demi-ton de menace),
// 7 = le Fa, 12 = l octave, 10 = le La bemol.
const N = null
type Cellule = (number | null)[]
const CELLULES: {[nom: string]: Cellule} = {
    a: [0, N, N, 7, N],
    b: [0, N, 7, 1, N],
    c: [0, 12, 7, 1, N],
    d: [0, 12, 7, 1, 10]
}
/** La cellule du bloc : elle gagne une note a la fois, puis les rend. */
function cellule(bar: number): Cellule {
    if (bar < 32) {return CELLULES.a}
    if (bar < 80) {return CELLULES.b}
    if (bar < 96) {return CELLULES.c}
    if (bar < 112) {return CELLULES.d}
    if (bar < 128) {return CELLULES.c}
    return bar < 136 ? CELLULES.b : CELLULES.a
}
/** La force des coups : une autre boucle, de sept. Un coup fort sonne plus long et plus clair. */
const FORCES = [0.95, 0.5, 0.7, 0.45, 0.85, 0.55, 0.65]
const SIB3 = 58
const rivet = apparat("Rivet", RIVET, -5)
reglages("rivet", rivet, {
    tune: 0, decay: 80, reach: 1.2, bend: 4, bendms: 14, body: 0.35, ratio: 2.76, drive: 0.25, click: 0.45
})
essai("echo rivet", () => rivet.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 0, filter: 0.4, wet: -22}))
build(rivet.noteTracks[0], "Rivet", bar => {
    const out: Note[] = []
    const c = cellule(bar)
    for (let step = 0; step < 16; step++) {
        const t = bar * 16 + step
        // Avant un retour : la machine s emballe, tous les pas sonnent, de plus en plus fort, puis un temps de vide
        if (avantRetour(bar)) {
            if (step < 12) {
                out.push({position: step * S16, duration: S16 / 2, pitch: SIB3 + (c[t % 5] ?? 0), velocity: Math.min(1, 0.4 + 0.05 * step)})
            }
            continue
        }
        const semi = c[t % 5]
        if (semi === null) {continue}
        out.push({position: step * S16, duration: S16 / 2, pitch: SIB3 + semi, velocity: FORCES[t % 7]})
    }
    return out
})
// Le voyage : le metal sonne plus longtemps, plus plein, plus sature, part de plus haut
auto("rivet", rivet, "decay", suit(55, 190, v => loga(v, 8, 2000)))
auto("rivet", rivet, "body", suit(0.2, 0.6, v => v))
auto("rivet", rivet, "drive", suit(0.12, 0.42, v => v))
auto("rivet", rivet, "bend", suit(2.5, 8, v => droit(v, 0, 24)))

// ---------- Tole : la plaque ----------
// Une plaque grave qu on frappe une fois toutes les deux mesures, sur un temps
// faible, et qui sonne jusqu au bout. C est le seul son du morceau qui a droit
// a un echo et a une salle. En fin de phrase elle frappe aussi le Do bemol.
// A la fin du bloc le plus plein, elle est hachee en doubles-croches.
const SIB2 = 46
const tole = apparat("Tole", TOLE, -3)
reglages("tole", tole, {tune: 0, decay: 900, damp: 0.92, metal: 0.7, strike: 0.25, drive: 0.5, gate: 0})
essai("echo tole", () => tole.addAudioEffect("Delay", {delay: 13, feedback: 0.45, cross: 0, filter: 0.3, wet: -14}))
tole.addSend(reverb, {amount: -14})
/** Les quatre mesures ou la tole est hachee. */
const hachee = (bar: number) => bar >= 108 && bar < 112
build(tole.noteTracks[0], "Tole", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number, len: number = S16) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: len, pitch, velocity})}
    }
    // Dans le creux : une frappe au debut de chaque phrase de quatre mesures, qui sonne longtemps
    if (bar >= 64 && bar < 72) {
        if (rang(bar) === 0) {hit(0, SIB2, 0.9)}
        if (rang(bar) === 2) {hit(8, SIB2 + 1, 0.6)}
        return out
    }
    if (hachee(bar)) {
        // Un coup par double-croche, etouffe a mi-pas ; un accent tous les trois pas
        for (let step = 0; step < 16; step++) {hit(step, SIB2, step % 3 === 0 ? 0.85 : 0.5, S16 / 2)}
        return out
    }
    const on = (bar >= 32 && bar < 64) || (bar >= 72 && bar < 128 && !nu(bar))
    if (!on) {return out}
    if (bar % 2 === 1) {hit(10, SIB2, 0.8)}
    if (bar % 8 === 7) {hit(14, SIB2 + 1, 0.65)}
    // En tete de bloc, elle marque le premier temps
    if (bar % 16 === 0 && bar >= 48) {hit(0, SIB2, 1)}
    return out
})
auto("tole", tole, "damp", suit(0.96, 0.78, v => v))
auto("tole", tole, "decay", [[0, 900], [63.9, 900], [64, 2600], [72, 900], [144, 900]].map(p => [p[0], loga(p[1], 20, 8000)]))
auto("tole", tole, "gate", [[0, 0], [107.99, 0], [108, 1], [111.99, 1], [112, 0], [144, 0]])

// ---------- Gresil : les tics ----------
// Un tic a contretemps, qui ne bouge pas ; autour de lui, des tics plus
// faibles dont le nombre change a chaque bloc. Aucun charley ouvert.
const ticks = apparat("Tics", GRESIL, -3)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
/** 0 = rien ; 1 = le contretemps ; 2 = + le pas d apres ; 3 = + le pas d avant ; 4 = toutes les doubles-croches ; 5 = des fantomes seuls. */
function vitesse(bar: number): number {
    if (bar < 8 || bar >= 136 || nu(bar)) {return 0}
    if (bar < 16) {return 5}
    if (bar < 32) {return 1}
    if (bar < 48) {return 2}
    if (bar < 64) {return 4}
    if (bar < 72) {return 0}
    if (bar < 80) {return 5}
    if (bar < 96) {return 3}
    if (bar < 112) {return 4}
    if (bar < 128) {return 2}
    return 1
}
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        let force = 0
        if (v === 5) {force = beat === 2 ? 0.4 : beat === 3 ? 0.25 : 0}
        else {force = beat === 2 ? 0.85 : beat === 3 && v >= 2 ? 0.48 : beat === 1 && v >= 3 ? 0.36 : beat === 0 && v >= 4 ? 0.26 : 0}
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force})}
    }
    return out
})
auto("tics", ticks, "decay", suit(22, 38, v => loga(v, 5, 600)))

// ---------- Rim et clap : TR-909 ----------
// Le rim sur les temps 2 et 4. Le clap ne le double que dans les deux blocs
// les plus pleins, et relance les fins de bloc.
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -5.5})
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
    if (bar >= 32 && bar < 128) {hit(4, RIM, 0.7); hit(12, RIM, 0.75)}
    if ((bar >= 48 && bar < 64) || (bar >= 96 && bar < 112)) {hit(4, CLAP, 0.7); hit(12, CLAP, 0.75)}
    if (finDeBloc(bar) && bar >= 32 && bar < 128) {hit(14, CLAP, 0.5); hit(15, CLAP, 0.7)}
    return out
})

// Limiteur de sortie : les deux references sont tres tenues (10 dB entre les cretes et le niveau moyen)
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le bloc plein (mesures 48 a 64), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, rivet, tole, ticks, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Rivet", rivet], ["Tole", tole],
    ["Tics", ticks], ["909", drums]]
if (MESURER) {
    const parts = [["seuil", 0, 16], ["machine", 16, 32], ["rouages", 32, 48], ["plein", 48, 64], ["friche", 64, 72],
        ["attente", 72, 80], ["retour", 80, 96], ["fonte", 96, 112], ["nu", 112, 116], ["usure", 116, 128], ["sortie", 128, 144]]
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
        // Les memes mesures que sur les references, sur le bloc plein (mesures 48 a 64)
        const from = Math.floor(48 * barSec * rate), to = Math.min(n, Math.floor(64 * barSec * rate))
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
                line += " || plein : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
