// @label Souffle
// @param freq    600   80    8000  exp     Hz
// @param reso    0.6   0     1     linear
// @param drift   0.5   0     1     linear
// @param volume  0.5   0     1     linear

// Le souffle : du bruit dans un filtre passe-bande, un par oreille. "freq" est
// la hauteur du souffle, "reso" son etroitesse (0 = vent large, 1 = sifflement).
// "drift" le fait vivre : la hauteur ondule lentement et le son passe d'une
// oreille a l'autre, sur trois horloges qui ne se rejoignent jamais.
// Faire monter "freq" et "volume" ensemble, c'est une montee.
// Sonne tant qu'une note est tenue (la hauteur de la note est ignoree).
class Processor {
    freq = 600
    reso = 0.6
    drift = 0.5
    volume = 0.5
    held = 0
    env = 0
    smooth = 600
    seedL = 22222
    seedR = 77777
    lowL = 0
    bandL = 0
    lowR = 0
    bandR = 0
    lfoA = 0
    lfoB = 0.3
    lfoC = 0.6
    paramChanged(name, value) {
        switch (name) {
            case "freq": this.freq = value; break
            case "reso": this.reso = value; break
            case "drift": this.drift = value; break
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
        this.lowL = 0
        this.bandL = 0
        this.lowR = 0
        this.bandR = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const target = this.held > 0 ? 1 : 0
        if (target === 0 && this.env < 0.0002) {
            this.env = 0
            return
        }
        const kEnv = 1 - Math.exp(-1 / (0.6 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.05 * sr))
        const n = block.s1 - block.s0
        // Les trois horloges lentes : une fois par bloc suffit
        this.lfoA += 0.07 * n / sr
        if (this.lfoA >= 1) {this.lfoA -= 1}
        this.lfoB += 0.11 * n / sr
        if (this.lfoB >= 1) {this.lfoB -= 1}
        this.lfoC += 0.045 * n / sr
        if (this.lfoC >= 1) {this.lfoC -= 1}
        const wander = Math.pow(2, 0.35 * this.drift * Math.sin(twoPi * this.lfoC))
        const ampL = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoA))
        const ampR = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoB))
        const damp = 1.2 - 1.1 * this.reso
        for (let s = block.s0; s < block.s1; s++) {
            this.smooth += (this.freq - this.smooth) * kSmooth
            const fc = Math.min(this.smooth * wander, sr / 7)
            const f = 2 * Math.sin(Math.PI * fc / sr)
            // Le bruit filtre sort d'autant plus faible que le filtre est grave
            // et large : on compense pour que le niveau reste le meme
            const comp = Math.sqrt(6 * damp / f) * 0.22
            this.env += (target - this.env) * kEnv
            this.seedL = (this.seedL * 1664525 + 1013904223) >>> 0
            this.seedR = (this.seedR * 1664525 + 1013904223) >>> 0
            const xL = this.seedL / 2147483648 - 1
            const xR = this.seedR / 2147483648 - 1
            this.lowL += f * this.bandL
            this.bandL += f * (xL - this.lowL - damp * this.bandL)
            this.lowR += f * this.bandR
            this.bandR += f * (xR - this.lowR - damp * this.bandR)
            const a = comp * this.env * this.volume
            outL[s] += Math.tanh(this.bandL * a * ampL)
            outR[s] += Math.tanh(this.bandR * a * ampR)
        }
    }
}
