// @label Lueur
// @param decay   260   30    4000  exp     ms
// @param matter  0.25  0     1     linear
// @param strike  0.5   0     1     linear
// @param damp    0.5   0     1     linear
// @param chirp   0     0     24    linear  st
// @param grain   0.3   0     1     linear
// @param tonic   43    24    72    linear
// @param just    1     0     1     linear
// @param drift   0.4   0     1     linear
// @param duck    0.3   0     1     linear
// @param width   0.5   0     1     linear
// @param drive   0.2   0     1     linear
// @param volume  0.6   0     1     linear

// Une percussion qui chante. Pas d'oscillateur : un coup tres bref (un clic et
// une pincee de bruit, "grain") frappe six resonateurs accordes, et ce sont
// eux qui donnent la note. C'est le principe d'une lame, d'un verre ou d'une
// cloche : la hauteur vient de l'objet, le coup ne donne que le grain.
// - "matter" change la matiere : a 0 les six resonateurs sont en rapports
//   entiers (corde, verre), a 1 ce sont ceux d'une lame libre (bois, metal),
//   entre les deux une cloche ;
// - "strike" : la durete du coup. Un coup dur reveille les resonateurs aigus ;
// - "damp" : a quel point les aigus s'eteignent plus vite que le grave ;
// - "chirp" : la note part plus haut et retombe en 12 ms (une peau frappee) ;
// - "tonic" et "just" : les notes sont accordees sur les harmoniques naturels
//   de la tonique (9/8, 5/4, 11/8, 3/2, 13/8, 7/4) et non sur le clavier
//   tempere. "just" a 0 rend le clavier ordinaire ;
// - "drift" : deux coups de suite ne sont jamais identiques (matiere, durete
//   et grain bougent un peu, sur une horloge lente) ;
// Comme sur un instrument, un coup plus fort est plus clair et plus long.
// "duck" : toute note plus grave que 24 ne sonne pas, elle fait plonger le son.
class Processor {
    decayMs = 260
    matter = 0.25
    strike = 0.5
    damp = 0.5
    chirp = 0
    grain = 0.3
    tonic = 43
    just = 1
    drift = 0.4
    duck = 0.3
    width = 0.5
    drive = 0.2
    volume = 0.6
    voices = []
    count = 0
    lfo = 0
    dip = 0
    dipSmooth = 0
    paramChanged(name, value) {
        switch (name) {
            case "decay": this.decayMs = value; break
            case "matter": this.matter = value; break
            case "strike": this.strike = value; break
            case "damp": this.damp = value; break
            case "chirp": this.chirp = value; break
            case "grain": this.grain = value; break
            case "tonic": this.tonic = value; break
            case "just": this.just = value; break
            case "drift": this.drift = value; break
            case "duck": this.duck = value; break
            case "width": this.width = value; break
            case "drive": this.drive = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {
            this.dip = 1
            return
        }
        const sr = sampleRate
        this.count++
        // L'ecart, en cents, entre le clavier tempere et les harmoniques de la tonique
        const JUST = [0, 0, 3.91, 0, -13.69, 0, -48.68, 1.96, 0, -59.47, -31.17, 0]
        const degree = (((Math.round(pitch) - Math.round(this.tonic)) % 12) + 12) % 12
        const f0 = 440 * Math.pow(2, (pitch - 69 + (cent + JUST[degree] * this.just) / 100) / 12)
        const sway = Math.sin(2 * Math.PI * this.lfo)
        const tick = this.count % 2 === 0 ? 1 : -1
        const clamp = (v) => Math.max(0, Math.min(1, v))
        const matter = clamp(this.matter + this.drift * (0.05 * tick + 0.07 * sway))
        const bright = clamp(this.strike * (0.5 + 0.7 * velocity) + this.drift * 0.08 * sway)
        // Rapports entiers (corde, verre) et rapports d'une lame libre (bois, metal)
        const H = [1, 2, 3, 4, 5, 6]
        const B = [1, 2.756, 5.404, 8.933, 13.344, 18.64]
        const tau = this.decayMs * 0.001 * (0.5 + 0.7 * velocity)
        const modes = []
        let norm = 0
        for (let k = 0; k < 6; k++) {
            const ratio = H[k] + (B[k] - H[k]) * matter
            const f = f0 * ratio
            if (f > sr * 0.42) {continue}
            const gain = Math.pow(ratio, -(2.6 - 2.2 * bright))
            const t = tau / Math.pow(ratio, 0.3 + 1.5 * this.damp)
            const w = 2 * Math.PI * f / sr
            modes.push({w, c: Math.cos(w), s: Math.sin(w), r: Math.exp(-1 / (Math.max(0.004, t) * sr)), gain, re: 0, im: 0})
            norm += gain
        }
        if (modes.length === 0) {return}
        if (this.voices.length >= 8) {this.voices.shift()}
        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width
        const angle = (1 + place * 0.6) * Math.PI / 4
        this.voices.push({
            modes, norm: 1 / norm, age: 0, life: Math.round(7 * tau * sr),
            level: 0.3 + 0.7 * velocity,
            // Le coup : un clic, puis 1,5 ms de bruit. La graine du bruit bouge avec "drift".
            burst: Math.round(0.0015 * sr), seed: (97531 + (this.drift > 0 ? this.count * 7919 : 0)) >>> 0,
            bend: Math.pow(2, this.chirp / 12) - 1, envBend: this.chirp > 0 ? 1 : 0, kBend: Math.exp(-1 / (0.012 * sr)),
            left: Math.cos(angle), right: Math.sin(angle)
        })
    }
    noteOff(id) {
    }
    reset() {
        this.voices = []
        this.dip = 0
        this.dipSmooth = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        this.lfo += 0.05 * (block.s1 - block.s0) / sr
        if (this.lfo >= 1) {this.lfo -= 1}
        const kDip = Math.exp(-1 / (0.110 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))
        const g = 1 + 4 * this.drive
        const grain = this.grain
        for (let s = block.s0; s < block.s1; s++) {
            this.dip *= kDip
            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth
            let left = 0, right = 0
            for (const v of this.voices) {
                // Le coup qui frappe les resonateurs
                let x = v.age === 0 ? 1 - 0.5 * grain : 0
                if (v.age < v.burst) {
                    v.seed = (v.seed * 1664525 + 1013904223) >>> 0
                    x += (v.seed / 2147483648 - 1) * grain * 0.3 * (1 - v.age / v.burst)
                }
                // La chute de hauteur : les resonateurs sont reaccordes toutes les 8 notes d'horloge
                if (v.envBend > 0.002) {
                    if ((v.age & 7) === 0) {
                        const m = 1 + v.bend * v.envBend
                        for (const q of v.modes) {
                            const w = Math.min(q.w * m, 2.6)
                            q.c = Math.cos(w)
                            q.s = Math.sin(w)
                        }
                    }
                    v.envBend *= v.kBend
                } else if (v.envBend > 0) {
                    v.envBend = 0
                    for (const q of v.modes) {
                        q.c = Math.cos(q.w)
                        q.s = Math.sin(q.w)
                    }
                }
                let y = 0
                for (const q of v.modes) {
                    const re = (q.re * q.c - q.im * q.s) * q.r + x * q.gain
                    q.im = (q.re * q.s + q.im * q.c) * q.r
                    q.re = re
                    y += q.im
                }
                y *= v.norm * v.level
                left += y * v.left
                right += y * v.right
                v.age++
            }
            const a = this.volume * (1 - this.duck * this.dipSmooth) / g
            outL[s] += Math.tanh(left * g) * a
            outR[s] += Math.tanh(right * g) * a
        }
        if (this.voices.length > 0 && this.voices[0].age > this.voices[0].life) {this.voices.shift()}
    }
}
