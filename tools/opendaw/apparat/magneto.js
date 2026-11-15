// @label Magneto
// @param tune     -35   -400  100   linear  ct
// @param shape    0.3   0     1     linear
// @param pwm      0.4   0     1     linear
// @param detune   10    0     40    linear  ct
// @param sub      0     0     1     linear
// @param cutoff   700   40    12000 exp     Hz
// @param envmod   1.5   0     6     linear
// @param track    0.4   0     1     linear
// @param reso     0.2   0     0.9   linear
// @param attack   30    1     5000  exp     ms
// @param decay    900   10    8000  exp     ms
// @param sustain  0.7   0     1     linear
// @param release  700   10    8000  exp     ms
// @param vibrato  0     0     50    linear  ct
// @param wow      14    0     60    linear  ct
// @param flutter  3     0     20    linear  ct
// @param phase    0     0     1     linear
// @param drift    6     0     30    linear  ct
// @param glide    1     1     800   exp     ms
// @param drive    0.3   0     1     linear
// @param age      0.4   0     1     linear
// @param dropout  0     0     1     linear
// @param width    0.7   0     1     linear
// @param volume   0.5   0     1     linear

// Un synthe a huit voix enregistre sur une vieille bande. Il sert a tout ce
// qui chante dans le morceau : nappes, basse, melodie, arpege.
// La voix : deux oscillateurs desaccordes ("detune"), chacun entre la dent de
// scie et le carre ("shape"), dont la largeur respire ("pwm") ; une
// sinusoide une octave en dessous ("sub") ; un filtre passe-bas que la meme
// enveloppe ouvre ("envmod", en octaves) ; une seule enveloppe pour le volume
// et le filtre, comme sur les petits synthes des annees 80.
// La bande :
// - "tune" : tout est accorde a cote du diapason, en cents ;
// - "wow" : la hauteur derive lentement (la bande ne tourne pas rond) ;
// - "flutter" : et tremble vite, tres peu ;
// - "phase" : ou commence cette derive. Deux instruments avec deux phases
//   differentes flottent chacun de leur cote, comme deux prises ;
// - "drift" : chaque note est un peu fausse, jamais de la meme facon ;
// - "drive" : la bande sature ; "age" : elle a perdu ses aigus ;
// - "dropout" : par moments le son tombe une fraction de seconde.
// Tout ce hasard est rejoue de la meme facon a chaque lecture.
// "vibrato" arrive en retard sur la note. "glide" : une note jouee pendant
// qu'une autre est tenue part de la hauteur de la precedente.
class Processor {
    tune = -35
    shape = 0.3
    pwm = 0.4
    detune = 10
    sub = 0
    cutoff = 700
    envmod = 1.5
    track = 0.4
    reso = 0.2
    attackMs = 30
    decayMs = 900
    sustain = 0.7
    releaseMs = 700
    vibrato = 0
    wow = 14
    flutter = 3
    phase = 0
    drift = 6
    glideMs = 1
    drive = 0.3
    age = 0.4
    dropout = 0
    width = 0.7
    volume = 0.5
    voices = [0, 1, 2, 3, 4, 5, 6, 7].map(k => ({
        stage: 0, id: -1, env: 0, vel: 0, freq: 220, target: 220, pitch: 60, t: 0, order: 0,
        pa: 0, pb: 0.37, ps: 0, tilt: 0, pwp: k * 0.13,
        l1: 0, l2: 0, l3: 0, r1: 0, r2: 0, r3: 0
    }))
    n = 0
    count = 0
    seed = 40404
    lastFreq = 220
    dropGain = 1
    dropTarget = 1
    dropNext = 0
    dropUntil = 0
    tape = [0, 0, 0, 0, 0, 0]
    bufL = new Float32Array(64)
    bufR = new Float32Array(64)
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "shape": this.shape = value; break
            case "pwm": this.pwm = value; break
            case "detune": this.detune = value; break
            case "sub": this.sub = value; break
            case "cutoff": this.cutoff = value; break
            case "envmod": this.envmod = value; break
            case "track": this.track = value; break
            case "reso": this.reso = value; break
            case "attack": this.attackMs = value; break
            case "decay": this.decayMs = value; break
            case "sustain": this.sustain = value; break
            case "release": this.releaseMs = value; break
            case "vibrato": this.vibrato = value; break
            case "wow": this.wow = value; break
            case "flutter": this.flutter = value; break
            case "phase": this.phase = value; break
            case "drift": this.drift = value; break
            case "glide": this.glideMs = value; break
            case "drive": this.drive = value; break
            case "age": this.age = value; break
            case "dropout": this.dropout = value; break
            case "width": this.width = value; break
            case "volume": this.volume = value; break
        }
    }
    rnd() {
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0
        return this.seed / 4294967296
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)
        let held = false
        let pick = null
        for (const v of this.voices) {
            if (v.stage === 1 || v.stage === 2) {held = true}
            if (v.stage === 0 && pick === null) {pick = v}
        }
        if (pick === null) {
            // Plus de voix libre : on reprend une voix qui finit, sinon la plus ancienne
            for (const v of this.voices) {
                if (pick === null) {pick = v; continue}
                const a = v.stage === 3 ? 0 : 1, b = pick.stage === 3 ? 0 : 1
                if (a < b || (a === b && v.order < pick.order)) {pick = v}
            }
        }
        const v = pick
        if (v.stage === 0) {
            v.pa = 0; v.pb = 0.37; v.ps = 0
            v.l1 = 0; v.l2 = 0; v.l3 = 0; v.r1 = 0; v.r2 = 0; v.r3 = 0
            v.env = 0
        }
        v.freq = held && this.glideMs > 2 ? this.lastFreq : freq
        v.target = freq
        v.pitch = pitch
        v.id = id
        v.vel = 0.25 + 0.75 * velocity
        v.tilt = this.rnd() * 2 - 1
        v.stage = 1
        v.t = 0
        v.order = ++this.count
        this.lastFreq = freq
    }
    noteOff(id) {
        for (const v of this.voices) {
            if (v.id === id && (v.stage === 1 || v.stage === 2)) {v.stage = 3}
        }
    }
    reset() {
        for (const v of this.voices) {v.stage = 0; v.env = 0}
        this.dropGain = 1
        this.dropTarget = 1
    }
    blep(p, dt) {
        if (p < dt) {const u = p / dt; return u + u - u * u - 1}
        if (p > 1 - dt) {const u = (p - 1) / dt; return u * u + u + u + 1}
        return 0
    }
    // La hauteur de la bande au temps t, en cents
    cents(t, off) {
        const w = 2 * Math.PI
        const ph = this.phase
        const slow = 0.62 * Math.sin(w * (0.37 * t + ph + off)) + 0.28 * Math.sin(w * (0.83 * t + 1.7 * ph + 2 * off)) + 0.1 * Math.sin(w * (1.9 * t + 0.3))
        const fast = 0.6 * Math.sin(w * (6.1 * t + 5 * ph)) + 0.4 * Math.sin(w * 9.3 * t)
        return this.tune + this.wow * slow + this.flutter * fast
    }
    process(output, block) {
        const [outL, outR] = output
        const sr = sampleRate
        const twoPi = 2 * Math.PI
        const voices = this.voices
        const kA = 1 - Math.exp(-1 / (this.attackMs * 0.001 * 0.45 * sr))
        const kD = 1 - Math.exp(-1 / (this.decayMs * 0.001 * 0.35 * sr))
        const kR = Math.exp(-1 / (this.releaseMs * 0.001 * 0.3 * sr))
        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))
        const sus = this.sustain
        const shape = this.shape
        const saw = 1 - shape
        const sub = this.sub
        const wl = 0.5 + 0.5 * this.width
        const wr = 1 - wl
        const damp = 1.6 - 1.5 * this.reso
        const fMax = 0.14 * sr
        const pre = 0.3 * (1 + 3 * this.drive)
        const kAge = 1 - Math.exp(-twoPi * 14000 * Math.pow(2500 / 14000, this.age) / sr)
        const kHp = 1 - Math.exp(-twoPi * 30 / sr)
        const kDropDown = 1 - Math.exp(-1 / (0.012 * sr))
        const kDropUp = 1 - Math.exp(-1 / (0.11 * sr))
        const tape = this.tape
        const bufL = this.bufL, bufR = this.bufR
        for (let a = block.s0; a < block.s1; a += 64) {
            const len = Math.min(64, block.s1 - a)
            const n0 = this.n
            this.n += len
            // Les chutes de niveau de la bande : une decision toutes les 4096 notes
            while (n0 >= this.dropNext) {
                const r = this.rnd(), r2 = this.rnd(), r3 = this.rnd()
                if (r < this.dropout * 0.22) {
                    this.dropTarget = 0.2 + 0.5 * r2
                    this.dropUntil = this.dropNext + Math.round((0.05 + 0.16 * r3) * sr)
                }
                this.dropNext += 4096
            }
            if (n0 >= this.dropUntil) {this.dropTarget = 1}
            let active = false
            for (const v of voices) {if (v.stage !== 0) {active = true}}
            if (!active && Math.abs(tape[0]) + Math.abs(tape[3]) < 0.00001) {continue}
            const t0 = n0 / sr, t1 = (n0 + len) / sr
            const ca0 = this.cents(t0, 0), ca1 = this.cents(t1, 0)
            const cb0 = this.cents(t0, 0.11) + this.detune, cb1 = this.cents(t1, 0.11) + this.detune
            const vib0 = Math.sin(twoPi * 5.1 * t0), vib1 = Math.sin(twoPi * 5.1 * t1)
            const pwBase = twoPi * 0.31 * t0
            for (let i = 0; i < len; i++) {bufL[i] = 0; bufR[i] = 0}
            for (const v of voices) {
                if (v.stage === 0) {continue}
                const fade = Math.min(1, Math.max(0, (v.t / sr - 0.25) / 0.6)) * this.vibrato
                const own = v.tilt * this.drift
                const ra0 = Math.pow(2, (ca0 + own + fade * vib0) / 1200), ra1 = Math.pow(2, (ca1 + own + fade * vib1) / 1200)
                const rb0 = Math.pow(2, (cb0 - own + fade * vib0) / 1200), rb1 = Math.pow(2, (cb1 - own + fade * vib1) / 1200)
                const dra = (ra1 - ra0) / len, drb = (rb1 - rb0) / len
                // Le filtre : regle une fois par tranche de 64
                const fc = Math.min(fMax, Math.max(30, this.cutoff * Math.pow(2, this.envmod * v.env + this.track * (v.pitch - 60) / 12 + 0.6 * (v.vel - 0.75))))
                const g = 2 * Math.sin(Math.PI * fc / sr)
                const g1 = 1 - Math.exp(-twoPi * fc * 1.4 / sr)
                const pw = 0.5 + 0.4 * this.pwm * Math.sin(pwBase + twoPi * v.pwp)
                const amp = v.vel
                for (let i = 0; i < len; i++) {
                    if (v.stage === 1) {
                        v.env += (1.15 - v.env) * kA
                        if (v.env >= 1) {v.env = 1; v.stage = 2}
                    } else if (v.stage === 2) {
                        v.env += (sus - v.env) * kD
                    } else {
                        v.env *= kR
                        if (v.env < 0.0002) {v.env = 0; v.stage = 0; break}
                    }
                    v.freq += (v.target - v.freq) * kGlide
                    const base = v.freq / sr
                    const da = base * (ra0 + dra * i), db = base * (rb0 + drb * i)
                    let p = v.pa + da
                    if (p >= 1) {p -= 1}
                    v.pa = p
                    let oa = 2 * p - 1 - this.blep(p, da)
                    if (shape > 0) {
                        let q = p + pw
                        if (q >= 1) {q -= 1}
                        oa = oa * saw + (oa - (2 * q - 1 - this.blep(q, da))) * shape
                    }
                    p = v.pb + db
                    if (p >= 1) {p -= 1}
                    v.pb = p
                    let ob = 2 * p - 1 - this.blep(p, db)
                    if (shape > 0) {
                        let q = p + 1 - pw
                        if (q >= 1) {q -= 1}
                        ob = ob * saw + (ob - (2 * q - 1 - this.blep(q, db))) * shape
                    }
                    let s = 0
                    if (sub > 0) {
                        v.ps += da * 0.5
                        if (v.ps >= 1) {v.ps -= 1}
                        s = Math.sin(twoPi * v.ps) * sub
                    }
                    const e = v.env * amp
                    let x = oa * wl + ob * wr
                    v.l1 += g * v.l2
                    v.l2 += g * (x - v.l1 - damp * v.l2)
                    v.l3 += (v.l1 - v.l3) * g1
                    bufL[i] += (v.l3 + s) * e
                    x = ob * wl + oa * wr
                    v.r1 += g * v.r2
                    v.r2 += g * (x - v.r1 - damp * v.r2)
                    v.r3 += (v.r1 - v.r3) * g1
                    bufR[i] += (v.r3 + s) * e
                }
                v.t += len
            }
            // La bande : saturation, perte des aigus, chutes de niveau
            const vol = this.volume
            for (let i = 0; i < len; i++) {
                this.dropGain += (this.dropTarget - this.dropGain) * (this.dropTarget < this.dropGain ? kDropDown : kDropUp)
                const k = vol * this.dropGain
                let y = Math.tanh(bufL[i] * pre) / pre
                tape[0] += (y - tape[0]) * kAge
                tape[1] += (tape[0] - tape[1]) * kAge
                tape[2] += (tape[1] - tape[2]) * kHp
                outL[a + i] += (tape[1] - tape[2]) * k
                y = Math.tanh(bufR[i] * pre) / pre
                tape[3] += (y - tape[3]) * kAge
                tape[4] += (tape[3] - tape[4]) * kAge
                tape[5] += (tape[4] - tape[5]) * kHp
                outR[a + i] += (tape[4] - tape[5]) * k
            }
        }
    }
}
