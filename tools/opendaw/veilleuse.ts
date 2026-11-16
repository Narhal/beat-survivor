// VEILLEUSE - Beat Survivor
// Electronica sur bande usee - 80 BPM en 12/8 - Sol majeur, 28 cents au-dessus du diapason - 96 mesures (4 min 48)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// veilleuse.src.ts (le morceau), voix-veille.json (la voix) et des
// instruments du dossier apparat/.
//
// Demande de N4 : un second morceau dans le genre de "4 h 04" (Boards of
// Canada). Le theme : l insomnie fievreuse et la nostalgie.
//
// L idee, en une phrase : une berceuse de boite a musique que la fievre
// deforme au fil de la nuit.
// - La nostalgie : une boite a musique, une mesure qui berce (chaque temps
//   est divise en trois), et quatre accords dont le dernier est le meme que le
//   troisieme, devenu mineur : Sol, Si mineur, Do, Do mineur. Deux notes ne
//   bougent jamais (Si et Re) ; une seule descend, d un demi-ton a la fois.
// - La fievre : tout est accorde 28 cents trop haut, et la bande derive de
//   plus en plus a mesure que la nuit avance. Elle est au pire dans le
//   "delire" (mesures 48 a 64), ou la batterie s arrete, puis elle retombe a
//   l aube. C est ecrit comme une courbe de temperature, dans les automations.
// - L insomnie : quelqu un compte les moutons. "One", "two", "three" au
//   coucher ; de "four" a "eight" dans le delire ; et a la fin, "sleep", puis
//   "one" : ca recommence. Le morceau finit sur l accord mineur, la bande
//   ralentit ; relance en boucle, il retombe sur le Sol.
//
// Ce qui vient des retours de N4 sur "4 h 04" :
// - aucun bruit qui dure : ni souffle, ni caisse claire qui traine, ni
//   charley ouvert. La batterie (Poussiere 2) est seche, courte, et passe
//   derriere la nappe ;
// - tout ce qui a une hauteur est accorde avec le morceau, la caisse claire
//   aussi (un Si, la note qui ne bouge jamais) ;
// - l aigu ne vient pas du bruit : il vient de la boite a musique.
//
// Instruments (Apparat = instrument scriptable d openDAW) : Peigne (la boite
// a musique, ecrite pour ce morceau), Magneto (nappe, basse, chant), Poussiere 2
// (batterie).

const BPM = 80
const BAR = PPQN.Bar
/** Un pas = un tiers de temps : douze par mesure. */
const PAS = BAR / 12
const TOTAL = 96
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM
/** Tout le morceau est accorde 28 cents au-dessus du diapason. */
const FIEVRE = 28

const MAGNETO: string = "// @label Magneto\n// @param tune     -35   -400  100   linear  ct\n// @param shape    0.3   0     1     linear\n// @param pwm      0.4   0    " +
" 1     linear\n// @param detune   10    0     40    linear  ct\n// @param sub      0     0     1     linear\n// @param cutoff   700   40    120" +
"00 exp     Hz\n// @param envmod   1.5   0     6     linear\n// @param track    0.4   0     1     linear\n// @param reso     0.2   0     0.9   l" +
"inear\n// @param attack   30    1     5000  exp     ms\n// @param decay    900   10    8000  exp     ms\n// @param sustain  0.7   0     1     l" +
"inear\n// @param release  700   10    8000  exp     ms\n// @param vibrato  0     0     50    linear  ct\n// @param wow      14    0     60    l" +
"inear  ct\n// @param flutter  3     0     20    linear  ct\n// @param phase    0     0     1     linear\n// @param drift    6     0     30    l" +
"inear  ct\n// @param glide    1     1     800   exp     ms\n// @param drive    0.3   0     1     linear\n// @param age      0.4   0     1     l" +
"inear\n// @param dropout  0     0     1     linear\n// @param width    0.7   0     1     linear\n// @param volume   0.5   0     1     linear\n\n/" +
"/ Un synthe a huit voix enregistre sur une vieille bande. Il sert a tout ce\n// qui chante dans le morceau : nappes, basse, melodie, arpege.\n" +
"// La voix : deux oscillateurs desaccordes (\"detune\"), chacun entre la dent de\n// scie et le carre (\"shape\"), dont la largeur respire (\"pwm\"" +
") ; une\n// sinusoide une octave en dessous (\"sub\") ; un filtre passe-bas que la meme\n// enveloppe ouvre (\"envmod\", en octaves) ; une seule e" +
"nveloppe pour le volume\n// et le filtre, comme sur les petits synthes des annees 80.\n// La bande :\n// - \"tune\" : tout est accorde a cote du " +
"diapason, en cents ;\n// - \"wow\" : la hauteur derive lentement (la bande ne tourne pas rond) ;\n// - \"flutter\" : et tremble vite, tres peu ;\n/" +
"/ - \"phase\" : ou commence cette derive. Deux instruments avec deux phases\n//   differentes flottent chacun de leur cote, comme deux prises ;" +
"\n// - \"drift\" : chaque note est un peu fausse, jamais de la meme facon ;\n// - \"drive\" : la bande sature ; \"age\" : elle a perdu ses aigus ;\n/" +
"/ - \"dropout\" : par moments le son tombe une fraction de seconde.\n// Tout ce hasard est rejoue de la meme facon a chaque lecture.\n// \"vibrat" +
"o\" arrive en retard sur la note. \"glide\" : une note jouee pendant\n// qu'une autre est tenue part de la hauteur de la precedente.\nclass Proce" +
"ssor {\n    tune = -35\n    shape = 0.3\n    pwm = 0.4\n    detune = 10\n    sub = 0\n    cutoff = 700\n    envmod = 1.5\n    track = 0.4\n    reso =" +
" 0.2\n    attackMs = 30\n    decayMs = 900\n    sustain = 0.7\n    releaseMs = 700\n    vibrato = 0\n    wow = 14\n    flutter = 3\n    phase = 0\n  " +
"  drift = 6\n    glideMs = 1\n    drive = 0.3\n    age = 0.4\n    dropout = 0\n    width = 0.7\n    volume = 0.5\n    voices = [0, 1, 2, 3, 4, 5, 6" +
", 7].map(k => ({\n        stage: 0, id: -1, env: 0, vel: 0, freq: 220, target: 220, pitch: 60, t: 0, order: 0,\n        pa: 0, pb: 0.37, ps: 0" +
", tilt: 0, pwp: k * 0.13,\n        l1: 0, l2: 0, l3: 0, r1: 0, r2: 0, r3: 0\n    }))\n    n = 0\n    count = 0\n    seed = 40404\n    lastFreq = 2" +
"20\n    dropGain = 1\n    dropTarget = 1\n    dropNext = 0\n    dropUntil = 0\n    tape = [0, 0, 0, 0, 0, 0]\n    bufL = new Float32Array(64)\n    " +
"bufR = new Float32Array(64)\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n      " +
"      case \"shape\": this.shape = value; break\n            case \"pwm\": this.pwm = value; break\n            case \"detune\": this.detune = value" +
"; break\n            case \"sub\": this.sub = value; break\n            case \"cutoff\": this.cutoff = value; break\n            case \"envmod\": thi" +
"s.envmod = value; break\n            case \"track\": this.track = value; break\n            case \"reso\": this.reso = value; break\n            ca" +
"se \"attack\": this.attackMs = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"sustain\": this.sustain = v" +
"alue; break\n            case \"release\": this.releaseMs = value; break\n            case \"vibrato\": this.vibrato = value; break\n            ca" +
"se \"wow\": this.wow = value; break\n            case \"flutter\": this.flutter = value; break\n            case \"phase\": this.phase = value; brea" +
"k\n            case \"drift\": this.drift = value; break\n            case \"glide\": this.glideMs = value; break\n            case \"drive\": this.d" +
"rive = value; break\n            case \"age\": this.age = value; break\n            case \"dropout\": this.dropout = value; break\n            case" +
" \"width\": this.width = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    rnd() {\n        this.seed = (t" +
"his.seed * 1664525 + 1013904223) >>> 0\n        return this.seed / 4294967296\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch" +
" < 24) {return}\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n        let held = false\n        let pick = null\n    " +
"    for (const v of this.voices) {\n            if (v.stage === 1 || v.stage === 2) {held = true}\n            if (v.stage === 0 && pick === n" +
"ull) {pick = v}\n        }\n        if (pick === null) {\n            // Plus de voix libre : on reprend une voix qui finit, sinon la plus anci" +
"enne\n            for (const v of this.voices) {\n                if (pick === null) {pick = v; continue}\n                const a = v.stage ==" +
"= 3 ? 0 : 1, b = pick.stage === 3 ? 0 : 1\n                if (a < b || (a === b && v.order < pick.order)) {pick = v}\n            }\n        }" +
"\n        const v = pick\n        if (v.stage === 0) {\n            v.pa = 0; v.pb = 0.37; v.ps = 0\n            v.l1 = 0; v.l2 = 0; v.l3 = 0; v" +
".r1 = 0; v.r2 = 0; v.r3 = 0\n            v.env = 0\n        }\n        v.freq = held && this.glideMs > 2 ? this.lastFreq : freq\n        v.targe" +
"t = freq\n        v.pitch = pitch\n        v.id = id\n        v.vel = 0.25 + 0.75 * velocity\n        v.tilt = this.rnd() * 2 - 1\n        v.stag" +
"e = 1\n        v.t = 0\n        v.order = ++this.count\n        this.lastFreq = freq\n    }\n    noteOff(id) {\n        for (const v of this.voice" +
"s) {\n            if (v.id === id && (v.stage === 1 || v.stage === 2)) {v.stage = 3}\n        }\n    }\n    reset() {\n        for (const v of th" +
"is.voices) {v.stage = 0; v.env = 0}\n        this.dropGain = 1\n        this.dropTarget = 1\n    }\n    blep(p, dt) {\n        if (p < dt) {const" +
" u = p / dt; return u + u - u * u - 1}\n        if (p > 1 - dt) {const u = (p - 1) / dt; return u * u + u + u + 1}\n        return 0\n    }\n   " +
" // La hauteur de la bande au temps t, en cents\n    cents(t, off) {\n        const w = 2 * Math.PI\n        const ph = this.phase\n        cons" +
"t slow = 0.62 * Math.sin(w * (0.37 * t + ph + off)) + 0.28 * Math.sin(w * (0.83 * t + 1.7 * ph + 2 * off)) + 0.1 * Math.sin(w * (1.9 * t + 0" +
".3))\n        const fast = 0.6 * Math.sin(w * (6.1 * t + 5 * ph)) + 0.4 * Math.sin(w * 9.3 * t)\n        return this.tune + this.wow * slow + " +
"this.flutter * fast\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi" +
" = 2 * Math.PI\n        const voices = this.voices\n        const kA = 1 - Math.exp(-1 / (this.attackMs * 0.001 * 0.45 * sr))\n        const kD" +
" = 1 - Math.exp(-1 / (this.decayMs * 0.001 * 0.35 * sr))\n        const kR = Math.exp(-1 / (this.releaseMs * 0.001 * 0.3 * sr))\n        const" +
" kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))\n        const sus = this.sustain\n        const shape = this.shape\n        co" +
"nst saw = 1 - shape\n        const sub = this.sub\n        const wl = 0.5 + 0.5 * this.width\n        const wr = 1 - wl\n        const damp = 1." +
"6 - 1.5 * this.reso\n        const fMax = 0.14 * sr\n        const pre = 0.3 * (1 + 3 * this.drive)\n        const kAge = 1 - Math.exp(-twoPi *" +
" 14000 * Math.pow(2500 / 14000, this.age) / sr)\n        const kHp = 1 - Math.exp(-twoPi * 30 / sr)\n        const kDropDown = 1 - Math.exp(-1" +
" / (0.012 * sr))\n        const kDropUp = 1 - Math.exp(-1 / (0.11 * sr))\n        const tape = this.tape\n        const bufL = this.bufL, bufR " +
"= this.bufR\n        for (let a = block.s0; a < block.s1; a += 64) {\n            const len = Math.min(64, block.s1 - a)\n            const n0 " +
"= this.n\n            this.n += len\n            // Les chutes de niveau de la bande : une decision toutes les 4096 notes\n            while (n" +
"0 >= this.dropNext) {\n                const r = this.rnd(), r2 = this.rnd(), r3 = this.rnd()\n                if (r < this.dropout * 0.22) {\n" +
"                    this.dropTarget = 0.2 + 0.5 * r2\n                    this.dropUntil = this.dropNext + Math.round((0.05 + 0.16 * r3) * sr" +
")\n                }\n                this.dropNext += 4096\n            }\n            if (n0 >= this.dropUntil) {this.dropTarget = 1}\n        " +
"    let active = false\n            for (const v of voices) {if (v.stage !== 0) {active = true}}\n            if (!active && Math.abs(tape[0])" +
" + Math.abs(tape[3]) < 0.00001) {continue}\n            const t0 = n0 / sr, t1 = (n0 + len) / sr\n            const ca0 = this.cents(t0, 0), c" +
"a1 = this.cents(t1, 0)\n            const cb0 = this.cents(t0, 0.11) + this.detune, cb1 = this.cents(t1, 0.11) + this.detune\n            cons" +
"t vib0 = Math.sin(twoPi * 5.1 * t0), vib1 = Math.sin(twoPi * 5.1 * t1)\n            const pwBase = twoPi * 0.31 * t0\n            for (let i =" +
" 0; i < len; i++) {bufL[i] = 0; bufR[i] = 0}\n            for (const v of voices) {\n                if (v.stage === 0) {continue}\n           " +
"     const fade = Math.min(1, Math.max(0, (v.t / sr - 0.25) / 0.6)) * this.vibrato\n                const own = v.tilt * this.drift\n         " +
"       const ra0 = Math.pow(2, (ca0 + own + fade * vib0) / 1200), ra1 = Math.pow(2, (ca1 + own + fade * vib1) / 1200)\n                const " +
"rb0 = Math.pow(2, (cb0 - own + fade * vib0) / 1200), rb1 = Math.pow(2, (cb1 - own + fade * vib1) / 1200)\n                const dra = (ra1 - " +
"ra0) / len, drb = (rb1 - rb0) / len\n                // Le filtre : regle une fois par tranche de 64\n                const fc = Math.min(fMax" +
", Math.max(30, this.cutoff * Math.pow(2, this.envmod * v.env + this.track * (v.pitch - 60) / 12 + 0.6 * (v.vel - 0.75))))\n                co" +
"nst g = 2 * Math.sin(Math.PI * fc / sr)\n                const g1 = 1 - Math.exp(-twoPi * fc * 1.4 / sr)\n                const pw = 0.5 + 0.4" +
" * this.pwm * Math.sin(pwBase + twoPi * v.pwp)\n                const amp = v.vel\n                for (let i = 0; i < len; i++) {\n           " +
"         if (v.stage === 1) {\n                        v.env += (1.15 - v.env) * kA\n                        if (v.env >= 1) {v.env = 1; v.sta" +
"ge = 2}\n                    } else if (v.stage === 2) {\n                        v.env += (sus - v.env) * kD\n                    } else {\n   " +
"                     v.env *= kR\n                        if (v.env < 0.0002) {v.env = 0; v.stage = 0; break}\n                    }\n         " +
"           v.freq += (v.target - v.freq) * kGlide\n                    const base = v.freq / sr\n                    const da = base * (ra0 + " +
"dra * i), db = base * (rb0 + drb * i)\n                    let p = v.pa + da\n                    if (p >= 1) {p -= 1}\n                    v.p" +
"a = p\n                    let oa = 2 * p - 1 - this.blep(p, da)\n                    if (shape > 0) {\n                        let q = p + pw\n" +
"                        if (q >= 1) {q -= 1}\n                        oa = oa * saw + (oa - (2 * q - 1 - this.blep(q, da))) * shape\n         " +
"           }\n                    p = v.pb + db\n                    if (p >= 1) {p -= 1}\n                    v.pb = p\n                    let" +
" ob = 2 * p - 1 - this.blep(p, db)\n                    if (shape > 0) {\n                        let q = p + 1 - pw\n                        i" +
"f (q >= 1) {q -= 1}\n                        ob = ob * saw + (ob - (2 * q - 1 - this.blep(q, db))) * shape\n                    }\n            " +
"        let s = 0\n                    if (sub > 0) {\n                        v.ps += da * 0.5\n                        if (v.ps >= 1) {v.ps -" +
"= 1}\n                        s = Math.sin(twoPi * v.ps) * sub\n                    }\n                    const e = v.env * amp\n              " +
"      let x = oa * wl + ob * wr\n                    v.l1 += g * v.l2\n                    v.l2 += g * (x - v.l1 - damp * v.l2)\n              " +
"      v.l3 += (v.l1 - v.l3) * g1\n                    bufL[i] += (v.l3 + s) * e\n                    x = ob * wl + oa * wr\n                   " +
" v.r1 += g * v.r2\n                    v.r2 += g * (x - v.r1 - damp * v.r2)\n                    v.r3 += (v.r1 - v.r3) * g1\n                  " +
"  bufR[i] += (v.r3 + s) * e\n                }\n                v.t += len\n            }\n            // La bande : saturation, perte des aigus" +
", chutes de niveau\n            const vol = this.volume\n            for (let i = 0; i < len; i++) {\n                this.dropGain += (this.dr" +
"opTarget - this.dropGain) * (this.dropTarget < this.dropGain ? kDropDown : kDropUp)\n                const k = vol * this.dropGain\n          " +
"      let y = Math.tanh(bufL[i] * pre) / pre\n                tape[0] += (y - tape[0]) * kAge\n                tape[1] += (tape[0] - tape[1]) " +
"* kAge\n                tape[2] += (tape[1] - tape[2]) * kHp\n                outL[a + i] += (tape[1] - tape[2]) * k\n                y = Math." +
"tanh(bufR[i] * pre) / pre\n                tape[3] += (y - tape[3]) * kAge\n                tape[4] += (tape[3] - tape[4]) * kAge\n            " +
"    tape[5] += (tape[4] - tape[5]) * kHp\n                outR[a + i] += (tape[4] - tape[5]) * k\n            }\n        }\n    }\n}"
const PEIGNE: string = "// @label Peigne\n// @param tune    28    -400  100   linear  ct\n// @param decay   1400  100   6000  exp     ms\n// @param bright  0.5   0    " +
" 1     linear\n// @param metal   0.3   0     1     linear\n// @param strike  0.3   0     1     linear\n// @param soft    5     0.5   60    exp " +
"    ms\n// @param beat    1.5   0     12    linear  ct\n// @param wow     14    0     60    linear  ct\n// @param flutter 3     0     20    lin" +
"ear  ct\n// @param phase   0     0     1     linear\n// @param drift   5     0     30    linear  ct\n// @param width   0.6   0     1     linear" +
"\n// @param volume  0.5   0     1     linear\n\n// Le peigne d'une boite a musique : des lames de metal qu'un cylindre pince.\n// Une note = que" +
"lques partiels purs qui s'eteignent chacun a sa vitesse, les\n// plus hauts d'abord : le son commence clair et finit rond. Aucun bruit,\n// au" +
"cune saturation.\n// - \"decay\" : la duree de la note (les notes hautes durent moins) ;\n// - \"bright\" : la force des partiels du haut ;\n// - \"" +
"metal\" : a 0 les partiels sont justes (une lame ideale), a 1 ils sont\n//   ceux d'une vraie lame, un peu faux entre eux ;\n// - \"strike\" : le" +
" petit choc du pincement, tres court ;\n// - \"soft\" : le temps que met la note a naitre (pas de clic) ;\n// - \"beat\" : chaque note est jouee d" +
"eux fois, a quelques cents d'ecart, une a\n//   gauche et une a droite : elle ondule lentement ;\n// - la bande, comme pour Magneto : \"tune\" (" +
"tout est accorde a cote), \"wow\" et\n//   \"flutter\" (la hauteur derive et tremble), \"phase\" (ou commence la derive),\n//   \"drift\" (chaque note" +
" est un peu fausse a sa facon).\n// Une lame ne s'etouffe pas : la fin de la note ecrite est ignoree.\n// La velocite regle la force et la cla" +
"rte.\nclass Processor {\n    tune = 28\n    decayMs = 1400\n    bright = 0.5\n    metal = 0.3\n    strike = 0.3\n    softMs = 5\n    beat = 1.5\n    " +
"wow = 14\n    flutter = 3\n    phase = 0\n    drift = 5\n    width = 0.6\n    volume = 0.5\n    voices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => " +
"({\n        on: false, freq: 440, vel: 0, t: 0, order: 0, tilt: 0,\n        p: [0, 0, 0, 0, 0, 0], e: [0, 0, 0, 0, 0], k: [0, 0, 0, 0, 0], a: " +
"[0, 0, 0, 0, 0], r: [1, 2, 3, 4, 8]\n    }))\n    n = 0\n    count = 0\n    seed = 3955\n    bufL = new Float32Array(64)\n    bufR = new Float32Ar" +
"ray(64)\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"decay\": " +
"this.decayMs = value; break\n            case \"bright\": this.bright = value; break\n            case \"metal\": this.metal = value; break\n      " +
"      case \"strike\": this.strike = value; break\n            case \"soft\": this.softMs = value; break\n            case \"beat\": this.beat = val" +
"ue; break\n            case \"wow\": this.wow = value; break\n            case \"flutter\": this.flutter = value; break\n            case \"phase\": " +
"this.phase = value; break\n            case \"drift\": this.drift = value; break\n            case \"width\": this.width = value; break\n          " +
"  case \"volume\": this.volume = value; break\n        }\n    }\n    rnd() {\n        this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n       " +
" return this.seed / 4294967296\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {return}\n        const freq = 440 * Mat" +
"h.pow(2, (pitch - 69 + cent / 100) / 12)\n        // Une voix libre, sinon la plus ancienne\n        let v = null\n        for (const w of this" +
".voices) {\n            if (!w.on) {v = w; break}\n            if (v === null || w.order < v.order) {v = w}\n        }\n        const sr = sampl" +
"eRate\n        const m = this.metal\n        v.on = true\n        v.freq = freq\n        v.vel = velocity\n        v.t = 0\n        v.order = ++th" +
"is.count\n        v.tilt = this.rnd() * 2 - 1\n        // Les partiels : le fondamental, puis trois autres et le choc\n        v.r[0] = 1\n     " +
"   v.r[1] = 2 + 0.01 * m\n        v.r[2] = 3 + 2.4 * m\n        v.r[3] = 4 + 2.27 * m\n        v.r[4] = 8.1 + 3 * m\n        // Une note haute d" +
"ure moins longtemps\n        const len = this.decayMs * 0.001 * Math.pow(261.6 / freq, 0.5)\n        const clair = this.bright * (0.5 + 0.7 * " +
"velocity)\n        const amps = [1, 0.34 * (0.4 + clair), 0.3 * clair, 0.16 * clair, 0.3 * this.strike * (0.4 + velocity)]\n        const lens" +
" = [len, len * 0.5, len * 0.27, len * 0.16, 0.014]\n        for (let i = 0; i < 5; i++) {\n            // Rien au-dessus de 7 kHz : la, un par" +
"tiel pur fait mal\n            v.a[i] = freq * v.r[i] < 7000 ? amps[i] : 0\n            v.e[i] = 1\n            v.k[i] = Math.exp(-1 / (lens[i]" +
" * 0.33 * sr))\n            v.p[i] = 0\n        }\n        v.p[5] = 0.25\n    }\n    noteOff(id) {}\n    reset() {\n        for (const v of this.vo" +
"ices) {v.on = false}\n    }\n    // La hauteur de la bande au temps t, en cents\n    cents(t) {\n        const w = 2 * Math.PI\n        const ph " +
"= this.phase\n        const slow = 0.62 * Math.sin(w * (0.37 * t + ph)) + 0.28 * Math.sin(w * (0.83 * t + 1.7 * ph)) + 0.1 * Math.sin(w * (1." +
"9 * t + 0.3))\n        const fast = 0.6 * Math.sin(w * (6.1 * t + 5 * ph)) + 0.4 * Math.sin(w * 9.3 * t)\n        return this.tune + this.wow " +
"* slow + this.flutter * fast\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        co" +
"nst twoPi = 2 * Math.PI\n        const soft = Math.max(8, this.softMs * 0.001 * sr)\n        const wl = 0.5 + 0.5 * this.width\n        const w" +
"r = 1 - wl\n        const bufL = this.bufL, bufR = this.bufR\n        for (let a = block.s0; a < block.s1; a += 64) {\n            const len = " +
"Math.min(64, block.s1 - a)\n            const n0 = this.n\n            this.n += len\n            let active = false\n            for (const v o" +
"f this.voices) {if (v.on) {active = true}}\n            if (!active) {continue}\n            const c0 = this.cents(n0 / sr), c1 = this.cents((" +
"n0 + len) / sr)\n            for (let i = 0; i < len; i++) {bufL[i] = 0; bufR[i] = 0}\n            for (const v of this.voices) {\n            " +
"    if (!v.on) {continue}\n                const own = v.tilt * this.drift\n                const r0 = Math.pow(2, (c0 + own) / 1200), r1 = Ma" +
"th.pow(2, (c1 + own) / 1200)\n                const dr = (r1 - r0) / len\n                const twin = Math.pow(2, this.beat / 1200)\n         " +
"       const base = v.freq / sr\n                const amp = Math.pow(v.vel, 1.3) * 0.5\n                const p = v.p, e = v.e, k = v.k, am =" +
" v.a, rr = v.r\n                for (let i = 0; i < len; i++) {\n                    const d = base * (r0 + dr * i)\n                    // Le " +
"fondamental, deux fois : une a gauche, une a droite, a quelques cents\n                    p[0] += d\n                    if (p[0] >= 1) {p[0]" +
" -= 1}\n                    p[5] += d * twin\n                    if (p[5] >= 1) {p[5] -= 1}\n                    e[0] *= k[0]\n                " +
"    const f1 = Math.sin(twoPi * p[0]) * e[0], f2 = Math.sin(twoPi * p[5]) * e[0]\n                    // Les partiels du haut, au centre\n    " +
"                let hi = 0\n                    for (let j = 1; j < 5; j++) {\n                        if (am[j] === 0 || e[j] < 0.0005) {cont" +
"inue}\n                        p[j] += d * rr[j]\n                        if (p[j] >= 1) {p[j] -= 1}\n                        e[j] *= k[j]\n    " +
"                    hi += Math.sin(twoPi * p[j]) * e[j] * am[j]\n                    }\n                    const g = amp * Math.min(1, (v.t +" +
" i) / soft)\n                    bufL[i] += (f1 * wl + f2 * wr + hi) * g\n                    bufR[i] += (f2 * wl + f1 * wr + hi) * g\n        " +
"        }\n                v.t += len\n                if (e[0] < 0.0003) {v.on = false}\n            }\n            const vol = this.volume\n   " +
"         for (let i = 0; i < len; i++) {\n                outL[a + i] += bufL[i] * vol\n                outR[a + i] += bufR[i] * vol\n         " +
"   }\n        }\n    }\n}"
const POUSSIERE: string = "// @label Poussiere 2\n// @param tune    50    35    90    exp     Hz\n// @param punch   0.6   0     1     linear\n// @param kdecay  240   60  " +
"  800   exp     ms\n// @param stone   190   120   320   exp     Hz\n// @param snap    0.6   0     1     linear\n// @param sdecay  150   40    5" +
"00   exp     ms\n// @param nlen    40    5     300   exp     ms\n// @param ntone   3200  800   10000 exp     Hz\n// @param slevel  0.6   0     " +
"1.5   linear\n// @param htone   5200  2500  11000 exp     Hz\n// @param hdecay  38    10    200   exp     ms\n// @param odecay  260   80    900" +
"   exp     ms\n// @param rate    13000 3000  48000 exp     Hz\n// @param bits    10    4     16    linear\n// @param drive   0.5   0     1     " +
"linear\n// @param tone    6000  1500  16000 exp     Hz\n// @param volume  0.6   0     1     linear\n\n// Une batterie qui sonne comme une boucle" +
" prise sur un vieux disque puis\n// rejouee par un echantillonneur des annees 80. En mono, comme une boucle.\n// Les notes : 36 = grosse caiss" +
"e, 37 = coup sur le cercle, 38 = caisse\n// claire, 42 = charley ferme, 46 = charley ouvert (le ferme le fait taire).\n// La velocite regle la" +
" force du coup.\n// Deuxieme version : la caisse claire est refaite. Dans la premiere, son\n// bruit durait aussi longtemps que sa peau et mon" +
"tait haut : on entendait\n// un souffle. Ici le bruit a sa propre duree (\"nlen\", tres courte : un\n// claquement, pas une trainee), il est ass" +
"ourdi (\"ntone\" : rien au-dessus),\n// et la caisse claire a son volume (\"slevel\"). \"snap\" reste la part de\n// bruit, \"sdecay\" la duree de la " +
"peau.\n// Les charleys aussi : leur filtre laissait passer le medium et ils\n// saturaient. Ici il ne reste que le haut du bruit, un tic.\n// L" +
"es sons sont fabriques ici, puis passent tous ensemble par :\n// - une saturation (\"drive\") ;\n// - un echantillonneur : il ne retient qu'une " +
"valeur de temps en temps\n//   (\"rate\" = combien par seconde) et il arrondit (\"bits\") : le grain ;\n// - un passe-bas (\"tone\").\nclass Processo" +
"r {\n    tune = 50\n    punch = 0.6\n    kdecayMs = 240\n    stone = 190\n    snap = 0.6\n    sdecayMs = 150\n    nlenMs = 40\n    ntone = 3200\n    " +
"slevel = 0.6\n    htone = 5200\n    hdecayMs = 38\n    odecayMs = 260\n    rate = 13000\n    bits = 10\n    drive = 0.5\n    tone = 6000\n    volume" +
" = 0.6\n    seed = 1969\n    kt = -1\n    kv = 0\n    kp = 0\n    st = -1\n    sv = 0\n    sp1 = 0\n    sp2 = 0\n    rt = -1\n    rv = 0\n    rp1 = 0\n " +
"   rp2 = 0\n    henv = 0\n    hk = 0.999\n    hv = 0\n    f = [0, 0, 0, 0, 0, 0, 0, 0]\n    acc = 1\n    aa0 = 0\n    aa1 = 0\n    held = 0\n    lp =" +
" [0, 0, 0]\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"punch" +
"\": this.punch = value; break\n            case \"kdecay\": this.kdecayMs = value; break\n            case \"stone\": this.stone = value; break\n   " +
"         case \"snap\": this.snap = value; break\n            case \"sdecay\": this.sdecayMs = value; break\n            case \"nlen\": this.nlenMs " +
"= value; break\n            case \"ntone\": this.ntone = value; break\n            case \"slevel\": this.slevel = value; break\n            case \"h" +
"tone\": this.htone = value; break\n            case \"hdecay\": this.hdecayMs = value; break\n            case \"odecay\": this.odecayMs = value; b" +
"reak\n            case \"rate\": this.rate = value; break\n            case \"bits\": this.bits = value; break\n            case \"drive\": this.driv" +
"e = value; break\n            case \"tone\": this.tone = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n   " +
" noteOn(pitch, velocity, cent, id) {\n        const v = Math.pow(velocity, 1.5)\n        if (pitch === 36) {this.kt = 0; this.kv = v; this.kp " +
"= 0}\n        else if (pitch === 37) {this.rt = 0; this.rv = v; this.rp1 = 0; this.rp2 = 0}\n        else if (pitch === 38) {this.st = 0; this" +
".sv = v; this.sp1 = 0; this.sp2 = 0}\n        else if (pitch === 42 || pitch === 46) {\n            this.henv = 1\n            this.hv = v\n    " +
"        this.hk = Math.exp(-1 / ((pitch === 46 ? this.odecayMs : this.hdecayMs) * 0.001 * sampleRate))\n        }\n    }\n    noteOff(id) {}\n  " +
"  reset() {\n        this.kt = -1\n        this.st = -1\n        this.rt = -1\n        this.henv = 0\n    }\n    process(output, block) {\n        " +
"const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kdec = this.kdecayMs * 0.001 * sr\n" +
"        const sdec = this.sdecayMs * 0.001 * sr\n        const gS = 2 * Math.sin(Math.PI * 1700 / sr)\n        const kH = 1 - Math.exp(-twoPi " +
"* Math.min(this.htone, 0.3 * sr) / sr)\n        const ndec = this.nlenMs * 0.001 * sr\n        const kNt = 1 - Math.exp(-twoPi * this.ntone / " +
"sr)\n        const push = 1 + 5 * this.drive\n        const norm = 1 / Math.tanh(push * 0.6)\n        const step = Math.min(1, this.rate / sr)\n" +
"        const levels = Math.pow(2, Math.round(this.bits) - 1)\n        const kTone = 1 - Math.exp(-twoPi * this.tone / sr)\n        const kHp " +
"= 1 - Math.exp(-twoPi * 28 / sr)\n        const kAa = 1 - Math.exp(-twoPi * Math.min(0.45 * sr, 0.5 * this.rate) / sr)\n        const f = this" +
".f\n        const lp = this.lp\n        for (let s = block.s0; s < block.s1; s++) {\n            const busy = this.kt >= 0 || this.st >= 0 || t" +
"his.rt >= 0 || this.henv > 0.0002\n            if (!busy && Math.abs(lp[1]) < 0.00001) {continue}\n            this.seed = (this.seed * 166452" +
"5 + 1013904223) >>> 0\n            const white = this.seed / 2147483648 - 1\n            let x = 0\n            // Grosse caisse : une sinusoid" +
"e qui tombe, un claquement au depart\n            if (this.kt >= 0) {\n                const t = this.kt / sr\n                const fq = this." +
"tune * (1 + this.punch * (5 * Math.exp(-t / 0.011) + 1.1 * Math.exp(-t / 0.055)))\n                this.kp += fq / sr\n                if (thi" +
"s.kp >= 1) {this.kp -= 1}\n                const env = Math.exp(-this.kt / kdec) * Math.min(1, this.kt / (0.0008 * sr))\n                x += " +
"(Math.sin(twoPi * this.kp) * env + white * 0.25 * Math.exp(-t / 0.0025)) * this.kv\n                this.kt++\n                if (this.kt > k" +
"dec * 8) {this.kt = -1}\n            }\n            // Caisse claire : deux notes de peau qui tombent, et du bruit\n            if (this.st >= " +
"0) {\n                const t = this.st / sr\n                const bend = 1 + 0.45 * Math.exp(-t / 0.012)\n                this.sp1 += this.st" +
"one * bend / sr\n                if (this.sp1 >= 1) {this.sp1 -= 1}\n                this.sp2 += this.stone * 1.78 * bend / sr\n               " +
" if (this.sp2 >= 1) {this.sp2 -= 1}\n                const body = (Math.sin(twoPi * this.sp1) + 0.6 * Math.sin(twoPi * this.sp2)) * Math.exp(" +
"-this.st / (sdec * 0.55))\n                f[0] += gS * f[1]\n                f[1] += gS * (white - f[0] - 0.9 * f[1])\n                // Le b" +
"ruit : une bande dans le medium, assourdie, et tres courte\n                f[2] += (f[1] - f[2]) * kNt\n                f[7] += (f[2] - f[7])" +
" * kNt\n                const fizz = f[7] * Math.exp(-this.st / ndec)\n                x += (body * (1 - this.snap) * 0.8 + fizz * this.snap *" +
" 1.5) * this.sv * this.slevel * Math.min(1, this.st / (0.0005 * sr))\n                this.st++\n                if (this.st > sdec * 8) {this" +
".st = -1}\n            }\n            // Coup sur le cercle : deux notes tres courtes\n            if (this.rt >= 0) {\n                const t " +
"= this.rt / sr\n                this.rp1 += 1740 / sr\n                if (this.rp1 >= 1) {this.rp1 -= 1}\n                this.rp2 += 510 / sr" +
"\n                if (this.rp2 >= 1) {this.rp2 -= 1}\n                x += (Math.sin(twoPi * this.rp1) * Math.exp(-t / 0.006) + 0.7 * Math.sin" +
"(twoPi * this.rp2) * Math.exp(-t / 0.016) + white * 0.3 * Math.exp(-t / 0.002)) * this.rv * 0.7\n                this.rt++\n                if" +
" (t > 0.15) {this.rt = -1}\n            }\n            // Charleys : du bruit dont on ne garde que le haut\n            if (this.henv > 0.0002)" +
" {\n                // Trois coupe-bas a la suite : il ne reste que le haut du bruit\n                f[3] += (white - f[3]) * kH\n            " +
"    let high = white - f[3]\n                f[4] += (high - f[4]) * kH\n                high -= f[4]\n                f[5] += (high - f[5]) * " +
"kH\n                high -= f[5]\n                x += high * this.henv * this.hv * 9\n                this.henv *= this.hk\n            }\n     " +
"       // Saturation, puis echantillonneur\n            x = Math.tanh(x * push * 0.6) * norm\n            // Un filtre leger avant de prendre " +
"les valeurs : sans lui le haut du\n            // bruit se replie dans le medium et le charley devient un souffle\n            this.aa0 += (x " +
"- this.aa0) * kAa\n            this.aa1 += (this.aa0 - this.aa1) * kAa\n            x = this.aa1\n            this.acc += step\n            if (" +
"this.acc >= 1) {\n                this.acc -= 1\n                this.held = Math.round(x * levels) / levels\n            }\n            lp[0] +" +
"= (this.held - lp[0]) * kTone\n            lp[1] += (lp[0] - lp[1]) * kTone\n            lp[2] += (lp[1] - lp[2]) * kHp\n            const y = " +
"(lp[1] - lp[2]) * this.volume\n            outL[s] += y\n            outR[s] += y\n        }\n    }\n}"
const VOIX_TXT: string = "{\"rate\":22050,\"cible\":125.5,\"mots\":{\"one\":{\"f0\":124.4,\"n\":5365,\"b64\":\"AAAAgISJk5eboqWorK2vr6+urquqqKWjoZ2cmpmYl5aVlZWVlpWVlZSUk5KRjYuIgn96cm5pZmFdWVJO" +
"S0dGRUVFRkdKTE9VWFxkZ2xzdnl8f4GDhoeIiomKi4uMjI2Oj5CRk5eZnKGjpqutr7GztLS1tLOvraqjn5qWkY2Hfnl0bGllX11bWllYWFhZWVtdXmBhYmNkZGRlZGRjYmJhYGBgYGFiZWZpbnF1fY" +
"CGj5OYnKGlqYCEiZOXm6KlqKqsra+vrq6rqqilo6GfnZyamJeWlZWVlZaVlpWVlJOSkY2LiIJ/endybmlhXVlSTktHRkVERUVGSkxPVVhcZGdsc3Z5fH+Bg4aHiIqJiouLjIuMjY6QkZOXmZyho6ap" +
"q62vs7S0tbSzr62qp6OfmpGNh355dGxpZWJfXVtZWFhYWVlbXV5fYGFiZGRkZWRkY2JiYWBgYGBhYmVmaW5xdX2AhoqPk5ihpamAhImTl5ufoqWorK2vr66uq6qop6WjoZ2cmpiXlpWVlZWVlpWVlZ" +
"STkpGNi4iGgn96cm5pYV1ZUk5LR0ZFREVFRkpMT1VYXGRnbG9zdnl/gYOGh4iKiYqKi4uMjI2OkJGTl5mcnqGjpqutr7O0tLW0s7Kvraqjn5qRjYd+eXRxbGllX11bWVhYWFlZW11eX2BhYmRkZGVk" +
"ZGNiYmFhYGBgYWJlZmlucXV4fYCGj5OYoaWpgISJjZOXm6KlqKytr6+urq2rqqilo6GdnJqYl5aWlZWVlZaVlZWUk5KRjYuIhoJ/enJuaWFdWVJOS0lHRkVFRUZKTE9VWFxgZGdsc3Z5f4GDhoeIiY" +
"qJiouLjIyNjpCRk5WXmZyho6arra+ztLS1tbSzr62qo5+akY2Hfnl0cWxpZV9dW1lYWFhZWVpbXV5gYWJkZGRlZGRjY2JiYWBgYGFiZWZpa25xdX2Aho+TmKGlqayAhImTl5uipaisra+vr66uq6qo" +
"paOhnZyamJeWlpWVlZWWlZWVlJOSkY+Ni4iCf3pybmlhXVlVUk5LR0ZFRUVGSkxPUlVYXGRnbHN2eX+Bg4SGh4iKiYqLi4yMjY6PkJGTl5mcoaOmq62vs7S0tbW0s6+tqqOfmpGNh4N+eXRsaWVfXV" +
"tZWFhYWFlZW11eYGFiZGRkZWVkZGNiYmFgYGBhYmNlZmlucXV9gIaPk5icoaWpgISJk5eboqWorK2vr6+urquqqKWjoZ2cmpmYl5aVlZWVlpWVlZSUk5KRjYuIgn96cm5pZmFdWVJOS0dGRUVFRkdK" +
"TE9VWFxkZ2xzdnl8f4GDhoeIiomKi4uMjI2Oj5CRk5eZnKGjpqutr7GztLS1tLOvraqjn5qWkY2Hfnl0bGllX11bWllYWFhZWVtdXmBhYmNkZGRlZGRjYmJhYGBgYGFiZWZpbnF1fYCGj5OYnKGlqY" +
"CEiZOXm6KlqKqsra+vrq6rqqilo6GfnZyamJeWlZWVlZaVlpWVlJOSkY2LiIJ/endybmlhXVlSTktHRkVERUVGSkxPVVhcZGdsc3Z5fH+Bg4aHiIqJiouLjIuMjY6QkZOXmZyho6apq62vs7S0tbSz" +
"r62qp6OfmpGNh355dGxpZWJfXVtZWFhYWVlbXV5fYGFiZGRkZWRkY2JiYWBgYGBhYmVmaW5xdX2AhoqPk5ihpamAhImTl5ufoqWorK2vr66uq6qop6WjoZ2cmpiXlpWVlZWVlpWVlZSTkpGNi4iGgn" +
"96cm5pYV1ZUk5LR0ZFREVFRkpMT1VYXGRnbG9zdnl/gYOGh4iKiYqKi4uMjI2OkJGTl5mcnqGjpqutr7O0tLW0s7Kvraqjn5qRjYd+eXRxbGllX11bWVhYWFlZW11eX2BhYmRkZGVkZGNiYmFhYGBg" +
"YWJlZmlucXV4fYCGj5OYoaWpgISJjZOXm6KlqKytr6+urq2rqqilo6GdnJqYl5aWlZWVlZaVlZWUk5KRjYuIhoJ/enJuaWFdWVJOS0lHRkVFRUZKTE9VWFxgZGdsc3Z5f4GDhoeIiYqJiouLjIyNjp" +
"CRk5WXmZyho6arra+ztLS1tbSzr62qo5+akY2Hfnl0cWxpZV9dW1lYWFhZWVpbXV5gYWJkZGRlZGRjY2JiYWBgYGFiZWZpa25xdX2Aho+TmKGlqayAhImTl5uipaisra+vr66uq6qopaOhnZyamJeW" +
"lpWVlZWUlJOTkY6MiYaCfnpwa2ZcWFRMSUdFRERFSEpNVVldZ2xwdXl9gYeJi46Oj5CQkZGRkZKUlpebnaClp6qsrq+wsbCvq6ikm5aRhX96dG9pZFxZVlJRUVJTVFZYWlxgYmRnaGlqampqamtrbG" +
"xucXN2fYGFio+UmaOnq7O2uLu7urm3tbKrpqKYk4+Ggn57eHZ0gIWLlpugp6qsr6+vr66sq6akoZ2bmZaVlJSTk5OSkpKRkI6LiIWBfnl1a2ZhWFRQSkdGRURFRkpNUFhdYWtwdXl+gYWLjY6RkZKS" +
"kpOTk5SUlpiZm56iqKuusbKysa+sqJ2XkIF7c2VfWVVQTkxLTE5TVlphZWhqbW5wcnFycXBxcXFzdXh7gIqPlqKnrba6vL6/vry2sqygmpOGgHl1cG1qZmZlZmdnaWpqamlnZmRhXoCGjpyhp6+xs7" +
"OzsbCqp6OdmZaSkZCPj4+PkJGQj4+Nh4N+enRuaFtWUEdEQkBBQ0ZKT1VhZ257gIaPkpWWmJiZmJeWlZSUlZaZnaCipaiqrK6uraikn5SOhn93cGlbVlFKSUdJS01QVFhcZWhscnR2d3d4d3d3d3h4" +
"e4CDiJKXnaKorbG5u729u7m2rqWbkYd+bGVfVlRTVFVXXF9hY2RkZGNhYF5dXGBiZmpxeICTnKWAiZOnrrS4vb+/u7i0qqSflpKPjYqKiYiIiYaFgnl1b2hhWlNGQTw4OTpESlJbZW95jZadq6+xs7" +
"Oxq6ikoZ6bmZeXl5iZmpmYlpSPioR0bGNSSkM5NjU1NztAT1dgc32FlJqeoaSlpaSioJ2cm5udnqCipaepqqmkoJuMhHtxZ11URD46NTY4QEdOXmZudX2DiZGTlJWVlJSUlJWXmp2kqKyytbe2tLCs" +
"pJ2UgHZsWFBJgImTnaeutL2/v7u4tKqkn5qMiYWEhYaJjIyJh4F7c2thTkU+MzEyOkJMZXF/jJiiq7i6u7ayrKGbl5OQj4+RlZeanJyWkoqBd21iTEI6Ly0uNz9JVWFtepGaoautramloZ2alpSUlZ" +
"eeo6aqrKqnopyTfHFkTEI5Ly0uNz9JU19qdYmQlp2dnZqWlJKRkJCVmp+pr7O4ubezrKWagnVoTkU8MTAyNTtCS15ocYGGio6NjIuAjJmxuMDGxcO4saqimpSOhYSDhYeJi4yKg353bmRbUUA6NDEz" +
"OElTX217h5SpsLa7urivqaSdmJWRjo+QlZiam5uYk4yFfF5RRC8pHyQrNkNaanuan6q4ubm5s62noZWSkJKToKOjoZaPem5fWUs/NCceITA7S3KCkqCsrrW6t7uwqqSUkZCRk5afo6Sjk4uAZ1lSRT" +
"kwKR8jK0NRaYqYprCyt7q3sbOnoZ2QkZGUlqGifIyeusPR1dHMtKqflYyGhoGBgX1/f3t3d29lW1A3MCsrMD9ZaHqKlaSzx8zVz8nApZuRioKFgoCCg39/fXN0a2FWTEMuKio0RFFwgZKcrLjDztXS" +
"xbyrlo6Gg4KAgoKFf358d3BmXEc/MSwqKzBKV2eJmqO+xszO1NDJt62bioN+gIGChIV/f3l1bWJYTTsuKiotMj1eboCiqrfJzc7Szca8qJeOgH16gYOEf357eHFqZ3yMnrrD0dXRzMS0qp+MhoaBgY" +
"F9f39+e3d3ZVtQNzArKzA/SlloepWks8fM1c/JwK+lm5GChYKAgoN/f316c3RrVkxDLioqNERRcIGSnKy4w87V0sW8q5aOhoCDgoCChX9+fHdwZlxSRz8xKiswSldniZqjsb7GzNTQybetm4qDfoOA" +
"gYKFf395dW1iWE1EOy4qLTI9Xm6Aoqq3yc3O0s3GvKiXjoB9eoGDhIZ/fntxamd8jJ66w9HV1dHMtKqfjIaGgYGBg31/f3t3d2VbUDcwKyorMD9ZaHqVpLPHzNXTz8nApZuRgoWCgIKDf399enN0a1" +
"ZMQy4qKjREUV9wgZKsuMPO1dLFvKuglo6Gg4KAgoV/fnx3cXBmXEc/MSorMEpXZ3eJmqO+xszU0Mm3rZuSioN+gIGChX9/eXVtYlhNRDsuKi0yPV5ugKKqt8HJzc7Nxryol46AfXqBgYOEf357cWpn" +
"fIyerLrD0dXRzLSqn4yGhoOBgYF9f397d3dlW1BHNzArKzA/WWh6laSzx8zV08/JwKWbkYKFgoCCg39/f31zdGtWTEMuKiotNERRcIGSrLjDztXSzcW8q5aOhoOCgIKFf39+fHdwZlxHPzEqKzA3Sl" +
"dniZqjvsbM1NDJt62bkoqDfoCBgoV/f3l1bWtiWE07LiotMj1eboCQoqq3yc3Ozca8qJeOh4B9eoGDhH9+e3FqZ118jJ66w9HV0cy0qp+VjIaGgYGBfX9/e3d3ZVtQRzcwKyswP1loepWks77HzNXP" +
"ycClm5GChYKBgIKDf399c3RrVkxDNC4qKjREUXCBkqy4w8nO1dLFvKuWjoaDgoCCgoV/fnx3cGZcRz8xKiswN0pXZ4WLlqmut7SwqaOVkIuIkZSgpqavsbC0raSZeGteSUNGSExSU1phaHh5eHBkXl" +
"RSUVpgZ3CDj5yzwcbGw7WtpZyTfIiVq7G7u7ewnJWPio+OkJmYn6mrrKukmo96bWBJSURDRkVUXWVreHp7d2xmXFleYmhwc4GNmbjAx8rHuqqhl5WOiIV+gIWOmZybl5GBdWpeTUU+OTQ5SlNleoGH" +
"g4WEgXh7d3V3dISOmay3wMfHxsKxp6KLgXltaWhqeHyBh39+cmpoXVNKQjM0N0ZYZH2Ii5OYm5ucmJOKgYCHjZulrra+wMC/t66hh3hxaGdvcnZ7eXyFjpump6Sgk46IhIGJjJGYn6a3ubi2saObiY" +
"mCenl0e4CFkJOUk4R9dGlhWlFJS05UWmh0eXRzcGtnYVxZUVJWanN8jo6UmZick46Cf3x8fo+WnqassbO4s62llo2AfIGChYqNkZScm5eSe3JoWFpWVlJXXWNpdXt7eWhiW1dUUlNQVV1ufoeUl5GN" +
"iYuHgn99eX6Em6OrsLKzrK6mn5eRhH9/gpGWnJycm5iZkol2Z198hY6bpqenpKCTiISBiYyRmJ+mrLe5uLGjm4mJgnp5dHd7gIWTlJOEfXRpYVpUXV5ganB2f4GBenRuYVxZWFlcYW50eoCAfnVvaW" +
"RfXVxiZ257gYaJh4N/eXNuaGhqc3qBjpOWlpSRjIB7d3V3e4eOlZufoaKcl5GFgX+Ag4mPlpyhp6akmpSNgoB/g4iOlJqeoqKfmo2GgHd2d3p/hIqUl5eTjod5c21qaWptd32CiYqJgIaNkpaWlo6J" +
"g3l2dnp/hoyTmZ6joZ6TjYeAfn+Ch42UoKSmpaGcj4mEfn+ChouRl6CiopuWj4F8eHZ2eHyHjZGXlpSJgnt0bmtpa290gISIiYeCfHVuZ15dXWRqcHt/gYB+enRnYVxYWVxnbXR6foCBe3ZwZGBdXm" +
"JndXuChomJiIB6dGtpaW50e4GJj5SXlZGHgXx2dnh7gYePm5+ioJyXi4aCf36AhI+VnKWnpqCalI2Aho2WlpaOiYN5dnZ2en+Gk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KLkZegoqKblo+I" +
"gXx4dnh8h42Rl5aUj4mCe25raWtvdICEiIqJh4J1bmdeXV1kanB2e3+Bfnp0Z2FcWFlcZ210en6AgXt2cGRgXV5iZ251e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8eHZ2eIGHj5ufoqCcl5GLhoJ+gI" +
"SPlZylp6akoJqUgIaNlpaWjomDeXZ2dnp/hpOZnqOhnpONh4OAfn+HjZSgpKaloZyWj4mEfn+Ci5GXoKKioJuWj4F8eHZ4fIeNkZWXlpSJgntua2lrb3R6gISIiYeCdW5nXl1dZGpwdnt/gX56dGdh" +
"XFhZXGFnbXR+gIF7dnBkYF1cXmJndXuCiYmIgHp0b2tpaW50e4mPlJeVkY2HgXx2dniBh4+bn6KioJyXi4aCfoCEj5WcpaempKCalICGjZaWlo6Jg355dnZ6f4aTmZ6joZ6Zk42HgH5/h42UoKSmp6" +
"WhnI+JhH5/gouRl5ygoqKblo+BfHh2eHyBh42Rl5aUiYJ7bmtpa290eoCEiImHgnVuZ15dXWBkanB7f4F+enRnYVxZWFlcZ210foCBe3ZwamRgXV5iZ3V7gomJiISAenRraWludHuJj5SWl5WRh4F8" +
"dnZ4gYePm5+ioqCcl4uGgn6AhI+VnKGlp6agmpSAho2WlpaTjomDeXZ2en+Gk5meoaOhnpONh4B+f4eNlJqgpKaloZyPiYR+f4KGi5GXoKKim5aPgXx4dnh8gYeNkZeWlImCe25raWlrb3SAhIiJh4" +
"J1bmdiXl1dZGpwe3+Bfnp0bmdhXFhZXGdtdH6AgX97dnBkYF1eYmd1e4KGiYmIgHp0a2lpbnR7iY+UlpeVkYeBfHZ2eIGHj5Wbn6KgnJeLhoJ+gISJj5WcpaemoJqUgIaNkpaWlo6Jg3l2dnp/hoyT" +
"mZ6joZ6TjYeAfn+Ch42UoKSmpaGcj4mEfn+ChouRl6CiopuWj4F8eHZ2eHyHjZGXlpSJgnt0bmtpa290gISIiYeCfHVuZ15dXWRqcHt/gYB+enRnYVxYWVxnbXR6foCBe3ZwZGBdXmJndXuChomJiI" +
"B6dGtpaW50e4GJj5SXlZGHgXx2dnh7gYePm5+ioJyXi4aCf36AhI+VnKWnpqCalI2Aho2WlpaOiYN5dnZ2en+Gk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KLkZegoqKblo+IgXx4dnh8h42R" +
"l5aUj4mCe25raWtvdICEiIqJh4J1bmdeXV1kanB2e3+Bfnp0Z2FcWFlcZ210en6AgXt2cGRgXV5iZ251e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8eHZ2eIGHj5ufoqCcl5GLhoJ+gISPlZylp6akoJ" +
"qUgIaNlpaWjomDeXZ2dnp/hg==\"},\"two\":{\"f0\":123.06,\"n\":5841,\"b64\":\"AAAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgFCAgIBQgICAgIBQUICAgFBQgICAgFBQgICAgF" +
"BQgIBQUFBQgFCAUFCAgIBQgICAgIBQUFCAgFBQgICAgFBQUFCAUIBQgICAgFBQgICAgFBQgICAgFBQgICAUFBQgICAUFCAgICAUFCAUICAUFCAgICAUICAgICAUFCAgFBQUICAUFBQgFCAgFBQUICA" +
"UICAUICAgFBQgICAUFBQgICAUICAgIBQUFCAgIBQUICAgIBQUICAgIBQgICAgIBQUICAgFBQUICAgFBQgICAgIBQgICAgFBQgFCAgFBQgIBQUFCAgIBQUFCAUIBQUFCAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgG1tbnN2eXt9f39+fHp2dHR2eHp+gYSGiYmIhYOBfn5/gYOGiY+RkpGPjYiGhISFh4mMjpCSkpGMiYaCgICAgYOFiYuLgIOGioqKiYeFg4B/f4KFiI6QkpKSkY+Kh4WDhIWKjI+RkpKSjouI" +
"goB/gIGDhYeJioqIhoB8eXZ1dXh6fH6AgIB9endxb21tbnBzdXh6fHt6dXNwbW1tb3F0d31/gIB+fHh2dXV2d3mAg4aKioqHhYOBgH9/goWIjpCSkpGPjIqHhYOEhYqMj5KSko6LiIWCgH+AgYOHiY" +
"qKiIaDgHx5dnV1eHp8fH5+fXx5dWxnYltZWICFi5CUlpiYlpONioeFhYeJjZGWn6KlpqWimZWPiYSBfXt7fYGEh4qLioWBfHZwa2VeXFxeYWVtcXR3eHh3cm5rZGJhYmRobXN4f4qNkJOSkIuIhYOB" +
"gYKHio+ZnqKnp6akoZ2YjYmFgICBhIiKjY+RkY6Mh3x3cGZjYWBiZGhrb3J3eHh0cGxlYV5dXV1faG1zfoKHjIyLioiFgn18fH+ChpGWm6CjpaakoZ6VkIyGhYSFgIWLlJaYmJaTjYqHhoWFh42Rlp" +
"+ipaalopmVj4mEgX17e32BhIeKi4qIjIV7YFVKNi4tJSUlKScuNktVaHuDi46QkpCPjIqMiYiJg4iTmqKyusLK1tPV0s7HvLKlmo2BbltVT1BQUVdbV2BjZWZma2hfWVNBPDg1PEBETFReb3uIoau8" +
"ys3Pz8bCvrKsrKGcmY+RkpWYnaetr6+soZqKgHNvYldLOCokICIkNz9IUFpjZHyIlau0vMvMzca6ta+po52cmZialpmgpaers7OxqaOTf3RmVktAODEsIiMmLDpJUmRsc3F2eHp5fnx3c3JrbHB1fI" +
"SUqbO9yM/V29ve2tPLwaWajnpza2loZ2pnaWxucXJ4dnJnWVFAOTIsMC0tMjg5TVhlhZGcpa2zsbW0s6uuqaGdm5OUlZmhrrO9wcS+vLeyqqGchHhrTEM6LywzNDc8QUhPVmJmaXNxcGpfXFlXVld8" +
"iJWrtLzLzM3Kxrq1qaOdnJmYmpaZnaClp7Ozsamjk390ZltWS0AxLCIjJiw6SVJbZGxzdnh6eX58d3NyaWtscHyElKmzvcjP1dvb3trTy8Glmo56c2tpaGdpamdpbnFyeHZyZ1lRSUA5MjAtLTI4OU" +
"1YZXGFkZyts7G1tLOrrqmloZ2blJWZoa6zvcHEvr68t6qhnIR4a0xDOi8sMzQ3PEFIT1ZiZmlzcXBtal9cV1ZXfIiVq7S8x8vMzca6tamjnZyZmJmalpmgpaezs7Gpo5OKf3RmVktAMSwiIyYsMjpJ" +
"UmRsc3Z4enl+fHdzcmlrbHB8hJSps73Iz9XZ29ve08vBpZqOenNrbmloZ2pnaW5xcnh2cm1nWVFAOTIwLS0yODlCTVhlhZGcrbOxtbSzr6uuqaGdm5SVmaGus73BxL6+vLeqoZyEeGtMQzo0LywzNz" +
"xBSE9WYmZpcnNxcGpfXFdWV3yIlaCrtLzLzM3GurWpo52fnJmYmpaZoKWns7Oxr6mjk390ZlZLQDEsIiMmLDI6SVJkbHN2eHp5fnx5d3Nya2xwfISUqbO9x8jP1dvb3tPLwaWajoR6c2tpaGdqZ2lu" +
"cXJ6eHZyZ1lRQDkyMC0tLjI4OU1YZYWRnK2zsbW0s6+rrqmhnZuUlZmhrrO4vcHEvry3qqGchHhrX0xDOi8sMzc8QUhPVlxiZmlzcXBqX1xXVldefIiVq7S8y8zNxrq1r6mjnZyZmJqWmaClp7Ozsa" +
"+po5N/dGZWS0AxLCIiIyYsOklSZGxzdnh6enl+fHdzcmtscHyElJ6ps73Iz9Xb297Ty8G3pZqOenNraWhnamdpbG5xcnh2cmdZUUA5MjAtLS4yODlNWGWFkZyts7G0tbSzq66poZ2blJWZnaGus73B" +
"xL68t6qhnJGEeGtMQzovLDM3PEFISE9WYmZpc3Fwal9cWVdWV3yIlau0vMvMzca6ta+po52cmZialpmgpaers7OxqaOTf3RmVktAODEsIiMmLDpJUmRsc3F2eHp5fnx3c3JrbHB1fISUqbO9yM/V29" +
"ve2tPLwaWajnpza2loZ2pnaWxucXJ4dnJnWVFAOTIsMC0tMjg5TVhlhZGcpa2zsbW0s6uuqaGdm5OUlZmhrrO8wMK9vLezq6OfiH1vUEY8LywwMTM2O0FIT11jaHV2dnNpZmNhX158h5Srs7vMzc7M" +
"yL64rKagnZqYl5GUl5ueoK2urqmll4Z8cGRfVUk2MCMfICMvPUZPWWFrc3h9goqKhoOBd3Z1dnl9ipmhqra+x9PX39/d2dK6sKSMgnZqZF5bWFFRVllcam1ub2ZjX1pVTklDPzg4MztBSlRncn+Yo6" +
"e5v8THzcrGwbu1oZyYkZeXmp2gnaCjpaemqqCZkHNoW0U7OTIsKCYjJyw8RU5ocHh+g4CCg4KAfIeUq7O7x8zNzsi+uKymoKGenJualJWZnJ6oqamloZSOhX1yZFtQPjcpIyIjJis3P09XYWtyeIKM" +
"jo+OjISDgYCBgoyVmqGpsLi+xcrV2NfVw7yznpSIhHlwZlhNSUZHSVVZXGBjXl9gX11eWlZPTENCQ0RHWmBqfoiOpK23v8bR1dbU0L+5sqOknZSRjYWEhYaJipKUk5GCfnZwZl5bSUE5JyQiJCctOk" +
"NLVmptd4iOlHyGk5ynr7fIyszIvrqwq6Wno5+cmZKTlpmbpqempqShlId/dWdeU0A5KyMiIiQoNDxMVF5pcHeCjZCRkZCPhoSDg4ONlJmfpaWss8DG0dbW1cbAuLCkm49/dmtaTUdBQEBJS09SWlda" +
"X2BhZmRiX1xZUExLTVlcY3J6fpSeqbK8ytHZ29vPysW1ta2lnZaPfXp3dXZ9gIGCg3t7eHJtbmBZUTw2MCwoJyczNz9QUl1zfoiYfIaSpq+3yMvNysC9uLOuqKWgnZiQkJKUlaChoaKhn5SKg3tvZl" +
"xJQTIsJiMhIy0yQUlSXmdweICNk5qbnJSSko6Nk5OUlpianqSwtsLLzs/Qx8S/samfj4V5ZFRLRD46OD5AQkpITVdbX2trbGxqaWBbWVlfYGNscnN7hY6ZpLO5xMjLx8bDwby/uaymn4uGgXl3fHt6" +
"ent0dXZ1dHNzcGxnYlVQRUE9Pj08QENBRk1UXHyEjJ2jqbm8vb61s7Ctqaamo6Ccm5SUlZaYn6GioaCYkY2Ienpza2NbVEA7NzI5Oj9DSE1MU1lmbHiAg4WCgoGBgYB/h4eIjoqOmJ2jsLW7v8fJxM" +
"LAvbmzrJuThHx0bWddYV5bW1xYWlxeX2doaGdlWldUT0xRT09PT05SV2VsdI2VnaWtrLK6vL3DwL62q6ainZmWl5aVlJSOkJCRkpeXlY+KhXFrZFRVTkI+OzIxMjN8hIyco6m5vL6/v7e1r6ypqKWi" +
"nJuSkpGSkpucnZ2dlZGOioV+f3lpYltGQDs0OTg5Oj1AQ0lQXWRyfoOHi4iKi4yMi5KRkJGLjJKUmKOorbG6vbq9vr7AvLiyqqOUg3tzY2ReVFFPSEdHSU5XWmBjZWFiYmFhYGViYWBYWVleYmZyeX" +
"+Gl5efrrS5ycvMzMvCv7Wxq6Wfmo6Kf3p4d3d9fX5/f392dHJrbmpkX1pUQz87fISMnKOptLm8vr+3ta+sqailop+cm5KRkpKbnJ2dnZWUkY6Kfn95aWJbRkA7NzQ5ODo9QENJUF1kcnp/g4eEh4iL" +
"jIyUlJSWj5GSlZeaqKuvtri0t7i4t7y5tqummImCemtsZWBZVVJGRUVGT1FWWVxfWl1fYmNqa2tqZGRkZWdpa3l9go6Nk6GnrL7CxcjKw8O/vLi0r6mblomDfXh0dHJxbm5uZmZmZmVra2dkYlVSTn" +
"yDipGZn6W1uLq9tbSxrqyprKmmoJ6Wk5KSmJiYmJeWj4uJhn1/em1oYU5IQz87Pz08PT8/Q0hUWmhudXuBhYiMkZOUnJycnJyVlZaXmKOlqK6wrK6wsrO5uLauqp6QioJ7c3NrXVhTREFAP0dJS05R" +
"VVVYW2JkbXFyc25ubm9wcHF8foGJhouWm6Css7e8w7/BwsG/v7u3samjloeAenVwbGRiYFdWVlZXX2BiY2NdXFtafIOKmZ+ktbi7vre2tbOwrq6rqKKflpKQj5WUlJSTkouIh4V9gX1ybGdaVE9KQE" +
"NBPT09Oj1BRkxSX210eoGHi5WYmqOlpqamn56dnJuio6OjpaahpKWnr7CwrKqhnZiTjoCBempkXUpFQTpAPz9AQkRFSU5YXWhydnl8eXt9gICBiYmKjYeJi4+RlKSorLSxtLm7vLzCwb+2saWXkImB" +
"enNtZmFcTUtKVFRVV1laXF5gYoCFi5aboKeqrK+vr6+urKumpKGdm5mWlZSUk5OTkpKSkZCOi4iFgX55dWtmYVhUUEpHRkVERUZKTVBYXWFrcHV5foGFi42OkZGSkpKTk5OUlJaYmZ2foaapq66vr6" +
"+vrqynpKCWkYuAenRuaWRfWFVTUFBQUVNUVllbXmJkZmlqa2xsbG1tbW1vb3F1d3qBhoqPlJmep6uvtbi5u7q5uLWyr6einpSPioF+enVycW9vbm2AhYuWm6Cnqqyur6+vrqyrpqShnZuZmJaVlJOT" +
"k5KSkpGQjo2LiIV+eXVrZmFYVFBNSkdGREVGSk1QWF1hZmtwdX6BhYuNjpGRkpKSk5OTlJSWmJmdn6Gmqausrq+vr66sp6SglpGLhYB6dGlkX1hVU1BQUFBRU1RZW15iZGZpamtrbGxsbW1tb29xdX" +
"d6foGGipSZnqerr7W4ubu6ubi1sq+nop6Uj4qBfnp3dXJxb25tgIWLlpugpKeqrK+vr66sq6akoZ+dm5mWlZSTk5OSkpKRkZCOi4iFfnl1a2ZhXVhUUEpHRkRFRkpNUFhdYWZrcHV+gYWLjY6RkZKS" +
"kpKTk5SUlpiZnZ+hpKapq66vr6+urKekoJuWkYuAenRpZF9YVVNRUFBQUVNUWVteYmRmZ2lqa2xsbG1tbW9vcXV3en6BhoqUmZ6nq6+1uLm6u7q5tbKvp6KelI+KhoF+enVycW9ubYCFi5GWm6Cnqq" +
"yvr6+urKuppqShnZuZlpWUk5OTkpKSkpGQjouIhX55dWtmYV1YVFBKR0ZERUZKTVBUWF1ha3B1foGFi42OkJGRkpKSk5OUlJaYmZudn6Gmqauur6+vrqyqp6SglpGLgHp0aWRfW1hVU1BQUFFTVFlb" +
"XmJkZmdpamtsbGxtbW1vb3FydXd6gYaKlJmep6uvsrW4ubu6ubWyr6einpmUj4qBfnp1cnFvbm1tgIWLlpugp6qsr6+vr66sq6akoZ2bmZaVlJOTk5KSkpKRkI6LiIV+eXVwa2ZhWFRQSkdGREVGR0" +
"pNUFhdYWtwdX6BhYiLjY6RkZKSkpOTlJSVlpiZnZ+hpqmrrq+vr6+urKekoJaRi4B6dGlkX1tYVVNQUFBRU1RZW15gYmRmaWprbGxsbW1tbm9vcXV3eoGGipSZnqKnq6+1uLm7urm1sq+rp6KelI+K" +
"gX56dXJxb29ubYCFi5aboKeqrK+vr6+urKumpKGdm5mWlZSUk5OT\"},\"three\":{\"f0\":132.09,\"n\":5272,\"b64\":\"AAAAUFBwcHBwcHBwcHBwcHBQUFBQUFBQcHBwcFBQcHBQcHBQcHBwcHBQcH" +
"BwUFBQcHBwUFBwcHBwcHBQcFBQcFBQcFBQUHBwcHBwcHBQUFBQUFBwcHBwUHBwcHBwUFBQcFBQUHBwcHBwcHBQUFBQUHBwcHBwcHBQcFBQUFBQcHBwcHBQUFBwcFBwcHBwcHBwUFBQcHBwcHBQcHBw" +
"UHBQUFBQcHBwcHBwUHBQUFBwcHBwcHBwUFBQUFBQcHBwcHBwcHBQcHBQUHBwcHBQUHBwcHBwcFBQUFBQUHBwcHBwcHBwUFBQcHBwcHBwUHBwcHBwcFBwcHBwUFBQUHBwcFBwcHBwcFBQUHBwcHBQcH" +
"BQUFBwcHBwcHBQUHBQUHBQcHBwcHBQUFBQUFBQcHBwcHBQcHBQUHBwcHBQUHBQUFBwcHBwcFBwcHBQUFBwcHBwcHBQUFBQUFBQcHBwcFBwUFBQUFBQcHBwcFBwcFBQUHBwcHBwUHBQUHBwcFBQcHBw" +
"UHBwUHBwcHBwUFBQcFBQcHBwcHBwUFBQUHBQUHBwcHBwUHBwUFBwUHBwUFBwcHBwcHBQcFBQUFBwcFBwcHBQUFBwcFBwcHBwcHBwcHBQUFBwUHBwcFBQUHBwcHBwcHBwcFBQUFBwUFBwcHBwcHBQcH" +
"BQUFBwcFBwcHBwUFBQcHBQcHBwcHBwUFBQcHBwUFBQUFBQcFBwcHBwcHBQcHBQcHBwUFBQUFBwUFBQUHBwcHBwcHBQUHBwcHBwcFBQUFBwUHBwcHBQcHBwcHBwcFBQUHBwUHBwUHBwcHBwUHBwcHBw" +
"UFBQcHBQUHBwUFBQUHBQcHBwcHBwcHBQUFBQUFBwcHBQcHBQUHBwcHBQUHBQcHBwcHBQUFBQUFBQcHBwcHBwUFBwUFBQUFBQcHBwcFBwcHBwcFBwcHBQcHBwUFBwcHBwUFBwcHBwUFBQUHBwcHBwcH" +
"BQcHBwcHBQcHBQcHBwUFBQcFBwcHBwcFBQUHBwcFBwUHBwcHBwcFBQUFBwcHBwUFBwUFBQUHBwcFBQUHBwcFBQUFBwcHBwUHBwcFBQUFBwcHBwcHBwUFBQUHBQUHBwcHBwUHBQUFBQcHBwcHBwcFBw" +
"cHBQUHBwcHBwUHBQUHBQUHBwcHBwUHBwcFBQcHBQUHBwUFBQUFBQcHBwcHBwcFBQcHBwcFBQUFBQUHBwUFBwUFBwcHBwcHBQcHBQUHBwUFBQUFBwcHBwcHBwcFBQUHBwUHBwUHBwUHBwcHBwcHBwUF" +
"BwcHBwcHBQcFBQcHBQUHBwUHBwcFBQUHBwUFBQcHBwcFBQUFBwcHBwcHBwUHBwcFBwcHBwcHBwcFBQUHBwcHBwcHBQcHBQUFBwcHBwcFBQUFBwcHBwcFBQUFBwcHBwcFBQUHBwcHBQUHBQcHBwUFBw" +
"cHBwcHBwcHBQUHBQUFBwcHBwcHBwUHBwUFBQcHBQcHBwcHBwcHBQUFBQcHBQcHBwcHBwcFBwUFBQUFBwcHBwcFBQcFBQcHBwcFBQcHBwcFBQUFBQUFBQcHBwcFBQcFBwcFBQUHBwUHBwcHBQcHBwUF" +
"BwcFBQUHBwcHBwcHBQcHBwcHBwcFBQUHBwUHBwcFBQUHBwcFBwUFBwcHBwcHBwcHBQUFBQUHBQUHBwcHBwcFBwcHBwUHBwcFBwUHBwcHBwUHBwcHBwcHBQUFBQUFBwUFBwcHBwcHBwUHBwcHBwUFBw" +
"UFBwcFBQUFBwcHBwcHBwUFBQcHBwcHBwUFBwcFBQcHBwUHBwcHBQUHBwcHBwcFBQUHBwUHBwcHBwcFBQUHBwUFBwUHBwcFBwcHBwcHBwUFBQcHBwUHBwUFBwUFBQcHBQcHBwcHBwcHBwcFBwcHBwcF" +
"BwcHBwUFBQUFBwcFBwcHBQUFBwcHBQUFBwUHBwcFBQcFBwcHBwcHBQUHBQUHBwcHBQUHBQUHBwcHBwcHBwUFBQUFBQcHBwcHBwcFBQUFBwUFBwcHBwcHBwUFBQcHBwcHBwcFBwUFBQUHBwUFBQUFBw" +
"cHBwUFBQUHBwUHBQUFBQUHBwcFBQcFBQcHBwcHBwUFBQcHBwUHBwUFBQcHBwcFBwUFBQcHBQUHBwcHBwcHBwcHBwUFBQUFBQcHBwcHBwUFBQUFBQUHBwcHBwcFBwcHBQUFBQUFBQcHBwcHBwcFBQcH" +
"BwcFBQUFBwUHBwcHBwUHBwUFBQUFBwcHBwUHBQcFBQcHBwcHBwcHBwUFBQUHBwcFBQUFBwcHBwcFBwcHBwUFBQcFBQcHBwUHBwcFBQcHBwcHBwcFBQUHBQUHBwcHBwcHBwcHBwUFBQUFBQcHBwcHBw" +
"UHBQUHBwcHBQUFBQUFBwcHBQUHBwcHBwUHBwcHBwcHBQUHBQcFBQUFBwcHBwfH+Cho2LioeFe3l5e4iLjouLiomGioeDfH2BhI2RkpGJhoOAgYCAgn6AhIWMi4iFe3Vzcnp8f31+f358gX53dW1ucH" +
"N/gYN7eXd0eHZ1dXBzeXyFh4aEenh1dHt8fn6BhIeNjImHhHt6e3yJjI+Li4qIhYmGg3x9goSOkZGQh4SBfoB/f4J+gYSFi4mHg3lzcnF6fX99fn57f3x5dnRtbnF0gIKDe3l2c3h2dXZxdXt+hnx/" +
"goSGjYuHhXt5eXuIi46Qi4uKhoqHg3x9gYSNkJGSkYaDgIGAgIJ+gIOEhYyIhXt1c3J6fH+Gent7eXaAd3NwYWNlbnKEh4iJh3RxbWl3eH+Ee4CEh4iVko+Ihnd4e3+Rlpmcno+Mg397hIOEh3x/go" +
"eHlI2Ig2xpaGdpeX2Dhoh5dnJ4dHFvcGVpbXJ2iouKhXRwbGtsfYGFioWJioqHkouIhoZ5e36HmJyenZqDf3p3eX2CiIiWkI2Kd3Z3eX2Pk5udno2Khn2HhYSEhXqBhIaVk4+GgW5oZ2h4e36Ch3p5" +
"dHB6cnBvcGRna3R4iYqJhnJvbGtse3+IjJGKi4qTkIyJh4Z4fYCFmp2em4qGgX15doKDhX6Bg4SDjoqFgHteW1teYmZ9gIKBf21pZWFea21xfYOKiIuNjo2KlI2KiIp/g42SlqeoqKacloF1cW5ufo" +
"GEh4qMfHp1aWRsZGNkZmphZ3l/ho+RkZuXlJCMinx/goeRo6ampJ+Ff3hybmt4en2Ahnp7d3NuaHFsZ2NkWGJobniJi4yKiIRwbW1wdHmUmqCkqJqZk46JjYuJio2QhomMjoyJkoV/eGBeXV5gZGh+" +
"gYOBfmxjX1xba290e4GIhomKiYaRioiHh4l+g46Tl6mpp52Xg313dHFxgYWLjo9/fHdxamRtZWRka2FncXV4eIaDgHp2dF1haXuFkJm3vcHCvrh1f4qbn6KgsaumoJyYlpeFjpOXm5qrpp2ViXRqYU" +
"NCQ0xSWXR6foCAfXpdWlhaXmVsjJahtLvAwamklo+HgnyPjZGUl52fiYJ7cmleVWBTUFBXXWVhaG93eHiLiISBfn+CeYGLnaWrr7HEwLKqoI5zbWlqbHBzdo2MioR2blBCPTs7PkNLc32Hl5ueiIWC" +
"f3x5eJGWnKuyuaytq6afl4x3g3pvbW1yYWVrbGtpZWBuYVxYdX+Km5+ioqCxq6CcmJaXhY6Tl5qbmqudlYl0amFDQkNHTFJZen6AgH16XVpYWFpeZYyWobS7wMGppJ6Wj4d8j42RlJedn4mCe3JpXl" +
"VgU1BQV11lYWhvdHd4eIiEgX5/gnmBi5SdpauxxMCyqqCOc21raWpsc3aNjIqEdm5QSEI9Oz5DS3N9h5ebnomIhYJ8eXiRlpyrsrmsraumn5eMd4N6b21tcmFlaWtsa2VgbmFcWHV/ipObn6Kgsaug" +
"nJiWl4WJjpOXm5qrnZWJdGphR0NCQ0xSWXp+gIB9enZdWlhaXmWMlqG0u8DBqaSelo+HfI+NkZSXnZ+Jh4J7cl5VYFNQUFddZVhhaG93eHiIhIF+f4KHeYGLnaWrscTAsqqgl45zbWlqbHN2jYyKhH" +
"52blBCPTs+Q0tzfYeXm56JiIWCfHl4kZacq7K5vqytq5+XjHeDem9tbW9yYWVrbGtlYG5hXFhXdX+Km5+ioLGroJyYlpaXhY6Tl5uaq52ViX90amFDQkNMUll6foCAfXp2XVpYWl5ljJahtLvAwcGp" +
"pJaPh3yPjZGUl5udn4mCe3JeVWBTUFBSV11lYWhvd3h4iISBf35/gnmBi52lq7HEwLqyqqCOc21pamxzdo2MioR+dm5QQj07PkNLc32Hj5ebnoiFgnx5eJGWnKOrsrmtraqbkIaGf3p4eHpqcnV2cW" +
"t5Zl1WUU87P3WAi5uen62oopyYlpaIjpWhpby1rqSNgmNcVlVVXHZ7goJ/X1dPSEI/PltjbYSOl4uMioaDfo+Mj5Oiq5+sr6+spbKok4qDaGhsdHh7e46Kg3BnXjw6O0ZObHZ/houOi3JqZ2Vqho6j" +
"rbe+ra+toZmRlpGPkJSYiIuOjoZ+iXNoX1U/QkdNVV1ogIF7dnFUUlNXX2hyn6mxurm2lo+JhIGBmKGnrbWhnpCGe29kb2hiY2d1gIubnp+tqKKcmJaWiI6VoaW8ta6kmY2CY1ZVVWJ9goWCfF9US0" +
"M6UFVncXt1dnVybGZ2c3V8fYiTpKamt7CpoZeBg5CYn729uLClm3pmYmBmgIaNjYlkWk9FPlBQW2NtaW5vaWNybGloa2ZxfZSanrCqo5yXf3+JkZq+wsK3r46DeHFsbIWLlZiXdmxhVUpYU1ZbY2Bm" +
"amhjcWpkYF5TW2eAiZCqp6GVe3p6f4WPt7/EdYCLmZuZqaOcl5J/hZafp8TDvbWqoIBwbm93kpebmZJ0aF5SQlVWYWlxaGloY11WY1tcYF9pdoqOkKSgmpSMdnqJk53CxcW5sJGGfnl3fJacpaaje2" +
"9iV2NgYWx0ZmxpYmRaU09RQUtia3OKhX5xWVpeaHOWrLK0l4+Ifn6YoKu0va+spY+akImMkoSLkJGHk4ZtZUtPVl6Agn95b2VGOztAaXR/i3VxamNdWXN7h4yWnXWBjZSYl6iak49+hZClrcXEv7ar" +
"gnx6gZ2kra2niXxwY2hnaXZ+bm9pYFZgV1BSQ05ja3CCe3RoUVVbZ3KVqa2tjYZ/en2Zo664wbCroo2ZkpCVnI6VmZiKlIZwaVFZYGhuhYV/bGJCOTxCbHZ/hIVtaFlTUXB5hoqSmJiVjpyQj5KNl6" +
"KwsMGupJl9eHuCsLa3qoJ1X1t4fYWNlHhxZUxeWV9oVl9lZmJrYVk6QEtjiY2Ncn+Kko+kk46Of4uXosXHw7CKgn6EqLzBwqKYi3+HhYeVgYeEfG9xaGRkTldga4aAal86OD9JcHuChWBXTkRiaYKP" +
"fYOEgHiEgYKSg5Cio7y0qqGaf4aQwcfIuZKGfHZ0lKWtspGHe2F0cXN5gW11cmpuYlo8QkxfgYJ9dWtFOj1FeYWOdnBpYFlydYeVopeYlJ+XkpKXhI+mq8i6r6R8fYKLsbm+uJKFbWV/iJGYnoJ+dX" +
"J/ipKPpJOOjnZ/i5fFx8O0jYeKsLvMzauhk4d9l56om5yVmIp+eV1ja3uZk3tuRT5EaXR8gH1NQTZMUl1XXl9ZUGFYU1pKZW6OhHpyUFJYZJ2nrIl/d3CRnKm3wqykmqufoqqmsLTHvK+kgYKGmr/C" +
"uKyBa2mHj5ihpYB0ZWllZ1xla2tld2lSTzVHU3Z3b2M8NDA0ZXJ9Z2JZR2BkbXtseoSAlIN/gnuJl7u/u7OEfn9yf4uRpp6OjHV/jJrCyMG4iISFtMDK0LOsoYmenKq0oaSdrJ+RiINxe4OjnZBYTk" +
"hKUHZ/h4JbQTdOV2JtWl5cVFpQTTtHVWeEgHZtZEVQXYieoJ5xaGSKlqSxoKOhkKKcoKqbsbTNxLmtpYePmcjKxpSHe3V0lZ6ulZF6bHtxdX1qcnZzem1gOTxFWXt8dmxEOC8zWHF6fVdNQ1hXXGdm" +
"cXhyhXx0XGeDj7Kzr6addniBcn+LkaaelI6MdYyawsjBuIiEhY20wMqzrKGJnpyqtKGmpJ2skYiDcXuDo52Qg1hOSFB2f4eCW0E3TlBXYm1eXFRaUE07R1VnhIB2bWRFUF2InqCecWhkZYqWpKCjoZ" +
"CinKCqm6extM25raWHj5nIysa+lId7dJWerpWRemx7c3F1fXJ2c3ptYDk8RVBZe3xsRDgvM1hxen1XTUNYV1xnZnF4coV8dFxndIOPsq+mnXZ4gXJ/i5CRpp6OjHWMmsLIwbiRiISFtMDKs6yhiZ6c" +
"oaq0oaSdrJGIg3F7g4ijnZBYTkhQdn+HgltBN05QV2JtXlxUWlBNO0dVYGeEgG1kRVBdiJ6gnnpxaGSKlqSgo6GQopyboKqbsbTNua2lh4+ZpMjKxpSHe3SVnq6VkYh6bHtxdX1ydnN6bWA5PEVQWX" +
"t8bEQ4LzNYcXp9X1dNQ1dcZ2ZxeHKFfHV0XGeDj7Kvpp12eIGpcn+Lkaaejox1jJrCyMjBuIiEhbTAyrOsoZWJnpyqtKGknayRiINxe4OIo52QWE5IUHZ/h4JbT0E3TldibV5cVFpQTU87R1VnhIBt" +
"ZEVQXYiVnqCecWhkipakoKOhmZCinKCqm7G0zbmtpYWHj5nIysaUh3t0lZ6ulZGIemx7cXV9cnZzem1gWDk8RVl7fGxEOC8zWGVxen1XTUNXXGdmcXh3coV8dFxng4+yr6adeXZ4gXJ/i5Gmno6MdX" +
"+MmsLIwbiIhIW0wMqzrKGViZ6cqrShpJ2skYiDanF7g6OdkFhOSFB2f4aHgltBN05XYm1eXFRJWlBNO0dVZ4SAbWRFR1BdiJ6gnnFoZIqWpLGgo6GQopygqpuxtM25raWFh4+ZyMrGlId7dJWep66V" +
"kXpse3F1fXJ2c4h6bWA5PEVZe3xsRDgwLzNYcXp9V01DV1xndGZxeHKFfHRcZ4OPsrOvpp12eIFyf4uRpp6OjHV/jJrCyMG4iISFtMDK0LOsoYmenKq0oaSdrJ+RiINxe4OjnZBYTkhKUHZ/h4JbQT" +
"dOV2JtWl5cVFpQTTtHVWeEgHZtZEVQXYieoJ5xaGSKlqSxoKOhkKKcoKqbsbTNxLmtpYePmQ==\"},\"four\":{\"f0\":124.96,\"n\":6668,\"b64\":\"AAAAcHBwcHBQUHBwcHBQUFBwcHBQUFBwcHBwc" +
"HBwcHBwUFBQcHBwcHBwUFBwcHBQcHBwcHBQcHBwUFBwcHBwcHBwcFBQUHBwUHBwcFBwcFBQUFBwcHBwcFBwcFBQUFBQUHBwcHBwcHBwUHBwcFBQcHBQUFBQcHBwcHBwcFBwcHBwcHBQUFBwcHBQUHB" +
"wcHBwcFBwcHBwcFBwcHBQUFBwcHBQUHBwcFBwcFBQUFBQcFBwcHBQcHBwcHBwcFBwcHBwcFBwcHBwcHBQUFBQUHBwUFBwcHBwcHBQcHBwcHBQUHBQUFBwcFBwcHBQUHBwcHBwcHBwcHBwcFBQUFBQU" +
"FBwcHBwUFBwUHBwcFBwcHBwcFBwcFBQUFBwcFBQUHBwcHBwcFBwUHBwUFBwUFBQcHBwcHBwcFBQUFBQUHBwcFBQcHBwcFBQUFBwUFBwcHBwcHBwcFBQUFBwcHBwcHBwcFBwUFBQUFBwcHBwcFBQUHB" +
"QcHBwcHBwcHBQUFBwcHBwcFBwcHBQcFBQUFBwcHBwcHBQcFBQcHBwcHBwcHBQUFBQUFBwcHBwcHBwcFBwUFBQcHBwUFBQcHBwcHBwUFBQUFBQcHBwcHBwcHBQUHBwcHBwcFBQcHBwcHBwUHBwcFBQU" +
"FBQcHBwUHBwcHBwUFBQcHBwcFBwcFBQUHBwcHBwcFBQcFBwcFBwcHBwcFBQUFBQUFBwcHBwcFBwcFBwcHBwcFBwcFBQUHBwcHBwUHBwUFBQUHBwcHBwcFBQUFBQUFBwcHBwUHBQUFBQUFBwcHBwUHB" +
"wUFBQcHBwcFBQcFBQcHBwUFBwcFBQcHBQcHBwcHBQUHBwUFBwcHBwcHBQUFBQcFBQcHBwcHBQcFBQUHBQcFBQUHBwcHBwcFBwUFBQUHBwUHBwcFBQUHBQUHBwcHBwcHBwcFBQUHBQcHBQUFBQcHBwc" +
"HBwcHBQUFBQUHBQcHBwcHBwUFBwcFBQcHBwUHBwcHBQUFBwUFBwcHBwcHBQUFBwcHBQUFBQUHBwUHBwcHBwcFBwUHBwcHBQUFBQUHBQUFBQcHBwcHBwcFBQcHBwcHBwUFBQUHBQcHBwcFBwcHBwcHB" +
"wUFBQcHBQcFBQcHBwcFBQcHBwcFBQUFBwcFBwcHBQUFBwcFBwcHBwcHBwcFBQUFBQUHBwcFBwcFBwcHBwcFBwcFBwcHBwcFBQUFBQUFBwcHBwcHBQUHBQUFBQUFBwcHBwUHBwcHBwUHBwUFBwcHBQc" +
"HBwcHBQcHBwcHBQUFBQcHBwcHBwcFBwcHBwcFBwUFBwcHBQUHBwUHBwcHBwUFBQcHBwUHBQcHBwcHBwUFBQUHBwcFBQUHBQUFBQcHBwUFBQcHBwUFBQUHBwcFBwcHBwUFBQUHBwcHBwcHBQUFBwcFB" +
"QcHBwcHBQcFBQUFBwcHBwcHBwUHBwcFBQcHBwcHBQcFBwcFBQcHBwcHBQcHBQUFBwcFBwcHBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQUFBQcHBQcHBQUHBwcHBwcFBwUFBQcHBQUFBQUHBwcHBwcHBwU" +
"FBQcHBQcFBQcHBQcHBwcHBwcFBQUHBwcHBwcFBwUHBwcFBQcFBQcHBwUFBQcHBQUHBwcHBwUFBQUHBwcHBwcHBQcHBQUHBwcHBwcHBwUFBwcHBwcHBwcFBwcFBQUHBwcHBQUFBQUHBwcHBwUFBQUHB" +
"wcHBQUFBQcHBwUFBQcFBwcHBQUHBwcHBwcHBwUFBQcFBQcHBwcHBwcHBQcHBQUFBwcFBwcHBwcHBwUFBQUFBwUFBwcHBwcHBwUHBQUFBQUHBwcHBwUFBwUHBwcHBwUHBwcHBwUFBQUFBQUHBwcHBwU" +
"HBwUHBwUFBQcHBQcHBwcFBwcFBQUHBwUFBwcHBwcHBwcFBwcHBwcHBwUFBwcHBQcHBQUFBQcHBQUHBQUHBwcHBwcHBwcFBQUFBwcFBQcHBwcHBwUHBwcHBQcHBQUHBQcHBwcHBQcHBwcHBwcFBQUFB" +
"QUHBQcHBwcHBwcHBQcHBwcHBQUHBQcHBwUFBQcHBwcHBwcHBQUFBwcHBwcHBQcHBwUFBwcHBQcHBwUFBQcHBwcHBwUFBQcFBQcHBwcHBwUFBQcFBQUHBQcHBwUHBwcHBwcHBQUHBwcHBQcFBQUHBQU" +
"HBwcFBwcHBwcHBwcHBwUHBwcHBwUHBwcFBQUFBQUHBQUHBwcFBQUHBwcFBQUHBQcHBQUFBwUHBwcHBwcFBwcFBQcHBwcFBQcFBwcHBwcHBwcHBQUFBQUFBwcHBwcHBwUFBQcHBQUHBwcHBwcHBQUFB" +
"wcHBwcHBwUHBQUFBQcHBQUFBQUHBwcHBQUFBQcFBQcFBQUFBQcHBwUHBwUFBwcHBwcHBQUHBwcHBQcFBQUFBwcHBwUHBQUHBwcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQUFBQUFBQcHBwcHBwU" +
"HBwUFBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQcHBQcHBwcHBQcHBQUFBQUHBwcFBQcFBwUHBwcHBwcHBwcHBQUFBQcHBwUFBQUHBwcHBwUHBwcFBQUFBwUHBwcHBQcHBwUFBwcHBwcHBwUFBQcFBQcHB" +
"wcHBwcHBwcHBQUFBQUFBwcHBwcHBQcFBwcHBwcFBQUFBQUHBwcFBQcHBwcHBQcHBwcHBwcFBwcFBwUFBQcHBwcHCAgYOGh4mLi4uMjIuLiYmHhYSDgYGAgICAgIGBgoSFhomJiouLjIyLi4qHhoWBg" +
"H58enl4dXR0c3N0dXZ3eHl6e31+fn+AgH9+fn18e3p3d3Z0dHN0dHV3eHl7fX6Ag4WGiYqLjIyMi4uKiYeGhYOCgYCAgICAgIGCg4WHiImKi4uMjIuLiYiHhIOBfXx6eXd2dXRzc3R0dXd4eXp7fH1" +
"/f39/f399fXx5eHd2dXV0c3N0gIGDhoeJiouLi4yLi4mJh4WEg4KBgYCAgICBgYKEhYaIiYmKi4yMi4uKh4aFg4GAfnp5eHV0dGpqamtsbW5yc3V4eXt8fX18fHt6eXh3dXR0dHR1d3l7fX+ChYuNk" +
"JWXmZubm5uamZeTkI6IhoN+fHt5eHd3d3h4ent8fX5+f39+fnx7eXVzcW5sa2loaGhoamtvcXR6fYCHiYyOkJKTlZWVk5KRjoyKiIeGhIOCgoODhICDhomMjpCUlZaWlpWTkY+OjIqIhYSDgoGCgoO" +
"EhYaHiImKiomJiISCgH57eHVwbmtnZmVkZGVnaWtucHN1e36AhIaIiYqKiomIiIaFhIKCgoKCg4SFh4iMjo+TlJWWlpaVlJKQjImGgHx5dHFvbVhWVFRUVlpdYGhrb3N2eXyAgYKDgoKBgH+Af4CCg" +
"4WHjZCUnJ+ip6mqqqqpp6CcmIyGgHNuaGJdWVZRUFBTVVhfY2drgIWLmJyhqKqsrKuqqKWhnpaSjoeEgn18e3t7e3x9fn5+fn16eXZxbmpnY2BdWVdWV1haYWVqcHZ7go+UmqSoq6+wr66tqqefm5e" +
"NiYV+e3l3dXV0dHV2d3h4eXl4dnVzcWxpZmFfXVtbW11fYWVuc3iFi5Gdoaatr7GysbCuqKSglpGMgn56dnNyb25ubm9wcXN0dXV1dXRycG5qZ2ZjYWFhYWJkXWRuhI6bsbrFzNTY3ICLmbG6xNHU1" +
"9fW083AubCdlYp5c2xiYF1cXFxcX2FjZmdoaGZlZGJgXlxbXF5hZXB2foeQmaO2vcbR1dfV083HvrWpkIV3XlNHNjAsKSgpKzU8RFVeaHuCi5GXm5+jo6SioJ6bmZiXl5iZm5yeoqOko6Kfl5KLhHt" +
"zaFVNRDUwKygoLC82PUdeaXeQnKm+xs3S1dfX0czGtq2jkIh+eHBqZV5dXFxdXmJjZWZoaGhmZWOAi5mxusTR1NfX1tPNwLmwnZWKeXNsZ2JgXVxcXF9hY2ZnaGhoZmViYF5cW1xeYWVpcHZ+kJmjt" +
"r3G0dXX19XTzb61qZCFd15TRz82MCwoKSs1PERVXmh7gouRl5ufo6OkoqCem5mYmJeXmJucnqKjpKOin5yXkot7c2hVTUQ1MCspKCgsNj1HXml3kJyps77GzdXX19HMxrato5uQiH5wamVeXVxcXV5" +
"iY2VmaGhoZmVjgIuZsbrEytHU19bTzcC5sJ2VioJ5c2xiYF1cXFxfYWNlZmdoaGZlYmBeXFtcXF5hZXB2fpCZo7a9xsvR1dfV082+tamQhXdeU0c/NjAsKCkrNTxEVV5ocXuCi5ebn6OjpKKgnp2bm" +
"ZiXl5ibnJ6io6Sko6Kfl5KLe3NoVU1EPDUwKygoLDY9R15pd4OQnKm+xs3V19fRzMa2raObkIh+cGplXl1cXF1eYGJjZWhoaGZlY4CLmaSxusTR1NfW083AubCnnZWKeXNsYmBdXFxcXl9hY2ZnaGh" +
"mZWJgXl1cW1xeYWVwdn6QmaO2vcbL0dXX1dPNvrWpkIV3bF5TRzYwLCgpKzU8RExVXmh7gouXm5+jo6SioqCem5mYl5eYm5yeoKKjpKOin5eSi3tzaGBVTUQ1MCsoKCw2PUdeaXeDkJypvsbN1dfX0" +
"czGvrato5CIfnBqZV5dXFxcXV5iY2VoaGhmZWNigIuZsbrE0dTX1tPNyMC5sJ2VinlzbGJgXVxcXFxfYWNmZ2hoZmViYF5dXFtcXmFlcHZ+kJmjrLa9xtHV19XTzb61qZ6QhXdeU0c2MCwoKSsvNTx" +
"EVV5oe4KLl5ufoaOjpKKgnpuZmJeXmJmbnJ6io6Sjop+Xkot7c2hgVU1ENTArKCgsNj1HUV5pd5Ccqb7GzdXX19XRzMa2raOQiH5wamVhXl1cXF1eYmNlaGhoZ2ZlY4CLmbG6xNHU19fW083AubCdl" +
"Yp5c2xiYF1cXFxcYWNlaGhoZmNhXlxYV1RTVFldY3J7hpCcp7LFzdTb3dvTzcO6rqKVem9iTkY/NzY2ODtARVJZX2xxdn1/gYGCgYGAgIGEhouUmqCutLm/wsbHxsO+rqWagnVoXE9EOSomIyQnLDt" +
"ET1llcHuQl5+pq66urKqopaGfmpiXlpeZnJ6foaGhoJuXkYJ6cFxSSEA3MSsmJiiAjJqyvMXR1NXU0s7IurGolo6Fd3NubGlpaGlra2xtbWtoZWJeWlZOS0lISUxWXWZveoWRqbS/0Nfb3t3Z08vDu" +
"KCUh29lWktGQkA/QEJJTlJdYmducXJxcG9tbWxsbnF3hIuVqbK8xczS1tjW0cG3q4+DdGhbUUY5NjQ2OkBNVFtiaG1zeXp7enh4dnZ4eX2CiJeeqLrByNLT09LNx72nm4xxZFdBOjMuLjA1O0FJWmF" +
"pgIybtL3GzNHS08zHwLCon4+Jgn97eXh5ent9fXt3c25oYVpTRD45MzI0PkVQWmh0gp6qt8rQ1dfV0cvDu7Kelox9eHNubm5wcXJ0dHNybGhiVlBKPzw6OTs+RFVea4aSobrEzdTY29vUzsayqZ6Ig" +
"Hhxa2dkZGVlaWtsbGxqZ2NfWk9LSEJBQ0tRWmNxfYuns7/S2Nvb19G/taqfk4l/cGtnZWZmam1ub29ubGRfWUxGQoCNm6i1vsfQ0dDIwbqpoZmSjIiEgYGBhYeHh4WAfXVuZlNKQTItKisuNT1JVGJ" +
"/jJqyu8LKysrBu7WtpZ+Yj4yKiouMkJKRkY+MhndvZU9GPC0oJiUoLDNIVGJ+i5mvtr7Bw8PCubSuopyYkpGQkZOVl5qcm5aSi3lwZFlNQzkpJSMmKjNIVGJ+ipehq7G3vLu5sa2onpqYlpWVl5yfo" +
"aWlpJ2Yj4d7cGNLQDYnIyElKzM8gI2btb7H0NHQyMG6sqmhmYaDgIGEhoyPkJCOi4V1a2BLQTktKyw1PUhUYm99lqCos7S0rqmknpmVko+Qk5uhpK2vr66qpZ2He21TRz0uKyosMThAVWFsgYiPlZW" +
"UkY+MiYSEhYyRmKmxuL/EyMnDvbScj4FlWU0+Ojg5PEFHVl9mcnV5eXZ0cG5qaGdpbnyGkaizvsfO09bSzMSuopR6b2VeV1RSVVlcZWptcG9taWVfWoCNm7O7w8jHxL+4samZko2GhoWKjpCWmJaVk" +
"IqBbWJWQTgxKiouMzxFUmx5hpyjqa6tq6ikn5qSkI+SlZqlq6+ztba0qqKXfW9gRj00Ly0tMT9IUmdweYSHiIeFgX54dnd9goqdp7LFzNDT0s7HsqaYe29jUk5LS01RVmFma3BvbWVgWlRPTEpOUlt" +
"wfYyotL/IztHSy8S6ppyRgXx4eHh5fIOGiIeEf29mW1BGPTUtLTCAjZy0vMPHxcC6s6yjlI+LiYqMlJibnp+emo2EeF5TRjMtKSkrMDlOWWeAiZKdnp6cmZWRi4mJjZKZqbC4v8PGxr+4rZOFdlpPR" +
"T46ODpCSVFhaG91dnVwbGhlYmBhaG95j5upwMnQ1dfV0MC2qY+EeWhkYWFiZWhwc3V1c29fVk5GPjg2OkBJY3KBnqm0ur+/vrOspZeSkI+SlpyiqKuwrqmYjX9hVEYzLy0uMzpDWGNtgI6dtb3DxMT" +
"Au6yjnJCNjJCVmZ+jqKiloJiAc2RIPTQuKysvPkhUa3V+iImJh4N/e3Z1eIOLlq24w8vR1NTJwbWZi31mX1lWWVxhZmxvc3JuYlpSQz47Oj5DTGVzgqCst8PExMC5sqqalI+MjpGboKSoqaiklYp9Y" +
"FNGMi0rLDA3QFdibn+FiYmGg356d3Z5fYSZpK/FzdLTz8i/saSWem5kWFdXXmNnbHBzc21oYVBIQoCOnam2vcLCvbenn5eOjo+TmJ2jra+upZ2Qc2VVSDw1LzA1PFFbZnd7fn58eXVraGhtc32Wo7H" +
"I0NXW1M/GrqKUfHVua21wdXl9gIB9d2RZTjkyLiwvND5YZXWRm6Srq6mjnpmUjYyPmqGqusDFxsO/tpyOfV9UST8/QUZNVFxqbnBuaWRXUk5OUlpkcX6OrbjDz8/Nv7aroJaOiIOEhpCUmJuZk4uAd" +
"WZLPzUpKSw8R1RhgI6dtr3Cwr23p5+Xko6Oj5ido62vrqWdkINzZVU8NS8wNTxRW2Z3e35+fHl1a2hobXN9lqOxvcjQ1dbQxq2gk2tmY2RnbHKSlpaPiH1PRDgvKScoS1ZkgIyYkJKQjIeBe4eGiZW" +
"eqqy1vMDAvLWdpZV5cGhjUFRhaG1xcoWAcGZcSzAvNz9MWWl4nLK4vLiyloeBfXx+gp2vt7/Iya+dkYFzY1ZJUE9RXWRtZ2ttbGhjW3WDk6mvsq28s6uim5WSf4STmqGpvbmnmop8bF8+MTAzQUpqf" +
"IGFhYN/ZFZQTU1ScImYp7XCy9K+urKdkoeNioiKjpSakJSUi4J2bmFUSUE9PDI7R19qdJOUko6Jg31hYWV1gI69yNHZ19HJvZyOdWxlYXh9iY6SlJN7dF9URzJAPEFIVGBufHaLkJSQi5qOioiJjZO" +
"Hnaeyvr/SwranmYl8cE1MTVZdZIOGhYJ8dGpBOTN1g5Opr7KtvLOropuVkn+Ek5qhqb25sqeaimxfPjEwM0FKanN8gYWDf2RWUE1NUnB7iZinwsvSvrqynZKHlI2KiI6UmpCUlIuCdn5uYVRBPTwyO" +
"0dfanSTlJKOiYN9YWFldYCOvcjR19nX0b2cjnVsZWF4fYOJjpKTe3RfVEcyQDw9QUhUbnx2i5CUkIualI6KiI2Th52nsr6/0szCtqeJfHBNTE1WXWSDhoWCfHRqQTkzdYOTqa+ysa28s6KblZJ/hJO" +
"aoaepvbmnmopsXz4xMDM5QUpqfIGFg39kVlBNS01ScImYp8LL0r66sqidkoeNioiOlJqQlJSLgnZ+bmFUQT08MjtHX2p0epOUkomDfWFhZXWAjpu9yNHZ19G9nI51bGViYXh9iY6Sk3t0X1RHPDJAP" +
"EFIVG58douQlJOQi5qOioiNk4edp7K+v9LMwraniXxwTUxNVl1kf4OGhXx0akE5M3WDk5+pr7KtvLOim5WSf4SLk5qhqb25p5qKbF8+NzEwM0FKanyBhYN/ZF1WUE1NUnCJmKfCy9K+urKonZKHjYq" +
"IjpSakJSUkYuCdm5hVEE9PDI7R1JfanSTlJKJg31hYWVrdYCOvcjR2dfRvZyOgXVsZWF4fYmOkpN7dGtfVEcyQDxBSFRufHaLkJSTkIuajoqIjZOHnaeyub6/0sK2p4l8cE1MTVFWXWSDhoV8dGpBO" +
"TMwdYOTqa+yrbyzopuVkpJ/hJOaoam9uaeainxsXz4xMDNBSmp8gYWDf2RdVlBNTVJwiZinwsvSv766sp2Sh42KiI6UmouQlJSLgnZuYVRBPTxAMjtHX2p0k5SSiYN9eGFhZXWAjr3I0dnX0cm9nI5" +
"1bGVheH2JjpKTe3RrX1RHMkA8QUhUbnx2gIuQlJCLmo6KiI2Th5Gdp7K+v9LCtqeJfHBTTUxNVl1kg4aFfHRqS0E5M3WDk6mvsq28s6uim5WSf4STmqGpvbmnmop8bF8+MTAzQUpqfIGFhYN/ZFZQT" +
"U1ScImYp7XCy9K+urKdkoeNioiKjpSakJSUi4J2bmFUSUE9PDI7R19qdJOUko6Jg31hYWV1gI69yNHZ19HJvZyOdWxlYXh9iY6SlJN7dF9URzJAPEFIVGBufHaLkJSQi5qOioiJjZOHnaeyvr/Swra" +
"nmYl8cE1MTVZdZIOGhYJ8dGpBOTN1g5Opr7KtvLOropuVkn+Ek5qhqb25sqeaimxfPjEwM0FKanN8gYWDf2RWUE1NUnB7iZinwsvSvrqynZKHlI2KiI6UmpCUlIuCdn5uYVRBPTwyO0dfanSTlJKOi" +
"YN9YWFldYCOvcjR19nX0b2cjnVsZWF4fYOJjpKTe3RfVEcyQDw9QUhUbnx2i5CUkIualI6KiI2Th52nsr6/0szCtqeJfHBNTE1WXWSDhoWCfHRqQTkzdYOTqa+ysa28s6KblZJ/hJOaoaepvbmnmop" +
"sXz4=\"},\"five\":{\"f0\":123.83,\"n\":8977,\"b64\":\"AAAAcHBwcHBQUHBwcHBQUFBwcHBQUFBwcHBwcHBwcHBwUFBQcHBwcHBwUFBwcHBQcHBwcHBQcHBwUFBwcHBwcHBwcFBQUHBwUHBwcFBwcF" +
"BQUFBwcHBwcFBwcFBQUFBQUHBwcHBwcHBwUHBwcFBQcHBQUFBQcHBwcHBwcFBwcHBwcHBQUFBwcHBQUHBwcHBwcFBwcHBwcFBwcHBQUFBwcHBQUHBwcFBwcFBQUFBQcFBwcHBQcHBwcHBwcFBwcHBw" +
"cFBwcHBwcHBQUFBQUHBwUFBwcHBwcHBQcHBwcHBQUHBQUFBwcFBwcHBQUHBwcHBwcHBwcHBwcFBQUFBQUFBwcHBwUFBwUHBwcFBwcHBwcFBwcFBQUFBwcFBQUHBwcHBwcFBwUHBwUFBwUFBQcHBwcH" +
"BwcFBQUFBQUHBwcFBQcHBwcFBQUFBwUFBwcHBwcHBwcFBQUFBwcHBwcHBwcFBwUFBQUFBwcHBwcFBQUHBQcHBwcHBwcHBQUFBwcHBwcFBwcHBQcFBQUFBwcHBwcHBQcFBQcHBwcHBwcHBQUFBQUFBw" +
"cHBwcHBwcFBwUFBQcHBwUFBQcHBwcHBwUFBQUFBQcHBwcHBwcHBQUHBwcHBwcFBQcHBwcHBwUHBwcFBQUFBQcHBwUHBwcHBwUFBQcHBwcFBwcFBQUHBwcHBwcFBQcFBwcFBwcHBwcFBQUFBQUFBwcH" +
"BwcFBwcFBwcHBwcFBwcFBQUHBwcHBwUHBwUFBQUHBwcHBwcFBQUFBQUFBwcHBwUHBQUFBQUFBwcHBwUHBwUFBQcHBwcFBQcFBQcHBwUFBwcFBQcHBQcHBwcHBQUHBwUFBwcHBwcHBQUFBQcFBQcHBw" +
"cHBQcFBQUHBQcFBQUHBwcHBwcFBwUFBQUHBwUHBwcFBQUHBQUHBwcHBwcHBwcFBQUHBQcHBQUFBQcHBwcHBwcHBQUFBQUHBQcHBwcHBwUFBwcFBQcHBwUHBwcHBQUFBwUFBwcHBwcHBQUFBwcHBQUF" +
"BQUHBwUHBwcHBwcFBwUHBwcHBQUFBQUHBQUFBQcHBwcHBwcFBQcHBwcHBwUFBQUHBQcHBwcFBwcHBwcHBwUFBQcHBQcFBQcHBwcFBQcHBwcFBQUFBwcFBwcHBQUFBwcFBwcHBwcHBwcFBQUFBQUHBw" +
"cFBwcFBwcHBwcFBwcFBwcHBwcFBQUFBQUFBwcHBwcHBQUHBQUFBQUFBwcHBwUHBwcHBwUHBwUFBwcHBQcHBwcHBQcHBwcHBQUFBQcHBwcHBwcFBwcHBwcFBwUFBwcHBQUHBwUHBwcHBwUFBQcHBwUH" +
"BQcHBwcHBwUFBQUHBwcFBQUHBQUFBQcHBwUFBQcHBwUFBQUHBwcFBwcHBwUFBQUHBwcHBwcHBQUFBwcFBQcHBwcHBQcFBQUFBwcHBwcHBwUHBwcFBQcHBwcHBQcFBwcFBQcHBwcHBQcHBQUFBwcFBw" +
"cHBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQUFBQcHBQcHBQUHBwcHBwcFBwUFBQcHBQUFBQUHBwcHBwcHBwUFBQcHBQcFBQcHBQcHBwcHBwcFBQUHBwcHBwcFBwUHBwcFBQcFBQcHBwUFBQcHBQUHBwcH" +
"BwUFBQUHBwcHBwcHBQcHBQUHBwcHBwcHBwUFBwcHBwcHBwcFBwcFBQUHBwcHBQUFBQUHBwcHBwUFBQUHBwcHBQUFBQcHBwUFBQcFBwcHBQUHBwcHBwcHBwUFBQcFBQcHBwcHBwcHBQcHBQUFBwcFBw" +
"cHBwcHBwUFBQUFBwUFBwcHBwcHBwUHBQUFBQUHBwcHBwUFBwUHBwcHBwUHBwcHBwUFBQUFBQUHBwcHBwUHBwUHBwUFBQcHBQcHBwcFBwcFBQUHBwUFBwcHBwcHBwcFBwcHBwcHBwUFBwcHBQcHBQUF" +
"BQcHBQUHBQUHBwcHBwcHBwcFBQUFBwcFBQcHBwcHBwUHBwcHBQcHBQUHBQcHBwcHBQcHBwcHBwcFBQUFBQUHBQcHBwcHBwcHBQcHBwcHBQUHBQcHBwUFBQcHBwcHBwcHBQUFBwcHBwcHBQcHBwUFBw" +
"cHBQcHBwUFBQcHBwcHBwUFBQcFBQcHBwcHBwUFBQcFBQUHBQcHBwUHBwcHBwcHBQUHBwcHBQcFBQUHBQUHBwcFBwcHBwcHBwcHBwUHBwcHBwUHBwcFBQUFBQUHBQUHBwcFBQUHBwcFBQUHBQcHBQUF" +
"BwUHBwcHBwcFBwcFBQcHBwcFBQcFBwcHBwcHBwcHBQUFBQUFBwcHBwcHBwUFBQcHBQUHBwcHBwcHBQUFBwcHBwcHBwUHBQUFBQcHBQUFBQUHBwcHBQUFBQcFBQcFBQUFBQcHBwUHBwUFBwcHBwcHBQ" +
"UHBwcHBQcFBQUFBwcHBwUHBQUHBwcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQUFBQUFBQcHBwcHBwUHBwUFBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQcHBQcHBwcHBQcHBQUFBQUHBwcFBQcFBwUH" +
"BwcHBwcHBwcHBQUFBQcHBwUFBQUHBwcHBwUHBwcFBQUFBwUHBwcHBQcHBwUFBwcHBwcHBwUFBQcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQcFBwcHBwcFBQUFBQUHBwcFBQcHBwcHBQcHBwcHBw" +
"cFBwcFBwUFBQcHBwcHCAgYOHiImLjIyMjIuLiYiHhIOCgIB/f3+AgIKDhIaHh4mJiYmJiIeFhIJ+fHt3dXRzcnFxcXFydHV3ent8fn+AgIGBgYCAf318fHt6eXl5enp8fX+ChIaJioyNjo+Pj4+OjI" +
"uJhoSDgYB+fXx7e3t8fH5/f4CBgoKDg4KBgH98e3l4dnV0cXFwcHFxc3V2eHp7fYGChIaHh4iHh4aGhYSCgYB/f39/gICChIWGiImKjI2NgIGDh4iJi4uMjIyLi4mIh4SDgoGAgH9/gICCg4SGh4eI" +
"iYmJiYiHhYSCfnx7eXd1dHJxcXFxcmtucHN1eHt/gYOEhYWEg4OBgICAgICBg4WHi42Pk5SVlpaVlJCOi4SAfXVybmxpaGZmZ2hrbnB1eHt9f4GDhIWFhIODgYCAgICAgYOFh4uNj5OUlZaWlZSQjo" +
"uEgH11cm5paGZmZmdoa25wdXh7f4GDhISFhYSDg4GAgICDh4uOkZOXl5iWlZSPjYuIhoSCf359fX1+gICBgoKCgoB/fXl3dXBubGppaGdoamxxdHiAg4eOkZOVl5eYlpWUj42LhoSCgH9+fX19foCA" +
"gYKCgoGAf315d3VwbmxpaGdoaGpscXR4gIOHjpGTlayurqqno5mUjoJ9eXZycG9ubm9xcnN0dHNxcG5sa2pqa2xudXl/i5GXnaOnq7Cwr6ijnY6GfnZuZ2FWU1JSVFdgZWtxgIePnqOorq+uqaahnJ" +
"aQin56dW9tbWxtbm9wcXJ0dHNycG9tbWxtb3F0eX2Dj5Sapamsr66tqaWfmYmBeWljXFNRUFFSVVljaG57gISNkJGSk5OSkI+OjIuLjI2OkJGSk5OSkYuHg3dxbGVgW1dRUFBWWV9tdX2NlJyip6ut" +
"r66rop6Yi4aAe3ZzcG1sbG1ucHJzc3Nzc3Jvbm1sbG1xc3d8gYeNsbzH1N3czsSun4x6ZnyOosLO3uXj3dbCtqaFdm1VTUY7PEFNVWRsdHuBg4WGhoyLi4uNiIyPlZ+rr7OzsJ+Wi39xaltCOCghIi" +
"hDUGFyhpikxdHb6efhzL6mlYJxX0tBOTMvM0NMWGp2gIqYlpmZmJeZl5SMjI2PkpSeoKGgkYyDb2RfVEpCOiwtMkRQZomarbXF0dri6OLMvqt/bVpLPDgvKCovO0ZUcYWSnKasqayrqKahnJOPhoSE" +
"hISNjo18jqLCzt7l493WwramhXZtVU1GOzxBRk1VZHR7gYOFhoaMi4qLi42Mj5Wfq6+zs7Cmn5aLcWpbQjgoISIoL0NQYYaYpMXR2+nn4dnMvqaCcV9LQTkzLzNDTFhqdoCKmJaZmZiXmZeUk4yMjZ" +
"KUnqChoJGMg3pvZF9KQjosLTJEUGZ2iZqtxdHa4ujizL6rk39tWjw4LygqLztGVGJxhZKmrKmsq6imoZyTj4aEhISEjY6NfI6iws7e4+Xj3cK2poV2bVVNRkM7PEFNVWR0e4GDhYaGhoyLi4uNjI+V" +
"n6uvsrOzsJ+Wi3FqW0I4KCMhIihDUGGGmKTF0dvp5+HZzL6mgnFfS0E5My8zOkNMWHaAipiWmZmYl5uZl5SMjI2SlJ6goaCdkYyDb2RfSkI6LC0yOERQZomarcXR2uLo4tnMvqt/bVo8OC8oKi87Rl" +
"RicYWSpqyprKuopqGcl5OPhoSEhI2OjXyOorLCzt7l493CtqaFdm1gVU1GOzxBTVVkdHuBf4OFhoaMi4uLjYyPlZqfq6+zs7CflotxaltCOCgjISIoQ1BhhpikxdHb4Onn4cy+poJxX0tBOTUzLzND" +
"TFh2gIqYlpmZmZiXmZeUjIyNkpSeoKChoJGMg29kX0pCOjYsLTJEUGaJmq3F0dri6OLZzL6rf21aPDgvKCovMDtGVHGFkqasqayrqKSmoZyTj4aEhISNjo2NfI6iws7e5ePdwramloV2bVVNRjs8QU" +
"1VZGx0e4GDhYaGjIuLi42Mj5Wan6uvs7Own5aLcWpbT0I4KCEiKENQYYaYpLXF0dvp5+HMvqaCcV9YS0E5My8zQ0xYdoCKkZiWmZmYl5mXlIyMjY+SlJ6goaCRjINvZF9KQjo2LC0yRFBmiZqtxdHa" +
"4OLo4sy+q39tWjw4LyooKi87RlRxhZKmrKmsrKuopqGck4+GhISEhY2OjXyOosLO3uXj3dbCtqaFdm1VTUY7PEFNVWRsdHuBg4WGhoyLi4uNiIyPlZ+rr7OzsJ+Wi39xaltCOCghIihDUGFyhpikxd" +
"Hb6efhzL6mlYJxX0tBOTMvM0NMWGp2gIqYlpmZmJeZl5SMjI2PkpSeoKGgkYyDb2RfVEpCOiwtMkRQZomarbXF0dri6OLMvqt/bVpLPDgvKCovO0ZUcYWSnKasqayrqKahnJOPhoSEhISNjo18jqLC" +
"zt7l493WwramhXZtVU1GOzxBRk1VZHR7gYOFhoaMi4qLi42Mj5Wfq6+zs7Cmn5aLcWpbQjgoISIoL0NQYYaYpMXR2+nn4dnMvqaCcV9LQTkzLzNDTFhqdoCKmJaZmZiXmZeUk4yMjZKUnqChoJGMg3" +
"pvZF9KQjosLTJEUGZ2iZqtxdHa4ujizL6rk39tWjw4LygqLztGVGJxhZKmrKmsq6imoZyTj4aEhISEjY6NfI6iws7e4+Xj3cK2poV2bVVNRkM7PEFNVWR0e4GDhYaGhoyLi4uNjI+Vn6uvsrOzsJ+W" +
"i3FqW0I4KCMhIihDUGGGmKTF0dvp5+HZzL6mgnFfS0E5My8zOkNMWHaAipiWmZmYl5uZl5SMjI2SlJ6goaCdkYyDb2RfSkI6LC0yOERQZomarcXR2uLo4tnLu6p8alk9OzUzNz5KVWBqdYWLk5SMiY" +
"eFi4yPk5mfn62ytr66tHyPobPDzt3i39i6rZ+Ac29mXlpYU1daZGhxdHJwZmNfXFphZHJ8h5yptsHM2t7a08mikH1VSzwmIRocJC46X3B/nKanr7Cuqq2noZaTiomLjZmbnZ2aj4l2a19MQjgtJSgu" +
"OkdWhJapxNHa4d7f1ce4qX5vYUtFSElNUlhZYGZwc3t6eHZsa2x0gYqTn6q1wcjMy8vCppWDalVENB0eHSYwNVZoeYqirrjFxr60raWblI2JfI+hw87d4t/Yuq2fkIBzb2ZlZV1iZmx7eXZvaGBBOj" +
"Y2SVJufpKqusnU6uzq2s2wjn5vZmFdXF5jWGJnaXZzbV5JRD88PEBgbX2kp7jT29/s597Ro5KAYFZbVFZZXVVcYWhpdWxmYEdDQ0ZMYm6PoLHF0dnf6eHFtJSCb2BTUE5NVVtTYWZpaXZzbmNQTUxQ" +
"V36Mna6/wM3d3tzWybeDcWBRRT5GR0xSVFxja2t5dnFsaHmLnr/J3t/a0sesoJN9dn57fYB5fX15gnpwZFlOLCUjKkBNcYOXnbC+yuTk38zApIh9c2x1dHR6fnN2dXJyaV9USjMtKiw0X3GGr7LBzN" +
"PT383BtIyCe3Z4iY6TmJqJg3ldW0wxKCQbJTNDWHmOr7rCt7Ouq6OdmJaXjZqjqL+/uqaXdmRPPS0lIiMzMkJkcoCXn6GimYaCe3yOnqm2wr/Izs3Gx6WRfEg5LSckNDpOWmV5jKDAyNvY0Ma7oJWL" +
"fn2LlJqelpWPh3p6aUc5LRMUGjRTZnmOnaytr6+xqqOYlomMk5ujwcfIwLebdmNPSzkuJiYfKUZVZIuSmJmXhYF3dIOMlKCtusbU1d/XybmlbltJMjo5QktVUlxkam55dWljYFJXYW2MnK/R3trf2d" +
"C9q5mIemJcXmNphYiIfmVYSTksISUoMEBUZ46dtbu7ubOVjoiGmaC3w83NzMe8ramUa1k9eY2gvsbX1c7FupaNiImOpLW8wbOvp5p1b1s5LikfKDRCX2x4hIRzZmBaZGhwfY6SpcjU3Orj17aWh3hu" +
"aHR7gYeEhIFuYF4+MSciFBolR2d7nKivoZyWj4ePjpScmbXBy+Lf18q3pIFaSz9FR01gW2JnaWdhXFJILi80TV+Blqu9zM3NyLSpq5iTkoeNlZ2ru7mpmohSPi4nJScuOkhJZnF4iYV/cV5cXmRue6" +
"2/0Ojf3nmNoLG+w9PHu7GPiYiTq7bBydDRtKeUaWRROjgsMj1IVHR3dmhdRTQxMklWZnqlqbrKyNK9saaJiIuSm6a+yszGnYt2S0k8NTI2P0hUX3h3cmBWPzk3OkJwg5nBwcrNxry+saSbhoqQoqzB" +
"w76zooFtVzI2LzM9SVZhaGx5dGxaUT5CSliOorbX0NLQyLyvo5mTlY6Wp6+/vbWqmmJOOyErLDxKWFdja25pb2ZXUURTYXSJeY2hvsPTx7uxj4mIjJOrtsnQ0bSnlGlkUUM6OCw9SFR0d3ZoXUU0MT" +
"JJVmZ6pam6ysjSvbGmnImIi52py9fVzpeDbllHUEpOV2JhaGlxZFVGOS8WIS9BgJOisZqUioJ5cYiRnqy+zdva59nHtaNxa2l0k52op6FuWkYzNywoMT04V2Nrf3huY1o+O0lXaaq+zt3Hv7SomqSZ" +
"naOms7/G18y9p5J9Rj06QmJsfoFqY1ZHN3WKnbi8z76zpp2Eg4mgw9Hk5uGwnYhgaGBeYGhcbnR1e25dOy4RDxQfLml8i5uGgW9mdHF1fYucr8HX2urRwrGNgXt6haSvvL24h3NeSUs9NTZAOFJdZH" +
"dvY1dMLSgxPk+PpLa1t7Kfk56YlpmiqLfF1efeuqWQal5YWX+KlJuWdlE9KjAoJitHQ1NqbWlqX1NNNzxIcIawztPRqZ2QhoKZob3Nx9XSybqlkH9zWFlqdX91i5+3ucm0p52WgIaRsdbj7efan4p3" +
"aHVzd4qViIqCc2BMOi0oFBw5Sll/fndLPzYxMzxgiqC0t7m0n6edlpWbkbHBzu3n2rSfd2hgXmKKlZ2fgnNLNzooKTE+OUpZan53YFRLMzxLX3WgtMzOtJ+SiJWbprXGwc7Y0sW0n4xgXmJqdYCdn5" +
"eISzclEykxPk5fbmppYmBUS0hRS191i5/Mzsm0koiAhqbE0t3ixr6ykZ2RcoSUpqW8sqeclnuEkrHa4uDVx5uLf3eUnae6v6CKemZxYVhUXk5YaGh+ZldIPRscI0BsfI2NiFhOR0Vmb3+ktKavqqGm" +
"nZmhkaCuu8Tj1si3fHNudpymsLS1rnVjUFFMTl9rWmJlYllaTEA6IzBQYYuSlZGKWlJPWYOVucfQtrOqn6SdnKq3qsDFwtbIt6WJZ2Z0fqOsqJ1fTTwwKkZMY295YVtRUUY+PUJMQWRyfZyVjHKElJ" +
"+mpbynnJZ7hJKx2uLk4NXHi393lJ2nur+gmYp6ZmFYVF5OWGhofnRmV0gbHCNAbHyNjYhYTkdFZm9/pLSmr6qhpp2ZmqGRoLvE49bIt3xzbnB2nKa0ta51Y1BRTE5VX2taZWJZWkxAOiMwP1Bhi5WR" +
"ilpST1mDlae5x9Czqp+knZyqt6rAxcLWyLeliWdmdH6jrKidjl9NPCpGTGNveWFbUUNRRj5CTEFkcn2clYyCcoSUpqW8p5yWe4SSorHa4uDVx4t/d5Sdp7K6v6CKemZhWFReTlhoaH50ZldIGxwjQG" +
"x8jY2IYlhOR2Zvf6S0pq+qobGmnZmhkaC7xOPWyLenfHNudpymtLWudWNQQVFMTl9rWmViWVpMQDo6IzBQYYuVkYpaUk9Zg5WnucfQs6qfpJ2cqreqt8DFwsi3pYlnZnR+o6qsqJ1fTTwqRkxjb3li" +
"YVtRUUY+QkxBZHJ9nZyVjHKElKalvKeclpR7hJKx2uLg1ceLf3eUnaeyur+ginpmYVhUXk5YYmhofmZXSBscI0BsfIaNjYhYTkdmb3+ktKatr6qhpp2ZoZGgu8Tj4NbIt3xzbnacprS1roZ1Y1BRTE" +
"5fa1plYllaTEA6OiMwUGGLlZGKWlJPUVmDlbnH0LOqn6SdnKGqt6rAxcLIt6WJZ2ZsdH6jrKidX008MkVIT1hibGFhXEhTSD0/MDpJV2aRlpZ1hJKkprmqopqVf4OKo6/Q3dzWqp2Qhn6Rk6CosaGe" +
"lo+AcWRZVUBMVF19fHdjQTUrJCImTltpgHBxaGBtZmNjaGt6iaWsxL20q6KHhIaWtsLX29u2qpyBjoqKjpWIlpiWmIp7XFI4NztBS3J3eW9QRC4nJTxET11lcHd5c4FybWxwZXB/n6vIy8a9lY2IiI" +
"yps8rT2L21qJ+SiIKAg3SEio6ckoVlQzgvMjpYYmxzdlxTdYSSpKa5sqqimn+DiqOv0N3c1reqnZB+kZOgqLGhnpaKkId9bGZOT1JWdHd3d3NuUkQ9OUxPVGRsX2VqbW19endyc2BtdoCor7S3t6Cd" +
"k4+MoKOptaessLKxrbSso5R6d3h7fpeam5qSdWxZUElXV1peT1RZXl1wZV9ZPDs9QUhQboCHjHp5dm9sgIGEipGPmKCrrMG4s62PjY2PlJm0vcDAo5yUgY2GgX5+f3F1d3eJg3V/iI+VmK6ppaGGhY" +
"eRmLS8wsfJsauklI2clZWXmoqOkJGOnYyCeVNOS0tNUWpzdnZcV1BCUU5NUVdJUlpibYSEf3x4X2BkaXKQmayzt6SinpSkoaChpZWjqKywvryzrqeSi4WAe4mKjZCSg4F9d3B3cGFdWEdJS1JWZ2pr" +
"a2lUUExGRFJgoGBgoKCgYGBgYGBgoKCgoGCgYGBgYGBgYKBgoGBgYKBgYGBgeX+Hk5aYp6ajoZyMjJCUmbK4vMDBtLKppJ2fm5iVloqMjpGSnZuWiIFrXVhUUmBhY2lsYGBfW2BbVk5NTUFESVBdcH" +
"Z9fn5tamhnZ3Z5hIqSk5mfpbOysK2pppOTlJqesbq9vr2tqqWXkZiNioh6fX6AgYOQiYR9bllSSUdHVlhcYGdcYGBgYGBgYKBgoKBgYGCgYGCgoGBgYKCgoKCgYGBgYGBgYKCgoKB5f4eTlpimo6Ge" +
"nIyMkJSZsri8wbSyrqmknZ+bmJWWio6RkpGdm5aIgWtdWFRgYWNpbGBhYF9bWmViXFpZTE1RVFlrcHh7fnJycnBue3t8fH94fIKMkZaqq6ysq5uZlJKRnp+hpqmdoKKjo6Csp56alH57eHZ1hISHiI" +
"h6eXZuanNpZWGgYKBgYGBgYKCgoKCgoKBgYGBgYGCgYGCgYGBgYGCgYGBgYGBgYHl9g4yOkaCgn5yMi4qKi42hpKivsqanp6Sinqijm5iVhISEhpWWl5eVk4F9eG1ocWlnZVdYWlxeYGFwcG5pWFVP" +
"TUxMW1xfaGxjbG9zdoSEg4KBgHFydHuNkpyhpqmeoKGgnamkoqCQkZKUlpmbrq+vrJyYjoqEiYaCgX+AcnR1dnaDgWCgoGBgoGBgoKCgoGBgYGBgYGCgoKCgoGBgYGCgYGBgoGBgYGB5fYOHjI6RoK" +
"CfnIyLiouNkKGkqK+ypqenpqOhnpyZlpSQj46Njo6PkJCQj42MioeEfXp3cG5saWloaWlqa2xsbWtqaWVjYV5cW1lYWFlcXmFmaWttb3BxcnFxcG9vcHByc3Z4e4KFiY+Rk5aXl5aWlZSTk5KUlZaa" +
"nJ+jpKamp6emo6GgoKCgYGBgYGBgoGBgYGCgYKBgYGBgYKCgoKCgYGBgoKCgYGBgYICDhoyOkJKTk5OTkpGQkJCSk5WXmpyfo6Wmp6emo6GfmpeVk5KRkJCRkZOTk5OSkI6MiYaAfHlzcW9sbGxsbW" +
"1ub29vbWxqZWNhXlxaWVhYWVxeYWVoamxtbm9vbm5tbGxsbW9xc3Z5gIOGjI6Qk5OTk5KRkZCQkJKTlZqcn6Olpqenp2BgYGBgoKBgYGBgoKBgYKBgYKBgYKBgYGBgoKCgoKBgYGBgYGBggIOGjI6Q" +
"k5OTk5OSkZCQkJKTlZqcn6Olpqenp6ajoZ+al5WSkZCQkJGRk5OTk5KQjImGg4B8eXNxb2xsbG1tbm5vb29tbGplY2FcWllYWFhZXF5hZWhqbW5vb29ubm1sbGxtb3N2eYCDhomMjpCTk5OTkpGQkJ" +
"CRkpOVmpyfo6Wmp6emYGBgoKCgoKCgYGCgYGBgYGBgoGBgYKBgYKCgoKBgYGBgYGBgYGCAg4aMjpCTk5OTkpGQkJCRkpOVmpyfo6Wmp6empaOhn5qXlZKRkJCRkZKTk5OTkpCMiYaAfHl2c3FvbGxs" +
"bW1ub29vbm1samVjYVxaWVhYWVpcXmFlaGptbm9vbm5tbGxsbG1vc3Z5gIOGjI6QkpOTk5OSkZCQkJKTlZeanJ+jpaanp6agoKCgoGBgYGBgYGBgoKBgYGCgoGBgYGBgYKCgoKBgYGBgYGBggIOGjI" +
"6QkpOTk5OSkZCQkJKTlZeanJ+jpaanp6ajoZ+cmpeVkpGQkJGRk5OTk5OSkIyJhoB8eXNxb21sbGxtbW5vb29tbGplY2FeXFpZWFhZXF5hZWhqbG1ub29ubm1sbGxtb3FzdnmAg4aMjpCTk5OTk5KR" +
"kJCQkpOVmpyfoaOlpqenYGBgYKBgoKCgYGBgoKBgYKBgYKBgYGBgYKCgYGCgYKBgoGBgYGCAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbG" +
"xsbG1tbm9vb21samVjYV5cWllYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6egYKBgYGCgYGCgoGCgYGBgYGCgYGBgoKBgoGBgYKCgYGCgYGBgYICD" +
"hoyOkJOTk5OTkpGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhoOAfHlzcW9sbGxtbW5ub29vbWxqZWNhXFpZWFhYWVxeYWVoam1ub29vbm5tbGxsbW9zdnmAg4aJjI6Qk5OTk5" +
"KRkJCQkZKTlZqcn6OlpqenpqBgYGBgYKCgYGBgYKCgoKBgYGBgYKCgoKBgYGBgYGBgoKCgoKCggIOGjI6Qk5OTk5KRkJCQkZKTlZqcn6OlpqenpqWjoZ+al5WSkZCQkZGSk5OTk5KQjImGgHx5dnNx" +
"b2xsbG1tbm9vb25tbGplY2FcWllYWFlaXF5hZWhqbW5vb25ubWxsbGxtb3N2eYCDhoyOkJKTk5OTkpGQkJCSk5WXmpyfo6Wmp6emoKCgoKBgYGBgYKCgoKCgoGBgYGBgYGCgoKBgYGBgoKBgYGBgYI" +
"CDhoyOkJKTk5OTkpGQkJCSk5WXmpyfo6Wmp6emo6GfnJqXlZKRkJCRkZOTk5OTkpCMiYaAfHlzcW9tbGxsbW1ub29vbWxqZWNhXlxaWVhYWVxeYWVoamxtbm9vbm5tbGxsbW9xc3Z5gIOGjI6Qk5OT" +
"k5OSkZCQkJKTlQ==\"},\"six\":{\"f0\":123.63,\"n\":8821,\"b64\":\"AAAAUICAgIBQUICAUFBQgICAUFBQUICAUFBQgICAUFBQgICAUFCAgIBQUFCAgICAUFCAgIBQUICAgICAUICAgFBQgICAgIBQ" +
"gICAgFBQgICAgFBQgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUFCAUICAUICAgICAUFCAgFBQUICAUICAUICAgFBQUICAgFCAgICAgFBQUICAUFCAgICAUFCAgICAUICAgICAUICAgIBQgICAgI" +
"CAgFCAgIBQgICAgFBQgFCAgIBQgICAgFCAgFCAgFBQgICAgIBQgICAgFBQgICAgFCAgIBQUIBQgIBQUFCAgIBQUICAgFBQUFCAgIBQUICAgIBQUICAgIBQUICAUIBQUICAgFCAgICAUICAgFCAgFCA" +
"gIBQUIBQgIBQgFBQgIBQUIBQgIBQgFCAUFCAUICAgIBQgFCAUFBQgICAUFCAgFCAgIBQgFCAUFCAgIBQgICAUFCAgIBQgFBQgIBQgFCAUFCAUIBQgICAUIBQgICAgFCAgICAUICAUFCAgFBQgIBQUI" +
"BQUFCAgFCAgIBQgFCAgICAgFCAgICAUICAgICAUIBQgIBQgFCAUFCAUICAUFBQgFCAgIBQgICAUFCAgFCAUFBQgIBQgFBQUIBQUICAUIBQgICAgFCAUICAgICAUICAUICAUICAUIBQgICAgFBQgICA" +
"gFCAgICAgFCAgICAgFCAgICAUICAgICAUIBQgFBQUIBQgFBQUICAgFBQUICAgFBQUICAgFBQgICAUFBQgICAUFBQgICAUICAgICAUFCAgIBQUFCAgIBQUIBQUIBQUICAgIBQUICAgIBQgICAgFBQgI" +
"CAgFBQUICAgIBQgICAgFBQgIBQUFCAgIBQUFCAgIBQUFCAgIBQUFCAgFBQgIBQgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgFBQUICAUFBQUICAUFBQgICAUFBQgFBQgICAUIBQUICA" +
"UIBQgFBQgIBQUFBQgFCAUICAgIBQgFBQgIBQUICAgFCAUICAgIBQUICAgIBQgICAgIBQgIBQUIBQgICAgFCAgICAgIBQgFCAgIBQgFCAgFCAgFCAgFBQUIBQUFBQgICAgFBQgIBQUFCAgICAgFCAgF" +
"BQUFCAgFBQgICAgFCAUFCAgFBQgICAgIBQgICAUFBQgICAUIBQgICAgFCAUFCAUFCAgICAUFCAgIBQUFCAgICAUFCAgIBQUFCAgFBQUICAgFBQUICAgFBQgICAgFBQUICAUFBQgIBQgFBQUICAUICA" +
"gFCAUFBQgICAUICAUICAUFBQgICAUFBQgICAUICAgICAUICAgIBQUICAgFBQUIBQUIBQgICAgIBQUICAgFCAUIBQUFBQgICAgFBQgICAgIBQgFCAgFCAUIBQUFCAgFCAgFCAUIBQUFCAgFBQUICAgI" +
"BQUIBQgFBQUICAgFBQgICAgFCAgICAUFCAgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUICAgICAUICAUFCAUICAgIBQUICAgIBQgFCAUFBQgICAUFBQgICAUFBQgIBQgICAgICAUFCAgIBQgIBQ" +
"gICAUFCAgFCAUFBQgICAUFBQgIBQUFBQgIBQUICAgIBQUICAUIBQUICAUIBQUICAUIBQgFBQgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFBQgFBQgIBQgFBQgFCAgFBQgFCAUICAUFCAUIBQUFCAgF" +
"BQUFCAgFBQUICAgFBQUICAgFBQUICAgFCAgICAUIBQUICAUFCAgFCAUFCAgICAUFBQgICAgFCAgIBQUFCAgICAUICAUFCAUFBQgIBQUIBQgICAUICAgICAUFCAgIBQUICAUFCAUICAgIBQUICAgIBQ" +
"gFCAUFBQUICAUFBQgIBQUFBQgICAUFBQUICAUICAUICAUFBQgIBQUICAgIBQUICAgIBQUICAgFBQgIBQUIBQUICAgIBQgICAgFBQgICAgFBQgIBQUFCAgICAgFCAgICAgIBQgIBQUFCAgICAgFCAgI" +
"BQUIBQgIBQUFCAgFCAgFCAgFCAgFCAUIBQUFCAgFBQUICAUIBQUICAgFCAgICAUIBQUICAgFCAgIBQgFBQUIBQUFCAUFCAUIBQgIBQUICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFCAgIBQUFCA" +
"UICAUFBQgICAUFCAgIBQUFCAgIBQgICAgIBQUICAgFBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgICAgFBQgICAgFCAgICAgFCAgICAUFCAUICAUFCAgICAUFCAUICAUFCAUIBQUICAgFBQUIBQgF" +
"CAgICAgIBQUICAgIBQUICAUIBQUIBQgICAgFCAgFCAgFCAUIBQUIBQUIBQUIBQgIBQUIBQgICAgFCAgFCAgFCAgIBQUICAgFCAgFBQgFCAgFBQgFBQUICAUICAgFCAgIBQUICAUIBQUICAUIBQUICA" +
"UFCAgICAUFCAgIBQUFCAgIBQUICAgIBQgFCAgICAUICAgIBQUICAUFBQgICAUFCAgFCAUFCAUIBQUFBQgFCAUFCAUIBQgICAgFCAUFCAUIBQgICAUIBQgICAgFCAgIBQUICAgIBQgFCAgICAUICAUF" +
"CAUFCAgIBQUIBQgIBQgICAgIBQgICAUFBQgFCAgIBQgICAUFBQgICAUFBQgICAUICAgICAUFBQgICAUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFCAgICAgFBQgICAUFCAgICAUFCA" +
"gICAUFCAgFBQUFCAUIBQUICAgFCAgICAgFBQUICAUFCAgICAUFBQUIBQgFCAgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQUIBQgIBQUICAgIBQgICAgIBQUICAUFBQgIBQUFCAUICAUF" +
"BQgIBQgIBQgICAUFCAgIBQUFCAgIBQgICAgFBQUFCAgFBQgICAgFBQgICAgFCAgICAgFBQgICAUFBQgICAUFCAgICAgFCAgICAUFCAUICAUFCAgFBQUICAgFBQUIBQgFBQUICAgICAgIB8gIOFhImD" +
"gH96fYGFj5GRjYOAfHx9i46Rk4yKiIGFg4SGg4mKioyJhYKAeHl/gouMi4h5dnRze32AhoeAfHh0dnV2eXV4e32CgHh2dG5wc3eBg4OAdnJubnZ9gIR/gH99dnt5e356goSFi4mGg3h4eX+DjZCQjo" +
"B9fHuEhomQi4yIhYmDg4SGgoWIipCOhoN6enx+iIuNjYl+e3V0e4CDhoGBgH19eXd2cXR7fX2DgH16fICDhYSJg4B/eHp9gY+RkY2DgHx8fYuOkZOMioiBhYOEhoOJioqIjImFgHh5f4KLjIuIfXl2" +
"dGx9gYqMfXZxa3VxcXJtcXZ4d4F3cnBhZGhtd4mKhYFuaGhrfYOJjoWEgXh0gIOHjImMjoyJko6HhnqDiIyenJiTgHt3eHuNlpiYhH54c298fISIfoB+en14dHNlaG12eYeCfXhiYWJma36DiId2bW" +
"hmdXl/hXyAgn56hHl+g4eFkIeDgnR3fIGMnJ2Xkn95eXuNkpebj42IfXmEhIiMg4eIiICJg3t6bXV5fY2MioVsZ2RlaHuEhod3c21oYm9xe4B3e3p2gHt3dWpudH+Dko6JhXFxdHh+kZebmoh/e3iI" +
"jJGWjY+QioWOjIqMgIaLjY2fmIiBZmVobYyPj4yFaWFVVGp1e4Fxb2tlXm1qbHJkdHl8jYeCfXpmaXd/h6SjoIB6d3mTmqGorK6Si4R1fYSKiZqUjoqIeH6GlKytpZ6CfXl5e5uhpqePiHhxgYCBhY" +
"p/gYB1gnpubVleZGpvh4R+cFZSVVtifoWKi3BrZV50eIePloiHhH6OiYeLkYOSlpemn5iTenl7hoymqaage3RvbIKGi5WXgnhwaHBub3N5am9ycIBxa2hUWWBnboiKhX9lXV1hhIyUmZyGg3hzhomO" +
"lpCVl5GgmZOPjpCFjJGqqKKgdWliYWdvnqSkdmdWcoKRm5+dsp2UkHyIl7LX2NTKvK57d3ilsLm+t49/bl5QZGlxhXByZFZjVElDRDpIVmmGg29kXEBJV2iVpK+yq4Zzb3Cfrr3L1Lu5o5WklpiemK" +
"KoqaO0pIJ2bVNcZZGUkIZ4aT0qKS5icHuEY1pPRDtTXWp7gIqQiZuSiYWFjIybqtXTzLOmgX6Fj7fCysu8kYBiWXJ9iJGZfntxU19SR0tVUl5kZn11aVNNM0ZWZ56kpJ5ygpGfnbKdlJB8iJemstfY" +
"yryue3d4pbC5vr63j25eUGRpcYVwcmRWY1RJQ0Q6SFZphoNvZFw8QElXlaSvsquGc29wk5+uvdS7uaOVpJaYnqmYoqijtKSCdm1TXGVvkZSQeGk9KikuYnB7goRjWkQ7U11qe4CKkImbkomFhYyMm6" +
"rV08yzpoF9foWPwsrLvJGAYllydn2IkX57cVNfUkdLVUVSXmR9dWlTTTNGVmeSnqSkcoKRn52ynZSQkXyIl7LX2Mq8rnt3eKWwub6+t49uXlBkaXGFcHJuZFZjSUNEOkhWaYaDeW9kXEBJV5Wkr7Kr" +
"hntzb3Cfrr3Uu7mjlaSblpiemKKoo7SkgnZtUFNcZZGUkHpuTkBBRm53f4KBZ15MR1pncn9/hIN/eIV+e4CJjZigt7Gon5eSfIiSnb+/uqWFenNxc46epKaHfXBYZ2Vobnd/c3Fqal9XVFpOWWRscY" +
"F5cHWBjJaTopKLiYt9h5OnwMCxp517fIGIpq+0samJb2ZheoGJkJR/e2ZaY1hZX11mbG1qeG5cV1dRXWmQk5GMhH1hYWdyoauyspaNhH16kaCrtayrpY+ZkIqPlomRlpeflIdxbFZhaXGLjId/aElB" +
"QUdme4GEgWZeVEleZHqHkomHgXqHgX6GkIifpaaxqJ6Wkn2DlZ67vLWrenNwcHOOk5ubmHRrZHJ0eISJdXRvaGBpZ2h1foWKh5iSjIiIeoKKlq2rn5iSeXl8gaOoqqOcfnBtbYWLkJaYf3hoYHBxdn" +
"yCcnRyZ3RtZmhtZ21ydIeCfHFvW2hweJiYlotwbW1wdpOjqKqOiIF5jpKYn6arlpGKj4qIjJKDh4qJhYqBenVjZ3N3jIqFfXVUU1RgfIKGg35jXFdVcXiBj5J9dG9pfHyAh5iKj46JmI2LjYOLkpeZ" +
"rKeYko14fYOjpaSfmI9yZ2dpiY+SdX6FiYqHmIyIiHqCipatq6afmJJ5fIGjqKqjnH52dnR1io6Sk4J8b2p2dnl9gnp6d2t0b21wdXF0dXN8d3JsbWJuc3eGg356dmZncXeLkpKPeHRzc3eKkJudnY" +
"iDfoqMkZacoJSQi4WKiYqTio2PjoqThoKAdXl+g5GNiIF7dmZobYSGhn54ZF5eYXR6foKBb2phX253fYOHe3p3bnh3e4GIhYeGhI2JhYSHfoqPkZyXko55f4SHhY+GhIR9g4mOkZ+dlI+LfoGHn6Gh" +
"n5qUgHl6fZSYmpeEfXJvfX+DiIyAfXhrdHFzd3xzdnZ0eXNua25lcHN1gn96dW9hZHB2iYuJhYBubGx2iI2SkpB8eXh4iYyQl5iKhIB9i42QlJiMjIeDjomKjISHiIWQi4eEg4N6foCOi4d+fG1ucH" +
"N2h4aDe2lnaGt8gIKDgW1pZmZ2eYGDhHVzb2x3eHuEiHx8eXaBf3+BeX2AgoGMhoSFh32BhYqXlY6Lin6ChpqamZaSjn18foGWl5eRf3t4dneHjY+Qf3t2b3x9f4KFiHl2cnh2dXl9cnR1dHF4dXN1" +
"a251doKAfXl3aWxweImJhoOAcG9xdIuPkZCNfHd3eY+TlpiYiIV+fIqPk5eMi4mFgYuKi46SiImHjYmFhIOFeoCBgYmFgX1wcnZ5fIqGgn5ra210hYeHhYJ+aWlqf4OGhoNybmtqan+Dhnl9gIF/io" +
"OCg4V7f4OGk4+IhoZ8gISHlpWTi4h5e36ClZWUkIx6d3h6jJKSkXx4dXNzgoaMjo16dnF8fX+Dhol7d3NveHh6gXd5eXdzfXd3eHF1eHiEgHp4eW5xdXmKiIV/fW50eHyNjo6LhXRzd3qNk5ORjn15" +
"d3mKjpWWlYF9enmHiY2UloiCfnqFh4mNkIWFgX2HgoKEfYCBgX6IhH59fnZ6fImGgnp5a21xdHiHhYF5fYCBf4qGg4KDe3+DhpOPgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIqCi3ZydWdzf4iLmY" +
"14c19xfIeMoZqQeV5ebnqFoZyShmZfXmx4mKKdlGhgXWF/i5ain4FqYV19iJSdoouDbGJze4aSjIyFem55c3mEkIyMh4Z7dHhteISLjYiIfHVhanaKjZ6Win52YGh0iaKfjIBiXV9mcpyhoI9uY15l" +
"hJCboaF8cGVeeIKZoKGIfnJncneAl5+NgHRpdXJ1fpWJjYJ3gHJ0fH6IjIuEjoJzdGV1gYmKgot/dnJ1c3+Ii5mNeHNfZnF8h6GakHleXm56haGhnJJmX15seJiinZRzaGBdf4uWop+BamFddYCAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgFCAgICAUFCAgFBQUICAgFBQUFCAgFBQUICAgFBQUICAgFCAgICAUFCAgICAgFCAgICAUFCAgICAgFCAgIBQUICAgICAUICAgIBQUICAgIBQUICA" +
"gIBQgICAgFBQgICAgFBQgICAUFBQgICAUFBQgFCAUFCAgICAUFBQgIBQUFCAgFCAUFCAgIBQUFCAgIBQgICAgIBQUFCAgFBQgICAgFBQgICAgFCAgICAgFCAgICAUICAgICAgIBQgICAUICAgIBQUI" +
"BQgICAUICAgIBQgIBQgIBQUICAgICAUICAgFBQUICAgFBQgICAUICAUICAUFBQgICAUICAgIBQUFBQgICAUICAgICAUICAgICAUICAgFCAUICAgIBQgICAgFCAgFBQgIBQgICAUFCAUICAUIBQUICA" +
"UFCAUICAUIBQgFBQgFCAgICAUIBQgFBQUICAgFBQgIBQgICAUIBQgFBQgICAUICAgFBQgICAUIBQUIBQUIBQgFCAgFCAUICAgFCAUICAgIBQgICAgFCAgFCAgIBQUIBQUFCAUFCAgIBQgIBQUIBQgI" +
"CAgIBQgICAgFCAgICAgFCAUIBQUIBQgFCAgFCAgFBQUIBQgIBQUICAgFCAgIBQgFBQUICAUIBQUFCAUFCAgFCAUICAgIBQgFCAgICAgFCAgFCAgFCAgFCAUICAgIBQUICAgIBQgICAgIBQgICAgIBQ" +
"gICAgFCAgICAgFCAUIBQUFCAUIBQUFCAgIBQUFCAgIBQUFCAgIBQgICAgFBQgICAgFBQgICAgFCAgICAgFBQgICAUFBQgICAUFCAUFCAUFCAgICAUFCAgICAUICAgFBQUICAgFBQUFCAgICAUICAgF" +
"BQUICAUFBQgICAUFBQgICAUFBQgICAUFBQgIBQUICAUIBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgIBQUFBQgIBQUFCAgFBQUFCAgFBQUICAgFBQgIBQUICAUFCAUFCAUFCAUIBQgICAUFBQgIBQ" +
"gFCAgICAUIBQgICAUFCAgIBQgFCAgICAUFCAgICAUICAgICAUICAUFCAUICAgIBQgICAgICAUIBQgICAUIBQgIBQgIBQgIBQUFCAUFBQUICAgFBQUICAUFBQgICAgFBQgIBQUFBQgIBQUICAgIBQgF" +
"BQgIBQUICAgICAUICAgFBQUICAgFCAUICAgIBQgFBQgFBQgICAgFBQgIBQUFBQgICAgFBQgIBQUFBQgIBQUFCAgIBQUFCAgIBQUICAgIBQUFCAgFBQUICAUIBQUFCAgFCAgIBQgFBQgICAgFCAUFCA" +
"gFBQgICAgFBQgICAgFCAgICAgFCAgICAUFCAgIBQUFCAUFCAUICAgICAUFCAgIBQgFCAUFBQUICAgIBQUICAgICAUIBQgFBQgFCAUFBQgIBQgFBQgFCAUFBQgIBQUICAgICAUICAUIBQUICAgIBQUI" +
"CAgIBQgICAgFBQgICAgIBQgICAgFBQgICAgFBQgICAgFBQgICAgFCAgICAgFCAgFBQgFCAgICAUFCAgIBQUIBQgFBQUICAgFBQUICAgFBQUICAUICAgICAgFCAgICAUIBQUICAgFCAgIBQgFBQUICA" +
"gFBQUICAUFBQUICAUFCAgICAUFCAgFCAUFCAUFCAUFCAUFCAUIBQgICAUFCAgICAUFCAgICAUICAgIBQgFCAgIBQUIBQgICAUIBQgIBQgIBQgIBQgFCAUFBQgFCAUFBQgIBQUFBQgIBQUFCAgIBQUI" +
"CAgIBQUICAgIBQgICAgFCAUICAgFBQgFBQgFBQgICAgFBQUICAgIBQgICAUFBQgICAgFCAgFBQgFBQUICAUFCAUICAgFCAgICAgFBQgIBQUFCAgFCAgFCAgIBQUFCAgIBQUIBQgFBQUFCAgFBQUICA" +
"UFBQUICAgFBQUFCAgFCAUFCAgFBQgICAUFCAgICAUFCAgICAUFCAgIBQUICAUFCAUFCAgICAUICAgIBQUICAgIBQUICAUFBQgICAgIBQgICAgICAUICAUFBQgICAgFBQgICAUICAUICAUFBQgIBQgF" +
"BQgIBQgFBQgFCAUFBQgIBQUICAgFCAUICAgIBQgICAgFCAUICAgIBQgICAUIBQUICAUFBQgFBQgFCAUICAUFCAgICAUFCAgFBQUICAgFBQUICAgFBQUICAgFCAgICAUFCAgFCAgFBQUICAgFCAgICA" +
"UFCAgICAUICAgICAUFCAgIBQUICAgICAUFCAgIBQUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgIBQgICAUFBQgFCAUFBQgICAUFBQgFCAUFBQgFCAUFCAgIBQUFCAUIBQgICAgICAUFCAgICAUF" +
"CAgFCAUFCAUICAgIBQgIBQgIBQgFCAUFCAUFCAUFCAUICAUFCAUICAgIBQgIBQgIBQgICAUFCAgIBQgIBQUIBQgIBQUIBQUICAgFCAgFBQgICAUICAgFCAUICAgFCAUICAgFBQgICAgFBQgICAUFBQ" +
"gICAUFCAgICAUIBQgICAgFCAgICAUFCAgFBQUICAgFBQgIBQgFBQgFCAUFBQUIBQgFBQgFCAUICAgIBQgFBQgFCAUICAgFCAUICAgIBQgICAUFCAgIBQUIBQgICAgFCAgFCAgFBQgIBQUFCAUIBQUI" +
"CAgIBQUICAgFBQUIBQgIBQUICAgFBQUICAgFBQUICAgFCAgICAgFBQUICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUICAgIBQgFCAgIBQgICAgIBQUICAUFBQgICAUFBQgICAUFBQgIBQUFBQgFCA" +
"UFCAgIBQgICAgIBQUFCAgFBQgICAgFBQUFCAUIBQgICAgFBQgICAgFBQgICAgFBQgICAUFBQgICAUFCAgICAUFCAUICAUFCAgICAUICAgICAUFCAgFBQUICAUFCAgFCAgFBQUICAUIBQUICAgFCAgI" +
"CAUFCAgICAUICAgIBQUFCAgIBQUICAgIBQUICAgIBQgICAgIBQUICAgFBQUICAgFBQgICAgIBQgICAUFBQgFCAUFBQgIBQUFCAgIBQUFCAUIBQUFCAgA==\"},\"seven\":{\"f0\":123.75,\"n\":1115" +
"2,\"b64\":\"AAAAUICAgIBQUICAUFBQgICAUFBQUICAUFBQgICAUFBQgICAUFCAgIBQUFCAgICAUFCAgIBQUICAgICAUICAgFBQgICAgIBQgICAgFBQgICAgFBQgICAgFCAgICAUFCAgICAUFCAgICAU" +
"FCAgICAUFCAUICAUICAgICAUFCAgFBQUICAUICAUICAgFBQUICAgFCAgICAgFBQUICAUFCAgICAUFCAgICAUICAgICAUICAgIBQgICAgICAgFCAgIBQgICAgFBQgFCAgIBQgICAgFCAgFCAgFBQgIC" +
"AgIBQgICAgFBQgICAgFCAgIBQUIBQgIBQUFCAgIBQUICAgFBQUFCAgIBQUICAgIBQUICAgIBQUICAUIBQUICAgFCAgICAUICAgFCAgFCAgIBQUIBQgIBQgFBQgIBQUIBQgIBQgFCAUFCAUICAgIBQg" +
"FCAUFBQgICAUFCAgFCAgIBQgFCAUFCAgIBQgICAUFCAgIBQgFBQgIBQgFCAUFCAUIBQgICAUIBQgICAgFCAgICAUICAUFCAgFBQgIBQUIBQUFCAgFCAgIBQgFCAgICAgFCAgICAUICAgICAUIBQgIB" +
"QgFCAUFCAUICAUFBQgFCAgIBQgICAUFCAgFCAUFBQgIBQgFBQUIBQUICAUIBQgICAgFCAUICAgICAUICAUICAUICAUIBQgICAgFBQgICAgFCAgICAgFCAgICAgFCAgICAUICAgICAUIBQgFBQUIBQg" +
"FBQUICAgFBQUICAgFBQUICAgFBQgICAUFBQgICAUFBQgICAUICAgICAUFCAgIBQUFCAgIBQUIBQUIBQUICAgIBQUICAgIBQgICAgFBQgICAgFBQUICAgIBQgICAgFBQgIBQUFCAgIBQUFCAgIBQUFC" +
"AgIBQUFCAgFBQgIBQgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgFBQUICAUFBQUICAUFBQgICAUFBQgFBQgICAUIBQUICAUIBQgFBQgIBQUFBQgFCAUICAgIBQgFBQgIBQUICAgFCAU" +
"ICAgIBQUICAgIBQgICAgIBQgIBQUIBQgICAgFCAgICAgIBQgFCAgIBQgFCAgFCAgFCAgFBQUIBQUFBQgICAgFBQgIBQUFCAgICAgFCAgFBQUFCAgFBQgICAgFCAUFCAgFBQgICAgIBQgICAUFBQgIC" +
"AUIBQgICAgFCAUFCAUFCAgICAUFCAgIBQUFCAgICAUFCAgIBQUFCAgFBQUICAgFBQUICAgFBQgICAgFBQUICAUFBQgIBQgFBQUICAUICAgFCAUFBQgICAUICAUICAUFBQgICAUFBQgICAUICAgICAU" +
"ICAgIBQUICAgFBQUIBQUIBQgICAgIBQUICAgFCAUIBQUFBQgICAgFBQgICAgIBQgFCAgFCAUIBQUFCAgFCAgFCAUIBQUFCAgFBQUICAgIBQUIBQgFBQUICAgFBQgICAgFCAgICAUFCAgICAgFCAgIC" +
"AUFCAgICAUFCAgICAUFCAgICAUICAgICAUICAUFCAUICAgIBQUICAgIBQgFCAUFBQgICAUFBQgICAUFBQgIBQgICAgICAUFCAgIBQgIBQgICAUFCAgFCAUFBQgICAUFBQgIBQUFBQgIBQUICAgIBQU" +
"ICAUIBQUICAUIBQUICAUIBQgFBQgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFBQgFBQgIBQgFBQgFCAgFBQgFCAUICAUFCAUIBQUFCAgFBQUFCAgFBQUICAgFBQUICAgFBQUICAgFCAgICAUIBQUIC" +
"AUFCAgFCAUFCAgICAUFBQgICAgFCAgIBQUFCAgICAUICAUFCAUFBQgIBQUIBQgICAUICAgICAUFCAgIBQUICAUFCAUICAgIBQUICAgIBQgFCAUFBQUICAUFBQgIBQUFBQgICAUFBQUICAUICAUICAU" +
"FBQgIBQUICAgIBQUICAgIBQUICAgFBQgIBQUIBQUICAgIBQgICAgFBQgICAgFBQgIBQUFCAgICAgFCAgICAgIBQgIBQUFCAgICAgFCAgIBQUIBQgIBQUFCAgFCAgFCAgFCAgFCAUIBQUFCAgFBQUIC" +
"AUIBQUICAgFCAgICAUIBQUICAgFCAgIBQgFBQUIBQUFCAUFCAUIBQgIBQUICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFCAgIBQUFCAUICAUFBQgICAUFCAgIBQUFCAgIBQgICAgIBQUICAgFBQg" +
"ICAgIBQUICAgFBQgICAgFBQgICAgFBQgICAgFBQgICAgFCAgICAgFCAgICAUFCAUICAUFCAgICAUFCAUICAUFCAUIBQUICAgFBQUIBQgFCAgICAgIBQUICAgIBQUICAUIBQUIBQgICAgFCAgFCAgFC" +
"AUIBQUIBQUIBQUIBQgIBQUIBQgICAgFCAgFCAgFCAgIBQUICAgFCAgFBQgFCAgFBQgFBQUICAUICAgFCAgIBQUICAUIBQUICAUIBQUICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQgFCAgICAUICAg" +
"IBQUICAUFBQgICAUFCAgFCAUFCAUIBQUFBQgFCAUFCAUIBQgICAgFCAUFCAUIBQgICAUIBQgICAgFCAgIBQUICAgIBQgFCAgICAUICAUFCAUFCAgIBQUIBQgIBQgICAgIBQgICAUFBQgFCAgIBQgIC" +
"AUFBQgICAUFBQgICAUICAgICAUFBQgICAUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgFBQUFCAUIBQUICAgFCAgICAgFBQUICAUFCAg" +
"ICAUFBQUIBQgFCAgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQUIBQgIBQUICAgIBQgICAgIBQUICAUFBQgIBQUFCAUICAUFBQgIBQgIBQgICAUFCAgIBQUFCAgIBQgICAgFBQUFCAgFB" +
"QgICAgFBQgICAgFCAgICAgFBQgICAUFBQgICAUFCAgICAgFCAgICAUFCAUICAUFCAgFBQUICAgFBQUIBQgFBQUICAgICAgIB5fH+CgY2HhIN3en2BkpSVko9+eXh5jZCTloiHhX6JhoaHioKEhZCNi" +
"YWCcnJ2eXyNjYt2cm9tbHt+hIZ6eHZyeXd3eHpwc3h5hoF9emprbXF1homKiHdycG+AhIeLjoKCfnuGg4OFfoKFh5WUkYuIeXp8gJSWloSBfnp4d4aLjpGFhIGIhIKAgHR3fH5/ioeDbm1sbnCBhIi" +
"IhnFua3d4e36Cd3h3dYB6eHhucnV5e4qJeXx/goGNh4SDdXd6fZKUlZKPfnl4eY2Qk5aIh4V+iYaGh4qChIWEkI2JgnJydnl8jY2Lh3Zyb2NydH2Ag3RxbGdwbWtvZWt1d3iDf3t3aGhqdHqOlZaUf" +
"3x5d4aJjZidkpOQi4+Min+Ch4uOj52Vj4lycHB2iIyOjox6b2lkb3B0fHJ0dXNweXBtbGNnbXeIiYeEgG5qa26GjJKYi4iFgX16iIuQjZGUkp2Yk46KiX6Chnl+hImIlIyJhnh6foOOoKKfm4h/fHy" +
"LjpKXnY+Mg32Ffn1/gnh7fn6JhHlzYmFjaGx+gYN/bWhgXl90eX+Eent7dX97eXt/fYKHi5mYlY2KenyAhZ6hopCMhoF9e4mOkpaNjImNh4F9e3tvdnl8j4qCb1JNSkxRbX2Dh3FsZVpra293f4qHj" +
"I+fmZKKiXd9hY2VtbWyo4V9c3OLkJacoIuGfmp2bmlscWlvcnKEfnZnYkt1f4iRkKKclpCMd3yDlLC0sq2khn12coeMkpyfiX51anVtaWduYGdxcoR4cGlkTE1SY4GKlZWSc2xoZ3+Di5+omZyYkpi" +
"SjpGBiI+Vma6lnZNrZWNngoeNkJGOamFYYV9ib3dqcHNzcHlzbm1cZHiBnqOkop59d3R4k5yssrWgm5WMkIqHi5GCi4yKmZCHfW1VVV1kgIeGg19XUExLY2l7hIx+fXmDeXNyeoZ+qLnH6N/Qcoecq" +
"rOzybGkmXl/jKzX4eXh18R9alhLa3OLlHx8c2VSSDkwNkI4X255mJaOg21LTGJ1qNDe5L+yopGDepOgrbqytK6Pln9qWE9LPElXhoiDaVksIRocJWV5kK6XloR4boODiJWesMHRzd26p5WJZ2duhKu" +
"yrqOQSTUlHDY8SGl4Z2pjV1hPS1hMY3iPoa7Oxrqge3eDkb7N2+PktKOMYnFobXeDcnp9eV9oVDYvFCw+UmRyh5yzs8mxpJl5f4ybrNfh4dfEfWpYS2tzf4uUfHNlUkg5MDZCOF9ueZiWjoNtS0xid" +
"ajQ3uTjv7Kig3qToK26srSuoo+Wf1hPSzxJV4aIg3hpWSwaHCVleZCul5aPhHhug4iVnrDB0c3dzrqnlWdnboSrsq6jkEk1JRw2PEhpeGdqY1dYT0tNWExjj6Guzsa6oHt3eoORvtvj5LSjjGJxaGh" +
"td4N6fXlfaFQ2LxQcLD5Scoecs7PJsaSZlHl/jKzX4eHXxH1qWEtrc3+LlHxzZVJIOTA2QjhLX255lo6DbUtMYnWovdDe5L+yooN6k6CtuqqytK6Pln9YT0s8SVdjhoiDaVksGhwlZXmQoa6XloR4b" +
"oOIlZ6wwdHN3c66p5VnZ26Eq7Kuo5BgSTUlNjxIaXhnamNXSVhPS1hMY4+hrs7Guq2ge3eDkb7b4+S0o4x3YnFobXeDen15X2hUQzYvFCw+UnKHnLOzybGkmZR5f4ys1+Hh18R9alhPS2tzi5R8c2V" +
"SSDkwLzZCOF9ueZaOg21LTFNidajQ3uS/sqKDepOXoK26srSuj5Z/WE9LMzxJV4aIg2lZLBocJWV5kKGul5aEeG6DiJWesMHN0c3duqeVZ2duhKuytK6jkEk1JTY8SGl4Z2tqY1dYT0tYTGOPoa7Qz" +
"sa6oHt3g5G+2+Pk37SjjGJxaG13g3p9eV9oVEM2LxQsPlJyh5yzs8m+saSZeX+MrNfh4dfElH1qWEtrc4uUfHNlUj9IOTA2QjhfbnmWjoN3bUtMYnWo0N7kv7KikYN6k6CturK0ro+Wf1hPSzM8SVe" +
"GiINpWSwaHCVPZXmQrpeWhHhug4iVpZ6wwdHN3bqnlWdnbniEq7Kuo5BJNSU2PEhYaXhnamNXWE9LWExjeI+hrs7GuqB7d4ORvtvj5N+0o4xicWhtd4N6fXlvX2hUNi8ULD5ScoecqrOzybGkmXl/j" +
"KzX4eXh18R9alhLa3OLlHx8c2VSSDkwNkI4X255mJaOg21LTGJ1qNDe5L+yopGDepOgrbqytK6Pln9qWE9LPElXhoiDaVksIRocJWV5kK6XloR4boODiJWesMHRzd26p5WJZ2duhKuyrqOQSTUlHDY" +
"8SGl4Z2pjV1hPS1hMY3iPoa7Oxrqge3eDkb7N2+PktKOMYnFobXeDcnp9eV9oVDYvFCw+UmRyh5yzs8mxpJl5f4ybrNfh4dfEfWpYS2tzf4uUfHNlUkg5MDZCOF9ueZiWjoNtS0xidajQ3uTjv7Kig" +
"3qToK26srSuoo+Wf1hPSzxJV4aIg3hpWSwaHCVleZCul5aPhHhug4iVnrDB0c3dzrqnlWdnboSrsq6jkEk1JRw2PEhpeGdqY1dYT0tNWExjj6Guzsa6oHt3eoORvtvj5LSjjGJxaGhtd4N6fXlfaFQ" +
"2LxQcLD5Scoecs7PJsaSZlHl/jKzX4eHXxH1qWEtrc3+LlHxzZVJIOTA2QjhLX255lo6DbUtMYnWovdDe5L+yooN6k6CtuqqytK6Pln9YT0s8SVdjhoiDaVksGhwlZXmQoa6XloR4boOIlZ6wwdHN3" +
"c66p5VnZ26Eq7Kuo5BgSTUlNjxIaXhnamNXSVhPS1hMY4OSncPCvbWtiYSEiZLEz9fbubCik4ORfXl5Z250eHWJfm9hUyMgIXKCkaWow7avp6GCg4icp83b29ajlIV2amF5fIKId3h1Y3FjVUhAPCU" +
"vO1R6goSBeldQS0pUfIqruam0s66muK6noqSPoquy0czCtaWVaVNNTXJ5f4dpZE9CNUY+OzxNPkxncHWPiYN9W1lcbXumxNDXvLWsopaNoqClq6CnqqSaqJiIeGo/PkFPcnl9enNNQTYsI0FIYnGAf" +
"IKFg36TjYWGb4WUotfd39XKopaKgn2aoKdygpGlqMO+tq+ngoOInKfNxMXDv6ObkX94hoGChHR3eHh0cH1sY1o6ODhAR2JqcHR3YV5bVFFmbXN8hXuFjpuetK6qpouKjJSatbzBxMWrpZyJgI2DgYG" +
"EcXV3d3WFdm5kPzs4ODtAW2lvdGNiX1hTUmZoa3JveYSVmp6yrquno4uKjpOZu8DExKylnpSLgYiEgYNxdHh4dYB4bmZdQTs4Oj9hZ253YmJfXFhUZmdreW14dX+JkJeanK2ppZ+JipKYnrrAxMbDq" +
"KGOhn2HhYSGiHd5e3l0e3NpWD05OTo+RGZscnZgXlZST2RnbXR+c36QlpqwraqiiomKkpWZsba6wLKwqKKblJuVkIqIe35/gY+NioV+eGJTTUhEUlRbX2NZXF1dWmViXFpaT1NZYGhwhpOXmo6Ni2C" +
"gYGCgoKBgYGBgYGCgoKCgYKBgYGBgYGBgoGCgYGBgoGBgYGB5gIiUmJqpqKekn4+PkpWZsba7vsCysamjnJyWkoyLfX6AgYORj4yAeWNVT0pGRVNVXGBkW11dWWRhWlhYS05SWGduhJGVmIuLiYeFh" +
"JKWmp+do6mxs7PAvbmzp5SQi4qLnJ6goaGRjoR9dXNsZl9dUFJUV1psbWxnY1BHREJBQlNYZWxgYGBgYGBgoGCgoGBgYKCgYKCgYGBgoKCgoKBgYGBgYGBgoKCgoHmAiJSYmqinpKGfj4+SlZmxtrv" +
"AsrGuqaOcnJaSjIt9gIGDhJGPjIN/eWFdWFJfX19hY2VcXmBhYGxoZWNeUFBRU1ZacnZ8hYh9f35+fIqIiImKjYaKj5mrrrGys7KhnpuVkp+dnZ+glJeZm5uao6CbkH54dG9tand4eHp8bm5samdjb" +
"aBgoGBgYGBgoKCgoKCgoGBgYGBgYKBgYKBgYGBgYKBgYGBgYGBgeX2DjI6RoKCfnIyLioqLjaGkqK+ypqenpKKeqKObmJWEhISGh5aXl5eVgX14bWhjaWdlZVhaXF5gYXBwbmlmVU9NTExNXF9obHF" +
"sb3N2doSDgoGAcXJ0e3+EnKGmqaygoaCdm6SioJ6fkpSWmZugr6+sqqaOioSAe3iCf4CAdHV2dnVzYKCgYGCgYGCgoKCgYGBgYGBgYKCgoKCgYGBgYKBgYGCgYGBgYHl9g4eMjpGUlJSTkpGRkZGSk" +
"5WXm56gpKamp6alpKKfnZiWlJGQkJCRkZKTk5OSkI+Kh4R9enZxb21sa2trbG1ubm5ubGpoZmRhX1tZWVhZWl1gYmVnaWtub29vb25tbGxtbW9wdXh7goaJjpCSk5SUlJOSkZGRkZOVl5ueoKKkpqa" +
"npqWgoKBgYGBgYGCgYGBgYKBgoGBgYGBgoKCgoKBgYGCgoKBgYGBggIOGjI6QkpOTk5OSkZCQkJKTlZeanJ+jpaanp6ajoZ+al5WTkpGQkJGRk5OTk5KQjoyJhoB8eXNxb2xsbGxtbW5vb29tbGplY" +
"2FeXFpZWFhZXF5hZWhqbG1ub29ubm1sbGxtb3FzdnmAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enYGBgYGCgoGBgYGCgoGBgoKBgoGBgoGBgYGCgoKCgoGBgYGBgYGCAg4aMjpCTk5OTk5KRkJC" +
"QkpOVmpyfoaOlpqenpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYaDgHx5c3FvbGxsbW1ubm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZCQkJGSk5WanJ+jp" +
"aanp6ZgYGCgoKCgoKBgYKBgYGBgYGCgYGBgoGBgoKCgoGBgYGBgYGBgYICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRkpOTk5OSkIyJhoB8eXZzcW9sbGxtbW5vb29ubWx" +
"qZWNhXFpZWFhZWlxeYWVoam1ub29ubm1tbGxsbW9zdnmAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqCgoKCgYGBgYGBgYGCgoGBgYKCgYGBgYGBgoKCgoGBgYGBgYGCAg4aMjpCSk5OTk5KRk" +
"JCQkpOVl5qcn6OlpqenpqOhn5yal5WSkZCQkZGTk5OTk5KQjImGgHx5c3FvbWxsbG1tbm9vb21samhlY2FcWllYWFlcXmFlaGpsbW5vb25ubWxsbG1vcXN2eYCDhoyOkJOTk5OTkpGQkJCSk5WanJ+" +
"ho6Wmp6dgYGBgoGCgoKBgYGCgoGBgoGBgoGBgYGBgoKCgYKBgoGCgYGBgYICDhoyOkJKTk5OTkpGQkJCSk5WanJ+ho6Wmp6emo6GfmpeVk5KRkJCRkZOTk5OSkI6MiYaAfHlzcW9sbGxsbW1ub29vb" +
"WxqZWNhXlxaWVhYWVxeYWVoamxtbm9vbm5tbGxsbW9zdnl8gIOGjI6Qk5OTk5KRkZCQkJKTlZqcn6Olpqenp6BgoGBgYKBgYKCgYKBgYGBgYKBgYGCgoGCgYGBgoKBgYKBgYGBggIOGjI6Qk5OTk5O" +
"SkZCQkJKTlZqcn6Gjpaanp6ajoZ+al5WSkZCQkJGRk5OTk5KQjImGg4B8eXNxb2xsbG1tbm5vb29tbGplY2FcWllYWFhZXF5hZWhqbW5vb29ubm1sbGxtb3N2eXyAg4aMjpCTk5OTkpGQkJCRkpOVm" +
"pyfo6Wmp6emoGBgYGBgoKBgYGBgoKCgoGBgYGBgoKCgoGBgYGBgYGCgoKCgoKCAg4aMjpCTk5OXlYyKiouMlZico6aqp6eno6ejoJuXk4eFhIWGjpGSkpKQiIR8d3Jva2djY1xdX2FjbnBwb21rXlt" +
"ZVlVbW15hZWdrcHh6hISFhIN6eHh4eXyKjpOcmZ2goqOjp6WinJqRj5CRk5WeoKSlpZyZlYyHiYWAfXpwcHBydHWgoKCgoGBgYGBgoKCgoKCgYGBgYGBgYKCgoGBgYGCgoGBgYGBgfIGGjpGTm5ubm" +
"paNjIuLjZmcn6OmqaWnp6Wgo5+Xk4+GhISDhYaOkZGQhoR/e3ZxbGpnZGJbXGBiZGZvcHBua2JcWVdUW11iZWpnbHF1fH2GhoWEenl5eXt8gI+TmKGeoaSjo6Glo6CamJCQkJKlqKusrayqkoyEdn5" +
"4cnFxZGdpbG58e3RvaVBMSEZFRldgZmxobG9xcHx3dXR0dWpueoGIpKmtr6Gem5eUkZqam6Gkm3mAh42SlZekoqCaioiKjJCjqKyxt6qqpJ+ZmpSOioeGeHt9f5CPjoaAbGVeWFJLWFleYmZgY2Vlc" +
"W5rZ2RiU1RXYml+jZKXmo6PjoqIk5GSlI2SmJ2jp6q6uLSql5GHg4GOjo+SlomKiIWAgntzbWdiUU9RVGlsb3NzY2BdWVVOW1pfY2lpb3aBkpSUk5KPfXx8gIOXo6ius6mrq6ejrKKdmYaGh4mLj6G" +
"jop2BeW9dV2BeeYGLmJucpaGdlYaGiIyRmLO3urmnoZCIf4aBfnyAdnl+f3yAenFgS0ZDQ0VJZGpxem1tZ2NfaWdnanRueIuSma2tqqaij4uHiIujqa+4q6qnoZqRjYZ/eWttdHd5iYiFgHJcU0ZDQ" +
"lVaYWhwZ2xwb2xybmxsYWd3gIqhqK2wr52YjouImJugpqujp6mnoaCXjn5raGdoa26DhYWAbWVVTkhRT1BTX1hfbHByfnt3c3FhYXmBi5ibnKWhnZmVhoaMkZizt7q5p6GQiH+GgX58gHZ5fn98gHp" +
"xaGBLRi0zPGh0fXBuaWJaUmJiaHN6ipissMS/t66lgoGDkbC6yMrIrKGThGdxa2ludW5zdXNteGxTSS0sMj1seYWRknp0bWZgc3iBnKukt7u6tMG2q5l/foiQmLu8urOphndZTUVYXGR1Z2traGBXV" +
"k1HMjlEYG+Rm6KjooB5c25xjqWzwMq9wL6ut6t1hJOlqLyvpp6Yf3+DlaC/ztDNpZeJem1jc3R5gHl8fHF7bWBTSEIsMz1Wd4GKiYVpYlpVVXF7mKegs7a0r7uxp5iWgo6YocPEwbqvoHxfVE1hZm1" +
"9bXBpYFVeUklDRDZBXXCAp6KZjmZdW2d3p9Df6cm9rJqIl46QmqagpaOnlH1nU0YjKzhHfoWFdEo8LyYkKmZ7kpukp5qOnZOOjpaYqbrO6eC+qZRcWFpibZWfo5xxcoecs7PJvrGkmXl/jKzX4eHXx" +
"JR9alhLa3OLlHxzZVI/SDkwNkI4X255lo6Dd21LTGJ1qNDe5L+yopGDepOgrbqytK6Pln9YT0szPElXhoiDaVksGhwlT2V5kK6XloR4boOIlaWesMHRzd26p5VnZ254hKuyrqOQSTUlNjxIWGl4Z2p" +
"jV1hPS1hMY3iPoa7Oxrqge3eDkb7b4+TftKOMYnFobXeDen15b19oVDYvFCw+UnKHnKqzs8mxpJl5f4ys1+Hl4dfEfWpYS2tzi5R8fHNlUkg5MDZCOF9ueZiWjoNtS0xidajQ3uS/sqKRg3qToK26s" +
"rSuj5Z/alhPSzxJV4aIg2lZLCEaHCVleZCul5aEeG6Dg4iVnrDB0c3duqeViWdnboSrsq6jkEk1JRw2PEhpeGdqY1dYT0tYTGN4j6Guzsa6oHt3g5G+zdvj5LSjjGJxaG13g3J6fXlfaFQ2LxQsPlJ" +
"kcoecs7PJsaSZeX+Mm6zX4eHXxH1qWEtrc3+LlHxzZVJIOTA2QjhfbnmYlo6DbUtMYnWo0N7k47+yooN6k6CturK0rqKPln9YT0s8SVeGiIN4aVksGhwlZXmQrpeWj4R4boOIlZ6wwdHN3c66p5VnZ" +
"26Eq7Kuo5BJNSUcNjxIaXhnamNXWE9LTVhMY4+hrs7GuqB7d3qDkb7b4+S0o4xicWhobXeDen15X2hUNi8UHCw+UnKHnLOzybGkmZR5f4ys1+Hh18R9alhLa3N/i5R8c2VSSDkwNkI4S19ueZaOg21" +
"LTGJ1qL3Q3uS/sqKDepOgrbqqsrSuj5Z/WE9LPElXY4aIg2lZLBocJWV5kKGul5aEeG6DiJWesMHRzd3OuqeVZ2duhKuyrqOQYEk1JTY8SGl4Z2pjV0lYT0tYTGOPoa7OxrqtoHt3g5G+2+PktKOMd" +
"2JxaG13g3p9eV9oVEM2LxQsPlJyh5yzs8mxpJmUeX+MrNfh4dfEfWpYT0trc4uUfHNlUkg5MC82QjhfbnmWjoNtS0xTYnWo0N7kv7Kig3qTl6CturK0ro+Wf1hPSzM8SVeGiINpWSwaHCVleZChrpe" +
"WhHhug4iVnrDBzdHN3bqnlWdnboSrsrSuo5BJNSU2PEhpeGdramNXWE9LWExjj6Gu0M7GuqB7d4ORvtvj5N+0o4xicWhtd4N6fXlfaFRDNi8ULD5Scoecs7PJvrGkmXl/jKzX4eHXxJR9alhLa3OLl" +
"HxzZVI/SDkwNkI4X255lo6Dd21LTGJ1qNDe5L+yopGDepOgrbqytK6Pln9YT0szPElXhoiDaVksGhwlT2V5kK6XloR4boOIlaWesMHRzd26p5VnZ254hKuyrqOQSTUlNjxIWGl4Z2pjV1hPS1hMY3i" +
"Poa7Oxrqge3eDkb7b4+TftKOMYnFobXeDen15b19oVDYvFCw+UnKHnKqzs8mxpJl5f4ys1+Hl4dfEfWpYS2tzi5R8fHNlUkg5MDZCOF9ueZiWjoNtS0xidajQ3uS/sqKRg3qToK26srSuj5Z/alhPS" +
"zxJV4aIg2lZLCEaHCVleZCul5aEeG6Dg4iVnrDB0c3duqeViWdnboSrsq6jkEk1JRw2PEhpeGdqY1dYT0tYTGN4j6Guzsa6oHt3g5G+zdvj5LSjjGJxaG13g3J6fXlfaFQ2LxQsPlJkcoecs7PJsaS" +
"ZeX+Mm6zX4eHXxH1qWEtrc3+LlHxzZVJIOTA2QjhfbnmYlo6DbUtMYnWo0N7k47+yooN6k6CturK0rqKPln9YT0s8SVeGiIN4aVksGhwlZXmQrpeWj4R4boOIlZ6wwdHN3c66p5VnZ26Eq7Kuo5BJN" +
"SUcNjxIaXhnamNXWE9LTVhMY4+hrs7GuqB7d3qDkb7b4+S0o4xicWhobXeDen15X2hUNi8UHCw+UnKHnLOzybGkmZR5f4ys1+Hh18R9alhLa3N/i5R8c2VSSDkwNkI4S19ueZaOg21LTGJ1qL3Q3uS" +
"/sqKDepOgrbqqsrSuj5Z/WE9LPElXY4aIg2lZLBocJWV5kKGul5aEeG6DiJWesMHRzd3OuqeVZ2duhKuyrqOQYEk1JTY8SGdeaG1pYWtgVU02PElojZyurpaPhXxzgoaPlaOyw9jTyr2wjXl2eJumr" +
"6amn5aGjHpeVz91hZWnqLqpn5V6d3mBrrvI2MO9ppeckIaBgHiCi6ysp45qWEo9NkhSXWhnbG11al5SSC4uPUpwj5qijIV8c2p5eIWQi6q2vtPLwLSRh358l6C2v7Cro5SIeWtjSkxRZIKKjIZmSj0" +
"wPjs+RUpYZneNinlvUUtKTVaImKnAr7Chl6CXkZCTkZ6r09bTv5yLfXBoeH+IkYyQjY+BcGFSMy4zPF51foJnX1NSS0hKUkhYeYeSdYWVn6+tp56VfnFvgI+ap660t7a/tquIf3l5jJSoo6mtrKitl" +
"op9YF5fe4SNlIyNi4l+cVpFQERLY213f3d3cWliWFA9P0drd4OMk4eFeX51Z2VZaHOAmqavtKSelZGJg3Z8hZCctL7GxLCckZOEgoN7g4yVsra0mI6AaG1nZWdfZ3mAk5ONg11SR05LS1BUXmmFh4V" +
"3X1VEQE5SWmRje4SLmpSNbWVfXW5zfZaTn6y7t3mFkZmfr62elX5xb4CPmqekrrS3v7ariH95eYyUnqijqayorZaKfWBeX3N7hI2MjYuJfnFaRUBES2NtdXp+gH56bmhhWVhZXGFnbnp+gYB8d2tlY" +
"V5eX2Nvdn2IiouGgXx2cW1qbG92g4qQmJiXk4+Jg3p3d32CiZecoaOjoZ6SjIeAf4CJj5ahpaenpKCajYeCfn+CjJKYnaChoJmTi355dXV4fIGHjZGVlJGFf3draGdogIaNlpaWjomDeXZ2dnp/hpO" +
"ZnqOhnpONh4OAfn+HjZSgpKaloZyPiYSAfn+Ci5GXoKKim5aPiIF8eHZ4fIeNkZeWlI+Jgntua2lrb3SAhIiKiYeCdW5nXl1dZGpwdnt/gX56dGdhXFhZXGFnbXR+gIF7dnBkYF1eYmdudXuCiYmIg" +
"Hp0a2lpam50e4mPlJeVkYeBfHh2dniBh4+bn6KgnJeRi4aCfoCEj5WcpaempKCalICGjZaWlo6Jg355dnZ6f4aTmZ6joZ6TjYeDgH5/h42UoKSmpaGclo+JhH5/gouRl6CioqCblo+BfHh2eHyHjZG" +
"Vl5aUiYJ7bmtpa290eoCEiImHgnVuZ15dXWBkanB7f4F+enRnYVxYWVxhZ210foCBe3ZwZGBdXF5iZ3V7gomJiIB6dG9raWludHuJj5SXlZGNh4F8dnZ4gYePm5+ioqCcl4uGgn6AhI+VnKGlp6agm" +
"pSAho2WlpaOiYN+eXZ2en+Gk5meo6GemZONh4B+f4eNlKCkpqeloZyPiYR+f4KLkZecoKKim5aPgXx4dnh8gYeNkZeWlImCe25raWlrb3SAhIiJh4J1bmdeXV1gZGpwe3+Bfnp0Z2FcWVhZXGdtdH6" +
"AgXt2cGpkYF1eYmd1e4KJiYiEgHp0a2lpbnR7iY+UlpeVkYeBfHZ2eIGHj5Wbn6KgnJeLhoJ+gISPlZyhpaemoJqUgIaNlpaWk46Jg3l2dnp/hpOZnqGjoZ6TjYeAfn+HjZSaoKSmpaGcj4mEfn+Ch" +
"ouRl6CiopuWj4F8eHZ2eHyHjZGXlpSJgntua2lpa290gISIiYeCdW5nYl5dXWRqcHt/gX56dG5nYVxYWVxnbXR+gIF/e3ZwZGBdXmJndXuChomJiIB6dGtpaW50e4GJj5SXlZGHgXx2dniBh4+Vm5+" +
"ioJyXi4aCfoCEiY+VnKWnpqCalICGjZKWlpaOiYN5dnZ6f4aMk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KLkZegoqKblo+BfHh2dnh8h42Rl5aUiYJ7dG5raWtvdICEiImHgnx1bmdeXV1ka" +
"nB7f4GAfnp0Z2FcWFlcZ210en6AgXt2cGRgXV5iZ251e4KJiYiAenRraWludHuBiY+Ul5WRh4F8dnZ4e4GHj5ufoqCcl4uGgn9+gISPlZylp6agmpSNgIaNlpaWjomDeXZ2dnp/hpOZnqOhnpONh4O" +
"Afn+HjZSgpKaloZyPiYSAfn+Ci5GXoKKim5aPiIF8eHZ4fIeNkZeWlI+Jgntua2lrb3SAhIiKiYeCdW5nXl1dZGpwdnt/gX56dGdhXFhZXGFnbXR+gIF7dnBkYF1eYmdudXuCiYmIgHp0a2lpam50e" +
"4mPlJeVkYeBfHh2dniBh4+bn6KgnJeRi4aCfoCEj5WcpaempKCalICGjZaWlo6Jg355dnZ6f4aTmZ6joZ6TjYeDgH5/h42UoKSmpaGclo+JhH5/gouRl6CioqCblo+BfHh2eHyHjZGVl5aUiYJ7bmt" +
"pa290eoCEiImHgnVuZ15dXWBkanB7f4F+enRnYVxYWVxhZ210foCBe3ZwZGBdXF5iZ3V7gomJiIB6dG9raWludHuJj5SXlZGNh4F8dnZ4gYePm5+ioqCcl4uGgn6AhI+VnKGlp6agmpSAho2WlpaOi" +
"YN+eXZ2en+Gk5meo6GemZONh4B+fw==\"},\"eight\":{\"f0\":123.66,\"n\":6037,\"b64\":\"AAAAbomhtrLJpZWOdYacssXQ89e/pFZOTmebqbKxp5Q+JhQwPE97i3FwaFdGTEhQeXCMsbaxx7WjlY9" +
"3ibXH8+jVu6FmVk1ZaZyysaVVPCQTCzI+aH2NcGZWM0tJY3t0j6WytsWzoo2PeKK3yPTy5tKeZFRQW2qrs6+kbFM4EQsyVGp/cm9lU0IxSlNlf5Kms6/DsZ+SjZGOpLn08eS1nGFTTVFcoK2yoWpQH" +
"xALQldsgY9yb26JobayyaWVjo51hpzF0PPXv6RWTk5YZ5upsaeUPiYUMDxPZXuLcWhXRkxIUHlwjKKxtrG1o5WPd4m1x/Pz6NW7ZlZNWWmcsrGlVTwkEwsyPmh9jXBmVjNLSVFje3SlsrbFs6KNj3i" +
"LorfI8ubSnmRUUFtqnquzr2xTOBELMlRqf45yb2VCMUpTZX+SprO2r8Oxko2RjqS59PHktZxhU01RXKCtsqFqUB8QCzRCV2yPcm9uiaG2ssm3pZWOdYacxdDz17+kaVZOTmebqbGnlD4mFAwwPE97i" +
"3FoV0ZMSFBgeXCMsbaxtaOVj3eJtcfz8+jVu2ZWTVlpnLKxpZJVPCQLMj5ofY1wZlZDM0tJY3t0pbK2xbOik42PeKK3yPLm0p5kVE5QW2qrs69sUzgRCzJAVGp/cm9lQjFKU2V/kqaztq/DsZKNkY6" +
"kufTx5NC1nGFNUVygrbKhalA2HxALQldsj3JvbomhsLayyaWVjnWGnMXQ8+rXv6RWTk5nm6mxp5RZPiYUMDxPe4txaFdGTEhQYHlwjLG2sbWjlY93iZ+1x/Po1btmVk1ZaZyrsrGlVTwkCzI+aH2Nc" +
"XBmVjNLSWN7dKWytq/Fs6KNj3iit8jy5tK4nmRUUFtqq7OvbFM4EQsyQFRqf3JvZUIxSlNlf3eSprOvw7GSjZGOpLnJ9PHktZxhTVFcoK2yr6FqUB8QC0JXbI9yb2NuiaG2ssmllY51hpyyxdDz17+" +
"kVk5OZ5upsaeUWT4mFDA8T3uLcWhXRjRMSFB5cIyxtrG1o5WNj3eJtcfz6NW7ZlZNUFlpnLKxpVU8JAsyPlJofY1wZlYzS0lje3SPpbK2xbOijY94orfI8ubSuJ5kVFBbaquzr2xTOCIRCzJUan9yb" +
"2VCMUpJU2V/kqazr8Oxko2Reo6kufTx5LWcYU1RXG2grbKhalAfEAtCV2yBj3JvbomhtrLJpZWOdYacssXQ89e/pFZOTmebqbKxp5Q+JhQwPE97i3FwaFdGTEhQeXCMsbaxx7WjlY93ibXH8+jVu6F" +
"mVk1ZaZyysaVVPCQTCzI+aH2NcGZWM0tJY3t0j6WytsWzoo2PeKK3yPTy5tKeZFRQW2qrs6+kbFM4EQsyVGp/cm9lU0IxSlNlf5Kms6/DsZ+SjZGOpLn08eS1nGFTTVFcoK2yoWpQHxALQldsgY9yb" +
"26JobayyaWVjo51hpzF0PPXv6RWTk5YZ5upsaeUPiYUMDxPZXuLcWhXRkxIUHlwjKKxtrG1o5WPd4m1x/Pz6NW7ZlZNWWmcsrGlVTwkEwsyPmh9jXBmVjNLSVFje3SlsrbFs6KNj3iLorfI8ubSnmR" +
"UUFtqnquzr2xTOBELMlRqf45yb2VCMUpTZX+SprO2r8Oxko2RjqS59PHktZxhU01RXKCtsqFqUB8QCzRCV2yPcm9uiaG2ssm3pZWOdYacxdDz17+kaVZOTmebqbGnlD4mFAwwPE97i3FoV0ZMSFBge" +
"XCMsbaxtaOVj3eJtcfz8+jVu2ZWTVlpnLKxpZJVPCQLMj5ofY1wZlZDM0tJY3t0pbK2xbOik42PeKK3yPLm0p5kVE5QW2qrs69sUzgRCzJAVGp/cm9lQjFKU2V/kqaztq/DsZKNkY6kufTx5NC1nGF" +
"NUVygrbKhalA2HxALQldsj3JvbomhsLayyaWVjnWGnMXQ8+rXv6RWTk5nm6mxp5RZPiYUMDxPe4txaFdGTEhQYHlwjLG2sbWjlY93iZ+1x/Po1btmVk1ZaZyrsrGlVTwkCzI+aH2NcXBmVjNLSWN7d" +
"KWytq/Fs6KNj3iit8jy5tK4nmRUUFtqq7OvbFM4EQsyQFRqf3JvZUIxSlNlf3eSprOvw7GSjZGOpLnJ9PHktZxhTVFcoK2yr6FqUB8QC0JXbI9yb2NuiaG2ssmllY51hpyyxdDz17+kVk5OZ5upsae" +
"UWT4mFDA8T3uLcWhXRjRMSFB5cIyxtrG1o5WNj3eJtcfz6NW7ZlZNUFlpnLKxpVU8JAsyPlJofY1wZlYzS0lje3SPpbK2xbOijY94orfI8ubSuJ5kVFBbaquzr2xTOCIRCzJUan9yb2VCMUpJU2V/k" +
"qazr8Oxko2Reo6kufTx5LWcYU1RXG2grbKhalAfEAtCV2yBj3JvbomhtrLJpZWOdYacssXQ89e/pFZOTmebqbKxp5Q+JhQwPE97i3FwaFdGTEhQeXCMsbaxx7WjlY93ibXH8+jVu6FmVk1ZaZyysaV" +
"VPCQTCzI+aH2NcGZWM0tJY3t0j6WytsWzoo2PeKK3yPTy5tKeZFRQW2qrs6+kbFM4EQsyVGp/cm9lU0IxSlNlf5Kms6/DsZ+SjZGOpLn08eS1nGFTTVFcoK2yoWpQHxALQldsgY9yb26JobayyaWVj" +
"o51hpzF0PPXv6RWTk5YZ5upsaeUPiYUMDxPZXuLcWhXRkxIUHlwjKKxtrG1o5WPd4m1x/Pz6NW7ZlZNWWmcsrGlVTwkEwsyPmh9jXBmVjNLSVFje3SlsrbFs6KNj3iLorfI8ubSnmRUUFtqnquzr2x" +
"TOBELMlRqf45yb2VCMUpTZX+SprO2r8Oxko2RjqS59PHktZxhU01RXKCtsqFqUB8QCzRCV2yPcm9uiaG2ssm3pZWOdYacxdDz17+kaVZOTmebqbGnlD4mFAwwPE97i3FoV0ZMSFBgeXCMsbaxtaOVj" +
"3eJtcfz8+jVu2ZWTVlpnLKxpZJVPCQLMj5ofY1wZlZDM0tJY3t0pbK2xbOik42PeKK3yPLm0p5kVE5QW2qrs69sUzgRCzJAVGp/cm9lQjFKU2V/kqaztq/DsZKNkY6kufTx5NC1nGFNUVygrbKhalA" +
"2HxALQldsj3JvbomhsLayyaWVjnWGnMXQ8+rXv6RWTk5nm6mxp5RZPiYUMDxPe4txaFdGTEhQYHlwjLG2sbWjlY93iZ+1x/Po1btmVk1ZaZyrsrGlVTwkCzI+aH2NcXBmVjNLSWN7dKWytq/Fs6KNj" +
"3iit8jy5tK4nmRUUFtqq7OvbFM4EQsyQFRqf3JvZUIxSlNlf3eSprOvw7GSjZGOpLnJ9PHktZxhTVFcoK2yr6FqUB8QC0JXbI9yb2NuiaG2ssmllY51hpyyxdDz17+kVk5OZ5upsaeUWT4mFDA8T3u" +
"LcWhXRjRMSFB5cIyxtrG1o5WNj3eJtcfz6NW7ZlZNUFlpnLOyqFpBKQ0xO01jd4hwaFg0SkNVaWF7laWtxrali4hskqi+9/Tm0rl/alhdaq67wYx4XkQrGzdFV2tpbmpMOko8OT9NXXeNocG0k4Z/X" +
"Wp7k+Xz9+TPlWxkZG2fr8DOpJViSDFARVJkd2NuboiftrLJppeNcoKXrcLO9d/JsWFVU2eaqre6tKZSOSMyN0VugGpual5LSkA+WU1omKSoxbioloRkcJyy6ffw38iNd2dgaZy8xceJclc8Jz47UWN" +
"3bW5lQFA/NkAwSWR8j721poZ8Vm6EnNjr9fbaootqZ2ytvczUr6SQW0JSR09fYGxybmBxWzYvMS5HYIexrqKThFJMVmm/1ujww7Cbhndtmai82766lXuEWlNVYExdbW6In7ayyaaXjYxygpfC8fXfy" +
"bFhVVNaZ5qqurSDUjkjMjdFWW6AampeS0pAPllNaIKYpMu4qJZhZHCcsun19/DfjXdnYIycvMXHiXJXPEo+O1FjVG1uZWNQPzU2HTBkfI+9taZjWVZdboS/6/X2t6KLaoqPnK29zK+kkH5lUkdPPE5" +
"gbHKDcVs2DA4uR2CaqrGuk2FSTFaMv9bozcOwm4aakJmovLi+upWehGxaUzJMXW1uiJ+wrsG0pZmQeoaZveXr3c23h3RoY2+Xpba0j2hSPCw+PERgcGJpYlRQQjo6QzZMeImvrKKUYl9kgZbI2ubq5" +
"q2biXaSmrbDzbSvo499aVtVXE5pcXKIe2pWNhMVL0NYk5iWjmRYTEZPe6e9z7+6rp+Onpadqru+x8fNuaONfHFSYW57pKGUbTwpFxokUGJzgYdjVjkvR1dqgZeQn6efr6GLipCTprnI0Oviv6x9amx" +
"1coicqrCuwaWZkHqGmb3l6+jdzbd0aGNvl6W2tI9+aFI8PjxEYHBiaWJUUEI6OkM2THiJr6yilGJfZG+Blsjm6uatm4l2kpqntsPNr6OPfWlbVVxOW2lxcntqVjYTFS9DWIaTmJZkWExGT3unvc/Zv" +
"7qujp6Wnaq7vsfHzbmjjXxxUmFue6ShlG08KRwXGiRic4GHY1Y5L0dLV2qBkJ+nn6+hi4qQgJOmudDr4r+sfWpsdYFyiJywrsGlmZB6hpmrveXr3c23dGhjb5eltrSPfmhSPD48RGBwYmliVGBQQjp" +
"DNkx4ia+sopSIYl9kgZbI5urmrZuJfHaSmrbDza+jj31pW1RVXE5pcXJ7alY2ExUfL0NYk5iWZFhMRk97p73P2b+6ro+elpyouL3IysXUwq2EeVhicH2qq6KTfU04HRshWWp5amZbTDwtQENPYnOFk" +
"5iqnpKGfmF3iZ7f6OrWqZeHenZ4coear63BppiQd4KTprnj6+LUwX5xaY2ZprK7v519Z1FKRUZcT11nbGlfWUg7GCAwWm2YoaKckVtRT2CNo83axcO7rJyclpetvbHFxbvIsp2IbVBVbHqfn5WEPSs" +
"eFxk+TXF+hmVYSi9ERU1ecm2UnqGvoZSEanOCl6q97OnfoI5/cnecqrnFy6WWglRgVFRfbF5qcXF3ZVI1LxYxRVmGkpaUflRJQ0l0oLXIu7etn4+ClXKHmq+twaaYkI53gpO54+vi1MF+cWlpjZmmu" +
"7+dfWdRSkVGTlxPXWxpX1lIOxggMENabZiinJFbUU9gjaO5zdrFu6ycnJaXrb2xxcW7yLKdiG1QVWx6n5+VhHA9Kx4ZPk1xfoZlWEo7L0RFXnJtlJ6hr6GUioRqc5eqvezp36COf3Vyd5y5xculloJ" +
"UYFRQVF9sanFxd2VSNS8WMUVZhpKWlH5USUNJdKC1yNO7t62PgpVyh5qvrcG0ppiQd4KTuePr4tTBkX5xaY2Zpru/nX1nUVlKRUZcT11saV9ZSDs0HyYyVGSOmJSNXVVSXoeZq73Kt7WroKWenaucq" +
"rfAw8DFs6FqZGNxe6CnqKSZW0k5J0RLYm9cYWFbUFJGP0QzRGh2gaGgmI9hW11wgK/P2Nu8s6eahZ6gssCwvry0sZ+OgHdaXW95gJyUhkc2KSMiKE5pdXxeVUoyRkRIU2JZe4eOpZuRcoSUn6alvKe" +
"clnuEkrHa4uTg1ceLf3eUnae6v6CZinpmYVhUXk5YaGh+ZldIPRscI0BsfI2NiFhOR0Vmb3+ktKavqqGmnZmaoZGgu8Tj1si3fHNucHacprS1rnVjUFFMTlVfa1plYllaTEA6IzA/UGGLlZGKWlJPW" +
"YOVucfQtrOqn6SdnKq3qsDFwtbIt6WJZ2Z0fqOsqJ2OX008KkZMY295YVtRQ1FGPkJMQWRyfZyVjIJyhJSmpbynnJZ7hJKisdri4NXHi393lJ2nur+gmYp6ZmFYVF5OWGhofnRmV0gbHCNAbHyNjYh" +
"iWE5HZm9/pLSmr6qhsaadmaGRoLvE49bIt6d8c252nKa0ta51Y1BBUUxOX2taZWJZWkxAOiMwP1Bhi5WRilpST1mDlae5x9Czqp+knZyqt6q3wMXCyLeliWdmdH6jqqyonV9NPExhZHF3aGpqZmBlX" +
"llFSlJlgoeJiIRpdX+IkpGjmJKOe4CIka+2u7uhmYmDlJeco5SZnJulnJKAZWNpbnSOkI+MZ11TR1teanFjaGloY2pjXkdMU2eFjI+QjnRpZWOAiJKll5ucmZSjl5SUiZGZu727r5GIgHt4jpieo5K" +
"PiHWAd3FtblxnbXGEf3dQSURCRF5mdnxraGNcZmNkaFpjbX+anJaRi29wc3qYoqy4pKGVjpyWl5yOlZyhuLOsmHpzb3GLlpqcmn93bXV/iJKRo5iSjnh7gIivtru7oZmJg5SUl5yjmZybpZySgXBvc" +
"HJ2iI2OjHZwa3FwcHNpbXF1g4F4c2FdXmFzeH2CeHd0end0dGlueX6QkpKQjXd1c4WIjouOkZGPmpaNi3yBhYmgoaGRjYiDiIaGi4GFioqVkYyHc2tra4CEh3x6d3JsdXFtbmJrb4GCgH1qZWJfbnF" +
"1gHZ6eneCenhpam5yeJGUl4aDf3mFhoiMg4iRk6F5foOIlpSQjIl4eHp+l5yfkpCMiJGNi4yBhY6RoJ2Zk4B7d3WFiIyFhoV/iIJ8eHZna29zhoeFb2pkbGttcHVrcHV0gXl0cWBiZnl/hIh+fXtzf" +
"nx9gHd9foGRkZCNeXd2homMkIWHiJSRjoh5eXyMkJOVloiDgIuFhYV7foCRkpKQfHl1f3+AhXp8fouJhoJ/bmxtfYKFh3l3dX98eXdqbG6DhYZ3dXJvbXl4e29zeXuKeXx/gYKPjoh4dnV3h46Rhoe" +
"GhYOKiId5e3+TlZaWh4SBe4eGiHx/hIWTj4x7d3Vzc4SHioCAf4eEgX5ubW5zhIaJenhyb3p4d3hscnV3hoWDb2xqaXh6fHV4enqGhH5ubW1vcoOKjIB+fHmCgYF0d3p+kpOTgn98eIWGi4CEhoiIl" +
"ZCNfHh5eo2Qk4eHhoSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBQgIBQUICAgIBQUFCAgFBQUICAgFBQUICAgFBQgICAUFBQgIBQgFCAgICAUICAgICAUFCAgIBQUICAgIBQUFCAUFCAUICAgIBQUICAgIBQUIC" +
"AgIBQUICAUFBQUICAUFBQgICAUFBQgFCAUFBQgICAUICAgICAUFBQgIBQUICAgFBQgFBQgIBQUICAgFCAUICAgIBQgICAgFBQgICAgFCAgICAUFBQgIBQUFCAgIBQUFCAgIBQUICAgIBQUFCAgFBQU" +
"FCAgFBQUICAgIBQUICAgFBQUIBQgFBQUICAUFCAgICAUFCAUFCAUFCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgA==\"},\"sleep\":{\"f0\":123.7,\"n\":7656,\"b64\":\"AAAAUICAgIBQUICAUFBQgICAUFBQUICAUFBQgICAUFBQgICAUFCAgIBQUFCAgICAUFCAgIBQUICAgICAUICAgFBQ" +
"gICAgIBQgICAgFBQgICAgFBQgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUFCAUICAUICAgICAUFCAgFBQUICAUICAUICAgFBQUICAgFCAgICAgFBQUICAUFCAgICAUFCAgICAUICAgICAUICAgI" +
"BQgICAgICAgFCAgIBQgICAgFBQgFCAgIBQgICAgFCAgFCAgFBQgICAgIBQgICAgFBQgICAgFCAgIBQUIBQgIBQUFCAgIBQUICAgFBQUFCAgIBQUICAgIBQUICAgIBQUICAUIBQUICAgFCAgICAUICA" +
"gFCAgFCAgIBQUIBQgIBQgFBQgIBQUIBQgIBQgFCAUFCAUICAgIBQgFCAUFBQgICAUFCAgFCAgIBQgFCAUFCAgIBQgICAUFCAgIBQgFBQgIBQgFCAUFCAUIBQgICAUIBQgICAgFCAgICAUICAUFCAgF" +
"BQgIBQUIBQUFCAgFCAgIBQgFCAgICAgFCAgICAUICAgICAUIBQgIBQgFCAUFCAUICAUFBQgFCAgIBQgICAUFCAgFCAUFBQgIBQgFBQUIBQUICAUIBQgICAgFCAUICAgICAUICAUICAUICAUIBQgICA" +
"gFBQgICAgFCAgICAgFCAgICAgFCAgICAUICAgICAUIBQgFBQUIBQgFBQUICAgFBQUICAgFBQUICAgFBQgICAUFBQgICAUFBQgICAUICAgICAUFCAgIBQUFCAgIBQUIBQUIBQUICAgIBQUICAgIBQgI" +
"CAgFBQgICAgFBQUICAgIBQgICAgFBQgIBQUFCAgIBQUFCAgIBQUFCAgIBQUFCAgFBQgIBQgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgFBQUICAUFBQUICAUFBQgICAUFBQgFBQgICA" +
"UIBQUICAUIBQgFBQgIBQUFBQgFCAUICAgIBQgFBQgIBQUICAgFCAUICAgIBQUICAgIBQgICAgIBQgIBQUIBQgICAgFCAgICAgIBQgFCAgIBQgFCAgFCAgFCAgFBQUIBQUFBQgICAgFBQgIBQUFCAgI" +
"CAgFCAgFBQUFCAgFBQgICAgFCAUFCAgFBQgICAgIBQgICAUFBQgICAUIBQgICAgFCAUFCAUFCAgICAUFCAgIBQUFCAgICAUFCAgIBQUFCAgFBQUICAgFBQUICAgFBQgICAgFBQUICAUFBQgIBQgFBQ" +
"UICAUICAgFCAUFBQgICAUICAUICAUFBQgICAUFBQgICAUICAgICAUICAgIBQUICAgFBQUIBQUIBQgICAgIBQUICAgFCAUIBQUFBQgICAgFBQgICAgIBQgFCAgFCAUIBQUFCAgFCAgFCAUIBQUFCAgF" +
"BQUICAgIBQUIBQgFBQUICAgFBQgICAgFCAgICAUFCAgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUICAgICAUICAUFCAUICAgIBQUICAgIBQgFCAUFBQgICAUFBQgICAUFBQgIBQgICAgICAUFCA" +
"gIBQgIBQgICAUFCAgFCAUFBQgICAUFBQgIBQUFBQgIBQUICAgIBQUICAUIBQUICAUIBQUICAUIBQgFBQgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFBQgFBQgIBQgFBQgFCAgFBQgFCAUICAUFCAUI" +
"BQUFCAgFBQUFCAgFBQUICAgFBQUICAgFBQUICAgFCAgICAUIBQUICAUFCAgFCAUFCAgICAUFBQgICAgFCAgIBQUFCAgICAUICAUFCAUFBQgIBQUIBQgICAUICAgICAUFCAgIBQUICAUFCAUICAgIBQ" +
"UICAgIBQgFCAUFBQUICAUFBQgIBQUFBQgICAUFBQUICAUICAUICAUFBQgIBQUICAgIBQUICAgIBQUICAgFBQgIBQUIBQUICAgIBQgICAgFBQgICAgFBQgIBQUFCAgICAgFCAgICAgIBQgIBQUFCAgI" +
"CAgFCAgIBQUIBQgIBQUFCAgFCAgFCAgFCAgFCAUIBQUFCAgFBQUICAUIBQUICAgFCAgICAUIBQUICAgFCAgIBQgFBQUIBQUFCAUFCAUIBQgIBQUICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFCA" +
"gIBQUFCAUICAUFBQgICAUFCAgIBQUFCAgIBQgICAgIBQUICAgFBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgICAgFBQgICAgFCAgICAgFCAgICAUFCAUICAUFCAgICAUFCAUICAUFCAUIBQUICAgF" +
"BQUIBQgFCAgICAgIBQUICAgIBQUICAUIBQUIBQgICAgFCAgFCAgFCAUIBQUIBQUIBQUIBQgIBQUIBQgICAgFCAgFCAgFCAgIBQUICAgFCAgFBQgFCAgFBQgFBQUICAUICAgFCAgIBQUICAUIBQUICA" +
"UIBQUICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQgFCAgICAUICAgIBQUICAUFBQgICAUFCAgFCAUFCAUIBQUFBQgFCAUFCAUIBQgICAgFCAUFCAUIBQgICAUIBQgICAgFCAgIBQUICAgIBQgFCAgI" +
"CAUICAUFCAUFCAgIBQUIBQgIBQgICAgIBQgICAUFBQgFCAgIBQgICAUFBQgICAUFBQgICAUICAgICAUFBQgICAUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFCAgICAgFBQgICAUFCA" +
"gICAUFCAgICAUFCAgFBQUFCAUIBQUICAgFCAgICAgFBQUICAUFCAgICAUFBQUIBQgFCAgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQUIBQgIBQUICAgIBQgICAgIBQUICAUFBQgIBQUF" +
"CAUICAUFBQgIBQgIBQgICAUFCAgIBQUFCAgIBQgICAgFBQUFCAgFBQgICAgFBQgICAgFCAgICAgFBQgICAUFBQgICAUFCAgICAgFCAgICAUFCAUICAUFCAgFBQUICAgFBQUIBQgFBQUICAgICAgICA" +
"g4aJiYiDgH58fX6BhIeLjo6NiIWDf4CBg4aJjI+PjomGg35+f4OFiIqLi4qFgn96eXl9f4KEhYaFgH15dHNzdnl7foCBgHx5dnFwcHN2eXx+gIB9enhzcnJ1eHt+gYOEgoB9eHd3en2Ag4aJioiGhH" +
"99fX+ChYuNjo6Ni4iDgYCBg4aLjo+PjoyJgoB+foCCh4mLi4qIhX57eXh5fIGDhIWEgn95dnRyc3Z7fX+AgH98gIOGiYmIg4B+fXx9foSHi46OjYiFg3+AgYOGiYyPj46JhoN+fn+Ag4WIi4uKhYJ/" +
"enl5en1/goOEg4F+e3VzcG9ubm9ydHd6e3x6eHZ0cnBubm9xd3l9gYOEg4OBgHx7ent9f4WIi4+QkZCPjYuGhYSEhYeLjY+RkpKRjYqHgn9+fX1/gIKEhYaGhH98eXNxcHBwcXJ3eXp8fHp3dHJwbm" +
"1tbnFzeXx+gYGBf358enh3eICDhoqLi4mIhoSCgYGChIaLjpCTk5KRj4yKhYOCgoOFiYqMjYyMioWCfnl3dnZ3eHp8fn9/fn14dXJubGxsbm9yd3l7fXx7eHZ0cnFxcnV4e4KEhoiIh4SCgX9/f4CD" +
"homOkJKTkpCOi4mHg4ODh4mLjpCRkpOSkYyJhXx4dG1qaWhoaGlucHJ2d3h3dnRyb21rZ2ZmaGptdXl9goaJjJCRkY+NjIiHhoaGiIqMj5KYmpyAhIiPkpSVlZWUkI6MiYiHiImLjZCTlZmam5mXlI" +
"2JhYB8eXZycXFydHV5ent7e3p4c3FtZ2VjYWFiZGdqbnZ6foOFhoeGhYKAf35+fn+Eh4qRlZidn5+fnpyak4+MhYOBf3+AgYOEhYiIiIWDgHl0cW1pZmRhYmJmaWxydXd5enp6eHd1cnBwcHFzdnp9" +
"goqPkpeZmpmXlZCOjIqIh4eJioyQk5ShoKWjn5yXhoF6dW9pfIKJjpWhpq6xrK6utLGvrKKfnJmamJaLioiHjYyLioqBfnx/eXVxYV1YVFZTUERDQ0VOUVleXWlufYKJjpSWmZ2oqaqjoqGgnqSin5" +
"+XlpWcnZ2dlpWVk5eVkoN/em9xa2ZgW09HRUlHSElHSk9TYGVrb3R6g46Sl5GTlJWVnZ2cnJaWl5+hop6goaKjqqqooJ2WkpSJhH1waWNdWVVRRURDRE1QU1ZTWGFlcXl8f35/gYl8gomVoaausayu" +
"rrSzsa+sn5yZmpiWi4qIiIeNjIqKgX58f3l1cWFdWFRWU1BEQ0NFTlFZXl1iaW59iY6UlpmdqKmqqqOioZ6kop+fl5aVnJ2dnZ2VlZOXlZKDf3p1b3FrYFtPR0VJR0hJREdKT2Bla290eoOOkpeRk5" +
"SVlZ2dnJyWlpefoaKknqCho6qqqKCdlpKUj4mEfWljXVlVUUVEQ0NETVBWU1hhZXF5fH97fn+BfIKJlaGmrrGsra6utLGvrJ+cmZqYlouKiIiHjYyKioF+fH95dXFlYV1YVlNQRENDRU5RVFleXWlu" +
"fYmOlJaZnZ+oqaqjoqGepKKfn5eWlpWcnZ2dlZWTl5WSj4N/em9xa2BaR0A/TE9SVk1SV1xzd3pwcHFxfn9/gHN2foKXo6mvq6+ywcHAv6mkn5Ocl49+fHt5eoeIiId1c290bmhjT0pFP0xLT0RJVF" +
"luc3l+g3t8fnl/h5SnrLGxpKKhn6umpKOUlZanqaqsnp+emaOekYt1ZmBnYl1bWElLTF9iZVxdXl5ea2poZ1hZWmt0eYB4gIePqq+0q6ysqLOwrammlZGQnZ6foJOTkpyZlZB7dW5fZ2BWU0NCRFRX" +
"W19jXWBic3R0ZWRlZGV0dn10eoeNo7C1ua6xsbG7t7OcmJOMmJWVk4aGhoaUkY+LcWtjaWFbVkNERUxeY2peXlxZZGFfXl1VWV95gIiVp6mqqqiXk5GeoaSoo6isr76+vKWel4iQioOBdHV2d4eGhI" +
"FnYVlZVFBOP0BDTF9kbW9jYmBsaWhnaGBla4mRmZmdn6CtqqelopOUlqewtLiurqypsaukhX95cH18fn9zdHNyfXNtZktFQUxNT1RLUFZgcXN0ZWJfXmxucnZ8foWNqq6xpaOgnZqlo6KVmJ+jtbm5" +
"uKGbk5qRioNsamlqenx9bmxpY15mWFNPPT5BeYCIj5Wnqaqol5ORnqGkqJ+jqKy+vrylnpeIkIqGhod2foGXj4h+VU1GQlZYXFJYXF1vaVxWPDs/W2Ntd390dnSCfnplaXB5hKOtubulnZinoKGklJ" +
"uiqcbGw6GYjn+Pjo6RlYSKipuNg3hRS0hHX2NoXWBgWGdfUTg3OT1EY3R7gG1rZ3NxcWRrdX+KqK+0npqQjJ2fpKudpayxyMW+mZCIgJWXmp+PkpGNmod9c1FOT2d1f4mVrKykoIaDhZ+mrre/tLSy" +
"urOqiYaGiIymq7CvloZ9h3VvbFpdYmZ+f31dVUw9TUtQV0pRWV53dXFsTktLaXF7hnuEio+in5aTfIGIpa63v8WwqqOno6GUm6KorMG8qZ9/dHWMl52fiIJ6b21mYlBXXWV6dmVGPjg2OVNlbXJeWl" +
"NbV1hdUVtmeZGSim9qam6Ml6OstKSfmqKenpOcpa2yyce4mpGHiKGttLehnJWKdYCJlKejmJN9f4WNrcDExqigmKKipZ6mq66svbSelnp4fJagoqCEenBkZ2VmWmFmZndvZVpSODpAXW5ydFdQSUNV" +
"VlxbZW96jouAe2RmbXWWrLK2nJWPnJygqJ2mrrTGwK6mi4qPq7e6uZ6Vi3+Cf35yeHx8jIN5bU5HREhkcXV1VU1EUUxLTklSW2R6cV8/QkpYZY+alo9iXV+Qnqy1nZuUgZaXp5ilsq/DuK2koZCcp3" +
"J/i5Gmno6MdX+MmsLIwbiIhIW0wMrQs6yhiZ6cqrShpJ2sn5GIg3F7g6OdkFhOSEpQdn+HgltBN05XYm1aXlxUWlBNO0dVZ4SAdm1kRVBdiJ6gnnFoZIqWpLGgo6GQopygqpuxtM3Eua2lh4+ZyMrG" +
"lId7dXSVnq6VkXpse3F1fWpydnN6bWA5PEVZe3x2bEQ4LzNYcXp9V01DWFdcZ2ZxeHKFfHRcZ4OPsrOvpp12eIFyf4uRpp6Ujox1jJrCyMG4iISFjbTAyrOsoYmenKq0oaaknayRiINxe4OjnZCDWE" +
"5IUHZ/h4JbQTdOUFdibV5cVFpQTTtHVWeEgHZtZEVQXYieoJ5xaGRlipakoKOhkKKcoKqbp7G0zbmtpYePmcjKxr6Uh3t0lZ6ulZF6bHtzcXV9cnZzem1gOTxFUFl7fGxEOC8zWHF6fVdNQ1hXXGdm" +
"cXhyhXx0XGd0g4+yr6addniBcn+LkJGmno6MdYyawsjBuJGIhIW0wMqzrKGJnpyhqrShpJ2skYiDcXuDiKOdkFhOSFB2f4eCW0E3TlBXYm1eXFRaUE07R1VgZ4SAbWRFUF2InqCeenFoZIqWpKCjoZ" +
"CinJugqpuxtM25raWHj5mkyMrGlId7dJWerpWRiHpse3F1fXJ2c3ptYDk8RVBZe3xsRDgvM1hxen1fV01DV1xnZnF4coV8dXRcZ4OPsq+mnXZ4galyf4uRpp6OjHWMmsLIyMG4iISFtMDKs6yhlYme" +
"nKq0oaSdrJGIg3F7g4ijnZBYTkhQdn+HgltPQTdOV2JtXlxUWlBNTztHVWeEgG1kRVBdiJWeoJ5xaGSKlqSgo6GZkKKcoKqbsbTNua2lhYePmcjKxpSHe3SVnq6VkYh6bHt3d3pvdHiNiYN7c1hUU1" +
"dyfoGDaGJcVWVjZG1fZnBxhHt2cFhYWmCEi5GWf3pwbH9/hIqRdX2DiomakItzcnV6gaWrrZaRi4CSkpqgkpebnJqknZZ4eHuFoKSmpaGGdm9qfYCGen5/fXeGfnBsVlxiaISFgn1hW1ROZGh0e2tu" +
"bGd2cGxpV11kc42QjYluaWZkZoaOlYyOjYSUjouNfYSLkpivraeGgX2AmZ+mq6+bk42GjouKfIKHi42hnY+Ha2RkZ4aLj3t4dG1zbWlqWV9qbYOBfHZvT05PbnV8hXBuaWRebmxvdXV9g4eIlpKPi3" +
"p4d3d6jJCZnJGTkY+alpKPfXx+g4eYn6CgkY+Lh36JhoSFeX+ChZWVlJN9eXRsaXZ4en1ydnh5eYSBeXVjXl5fb3N2enJ0dXJveXJvbWBiZmpvgYWKint2dHB5eXl7cHR5goWWmJeUgH16eHiHiZCU" +
"ipGTk56bl5OCf319f5CXmp2RkY+Lh5GMhYN0d3l8kJKTk4OBfXRveXV0dW1wc3iGhoSBfmtjYF55fYGHiJaUko+LeHd3eoyQmZyRk5ORj5aSj318foOHmJyfoKCPi4d+iYaEhXl8f4KFlZSTfXl0bG" +
"l2dnx9fnN1dnmIiYiHhnRycG5seXh3d3htb3GDhYaHh4d4dnRyfXt6enptbnBxdIaIio1/f359e4iGhIOCc3R2eHqMjpCShYaHhoWSjoyKenl4eXl6io2PkYaHiIeUk4+Ni3t5d3Z1g4SHiHx/gIGB" +
"j46Nioh3c3FveXt9f4GCkJCPjn18end3hISFhod9f4GFlZaWlZWFg4F/fIiHhoaHfH5/gZGSk5SThYF/fYeFg4CAcnN0dXaIiYqMfn17eXeDgX99emtra218f4GDhHh4eXh3g39+fGtqaWlqeXp+gI" +
"J5ent8iYiHhoSDgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBwcFBQcHBwcFBwUFBQUHBwcHBQcFBQcHBwUFBwcHBwcHBwcHBwcFBQUFBQUHBwcHBwcFBQ" +
"UFBQUFBwcHBwcHBQcHBwUFBQUFBQUHBwcHBwcHBQUHBwcHBQUFBwcFBwcHBwcFBwcFBQUFBQcHBwUFBwUHBQcHBwcHBwcHBwcFBQUFBwcHBQUFBQcHBwcHBQcHBwUFBQUHBQcHBwcFBwcHBQUHBwcH" +
"BwcHBQUFBwUFBwcHBwcHBwcHBwcFBQUFBQUHBwcHBwcFBwUHBwcHBwUFBQUFBQcHBwUFBwcHBwcFBwcHBwcHBwUHBwUHBQUFBwcHBwcICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA\"}}}"
const VOIX: any = JSON.parse(VOIX_TXT)
// Un mot dont la hauteur a ete mal mesuree (une voyelle trop courte) prend la
// hauteur des autres : sinon il serait corrige de travers et chanterait faux.
{
    const noms = Object.keys(VOIX.mots)
    const hauteurs = noms.map(k => VOIX.mots[k].f0 as number).sort((a, b) => a - b)
    const mediane = hauteurs[Math.floor(hauteurs.length / 2)]
    for (const k of noms) {
        if (Math.abs(VOIX.mots[k].f0 / mediane - 1) > 0.03) {VOIX.mots[k].f0 = mediane}
    }
}

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
let graine = 3955
const rnd = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0
    return graine / 2147483648 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (Si, 28 cents
// trop haut : 125,5 Hz). Ici on les decode et on les reechantillonne.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const b64v: number[] = []
for (let i = 0; i < 128; i++) {b64v.push(0)}
for (let i = 0; i < 64; i++) {b64v[B64.charCodeAt(i)] = i}
const sources: any = {}
function source(nom: string): Float32Array {
    if (sources[nom]) {return sources[nom]}
    const m = VOIX.mots[nom]
    const out = new Float32Array(m.n)
    let o = 0
    for (let i = 0; i + 3 < m.b64.length && o < m.n; i += 4) {
        const v = (b64v[m.b64.charCodeAt(i)] << 18) | (b64v[m.b64.charCodeAt(i + 1)] << 12)
            | (b64v[m.b64.charCodeAt(i + 2)] << 6) | b64v[m.b64.charCodeAt(i + 3)]
        const bytes = [(v >> 16) & 255, (v >> 8) & 255, v & 255]
        for (let k = 0; k < 3 && o < m.n; k++) {out[o++] = (bytes[k] - 128) / 128}
    }
    sources[nom] = out
    return out
}

/** Un mot nu, a la frequence du projet. semis : transposition en demi-tons. */
function mot(nom: string, semis: number): Float32Array {
    const m = VOIX.mots[nom]
    const src = source(nom)
    const ratio = (VOIX.rate / sr) * (VOIX.cible / m.f0) * Math.pow(2, semis / 12)
    const n = Math.floor((src.length - 2) / ratio)
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        const p = i * ratio
        const k = Math.floor(p)
        out[i] = src[k] + (src[k + 1] - src[k]) * (p - k)
    }
    return out
}

/** Ramene un son a une crete donnee. */
function norme(x: Float32Array, crete: number): Float32Array {
    let top = 0
    for (let i = 0; i < x.length; i++) {const a = Math.abs(x[i]); if (a > top) {top = a}}
    const k = top > 0 ? crete / top : 1
    for (let i = 0; i < x.length; i++) {x[i] *= k}
    return x
}

/** Passe-bande du second ordre (gain 1 au centre). */
function bande(x: Float32Array, fc: number, q: number): Float32Array {
    const w = 2 * Math.PI * fc / sr
    const alpha = Math.sin(w) / (2 * q)
    const a0 = 1 + alpha
    const b0 = alpha / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - alpha) / a0
    const y = new Float32Array(x.length)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let i = 0; i < x.length; i++) {
        const v = b0 * x[i] - b0 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = x[i]
        y2 = y1
        y1 = v
        y[i] = v
    }
    return y
}

/**
 * Le vocodeur. Le mot est decoupe en 14 bandes ; le volume de chaque bande
 * commande la meme bande d'un accord en dents de scie (la note, sa quinte,
 * son octave). Le mot garde ses voyelles et ses consonnes, mais il chante la
 * note qu'on lui donne. Du bruit dans les quatre bandes du haut rend les
 * sifflantes.
 */
function vocode(src: Float32Array, root: number): Float32Array {
    const n = src.length
    const car = new Float32Array(n), noise = new Float32Array(n)
    const ratios = [1, 1.498, 2, 3]
    const gains = [1, 0.7, 0.8, 0.35]
    for (let k = 0; k < ratios.length; k++) {
        let p = 0.37 * k
        const dt = root * ratios[k] / sr
        for (let i = 0; i < n; i++) {
            p += dt
            if (p >= 1) {p -= 1}
            car[i] += (2 * p - 1) * gains[k]
        }
    }
    for (let i = 0; i < n; i++) {noise[i] = rnd()}
    const out = new Float32Array(n)
    const BANDS = 14
    const up = 1 - Math.exp(-1 / (0.003 * sr)), down = 1 - Math.exp(-1 / (0.014 * sr))
    for (let b = 0; b < BANDS; b++) {
        const fc = 200 * Math.pow(7000 / 200, b / (BANDS - 1))
        const m = bande(src, fc, 5), c = bande(car, fc, 5)
        const nz = b >= BANDS - 4 ? bande(noise, fc, 5) : null
        let env = 0
        for (let i = 0; i < n; i++) {
            const a = Math.abs(m[i])
            env += (a - env) * (a > env ? up : down)
            out[i] += (c[i] + (nz ? nz[i] * 0.5 : 0)) * env
        }
    }
    return norme(out, 1)
}

// [mot, position en temps, demi-tons, duree max en temps (0 = mot entier)]
type Dit = [string, number, number, number]
/** nue = 1 : la voix de SAM ; voc = 1 : le vocodeur ; les deux se melangent. */
async function phrase(label: string, dits: Dit[], nue: number, voc: number) {
    let total = 0
    const parts = dits.map(d => {
        const raw = norme(mot(d[0], d[2]), 1)
        const buf = new Float32Array(raw.length)
        const v = voc > 0 ? vocode(raw, VOIX.cible * Math.pow(2, d[2] / 12)) : null
        for (let i = 0; i < raw.length; i++) {buf[i] = raw[i] * nue + (v ? v[i] * voc : 0)}
        const len = d[3] > 0 ? Math.min(buf.length, Math.floor(d[3] * beatSec * sr)) : buf.length
        const start = Math.floor(d[1] * beatSec * sr)
        total = Math.max(total, start + len)
        return {buf, start, len}
    })
    const audio = AudioData.create(sr, total, 1)
    const f = audio.frames[0]
    const fade = Math.floor(sr * 0.004)
    for (const p of parts) {
        const entree = Math.min(48, Math.max(1, Math.floor(p.len / 4)))
        const sortie = Math.min(fade, Math.max(1, Math.floor(p.len / 3)))
        for (let i = 0; i < p.len; i++) {
            f[p.start + i] += p.buf[i] * Math.min(1, i / entree, (p.len - i) / sortie)
        }
    }
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}

// Les moutons : un mot par sample. La voix chante le Si, la note qui ne bouge pas.
const MOUTONS = ["one", "two", "three", "four", "five", "six", "seven", "eight"]
const vMoutons: any[] = []
for (let k = 0; k < MOUTONS.length; k++) {
    vMoutons.push(await phrase("Veilleuse " + MOUTONS[k], [[MOUTONS[k], 0, 0, 0]], 0.8, 0.5))
}
// "Sleep", une tierce plus bas (le Sol : enfin la tonique), donc plus lent
const vSleep = await phrase("Veilleuse sleep", [["sleep", 0, -4, 0]], 0.8, 0.5)

// ---------- Projet ----------
const project = openDAW.newProject("Veilleuse")
project.bpm = BPM

// Une seule salle pour tout le monde
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.82, damping: 0.6, preDelay: 25, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Coucher", start: 0, bars: 8},
    {name: "Veille", start: 8, bars: 8},
    {name: "Nuit", start: 16, bars: 16},
    {name: "Fievre 1", start: 32, bars: 16},
    {name: "Delire", start: 48, bars: 16},
    {name: "Fievre 2", start: 64, bars: 16},
    {name: "Aube", start: 80, bars: 16}
]

type Note = {position: number, duration: number, pitch: number, velocity: number}

function build(track: any, label: string, perBar: (bar: number) => Note[]) {
    for (const s of SECTIONS) {
        const events: Note[] = []
        for (let b = 0; b < s.bars; b++) {
            for (const e of perBar(s.start + b)) {
                events.push({position: b * BAR + e.position, duration: e.duration, pitch: e.pitch, velocity: e.velocity})
            }
        }
        if (events.length === 0) {continue}
        const region = track.addRegion({position: s.start * BAR, duration: s.bars * BAR, label: label + " - " + s.name})
        region.addEvents(events)
    }
}

/** Un instrument Apparat : une unite et son code. */
function apparat(label: string, code: string, volume: number, panning: number = 0) {
    const unit: any = project.addInstrumentUnit("Apparat", {label, volume, panning} as any)
    unit.instrument.code = code
    return unit
}
const regle = (quoi: string, unit: any, name: string, value: number) =>
    essai(quoi + " " + name, () => {unit.instrument.parameter(name).value = value})
const reglages = (quoi: string, unit: any, values: {[name: string]: number}) => {
    for (const name in values) {regle(quoi, unit, name, values[name])}
}

/** Automation d'un parametre : points [mesure, valeur 0..1], interpolation lineaire. */
function auto(quoi: string, unit: any, name: string, points: number[][]) {
    essai("automation " + quoi + " " + name, () => {
        const lane = unit.addValueTrack(unit.instrument.parameter(name), "value")
        const region = lane.addRegion({position: 0, duration: TOTAL * BAR})
        region.addEvents(points.map(p => ({
            position: Math.round(p[0] * BAR), value: Math.max(0, Math.min(1, p[1])), interpolation: Interpolation.Linear
        })))
    })
}
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)
const enLog = (points: number[][], lo: number, hi: number) => points.map(p => [p[0], loga(p[1], lo, hi)])
const enDroit = (points: number[][], lo: number, hi: number) => points.map(p => [p[0], droit(p[1], lo, hi)])

/** Un tirage entre 0 et 1 qui ne depend que de ses deux nombres : le meme a chaque fois. */
const tirage = (a: number, b: number): number => {
    let s = (a * 374761393 + b * 668265263 + 3955) >>> 0
    s = ((s ^ (s >>> 13)) * 1274126177) >>> 0
    s = (s ^ (s >>> 16)) >>> 0
    return s / 4294967296
}

// ---------- La carte du morceau ----------
/** Les passages avec la batterie entiere et la basse. */
const nuit = (bar: number) => (bar >= 16 && bar < 48) || (bar >= 64 && bar < 80)
/** Le delire : la batterie s arrete, la fievre est au plus haut. */
const delire = (bar: number) => bar >= 48 && bar < 64
/** La mesure avant le delire s arrete un temps plus tot. */
const limite = (bar: number) => bar === 47 ? 9 : 12
/**
 * L accord de la mesure : 0 = Sol, 1 = Si mineur, 2 = Do, 3 = Do mineur. Deux mesures chacun.
 * Dans le delire on ne fait plus que se balancer entre Do mineur et Sol, puis Do, Do mineur.
 */
const accord = (bar: number): number => {
    if (!delire(bar)) {return Math.floor((bar % 8) / 2)}
    const k = Math.floor((bar - 48) / 2)
    return k < 6 ? (k % 2 === 0 ? 3 : 0) : k === 6 ? 2 : 3
}
/** Les reglages de bande communs. Chaque instrument a sa phase : chacun derive de son cote. */
const ruban = (phase: number, wow: number) => ({tune: FIEVRE, wow, flutter: 3, phase})

/**
 * La courbe de temperature : [mesure, fievre de 0 a 1]. Elle monte toute la nuit,
 * culmine dans le delire et retombe a l aube. Toutes les derives de bande en sortent.
 */
const TEMPERATURE = [[0, 0.1], [16, 0.2], [32, 0.42], [47.9, 0.6], [48, 0.85], [56, 1], [62, 0.8], [64, 0.55], [80, 0.25], [96, 0.05]]
/** Un parametre qui suit la fievre, de `calme` a `chaud`, ramene entre 0 et 1 pour l automation. */
const fievre = (calme: number, chaud: number, lo: number, hi: number) =>
    TEMPERATURE.map(p => [p[0], droit(calme + (chaud - calme) * p[1], lo, hi)])

// ---------- La nappe ----------
// Quatre notes par accord. Le Si et le Re ne bougent jamais. La note du haut
// descend : Fa diese, Fa diese, Mi, Mi bemol.
const NAPPE = [[55, 59, 62, 66], [57, 59, 62, 66], [55, 59, 62, 64], [55, 59, 62, 63]]
const V_NAPPE = 0.5
const pad = apparat("Nappe", MAGNETO, -8.5)
reglages("nappe", pad, {
    ...ruban(0, 12), shape: 0.35, pwm: 0.5, detune: 12, sub: 0, cutoff: 380, envmod: 1.4, track: 0.3, reso: 0.15,
    attack: 1200, decay: 3500, sustain: 0.75, release: 2400, vibrato: 0, drift: 8, glide: 1,
    drive: 0.35, age: 0.3, dropout: 0.25, width: 0.8, volume: V_NAPPE
})
pad.addSend(reverb, {amount: -12})
build(pad.noteTracks[0], "Nappe", bar => {
    const out: Note[] = []
    if (bar < 4 || bar % 2 !== 0) {return out}
    const notes = NAPPE[accord(bar)].slice()
    // Au plus fort, une cinquieme voix : le Si, une octave plus haut
    if (bar >= 64 && bar < 80) {notes.push(71)}
    for (const pitch of notes) {out.push({position: 0, duration: 2 * BAR - 180, pitch, velocity: 0.7})}
    return out
})
auto("nappe", pad, "cutoff", enLog([
    [0, 240], [16, 380], [32, 480], [47.9, 520], [48, 300], [64, 560], [80, 400], [96, 200]
], 40, 12000))
auto("nappe", pad, "wow", fievre(8, 42, 0, 60))
auto("nappe", pad, "flutter", fievre(2, 8, 0, 20))
auto("nappe", pad, "dropout", [
    [0, 0.4], [16, 0.1], [47.9, 0.1], [48, 0.7], [62, 0.5], [64, 0.1], [80, 0.25], [96, 0.6]
])
// A la fin, la bande ralentit
auto("nappe", pad, "tune", enDroit([[0, FIEVRE], [94.6, FIEVRE], [96, -300]], -400, 100))
auto("nappe", pad, "volume", [[0, V_NAPPE], [94.6, V_NAPPE], [96, 0]])

// ---------- La basse ----------
// Elle monte : Sol, Si, Do, et reste sur le Do quand il devient mineur. Les
// notes sont ecrites une octave au-dessus de ce qu on entend.
const FOND = [43, 47, 48, 48]
/** La note qui mene a l accord suivant (-1 : aucune). */
const APPROCHE = [45, -1, -1, 50]
const bass = apparat("Basse", MAGNETO, -2)
reglages("basse", bass, {
    ...ruban(0.3, 8), shape: 0.2, pwm: 0.2, detune: 5, sub: 1, cutoff: 200, envmod: 1.6, track: 0.2, reso: 0.1,
    attack: 8, decay: 700, sustain: 0.55, release: 140, vibrato: 0, drift: 3, glide: 1,
    drive: 0.5, age: 0.7, dropout: 0, width: 0.15, volume: 0.5
})
build(bass.noteTracks[0], "Basse", bar => {
    const out: Note[] = []
    const n = (step: number, len: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * PAS, duration: Math.round(Math.min(len, limite(bar) - step) * PAS - 40), pitch, velocity})}
    }
    const a = accord(bar), f = FOND[a]
    if (nuit(bar)) {
        if (bar % 2 === 0) {
            n(0, 5, f, 0.9); n(6, 2, f, 0.7); n(9, 2, f, 0.6)
        } else {
            n(0, 7, f, 0.85)
            n(9, 2, APPROCHE[a] >= 0 ? APPROCHE[a] : f, 0.65)
        }
        return out
    }
    // La fin du delire et l aube : une note longue par mesure
    if ((bar >= 56 && bar < 64) || (bar >= 80 && bar < 88)) {n(0, bar % 2 === 0 ? 10 : 8, f, 0.75)}
    return out
})

// ---------- La boite a musique ----------
// La berceuse. Cinq notes (Sol, La, Si, Re, Mi), et sur le dernier accord le Mi
// devient bemol. Chaque mesure : [pas, note, force].
type Air = number[][][]
const BERCEUSE: Air = [
    [[0, 74, 0.8], [2, 76, 0.55], [3, 79, 0.75], [6, 74, 0.7], [9, 71, 0.6]],
    [[0, 74, 0.75], [3, 71, 0.6], [6, 67, 0.7]],
    [[0, 78, 0.8], [2, 76, 0.55], [3, 74, 0.7], [6, 71, 0.7], [9, 74, 0.6]],
    [[0, 74, 0.7], [3, 78, 0.65], [6, 81, 0.75]],
    [[0, 79, 0.8], [2, 76, 0.55], [3, 79, 0.7], [6, 83, 0.75], [9, 79, 0.6]],
    [[0, 76, 0.75], [3, 74, 0.6], [6, 76, 0.7]],
    [[0, 79, 0.8], [2, 75, 0.6], [3, 79, 0.7], [6, 74, 0.7], [9, 75, 0.65]],
    [[0, 74, 0.75], [6, 71, 0.6]]
]
/** Dans le delire : la berceuse se defait. Une note tous les deux temps, qui tombe. Par accord, sur deux mesures. */
const CHUTE: {[accord: number]: number[]} = {
    3: [75, 74, 71, 67], 0: [74, 71, 79, 74], 2: [76, 74, 71, 67]
}
const box = apparat("Boite a musique", PEIGNE, 2, -0.12)
reglages("boite", box, {
    ...ruban(0.15, 8), flutter: 2, decay: 1600, bright: 0.75, metal: 0.35, strike: 0.35, soft: 4, beat: 1.2,
    drift: 4, width: 0.6, volume: 0.5
})
essai("echo boite", () => box.addAudioEffect("Delay", {delay: 11, feedback: 0.3, cross: 1, filter: 0.3, wet: -13}))
box.addSend(reverb, {amount: -9})
build(box.noteTracks[0], "Boite a musique", bar => {
    const out: Note[] = []
    const note = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * PAS, duration: PAS, pitch, velocity})}
    }
    if (delire(bar)) {
        if (bar >= 60) {return out}
        const chute = CHUTE[accord(bar)]
        const k = (bar - 48) % 2
        note(0, chute[k * 2], 0.7); note(6, chute[k * 2 + 1], 0.6)
        return out
    }
    // La derniere phrase s arrete avant la fin : le dernier accord reste seul
    if (bar >= 94) {return out}
    // Elle joue moins fort quand le chant est la
    const force = (bar >= 24 && bar < 32) || (bar >= 40 && bar < 48) || (bar >= 64 && bar < 72) ? 0.82 : 1
    for (const n of BERCEUSE[bar % 8]) {note(n[0], n[1], n[2] * force)}
    return out
})
// La fievre : la boite derive, ses notes se faussent, ses deux lames s ecartent
auto("boite", box, "wow", fievre(6, 36, 0, 60))
auto("boite", box, "drift", fievre(3, 16, 0, 30))
auto("boite", box, "beat", fievre(1, 6, 0, 12))

// ---------- Le carillon ----------
// Une seconde boite, plus petite : les notes de l accord, trois par temps, sans
// arret. Une seule note change d un accord a l autre. C est la fievre qui monte.
const CARILLON = [[67, 71, 74, 78, 74, 71], [69, 71, 74, 78, 74, 71], [67, 71, 74, 76, 74, 71], [67, 71, 74, 75, 74, 71]]
const chime = apparat("Carillon", PEIGNE, -5, 0.25)
reglages("carillon", chime, {
    ...ruban(0.6, 12), decay: 520, bright: 0.3, metal: 0.15, strike: 0.15, soft: 6, beat: 2,
    drift: 6, width: 0.8, volume: 0.5
})
chime.addSend(reverb, {amount: -11})
build(chime.noteTracks[0], "Carillon", bar => {
    const out: Note[] = []
    const on = (bar >= 32 && bar < 48) || (bar >= 56 && bar < 80)
    if (!on) {return out}
    const notes = CARILLON[accord(bar)]
    const force = bar >= 56 && bar < 64 ? 0.7 : 1
    for (let step = 0; step < limite(bar); step++) {
        const velocity = ((step % 3 === 0 ? 0.7 : 0.45) + (tirage(bar, step) - 0.5) * 0.1) * force
        out.push({position: step * PAS, duration: PAS, pitch: notes[step % 6], velocity})
    }
    return out
})
auto("carillon", chime, "wow", fievre(8, 34, 0, 60))
auto("carillon", chime, "bright", [[32, 0.35], [48, 0.6], [56, 0.3], [64, 0.55], [80, 0.35]])

// ---------- Le chant ----------
// Une voix de synthe qui glisse d une note a l autre et tremble en retard :
// des notes longues, deux par mesure au plus. Chaque mesure : [pas, longueur, note].
type Ligne = number[][][]
const CHANT: Ligne = [
    [[0, 6, 71], [6, 6, 74]],
    [[0, 9, 79], [9, 3, 78]],
    [[0, 6, 78], [6, 6, 74]],
    [[0, 12, 69]],
    [[0, 6, 67], [6, 6, 71]],
    [[0, 9, 76], [9, 3, 74]],
    [[0, 6, 75], [6, 6, 74]],
    [[0, 12, 71]]
]
const lead = apparat("Chant", MAGNETO, -7.5, 0.1)
reglages("chant", lead, {
    ...ruban(0.55, 18), flutter: 4, shape: 0.12, pwm: 0.2, detune: 6, sub: 0, cutoff: 850, envmod: 1.2, track: 0.5,
    reso: 0.3, attack: 60, decay: 1200, sustain: 0.65, release: 700, vibrato: 12, drift: 6, glide: 90,
    drive: 0.25, age: 0.3, dropout: 0.1, width: 0.35, volume: 0.5
})
essai("echo chant", () => lead.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 1, filter: 0.3, wet: -12}))
lead.addSend(reverb, {amount: -8})
build(lead.noteTracks[0], "Chant", bar => {
    const on = (bar >= 24 && bar < 32) || (bar >= 40 && bar < 48) || (bar >= 64 && bar < 72)
    if (!on) {return []}
    const notes = CHANT[bar % 8].filter(n => n[0] < limite(bar))
    return notes.map((n, k) => {
        const suivante = notes[k + 1]
        const liee = suivante !== undefined && suivante[0] === n[0] + n[1]
        return {
            position: n[0] * PAS, duration: Math.round(Math.min(n[1], limite(bar) - n[0]) * PAS + (liee ? 30 : -60)),
            pitch: n[2], velocity: 0.8
        }
    })
})
auto("chant", lead, "vibrato", fievre(8, 28, 0, 50))
auto("chant", lead, "wow", fievre(14, 34, 0, 60))

// ---------- L aspiration ----------
// Le Si et le Re, les deux notes qui ne bougent pas, qui enflent pendant une
// mesure et s arretent net sur le premier temps de la suivante.
const swell = apparat("Aspiration", MAGNETO, -11.5)
reglages("aspiration", swell, {
    ...ruban(0.7, 20), shape: 0.3, pwm: 0.6, detune: 14, sub: 0, cutoff: 260, envmod: 3.2, track: 0.3, reso: 0.25,
    attack: 2800, decay: 400, sustain: 1, release: 45, vibrato: 0, drift: 10, glide: 1,
    drive: 0.3, age: 0.4, dropout: 0, width: 0.9, volume: 0.5
})
swell.addSend(reverb, {amount: -4})
build(swell.noteTracks[0], "Aspiration", bar => {
    if (![15, 31, 47, 63, 79].includes(bar)) {return []}
    return [71, 74].map(pitch => ({position: 0, duration: limite(bar) * PAS - 20, pitch, velocity: 0.7}))
})

// ---------- La batterie ----------
// Seche et courte. Le pied sur les temps 1 et 3, un coup sur les temps 2 et 4,
// et des tics qui boitent (le premier et le dernier tiers de chaque temps) :
// une pendule. Aucun charley ouvert, aucun bruit qui traine.
const KICK = 36, RIM = 37, SNARE = 38, HAT = 42
/** 0 = rien ; 1 = un coeur qui bat ; 2 = le pied, le cercle et la pendule ; 3 = avec la caisse claire ; 4 = ce qu il en reste. */
function batterie(bar: number): number {
    if (bar >= 8 && bar < 16) {return 1}
    if (bar >= 16 && bar < 32) {return 2}
    if (bar >= 32 && bar < 48) {return 3}
    if (bar >= 56 && bar < 64) {return 1}
    if (bar >= 64 && bar < 80) {return 3}
    if (bar >= 80 && bar < 88) {return 4}
    if (bar >= 88 && bar < 94) {return 1}
    return 0
}
const drums = apparat("Poussiere", POUSSIERE, -8)
reglages("poussiere", drums, {
    // La peau de la caisse claire est un Si, accorde avec le morceau (251 Hz) ; son second partiel tombe sur un La
    tune: 56, punch: 0.6, kdecay: 190, stone: 251, snap: 0.35, sdecay: 90, nlen: 30, ntone: 3200, slevel: 0.5,
    htone: 7000, hdecay: 30, odecay: 90,
    rate: 48000, bits: 10, drive: 0.15, tone: 16000, volume: 0.6
})
drums.addSend(reverb, {amount: -22})
build(drums.noteTracks[0], "Poussiere", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step >= limite(bar)) {return}
        const v = velocity + (tirage(bar, step * 7 + pitch) - 0.5) * 0.08
        out.push({position: step * PAS, duration: PAS / 2, pitch, velocity: Math.max(0.05, Math.min(1, v))})
    }
    if (b === 0) {return out}
    if (b === 1) {
        // Deux coups rapproches, puis rien : un coeur
        hit(0, KICK, 0.75); hit(2, KICK, 0.45)
        return out
    }
    const pair = bar % 2 === 0
    if (b === 4) {
        hit(0, KICK, 0.85); hit(6, KICK, 0.7); hit(3, RIM, 0.5); hit(9, RIM, 0.5)
        for (const s of [0, 3, 6, 9]) {hit(s, HAT, 0.4)}
        return out
    }
    hit(0, KICK, 1); hit(6, KICK, 0.9)
    if (pair) {hit(5, KICK, 0.55)} else {hit(11, KICK, 0.5)}
    // Les temps 2 et 4 : le cercle d abord, la caisse claire quand la fievre monte
    if (b === 2) {hit(3, RIM, 0.6); hit(9, RIM, 0.65)}
    if (b === 3) {
        hit(3, SNARE, 0.9); hit(9, SNARE, 1)
        if (!pair) {hit(8, SNARE, 0.3)}
    }
    // La pendule
    for (const s of [0, 2, 3, 5, 6, 8, 9, 11]) {hit(s, HAT, s % 3 === 0 ? 0.85 : 0.6)}
    // Fin de phrase : trois coups sur le dernier temps
    if (bar % 8 === 7 && b === 3) {hit(10, SNARE, 0.5); hit(11, SNARE, 0.7)}
    return out
})

// ---------- La voix ----------
// Quelqu un compte. Une seule piste, dans un echo et dans la salle ; deux
// regions ne se chevauchent jamais.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -9})
essai("echo voix", () => voix.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.3, wet: -8}))
voix.addSend(reverb, {amount: -6})
const dire = (quoi: string, sample: any, bar: number, step: number) =>
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * PAS, playback: "no-sync"}))
// Le coucher : un, deux, trois. Un mouton toutes les deux mesures.
dire("one", vMoutons[0], 9, 6)
dire("two", vMoutons[1], 11, 6)
dire("three", vMoutons[2], 13, 6)
// Le delire : de quatre a huit, de plus en plus pres
dire("four", vMoutons[3], 49, 6)
dire("five", vMoutons[4], 51, 6)
dire("six", vMoutons[5], 53, 6)
dire("seven", vMoutons[6], 55, 0)
dire("eight", vMoutons[7], 56, 6)
// L aube : "sleep". Puis ca recommence.
dire("sleep", vSleep, 90, 0)
dire("one encore", vMoutons[0], 94, 6)

// Limiteur de sortie, leger : les references ne sont presque pas limitees
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -0.8} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur la premiere fievre (mesures 32 a 48), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [pad, bass, box, chime, lead, swell, drums, voix]
const STEMS: [string, any][] = [["Nappe", pad], ["Basse", bass], ["Boite", box], ["Carillon", chime],
    ["Chant", lead], ["Aspiration", swell], ["Poussiere", drums]]
if (MESURER) {
    const parts = [["coucher", 0, 8], ["veille", 8, 16], ["nuit", 16, 32], ["fievre1", 32, 48], ["delire", 48, 64],
        ["fievre2", 64, 80], ["aube", 80, 96]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const R = audio.frames.length > 1 ? audio.frames[1] : L
        const n = L.length
        const filtre = (genre: number, fc: number, q: number) => {
            // genre 0 = passe-bas, 1 = passe-haut, 2 = passe-bande
            const w = 2 * Math.PI * fc / rate, alpha = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + alpha
            const b0 = genre === 1 ? (1 + c) / 2 : genre === 0 ? (1 - c) / 2 : alpha
            const b1 = genre === 1 ? -(1 + c) : genre === 0 ? 1 - c : 0
            const b2 = genre === 2 ? -alpha : b0
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0
            return (x: number) => {
                const y = (b0 * x + b1 * x1 + b2 * x2 + 2 * c * y1 - (1 - alpha) * y2) / a0
                x2 = x1; x1 = x; y2 = y1; y1 = y
                return y
            }
        }
        const q0 = Math.sqrt(0.5)
        const f1 = filtre(1, 2000, q0), f2 = filtre(1, 2000, q0), f3 = filtre(0, 6000, q0), f4 = filtre(0, 6000, q0)
        let peakValue = 0, sumL = 0, sumR = 0, sumM = 0, sumZone = 0
        for (let i = 0; i < n; i++) {
            const a = Math.abs(L[i])
            if (a > peakValue) {peakValue = a}
            const m = (L[i] + R[i]) / 2
            sumL += L[i] * L[i]
            sumR += R[i] * R[i]
            sumM += m * m
            const z = f4(f3(f2(f1(m))))
            sumZone += z * z
        }
        const mono = sumL + sumR > 0 ? (10 * Math.log10(2 * sumM / (sumL + sumR))).toFixed(1) : "0"
        const zone = sumM > 0 ? (100 * sumZone / sumM).toFixed(1) : "0"
        const cells: string[] = []
        for (const s of parts) {
            const from = Math.max(1, Math.floor((s[1] as number) * barSec * rate))
            const to = Math.min(n, Math.floor((s[2] as number) * barSec * rate))
            // Une piste isolee peut finir avant la fin de la fenetre : on divise par la duree prevue
            const plein = Math.floor((s[2] as number) * barSec * rate) - from
            let sx = 0
            for (let i = from; i < to; i++) {sx += (L[i] * L[i] + R[i] * R[i]) / 2}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / plein)).toFixed(1) : "-"))
        }
        let line = stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " mono " + mono + " zone " + zone + "% : " + cells.join(", ")
        // Les memes mesures que sur les references, sur la premiere fievre (mesures 32 a 48)
        const from = Math.floor(32 * barSec * rate), to = Math.min(n, Math.floor(48 * barSec * rate))
        if (to > from) {
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            let lp = 0, lp2 = 0, hl = 0, sLow = 0, sHigh = 0, sTot = 0, pk = 0
            const centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
            const bandes = centres.map(c => filtre(2, c, 1.414))
            const sBandes = centres.map(() => 0)
            for (let j = from; j < to; j++) {
                const x = (L[j] + R[j]) / 2
                if (Math.abs(x) > pk) {pk = Math.abs(x)}
                lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                hl += (x - hl) * kHigh
                const hh = x - hl
                sLow += lp2 * lp2; sHigh += hh * hh; sTot += x * x
                for (let b = 0; b < bandes.length; b++) {const y = bandes[b](x); sBandes[b] += y * y}
            }
            if (sTot > 0) {
                const rms = Math.sqrt(sTot / (to - from))
                line += " || fievre1 : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
                    " creteSurMoyen " + (20 * Math.log10(pk / rms)).toFixed(1) +
                    " bandes " + sBandes.map(v => (10 * Math.log10(v / sTot + 1e-12)).toFixed(0)).join(" ")
            }
        }
        report.push(line)
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
