// @label Glotte
// @param tune    0     -100  100   linear  ct
// @param size    1     0.6   1.5   linear
// @param open    0.5   0     1     linear
// @param glide   1     0.3   4     linear
// @param tight   90    30    400   exp     Hz
// @param tone    0.5   0     1     linear
// @param drop    2     0     12    linear  st
// @param attack  4     1     40    exp     ms
// @param release 30    5     300   exp     ms
// @param drive   0.2   0     1     linear
// @param lowcut  110   40    400   exp     Hz
// @param volume  0.5   0     1     linear

// Une bouche. Elle ne dit pas de mots : elle fabrique des syllabes ("wa",
// "yo", "di", "ao"...), sans echantillon et sans bruit.
// Comment : a chaque battement de la voix (la note jouee donne leur nombre par
// seconde), trois petites ondes repartent de zero et s'eteignent aussitot.
// Leurs hauteurs sont celles des trois resonances d'une bouche (les
// "formants") : ce sont elles qui font qu'on entend un "a" ou un "i". Une
// syllabe, c'est le passage d'une forme de bouche a une autre.
// - La VELOCITE de la note ne regle pas le volume : elle choisit la syllabe.
//   0,30 = "wa" ; 0,35 = "yo" ; 0,40 = "ba" ; 0,45 = "di" ; 0,50 = "ou" ;
//   0,55 = "ai" ; 0,60 = "oi" ; 0,65 = "eu" ; 0,70 = "ao" ; 0,75 = "we" ;
//   0,80 = "ya" ; 0,85 = "bo" ; 0,90 = "de" ; 0,95 = "mou".
// - La bouche est une seule : une syllabe part de la ou la precedente s'est
//   arretee, comme quand on parle.
// - "size" : la taille de la bouche. Plus petit que 1 = une grande bouche,
//   une voix plus sombre ; plus grand = une petite bouche ;
// - "open" : l'ouverture de la machoire (0 = presque fermee, 1 = grande ouverte) ;
// - "glide" : multiplie le temps que met la bouche a changer de forme ;
// - "tight" : la largeur des resonances. Etroit = une voix de machine, qui
//   sonne ; large = une voix sourde ;
// - "tone" : la force des deux resonances du haut (la clarte) ;
// - "drop" : la voix descend pendant la syllabe, en demi-tons ;
// - "drive" : une saturation ajoutee a cote du son propre ;
// - "lowcut" : coupe le bas, pour laisser le grave au pied et a la basse.
// Une seule voix, en mono, au centre.
class Processor {
    tune = 0
    size = 1
    open = 0.5
    glide = 1
    tight = 90
    tone = 0.5
    drop = 2
    attackMs = 4
    releaseMs = 30
    drive = 0.2
    lowcut = 110
    volume = 0.5
    // Les formes de bouche : les trois resonances, en Hz
    // 0 a, 1 e, 2 i, 3 o, 4 ou, 5 eu, 6 e ouvert, 7 levres fermees, 8 langue au palais
    VOY = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240],
        [500, 1500, 2500], [660, 1720, 2410], [180, 800, 2200], [200, 1700, 2600]]
    // Les syllabes : forme de depart, forme d'arrivee, duree du passage en ms
    SYL = [[4, 0, 45], [2, 3, 45], [7, 0, 22], [8, 2, 25], [4, 4, 1], [0, 2, 130], [3, 2, 130], [5, 5, 1],
        [0, 4, 120], [4, 1, 45], [2, 0, 45], [7, 3, 22], [8, 6, 25], [7, 4, 30]]
    id = -1
    gate = false
    env = 0
    freq = 110
    t = 0
    ph = 0
    tau = 0
    // La forme de bouche en cours, celle d'ou part la syllabe, celle ou elle va
    cur = [500, 1500, 2500]
    from = [500, 1500, 2500]
    to = [500, 1500, 2500]
    move = 1
    fp = [0, 0, 0]
    fe = [0, 0, 0]
    w = [0, 0, 0]
    tilt = [1, 1, 1]
    hp = [0, 0]
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "size": this.size = value; break
            case "open": this.open = value; break
            case "glide": this.glide = value; break
            case "tight": this.tight = value; break
            case "tone": this.tone = value; break
            case "drop": this.drop = value; break
            case "attack": this.attackMs = value; break
            case "release": this.releaseMs = value; break
            case "drive": this.drive = value; break
            case "lowcut": this.lowcut = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        const k = Math.max(0, Math.min(13, Math.round((velocity - 0.3) / 0.05)))
        const syl = this.SYL[k]
        const a = this.VOY[syl[0]], b = this.VOY[syl[1]]
        // La bouche part de la ou elle est : si elle se tait, elle prend la forme de depart
        const parle = this.env > 0.05
        for (let i = 0; i < 3; i++) {
            this.from[i] = parle ? this.cur[i] * 0.4 + a[i] * 0.6 : a[i]
            this.to[i] = b[i]
        }
        this.move = Math.max(1, syl[2] * this.glide) * 0.001 * sampleRate
        this.freq = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)
        this.id = id
        this.t = 0
        this.gate = true
        if (!parle) {this.ph = 1}
    }
    noteOff(id) {
        if (id === this.id) {this.gate = false}
    }
    reset() {
        this.gate = false
        this.env = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kUp = 1 - Math.exp(-1 / (this.attackMs * 0.001 * 0.4 * sr))
        const kDown = Math.exp(-1 / (this.releaseMs * 0.001 * 0.3 * sr))
        const kBw = Math.exp(-Math.PI * this.tight / sr)
        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)
        const dropTau = 0.15 * sr
        const amp = [1, 0.6 * this.tone + 0.1, 0.3 * this.tone]
        const jaw = 0.65 + 0.7 * this.open
        const rise = 0.0005 * sr
        const dry = 1 - 0.6 * this.drive
        const fp = this.fp, fe = this.fe, w = this.w, hp = this.hp
        for (let s = block.s0; s < block.s1; s++) {
            if (this.gate) {
                this.env += (1 - this.env) * kUp
            } else {
                this.env *= kDown
                if (this.env < 0.0002) {this.env = 0; continue}
            }
            // La forme de la bouche : recalculee toutes les 16 notes d'horloge
            if ((this.t & 15) === 0) {
                const u = Math.min(1, this.t / this.move)
                const g = u * u * (3 - 2 * u)
                for (let i = 0; i < 3; i++) {
                    this.cur[i] = this.from[i] + (this.to[i] - this.from[i]) * g
                    const f = this.cur[i] * this.size * (i === 0 ? jaw : 1)
                    w[i] = twoPi * Math.min(f, sr * 0.4) / sr
                    // Plus une resonance est haute, moins elle est forte : sans cela les "i"
                    // percent entre 2 et 6 kHz, la ou l'oreille fatigue
                    this.tilt[i] = i === 0 ? 1 : Math.min(1, Math.pow(1200 / f, 1.1))
                }
            }
            // Le battement de la voix : a chaque tour, les trois ondes repartent de zero
            const f0 = this.freq * Math.pow(2, -this.drop / 12 * (1 - Math.exp(-this.t / dropTau)))
            this.ph += f0 / sr
            if (this.ph >= 1) {
                this.ph -= 1
                this.tau = 0
                for (let i = 0; i < 3; i++) {fp[i] = 0; fe[i] = 1}
            }
            let x = 0
            for (let i = 0; i < 3; i++) {
                x += Math.sin(fp[i]) * fe[i] * amp[i] * this.tilt[i]
                fp[i] += w[i]
                fe[i] *= kBw
            }
            // Chaque onde nait en un demi-millieme de seconde : pas de clic
            if (this.tau < rise) {x *= this.tau / rise}
            this.tau++
            this.t++
            x *= 0.5
            let y = x * dry + Math.tanh(x * 4) * 0.35 * this.drive
            // Coupe-bas a deux etages
            hp[0] += (y - hp[0]) * kHp
            y -= hp[0]
            hp[1] += (y - hp[1]) * kHp
            y -= hp[1]
            y *= this.env * this.volume
            outL[s] += y
            outR[s] += y
        }
    }
}
