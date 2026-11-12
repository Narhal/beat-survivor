// @label Gresil
// @param decay   30    5     600   exp     ms
// @param index   3     0     12    linear
// @param snap    3     0.5   60    exp     ms
// @param body    0.2   0     1     linear
// @param r2      2.41  0.5   9     linear
// @param r3      5.63  0.5   13    linear
// @param noise   0.3   0     1     linear
// @param chirp   0     0     36    linear  st
// @param lowcut  400   20    8000  exp     Hz
// @param drift   0.4   0     1     linear
// @param width   0.5   0     1     linear
// @param duck    0     0     1     linear
// @param volume  0.6   0     1     linear

// Des percussions seches, sans bruit blanc ni echantillon. Trois sinusoides
// en cascade : la troisieme module la phase de la deuxieme, qui module la
// phase de la premiere. A fort indice ("index"), la cascade donne un bruit ;
// l'indice retombe en "snap" ms et il ne reste qu'un son presque pur
// ("body" = ce qu'il garde de l'indice). Du bruit a la note en quelques
// millisecondes : un tic, un toc, une goutte, selon la hauteur jouee.
// - "r2" et "r3" : les rapports de frequence des deux modulateurs. Des
//   rapports a virgule donnent du metal ;
// - "noise" : la troisieme sinusoide se module elle-meme et devient un bruit ;
// - "chirp" : la note part plus haut et retombe en 10 ms ;
// - "lowcut" : coupe-bas, pour laisser le grave au pied et a la basse ;
// - "drift" : deux coups de suite ne sont jamais identiques (rapports et
//   longueur bougent un peu, de facon rejouable).
// Un coup plus fort est plus clair et plus long.
// "duck" : toute note plus grave que 24 ne sonne pas, elle fait plonger le son.
class Processor {
    decayMs = 30
    index = 3
    snapMs = 3
    body = 0.2
    r2 = 2.41
    r3 = 5.63
    noise = 0.3
    chirp = 0
    lowcut = 400
    drift = 0.4
    width = 0.5
    duck = 0
    volume = 0.6
    voices = []
    count = 0
    dip = 0
    dipSmooth = 0
    paramChanged(name, value) {
        switch (name) {
            case "decay": this.decayMs = value; break
            case "index": this.index = value; break
            case "snap": this.snapMs = value; break
            case "body": this.body = value; break
            case "r2": this.r2 = value; break
            case "r3": this.r3 = value; break
            case "noise": this.noise = value; break
            case "chirp": this.chirp = value; break
            case "lowcut": this.lowcut = value; break
            case "drift": this.drift = value; break
            case "width": this.width = value; break
            case "duck": this.duck = value; break
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
        // Un hasard rejouable : il ne depend que du rang du coup
        const hash = (k) => {
            let x = (this.count * 2654435761 + k * 40503) >>> 0
            x ^= x >>> 15
            x = Math.imul(x, 2246822519) >>> 0
            x ^= x >>> 13
            return (x >>> 0) / 4294967296 - 0.5
        }
        const d = this.drift
        const f = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        const ms = this.decayMs * (0.55 + 0.7 * velocity) * (1 + 0.3 * d * hash(1))
        if (this.voices.length >= 6) {this.voices.shift()}
        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width
        const angle = (1 + place * 0.6) * Math.PI / 4
        this.voices.push({
            // Pas de phase par demi-echantillon : le calcul se fait deux fois par echantillon
            d1: f / sr / 2, d2: f * this.r2 * (1 + 0.04 * d * hash(2)) / sr / 2, d3: f * this.r3 * (1 + 0.04 * d * hash(3)) / sr / 2,
            p1: 0, p2: 0, p3: 0, back: 0,
            amp: 1, kAmp: Math.exp(-1 / (ms * 0.001 * sr)), attack: 0,
            index: this.index * (0.5 + 0.7 * velocity), env: 1, kEnv: Math.exp(-1 / (this.snapMs * 0.001 * sr)),
            bend: Math.pow(2, this.chirp / 12) - 1, envBend: 1, kBend: Math.exp(-1 / (0.010 * sr)),
            level: 0.3 + 0.7 * velocity, h1: 0, h2: 0,
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
        const twoPi = 2 * Math.PI
        const kDip = Math.exp(-1 / (0.110 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))
        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)
        const attackStep = 1 / (0.0003 * sr)
        const fb = this.noise * 5
        const body = this.body
        for (let s = block.s0; s < block.s1; s++) {
            this.dip *= kDip
            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth
            let left = 0, right = 0
            for (const v of this.voices) {
                if (v.amp < 0.0003) {continue}
                const idx = v.index * (body + (1 - body) * v.env)
                const m = 1 + v.bend * v.envBend
                let y = 0
                for (let half = 0; half < 2; half++) {
                    v.p3 += v.d3 * m
                    if (v.p3 >= 1) {v.p3 -= 1}
                    const o3 = Math.sin(twoPi * v.p3 + fb * v.back)
                    v.back = 0.5 * (v.back + o3)
                    v.p2 += v.d2 * m
                    if (v.p2 >= 1) {v.p2 -= 1}
                    const o2 = Math.sin(twoPi * v.p2 + idx * o3)
                    v.p1 += v.d1 * m
                    if (v.p1 >= 1) {v.p1 -= 1}
                    y += Math.sin(twoPi * v.p1 + idx * o2)
                }
                y *= 0.5
                // Coupe-bas a deux etages
                v.h1 += (y - v.h1) * kHp
                const a = y - v.h1
                v.h2 += (a - v.h2) * kHp
                const b = a - v.h2
                if (v.attack < 1) {v.attack = Math.min(1, v.attack + attackStep)}
                const out = b * v.amp * v.attack * v.level
                left += out * v.left
                right += out * v.right
                v.amp *= v.kAmp
                v.env *= v.kEnv
                v.envBend *= v.kBend
            }
            const g = this.volume * 2.5 * (1 - this.duck * this.dipSmooth)
            outL[s] += left * g
            outR[s] += right * g
        }
        if (this.voices.length > 0 && this.voices[0].amp < 0.0003) {this.voices.shift()}
    }
}
