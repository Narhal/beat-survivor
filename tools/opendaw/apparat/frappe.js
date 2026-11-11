// @label Frappe
// @param tune    50    38    70    exp     Hz
// @param start   420   120   2000  exp     Hz
// @param sweep   55    15    160   exp     ms
// @param decay   180   60    600   exp     ms
// @param punch   0.5   0     1     linear
// @param click   0.5   0     1     linear
// @param drive   0.35  0     1     linear
// @param volume  0.8   0     1     linear

// La grosse caisse, en couches separees, chacune avec son role :
// - le corps : une sinusoide qui tombe de "start" a "tune" en "sweep" ms puis
//   tient sa note ("decay" = sa longueur). C'est le sub ;
// - le coup dans la poitrine ("punch") : une chute de hauteur tres rapide
//   (8 ms) ajoutee par-dessus, qui traverse les 100-200 Hz ;
// - le claquement ("click") : 3 ms de bruit filtre vers 2 a 5 kHz, une couche
//   a part, qui ne depend pas de la saturation ;
// - la saturation ("drive"), en parallele : le corps propre et sa copie
//   ecrasee sont additionnes, le grave reste net et les mediums gagnent de
//   quoi exister sur de petites enceintes.
// La sortie est ecretee en douceur : la pointe de l'attaque ne depasse pas
// le corps de plus de quelques dB, pour que le limiteur final n'ait presque
// rien a faire.
class Processor {
    tune = 50
    start = 420
    sweepMs = 55
    decayMs = 180
    punch = 0.5
    click = 0.5
    drive = 0.35
    volume = 0.8
    phase = 0
    amp = 0
    envSweep = 0
    envPunch = 0
    envClick = 0
    level = 0
    seed = 24680
    bandLow = 0
    bandBand = 0
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "start": this.start = value; break
            case "sweep": this.sweepMs = value; break
            case "decay": this.decayMs = value; break
            case "punch": this.punch = value; break
            case "click": this.click = value; break
            case "drive": this.drive = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        // La phase repart toujours du meme point : chaque coup est identique
        this.phase = 0
        this.amp = 1
        this.envSweep = 1
        this.envPunch = 1
        this.envClick = 1
        this.level = velocity
    }
    noteOff(id) {
    }
    reset() {
        this.amp = 0
        this.envClick = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))
        const kSweep = Math.exp(-1 / (this.sweepMs * 0.001 * 0.35 * sr))
        const kPunch = Math.exp(-1 / (0.008 * sr))
        const kClick = Math.exp(-1 / (0.003 * sr))
        const gain = 1 + this.drive * 7
        const wet = this.drive
        const fClick = 2 * Math.sin(Math.PI * 3200 / sr)
        const out = this.level * this.volume
        const ratio = this.start / this.tune - 1
        for (let s = block.s0; s < block.s1; s++) {
            if (this.amp < 0.0002 && this.envClick < 0.0002) {continue}
            const f = this.tune * (1 + ratio * this.envSweep) * (1 + 1.2 * this.punch * this.envPunch)
            this.phase += f / sr
            if (this.phase >= 1) {this.phase -= 1}
            const body = Math.sin(twoPi * this.phase) * this.amp
            // Saturation en parallele : corps propre + copie ecrasee
            const sat = Math.tanh(body * gain) / Math.tanh(gain)
            const low = body * (1 - 0.5 * wet) + sat * wet * 0.8
            // Le claquement : bruit dans un passe-bande
            this.seed = (this.seed * 1664525 + 1013904223) >>> 0
            const noise = (this.seed / 2147483648 - 1) * this.envClick
            this.bandLow += fClick * this.bandBand
            this.bandBand += fClick * (noise - this.bandLow - 0.9 * this.bandBand)
            const tick = this.bandBand * this.click * 1.4
            // Ecretage doux de la pointe
            const x = (low + tick) * 1.15
            const y = (x > 0.9 ? 0.9 + Math.tanh((x - 0.9) * 3) / 3 : x < -0.9 ? -0.9 + Math.tanh((x + 0.9) * 3) / 3 : x) * out
            outL[s] += y
            outR[s] += y
            this.amp *= kAmp
            this.envSweep *= kSweep
            this.envPunch *= kPunch
            this.envClick *= kClick
        }
    }
}
