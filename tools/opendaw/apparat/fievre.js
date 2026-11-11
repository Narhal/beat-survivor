// @label Fievre
// @param ratio   1     0.5   7     linear
// @param index   2     0     10    linear
// @param idecay  120   15    900   exp     ms
// @param decay   180   30    1200  exp     ms
// @param drive   0.3   0     1     linear
// @param spread  0.5   0     1     linear
// @param volume  0.7   0     1     linear

// Le riff. Synthese FM a deux operateurs : une porteuse dont la phase est
// secouee par une modulante. "index" dit de combien (le mordant), "ratio" dit
// a quelle frequence (la couleur : 1 = plein, 2 = creux, 3,5 = metal).
// Faire glisser ratio pendant que le riff tourne, c'est changer de matiere
// sans changer de note. Une note a velocite 1 est accentuee : plus de mordant.
class Processor {
    ratio = 1
    index = 2
    idecayMs = 120
    decayMs = 180
    drive = 0.3
    spread = 0.5
    volume = 0.7
    voices = []
    paramChanged(name, value) {
        switch (name) {
            case "ratio": this.ratio = value; break
            case "index": this.index = value; break
            case "idecay": this.idecayMs = value; break
            case "decay": this.decayMs = value; break
            case "drive": this.drive = value; break
            case "spread": this.spread = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        const f0 = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        if (this.voices.length >= 6) {this.voices.shift()}
        this.voices.push({
            f0, carrierL: 0, carrierR: 0, modulator: 0, amp: 1, attack: 0, indexEnv: 1,
            level: velocity, bite: velocity >= 1 ? 1.6 : 1
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
        const kIndex = Math.exp(-1 / (this.idecayMs * 0.001 * sr))
        const kAttack = 1 - Math.exp(-1 / (0.001 * sr))
        // Deux porteuses a quelques cents d'ecart, une par oreille
        const detune = Math.pow(2, this.spread * 6 / 1200)
        const gain = 1 + this.drive * 4
        const norm = 0.6 * this.volume / Math.tanh(gain)
        for (const v of this.voices) {
            const stepL = v.f0 * detune / sr
            const stepR = v.f0 / detune / sr
            const stepM = v.f0 * this.ratio / sr
            for (let s = block.s0; s < block.s1; s++) {
                v.modulator += stepM
                if (v.modulator >= 1) {v.modulator -= 1}
                v.carrierL += stepL
                if (v.carrierL >= 1) {v.carrierL -= 1}
                v.carrierR += stepR
                if (v.carrierR >= 1) {v.carrierR -= 1}
                const mod = Math.sin(twoPi * v.modulator) * this.index * v.bite * (0.15 + 0.85 * v.indexEnv)
                v.attack += (1 - v.attack) * kAttack
                const a = v.amp * v.attack * v.level * gain
                outL[s] += Math.tanh(Math.sin(twoPi * v.carrierL + mod) * a) * norm
                outR[s] += Math.tanh(Math.sin(twoPi * v.carrierR + mod) * a) * norm
                v.amp *= kAmp
                v.indexEnv *= kIndex
            }
        }
        this.voices = this.voices.filter(v => v.amp > 0.0003)
    }
}
