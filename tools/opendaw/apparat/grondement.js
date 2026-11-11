// @label Grondement
// @param tone    120   60    400   exp     Hz
// @param body    46    35    90    exp     Hz
// @param weight  0.6   0     1     linear
// @param duck    0.95  0     1     linear
// @param swell   120   20    400   exp     ms
// @param hold    330   80    900   exp     ms
// @param grit    0.25  0     1     linear
// @param drive   0.5   0     1     linear
// @param volume  0.7   0     1     linear

// Le grondement : la masse de bruit grave qui roule entre deux coups de pied
// dans la techno d'aujourd'hui. Ce n'est pas une note, c'est du bruit :
// - un bruit passe au filtre passe-bas ("tone"), au centre, en mono ;
// - une bosse resonante tout en bas ("body" = sa frequence, "weight" = sa
//   force), qui lui donne du poids ;
// - une couche de mediums ecrases vers 900 Hz ("grit"), tout bas, pour qu'il
//   existe aussi sur de petites enceintes.
// Il respire avec le pied. Le morceau lui envoie trois notes muettes :
// - la note 12 a chaque coup de pied : le grondement s'efface ("duck"), puis
//   enfle en "swell" ms, et se referme "hold" ms plus tard, avant le coup
//   suivant, pour que le haut-parleur revienne au repos ;
// - la note 13 sur le contretemps : une poussee en plus a cet endroit ;
// - la note 14 : il reste ouvert jusqu'au prochain coup de pied (pour une fin
//   de phrase ou l'entree d'un creux).
class Processor {
    tone = 120
    body = 46
    weight = 0.6
    duck = 0.95
    swellMs = 120
    holdMs = 330
    grit = 0.25
    drive = 0.5
    volume = 0.7
    seed = 13579
    low = 0
    band = 0
    low2 = 0
    band2 = 0
    bLow = 0
    bBand = 0
    gLow = 0
    gBand = 0
    gate = 0
    gateTarget = 0
    left = 0
    dip = 0
    bump = 0
    level = 1
    paramChanged(name, value) {
        switch (name) {
            case "tone": this.tone = value; break
            case "body": this.body = value; break
            case "weight": this.weight = value; break
            case "duck": this.duck = value; break
            case "swell": this.swellMs = value; break
            case "hold": this.holdMs = value; break
            case "grit": this.grit = value; break
            case "drive": this.drive = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch === 13) {
            this.bump = 1
            return
        }
        if (pitch === 14) {
            this.gateTarget = 1
            this.left = Math.round(4 * sampleRate)
            return
        }
        this.dip = 1
        this.gateTarget = 1
        this.left = Math.round(this.holdMs * 0.001 * sampleRate)
        this.level = velocity
    }
    noteOff(id) {
    }
    reset() {
        this.gate = 0
        this.gateTarget = 0
        this.left = 0
        this.dip = 0
        this.bump = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        if (this.gateTarget === 0 && this.gate < 0.0003) {
            this.gate = 0
            return
        }
        const fTone = 2 * Math.sin(Math.PI * this.tone / sr)
        const fBody = 2 * Math.sin(Math.PI * this.body / sr)
        const fGrit = 2 * Math.sin(Math.PI * 900 / sr)
        // Le bruit filtre sort d'autant plus faible que le filtre est grave : on compense
        const compTone = Math.sqrt(1.5 / fTone)
        const compBody = Math.sqrt(0.25 / fBody) * 0.5
        const kDip = Math.exp(-1 / (this.swellMs * 0.001 * sr))
        const kBump = Math.exp(-1 / (0.090 * sr))
        const kOpen = 1 - Math.exp(-1 / (0.012 * sr))
        const kClose = 1 - Math.exp(-1 / (0.030 * sr))
        const gain = 1 + this.drive * 5
        const norm = this.volume / Math.tanh(gain)
        for (let s = block.s0; s < block.s1; s++) {
            this.seed = (this.seed * 1664525 + 1013904223) >>> 0
            const x = this.seed / 2147483648 - 1
            // Passe-bas a quatre poles (deux etages) : presque rien ne passe au-dessus
            this.low += fTone * this.band
            this.band += fTone * (x - this.low - 1.1 * this.band)
            this.low2 += fTone * this.band2
            this.band2 += fTone * (this.low - this.low2 - 1.1 * this.band2)
            // La bosse du bas : un passe-bande etroit
            this.bLow += fBody * this.bBand
            this.bBand += fBody * (x - this.bLow - 0.25 * this.bBand)
            // Les mediums : un passe-bande vers 900 Hz
            this.gLow += fGrit * this.gBand
            this.gBand += fGrit * (x - this.gLow - 0.6 * this.gBand)
            // La respiration
            if (this.left > 0) {
                this.left--
                if (this.left === 0) {this.gateTarget = 0}
            }
            this.gate += (this.gateTarget - this.gate) * (this.gateTarget > this.gate ? kOpen : kClose)
            this.dip *= kDip
            this.bump *= kBump
            const env = this.gate * (1 - this.duck * this.dip) * (1 + 0.6 * this.bump) * this.level
            const mass = this.low2 * compTone * 1.3 + this.bBand * compBody * this.weight * 2
            const y = Math.tanh(mass * env * gain * 0.5) * norm +
                Math.tanh(this.gBand * 3 * env) * this.grit * this.volume * 0.25
            outL[s] += y
            outR[s] += y
        }
    }
}
