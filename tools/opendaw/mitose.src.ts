// MITOSE - Beat Survivor, mode Survie
// Techno minimale berlinoise - 126 BPM - La - 164 mesures (5 min 12)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// mitose.src.ts (le morceau) et des instruments du dossier apparat/.
//
// Troisieme morceau de la famille "Friche" / "Prodrome" : memes annees
// (Berlin, 2009), memes reperes mesures, memes cibles de mix, memes
// instruments (le Revers choisi par N4, la Tole, la machine). Ce qui est
// neuf est la composition.
//
// L idee, en une phrase : le morceau entier est UNE phrase de seize cases,
// jouee a cinq vitesses a la fois, chacune trois fois plus lente que la
// precedente, et faite pour se contenir elle-meme.
// - La phrase est ecrite de sorte qu en n en gardant qu une case sur trois
//   (en tournant en rond) on retrouve la meme phrase, trois fois plus lente.
//   La voix lente ne joue donc jamais contre la voix rapide : chacune de ses
//   notes tombe sur la meme note, au meme instant, dans toutes les voix plus
//   rapides. Les voix ne s accompagnent pas, elles se contiennent.
// - Cinq vitesses : une note toutes les 81 doubles-croches (un gong, toutes
//   les cinq mesures), toutes les 27 (le Revers long), toutes les 9 (le
//   Revers), toutes les 3 (la Tole), et chaque double-croche (deux mesures
//   seulement, au sommet). Le morceau est une division : on entend d abord
//   la phrase tres lente, puis ses copies de plus en plus rapides.
// - La machine suit la meme regle : le pied, la basse, les tics et le rim
//   occupent chacun une famille de cases de la meme grille. La basse joue
//   exactement la ou la phrase se tait.
// - Au milieu, la copie se trompe : pendant 18 mesures, la Tole puis le Revers
//   lisent la phrase une case sur cinq au lieu d une sur trois. Memes notes,
//   autre ordre : les voix ne tombent plus ensemble. Puis la copie fidele
//   revient, et tout retombe juste.
//
// Les notes : aucune n est sur une touche du piano. Ce sont des harmoniques
// du La grave du pied (55 Hz) : le 7e, le 11e, le 13e et le 19e, ramenes
// dans le meme registre. Ni la tonique, ni la quinte.
//
// Le dosage suit la regle tiree des deux references : la phrase est absente
// 18 mesures, puis arrive par sa vitesse la plus lente ; elle n est chargee
// que deux mesures (124 et 125).
//
// Instruments (Apparat = instrument scriptable d openDAW) : Revers, Tole,
// Frappe (grosse caisse), Roulante (basse), Gresil (tics). Rim et clap :
// TR-909.

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 164
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
const project = openDAW.newProject("Mitose")
project.bpm = BPM

// Une petite salle, pour le gong seulement. Le genre est sec.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.6, preDelay: 10, wet: 0, dry: -60} as any)

// ---------- La forme : dix-huit blocs de neuf mesures ----------
// Neuf mesures, c est le tour complet de la voix qui joue une note tous les
// neuf pas : la phrase donne sa longueur aux blocs.
const BLOC = 9
const BLOCS = ["Seuil", "Machine", "Lente", "Lente 2", "Tiers", "Tiers 2", "Neuvieme", "Neuvieme 2", "Plateau",
    "Creux", "Mutation", "Mutation 2", "Fidele", "Sommet", "Reflux", "Reflux 2", "Trace", "Sortie"]
const FIN = BLOCS.length * BLOC
const blocDe = (bar: number) => Math.min(BLOCS.length - 1, Math.floor(bar / BLOC))

type Note = {position: number, duration: number, pitch: number, velocity: number, cents: number}

/** Pose des notes donnees en positions absolues : une region par bloc. */
function pose(track: any, label: string, notes: Note[]) {
    const parBloc: Note[][] = []
    for (let b = 0; b <= BLOCS.length; b++) {parBloc.push([])}
    for (const e of notes) {
        if (e.position < 0 || e.position >= TOTAL * BAR) {continue}
        parBloc[Math.min(BLOCS.length, Math.floor(e.position / (BLOC * BAR)))].push(e)
    }
    for (let b = 0; b <= BLOCS.length; b++) {
        if (parBloc[b].length === 0) {continue}
        const start = b * BLOC * BAR
        const region = track.addRegion({
            position: start, duration: (b === BLOCS.length ? TOTAL - FIN : BLOC) * BAR,
            label: label + " - " + (b === BLOCS.length ? "Fin" : BLOCS[b])
        })
        region.addEvents(parBloc[b].map(e => ({
            position: e.position - start, duration: e.duration, pitch: e.pitch, velocity: e.velocity, cents: e.cents
        })))
    }
}
/** Les notes d une piste ecrite mesure par mesure (positions relatives a la mesure). */
function parMesure(perBar: (bar: number) => Note[]): Note[] {
    const out: Note[] = []
    for (let bar = 0; bar < TOTAL; bar++) {
        for (const e of perBar(bar)) {out.push({...e, position: bar * BAR + e.position})}
    }
    return out
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

// ---------- La phrase ----------
// Seize cases. Une lettre par famille de cases ; un point = silence.
//   T, t : les deux tetes (case 0 et case 8), la meme note a l octave ;
//   c : le centre (cases 4 et 12, les temps 2 et 4) ;
//   h : la voisine du haut (cases 2 et 6) ; b : celle du bas (cases 10 et 14) ;
//   p : la pedale (cases 5, 7, 13, 15) ;
//   . : les cases 1, 3, 9 et 11, ou la phrase se tait et ou la basse joue.
// Chaque famille est un tour de la multiplication par 3 (modulo 16) : c est
// ce qui rend la phrase semblable a elle-meme. Les cases du pied (0, 4, 8,
// 12), des tics (2, 6, 10, 14), de la basse et du rim sont les memes familles.
const PHRASE = "T.h.cphpt.b.cpbp"
for (let n = 0; n < 16; n++) {
    if (PHRASE.charAt((3 * n) % 16) !== PHRASE.charAt(n)) {soucis.push("la phrase ne se contient pas elle-meme, case " + n)}
}
/** Les notes : des harmoniques du La du pied (55 Hz), ramenes entre 175 et 385 Hz. */
const RAPPORT: {[c: string]: number} = {T: 7, h: 13 / 2, c: 11 / 2, p: 19 / 4, t: 7 / 2, b: 13 / 4}
const LA1 = 33
/** La touche la plus proche et l ecart en cents (openDAW accepte -50 a 50). */
function hauteur(rapport: number): {pitch: number, cents: number} {
    const exact = LA1 + 12 * Math.log(rapport) / Math.log(2)
    const pitch = Math.round(exact)
    return {pitch, cents: Math.max(-50, Math.min(50, Math.round((exact - pitch) * 1000) / 10))}
}

// ---------- La carte du morceau ----------
/** Le creux : la machine s arrete (mesures 81 a 90). */
const creux = (bar: number) => bar >= 81 && bar < 90
const kickOn = (bar: number) => !creux(bar) && bar < 158
/** La basse : elle entre au deuxieme bloc, revient avant le pied dans le creux, sort avant la fin. */
const bassOn = (bar: number) => bar >= 9 && bar < 150 && !(bar >= 81 && bar < 86)
/** La mesure qui precede le creux et celle qui precede le retour : le dernier temps reste vide. */
const limite = (bar: number) => bar === 80 || bar === 89 ? 12 : 16
/** Les instants ou rien ne doit commencer. T = le pas compte depuis le debut du morceau. */
const vide = (T: number) => (T % 16) >= limite(Math.floor(T / 16))

/**
 * Ce que chaque vitesse laisse passer, bloc par bloc : "" = rien, "*" = toute
 * la phrase, sinon les familles de cases admises. Une vitesse arrive par ses
 * tetes, puis se complete.
 */
//            Seuil Mach. Lente  L2   Tiers  T2   Neuv. N2    Plat. Creux Mut.  Mut2  Fid.  Somm. Refl. R2     Trace Sortie
const P27 = ["",   "",   "*",   "*", "*",   "*", "*",  "*",  "*",  "*",  "",   "*",  "*",  "*",  "*",  "*",   "*",  "*"]
const P9 = ["",    "",   "",    "",  "Ttc", "*", "*",  "*",  "*",  "Tt", "*",  "*",  "*",  "*",  "*",  "Ttc", "",   ""]
const P3 = ["",    "",   "",    "",  "",    "",  "p",  "pc", "*",  "",   "*",  "*",  "*",  "*",  "pc", "",    "",   ""]
/** La copie infidele : la vitesse 3 pendant les deux blocs de la mutation, la vitesse 9 pendant le second. */
const mute3 = (bar: number) => blocDe(bar) === 10 || blocDe(bar) === 11
const mute9 = (bar: number) => blocDe(bar) === 11
/** Les deux seules mesures chargees : la phrase a pleine vitesse. */
const plein = (bar: number) => bar === 124 || bar === 125

type Coup = {T: number, c: string}
/**
 * Une voix : la phrase lue a raison d une case tous les k pas, depuis le
 * debut du morceau. Toutes les voix partent du meme instant : c est ce qui
 * les fait tomber ensemble. "infidele" : la case lue est 5 n au lieu de n.
 */
function voix(k: number, plan: (bar: number) => string, infidele: (bar: number) => boolean): Coup[] {
    const out: Coup[] = []
    for (let T = 0; T <= FIN * 16; T += k) {
        const bar = Math.floor(T / 16)
        if (vide(T)) {continue}
        const classes = plan(bar)
        if (classes === "") {continue}
        const n = (T / k) % 16
        const c = PHRASE.charAt(infidele(bar) ? (5 * n) % 16 : n)
        if (c === "." || (classes !== "*" && classes.indexOf(c) < 0)) {continue}
        out.push({T, c})
    }
    return out
}
const jamais = (_bar: number) => false
// Le dernier instant (mesure 162) : toutes les voix retombent sur la case 0.
const V81 = voix(81, _bar => "*", jamais)
const V27 = voix(27, bar => P27[blocDe(bar)], jamais)
const V9 = voix(9, bar => bar >= FIN ? "*" : P9[blocDe(bar)], mute9)
const V3 = voix(3, bar => bar >= FIN ? "*" : P3[blocDe(bar)], mute3)
const V1 = voix(1, bar => plein(bar) ? "*" : "", jamais)

/**
 * La courbe protagoniste : la division, de 0 a 1, sur tout le morceau. Le
 * metal s eclaircit et se tend avec elle ; les tics s allongent.
 */
const DIVISION = [[0, 0.1], [18, 0.15], [36, 0.35], [54, 0.55], [72, 0.75], [81, 0.4], [90, 0.6], [108, 0.8], [124, 1],
    [126, 0.8], [144, 0.4], [164, 0.1]]
const suit = (bas: number, haut: number, echelle: (v: number) => number) =>
    DIVISION.map(p => [p[0], echelle(bas + (haut - bas) * p[1])])

// ---------- Frappe : la grosse caisse ----------
// Les cases 0, 4, 8 et 12 : les deux tetes et le centre de la phrase.
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 55, start: 360, sweep: 46, decay: 165, punch: 0.6, click: 0.45, drive: 0.4})
pose(kick.noteTracks[0], "Frappe", parMesure(bar => {
    if (!kickOn(bar)) {return []}
    const force = bar < 36 || bar >= 144 ? 0.85 : 0.97
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step += 4) {out.push({position: step * S16, duration: S16, pitch: 36, velocity: force, cents: 0})}
    return out
}))
auto("frappe", kick, "click", [[0, 0.15], [18, 0.45], [144, 0.45], [164, 0.15]])

// ---------- Roulante : la basse ----------
// Le meme La que le pied. Elle joue sur les cases 1, 3, 9 et 11 : celles ou
// la phrase se tait. La note qui suit le pied (cases 1 et 9) est jouee sans
// sa fondamentale (velocite sous 0,35) pour ne pas marcher sur sa queue.
const bass = apparat("Roulante", ROULANTE, 0)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
pose(bass.noteTracks[0], "Roulante", parMesure(bar => {
    if (!bassOn(bar)) {return []}
    return [1, 3, 9, 11].filter(step => step < limite(bar))
        .map(step => ({position: step * S16, duration: S16, pitch: LA1, velocity: step === 1 || step === 9 ? 0.3 : 0.8, cents: 0}))
}))
auto("roulante", bass, "envmod", suit(2.6, 3.6, v => droit(v, 0, 6)))

// ---------- Le metal a l envers : les vitesses 27 et 9 ----------
// Une note de Revers finit "long" pas apres son debut : on l ecrit AVANT
// l instant vise, et elle s arrete dessus.
/** Le Revers court : trois pas. */
const LONG = 3
/** Le Revers long : sept pas. */
const LONG2 = 7
const enNotes = (coups: Coup[], avance: number, velocity: (c: string) => number): Note[] =>
    coups.map(x => {
        const h = hauteur(RAPPORT[x.c])
        return {position: (x.T - avance) * S16, duration: S16, pitch: h.pitch, velocity: velocity(x.c), cents: h.cents}
    })

const revers = apparat("Revers", REVERS, 0)
reglages("revers", revers, {
    tune: 0, pas: PAS_MS, long: LONG, curve: 0.3, metal: 0.6, bright: 0.6, bend: 2, tail: 6, drive: 0.25, lowcut: 120
})
pose(revers.noteTracks[0], "Revers", enNotes(V9, LONG, c => c === "p" ? 0.7 : 0.8))
// Le voyage : le metal s eclaircit, et sa hauteur se tend davantage avant l arret
auto("revers", revers, "bright", suit(0.4, 0.85, v => v))
auto("revers", revers, "bend", suit(1.5, 4.5, v => droit(v, 0, 12)))

const reversLong = apparat("Revers long", REVERS, 1)
reglages("revers long", reversLong, {
    tune: 0, pas: PAS_MS, long: LONG2, curve: 0.4, metal: 0.7, bright: 0.5, bend: 3, tail: 8, drive: 0.25, lowcut: 110
})
pose(reversLong.noteTracks[0], "Revers long", enNotes(V27, LONG2, _c => 0.85))

// ---------- Tole : la vitesse 3 ----------
// Une note tous les trois pas, frappee a l endroit. Quand le Revers joue
// aussi, chacune de ses notes finit sur un coup de tole de la meme hauteur.
// La pedale est frappee moins fort : c est la note qui revient le plus.
const FORCE: {[c: string]: number} = {T: 0.9, t: 0.9, c: 0.75, h: 0.7, b: 0.7, p: 0.5}
const coups = apparat("Tole", TOLE, -2)
reglages("tole", coups, {tune: 0, decay: 320, damp: 0.9, metal: 0.7, strike: 0.3, drive: 0.5, gate: 0})
coups.addSend(reverb, {amount: -22})
pose(coups.noteTracks[0], "Tole", enNotes(V3, 0, c => FORCE[c]))
auto("tole", coups, "damp", suit(0.94, 0.78, v => v))

// ---------- Tole vive : la vitesse 1 ----------
// La phrase a pleine vitesse, deux mesures seulement. Une tole plus petite,
// plus seche, qu on etouffe a chaque note.
const vive = apparat("Tole vive", TOLE, -2)
reglages("tole vive", vive, {tune: 0, decay: 110, damp: 0.8, metal: 0.6, strike: 0.5, drive: 0.4, gate: 1})
pose(vive.noteTracks[0], "Tole vive", enNotes(V1, 0, c => c === "p" ? 0.45 : 0.65))

// ---------- Gong : la vitesse 81 ----------
// Une note toutes les cinq mesures et un pas : l instant ou les cinq vitesses
// tombent ensemble. Une grande tole qu on laisse sonner, une octave sous la
// phrase quand la note le permet. Le seul son qui a droit a la salle.
const gong = apparat("Gong", TOLE, -2)
reglages("gong", gong, {tune: 0, decay: 2600, damp: 0.93, metal: 0.8, strike: 0.2, drive: 0.5, gate: 0})
essai("echo gong", () => gong.addAudioEffect("Delay", {delay: 13, feedback: 0.35, cross: 0, filter: 0.3, wet: -18}))
gong.addSend(reverb, {amount: -12})
pose(gong.noteTracks[0], "Gong", V81.map(x => {
    const r = RAPPORT[x.c]
    const h = hauteur(r > 4 ? r / 2 : r)
    return {position: x.T * S16, duration: S16 * 4, pitch: h.pitch, velocity: creux(Math.floor(x.T / 16)) || x.T >= FIN * 16 ? 0.95 : 0.8, cents: h.cents}
}))

// ---------- Gresil : les tics ----------
// Un tic a contretemps (les cases 2, 6, 10 et 14), qui ne bouge pas ; autour
// de lui, des tics plus faibles dont le nombre change. Aucun charley ouvert.
const ticks = apparat("Tics", GRESIL, -4.5)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
/** 0 = rien ; 1 = le contretemps ; 2 = + le pas d apres ; 3 = + le pas d avant ; 4 = toutes les doubles-croches ; 5 = des fantomes seuls. */
const VITESSES = [5, 1, 1, 2, 2, 3, 3, 3, 4, 0, 2, 3, 3, 4, 3, 2, 1, 1]
function vitesse(bar: number): number {
    if (bar < 4 || bar >= 158) {return 0}
    if (bar >= 86 && bar < 90) {return 5}
    return VITESSES[blocDe(bar)]
}
pose(ticks.noteTracks[0], "Tics", parMesure(bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        let force = 0
        if (v === 5) {force = beat === 2 ? 0.4 : 0}
        else {force = beat === 2 ? 0.85 : beat === 3 && v >= 2 ? 0.48 : beat === 1 && v >= 3 ? 0.36 : beat === 0 && v >= 4 ? 0.26 : 0}
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force, cents: 0})}
    }
    return out
}))
auto("tics", ticks, "decay", suit(22, 36, v => loga(v, 5, 600)))

// ---------- Rim et clap : TR-909 ----------
// Le rim joue le rythme de la pedale a la vitesse 3 : quatre coups en trois
// mesures, jamais au meme endroit de la mesure. Il arrive avant la Tole et
// l annonce. Le clap (temps 2 et 4) ne vient que sur les plateaux.
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
pose(drums.noteTracks[0], "909", parMesure(bar => {
    const out: Note[] = []
    if (!kickOn(bar)) {return out}
    const b = blocDe(bar)
    for (let step = 0; step < limite(bar); step++) {
        const T = bar * 16 + step
        if (b >= 3 && b <= 15 && T % 3 === 0 && PHRASE.charAt((T / 3) % 16) === "p") {
            out.push({position: step * S16, duration: S16, pitch: RIM, velocity: 0.72, cents: 0})
        }
        if ((b === 8 || b === 12 || b === 13) && (step === 4 || step === 12)) {
            out.push({position: step * S16, duration: S16, pitch: CLAP, velocity: step === 4 ? 0.7 : 0.75, cents: 0})
        }
    }
    return out
}))

// Limiteur de sortie : les deux references sont tres tenues (10 dB entre les cretes et le niveau moyen)
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le bloc "Fidele" et le debut du sommet (mesures 108 a 124), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, revers, reversLong, coups, vive, gong, ticks, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Revers", revers], ["Revers long", reversLong],
    ["Tole", coups], ["Tole vive", vive], ["Gong", gong], ["Tics", ticks], ["909", drums]]
if (MESURER) {
    const parts = BLOCS.map((nom, b) => [nom.toLowerCase(), b * BLOC, (b + 1) * BLOC]).concat([["fin", FIN, TOTAL]])
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
        // Les memes mesures que sur les references, sur le bloc fidele (mesures 108 a 124)
        const from = Math.floor(108 * barSec * rate), to = Math.min(n, Math.floor(124 * barSec * rate))
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
