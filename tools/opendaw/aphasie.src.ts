// APHASIE - Beat Survivor, mode Survie
// Techno minimale, un peu industrielle - 127 BPM - La phrygien - 160 mesures (5 min 02)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de aphasie.src.ts
// (le morceau) et des instruments du dossier apparat/.
//
// Le second morceau de la paire commencee avec "Friche" : memes annees (Berlin,
// 2009), memes reperes mesures ("Pick a Chick" de Harry Axt, "Subzero" de Ben
// Klock), memes cibles de mix : tout au centre, presque pas d aigu, le poids
// vers 55 Hz, tres peu d ecart entre les cretes et le niveau moyen.
//
// Retour de N4 sur "Friche" : la ligne de metal (Rivet) est tres bien mais
// "un peu naive, voire attendue dans le domaine" ; il cherche "une sonorite
// plus originale", "quelque chose de novateur" a cette place.
//
// L idee, en une phrase : une machine qui essaie de parler et n y arrive pas.
// - A la place du bleep, une BOUCHE (l instrument Glotte) : elle fabrique des
//   syllabes sans mots ("wa", "ao", "di", "bo", "oi"...), par les resonances
//   d une voix de synthese. Aucun echantillon, aucun bruit. Les voix hachees
//   sont une signature de la techno minimale de ces annees-la ; ici la voix
//   est construite de toutes pieces, et elle ne dit rien.
// - Ce qu elle dit vient de trois registres de longueurs inegales, lus en
//   meme temps : onze cases pour savoir si elle parle, sept pour la note, cinq
//   pour la syllabe. Un seuil decide combien de cases laissent passer une
//   syllabe : il baisse au fil du morceau, elle parle de plus en plus, puis de
//   moins en moins. Trois fois, on rouvre un registre pour y changer une case.
// - Une syllabe dure jusqu a la suivante : celles qui sont suivies d un
//   silence sont longues, comme les syllabes accentuees d une phrase.
// - En fin de phrase, la derniere syllabe part dans un echo : le seul.
// - Avant chaque retour de la machine, la bouche begaie.
//
// Ce qui change par rapport a "Friche", cote machine :
// - la basse joue tous les trois pas, sauf sous le pied et juste apres lui :
//   son dessin ne se repete que toutes les trois mesures ;
// - sur les temps 2 et 4, un coup de tole etouffe, a la place du rim ;
// - les tics : un contretemps qui ne bouge pas, et autour de lui des tics
//   faibles choisis par une fenetre qui tourne de plus en plus vite ;
// - La au lieu de Si bemol (55 Hz), 127 BPM, 160 mesures.
//
// Les recettes employees :
// - Dash Glitch : deux ou trois resonances qui bougent separement (un lead a
//   voyelles) ; chaque note repart du meme point (les trois ondes de la voix
//   repartent de zero a chaque battement) ; le registre a longueurs inegales
//   et son seuil ; le charley a fenetre ; la batterie booleenne (la basse est
//   "tous les trois pas ET PAS le pied").
// - Underdog : les quatre regles du minimalisme ; une courbe protagoniste ; un
//   effet qui vaut par sa rarete ; la tension par le retrait ; un seul acteur
//   dans le grave a la fois.
//
// Instruments (Apparat = instrument scriptable d openDAW) : Glotte est ecrite
// pour ce morceau ; Tole vient de "Friche" ; Frappe (grosse caisse), Roulante
// (basse) et Gresil (tics) des morceaux precedents. Aucun echantillon.

const BPM = 127
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 160
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : la basse compte en pas. */
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const ROULANTE: string = __ROULANTE_L__
const GLOTTE: string = __GLOTTE_L__
const TOLE: string = __TOLE_L__
const GRESIL: string = __GRESIL_L__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- Projet ----------
const project = openDAW.newProject("Aphasie")
project.bpm = BPM

// Une petite salle, pour le gong et l echo de la voix seulement. Le genre est sec.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.6, preDelay: 10, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seuil", start: 0, bars: 16},
    {name: "Machine", start: 16, bars: 16},
    {name: "Tole", start: 32, bars: 16},
    {name: "Parole", start: 48, bars: 16},
    {name: "Glissement", start: 64, bars: 16},
    {name: "Mutisme", start: 80, bars: 16},
    {name: "Retour", start: 96, bars: 16},
    {name: "Logorrhee", start: 112, bars: 16},
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
/** Le mutisme : la machine s arrete (mesures 80 a 96). */
const mutisme = (bar: number) => bar >= 80 && bar < 96
/** Le bloc qui demarre sans son grave : quatre mesures sans pied ni basse. */
const nu = (bar: number) => bar >= 128 && bar < 132
const kickOn = (bar: number) => !mutisme(bar) && !nu(bar) && bar < 156
/** La basse : elle entre au deuxieme bloc, revient avant le pied dans le mutisme, sort avant la fin. */
const bassOn = (bar: number) => bar >= 16 && bar < 152 && !(bar >= 80 && bar < 88) && !nu(bar)
/** La mesure qui precede un retour : la bouche begaie, puis le dernier temps reste vide. */
const avantRetour = (bar: number) => bar === 95 || bar === 131
const limite = (bar: number) => avantRetour(bar) ? 12 : 16
const rang = (bar: number) => bar % 4

/**
 * La courbe protagoniste : la parole, de 0 a 1, sur tout le morceau. Elle
 * monte par paliers, retombe dans le mutisme, culmine a la mesure 120 et se
 * tait. Le seuil du registre, l ouverture de la bouche, sa clarte, sa
 * saturation et la vitesse des tics en sortent.
 */
const PAROLE = [[0, 0.1], [16, 0.2], [32, 0.35], [48, 0.55], [64, 0.7], [80, 0.45], [88, 0.6], [96, 0.75],
    [112, 0.9], [120, 1], [128, 0.7], [144, 0.4], [160, 0.05]]
/** La valeur de la courbe a une mesure donnee. */
function parole(bar: number): number {
    for (let k = 1; k < PAROLE.length; k++) {
        if (bar < PAROLE[k][0]) {
            const a = PAROLE[k - 1], b = PAROLE[k]
            return a[1] + (b[1] - a[1]) * (bar - a[0]) / (b[0] - a[0])
        }
    }
    return PAROLE[PAROLE.length - 1][1]
}
/** Un parametre qui suit la parole, de `muet` a `bavard` ; `echelle` le ramene entre 0 et 1. */
const suit = (muet: number, bavard: number, echelle: (v: number) => number) =>
    PAROLE.map(p => [p[0], echelle(muet + (bavard - muet) * p[1])])

// ---------- Frappe : la grosse caisse ----------
// Un La (55 Hz). Elle garde de la reserve jusqu au bloc "Parole".
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 55, start: 360, sweep: 46, decay: 165, punch: 0.6, click: 0.45, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar => {
    if (!kickOn(bar)) {return []}
    const force = bar < 48 || bar >= 144 ? 0.85 : 1
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step += 4) {out.push({position: step * S16, duration: S16, pitch: 36, velocity: force})}
    return out
})
auto("frappe", kick, "click", [[0, 0.15], [16, 0.45], [144, 0.45], [160, 0.15]])

// ---------- Roulante : la basse ----------
// Tous les trois pas, depuis la premiere mesure, SAUF sous le pied et juste
// apres lui : un seul acteur dans le grave a la fois. Trois ne divise pas
// seize : le dessin ne se repete que toutes les trois mesures.
// Une mesure sur quatre, sa derniere note monte d un demi-ton : la menace.
const LA1 = 33
const bass = apparat("Roulante", ROULANTE, -2)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    const pas: number[] = []
    for (let step = 0; step < limite(bar); step++) {
        if ((bar * 16 + step) % 3 === 0 && step % 4 >= 2) {pas.push(step)}
    }
    return pas.map((step, k) => ({
        position: step * S16, duration: S16, pitch: rang(bar) === 3 && k === pas.length - 1 ? LA1 + 1 : LA1,
        velocity: step % 4 === 3 ? 0.7 : 0.8
    }))
})
auto("roulante", bass, "envmod", suit(2.6, 3.8, v => droit(v, 0, 6)))

// ---------- Glotte : la bouche ----------
// Trois registres, lus en meme temps a chaque double-croche depuis la premiere
// mesure. Aucun n a la longueur de la mesure.
/** Onze cases : la bouche parle si la case depasse le seuil du moment. */
const PORTE = [0.95, 0.2, 0.6, 0.4, 0.85, 0.1, 0.7, 0.3, 0.5, 0.9, 0.45]
/** Sept cases : la note, en demi-tons au-dessus du La. 1 = le Si bemol (la menace), 7 = le Mi, -2 = le Sol. */
const NOTES0 = [0, 0, 1, 0, 7, 0, -2]
/** Cinq cases : la syllabe. 0 wa, 1 yo, 2 ba, 3 di, 4 ou, 5 ai, 6 oi, 7 eu, 8 ao, 9 we, 10 ya, 11 bo, 12 de, 13 mou. */
const SYLLABES0 = [0, 8, 3, 11, 6]
/**
 * Les registres d un bloc. Trois fois, on en rouvre un pour y changer une case
 * (mesures 64, 96 et 112) ; a la mesure 128 ils reviennent a ce qu ils etaient.
 */
function registres(bar: number): {notes: number[], syllabes: number[]} {
    const notes = NOTES0.slice(), syllabes = SYLLABES0.slice()
    if (bar >= 64 && bar < 128) {syllabes[1] = 9}       // "ao" devient "we"
    if (bar >= 96 && bar < 128) {syllabes[3] = 13; notes[5] = 12}   // "bo" devient "mou" ; un La saute d une octave
    if (bar >= 112 && bar < 128) {syllabes[0] = 10}     // "wa" devient "ya"
    return {notes, syllabes}
}
/** Le seuil : il baisse quand la parole monte. A 0,8 trois cases sur onze passent ; a 0,35, huit. */
const seuil = (bar: number) => mutisme(bar) && bar < 88 ? 0.8 : 0.85 - 0.5 * parole(bar)
const parle = (t: number) => PORTE[t % 11] > seuil(Math.floor(t / 16))
const LA2 = 45
/** La velocite ne regle pas le volume : elle choisit la syllabe. */
const syllabe = (k: number) => 0.3 + 0.05 * k

type Dit = Note & {echo: boolean}
/** Ce que la bouche dit dans une mesure. */
function dits(bar: number): Dit[] {
    const out: Dit[] = []
    if (bar >= 156) {return out}
    // Avant un retour, elle begaie : la meme syllabe a chaque pas, puis un temps de vide
    if (avantRetour(bar)) {
        const k = bar === 95 ? 2 : 3    // "ba ba ba", puis "di di di"
        for (let step = 0; step < 12; step++) {
            out.push({position: step * S16, duration: S16 - 60, pitch: LA2 + (step >= 8 ? 1 : 0), velocity: syllabe(k), echo: false})
        }
        return out
    }
    const r = registres(bar)
    // Dans le mutisme elle parle lentement : ses syllabes peuvent durer six pas
    const longueur = mutisme(bar) && bar < 88 ? 6 : 3
    for (let step = 0; step < 16; step++) {
        const t = bar * 16 + step
        if (!parle(t)) {continue}
        // Une syllabe dure jusqu a la suivante : suivie d un silence, elle est longue (accentuee)
        let len = 1
        while (len < longueur && !parle(t + len)) {len++}
        out.push({
            position: step * S16, duration: len * S16 - (len === 1 ? 50 : 30), pitch: LA2 + r.notes[t % 7],
            velocity: syllabe(r.syllabes[t % 5]), echo: false
        })
    }
    // En fin de phrase de huit mesures, la derniere syllabe part dans l echo
    if (bar % 8 === 7 && out.length > 0 && bar >= 32) {out[out.length - 1].echo = true}
    return out
}
const BOUCHE = {
    tune: 0, size: 0.9, open: 0.4, glide: 1, tight: 90, tone: 0.4, drop: 2, attack: 4, release: 30, drive: 0.2, lowcut: 120
}
const voix = apparat("Glotte", GLOTTE, -2)
reglages("glotte", voix, BOUCHE)
build(voix.noteTracks[0], "Glotte", bar =>
    dits(bar).filter(d => !d.echo).map(d => ({position: d.position, duration: d.duration, pitch: d.pitch, velocity: d.velocity})))
// La meme bouche, pour les syllabes qui partent dans l echo
const lance = apparat("Glotte echo", GLOTTE, -5)
reglages("glotte echo", lance, BOUCHE)
essai("echo glotte", () => lance.addAudioEffect("Delay", {delay: 13, feedback: 0.55, cross: 0, filter: 0.35, wet: -5}))
lance.addSend(reverb, {amount: -12})
build(lance.noteTracks[0], "Glotte echo", bar =>
    dits(bar).filter(d => d.echo).map(d => ({position: d.position, duration: d.duration, pitch: d.pitch, velocity: d.velocity})))
// Le voyage : la machoire s ouvre, la voix s eclaircit, se sature ; dans le
// mutisme la bouche grandit (une voix plus sombre) et change de forme lentement
for (const [nom, unit] of [["glotte", voix], ["glotte echo", lance]] as [string, any][]) {
    auto(nom, unit, "open", suit(0.2, 0.8, v => v))
    auto(nom, unit, "tone", suit(0.25, 0.6, v => v))
    auto(nom, unit, "drive", suit(0.08, 0.45, v => v))
    auto(nom, unit, "size", [[0, 0.9], [79.99, 0.9], [80, 0.76], [88, 0.82], [96, 0.9], [160, 0.9]].map(p => [p[0], droit(p[1], 0.6, 1.5)]))
    auto(nom, unit, "glide", [[0, 1], [79.99, 1], [80, 2.6], [88, 1.6], [96, 1], [160, 1]].map(p => [p[0], droit(p[1], 0.3, 4)]))
}

// ---------- Tole : le coup sur les temps 2 et 4 ----------
// Une plaque etouffee des qu elle est frappee : un coup sec de metal, a la
// place d un rim. C est un Mi (la quinte) ; une fois toutes les huit mesures
// le dernier coup monte au Fa.
const MI3 = 52
const clang = apparat("Tole", TOLE, -3)
reglages("tole", clang, {tune: 0, decay: 350, damp: 0.8, metal: 0.8, strike: 0.5, drive: 0.5, gate: 1})
build(clang.noteTracks[0], "Tole", bar => {
    const out: Note[] = []
    if (!kickOn(bar) || bar < 32 || bar >= 144) {return out}
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: Math.round(S16 * 0.7), pitch, velocity})}
    }
    hit(4, MI3, 0.8)
    hit(12, bar % 8 === 7 ? MI3 + 1 : MI3, 0.85)
    // Dans les blocs les plus pleins, un coup fantome avant le premier temps
    if (bar >= 96 && bar < 128 && bar % 2 === 1) {hit(15, MI3, 0.4)}
    return out
})
auto("tole", clang, "damp", suit(0.9, 0.7, v => v))

// ---------- Tole : le gong ----------
// La meme plaque, grave, qu on laisse sonner : en tete de bloc seulement, et
// deux fois dans le mutisme. Elle a droit a la salle et a un echo.
const gong = apparat("Gong", TOLE, -2)
reglages("gong", gong, {tune: 0, decay: 2600, damp: 0.93, metal: 0.7, strike: 0.2, drive: 0.6, gate: 0})
essai("echo gong", () => gong.addAudioEffect("Delay", {delay: 13, feedback: 0.45, cross: 0, filter: 0.3, wet: -14}))
gong.addSend(reverb, {amount: -10})
build(gong.noteTracks[0], "Gong", bar => {
    const tete = bar >= 32 && bar % 16 === 0 && bar < 160
    if (tete || bar === 84) {return [{position: 0, duration: S16, pitch: LA1 + 12, velocity: bar === 84 ? 0.6 : 0.95}]}
    return []
})

// ---------- Gresil : les tics ----------
// Un tic a contretemps, qui ne bouge pas. Autour de lui, des tics faibles
// choisis par une fenetre qui s ouvre plusieurs fois par mesure : plus la
// machine parle, plus la fenetre tourne vite, et le dessin change a chaque
// phrase de huit mesures. Aucun charley ouvert.
const ticks = apparat("Tics", GRESIL, -3)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    if (bar < 8 || bar >= 152 || nu(bar) || (bar >= 80 && bar < 88)) {return out}
    const fantomes = bar < 16 || mutisme(bar)
    // La vitesse de la fenetre : fixe pendant huit mesures, en demi-tours par mesure
    const tours = Math.round((1.5 + 5 * parole(Math.floor(bar / 8) * 8)) * 2) / 2
    for (let step = 0; step < limite(bar); step++) {
        const contretemps = step % 4 === 2
        const fenetre = ((step / 16) * tours + 0.13) % 1 < 0.22
        let force = 0
        if (contretemps) {force = fantomes ? 0.4 : 0.85}
        else if (fenetre && bar >= 32) {force = step % 2 === 1 ? 0.4 : 0.3}
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force})}
    }
    return out
})
auto("tics", ticks, "decay", suit(22, 38, v => loga(v, 5, 600)))

// Limiteur de sortie : les deux references sont tres tenues (10 dB entre les cretes et le niveau moyen)
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le bloc du retour (mesures 96 a 112), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, voix, lance, clang, gong, ticks]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Glotte", voix], ["Echo", lance],
    ["Tole", clang], ["Gong", gong], ["Tics", ticks]]
if (MESURER) {
    const parts = [["seuil", 0, 16], ["machine", 16, 32], ["tole", 32, 48], ["parole", 48, 64], ["glissement", 64, 80],
        ["mutisme", 80, 88], ["attente", 88, 96], ["retour", 96, 112], ["logorrhee", 112, 128], ["nu", 128, 132],
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
