// @label Revers
// @param tune    0     -100  100   linear  ct
// @param pas     118   60    300   exp     ms
// @param long    3     0.5   8     linear
// @param curve   0.35  0.1   1     linear
// @param metal   0.6   0     1     linear
// @param bright  0.5   0     1     linear
// @param bend    3     0     12    linear  st
// @param tail    6     1     80    exp     ms
// @param drive   0.2   0     1     linear
// @param lowcut  120   40    400   exp     Hz
// @param volume  0.5   0     1     linear

// Du metal joue a l'envers. Une note ne part pas d'un coup pour s'eteindre :
// elle sort du silence, enfle, s'eclaircit, et s'arrete net. Ce qui serait la
// fin d'un coup de metal en devient le debut ; le coup lui-meme arrive en
// dernier. La note aspire vers l'instant ou elle s'arrete.
// - On ecrit la note AVANT l'instant vise : elle s'arrete "long" pas apres son
//   debut ("pas" = la duree d'une double-croche, en ms). Pour qu'elle finisse
//   sur un temps, on la pose "long" pas avant ce temps. La fin de la note
//   ecrite est ignoree.
// - "curve" : la forme de la montee. Petit, elle reste longtemps presque
//   muette puis surgit ; grand, elle monte tout du long ;
// - "metal" : a 0 les partiels sont justes ; a 1 ce sont ceux d'une barre de
//   metal, faux entre eux ;
// - "bright" : la force des partiels du haut. Ils arrivent les derniers : le
//   son s'eclaircit en approchant de la fin ;
// - "bend" : la hauteur monte juste avant l'arret, en demi-tons ;
// - "tail" : le temps de l'arret (quelques millisecondes : net) ;
// - la velocite regle la force et la clarte.
// Trois voix, en mono.
class Processor {
    tune = 0
    pasMs = 118
    long = 3
    curve = 0.35
    metal = 0.6
    bright = 0.5
    bend = 3
    tailMs = 6
    drive = 0.2
    lowcut = 120
    volume = 0.5
    voices = [0, 1, 2].map(() => ({on: false, f: 220, t: 0, total: 1, vel: 0, cut: 1, order: 0, p: [0, 0, 0, 0], r: [1, 2, 3, 4], a: [1, 0, 0, 0]}))
    count = 0
    hp = [0, 0]
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "pas": this.pasMs = value; break
            case "long": this.long = value; break
            case "curve": this.curve = value; break
            case "metal": this.metal = value; break
            case "bright": this.bright = value; break
            case "bend": this.bend = value; break
            case "tail": this.tailMs = value; break
            case "drive": this.drive = value; break
            case "lowcut": this.lowcut = value; break
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
        const m = this.metal
        v.on = true
        v.f = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)
        v.t = 0
        v.total = Math.max(64, Math.round(this.long * this.pasMs * 0.001 * sampleRate))
        v.vel = velocity
        v.cut = 1
        v.order = ++this.count
        v.r[0] = 1
        v.r[1] = 2 + 0.756 * m
        v.r[2] = 3 + 2.404 * m
        v.r[3] = 4 + 4.933 * m
        const clair = this.bright * (0.4 + 0.8 * velocity)
        v.a[0] = 1
        v.a[1] = 0.6 * clair
        v.a[2] = 0.4 * clair
        v.a[3] = 0.25 * clair
        for (let i = 0; i < 4; i++) {
            v.p[i] = 0
            // Rien au-dessus de 5 kHz
            if (v.f * v.r[i] > 5000) {v.a[i] = 0}
        }
    }
    noteOff(id) {}
    reset() {
        for (const v of this.voices) {v.on = false}
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kTail = Math.exp(-1 / (this.tailMs * 0.001 * 0.3 * sr))
        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)
        const push = 1 + 4 * this.drive
        const bendTau = 0.03 * sr
        const hp = this.hp
        for (let s = block.s0; s < block.s1; s++) {
            let x = 0
            let any = false
            for (const v of this.voices) {
                if (!v.on) {continue}
                any = true
                // Ce qui reste avant l'arret : tout en depend
                const left = v.total - v.t
                if (left <= 0) {
                    v.cut *= kTail
                    if (v.cut < 0.0003) {v.on = false; continue}
                }
                const rest = Math.max(0, left)
                const base = v.f * Math.pow(2, this.bend / 12 * Math.exp(-rest / bendTau)) / sr
                let y = 0
                for (let i = 0; i < 4; i++) {
                    if (v.a[i] === 0) {continue}
                    v.p[i] += base * v.r[i]
                    if (v.p[i] >= 1) {v.p[i] -= 1}
                    // Un partiel haut arrive plus tard qu'un partiel bas
                    const tau = v.total * this.curve / (1 + 0.9 * i)
                    y += Math.sin(twoPi * v.p[i]) * v.a[i] * Math.exp(-rest / tau)
                }
                x += y * v.cut * (0.3 + 0.7 * v.vel) * 0.4
                v.t++
            }
            if (!any && Math.abs(hp[0]) < 0.00001) {continue}
            let o = Math.tanh(x * push) / push
            hp[0] += (o - hp[0]) * kHp
            o -= hp[0]
            hp[1] += (o - hp[1]) * kHp
            o -= hp[1]
            o *= this.volume * 2
            outL[s] += o
            outR[s] += o
        }
    }
}
