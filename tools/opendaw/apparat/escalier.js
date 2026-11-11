// @label Escalier
// @param decay   260   40    2000  exp     ms
// @param center  500   120   3000  exp     Hz
// @param width   1.2   0.5   2.5   linear
// @param sweep   1.5   0     4     linear
// @param fdecay  90    15    900   exp     ms
// @param grain   0.4   0     1.2   linear
// @param drive   0.3   0     1     linear
// @param spread  0.6   0     1     linear
// @param volume  0.7   0     1     linear

// L'escalier de Penrose. Chaque note est un son de Shepard : la meme note
// jouee a toutes les octaves a la fois, sous une cloche fixe ("center" = son
// milieu, "width" = sa largeur en octaves). L'oreille entend le nom de la
// note, pas son octave : une suite de notes qui monte peut donc monter sans
// fin, elle repasse par les memes sons sans jamais redescendre.
// Seule la classe de hauteur de la note compte (Do, Do diese...), pas l'octave.
// "sweep" : au debut de chaque note la cloche part plus haut (en octaves) et
// retombe en "fdecay" ms, comme un filtre qui se referme.
// "grain" : chaque partiel se module lui-meme, ca donne du mordant.
class Processor {
    decayMs = 260
    center = 500
    width = 1.2
    sweep = 1.5
    fdecayMs = 90
    grain = 0.4
    drive = 0.3
    spread = 0.6
    volume = 0.7
    voices = []
    count = 0
    paramChanged(name, value) {
        switch (name) {
            case "decay": this.decayMs = value; break
            case "center": this.center = value; break
            case "width": this.width = value; break
            case "sweep": this.sweep = value; break
            case "fdecay": this.fdecayMs = value; break
            case "grain": this.grain = value; break
            case "drive": this.drive = value; break
            case "spread": this.spread = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        const pc = ((pitch % 12) + 12) % 12
        const base = 32.7032 * Math.pow(2, (pc + cent / 100) / 12)
        if (this.voices.length >= 5) {this.voices.shift()}
        this.count++
        // Une note a gauche, la suivante a droite
        const side = this.count % 2 === 0 ? 1 : -1
        const angle = (1 + side * 0.7 * this.spread) * Math.PI / 4
        this.voices.push({
            base, lb: Math.log2(base),
            phases: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            last: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            weights: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            amp: 1, fenv: 1, attack: 0, level: velocity, tick: 0,
            left: Math.cos(angle), right: Math.sin(angle)
        })
    }
    noteOff(id) {
    }
    reset() {
        this.voices = []
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))
        const kFilter = Math.exp(-1 / (this.fdecayMs * 0.001 * sr))
        const kAttack = 1 - Math.exp(-1 / (0.001 * sr))
        const logCenter = Math.log2(this.center)
        const gain = 1 + this.drive * 4
        const norm = 0.8 * this.volume / Math.tanh(gain)
        for (const v of this.voices) {
            const step = v.base / sr
            for (let s = block.s0; s < block.s1; s++) {
                if (v.tick === 0) {
                    // La cloche : recalculee toutes les 32 samples, elle bouge lentement
                    const lc = logCenter + this.sweep * v.fenv
                    let sum = 0
                    for (let k = 0; k < 9; k++) {
                        const d = (v.lb + k - lc) / this.width
                        const w = Math.exp(-0.5 * d * d)
                        v.weights[k] = w
                        sum += w
                    }
                    const inv = 1 / Math.max(sum, 0.5)
                    for (let k = 0; k < 9; k++) {v.weights[k] *= inv}
                }
                v.tick = (v.tick + 1) & 31
                const fb = this.grain * (0.3 + 0.7 * v.fenv)
                let x = 0
                let inc = step
                for (let k = 0; k < 9; k++) {
                    let p = v.phases[k] + inc
                    if (p >= 1) {p -= 1}
                    v.phases[k] = p
                    const w = v.weights[k]
                    if (w > 0.002) {
                        const y = Math.sin(twoPi * p + fb * v.last[k])
                        v.last[k] = (y + v.last[k]) * 0.5
                        x += y * w
                    }
                    inc *= 2
                }
                v.attack += (1 - v.attack) * kAttack
                const y = Math.tanh(x * v.amp * v.attack * v.level * gain) * norm
                outL[s] += y * v.left
                outR[s] += y * v.right
                v.amp *= kAmp
                v.fenv *= kFilter
            }
        }
        this.voices = this.voices.filter(v => v.amp > 0.0003)
    }
}
