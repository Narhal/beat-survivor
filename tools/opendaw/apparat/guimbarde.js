// @label Guimbarde
// @param tune    0     -100  100   linear  ct
// @param decay   320   40    3000  exp     ms
// @param focus   18    3     60    exp
// @param glide   60    2     600   exp     ms
// @param drone   0.25  0     1     linear
// @param edge    0.5   0     1     linear
// @param drive   0.2   0     1     linear
// @param lowcut  150   40    500   exp     Hz
// @param volume  0.5   0     1     linear

// Une guimbarde : une lame qu'on pince, toujours sur la meme note grave, et
// une bouche qui choisit ce qu'on en entend. La lame contient tous les
// harmoniques de sa note ; la bouche est un filtre tres etroit qui n'en laisse
// sortir qu'un a la fois. La melodie n'est donc pas jouee : elle est choisie,
// dans les harmoniques d'une seule note. Le 7e et le 11e tombent entre deux
// touches du clavier.
// - La hauteur de la note donne la note de la lame (le bourdon).
// - La VELOCITE ne regle pas le volume : elle dit ou va la bouche. 0,30 = le
//   3e harmonique ; 0,35 = le 4e ; ... 0,95 = le 16e.
// - Chaque note pince la lame de nouveau ; entre deux pincements le son
//   s'eteint ("decay"), et la bouche glisse vers sa nouvelle place ("glide") ;
// - "focus" : l'etroitesse de la bouche. Etroite, on n'entend qu'un harmonique,
//   qui siffle ; large, on entend la lame entiere ;
// - "drone" : ce qu'on laisse entendre de la lame elle-meme, sous le sifflement ;
// - "edge" : la durete de la lame (ronde ou mordante) ;
// - "lowcut" : coupe le bas, pour laisser le grave au pied et a la basse.
// Une seule voix, en mono.
class Processor {
    tune = 0
    decayMs = 320
    focus = 18
    glideMs = 60
    drone = 0.25
    edge = 0.5
    drive = 0.2
    lowcut = 150
    volume = 0.5
    freq = 55
    ph = 0
    env = 0
    att = 0
    fcNow = 330
    fcTo = 330
    comp = 1
    f = [0, 0, 0, 0]
    hp = [0, 0]
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "decay": this.decayMs = value; break
            case "focus": this.focus = value; break
            case "glide": this.glideMs = value; break
            case "drone": this.drone = value; break
            case "edge": this.edge = value; break
            case "drive": this.drive = value; break
            case "lowcut": this.lowcut = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        const h = 3 + Math.max(0, Math.min(13, Math.round((velocity - 0.3) / 0.05)))
        this.freq = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)
        this.fcTo = this.freq * h
        // Un harmonique haut est plus faible dans la lame : on le remonte un peu
        this.comp = Math.pow(h / 6, 0.7)
        // La premiere fois, la bouche est deja en place
        if (this.env < 0.001) {this.fcNow = this.fcTo; this.ph = 0}
        this.env = 1
        this.att = 0
    }
    noteOff(id) {}
    reset() {
        this.env = 0
    }
    blep(p, dt) {
        if (p < dt) {const u = p / dt; return u + u - u * u - 1}
        if (p > 1 - dt) {const u = (p - 1) / dt; return u * u + u + u + 1}
        return 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kDec = Math.exp(-1 / (this.decayMs * 0.001 * 0.33 * sr))
        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))
        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)
        const damp = 1 / this.focus
        const rise = 0.002 * sr
        const push = 1 + 4 * this.drive
        const f = this.f, hp = this.hp
        for (let s = block.s0; s < block.s1; s++) {
            if (this.env < 0.0003) {this.env = 0; continue}
            this.env *= kDec
            this.fcNow += (this.fcTo - this.fcNow) * kGlide
            // La lame : une dent de scie, plus ou moins mordante
            const dt = this.freq / sr
            let p = this.ph + dt
            if (p >= 1) {p -= 1}
            this.ph = p
            let x = 2 * p - 1 - this.blep(p, dt)
            if (this.edge > 0) {
                let q = p + 0.12
                if (q >= 1) {q -= 1}
                x = x * (1 - this.edge) + (x - (2 * q - 1 - this.blep(q, dt))) * this.edge
            }
            // La bouche : deux filtres etroits a la suite, au meme endroit
            const g = 2 * Math.sin(Math.PI * Math.min(this.fcNow, sr * 0.12) / sr)
            f[0] += g * f[1]
            f[1] += g * (x - f[0] - damp * f[1])
            const m1 = f[1] * damp
            f[2] += g * f[3]
            f[3] += g * (m1 - f[2] - damp * f[3])
            const m2 = f[3] * damp
            let y = (m2 * 3 * this.comp + x * 0.3 * this.drone) * this.env * Math.min(1, this.att / rise)
            this.att++
            y = Math.tanh(y * push) / push
            hp[0] += (y - hp[0]) * kHp
            y -= hp[0]
            hp[1] += (y - hp[1]) * kHp
            y -= hp[1]
            y *= this.volume * 2
            outL[s] += y
            outR[s] += y
        }
    }
}
