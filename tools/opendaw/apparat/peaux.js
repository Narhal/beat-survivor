// @label Peaux
// @param decay   220   60    900   exp     ms
// @param bend    0.5   0     1     linear
// @param slap    0.4   0     1     linear
// @param drive   0.4   0     1     linear
// @param width   0.6   0     1     linear
// @param volume  0.8   0     1     linear

// Toms et congas de synthese. Chaque note est une peau accordee : une
// sinusoide dont la hauteur retombe apres la frappe, un partiel inharmonique
// (rapport 1,593, celui d'une membrane) et un claquement de bruit.
// Les peaux aigues sonnent plus court et s'ecartent dans la stereo.
class Processor {
    decayMs = 220
    bend = 0.5
    slap = 0.4
    drive = 0.4
    width = 0.6
    volume = 0.8
    voices = []
    seed = 987654321
    paramChanged(name, value) {
        switch (name) {
            case "decay": this.decayMs = value; break
            case "bend": this.bend = value; break
            case "slap": this.slap = value; break
            case "drive": this.drive = value; break
            case "width": this.width = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        const f0 = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        const seconds = this.decayMs * 0.001 * Math.sqrt(110 / f0)
        // Place stereo deduite de la note : stable d'une frappe a l'autre
        const side = (((pitch * 5) % 7) / 6 - 0.5) * 2 * this.width * (f0 < 125 ? 0.3 : 1)
        const angle = (side + 1) * Math.PI / 4
        if (this.voices.length >= 8) {this.voices.shift()}
        this.voices.push({
            f0, phase: 0, phase2: 0, amp: 1, pitchEnv: 1, slapEnv: 1, level: velocity,
            kAmp: Math.exp(-1 / (seconds * sampleRate)), left: Math.cos(angle), right: Math.sin(angle)
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
        const kPitch = Math.exp(-1 / (0.028 * sr))
        const kSlap = Math.exp(-1 / (0.006 * sr))
        const gain = 1 + this.drive * 4
        const norm = 0.7 * this.volume / Math.tanh(gain)
        for (const v of this.voices) {
            for (let s = block.s0; s < block.s1; s++) {
                const f = v.f0 * (1 + this.bend * 1.2 * v.pitchEnv)
                v.phase += f / sr
                if (v.phase >= 1) {v.phase -= 1}
                v.phase2 += f * 1.593 / sr
                if (v.phase2 >= 1) {v.phase2 -= 1}
                // Le partiel inharmonique s'eteint deux fois plus vite que le corps
                const body = (Math.sin(twoPi * v.phase) + 0.35 * Math.sin(twoPi * v.phase2) * v.amp) * v.amp
                this.seed = (this.seed * 1664525 + 1013904223) >>> 0
                const hit = (this.seed / 2147483648 - 1) * v.slapEnv * this.slap * 0.8
                const y = Math.tanh((body + hit) * gain) * norm * v.level
                outL[s] += y * v.left
                outR[s] += y * v.right
                v.amp *= v.kAmp
                v.pitchEnv *= kPitch
                v.slapEnv *= kSlap
            }
        }
        this.voices = this.voices.filter(v => v.amp > 0.0003)
    }
}
