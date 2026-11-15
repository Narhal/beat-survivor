// @label Poussiere 2
// @param tune    50    35    90    exp     Hz
// @param punch   0.6   0     1     linear
// @param kdecay  240   60    800   exp     ms
// @param stone   190   120   320   exp     Hz
// @param snap    0.6   0     1     linear
// @param sdecay  150   40    500   exp     ms
// @param nlen    40    5     300   exp     ms
// @param ntone   3200  800   10000 exp     Hz
// @param slevel  0.6   0     1.5   linear
// @param htone   5200  2500  11000 exp     Hz
// @param hdecay  38    10    200   exp     ms
// @param odecay  260   80    900   exp     ms
// @param rate    13000 3000  48000 exp     Hz
// @param bits    10    4     16    linear
// @param drive   0.5   0     1     linear
// @param tone    6000  1500  16000 exp     Hz
// @param volume  0.6   0     1     linear

// Une batterie qui sonne comme une boucle prise sur un vieux disque puis
// rejouee par un echantillonneur des annees 80. En mono, comme une boucle.
// Les notes : 36 = grosse caisse, 37 = coup sur le cercle, 38 = caisse
// claire, 42 = charley ferme, 46 = charley ouvert (le ferme le fait taire).
// La velocite regle la force du coup.
// Deuxieme version : la caisse claire est refaite. Dans la premiere, son
// bruit durait aussi longtemps que sa peau et montait haut : on entendait
// un souffle. Ici le bruit a sa propre duree ("nlen", tres courte : un
// claquement, pas une trainee), il est assourdi ("ntone" : rien au-dessus),
// et la caisse claire a son volume ("slevel"). "snap" reste la part de
// bruit, "sdecay" la duree de la peau.
// Les charleys aussi : leur filtre laissait passer le medium et ils
// saturaient. Ici il ne reste que le haut du bruit, un tic.
// Les sons sont fabriques ici, puis passent tous ensemble par :
// - une saturation ("drive") ;
// - un echantillonneur : il ne retient qu'une valeur de temps en temps
//   ("rate" = combien par seconde) et il arrondit ("bits") : le grain ;
// - un passe-bas ("tone").
class Processor {
    tune = 50
    punch = 0.6
    kdecayMs = 240
    stone = 190
    snap = 0.6
    sdecayMs = 150
    nlenMs = 40
    ntone = 3200
    slevel = 0.6
    htone = 5200
    hdecayMs = 38
    odecayMs = 260
    rate = 13000
    bits = 10
    drive = 0.5
    tone = 6000
    volume = 0.6
    seed = 1969
    kt = -1
    kv = 0
    kp = 0
    st = -1
    sv = 0
    sp1 = 0
    sp2 = 0
    rt = -1
    rv = 0
    rp1 = 0
    rp2 = 0
    henv = 0
    hk = 0.999
    hv = 0
    f = [0, 0, 0, 0, 0, 0, 0, 0]
    acc = 1
    aa0 = 0
    aa1 = 0
    held = 0
    lp = [0, 0, 0]
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "punch": this.punch = value; break
            case "kdecay": this.kdecayMs = value; break
            case "stone": this.stone = value; break
            case "snap": this.snap = value; break
            case "sdecay": this.sdecayMs = value; break
            case "nlen": this.nlenMs = value; break
            case "ntone": this.ntone = value; break
            case "slevel": this.slevel = value; break
            case "htone": this.htone = value; break
            case "hdecay": this.hdecayMs = value; break
            case "odecay": this.odecayMs = value; break
            case "rate": this.rate = value; break
            case "bits": this.bits = value; break
            case "drive": this.drive = value; break
            case "tone": this.tone = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        const v = Math.pow(velocity, 1.5)
        if (pitch === 36) {this.kt = 0; this.kv = v; this.kp = 0}
        else if (pitch === 37) {this.rt = 0; this.rv = v; this.rp1 = 0; this.rp2 = 0}
        else if (pitch === 38) {this.st = 0; this.sv = v; this.sp1 = 0; this.sp2 = 0}
        else if (pitch === 42 || pitch === 46) {
            this.henv = 1
            this.hv = v
            this.hk = Math.exp(-1 / ((pitch === 46 ? this.odecayMs : this.hdecayMs) * 0.001 * sampleRate))
        }
    }
    noteOff(id) {}
    reset() {
        this.kt = -1
        this.st = -1
        this.rt = -1
        this.henv = 0
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const kdec = this.kdecayMs * 0.001 * sr
        const sdec = this.sdecayMs * 0.001 * sr
        const gS = 2 * Math.sin(Math.PI * 1700 / sr)
        const kH = 1 - Math.exp(-twoPi * Math.min(this.htone, 0.3 * sr) / sr)
        const ndec = this.nlenMs * 0.001 * sr
        const kNt = 1 - Math.exp(-twoPi * this.ntone / sr)
        const push = 1 + 5 * this.drive
        const norm = 1 / Math.tanh(push * 0.6)
        const step = Math.min(1, this.rate / sr)
        const levels = Math.pow(2, Math.round(this.bits) - 1)
        const kTone = 1 - Math.exp(-twoPi * this.tone / sr)
        const kHp = 1 - Math.exp(-twoPi * 28 / sr)
        const kAa = 1 - Math.exp(-twoPi * Math.min(0.45 * sr, 0.5 * this.rate) / sr)
        const f = this.f
        const lp = this.lp
        for (let s = block.s0; s < block.s1; s++) {
            const busy = this.kt >= 0 || this.st >= 0 || this.rt >= 0 || this.henv > 0.0002
            if (!busy && Math.abs(lp[1]) < 0.00001) {continue}
            this.seed = (this.seed * 1664525 + 1013904223) >>> 0
            const white = this.seed / 2147483648 - 1
            let x = 0
            // Grosse caisse : une sinusoide qui tombe, un claquement au depart
            if (this.kt >= 0) {
                const t = this.kt / sr
                const fq = this.tune * (1 + this.punch * (5 * Math.exp(-t / 0.011) + 1.1 * Math.exp(-t / 0.055)))
                this.kp += fq / sr
                if (this.kp >= 1) {this.kp -= 1}
                const env = Math.exp(-this.kt / kdec) * Math.min(1, this.kt / (0.0008 * sr))
                x += (Math.sin(twoPi * this.kp) * env + white * 0.25 * Math.exp(-t / 0.0025)) * this.kv
                this.kt++
                if (this.kt > kdec * 8) {this.kt = -1}
            }
            // Caisse claire : deux notes de peau qui tombent, et du bruit
            if (this.st >= 0) {
                const t = this.st / sr
                const bend = 1 + 0.45 * Math.exp(-t / 0.012)
                this.sp1 += this.stone * bend / sr
                if (this.sp1 >= 1) {this.sp1 -= 1}
                this.sp2 += this.stone * 1.78 * bend / sr
                if (this.sp2 >= 1) {this.sp2 -= 1}
                const body = (Math.sin(twoPi * this.sp1) + 0.6 * Math.sin(twoPi * this.sp2)) * Math.exp(-this.st / (sdec * 0.55))
                f[0] += gS * f[1]
                f[1] += gS * (white - f[0] - 0.9 * f[1])
                // Le bruit : une bande dans le medium, assourdie, et tres courte
                f[2] += (f[1] - f[2]) * kNt
                f[7] += (f[2] - f[7]) * kNt
                const fizz = f[7] * Math.exp(-this.st / ndec)
                x += (body * (1 - this.snap) * 0.8 + fizz * this.snap * 1.5) * this.sv * this.slevel * Math.min(1, this.st / (0.0005 * sr))
                this.st++
                if (this.st > sdec * 8) {this.st = -1}
            }
            // Coup sur le cercle : deux notes tres courtes
            if (this.rt >= 0) {
                const t = this.rt / sr
                this.rp1 += 1740 / sr
                if (this.rp1 >= 1) {this.rp1 -= 1}
                this.rp2 += 510 / sr
                if (this.rp2 >= 1) {this.rp2 -= 1}
                x += (Math.sin(twoPi * this.rp1) * Math.exp(-t / 0.006) + 0.7 * Math.sin(twoPi * this.rp2) * Math.exp(-t / 0.016) + white * 0.3 * Math.exp(-t / 0.002)) * this.rv * 0.7
                this.rt++
                if (t > 0.15) {this.rt = -1}
            }
            // Charleys : du bruit dont on ne garde que le haut
            if (this.henv > 0.0002) {
                // Trois coupe-bas a la suite : il ne reste que le haut du bruit
                f[3] += (white - f[3]) * kH
                let high = white - f[3]
                f[4] += (high - f[4]) * kH
                high -= f[4]
                f[5] += (high - f[5]) * kH
                high -= f[5]
                x += high * this.henv * this.hv * 9
                this.henv *= this.hk
            }
            // Saturation, puis echantillonneur
            x = Math.tanh(x * push * 0.6) * norm
            // Un filtre leger avant de prendre les valeurs : sans lui le haut du
            // bruit se replie dans le medium et le charley devient un souffle
            this.aa0 += (x - this.aa0) * kAa
            this.aa1 += (this.aa0 - this.aa1) * kAa
            x = this.aa1
            this.acc += step
            if (this.acc >= 1) {
                this.acc -= 1
                this.held = Math.round(x * levels) / levels
            }
            lp[0] += (this.held - lp[0]) * kTone
            lp[1] += (lp[0] - lp[1]) * kTone
            lp[2] += (lp[1] - lp[2]) * kHp
            const y = (lp[1] - lp[2]) * this.volume
            outL[s] += y
            outR[s] += y
        }
    }
}
