// @label Accord
// @param decay   180   40    1500  exp     ms
// @param cutoff  500   100   6000  exp     Hz
// @param envmod  2.5   0     5     linear
// @param fdecay  90    20    800   exp     ms
// @param reso    0.35  0     0.95  linear
// @param detune  12    0     40    linear  ct
// @param width   0.7   0     1     linear
// @param duck    0.5   0     1     linear
// @param volume  0.6   0     1     linear

// L'accord dub : un coup sec que l'echo prolonge. Chaque note de l'accord est
// faite de trois dents de scie a peine desaccordees ("detune", en cents),
// une a gauche, une au centre, une a droite ("width") : leur battement donne
// un son large et vivant sans rien automatiser. Tout l'accord passe dans un
// meme filtre passe-bas qui part ouvert et se referme ("cutoff" = ou il
// retombe, "envmod" = de combien d'octaves il part au-dessus, "fdecay" = en
// combien de temps) : brillant a l'attaque, sombre ensuite.
// Le son s'eteint tout seul en "decay" ms, quelle que soit la duree ecrite.
// Une note plus forte ouvre davantage le filtre.
// "duck" : toute note plus grave que 24 ne sonne pas, elle fait plonger le
// son (le morceau en envoie une a chaque coup de pied).
class Processor {
    decayMs = 180
    cutoff = 500
    envmod = 2.5
    fdecayMs = 90
    reso = 0.35
    detune = 12
    width = 0.7
    duck = 0.5
    volume = 0.6
    voices = []
    amp = 0
    attack = 0
    envFilter = 0
    level = 1
    since = 100000
    lowL = 0
    bandL = 0
    lowR = 0
    bandR = 0
    dip = 0
    dipSmooth = 0
    paramChanged(name, value) {
        switch (name) {
            case "decay": this.decayMs = value; break
            case "cutoff": this.cutoff = value; break
            case "envmod": this.envmod = value; break
            case "fdecay": this.fdecayMs = value; break
            case "reso": this.reso = value; break
            case "detune": this.detune = value; break
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
        // Des notes qui arrivent ensemble forment un accord ; sinon c'est un nouveau coup
        if (this.since > 0.02 * sampleRate) {this.voices = []}
        this.since = 0
        const f0 = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        const d = Math.pow(2, this.detune / 1200)
        if (this.voices.length >= 6) {this.voices.shift()}
        this.voices.push({freqs: [f0 / d, f0, f0 * d], phases: [0.13, 0.5, 0.81]})
        this.amp = 1
        this.attack = 0
        this.envFilter = 1
        this.level = velocity
    }
    noteOff(id) {
    }
    reset() {
        this.voices = []
        this.amp = 0
        this.dip = 0
        this.dipSmooth = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        this.since += block.s1 - block.s0
        if (this.voices.length === 0) {return}
        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))
        const kFilter = Math.exp(-1 / (this.fdecayMs * 0.001 * sr))
        const kDip = Math.exp(-1 / (0.110 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))
        const attackStep = 1 / (0.002 * sr)
        const damp = 1.6 - 1.5 * this.reso
        const open = this.envmod * (0.6 + 0.4 * this.level)
        const side = 0.5 + 0.5 * this.width
        const norm = 0.5 * this.volume / Math.sqrt(this.voices.length)
        for (let s = block.s0; s < block.s1; s++) {
            let left = 0, mid = 0, right = 0
            for (const v of this.voices) {
                for (let k = 0; k < 3; k++) {
                    const dt = v.freqs[k] / sr
                    let p = v.phases[k] + dt
                    if (p >= 1) {p -= 1}
                    v.phases[k] = p
                    // Dent de scie dont on arrondit la marche (pas de repliement dans l'aigu)
                    let y = 2 * p - 1
                    if (p < dt) {const t = p / dt; y -= t + t - t * t - 1}
                    else if (p > 1 - dt) {const t = (p - 1) / dt; y -= t * t + t + t + 1}
                    if (k === 0) {left += y} else if (k === 1) {mid += y} else {right += y}
                }
            }
            const inL = mid * 0.7 + left * side + right * (1 - side)
            const inR = mid * 0.7 + right * side + left * (1 - side)
            const fc = Math.min(this.cutoff * Math.pow(2, open * this.envFilter), sr / 6.5)
            const g = 2 * Math.sin(Math.PI * fc / sr)
            this.lowL += g * this.bandL
            this.bandL += g * (inL - this.lowL - damp * this.bandL)
            this.lowR += g * this.bandR
            this.bandR += g * (inR - this.lowR - damp * this.bandR)
            if (this.attack < 1) {this.attack = Math.min(1, this.attack + attackStep)}
            this.dip *= kDip
            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth
            const a = this.amp * this.attack * this.level * norm * (1 - this.duck * this.dipSmooth)
            outL[s] += Math.tanh(this.lowL * 0.8) * a
            outR[s] += Math.tanh(this.lowR * 0.8) * a
            this.amp *= kAmp
            this.envFilter *= kFilter
        }
        if (this.amp < 0.0003) {this.voices = []}
    }
}
