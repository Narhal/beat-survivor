// BANC D ECOUTE - trois timbres candidats pour la ligne principale
// 126 BPM - La - 72 mesures (2 min 17)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// banc-timbres.src.ts et des instruments du dossier apparat/.
//
// Ce n est pas un morceau. Apres deux paris manques sur le timbre de la ligne
// principale (Rivet : "naif, voire attendu" ; Glotte : "fait jouet"), N4
// tranche a l oreille entre trois candidats avant qu un morceau soit ecrit.
//
// La meme machine tourne du debut a la fin (pied, basse, tic a contretemps).
// Chaque candidat a 24 mesures, et suit la regle de dosage tiree des deux
// references berlinoises : 4 mesures d absence, 8 de parcimonie, 8 d arrivee,
// 4 plus chargees.
//   mesures  1 a 24 : 1 - LARSEN     une boucle de retour qui enfle et qu on coupe
//   mesures 25 a 48 : 2 - GUIMBARDE  une lame sur une seule note, une bouche qui en tire les harmoniques
//   mesures 49 a 72 : 3 - REVERS     du metal joue a l envers, qui finit sur le temps
//
// Les lignes evitent ce que mes melodies avaient de trop attendu : pas de
// tonique sur les temps forts, pas de "demi-ton de menace", des phrases de
// trois mesures contre des blocs de huit, des entrees hors du temps. Le
// Larsen et la Guimbarde ne jouent pas les notes du clavier : ils choisissent
// parmi les harmoniques d un La grave (le 7e, le 10e et le 11e tombent entre
// deux touches).

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 72
const barSec = 240 / BPM
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = __FRAPPE_L__
const ROULANTE: string = __ROULANTE_L__
const GRESIL: string = __GRESIL_L__
const LARSEN: string = __LARSEN_L__
const GUIMBARDE: string = __GUIMBARDE_L__
const REVERS: string = __REVERS_L__

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

const project = openDAW.newProject("Banc - trois timbres")
project.bpm = BPM

const SECTIONS = [
    {name: "1 Larsen", start: 0, bars: 24},
    {name: "2 Guimbarde", start: 24, bars: 24},
    {name: "3 Revers", start: 48, bars: 24}
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

// ---------- La machine : la meme pour les trois ----------
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 55, start: 360, sweep: 46, decay: 165, punch: 0.6, click: 0.45, drive: 0.4})
build(kick.noteTracks[0], "Frappe", () => [0, 4, 8, 12].map(step => ({position: step * S16, duration: S16, pitch: 36, velocity: 0.95})))

const LA1 = 33
const bass = apparat("Roulante", ROULANTE, -2)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar =>
    (bar % 2 === 0 ? [3, 6, 11, 14] : [3, 6, 10, 14]).map((step, k) => ({position: step * S16, duration: S16, pitch: LA1, velocity: k === 0 ? 0.65 : 0.8})))

const ticks = apparat("Tics", GRESIL, -3)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
build(ticks.noteTracks[0], "Tics", () => [2, 6, 10, 14].map(step => ({position: step * S16, duration: S16 / 2, pitch: 84, velocity: 0.85})))

// ---------- Le dosage : le meme pour les trois ----------
/** La mesure dans les 24 du candidat. */
const local = (bar: number) => bar % 24
/** 0 = absence ; 1 = parcimonie ; 2 = arrivee ; 3 = charge. */
const dose = (bar: number): number => local(bar) < 4 ? 0 : local(bar) < 12 ? 1 : local(bar) < 20 ? 2 : 3

// ---------- 1. Larsen ----------
// Le retard est accorde sur le La grave (55 Hz) ; la velocite choisit
// l harmonique qui chante. Chaque note : [pas de depart, longueur en pas,
// harmonique]. Une note enfle pendant un pas environ, tient, et s arrete net :
// la plupart finissent pile sur un coup de pied, qui les coupe.
// 6 = Mi ; 7 = un Sol trop bas ; 8 = La ; 9 = Si ; 10 = un Do diese trop bas ;
// 11 = entre Re et Re diese.
type Souffle = number[][]
const L_RARE: {[bar: number]: Souffle} = {4: [[5, 3, 7]], 6: [[13, 3, 9]], 8: [[5, 3, 7]], 9: [[9, 3, 6]], 10: [[13, 3, 11]]}
// Trois mesures qui tournent dans un bloc de huit : la phrase ne retombe pas sur ses pieds
const L_PHRASE: Souffle[] = [
    [[5, 3, 7], [13, 3, 9]],
    [[1, 3, 6], [9, 3, 11]],
    [[5, 7, 10]]
]
const L_CHARGE: Souffle[] = [
    [[5, 3, 7], [9, 3, 10], [13, 3, 9]],
    [[1, 3, 6], [5, 3, 11], [13, 3, 7]],
    [[1, 3, 9], [5, 7, 10], [13, 3, 6]],
    [[1, 3, 7], [5, 3, 11], [9, 3, 9], [13, 3, 8]]
]
const hLarsen = (h: number) => 0.3 + 0.05 * (h - 2)
const larsen = apparat("1 Larsen", LARSEN, -12)
reglages("larsen", larsen, {
    tune: 0, rise: 3.5, fall: 22, focus: 2.5, dark: 0.6, grit: 0.8, drift: 5, sweep: 1, slew: 90, lowcut: 130
})
build(larsen.noteTracks[0], "Larsen", bar => {
    if (bar >= 24) {return []}
    const d = dose(bar), b = local(bar)
    const notes: Souffle = d === 0 ? [] : d === 1 ? (L_RARE[b] ?? []) : d === 2 ? L_PHRASE[(b - 12) % 3] : L_CHARGE[b - 20]
    return notes.map(n => ({position: n[0] * S16, duration: n[1] * S16 - 20, pitch: LA1, velocity: hLarsen(n[2])}))
})

// ---------- 2. Guimbarde ----------
// La lame reste sur le La grave. Chaque pincement deplace la bouche : la suite
// des harmoniques (sept) ne suit pas la suite des pincements, qui ne suit pas
// la mesure. Les pincements evitent les coups de pied.
const BOUCHES = [6, 7, 9, 7, 11, 8, 10]
const hGuimbarde = (h: number) => 0.3 + 0.05 * (h - 3)
const G_RARE: {[bar: number]: number[]} = {4: [3], 5: [10], 6: [6], 7: [13], 8: [3, 10], 9: [6], 10: [13, 3], 11: [10]}
const guimbarde = apparat("2 Guimbarde", GUIMBARDE, -1)
reglages("guimbarde", guimbarde, {
    tune: 0, decay: 300, focus: 18, glide: 50, drone: 0.25, edge: 0.5, drive: 0.25, lowcut: 150
})
/** Les pas pinces d une mesure, selon la dose. */
function pinces(bar: number): number[] {
    const d = dose(bar), b = local(bar)
    if (d === 0) {return []}
    if (d === 1) {return (G_RARE[b] ?? []).slice().sort((p, q) => p - q)}
    const out: number[] = []
    for (let step = 0; step < 16; step++) {
        if (step % 4 === 0) {continue}
        const t = b * 16 + step
        // Un pincement tous les cinq pas ; dans les quatre dernieres mesures, deux
        if (t % 5 === 2 || (d === 3 && t % 5 === 4)) {out.push(step)}
    }
    return out
}
// Le rang de chaque pincement dans le candidat, pour lire la suite des bouches sans rupture
const rangPince: {[cle: string]: number} = {}
{
    let k = 0
    for (let bar = 24; bar < 48; bar++) {for (const step of pinces(bar)) {rangPince[bar + ":" + step] = k++}}
}
build(guimbarde.noteTracks[0], "Guimbarde", bar => {
    if (bar < 24 || bar >= 48) {return []}
    return pinces(bar).map(step => ({
        position: step * S16, duration: S16, pitch: LA1, velocity: hGuimbarde(BOUCHES[rangPince[bar + ":" + step] % 7])
    }))
})

// ---------- 3. Revers ----------
// Une note finit "long" pas apres son debut : on l ecrit donc trois pas avant
// l instant vise. Chaque note : [pas ou elle FINIT, note]. Elles finissent sur
// les temps 2 et 4, ou juste apres.
// Quatre notes, aucune n est la tonique ni sa quinte : Fa, Do, Re, Sol.
const FA3 = 53, DO4 = 60, RE3 = 50, SOL3 = 55
const LONG = 3
type Fins = number[][]
const R_RARE: {[bar: number]: Fins} = {4: [[12, FA3]], 6: [[4, DO4]], 8: [[12, RE3]], 10: [[6, SOL3]], 11: [[14, FA3]]}
const R_PHRASE: Fins[] = [
    [[4, FA3], [14, DO4]],
    [[8, RE3], [12, FA3]],
    [[6, SOL3]]
]
const R_CHARGE: Fins[] = [
    [[4, FA3], [10, DO4], [14, RE3]],
    [[6, SOL3], [12, FA3]],
    [[4, DO4], [8, RE3], [14, SOL3]],
    [[4, FA3], [8, DO4], [12, RE3], [15, FA3]]
]
const revers = apparat("3 Revers", REVERS, 0)
reglages("revers", revers, {
    tune: 0, pas: PAS_MS, long: LONG, curve: 0.3, metal: 0.6, bright: 0.6, bend: 2, tail: 6, drive: 0.25, lowcut: 120
})
build(revers.noteTracks[0], "Revers", bar => {
    if (bar < 48) {return []}
    const d = dose(bar), b = local(bar)
    const fins: Fins = d === 0 ? [] : d === 1 ? (R_RARE[b] ?? []) : d === 2 ? R_PHRASE[(b - 12) % 3] : R_CHARGE[b - 20]
    // Toutes ces notes finissent au pas 4 ou plus tard : elles commencent dans la meme mesure
    return fins.map(f => ({position: (f[0] - LONG) * S16, duration: S16, pitch: f[1], velocity: 0.8}))
})

// Limiteur de sortie, comme dans les morceaux
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu ----------
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, ticks, larsen, guimbarde, revers]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Tics", ticks], ["Larsen", larsen],
    ["Guimbarde", guimbarde], ["Revers", revers]]
if (MESURER) {
    const parts = [["L absent", 0, 4], ["L rare", 4, 12], ["L arrive", 12, 20], ["L charge", 20, 24],
        ["G absent", 24, 28], ["G rare", 28, 36], ["G arrive", 36, 44], ["G charge", 44, 48],
        ["R absent", 48, 52], ["R rare", 52, 60], ["R arrive", 60, 68], ["R charge", 68, 72]]
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
        // Les memes mesures que sur les references, sur l arrivee du premier candidat (mesures 12 a 20)
        const from = Math.floor(12 * barSec * rate), to = Math.min(n, Math.floor(20 * barSec * rate))
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
                line += " || mesures 12-20 : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
