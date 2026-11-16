// @label Peigne
// @param tune    28    -400  100   linear  ct
// @param decay   1400  100   6000  exp     ms
// @param bright  0.5   0     1     linear
// @param metal   0.3   0     1     linear
// @param strike  0.3   0     1     linear
// @param soft    5     0.5   60    exp     ms
// @param beat    1.5   0     12    linear  ct
// @param wow     14    0     60    linear  ct
// @param flutter 3     0     20    linear  ct
// @param phase   0     0     1     linear
// @param drift   5     0     30    linear  ct
// @param width   0.6   0     1     linear
// @param volume  0.5   0     1     linear

// Le peigne d'une boite a musique : des lames de metal qu'un cylindre pince.
// Une note = quelques partiels purs qui s'eteignent chacun a sa vitesse, les
// plus hauts d'abord : le son commence clair et finit rond. Aucun bruit,
// aucune saturation.
// - "decay" : la duree de la note (les notes hautes durent moins) ;
// - "bright" : la force des partiels du haut ;
// - "metal" : a 0 les partiels sont justes (une lame ideale), a 1 ils sont
//   ceux d'une vraie lame, un peu faux entre eux ;
// - "strike" : le petit choc du pincement, tres court ;
// - "soft" : le temps que met la note a naitre (pas de clic) ;
// - "beat" : chaque note est jouee deux fois, a quelques cents d'ecart, une a
//   gauche et une a droite : elle ondule lentement ;
// - la bande, comme pour Magneto : "tune" (tout est accorde a cote), "wow" et
//   "flutter" (la hauteur derive et tremble), "phase" (ou commence la derive),
//   "drift" (chaque note est un peu fausse a sa facon).
// Une lame ne s'etouffe pas : la fin de la note ecrite est ignoree.
// La velocite regle la force et la clarte.
class Processor {
    tune = 28
    decayMs = 1400
    bright = 0.5
    metal = 0.3
    strike = 0.3
    softMs = 5
    beat = 1.5
    wow = 14
    flutter = 3
    phase = 0
    drift = 5
    width = 0.6
    volume = 0.5
    voices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => ({
        on: false, freq: 440, vel: 0, t: 0, order: 0, tilt: 0,
        p: [0, 0, 0, 0, 0, 0], e: [0, 0, 0, 0, 0], k: [0, 0, 0, 0, 0], a: [0, 0, 0, 0, 0], r: [1, 2, 3, 4, 8]
    }))
    n = 0
    count = 0
    seed = 3955
    bufL = new Float32Array(64)
    bufR = new Float32Array(64)
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "decay": this.decayMs = value; break
            case "bright": this.bright = value; break
            case "metal": this.metal = value; break
            case "strike": this.strike = value; break
            case "soft": this.softMs = value; break
            case "beat": this.beat = value; break
            case "wow": this.wow = value; break
            case "flutter": this.flutter = value; break
            case "phase": this.phase = value; break
            case "drift": this.drift = value; break
            case "width": this.width = value; break
            case "volume": this.volume = value; break
        }
    }
    rnd() {
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0
        return this.seed / 4294967296
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        // Une voix libre, sinon la plus ancienne
        let v = null
        for (const w of this.voices) {
            if (!w.on) {v = w; break}
            if (v === null || w.order < v.order) {v = w}
        }
        const sr = sampleRate
        const m = this.metal
        v.on = true
        v.freq = freq
        v.vel = velocity
        v.t = 0
        v.order = ++this.count
        v.tilt = this.rnd() * 2 - 1
        // Les partiels : le fondamental, puis trois autres et le choc
        v.r[0] = 1
        v.r[1] = 2 + 0.01 * m
        v.r[2] = 3 + 2.4 * m
        v.r[3] = 4 + 2.27 * m
        v.r[4] = 8.1 + 3 * m
        // Une note haute dure moins longtemps
        const len = this.decayMs * 0.001 * Math.pow(261.6 / freq, 0.5)
        const clair = this.bright * (0.5 + 0.7 * velocity)
        const amps = [1, 0.34 * (0.4 + clair), 0.3 * clair, 0.16 * clair, 0.3 * this.strike * (0.4 + velocity)]
        const lens = [len, len * 0.5, len * 0.27, len * 0.16, 0.014]
        for (let i = 0; i < 5; i++) {
            // Rien au-dessus de 7 kHz : la, un partiel pur fait mal
            v.a[i] = freq * v.r[i] < 7000 ? amps[i] : 0
            v.e[i] = 1
            v.k[i] = Math.exp(-1 / (lens[i] * 0.33 * sr))
            v.p[i] = 0
        }
        v.p[5] = 0.25
    }
    noteOff(id) {}
    reset() {
        for (const v of this.voices) {v.on = false}
    }
    // La hauteur de la bande au temps t, en cents
    cents(t) {
        const w = 2 * Math.PI
        const ph = this.phase
        const slow = 0.62 * Math.sin(w * (0.37 * t + ph)) + 0.28 * Math.sin(w * (0.83 * t + 1.7 * ph)) + 0.1 * Math.sin(w * (1.9 * t + 0.3))
        const fast = 0.6 * Math.sin(w * (6.1 * t + 5 * ph)) + 0.4 * Math.sin(w * 9.3 * t)
        return this.tune + this.wow * slow + this.flutter * fast
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const soft = Math.max(8, this.softMs * 0.001 * sr)
        const wl = 0.5 + 0.5 * this.width
        const wr = 1 - wl
        const bufL = this.bufL, bufR = this.bufR
        for (let a = block.s0; a < block.s1; a += 64) {
            const len = Math.min(64, block.s1 - a)
            const n0 = this.n
            this.n += len
            let active = false
            for (const v of this.voices) {if (v.on) {active = true}}
            if (!active) {continue}
            const c0 = this.cents(n0 / sr), c1 = this.cents((n0 + len) / sr)
            for (let i = 0; i < len; i++) {bufL[i] = 0; bufR[i] = 0}
            for (const v of this.voices) {
                if (!v.on) {continue}
                const own = v.tilt * this.drift
                const r0 = Math.pow(2, (c0 + own) / 1200), r1 = Math.pow(2, (c1 + own) / 1200)
                const dr = (r1 - r0) / len
                const twin = Math.pow(2, this.beat / 1200)
                const base = v.freq / sr
                const amp = Math.pow(v.vel, 1.3) * 0.5
                const p = v.p, e = v.e, k = v.k, am = v.a, rr = v.r
                for (let i = 0; i < len; i++) {
                    const d = base * (r0 + dr * i)
                    // Le fondamental, deux fois : une a gauche, une a droite, a quelques cents
                    p[0] += d
                    if (p[0] >= 1) {p[0] -= 1}
                    p[5] += d * twin
                    if (p[5] >= 1) {p[5] -= 1}
                    e[0] *= k[0]
                    const f1 = Math.sin(twoPi * p[0]) * e[0], f2 = Math.sin(twoPi * p[5]) * e[0]
                    // Les partiels du haut, au centre
                    let hi = 0
                    for (let j = 1; j < 5; j++) {
                        if (am[j] === 0 || e[j] < 0.0005) {continue}
                        p[j] += d * rr[j]
                        if (p[j] >= 1) {p[j] -= 1}
                        e[j] *= k[j]
                        hi += Math.sin(twoPi * p[j]) * e[j] * am[j]
                    }
                    const g = amp * Math.min(1, (v.t + i) / soft)
                    bufL[i] += (f1 * wl + f2 * wr + hi) * g
                    bufR[i] += (f2 * wl + f1 * wr + hi) * g
                }
                v.t += len
                if (e[0] < 0.0003) {v.on = false}
            }
            const vol = this.volume
            for (let i = 0; i < len; i++) {
                outL[a + i] += bufL[i] * vol
                outR[a + i] += bufR[i] * vol
            }
        }
    }
}
