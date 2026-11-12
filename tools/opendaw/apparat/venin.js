// @label Venin
// @param cutoff  300   60    4000  exp     Hz
// @param reso    0.75  0     1     linear
// @param envmod  2.5   0     5     linear
// @param decay   340   60    2000  exp     ms
// @param accent  0.7   0     1     linear
// @param tint    1.2   0     3     linear
// @param glide   90    5     400   exp     ms
// @param shape   0     0     1     linear
// @param drive   0.4   0     1     linear
// @param lowcut  180   40    600   exp     Hz
// @param tonic   43    24    72    linear
// @param just    1     0     1     linear
// @param duck    0.3   0     1     linear
// @param volume  0.6   0     1     linear

// La voix acid. Une seule voix, une dent de scie ("shape" a 0) ou un carre
// (a 1) dans un filtre passe-bas a quatre poles tres resonant, puis une
// saturation, puis un coupe-bas ("lowcut") : le grave reste au pied et a la
// basse. Ce qui fait l'acid, c'est l'articulation, ecrite dans les notes :
// - deux notes qui se chevauchent sont liees : la hauteur glisse ("glide")
//   et les enveloppes ne repartent pas ;
// - une note de velocite 0,9 ou plus est accentuee : une enveloppe breve
//   frappe ensemble le filtre, la resonance, la saturation et le volume
//   ("accent" = sa force). Des accents qui se suivent s'additionnent ;
// - la velocite porte aussi la couleur de la note : de 0,5 a 0,85 (ou de 0,9
//   a 1 pour une note accentuee), elle ouvre ou ferme le filtre de "tint"
//   octaves autour de "cutoff". Le timbre change a chaque pas sans qu'aucun
//   bouton ne bouge ; le volume, lui, ne depend pas de la velocite.
// L'enveloppe du filtre ("envmod" octaves, "decay" ms) est deux fois plus
// courte sur une note accentuee.
// "tonic" et "just" : accord sur les harmoniques naturels de la tonique.
// "duck" : toute note plus grave que 24 ne sonne pas, elle fait plonger le son.
class Processor {
    cutoff = 300
    reso = 0.75
    envmod = 2.5
    decayMs = 340
    accent = 0.7
    tint = 1.2
    glideMs = 90
    shape = 0
    drive = 0.4
    lowcut = 180
    tonic = 43
    just = 1
    duck = 0.3
    volume = 0.6
    held = []
    freq = 110
    target = 110
    phase = 0
    gate = false
    amp = 0
    envFilter = 0
    kFilter = 0.999
    envAccent = 0
    color = 0
    colorSmooth = 0
    y1 = 0
    y2 = 0
    y3 = 0
    y4 = 0
    last = 0
    hp1 = 0
    hp2 = 0
    g = 0.05
    k = 2
    push = 1
    tick = 0
    dip = 0
    dipSmooth = 0
    paramChanged(name, value) {
        switch (name) {
            case "cutoff": this.cutoff = value; break
            case "reso": this.reso = value; break
            case "envmod": this.envmod = value; break
            case "decay": this.decayMs = value; break
            case "accent": this.accent = value; break
            case "tint": this.tint = value; break
            case "glide": this.glideMs = value; break
            case "shape": this.shape = value; break
            case "drive": this.drive = value; break
            case "lowcut": this.lowcut = value; break
            case "tonic": this.tonic = value; break
            case "just": this.just = value; break
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
        const JUST = [0, 0, 3.91, 0, -13.69, 0, -48.68, 1.96, 0, -59.47, -31.17, 0]
        const degree = (((Math.round(pitch) - Math.round(this.tonic)) % 12) + 12) % 12
        const freq = 440 * Math.pow(2, (pitch - 69 + (cent + JUST[degree] * this.just) / 100) / 12)
        const accented = velocity >= 0.9
        const c = accented ? (velocity - 0.9) / 0.1 : (velocity - 0.5) / 0.35
        this.color = Math.max(0, Math.min(1, c)) - 0.5
        const legato = this.held.length > 0
        this.held.push({id, freq})
        this.target = freq
        if (!legato) {
            // Une note detachee repart d'un etat connu : meme phase, memes enveloppes
            this.freq = freq
            this.phase = 0
            this.envFilter = 1
            this.kFilter = Math.exp(-1 / (this.decayMs * 0.001 * (accented ? 0.5 : 1) * sr))
            this.colorSmooth = this.color
        }
        if (accented) {this.envAccent += (1 - this.envAccent) * 0.75}
        this.gate = true
    }
    noteOff(id) {
        this.held = this.held.filter(n => n.id !== id)
        if (this.held.length === 0) {
            this.gate = false
        } else {
            this.target = this.held[this.held.length - 1].freq
        }
    }
    reset() {
        this.held = []
        this.gate = false
        this.amp = 0
        this.envFilter = 0
        this.envAccent = 0
        this.y1 = 0
        this.y2 = 0
        this.y3 = 0
        this.y4 = 0
        this.dip = 0
        this.dipSmooth = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))
        const kAccent = Math.exp(-1 / (0.090 * sr))
        const kUp = 1 - Math.exp(-1 / (0.002 * sr))
        const kDown = 1 - Math.exp(-1 / (0.008 * sr))
        const kColor = 1 - Math.exp(-1 / (0.004 * sr))
        const kDip = Math.exp(-1 / (0.110 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))
        const kHp = 1 - Math.exp(-2 * Math.PI * this.lowcut / sr)
        const shape = this.shape
        for (let s = block.s0; s < block.s1; s++) {
            this.dip *= kDip
            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth
            this.amp += ((this.gate ? 1 : 0) - this.amp) * (this.gate ? kUp : kDown)
            if (this.amp < 0.0002 && !this.gate) {
                this.envAccent *= kAccent
                continue
            }
            this.freq += (this.target - this.freq) * kGlide
            const dt = this.freq / sr
            let p = this.phase + dt
            if (p >= 1) {p -= 1}
            this.phase = p
            // Dent de scie et carre, la marche arrondie (pas de repliement)
            let saw = 2 * p - 1
            if (p < dt) {const t = p / dt; saw -= t + t - t * t - 1}
            else if (p > 1 - dt) {const t = (p - 1) / dt; saw -= t * t + t + t + 1}
            let x = saw
            if (shape > 0) {
                let q = p + 0.5
                if (q >= 1) {q -= 1}
                let saw2 = 2 * q - 1
                if (q < dt) {const t = q / dt; saw2 -= t + t - t * t - 1}
                else if (q > 1 - dt) {const t = (q - 1) / dt; saw2 -= t * t + t + t + 1}
                x = saw * (1 - shape) + (saw - saw2) * shape
            }
            // Les reglages du filtre, recalcules toutes les 8 notes d'horloge
            this.colorSmooth += (this.color - this.colorSmooth) * kColor
            if ((this.tick++ & 7) === 0) {
                const acc = this.accent * this.envAccent
                const octaves = this.colorSmooth * this.tint + this.envmod * this.envFilter + 2 * acc
                const fc = Math.min(this.cutoff * Math.pow(2, octaves), sr * 0.3)
                this.g = 1 - Math.exp(-Math.PI * fc / sr)
                this.k = 3.9 * Math.min(1, this.reso + 0.15 * acc)
                this.push = 1 + 5 * Math.min(1, this.drive + 0.5 * acc)
            }
            // Echelle a quatre poles, calculee deux fois par echantillon
            const g = this.g
            const k = this.k
            const mid = (x + this.last) * 0.5
            this.last = x
            let u = Math.tanh(mid * 0.7 - k * this.y4)
            this.y1 += g * (u - this.y1)
            this.y2 += g * (this.y1 - this.y2)
            this.y3 += g * (this.y2 - this.y3)
            this.y4 += g * (this.y3 - this.y4)
            u = Math.tanh(x * 0.7 - k * this.y4)
            this.y1 += g * (u - this.y1)
            this.y2 += g * (this.y1 - this.y2)
            this.y3 += g * (this.y2 - this.y3)
            this.y4 += g * (this.y3 - this.y4)
            // La resonance mange le grave : on le rend, puis on sature
            let y = this.y4 * (1 + 0.6 * k)
            y = Math.tanh(y * this.push) / Math.sqrt(this.push)
            // Coupe-bas a deux etages
            this.hp1 += (y - this.hp1) * kHp
            const h1 = y - this.hp1
            this.hp2 += (h1 - this.hp2) * kHp
            const h2 = h1 - this.hp2
            const a = this.amp * this.volume * (1 + 0.5 * this.accent * this.envAccent) * (1 - this.duck * this.dipSmooth)
            const out = h2 * a
            outL[s] += out
            outR[s] += out
            this.envFilter *= this.kFilter
            this.envAccent *= kAccent
        }
    }
}
