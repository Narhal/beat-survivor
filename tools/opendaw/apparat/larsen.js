// @label Larsen
// @param tune    0     -100  100   linear  ct
// @param rise    1.6   1.05  4     exp
// @param fall    25    3     400   exp     ms
// @param focus   5     1     20    exp
// @param dark    0.5   0     1     linear
// @param grit    0.5   0     1     linear
// @param drift   4     0     30    linear  ct
// @param sweep   1     0     3     linear
// @param slew    70    5     600   exp     ms
// @param lowcut  120   40    400   exp     Hz
// @param volume  0.5   0     1     linear

// Un larsen qu'on dompte. Pas d'oscillateur : une boucle de retour (un retard
// tres court, un filtre, une saturation) qu'on laisse s'emballer tant que la
// note est tenue. Elle part de presque rien, enfle toute seule jusqu'a
// saturer, et meurt des qu'on la lache. Une note ne frappe pas : elle monte.
// - La hauteur de la note donne la longueur du retard : c'est le grave sur
//   lequel la boucle peut chanter. Elle chante un de ses harmoniques.
// - La VELOCITE ne regle pas le volume : elle choisit lequel. 0,30 = le 2e
//   harmonique ; 0,35 = le 3e ; ... 0,95 = le 15e. Ces notes-la ne sont pas
//   celles du clavier : le 7e et le 11e tombent entre deux touches.
// - Deux notes qui se chevauchent : la boucle ne repart pas, elle saute d'un
//   harmonique a l'autre, comme un vrai larsen.
// - "rise" : la force du retour. Plus il est fort, plus la note enfle vite ;
// - "fall" : le temps qu'elle met a mourir une fois lachee ;
// - "focus" : la finesse du filtre. Etroit, un seul harmonique gagne ; large,
//   plusieurs se battent ;
// - "dark" : ce que chaque tour de boucle perd en aigus ;
// - "grit" : la durete de la saturation ;
// - "drift" : la hauteur derive lentement, a peine ;
// - "sweep", "slew" : le filtre ne vise pas tout de suite le bon harmonique.
//   Il part plus bas ("sweep", en octaves) et monte ("slew", en ms) : la
//   boucle saute d un harmonique au suivant, en escalier, avant de se poser.
//   Entre deux notes liees, il glisse de la meme facon.
// Une seule voix, en mono.
class Processor {
    tune = 0
    rise = 1.6
    fallMs = 25
    focus = 5
    dark = 0.5
    grit = 0.5
    drift = 4
    sweep = 1
    slewMs = 70
    lowcut = 120
    volume = 0.5
    buf = new Float32Array(4096)
    w = 0
    len = 400
    fc = 440
    fcNow = 440
    held = []
    gate = false
    n = 0
    grain = 0
    level = 0
    lp = 0
    bp = 0
    dk = 0
    hp = [0, 0]
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "rise": this.rise = value; break
            case "fall": this.fallMs = value; break
            case "focus": this.focus = value; break
            case "dark": this.dark = value; break
            case "grit": this.grit = value; break
            case "drift": this.drift = value; break
            case "sweep": this.sweep = value; break
            case "slew": this.slewMs = value; break
            case "lowcut": this.lowcut = value; break
            case "volume": this.volume = value; break
        }
    }
    viser(note) {
        const f = 440 * Math.pow(2, (note.pitch - 69 + this.tune / 100) / 12)
        this.len = Math.max(8, Math.min(4000, sampleRate / f))
        this.fc = f * note.h
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        const h = 2 + Math.max(0, Math.min(13, Math.round((velocity - 0.3) / 0.05)))
        const note = {id, pitch, h}
        this.held.push(note)
        this.viser(note)
        // Si la boucle est muette, il lui faut un grain pour partir : toujours le meme
        if (this.level < 0.0005) {
            this.buf.fill(0)
            this.lp = 0; this.bp = 0; this.dk = 0
            this.grain = 0.02
            this.fcNow = this.fc * Math.pow(2, -this.sweep)
        }
        this.gate = true
    }
    noteOff(id) {
        this.held = this.held.filter(n => n.id !== id)
        if (this.held.length === 0) {
            this.gate = false
        } else {
            this.viser(this.held[this.held.length - 1])
        }
    }
    reset() {
        this.held = []
        this.gate = false
        this.level = 0
        this.buf.fill(0)
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const k = 1 + 3 * this.grit
        const damp = 1 / this.focus
        const kd = 1 - 0.8 * this.dark
        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)
        const fallGain = Math.pow(10, -3 * this.len / (this.fallMs * 0.001 * sr))
        const kSlew = 1 - Math.exp(-1 / (this.slewMs * 0.001 * 0.35 * sr))
        const buf = this.buf, hp = this.hp
        for (let s = block.s0; s < block.s1; s++) {
            this.n++
            if (!this.gate && this.level < 0.00002) {this.level = 0; continue}
            // La longueur du retard derive un peu ; le filtre de la boucle ajoute son propre retard, qu'on retire
            const wob = 1 + 0.00058 * this.drift * Math.sin(twoPi * 0.31 * this.n / sr)
            const len = this.len * wob - (1 - kd) / kd
            let pos = this.w - len
            if (pos < 0) {pos += 4096}
            const i0 = Math.floor(pos), fr = pos - i0
            const x = buf[i0] * (1 - fr) + buf[(i0 + 1) & 4095] * fr
            // Le filtre : il laisse passer l'harmonique vise, et freine les autres
            this.fcNow += (this.fc - this.fcNow) * kSlew
            const g = 2 * Math.sin(Math.PI * Math.min(this.fcNow * wob, sr * 0.15) / sr)
            this.lp += g * this.bp
            this.bp += g * (x - this.lp - damp * this.bp)
            let y = this.bp * damp
            this.dk += (y - this.dk) * kd
            y = this.dk
            // Le retour : plus fort que 1 tant que la note est tenue, il s'emballe ; la saturation le borne
            y = Math.tanh(y * (this.gate ? this.rise : fallGain) * k) / k
            buf[this.w] = y + this.grain
            this.grain = 0
            this.w = (this.w + 1) & 4095
            const a = Math.abs(y) * k
            this.level += (a - this.level) * (a > this.level ? 0.01 : 0.0005)
            let o = y * k
            hp[0] += (o - hp[0]) * kHp
            o -= hp[0]
            hp[1] += (o - hp[1]) * kHp
            o -= hp[1]
            o *= this.volume
            outL[s] += o
            outR[s] += o
        }
    }
}
