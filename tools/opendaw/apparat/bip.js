// @label Bip
// @param decay   90    4     800   exp     ms
// @param hold    20    0     200   linear  ms
// @param bend    0     -2    2     linear
// @param bendms  30    3     300   exp     ms
// @param shape   0     0     1     linear
// @param width   0.8   0     1     linear
// @param haas    0     0     20    linear  ms
// @param volume  0.6   0     1     linear

// Le bip : une sinusoide nue, comme une tonalite d'essai. Elle tient "hold"
// ms puis s'eteint en "decay" ms. "bend" la fait partir d'ailleurs (en
// octaves : +1 = elle tombe d'une octave sur sa note, -1 = elle y monte) et
// la ramene en "bendms" ms : avec ca le meme instrument fait le bip, la
// goutte d'eau et le petit tic. "shape" l'ecrase vers le carre.
//
// Chaque note sort a une place differente entre les deux oreilles : les
// places se suivent sans jamais se repeter (suite du nombre d'or).
// "width" = l'ecart. La place se fait de deux facons melangees :
// - le volume : un peu plus fort d'un cote, jamais tout d'un cote (au casque,
//   un son colle a une seule oreille distrait plus qu'il ne chatouille) ;
// - le retard ("haas", en ms) : le son arrive un peu plus tard dans l'oreille
//   opposee, comme dans une vraie piece. 10 ms suffisent, 20 c'est beaucoup.
// Le retard est a eviter sur ce qui doit rester solide en mono (la voix
// principale, la basse) : en mono, les deux copies peuvent s'annuler.
// Une note dure le temps regle ici, pas le temps ecrit.
class Processor {
    decayMs = 90
    holdMs = 20
    bend = 0
    bendMs = 30
    shape = 0
    width = 0.8
    haasMs = 0
    volume = 0.6
    voices = []
    count = 0
    futL = new Float32Array(8192)
    futR = new Float32Array(8192)
    pos = 0
    paramChanged(name, value) {
        switch (name) {
            case "decay": this.decayMs = value; break
            case "hold": this.holdMs = value; break
            case "bend": this.bend = value; break
            case "bendms": this.bendMs = value; break
            case "shape": this.shape = value; break
            case "width": this.width = value; break
            case "haas": this.haasMs = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        const f0 = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        if (this.voices.length >= 8) {this.voices.shift()}
        // Nombre d'or : chaque note tombe loin de la precedente, sans motif
        this.count++
        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width
        const angle = (1 + place * 0.6) * Math.PI / 4
        const late = Math.min(4000, Math.round(Math.abs(place) * this.haasMs * 0.001 * sampleRate))
        this.voices.push({
            f0, phase: 0, amp: 1, attack: 0, bendEnv: 1, level: velocity,
            hold: Math.round(this.holdMs * 0.001 * sampleRate),
            left: Math.cos(angle), right: Math.sin(angle),
            // La note penche a droite : c'est l'oreille gauche qui la recoit en retard
            lateL: place > 0 ? late : 0, lateR: place > 0 ? 0 : late
        })
    }
    noteOff(id) {
    }
    reset() {
        this.voices = []
        this.futL.fill(0)
        this.futR.fill(0)
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const mask = 8191
        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))
        const kBend = Math.exp(-1 / (this.bendMs * 0.001 * sr))
        // Attaque de 0,7 ms : assez courte pour claquer, assez longue pour ne pas cliquer
        const attackStep = 1 / (0.0007 * sr)
        const gain = 1 + this.shape * 8
        const norm = 0.8 * this.volume / Math.tanh(gain)
        const bent = this.bend !== 0
        // Les voix ecrivent dans deux lignes a retard (une par oreille) : chacune
        // y pose son son un peu plus loin pour l'oreille qui doit l'entendre en retard
        for (const v of this.voices) {
            let at = this.pos
            for (let s = block.s0; s < block.s1; s++) {
                const f = bent ? v.f0 * Math.pow(2, this.bend * v.bendEnv) : v.f0
                v.phase += f / sr
                if (v.phase >= 1) {v.phase -= 1}
                if (v.attack < 1) {v.attack = Math.min(1, v.attack + attackStep)}
                const y = Math.tanh(Math.sin(twoPi * v.phase) * gain) * norm * v.amp * v.attack * v.level
                this.futL[(at + v.lateL) & mask] += y * v.left
                this.futR[(at + v.lateR) & mask] += y * v.right
                at++
                if (v.hold > 0) {v.hold--} else {v.amp *= kAmp}
                v.bendEnv *= kBend
            }
        }
        let at = this.pos
        for (let s = block.s0; s < block.s1; s++) {
            const i = at & mask
            outL[s] += this.futL[i]
            outR[s] += this.futR[i]
            this.futL[i] = 0
            this.futR[i] = 0
            at++
        }
        this.pos = at & mask
        this.voices = this.voices.filter(v => v.amp > 0.0003)
    }
}
