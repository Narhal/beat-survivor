// @label Coup
// @param tune    48    35    80    exp     Hz
// @param sweep   0.6   0     1     linear
// @param decay   280   80    700   exp     ms
// @param click   0.5   0     1     linear
// @param drive   0.5   0     1     linear
// @param volume  0.8   0     1     linear

// Grosse caisse de synthese : une sinusoide qui tombe de tres haut en quelques
// millisecondes (le claquement), puis qui tient sa note grave (le corps).
// La saturation ecrase le debut et rallonge le corps.
class Processor {
    tune = 48
    sweep = 0.6
    decayMs = 280
    click = 0.5
    drive = 0.5
    volume = 0.8
    phase = 0
    envAmp = 0
    envFast = 0
    envSlow = 0
    envClick = 0
    level = 0
    seed = 12345
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "sweep": this.sweep = value; break
            case "decay": this.decayMs = value; break
            case "click": this.click = value; break
            case "drive": this.drive = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        this.phase = 0
        this.envAmp = 1
        this.envFast = 1
        this.envSlow = 1
        this.envClick = 1
        this.level = velocity
    }
    noteOff(id) {
    }
    reset() {
        this.envAmp = 0
        this.envClick = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))
        const kFast = Math.exp(-1 / (0.010 * sr))
        const kSlow = Math.exp(-1 / (0.055 * sr))
        const kClick = Math.exp(-1 / (0.0015 * sr))
        const gain = 1 + this.drive * 5
        const norm = 1 / Math.tanh(gain)
        const out = this.level * this.volume
        for (let s = block.s0; s < block.s1; s++) {
            if (this.envAmp < 0.0002) {continue}
            const f = this.tune * (1 + this.sweep * (7 * this.envFast + 1.5 * this.envSlow))
            this.phase += f / sr
            if (this.phase >= 1) {this.phase -= 1}
            const body = Math.sin(twoPi * this.phase) * this.envAmp
            this.seed = (this.seed * 1664525 + 1013904223) >>> 0
            const tick = (this.seed / 2147483648 - 1) * this.envClick * this.click * 0.6
            const y = Math.tanh((body + tick) * gain) * norm * out
            outL[s] += y
            outR[s] += y
            this.envAmp *= kAmp
            this.envFast *= kFast
            this.envSlow *= kSlow
            this.envClick *= kClick
        }
    }
}
