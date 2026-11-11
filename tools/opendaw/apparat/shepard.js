// @label Shepard
// @param rate    0.05  -0.5  0.5   linear
// @param low     40    20    200   exp     Hz
// @param span    7     3     9     linear
// @param tone    0.3   0     1     linear
// @param volume  0.5   0     1     linear

// La montee sans fin (gamme de Shepard-Risset). Des sinusoides a une octave
// d'ecart glissent ensemble vers l'aigu ; chacune entre en silence par le bas
// et s'eteint en haut, si bien que l'oreille entend monter toujours sans que
// rien n'arrive jamais nulle part. "rate" = octaves par seconde ; negatif,
// ca descend. Chaque voix traverse lentement la stereo en montant.
// Sonne tant qu'une note est tenue (la hauteur de la note est ignoree).
class Processor {
    rate = 0.05
    low = 40
    span = 7
    tone = 0.3
    volume = 0.5
    held = 0
    env = 0
    position = 0
    phases = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    weights = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    lefts = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    rights = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    paramChanged(name, value) {
        switch (name) {
            case "rate": this.rate = value; break
            case "low": this.low = value; break
            case "span": this.span = value; break
            case "tone": this.tone = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        this.held++
    }
    noteOff(id) {
        if (this.held > 0) {this.held--}
    }
    reset() {
        this.held = 0
        this.env = 0
    }
    place(count) {
        for (let k = 0; k < count; k++) {
            const p = k + this.position
            this.weights[k] = (0.5 - 0.5 * Math.cos(2 * Math.PI * p / count)) * 2 / count
            const angle = (0.6 * Math.sin(Math.PI * p) + 1) * Math.PI / 4
            this.lefts[k] = Math.cos(angle)
            this.rights[k] = Math.sin(angle)
        }
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const count = Math.max(3, Math.min(9, Math.round(this.span)))
        const kEnv = 1 - Math.exp(-1 / (0.4 * sr))
        const gain = 1 + this.tone * 3
        const norm = this.volume / Math.tanh(gain) * 0.9
        const target = this.held > 0 ? 1 : 0
        if (target === 0 && this.env < 0.0002) {
            this.env = 0
            return
        }
        // Poids et place stereo : recalcules une fois par bloc (ca bouge lentement)
        // et a chaque fois que les voix changent de rang
        this.place(count)
        for (let s = block.s0; s < block.s1; s++) {
            this.position += this.rate / sr
            if (this.position >= 1) {
                // Chaque voix prend la place de celle du dessous : on decale les phases
                this.position -= 1
                for (let k = count - 1; k > 0; k--) {this.phases[k] = this.phases[k - 1]}
                this.phases[0] = 0
                this.place(count)
            } else if (this.position < 0) {
                this.position += 1
                for (let k = 0; k < count - 1; k++) {this.phases[k] = this.phases[k + 1]}
                this.phases[count - 1] = 0
                this.place(count)
            }
            this.env += (target - this.env) * kEnv
            let f = this.low * Math.pow(2, this.position) / sr
            let left = 0
            let right = 0
            for (let k = 0; k < count; k++) {
                this.phases[k] += f
                if (this.phases[k] >= 1) {this.phases[k] -= 1}
                const x = Math.sin(twoPi * this.phases[k]) * this.weights[k]
                left += x * this.lefts[k]
                right += x * this.rights[k]
                f *= 2
            }
            outL[s] += Math.tanh(left * gain) * norm * this.env
            outR[s] += Math.tanh(right * gain) * norm * this.env
        }
    }
}
