// @label Rivet
// @param tune    0     -100  100   linear  ct
// @param decay   80    8     2000  exp     ms
// @param reach   1.2   0     3     linear
// @param bend    5     0     24    linear  st
// @param bendms  14    2     200   exp     ms
// @param body    0.4   0     1     linear
// @param ratio   2.76  1     6     linear
// @param drive   0.35  0     1     linear
// @param click   0.4   0     1     linear
// @param volume  0.5   0     1     linear

// Un filtre tres resonant qu'on frappe : il chante une note puis se tait. Pas
// d'oscillateur, pas de bruit : la note vient du filtre lui-meme (recette du
// "filtre comme source"). C'est le bleep sec de la techno minimale, entre le
// tom, le bois et le metal.
// - "decay" : le temps que la note met a s'eteindre, pour un coup moyen ;
// - "reach" : ce que la force du coup ajoute a cette duree. Un coup fort sonne
//   plus longtemps ET plus clair ; un coup faible est court et sourd ;
// - "bend", "bendms" : la note part plus haut et retombe (en demi-tons, en ms) ;
// - "body", "ratio" : un second filtre, plus haut ("ratio" fois la note), qui
//   s'eteint deux fois plus vite : le corps du coup. Un rapport entier sonne
//   juste (un tom), un rapport quelconque sonne metal ;
// - "drive" : la saturation. Elle ecrase le debut de la note (riche) et laisse
//   la queue pure ;
// - "click" : a 0 la note nait en douceur, a 1 elle claque.
// Quatre voix, en mono, au centre.
class Processor {
    tune = 0
    decayMs = 80
    reach = 1.2
    bend = 5
    bendMs = 14
    body = 0.4
    ratio = 2.76
    drive = 0.35
    click = 0.4
    volume = 0.5
    voices = [0, 1, 2, 3].map(() => ({
        on: false, f: 220, t: 0, a: 0, b: 0, c: 0, d: 0, k1: 0.999, k2: 0.999, order: 0,
        cs1: 1, sn1: 0, cs2: 1, sn2: 0
    }))
    count = 0
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "decay": this.decayMs = value; break
            case "reach": this.reach = value; break
            case "bend": this.bend = value; break
            case "bendms": this.bendMs = value; break
            case "body": this.body = value; break
            case "ratio": this.ratio = value; break
            case "drive": this.drive = value; break
            case "click": this.click = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        let v = null
        for (const w of this.voices) {
            if (!w.on) {v = w; break}
            if (v === null || w.order < v.order) {v = w}
        }
        const sr = sampleRate
        v.on = true
        v.f = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)
        v.t = 0
        v.order = ++this.count
        // La force du coup allonge la note
        const len = this.decayMs * 0.001 * Math.pow(2, this.reach * 2 * (velocity - 0.6)) / 3
        v.k1 = Math.exp(-1 / (len * sr))
        v.k2 = Math.exp(-1 / (len * 0.45 * sr))
        // Le coup : le filtre part d'un etat donne. Tout dans la partie reelle = un claquement
        const amp = 0.25 + 0.75 * velocity
        const c = this.click
        v.a = amp * c
        v.b = -amp * Math.sqrt(1 - c * c)
        v.c = amp * this.body * 0.6 * c
        v.d = -amp * this.body * 0.6 * Math.sqrt(1 - c * c)
    }
    noteOff(id) {}
    reset() {
        for (const v of this.voices) {v.on = false}
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const bendTau = this.bendMs * 0.001 * sr
        const push = 1 + 6 * this.drive
        const norm = this.volume / Math.sqrt(push)
        const ratio = this.ratio
        for (const v of this.voices) {
            if (!v.on) {continue}
            for (let s = block.s0; s < block.s1; s++) {
                // La hauteur retombe : on recalcule la rotation toutes les 8 notes d'horloge
                if ((v.t & 7) === 0) {
                    const f = v.f * Math.pow(2, this.bend / 12 * Math.exp(-v.t / bendTau))
                    const w1 = twoPi * Math.min(f, sr * 0.45) / sr, w2 = twoPi * Math.min(f * ratio, sr * 0.45) / sr
                    v.cs1 = Math.cos(w1); v.sn1 = Math.sin(w1); v.cs2 = Math.cos(w2); v.sn2 = Math.sin(w2)
                }
                let a = (v.a * v.cs1 - v.b * v.sn1) * v.k1
                v.b = (v.a * v.sn1 + v.b * v.cs1) * v.k1
                v.a = a
                a = (v.c * v.cs2 - v.d * v.sn2) * v.k2
                v.d = (v.c * v.sn2 + v.d * v.cs2) * v.k2
                v.c = a
                const y = Math.tanh((v.a + v.c) * push) * norm
                outL[s] += y
                outR[s] += y
                v.t++
            }
            if (v.a * v.a + v.b * v.b < 0.00000004) {v.on = false}
        }
    }
}
