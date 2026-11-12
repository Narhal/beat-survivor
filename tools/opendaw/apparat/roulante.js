// @label Roulante
// @param pas      121   60    300   exp     ms
// @param long     0.8   0.2   1.5   linear
// @param cutoff   90    40    400   exp     Hz
// @param envmod   3     0     6     linear
// @param fdecay   0.45  0.05  1     linear
// @param pinch    0.5   0     1     linear
// @param sub      0.7   0     1     linear
// @param sublen   0.6   0.2   1     linear
// @param disperse 0.3   0     1     linear
// @param drive    0.4   0     1     linear
// @param volume   0.7   0     1     linear

// La basse roulante : des notes courtes entre les coups de pied. Chaque note
// repart exactement du meme point (meme phase, filtre remis a zero) et
// retombe a zero avant la suivante. Sa duree se compte en pas, pas en
// millisecondes : "pas" est la duree d'une double-croche au tempo du morceau,
// "long" la longueur de la note en pas. Tout suit donc le tempo.
// Le son a deux chemins :
// - la fondamentale : une sinusoide seule, propre, plus courte que le reste
//   ("sub" = son niveau, "sublen" = sa longueur, en part de la note) ;
// - les harmoniques : une dent de scie privee de sa fondamentale, dans un
//   passe-bas dont la coupure part haut et retombe ("cutoff" = ou elle
//   retombe, "envmod" = de combien d'octaves elle part, "fdecay" = en quelle
//   part de la note ; "pinch" = une seconde enveloppe de 6 ms, le pincement),
//   puis une saturation ("drive"). Le grave, lui, n'est jamais sature.
// "disperse" decale la phase des harmoniques les unes par rapport aux autres :
// le spectre ne change pas, l'attaque oui (elle s'etale, la pointe baisse).
// La velocite regle la part de fondamentale : en dessous de 0,35 il n'y en a
// plus, a 0,75 elle est entiere. La note qui suit le pied se joue sans elle,
// pour ne pas s'ajouter a la queue du pied.
class Processor {
    pasMs = 121
    long = 0.8
    cutoff = 90
    envmod = 3
    fdecay = 0.45
    pinch = 0.5
    sub = 0.7
    sublen = 0.6
    disperse = 0.3
    drive = 0.4
    volume = 0.7
    table = null
    built = -1
    phase = 0
    freq = 49
    age = 0
    length = 1
    on = false
    subGain = 1
    bright = 1
    low = 0
    band = 0
    pole = 0
    g = 0
    k1 = 0
    paramChanged(name, value) {
        switch (name) {
            case "pas": this.pasMs = value; break
            case "long": this.long = value; break
            case "cutoff": this.cutoff = value; break
            case "envmod": this.envmod = value; break
            case "fdecay": this.fdecay = value; break
            case "pinch": this.pinch = value; break
            case "sub": this.sub = value; break
            case "sublen": this.sublen = value; break
            case "disperse": this.disperse = value; break
            case "drive": this.drive = value; break
            case "volume": this.volume = value; break
        }
    }
    // Une periode d'onde : les harmoniques 2 a 48 d'une dent de scie, dephases par "disperse"
    build() {
        const n = 2048
        const table = new Float32Array(n + 1)
        const d = this.disperse
        let peak = 0
        for (let k = 2; k <= 48; k++) {
            const theta = d * 2 * Math.PI * 3 * (k - 1) / (k + 5)
            const a = 1 / k
            for (let i = 0; i < n; i++) {
                table[i] += a * Math.sin(2 * Math.PI * k * i / n + theta)
            }
        }
        for (let i = 0; i < n; i++) {peak = Math.max(peak, Math.abs(table[i]))}
        for (let i = 0; i < n; i++) {table[i] /= peak}
        table[n] = table[0]
        this.table = table
        this.built = d
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        if (this.table === null || Math.abs(this.built - this.disperse) > 0.01) {this.build()}
        this.freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        this.phase = 0
        this.age = 0
        this.length = Math.max(64, Math.round(this.long * this.pasMs * 0.001 * sampleRate))
        this.subGain = Math.max(0, Math.min(1, (velocity - 0.35) / 0.4))
        this.bright = 0.6 + 0.4 * velocity
        this.low = 0
        this.band = 0
        this.pole = 0
        this.on = true
    }
    noteOff(id) {
    }
    reset() {
        this.on = false
    }
    process(output, block) {
        if (!this.on) {return}
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const table = this.table
        const dt = this.freq / sr
        const attack = Math.round(0.0015 * sr)
        const kPinch = 1 / (0.006 * sr)
        const push = 1 + 6 * this.drive
        const subEnd = this.sublen * this.length
        for (let s = block.s0; s < block.s1; s++) {
            if (this.age >= this.length) {
                this.on = false
                return
            }
            const u = this.age / this.length
            const p = this.phase
            // Les harmoniques, lus dans la table
            const pos = p * 2048
            const i = pos | 0
            const harm = table[i] + (table[i + 1] - table[i]) * (pos - i)
            // La coupure : une enveloppe large et un pincement de 6 ms, recalcules toutes les 8 notes d'horloge
            if ((this.age & 7) === 0) {
                const wide = 0.18 + 0.82 * Math.exp(-u / (this.fdecay * 0.35))
                const pinch = Math.exp(-this.age * kPinch)
                const fc = Math.min(this.cutoff * Math.pow(2, this.envmod * this.bright * wide + 2.5 * this.pinch * pinch), 7000)
                this.g = 2 * Math.sin(Math.PI * fc / sr)
                this.k1 = 1 - Math.exp(-twoPi * fc * 2 / sr)
            }
            this.low += this.g * this.band
            this.band += this.g * (harm - this.low - 1.3 * this.band)
            this.pole += (this.low - this.pole) * this.k1
            const sat = Math.tanh(this.pole * push) / Math.sqrt(push)
            // La fondamentale : propre, plus courte
            const us = this.age / subEnd
            const subAmp = us < 1 ? Math.pow(Math.cos(0.5 * Math.PI * us), 1.5) : 0
            const fund = Math.sin(twoPi * p) * subAmp * this.sub * this.subGain
            // L'enveloppe de la note : 1,5 ms de montee, puis une descente qui arrive a zero
            const amp = (this.age < attack ? this.age / attack : 1) * Math.pow(Math.cos(0.5 * Math.PI * u), 1.2)
            const y = (sat * 0.7 * amp + fund * (this.age < attack ? this.age / attack : 1)) * this.volume
            outL[s] += y
            outR[s] += y
            this.phase = p + dt
            if (this.phase >= 1) {this.phase -= 1}
            this.age++
        }
    }
}
