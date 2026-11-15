// @label Gouffre
// @param attack   12    2     120   exp     ms
// @param release  60    10    600   exp     ms
// @param glide    50    1     600   exp     ms
// @param harm     0.25  0     1     linear
// @param depth    0.9   0     1     linear
// @param dipms    140   40    500   exp     ms
// @param volume   0.8   0     1     linear

// Le sub de la dubstep : une sinusoide longue, tout en bas, qui porte le poids
// du morceau. Une seule voix.
// - Une note detachee repart toujours de la phase zero : chaque attaque est
//   la meme, et la somme avec le pied ne change pas d'un coup a l'autre.
// - Deux notes qui se chevauchent sont liees : la hauteur glisse ("glide")
//   sans rupture, la phase continue.
// - "harm" ajoute un peu de deuxieme et de troisieme harmonique par une
//   saturation douce : de quoi entendre la note sur de petites enceintes,
//   sans salir le grave.
// - Toute note plus grave que 24 ne sonne pas : elle creuse le sub ("depth" =
//   la profondeur du creux, "dipms" = le temps qu'il met a revenir). Le
//   morceau en envoie une a chaque coup de pied.
class Processor {
    attackMs = 12
    releaseMs = 60
    glideMs = 50
    harm = 0.25
    depth = 0.9
    dipMs = 140
    volume = 0.8
    held = []
    phase = 0
    freq = 49
    target = 49
    gate = false
    env = 0
    dip = 0
    dipSmooth = 0
    paramChanged(name, value) {
        switch (name) {
            case "attack": this.attackMs = value; break
            case "release": this.releaseMs = value; break
            case "glide": this.glideMs = value; break
            case "harm": this.harm = value; break
            case "depth": this.depth = value; break
            case "dipms": this.dipMs = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {
            this.dip = 1
            return
        }
        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        if (this.held.length === 0) {
            this.freq = freq
            // Si la note precedente sonne encore, on ne casse pas l'onde ; sinon elle repart de zero
            if (this.env < 0.02) {this.phase = 0}
        }
        this.held.push({id, freq})
        this.target = freq
        this.gate = true
    }
    noteOff(id) {
        this.held = this.held.filter(note => note.id !== id)
        if (this.held.length === 0) {
            this.gate = false
        } else {
            this.target = this.held[this.held.length - 1].freq
        }
    }
    reset() {
        this.held = []
        this.gate = false
        this.env = 0
        this.dip = 0
        this.dipSmooth = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))
        const kAttack = 1 - Math.exp(-1 / (this.attackMs * 0.001 * 0.35 * sr))
        const kRelease = Math.exp(-1 / (this.releaseMs * 0.001 * 0.35 * sr))
        const kDip = Math.exp(-1 / (this.dipMs * 0.001 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))
        const push = 1 + this.harm * 3
        // Un decalage avant la saturation fait naitre l'harmonique pair
        const bias = 0.25 * this.harm
        const norm = this.volume / Math.tanh(push)
        for (let s = block.s0; s < block.s1; s++) {
            if (this.gate) {
                this.env += (1 - this.env) * kAttack
            } else {
                this.env *= kRelease
                if (this.env < 0.0002) {
                    this.dip *= kDip
                    continue
                }
            }
            this.freq += (this.target - this.freq) * kGlide
            this.phase += this.freq / sr
            if (this.phase >= 1) {this.phase -= 1}
            this.dip *= kDip
            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth
            const a = this.env * (1 - this.depth * this.dipSmooth)
            const y = (Math.tanh((Math.sin(twoPi * this.phase) + bias) * a * push) - Math.tanh(bias * a * push)) * norm
            outL[s] += y
            outR[s] += y
        }
    }
}
