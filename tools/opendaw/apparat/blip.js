// @label Blip
// @param long    90    15    1500  exp     ms
// @param tone    0.4   0     1     linear
// @param bite    0.8   0     4     linear
// @param ratio   2     0.5   7     linear
// @param snap    0.3   0     1     linear
// @param sub     0.2   0     1     linear
// @param chirp   0     -12   12    linear  st
// @param drift   0.4   0     1     linear
// @param duck    0.3   0     1     linear
// @param width   0.3   0     1     linear
// @param haas    0     0     20    linear  ms
// @param volume  0.6   0     1     linear

// Le blip : la voix des petits sons. Il remplace le bip (une sinusoide nue,
// tenue, ecrasee, jouee entre 1 et 2,6 kHz : penible a l'oreille). Ici chaque
// note est construite comme un vrai son, en trois temps :
// - l'attaque : un souffle de 2 ms ("snap") et un eclat de brillance. L'eclat
//   vient de deux cotes : une modulation de frequence ("bite" = sa force,
//   "ratio" = sa couleur ; entier = propre et creux, a virgule = metal) qui
//   s'eteint en quelques dizaines de ms, et un filtre passe-bas qui part
//   ouvert et se referme sur la note ;
// - le corps : presque une sinusoide, ronde, sans rien de sature, doublee une
//   octave plus bas ("sub") ;
// - la fin : elle s'eteint toute seule en "long" ms.
// Deux reglages suffisent a tout explorer : "long" (court / long) et "tone"
// (sombre / clair). Comme sur un instrument acoustique, une note jouee plus
// fort est plus claire et plus longue.
// "chirp" fait partir la note d'a cote (en demi-tons) et la ramene en 10 ms :
// positif, elle tombe sur sa note (bloup) ; negatif, elle y monte (goutte).
// "drift" empeche deux notes de suite d'etre identiques, sans que ca
// s'entende : une note sur deux est un rien plus haute, l'autre un rien plus
// basse, et une horloge lente fait varier l'eclat et la longueur.
// "duck" : toute note plus grave que 24 ne sonne pas, elle fait plonger le
// son (le morceau en envoie une a chaque coup de pied).
//
// La place entre les deux oreilles change a chaque note (suite du nombre
// d'or) : "width" = l'ecart, par le volume, jamais tout d'un cote ; "haas" =
// un petit retard dans l'oreille opposee (a laisser a 0 pour la voix
// principale, qui doit rester solide en mono).
class Processor {
    longMs = 90
    tone = 0.4
    bite = 0.8
    ratio = 2
    snap = 0.3
    sub = 0.2
    chirp = 0
    drift = 0.4
    duck = 0.3
    width = 0.3
    haasMs = 0
    volume = 0.6
    voices = []
    count = 0
    seed = 9871
    lfo = 0
    dip = 0
    dipSmooth = 0
    futL = new Float32Array(8192)
    futR = new Float32Array(8192)
    pos = 0
    paramChanged(name, value) {
        switch (name) {
            case "long": this.longMs = value; break
            case "tone": this.tone = value; break
            case "bite": this.bite = value; break
            case "ratio": this.ratio = value; break
            case "snap": this.snap = value; break
            case "sub": this.sub = value; break
            case "chirp": this.chirp = value; break
            case "drift": this.drift = value; break
            case "duck": this.duck = value; break
            case "width": this.width = value; break
            case "haas": this.haasMs = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {
            this.dip = 1
            return
        }
        const sr = sampleRate
        this.count++
        // Une note sur deux un rien plus haute, l'autre un rien plus basse
        const tick = (this.count % 2 === 0 ? 1 : -1) * this.drift * 12
        const f0 = 440 * Math.pow(2, (pitch - 69 + (cent + tick) / 100) / 12)
        if (this.voices.length >= 8) {this.voices.shift()}
        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width
        const angle = (1 + place * 0.6) * Math.PI / 4
        const late = Math.min(4000, Math.round(Math.abs(place) * this.haasMs * 0.001 * sr))
        // L'horloge lente : deux notes de suite ne sont jamais identiques
        const sway = Math.sin(2 * Math.PI * this.lfo)
        const tau = this.longMs * 0.001 * (0.55 + 0.6 * velocity) * (1 + 0.2 * this.drift * sway)
        this.voices.push({
            f0, carrier: 0, modulator: 0, under: 0, attack: 0, amp: 1, level: velocity,
            hold: Math.round(0.006 * sr),
            kAmp: Math.exp(-1 / (tau * sr)),
            // L'eclat : modulation de frequence qui s'eteint vite
            index: this.bite * (0.5 + 0.7 * velocity) * (1 - 0.3 * this.drift * sway),
            envIndex: 1, kIndex: Math.exp(-1 / ((0.012 + tau * 0.12) * sr)),
            // Le filtre : ouvert au depart, il se referme juste au-dessus de la note
            open: 12 * this.tone * (0.6 + 0.4 * velocity),
            envFilter: 1, kFilter: Math.exp(-1 / ((0.008 + tau * 0.35) * sr)),
            low: 0, band: 0,
            bend: Math.pow(2, this.chirp / 12) - 1, envBend: 1, kBend: Math.exp(-1 / (0.010 * sr)),
            breath: 1, kBreath: Math.exp(-1 / (0.002 * sr)),
            left: Math.cos(angle), right: Math.sin(angle),
            lateL: place > 0 ? late : 0, lateR: place > 0 ? 0 : late
        })
    }
    noteOff(id) {
    }
    reset() {
        this.voices = []
        this.dip = 0
        this.dipSmooth = 0
        this.futL.fill(0)
        this.futR.fill(0)
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const mask = 8191
        const norm = 0.55 * this.volume
        const air = this.snap * 0.5
        const attackStep = 1 / (0.0012 * sr)
        const fcMax = sr / 6.5
        this.lfo += 0.13 * (block.s1 - block.s0) / sr
        if (this.lfo >= 1) {this.lfo -= 1}
        for (const v of this.voices) {
            let at = this.pos
            for (let s = block.s0; s < block.s1; s++) {
                const f = v.f0 * (1 + v.bend * v.envBend)
                v.carrier += f / sr
                if (v.carrier >= 1) {v.carrier -= 1}
                v.modulator += f * this.ratio / sr
                if (v.modulator >= 1) {v.modulator -= 1}
                v.under += f * 0.5 / sr
                if (v.under >= 1) {v.under -= 1}
                this.seed = (this.seed * 1664525 + 1013904223) >>> 0
                const noise = (this.seed / 2147483648 - 1) * v.breath * air
                const x = Math.sin(twoPi * v.carrier + Math.sin(twoPi * v.modulator) * v.index * v.envIndex) + noise
                // Passe-bas a deux poles, un peu resonant, qui suit la note
                const fc = Math.min(v.f0 * (1.4 + v.open * v.envFilter), fcMax)
                const g = 2 * Math.sin(Math.PI * fc / sr)
                v.low += g * v.band
                v.band += g * (x - v.low - 0.7 * v.band)
                if (v.attack < 1) {v.attack = Math.min(1, v.attack + attackStep)}
                const y = (v.low + Math.sin(twoPi * v.under) * this.sub) * v.amp * v.attack * v.level * norm
                this.futL[(at + v.lateL) & mask] += y * v.left
                this.futR[(at + v.lateR) & mask] += y * v.right
                at++
                if (v.hold > 0) {v.hold--} else {v.amp *= v.kAmp}
                v.envIndex *= v.kIndex
                v.envFilter *= v.kFilter
                v.envBend *= v.kBend
                v.breath *= v.kBreath
            }
        }
        // Le plongeon sous le pied, applique a la sortie
        const kDip = Math.exp(-1 / (0.110 * sr))
        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))
        let at = this.pos
        for (let s = block.s0; s < block.s1; s++) {
            const i = at & mask
            this.dip *= kDip
            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth
            const gain = 1 - this.duck * this.dipSmooth
            outL[s] += this.futL[i] * gain
            outR[s] += this.futR[i] * gain
            this.futL[i] = 0
            this.futR[i] = 0
            at++
        }
        this.pos = at & mask
        this.voices = this.voices.filter(v => v.amp > 0.0003)
    }
}
