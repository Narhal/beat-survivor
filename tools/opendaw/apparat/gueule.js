// @label Gueule
// @param pas      107   60    300   exp     ms
// @param detune   14    0     50    linear  ct
// @param growl    0.4   0     1     linear
// @param rank     11    2     16    linear
// @param cutoff   110   50    800   exp     Hz
// @param depth    3.2   0     6     linear
// @param reso     0.45  0     0.95  linear
// @param vowel    0.3   0     1     linear
// @param shape    0.3   0     1     linear
// @param drive    0.6   0     1     linear
// @param tone     2800  600   8000  exp     Hz
// @param lowcut   90    40    400   exp     Hz
// @param width    0.6   0     1     linear
// @param glide    60    1     400   exp     ms
// @param volume   0.6   0     1     linear

// La basse qui gronde. Une seule voix, dans le medium : le grave est a un
// autre instrument.
// La source : trois dents de scie, une au centre et deux desaccordees
// ("detune", en cents), une a gauche et une a droite : elles battent entre
// elles. Par-dessus, un grognement ("growl") : une sinusoide et l'un de ses
// harmoniques eleves ("rank" = son rang), ecrases ensemble.
// Le mouvement : une horloge fait monter et descendre le filtre de "depth"
// octaves au-dessus de "cutoff". Sa vitesse est ecrite dans chaque note, par
// la velocite, en valeurs de temps ("pas" = la duree d'une double-croche) :
//   0,3 = pas d'horloge : le filtre part ouvert et retombe (un "ouaaa") ;
//   0,4 = une blanche ; 0,5 = une noire ; 0,6 = un triolet de noires ;
//   0,7 = une croche ; 0,8 = un triolet de croches ; 0,9 = une double-croche ;
//   1,0 = un triolet de doubles-croches.
// L'horloge repart de zero a chaque note : le meme mouvement a chaque fois.
// La velocite ne regle donc pas le volume.
// - "shape" : a 0 l'horloge est ronde (le filtre s'ouvre puis se referme :
//   "woub"), a 1 elle tombe en dent de scie (il part ouvert : "yoi") ;
// - "vowel" : a 0 un simple passe-bas ; a 1 deux pics qui bougent comme les
//   resonances d'une bouche, et la basse parle ;
// - puis une saturation ("drive"), un passe-bas qui adoucit le haut ("tone")
//   et un coupe-bas ("lowcut").
// Deux notes qui se chevauchent sont liees : la hauteur glisse ("glide").
class Processor {
    pasMs = 107
    detune = 14
    growl = 0.4
    rank = 11
    cutoff = 110
    depth = 3.2
    reso = 0.45
    vowel = 0.3
    shape = 0.3
    drive = 0.6
    tone = 2800
    lowcut = 90
    width = 0.6
    glideMs = 60
    volume = 0.6
    held = []
    freq = 98
    target = 98
    pc = 0
    pu = 0.33
    pd = 0.71
    pg = 0
    gate = false
    amp = 0
    period = 0
    age = 0
    tick = 0
    g = 0.1
    g1 = 0.1
    g2 = 0.2
    lfo = 0
    f = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    t = [0, 0, 0, 0]
    h = [0, 0, 0, 0]
    paramChanged(name, value) {
        switch (name) {
            case "pas": this.pasMs = value; break
            case "detune": this.detune = value; break
            case "growl": this.growl = value; break
            case "rank": this.rank = value; break
            case "cutoff": this.cutoff = value; break
            case "depth": this.depth = value; break
            case "reso": this.reso = value; break
            case "vowel": this.vowel = value; break
            case "shape": this.shape = value; break
            case "drive": this.drive = value; break
            case "tone": this.tone = value; break
            case "lowcut": this.lowcut = value; break
            case "width": this.width = value; break
            case "glide": this.glideMs = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        const legato = this.held.length > 0
        this.held.push({id, freq})
        this.target = freq
        if (!legato) {
            // Une note detachee repart d'un etat connu
            this.freq = freq
            this.pc = 0
            this.pu = 0.33
            this.pd = 0.71
            this.pg = 0
        }
        // La vitesse de l'horloge, en doubles-croches : ecrite dans la velocite
        const PERIODES = [0, 8, 4, 8 / 3, 2, 4 / 3, 1, 2 / 3]
        const k = Math.max(0, Math.min(7, Math.round((velocity - 0.3) / 0.1)))
        this.period = PERIODES[k]
        this.age = 0
        this.gate = true
    }
    noteOff(id) {
        this.held = this.held.filter(n => n.id !== id)
        if (this.held.length === 0) {
            this.gate = false
        } else {
            this.target = this.held[this.held.length - 1].freq
        }
    }
    reset() {
        this.held = []
        this.gate = false
        this.amp = 0
        for (let i = 0; i < 12; i++) {this.f[i] = 0}
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))
        const kUp = 1 - Math.exp(-1 / (0.003 * sr))
        const kDown = 1 - Math.exp(-1 / (0.020 * sr))
        const kTone = 1 - Math.exp(-twoPi * this.tone / sr)
        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)
        const pas = this.pasMs * 0.001 * sr
        const ratio = Math.pow(2, this.detune / 1200)
        const rank = Math.round(this.rank)
        const push = 1 + 8 * this.drive
        const norm = this.volume / Math.sqrt(push)
        const side = 0.5 + 0.5 * this.width
        const damp = 1.5 - 1.3 * this.reso
        const vowel = this.vowel
        const growl = this.growl
        const mix = 1 - 0.5 * growl
        const f = this.f
        const t = this.t
        const h = this.h
        for (let s = block.s0; s < block.s1; s++) {
            this.amp += ((this.gate ? 1 : 0) - this.amp) * (this.gate ? kUp : kDown)
            if (this.amp < 0.0002 && !this.gate) {continue}
            this.freq += (this.target - this.freq) * kGlide
            const dt = this.freq / sr
            // L'horloge du filtre, recalculee toutes les 8 notes d'horloge
            if ((this.tick++ & 7) === 0) {
                let lfo
                if (this.period === 0) {
                    lfo = Math.exp(-this.age / (3 * pas))
                } else {
                    const ph = (this.age / (this.period * pas)) % 1
                    const rond = 0.5 - 0.5 * Math.cos(twoPi * ph)
                    lfo = rond * (1 - this.shape) + Math.pow(1 - ph, 1.5) * this.shape
                }
                this.lfo = lfo
                const fc = Math.min(this.cutoff * Math.pow(2, this.depth * lfo), 6000)
                this.g = 2 * Math.sin(Math.PI * fc / sr)
                // Les deux pics de la bouche : ils montent avec l'horloge, pas a la meme vitesse
                this.g1 = 2 * Math.sin(Math.PI * Math.min(280 * Math.pow(2, 1.6 * lfo), 6000) / sr)
                this.g2 = 2 * Math.sin(Math.PI * Math.min(900 * Math.pow(2, 1.3 * lfo), 6000) / sr)
            }
            this.age++
            // Les trois dents de scie, la marche arrondie (pas de repliement)
            let dq = dt
            let p = this.pc + dq
            if (p >= 1) {p -= 1}
            this.pc = p
            let c = 2 * p - 1
            if (p < dq) {const u = p / dq; c -= u + u - u * u - 1}
            else if (p > 1 - dq) {const u = (p - 1) / dq; c -= u * u + u + u + 1}
            dq = dt * ratio
            p = this.pu + dq
            if (p >= 1) {p -= 1}
            this.pu = p
            let up = 2 * p - 1
            if (p < dq) {const u = p / dq; up -= u + u - u * u - 1}
            else if (p > 1 - dq) {const u = (p - 1) / dq; up -= u * u + u + u + 1}
            dq = dt / ratio
            p = this.pd + dq
            if (p >= 1) {p -= 1}
            this.pd = p
            let down = 2 * p - 1
            if (p < dq) {const u = p / dq; down -= u + u - u * u - 1}
            else if (p > 1 - dq) {const u = (p - 1) / dq; down -= u * u + u + u + 1}
            // Le grognement : une sinusoide et un harmonique eleve, dont le niveau suit l'horloge
            this.pg += dt
            if (this.pg >= 1) {this.pg -= 1}
            const gr = Math.tanh((Math.sin(twoPi * this.pg) + 0.7 * this.lfo * Math.sin(twoPi * rank * this.pg)) * 2.5) * growl
            const a = this.amp * norm
            for (let ch = 0; ch < 2; ch++) {
                const x = ch === 0
                    ? (c * 0.6 + up * side + down * (1 - side)) * 0.5 * mix + gr
                    : (c * 0.6 + down * side + up * (1 - side)) * 0.5 * mix + gr
                const o = ch * 6
                // Le passe-bas
                f[o] += this.g * f[o + 1]
                f[o + 1] += this.g * (x - f[o] - damp * f[o + 1])
                // Les deux pics
                f[o + 2] += this.g1 * f[o + 3]
                f[o + 3] += this.g1 * (x - f[o + 2] - 0.22 * f[o + 3])
                f[o + 4] += this.g2 * f[o + 5]
                f[o + 5] += this.g2 * (x - f[o + 4] - 0.22 * f[o + 5])
                const v = f[o] * (1 - vowel) + (f[o + 3] * 0.5 + f[o + 5] * 0.4) * vowel
                let y = Math.tanh(v * push)
                // Passe-bas a deux etages, puis coupe-bas a deux etages
                const k = ch * 2
                t[k] += (y - t[k]) * kTone
                t[k + 1] += (t[k] - t[k + 1]) * kTone
                y = t[k + 1]
                h[k] += (y - h[k]) * kHp
                y -= h[k]
                h[k + 1] += (y - h[k + 1]) * kHp
                y -= h[k + 1]
                if (ch === 0) {outL[s] += y * a} else {outR[s] += y * a}
            }
        }
    }
}
