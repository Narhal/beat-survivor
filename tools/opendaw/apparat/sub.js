// @label Sub
// @param depth    0.9   0     1     linear
// @param release  160   40    500   exp     ms
// @param glide    30    1     300   exp     ms
// @param drive    0.4   0     1     linear
// @param volume   0.8   0     1     linear

// Basse : une sinusoide tenue, que la grosse caisse creuse. Le creusement est
// dans l'instrument lui-meme : toute note plus grave que 24 ne sonne pas,
// elle declenche le creux ("depth" = sa profondeur, "release" = le temps que
// la basse met a revenir). Le morceau lui envoie une de ces notes fantomes a
// chaque coup de pied : pas de compresseur, pas de branchement a rater.
class Processor {
    depth = 0.9
    releaseMs = 160
    glideMs = 30
    drive = 0.4
    volume = 0.8
    held = []
    phase = 0
    freq = 55
    target = 55
    gate = false
    level = 0
    env = 0
    duck = 0
    duckSmooth = 0
    paramChanged(name, value) {
        switch (name) {
            case "depth": this.depth = value; break
            case "release": this.releaseMs = value; break
            case "glide": this.glideMs = value; break
            case "drive": this.drive = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {
            this.duck = 1
            return
        }
        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        if (this.held.length === 0) {this.freq = freq}
        this.held.push({id, freq})
        this.target = freq
        this.gate = true
        this.level = velocity
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
        this.duck = 0
        this.duckSmooth = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * sr))
        const kAttack = 1 - Math.exp(-1 / (0.004 * sr))
        const kRelease = Math.exp(-1 / (0.040 * sr))
        const kDuck = Math.exp(-1 / (this.releaseMs * 0.001 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.002 * sr))
        const gain = 1 + this.drive * 3
        const norm = this.volume / Math.tanh(gain)
        for (let s = block.s0; s < block.s1; s++) {
            this.freq += (this.target - this.freq) * kGlide
            this.phase += this.freq / sr
            if (this.phase >= 1) {this.phase -= 1}
            if (this.gate) {
                this.env += (this.level - this.env) * kAttack
            } else {
                this.env *= kRelease
            }
            this.duck *= kDuck
            this.duckSmooth += (this.duck - this.duckSmooth) * kSmooth
            const a = this.env * (1 - this.depth * this.duckSmooth)
            const y = Math.tanh(Math.sin(twoPi * this.phase) * a * gain) * norm
            outL[s] += y
            outR[s] += y
        }
    }
}
