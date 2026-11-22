// @label Tole
// @param tune    0     -100  100   linear  ct
// @param decay   500   20    8000  exp     ms
// @param damp    0.45  0     1     linear
// @param metal   0.5   0     1     linear
// @param strike  0.5   0     1     linear
// @param drive   0.3   0     1     linear
// @param gate    1     0     1     linear
// @param volume  0.5   0     1     linear

// Une tole qu'on frappe. Un retard tres court reboucle sur lui-meme : c'est
// un resonateur accorde (recette du "retard court = resonateur"). Ce qui le
// frappe ne donne que le grain ; la note vient de la longueur du retard.
// - "decay" : le temps que la tole met a se taire ;
// - "damp" : ce que chaque tour de boucle perd en aigus (une tole epaisse) ;
// - "metal" : a 0 les partiels sont justes (une corde) ; a 1 ils sont
//   deplaces les uns par rapport aux autres (une plaque) ;
// - "strike" : la durete du coup. Le coup n'est pas du bruit : c'est une seule
//   ondulation, large pour un maillet mou (son sourd), etroite pour un maillet
//   dur (son clair). Elle dure moins d'un tour de boucle : quelques millisecondes ;
// - "drive" : la saturation dans la boucle ; elle grossit le son et le tient ;
// - "gate" : a 1 la fin de la note ecrite etouffe la tole (on peut la hacher) ;
//   a 0 elle sonne jusqu'au bout.
// La velocite regle la force et la clarte du coup. Trois voix, en mono.
class Processor {
    tune = 0
    decayMs = 500
    damp = 0.45
    metal = 0.5
    strike = 0.5
    drive = 0.3
    gate = 1
    volume = 0.5
    voices = [0, 1, 2].map(() => ({
        on: false, id: -1, buf: new Float32Array(4096), w: 0, len: 400, g: 0.99, choke: 1, exc: 0, amp: 0, excLen: 1,
        ap: [0, 0, 0, 0, 0, 0, 0, 0], lp: 0, quiet: 0, order: 0
    }))
    count = 0
    paramChanged(name, value) {
        switch (name) {
            case "tune": this.tune = value; break
            case "decay": this.decayMs = value; break
            case "damp": this.damp = value; break
            case "metal": this.metal = value; break
            case "strike": this.strike = value; break
            case "drive": this.drive = value; break
            case "gate": this.gate = value; break
            case "volume": this.volume = value; break
        }
    }
    noteOn(pitch, velocity, cent, id) {
        if (pitch < 24) {return}
        let v = null
        for (const w of this.voices) {
            if (!w.on) {v = w; break}
            if (v === null || w.order < v.order) {v = w}
        }
        const sr = sampleRate
        const f = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)
        const period = sr / f
        // Ce que les filtres de la boucle ajoutent au retard, a retirer pour rester juste
        const a = 0.75 * this.metal
        const k = 1 - 0.85 * this.damp
        v.len = Math.max(4, Math.min(4000, period - 4 * (1 - a) / (1 + a) - (1 - k) / k - 1))
        v.g = Math.pow(10, -3 * period / (this.decayMs * 0.001 * sr))
        v.choke = 1
        v.on = true
        v.id = id
        v.order = ++this.count
        v.quiet = 0
        v.buf.fill(0)
        v.w = 0
        v.lp = 0
        for (let i = 0; i < 8; i++) {v.ap[i] = 0}
        // Le coup : une ondulation, d'autant plus etroite que le maillet est dur et le coup fort
        v.excLen = Math.max(4, Math.round(period * (0.62 - 0.57 * this.strike * (0.4 + 0.6 * velocity))))
        v.exc = v.excLen
        v.amp = 0.3 + 0.7 * velocity
    }
    noteOff(id) {
        if (this.gate < 0.5) {return}
        for (const v of this.voices) {
            if (v.id === id && v.on) {v.choke = Math.pow(10, -3 * (v.len + 6) / (0.03 * sampleRate))}
        }
    }
    reset() {
        for (const v of this.voices) {v.on = false}
    }
    process(output, block) {
        const [outL, outR] = output
        const a = 0.75 * this.metal
        const k = 1 - 0.85 * this.damp
        const push = 1 + 3 * this.drive
        const vol = this.volume
        for (const v of this.voices) {
            if (!v.on) {continue}
            const buf = v.buf, ap = v.ap
            const g = v.g * v.choke
            for (let s = block.s0; s < block.s1; s++) {
                // On lit le retard, entre deux cases
                let pos = v.w - v.len
                if (pos < 0) {pos += 4096}
                const i0 = Math.floor(pos), fr = pos - i0
                let x = buf[i0] * (1 - fr) + buf[(i0 + 1) & 4095] * fr
                // Quatre passe-tout : ils retardent les partiels inegalement (le metal)
                for (let j = 0; j < 4; j++) {
                    const y = a * x + ap[j * 2] - a * ap[j * 2 + 1]
                    ap[j * 2] = x
                    ap[j * 2 + 1] = y
                    x = y
                }
                // La perte d'aigus a chaque tour
                v.lp += (x - v.lp) * k
                let y = Math.tanh(v.lp * push) / push
                // Le coup : une seule ondulation
                let e = 0
                if (v.exc > 0) {
                    e = Math.sin(6.2832 * (v.excLen - v.exc) / v.excLen) * v.amp
                    v.exc--
                }
                buf[v.w] = e + y * g
                v.w = (v.w + 1) & 4095
                const out = y * vol * 2
                outL[s] += out
                outR[s] += out
                if (Math.abs(y) < 0.00005 && v.exc === 0) {v.quiet++} else {v.quiet = 0}
            }
            if (v.quiet > 4096) {v.on = false}
        }
    }
}
