// @label Cymbale
// @param decay   45    10    300   exp     ms
// @param open    6     2     14    linear
// @param tone    7000  3000  12000 exp     Hz
// @param metal   0.5   0     1     linear
// @param drift   0.5   0     1     linear
// @param width   0.5   0     1     linear
// @param volume  0.6   0     1     linear

// Les charleys de synthese. Un charley, c'est du bruit et du metal : ici six
// ondes carrees a des rapports qui ne tombent pas juste (le principe des
// boites a rythmes), melangees a du bruit blanc ("metal" = la part de metal),
// puis passees dans un filtre passe-haut ("tone") qui n'en garde que le haut.
// Les notes 46 et au-dessus sont des charleys ouverts : "open" fois plus longs.
// Un coup coupe le precedent, comme une vraie pedale.
// Comme sur un instrument, un coup plus fort est plus long et plus clair.
// "drift" le fait vivre : une horloge lente allonge et raccourcit les coups
// sur quelques mesures, un coup sur deux est un rien plus sombre, et chaque
// coup sort a un endroit legerement different ("width").
class Processor {
    decayMs = 45
    open = 6
    tone = 7000
    metal = 0.5
    drift = 0.5
    width = 0.5
    volume = 0.6
    amp = 0
    kAmp = 0.99
    attack = 0
    level = 0
    bright = 1
    left = 0.7
    right = 0.7
    count = 0
    seed = 97531
    lfo = 0
    phases = [0, 0, 0, 0, 0, 0]
    x1 = 0
    x2 = 0
    y1 = 0
    y2 = 0
    u1 = 0
    u2 = 0
    v1 = 0
    v2 = 0
    soft = 0
    paramChanged(name, value) {
        switch (name) {
            case "decay": this.decayMs = value; break
            case "open": this.open = value; break
            case "tone": this.tone = value; break
            case "metal": this.metal = value; break
            case "drift": this.drift = value; break
            case "width": this.width = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        const sr = sampleRate
        this.count++
        const sway = Math.sin(2 * Math.PI * this.lfo)
        const long = pitch >= 46 ? this.open : 1
        const ms = this.decayMs * long * (0.6 + 0.6 * velocity) * (1 + 0.3 * this.drift * sway)
        this.kAmp = Math.exp(-1 / (ms * 0.001 * sr))
        this.amp = 1
        this.attack = 0
        this.level = velocity
        // Un coup sur deux un rien plus sombre ; un coup fort plus clair
        this.bright = (0.8 + 0.4 * velocity) * (1 - 0.12 * this.drift * (this.count % 2))
        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width
        const angle = (1 + place * 0.5) * Math.PI / 4
        this.left = Math.cos(angle)
        this.right = Math.sin(angle)
    }
    noteOff(id) {
    }
    reset() {
        this.amp = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        this.lfo += 0.07 * (block.s1 - block.s0) / sr
        if (this.lfo >= 1) {this.lfo -= 1}
        if (this.amp < 0.0003) {return}
        // Les six carres : les rapports d'une vieille boite a rythmes, montes de deux octaves
        const base = 4 / sr
        const steps = [205.3 * base, 304.4 * base, 369.6 * base, 522.7 * base, 540 * base, 800 * base]
        // Passe-haut du second ordre, deux etages : stable jusqu en haut du spectre
        const fc = Math.min(this.tone * this.bright, sr * 0.42)
        const w = 2 * Math.PI * fc / sr
        const alpha = Math.sin(w) / 1.414
        const cw = Math.cos(w)
        const a0 = 1 + alpha
        const b0 = (1 + cw) / 2 / a0
        const b1 = -(1 + cw) / a0
        const a1 = -2 * cw / a0
        const a2 = (1 - alpha) / a0
        // Un passe-bas doux vers 13 kHz : une vraie cymbale ne monte pas jusqu au bout
        const kSoft = 1 - Math.exp(-2 * Math.PI * 13000 / sr)
        const attackStep = 1 / (0.0006 * sr)
        const norm = this.volume * 0.9
        for (let s = block.s0; s < block.s1; s++) {
            let sq = 0
            for (let k = 0; k < 6; k++) {
                let p = this.phases[k] + steps[k]
                if (p >= 1) {p -= 1}
                this.phases[k] = p
                sq += p < 0.5 ? 1 : -1
            }
            this.seed = (this.seed * 1664525 + 1013904223) >>> 0
            const noise = this.seed / 2147483648 - 1
            const x = sq / 6 * this.metal * 1.6 + noise * (1 - this.metal)
            const h = b0 * x + b1 * this.x1 + b0 * this.x2 - a1 * this.y1 - a2 * this.y2
            this.x2 = this.x1
            this.x1 = x
            this.y2 = this.y1
            this.y1 = h
            const h2 = b0 * h + b1 * this.u1 + b0 * this.u2 - a1 * this.v1 - a2 * this.v2
            this.u2 = this.u1
            this.u1 = h
            this.v2 = this.v1
            this.v1 = h2
            this.soft += (h2 - this.soft) * kSoft
            if (this.attack < 1) {this.attack = Math.min(1, this.attack + attackStep)}
            const y = this.soft * this.amp * this.attack * this.level * norm
            outL[s] += y * this.left
            outR[s] += y * this.right
            this.amp *= this.kAmp
        }
    }
}
