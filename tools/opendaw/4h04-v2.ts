// 4 H 04 v2 - Beat Survivor
// Electronica sur bande usee - 98 BPM - Si mineur, 35 cents sous le diapason - 112 mesures (4 min 34)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de 4h04-v2.src.ts
// (le morceau), voix-404.json (la voix) et des instruments du dossier apparat/.
// La premiere version reste telle quelle : 4h04.src.ts, projet "4 h 04".
//
// v2, sur le retour de N4 ("la batterie est trop forte ou trop saturee, elle
// ecrase beaucoup a l oreille, elle prend trop de place") : dans la v1 la
// batterie etait le son le plus dense du morceau (9 dB seulement entre ses
// cretes et son niveau moyen) et c est elle qui faisait travailler le
// limiteur. Ici elle est presque sans saturation, moins forte, le pied et la
// caisse claire sont plus courts. Rien d autre ne change.
//
// Quatre heures quatre du matin, devant un ecran. 404, c est aussi le code
// d une page qui n existe plus. Une voix de micro-ordinateur lit des nombres,
// comme ces stations de radio qui ne s adressent a personne : "four, zero,
// four", puis quatre octets (42 45 41 54 : en clair, BEAT), et pour finir
// "not found".
//
// Demande de N4 : un morceau dans l esprit de Boards of Canada ("1969",
// "Happy Cycling"), macabre, lugubre, une nuit a pirater. Les deux morceaux
// ont ete mesures avant d ecrire. Ce qui en sort :
// - le tempo : 98 a 100 BPM ;
// - l accordage : "1969" est 40 cents sous le diapason, "Happy Cycling"
//   flotte entre 10 et 40 cents au-dessus. Ici tout est accorde 35 cents trop
//   bas, et chaque instrument derive lentement autour, chacun de son cote ;
// - le niveau : rien n est ecrase (13 a 16 dB entre les cretes et le niveau
//   moyen, contre 11 dans nos morceaux techno) ; le poids est dans le bas
//   medium, tres peu d aigu.
// Rien n est repris de ces morceaux : ni notes, ni sons.
//
// L harmonie : une quinte (Si et Fa diese) qui ne bouge jamais, et sous elle
// une basse qui descend de tierce en tierce : Si, Sol, Mi, Do. Le dernier
// accord, Do, est a un demi-ton au-dessus du ton : il ne se resout que si la
// boucle recommence. Le morceau finit dessus, la bande ralentit ; relance en
// boucle (un menu), il retombe sur le Si.
//
// Deux instruments neufs, ecrits pour ce morceau (Apparat = instrument
// scriptable d openDAW) :
// - Magneto : un synthe a huit voix enregistre sur une vieille bande. Il fait
//   la nappe, la basse, la melodie, l arpege, les bips du terminal ;
// - Poussiere : une batterie qui passe par un echantillonneur des annees 80.
// Aucun souffle, aucun bruit de fond : l usure vient de la hauteur qui
// derive, de la saturation, des aigus perdus et des chutes de niveau.

const BPM = 98
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 112
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM
/** Tout le morceau est accorde 35 cents sous le diapason. */
const FAUX = -35

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
const POUSSIERE: string = "// @label Poussiere\n// @param tune    50    35    90    exp     Hz\n// @param punch   0.6   0     1     linear\n// @param kdecay  240   60    " +
"800   exp     ms\n// @param stone   190   120   320   exp     Hz\n// @param snap    0.6   0     1     linear\n// @param sdecay  150   40    500" +
"   exp     ms\n// @param htone   5200  2500  11000 exp     Hz\n// @param hdecay  38    10    200   exp     ms\n// @param odecay  260   80    90" +
"0   exp     ms\n// @param rate    13000 3000  48000 exp     Hz\n// @param bits    10    4     16    linear\n// @param drive   0.5   0     1    " +
" linear\n// @param tone    6000  1500  16000 exp     Hz\n// @param volume  0.6   0     1     linear\n\n// Une batterie qui sonne comme une boucl" +
"e prise sur un vieux disque puis\n// rejouee par un echantillonneur des annees 80. En mono, comme une boucle.\n// Les notes : 36 = grosse cais" +
"se, 37 = coup sur le cercle, 38 = caisse\n// claire, 42 = charley ferme, 46 = charley ouvert (le ferme le fait taire).\n// La velocite regle l" +
"a force du coup.\n// Les sons sont fabriques ici, puis passent tous ensemble par :\n// - une saturation (\"drive\") ;\n// - un echantillonneur : " +
"il ne retient qu'une valeur de temps en temps\n//   (\"rate\" = combien par seconde) et il arrondit (\"bits\") : le grain ;\n// - un passe-bas (\"t" +
"one\").\nclass Processor {\n    tune = 50\n    punch = 0.6\n    kdecayMs = 240\n    stone = 190\n    snap = 0.6\n    sdecayMs = 150\n    htone = 5200" +
"\n    hdecayMs = 38\n    odecayMs = 260\n    rate = 13000\n    bits = 10\n    drive = 0.5\n    tone = 6000\n    volume = 0.6\n    seed = 1969\n    kt" +
" = -1\n    kv = 0\n    kp = 0\n    st = -1\n    sv = 0\n    sp1 = 0\n    sp2 = 0\n    rt = -1\n    rv = 0\n    rp1 = 0\n    rp2 = 0\n    henv = 0\n    h" +
"k = 0.999\n    hv = 0\n    f = [0, 0, 0, 0, 0, 0, 0, 0]\n    acc = 1\n    aa0 = 0\n    aa1 = 0\n    held = 0\n    lp = [0, 0, 0]\n    paramChanged(n" +
"ame, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"punch\": this.punch = value; break\n" +
"            case \"kdecay\": this.kdecayMs = value; break\n            case \"stone\": this.stone = value; break\n            case \"snap\": this.sn" +
"ap = value; break\n            case \"sdecay\": this.sdecayMs = value; break\n            case \"htone\": this.htone = value; break\n            ca" +
"se \"hdecay\": this.hdecayMs = value; break\n            case \"odecay\": this.odecayMs = value; break\n            case \"rate\": this.rate = value" +
"; break\n            case \"bits\": this.bits = value; break\n            case \"drive\": this.drive = value; break\n            case \"tone\": this." +
"tone = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        co" +
"nst v = Math.pow(velocity, 1.5)\n        if (pitch === 36) {this.kt = 0; this.kv = v; this.kp = 0}\n        else if (pitch === 37) {this.rt = " +
"0; this.rv = v; this.rp1 = 0; this.rp2 = 0}\n        else if (pitch === 38) {this.st = 0; this.sv = v; this.sp1 = 0; this.sp2 = 0}\n        el" +
"se if (pitch === 42 || pitch === 46) {\n            this.henv = 1\n            this.hv = v\n            this.hk = Math.exp(-1 / ((pitch === 46 " +
"? this.odecayMs : this.hdecayMs) * 0.001 * sampleRate))\n        }\n    }\n    noteOff(id) {}\n    reset() {\n        this.kt = -1\n        this.s" +
"t = -1\n        this.rt = -1\n        this.henv = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = " +
"sampleRate\n        const twoPi = 2 * Math.PI\n        const kdec = this.kdecayMs * 0.001 * sr\n        const sdec = this.sdecayMs * 0.001 * sr" +
"\n        const gS = 2 * Math.sin(Math.PI * 2100 / sr)\n        const gH = 2 * Math.sin(Math.PI * Math.min(this.htone, 0.2 * sr) / sr)\n       " +
" const kSnHp = 1 - Math.exp(-twoPi * 700 / sr)\n        const push = 1 + 5 * this.drive\n        const norm = 1 / Math.tanh(push * 0.6)\n      " +
"  const step = Math.min(1, this.rate / sr)\n        const levels = Math.pow(2, Math.round(this.bits) - 1)\n        const kTone = 1 - Math.exp(" +
"-twoPi * this.tone / sr)\n        const kHp = 1 - Math.exp(-twoPi * 28 / sr)\n        const kAa = 1 - Math.exp(-twoPi * Math.min(0.45 * sr, 0." +
"5 * this.rate) / sr)\n        const f = this.f\n        const lp = this.lp\n        for (let s = block.s0; s < block.s1; s++) {\n            con" +
"st busy = this.kt >= 0 || this.st >= 0 || this.rt >= 0 || this.henv > 0.0002\n            if (!busy && Math.abs(lp[1]) < 0.00001) {continue}\n" +
"            this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n            const white = this.seed / 2147483648 - 1\n            let x = 0\n" +
"            // Grosse caisse : une sinusoide qui tombe, un claquement au depart\n            if (this.kt >= 0) {\n                const t = th" +
"is.kt / sr\n                const fq = this.tune * (1 + this.punch * (5 * Math.exp(-t / 0.011) + 1.1 * Math.exp(-t / 0.055)))\n               " +
" this.kp += fq / sr\n                if (this.kp >= 1) {this.kp -= 1}\n                const env = Math.exp(-this.kt / kdec) * Math.min(1, thi" +
"s.kt / (0.0008 * sr))\n                x += (Math.sin(twoPi * this.kp) * env + white * 0.25 * Math.exp(-t / 0.0025)) * this.kv\n              " +
"  this.kt++\n                if (this.kt > kdec * 8) {this.kt = -1}\n            }\n            // Caisse claire : deux notes de peau qui tombe" +
"nt, et du bruit\n            if (this.st >= 0) {\n                const t = this.st / sr\n                const bend = 1 + 0.45 * Math.exp(-t /" +
" 0.012)\n                this.sp1 += this.stone * bend / sr\n                if (this.sp1 >= 1) {this.sp1 -= 1}\n                this.sp2 += th" +
"is.stone * 1.78 * bend / sr\n                if (this.sp2 >= 1) {this.sp2 -= 1}\n                const body = (Math.sin(twoPi * this.sp1) + 0." +
"6 * Math.sin(twoPi * this.sp2)) * Math.exp(-this.st / (sdec * 0.55))\n                f[0] += gS * f[1]\n                f[1] += gS * (white -" +
" f[0] - 0.9 * f[1])\n                f[2] += (f[1] - f[2]) * kSnHp\n                const fizz = (f[1] - f[2] + white * 0.35) * Math.exp(-this" +
".st / sdec)\n                x += (body * (1 - this.snap) * 0.8 + fizz * this.snap * 1.5) * this.sv * Math.min(1, this.st / (0.0005 * sr))\n  " +
"              this.st++\n                if (this.st > sdec * 8) {this.st = -1}\n            }\n            // Coup sur le cercle : deux notes " +
"tres courtes\n            if (this.rt >= 0) {\n                const t = this.rt / sr\n                this.rp1 += 1740 / sr\n                if" +
" (this.rp1 >= 1) {this.rp1 -= 1}\n                this.rp2 += 510 / sr\n                if (this.rp2 >= 1) {this.rp2 -= 1}\n                x +" +
"= (Math.sin(twoPi * this.rp1) * Math.exp(-t / 0.006) + 0.7 * Math.sin(twoPi * this.rp2) * Math.exp(-t / 0.016) + white * 0.3 * Math.exp(-t /" +
" 0.002)) * this.rv * 0.7\n                this.rt++\n                if (t > 0.15) {this.rt = -1}\n            }\n            // Charleys : du b" +
"ruit dont on ne garde que le haut\n            if (this.henv > 0.0002) {\n                f[3] += gH * f[4]\n                const high = white" +
" - f[3] - 1.1 * f[4]\n                f[4] += gH * high\n                f[5] += gH * f[6]\n                const high2 = high - f[5] - 1.1 * f" +
"[6]\n                f[6] += gH * high2\n                x += high2 * this.henv * this.hv * 1.3\n                this.henv *= this.hk\n         " +
"   }\n            // Saturation, puis echantillonneur\n            x = Math.tanh(x * push * 0.6) * norm\n            // Un filtre leger avant d" +
"e prendre les valeurs : sans lui le haut du\n            // bruit se replie dans le medium et le charley devient un souffle\n            this." +
"aa0 += (x - this.aa0) * kAa\n            this.aa1 += (this.aa0 - this.aa1) * kAa\n            x = this.aa1\n            this.acc += step\n      " +
"      if (this.acc >= 1) {\n                this.acc -= 1\n                this.held = Math.round(x * levels) / levels\n            }\n         " +
"   lp[0] += (this.held - lp[0]) * kTone\n            lp[1] += (lp[0] - lp[1]) * kTone\n            lp[2] += (lp[1] - lp[2]) * kHp\n            " +
"const y = (lp[1] - lp[2]) * this.volume\n            outL[s] += y\n            outR[s] += y\n        }\n    }\n}"
const VOIX_TXT: string = "{\"rate\":22050,\"cible\":121,\"mots\":{\"four\":{\"f0\":122.8,\"n\":6668,\"b64\":\"AAAAcHBwcHBQUHBwcHBQUFBwcHBQUFBwcHBwcHBwcHBwUFBQcHBwcHBwUFBwcHBQcHBwcHBQcHBwUFBwc" +
"HBwcHBwcFBQUHBwUHBwcFBwcFBQUFBwcHBwcFBwcFBQUFBQUHBwcHBwcHBwUHBwcFBQcHBQUFBQcHBwcHBwcFBwcHBwcHBQUFBwcHBQUHBwcHBwcFBwcHBwcFBwcHBQUFBwcHBQUHBwcFBwcFBQUFB" +
"QcFBwcHBQcHBwcHBwcFBwcHBwcFBwcHBwcHBQUFBQUHBwUFBwcHBwcHBQcHBwcHBQUHBQUFBwcFBwcHBQUHBwcHBwcHBwcHBwcFBQUFBQUFBwcHBwUFBwUHBwcFBwcHBwcFBwcFBQUFBwcFBQUHBwc" +
"HBwcFBwUHBwUFBwUFBQcHBwcHBwcFBQUFBQUHBwcFBQcHBwcFBQUFBwUFBwcHBwcHBwcFBQUFBwcHBwcHBwcFBwUFBQUFBwcHBwcFBQUHBQcHBwcHBwcHBQUFBwcHBwcFBwcHBQcFBQUFBwcHBwcHB" +
"QcFBQcHBwcHBwcHBQUFBQUFBwcHBwcHBwcFBwUFBQcHBwUFBQcHBwcHBwUFBQUFBQcHBwcHBwcHBQUHBwcHBwcFBQcHBwcHBwUHBwcFBQUFBQcHBwUHBwcHBwUFBQcHBwcFBwcFBQUHBwcHBwcFBQc" +
"FBwcFBwcHBwcFBQUFBQUFBwcHBwcFBwcFBwcHBwcFBwcFBQUHBwcHBwUHBwUFBQUHBwcHBwcFBQUFBQUFBwcHBwUHBQUFBQUFBwcHBwUHBwUFBQcHBwcFBQcFBQcHBwUFBwcFBQcHBQcHBwcHBQUHB" +
"wUFBwcHBwcHBQUFBQcFBQcHBwcHBQcFBQUHBQcFBQUHBwcHBwcFBwUFBQUHBwUHBwcFBQUHBQUHBwcHBwcHBwcFBQUHBQcHBQUFBQcHBwcHBwcHBQUFBQUHBQcHBwcHBwUFBwcFBQcHBwUHBwcHBQU" +
"FBwUFBwcHBwcHBQUFBwcHBQUFBQUHBwUHBwcHBwcFBwUHBwcHBQUFBQUHBQUFBQcHBwcHBwcFBQcHBwcHBwUFBQUHBQcHBwcFBwcHBwcHBwUFBQcHBQcFBQcHBwcFBQcHBwcFBQUFBwcFBwcHBQUFB" +
"wcFBwcHBwcHBwcFBQUFBQUHBwcFBwcFBwcHBwcFBwcFBwcHBwcFBQUFBQUFBwcHBwcHBQUHBQUFBQUFBwcHBwUHBwcHBwUHBwUFBwcHBQcHBwcHBQcHBwcHBQUFBQcHBwcHBwcFBwcHBwcFBwUFBwc" +
"HBQUHBwUHBwcHBwUFBQcHBwUHBQcHBwcHBwUFBQUHBwcFBQUHBQUFBQcHBwUFBQcHBwUFBQUHBwcFBwcHBwUFBQUHBwcHBwcHBQUFBwcFBQcHBwcHBQcFBQUFBwcHBwcHBwUHBwcFBQcHBwcHBQcFB" +
"wcFBQcHBwcHBQcHBQUFBwcFBwcHBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQUFBQcHBQcHBQUHBwcHBwcFBwUFBQcHBQUFBQUHBwcHBwcHBwUFBQcHBQcFBQcHBQcHBwcHBwcFBQUHBwcHBwcFBwUHBwc" +
"FBQcFBQcHBwUFBQcHBQUHBwcHBwUFBQUHBwcHBwcHBQcHBQUHBwcHBwcHBwUFBwcHBwcHBwcFBwcFBQUHBwcHBQUFBQUHBwcHBwUFBQUHBwcHBQUFBQcHBwUFBQcFBwcHBQUHBwcHBwcHBwUFBQcFB" +
"QcHBwcHBwcHBQcHBQUFBwcFBwcHBwcHBwUFBQUFBwUFBwcHBwcHBwUHBQUFBQUHBwcHBwUFBwUHBwcHBwUHBwcHBwUFBQUFBQUHBwcHBwUHBwUHBwUFBQcHBQcHBwcFBwcFBQUHBwUFBwcHBwcHBwc" +
"FBwcHBwcHBwUFBwcHBQcHBQUFBQcHBQUHBQUHBwcHBwcHBwcFBQUFBwcFBQcHBwcHBwUHBwcHBQcHBQUHBQcHBwcHBQcHBwcHBwcFBQUFBQUHBQcHBwcHBwcHBQcHBwcHBQUHBQcHBwUFBQcHBwcHB" +
"wcHBQUFBwcHBwcHBQcHBwUFBwcHBQcHBwUFBQcHBwcHBwUFBQcFBQcHBwcHBwUFBQcFBQUHBQcHBwUHBwcHBwcHBQUHBwcHBQcFBQUHBQUHBwcFBwcHBwcHBwcHBwUHBwcHBwUHBwcFBQUFBQUHBQU" +
"HBwcFBQUHBwcFBQUHBQcHBQUFBwUHBwcHBwcFBwcFBQcHBwcFBQcFBwcHBwcHBwcHBQUFBQUFBwcHBwcHBwUFBQcHBQUHBwcHBwcHBQUFBwcHBwcHBwUHBQUFBQcHBQUFBQUHBwcHBQUFBQcFBQcFB" +
"QUFBQcHBwUHBwUFBwcHBwcHBQUHBwcHBQcFBQUFBwcHBwUHBQUHBwcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQUFBQUFBQcHBwcHBwUHBwUFBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQcHBQcHBwc" +
"HBQcHBQUFBQUHBwcFBQcFBwUHBwcHBwcHBwcHBQUFBQcHBwUFBQUHBwcHBwUHBwcFBQUFBwUHBwcHBQcHBwUFBwcHBwcHBwUFBQcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQcFBwcHBwcFBQUFB" +
"QUHBwcFBQcHBwcHBQcHBwcHBwcFBwcFBwUFBQcHBwcHCAgYOGh4mLi4uMjIuLiYmHhYSDgYGAgICAgIGBgoSFhomJiouLjIyLi4qHhoWBgH58enl4dXR0c3N0dXZ3eHl6e31+fn+AgH9+fn18e3p3d" +
"3Z0dHN0dHV3eHl7fX6Ag4WGiYqLjIyMi4uKiYeGhYOCgYCAgICAgIGCg4WHiImKi4uMjIuLiYiHhIOBfXx6eXd2dXRzc3R0dXd4eXp7fH1/f39/f399fXx5eHd2dXV0c3N0dXZ3gIGDhIaHiYuLi4y" +
"Li4mJh4aFhIOBgYCAgICBgYKDhIWGiYmKi4yMi4uKiYeGhYGAfnp5eG1sa2ppaWprbW5yc3V4ent9fX19fXx7eXl4dnV1dXV2d3h6fIGDhoyPkZaYmZqbm5uZmJaSj42HhYJ/fXt6d3Z2dnd3eXp7f" +
"H19fn5+fXt6eHVzcW9ubGtpaGhpa2xwc3Z8f4KFiIuNkpOUlpaVlJKRj42MioeFhIKCgoKDhISGh4eAg4aMjpCUlZaWlpaVk5GPjIqIhYSDgoKBgoKDhIaHiImKioqJiYiEgoB7eHVwbmtnZmVkZGR" +
"lZ2lrcHN1e36AgoSGiImKiomIiIaFhIOCgoKCgoOFh4iMjo+Rk5SVlpaWlJKQjImGg313cWVgXFVTUlJTVVdbXmJqbnJ6fH+EhIaGhoWFhIODg4ODhoeKj5KVmJyfoaWnqKalo5uXko2GgXtuaGNZV" +
"VNPT09QU1ZZYWVqdHh8gIWLkZicoaiqrKyrqqWhnpuWko6HhIJ9fHt7e3x9fn5+fn59enl2cW5qY2BdW1lXVldYWmFlanZ7goiPlJqkqKuvsK+tqqejn5uXjYmFfnt5dXV0dHR1dnd4eHl5eHVzcW9" +
"saWZhX11bW1tfYWVuc3h+hYuRnaGmra+xsbCurKikoJaRjIJ+enNyb25ubm5vcHFzdHV1dXRzcnBuV1RSTk5OU1ZcYmpyfJGbp7rDy9fa3NzZ1s+Ai5mxusTR1NfW083IwLmwnZWKeXNsYmBdXFxcX" +
"F9hY2ZnaGhmZWRiYF5cW1xeYWVwdn6HkJmjtr3G0dXX1dPNx761qZCFd15TRzYwLCkoKSs1PERVXmh7gouXm5+ho6OkoqCem5mYl5eYmZucnqKjpKOin5eSi4R7c2hVTUQ1MCsoKCwvNj1HXml3kJy" +
"pvsbN0tXX19HMxrato5CIfnhwamVeXVxcXV5iY2VoaGhnZmVjX15cgIuZsbrEytHU19bTzcC5sJ2VioJ5c2xiYF1cXFxfYWNlZmdoaGZlYmBeXFtcXF5hZXB2fpCZo7a9xsvR1dfV082+tamQhXdeU" +
"0c/NjAsKCkrNTxEVV5ocXuCi5ebn6OjpKKgnp2bmZiXl5ibnJ6io6Sko6Kfl5KLe3NoVU1EPDUwKygoLDY9R15pd4OQnKm+xs3V19fRzMa2raObkIh+cGplXl1cXF1eYGJjZWhoaGZlY19eXFyAi5m" +
"xusTR1NfW083IwLmwnZWKeXNsYmBdXFxcXF9hY2ZnaGhmZWRiYF5cW1xeYWVwdn6QmaOstr3G0dXX1dPNvrWpnpCFd15TRzYwLCgpKy81PERVXmh7gouXm5+ho6OkoqCem5mYl5eYmZucnqKjpKOin" +
"5eSi4R7c2hVTUQ1MCsoKCw2PUdRXml3kJypvsbN1dfX1dHMxrato5CIfnBqZWFeXVxcXV5iY2VoaGhnZmVjX15cgIuZsbrEytHU19bTzcC5sJ2VioJ5c2xiYF1cXFxfYWNmZ2hoaGZlYmBeXFtcXmF" +
"laXB2fpCZo7a9xtHV19fV082+tamQhXdeU0c/NjAsKCkrNTxEVV5ocXuCi5ebn6OjpKKgnp2bmZiXl5ibnJ6io6Sjop+cl5KLe3NoVU1ENTArKSgoLDY9R15pd5CcqbO+xs3V19fRzMa2raObkIh+c" +
"GplXl1cXF1eYGJjZWhoaGZlY19eXFyAi5mxusTR1NfW083AubCnnZWKeXNsYmBdXFxcXl9hY2ZnaGhmZWJgXl1cW1xeYWVwdn6QmaOstr3G0dXX1dPNvrWpnpCFd15TRzYwLCgpKy81PERVXmh7gou" +
"Xm5+jo6SioqCem5mYl5eYm5yeoKKjpKOin5eSi3tzaGBVTUQ1MCsoKCw2PUdRXml3kJypvsbN1dfX1dHMxrato5CIfnBqZWFeXVxcXV5iY2VoaGhmZWNiX15cgIyasrzF0dTV1NLOyLqxqJaOhXdzb" +
"mxpaWhpa2tsbW1raGViXlpWTktJSElMVl1mb3qFkam0v9DX297d2dPLw7iglIdvZVpLRkI/QEJFSU5SXWJnb3FzdXV1dHRzc3V2eYGGjZykrLS7wcfO0M/Jw7unnI6CdGhaQzoyJyYlKzE3QElSXXF" +
"6g5KXnKGhoqGgnp2Zl5eXmJqeoaSprKyurKunnpeOenBkTkQ7MywnJCMmKzpEUICMmqWyvMXR1NXSzsi6saiflo6Fd3NuaWloaWtrbWxtbWtoZV5aVk5LSUdISUxWXWZ6hZGst8LU2d3e3drUw7mtl" +
"Ih8Zl9YVFBOTVFTV19iZGhoaGZjYV5ZV1ZXWV5rc36IlaCtwsvT3d7d083DuKufkndsYVFLR0RFSExPVFliZWhra2tnZWNgYGFiZmpxgouWrbfB0tfb3NvY0sC2qY6CdFxTSkQ/PTxAQ0hUWl9pbG9" +
"wcXFwgIybtL3G0dLT0MzHwLCon4+Jgnt5eHl5ent9fXt3c25hWlNEPjk1MzI0PkVQaHSCnqq3wcrQ1dfV0cO7sp6WjIR9eHNubm5wcXJ0c3JvbGhiVlBKPzw6Oz5ES1Vea4aSobrEzdjb29nTzMOvp" +
"ZqGfndta2psbm5xcnNyb2tmWlRNQDs5Njc5P09ZZoKPnrjCy9LW19fOyMCso5mIgnt4dXV0d3h5e3t4cWxmX1ZPRzk0MjE0OoCNm6i1vsfQ0dDIwbqpoZmMiISCgYGBhYeHh4WAdW5mXVNKQTItKis" +
"uNUlUYm9/jJqyu8LKysrBu7WtpZ+Yj4yKiouMkJKRkY+MhndvZU9GPC0oJiUoLDNIVGJ+i5mvtr7Dw8K+ubSuopyYkpGQk5WXmZqcm5aSi3lwZE1DOTApJSMmKjNIVGJ+ipehq7G3vLu5sa2onpqYl" +
"pWVl5mdoaeopp6YjoN3al1FOzMpKSs3QEtjbnqEgI2bs7vDyMfEuLGpoJmSjYaGhYqOkJaYlpWQioFtYlZBODEqKi4zPEVSbHmGnKOprq2rqKSfmpKQj5KVmqWrr7O1trSqopd+cWNJPzYsLC0yOUF" +
"LYGp0hImNj42Lh4WBgH+BhZCYobO7wsjLzczBua2ShXddU0lDPj09RUtRYGdsdHV1c3FtamNhYGRocIOOmqayvcfU1tbNxrykmIpzamJeWllZXmNmbnBycGxoYlxVT0ZDQoCNm7O7w8bIx8S4samZk" +
"o2GhoWIio6QlpiWj4qAal9SRzw0LSkrMUNOW3aBjpaeoqWkoZ2UkY6MjpKepKyzub7Bv7uznZGCZVhLQjo2NDg+RVZfaHV5e3t6d3RtamhqbXSGkJ2otb/J1dbVycC1m46BdmtkXVlaXGRpbXJzcW5" +
"qZF1OSEM9PkNTXWqHlKOvusLIy8jDtKyjkoyIhYSEho2RlJeXk4Z+cmdaT0MxLCktMjxTX215gI2ctLzDx8XAs6yjnJSPi4mKjJSYm5+empaNhHheU0YzLSkrMDlOWWdzgImSnZ6emZWRi4mJio2Sm" +
"amwuMPGxr+4raGThXZaT0U6ODpFTVRdZWxxdHJwZmFdWVldY2x3hKGuu87T1c/IvrSnm5B+eHR0d3qChoeEgHlxZVpPOjMtLTE5T11reYiTnqmrq6SempCNjY6SmJ6utbzDw76uo5WHdmhaRD45O0B" +
"GV19nbXJzdG5qZYCOnbW9w8TEwLuso5yQjYyQlZmjqKippaCYgHNkSD00KysvNT5IVGt1foiJiYN/e3h2dXiDi5atuMPR1NTRycG1mYt9Zl9ZVllcYWZsb3NybmJaUkM+Ozo+Q0xlc4KgrLfDxMS5s" +
"qqimpSPjI6Rm6Ckqaikn5WKfWBTRjItKzA3QEtYY2+AhIeFgX10cXJ0eX+Joq66ztTW0Mi9saKVhm9oY2JkaHJ2eXp4dW9dU0k4MzE3P0qAjp2qtr3Cwr23p5+Xjo6Pk5ido62vrqWdkHNlVUg8NS8" +
"wNTxRW2Z3e35+fHl1a2hobXN9lqOxvcjQ1dTPxq6ilHx1bmxrbXB5fYCAfXdkWU45Mi4sLzQ+WGV1kZukq6upo56ZlI2Mj5qhqrrAxcbDv7acjn1fVEk/P0FGTVRcam5wbmlkV1JOTE5SWnF+jq24w" +
"8/Pzce/tquWjoiDhIaQlJibmZOLgHVmSz81KSksPEdUYW55g3WDk6mvsq28s6uim5WSf4STmqGpvbmyp5qKbF8+MTAzQUpqc3yBhYN/ZFZQTU1ScHuJmKfCy9K+urKdkoeNioiKjpSakJSUi4J2bmF" +
"USUE9PDI7R19qdJOUko6Jg31hYWV1gI69yNHX2dfRvZyOdWxlYXh9g4mOkpN7dF9URzJAPD1BSFRufHaLkJSQi5qOioiJjZOHnaeyvr/SwranmYl8cE1MTVZdZIOGhYJ8dGpBOTMxNT51g5Ofqa+yr" +
"byzopuVkn+Ei5Oaoam9uaeaimxfPjcxMDNBSmp8gYWDf2RWUE1LTVJwiZinwsvSvrqyqJ2Sh42KiI6UmpCUlJGLgnZuYVRBPTwyO0dSX2p0k5SSiYN9YWFla3WAjr3I0dnX0b2cjoF1bGVheH2JjpK" +
"Te3RfVEc8MkA8QUhUbnx2i5CUk5CLmo6KiI2Th52nsrm+v9LCtqeJfHBNTE1RVl1kg4aFfHRqQTkzMDE1PnWDk6mvsq28s6uim5WSf4STmqGpvbmnmop8bF8+MTAzQUpqfIGFhYN/ZFZQTU1ScImYp" +
"7XCy9K+urKdkoeNioiKjpSakJSUi4J2bmFUSUE9PDI7R19qdJOUko6Jg31hYWV1gI69yNHZ19HJvZyOdWxlYXh9iY6SlJN7dF9URzJAPEFIVGBufHaLkJSQi5qOioiJjZOHnaeyvr/SwranmYl8cE1" +
"MTVZdZIOGhYJ8dGpBOTMxNT51g5Opr7KxrbyzopuVkn+Ek5qhp6m9uaeaimxfPjEwMzlBSmp8gYWDf2RWUE1LTVJwiZinwsvSvrqyqJ2Sh42KiI6UmpCUlJGLgnZuYVRBPTwyO0dfanR6k5SSiYN9Y" +
"WFldYCOm73I0dnX0b2cjnVsZWJheH2JjpKTe3RfVEc8MkA8QUhUbnx2i5CUk5CLmo6KiI2Th52nsrm+v9LCtqeJfHBNTE1WXWR/g4aFfHRqQTkzMTU+SXWDk6mvsq28s6KblZKSf4STmqGpvbmnmop" +
"8bF8+MTAzQUpqfIGFhYN/ZFZQTU1ScImYp7XCy9K+urKdkoeNioiOlJqLkJSUi4J2bmFUQT08QDI7R19qdJOUkomDfXhhYWV1gI69yNHZ19HJvZyOdWxlYXh9iY6SlJN7dF9URzJAPEFIVGBufHaLk" +
"JSQi5qOioiNk4eRnaeyvr/SwraniXxwU01MTVZdZIOGhXx0aktBOTMxNT51g5Opr7KxrbyzopuVkn+Ek5qhp6m9uaeaimxfPjEwMzlBSmp8gYWDf2RWUE1NUnB7iZinwsvSvrqynZKHlI2KiI6UmpC" +
"UlIuCdn5uYVRBPTwyO0dfanR6k5SSiYN9YWFldYCOm73I0dnX0b2cjnVsZWJheH2JjpKTe3RfVEcyQDw9QUhUbnx2i5CUkIualI6KiI2Th52nsr6/0szCtqeJfHBNTE1WXWR/g4aFfHRqQTkzMTU+S" +
"XWDk6mvsq28s6KblZKSf4STmqGpvbmnmopsXz43MTAzQUpqfIGFg39kXVZQTU1ScImYp8LL0r++urKdkoeNioiOlJqLkJSUi4J2bmFUQT08QDI7R19qdJOUkomDfXhhYWV1gI69yNHZ19G9nI6BdWx" +
"lYXh9iY6Sk3t0a19URzJAPEFIVG58doCLkJSQi5qOioiNk4eRnaeyvr/SwraniXxwU01MTVZdZIOGhXx0aktBOTMxNT51g5Opr7KtvLOropuVkn+Ek5qhqb25sqeaimxfPjEwM0FKanN8gYWDf2RWU" +
"E1NUnB7iZinwsvSvrqynZKHlI2KiI6UmpCUlIuCdn5uYVRBPTwyO0dfanSTlJKOiYN9YWFldYCOvcjR19nX0b2cjnVsZWF4fYOJjpKTe3RfVEc=\"},\"zero\":{\"f0\":121.45,\"n\":11100,\"b64\":" +
"\"AAAAgIOHjpCRkpGQjo6OjpCSlZyfoaampqSin52amJaVlZaZmpubm5mXk5CMhIB9eXl5enp7fHt6eHJvbGRhX1xcXV9hYmRnaGhmZGJeXVxcXl9iaWxwdnl6e3t6eXh4eXt+gYmNkZeam5ubmZiXl" +
"pWVl5meoKKmp6alo6Gel5SSjo6OkJGRkpKRYGCgoKCgYGBgoGBgYGCgYGBgYKCgYKBgoKBgYGCgoKBgYKCgoKCAg4eOkJGSkZCOjo6OkJKVnJ+hpqampKKfnZqYlpWVlpmam5ubmZeTkIyEgH15eXl" +
"6ent8e3p4cm9sZGFfXFxdX2FiZGdoaGZkYl5dXFxeX2JpbHB2eXp7e3p5eHh5e36BiY2Rl5qbm5uZmJeWlZWXmZ6goqanpqWjoZ6XlJKOjo6QkZGSkpGgoGBgYGCgoGBgoKBgYGCgoKBgYGCgoGBgY" +
"KBgYGBgYKCgYGBgYICDh46QkZKRkI6Ojo6QkpWcn6Gmpqakop+dmpiWlZWWmZqbm5uZl5OQjISAfXl5eXp6e3x7enhyb2xkYV9cXF1fYWJkZ2hoZmRiXl1cXF5fYmlscHZ5ent7enl4eHl7foGJjZG" +
"Xmpubm5mYl5aVlZeZnqCipqempaOhnpeUko6OjpCRkZKSkWCgoKBgYGCgoKBgYKCgYGBgoKCgYGBgoKBgoGCgoKBgYGCgoKCggIOHjpCRkpGQjo6OjpCSlZyfoaampqSin52amJaVlZaZmpubm5mXk" +
"5CMhIB9eXl5enp7fHt6eHJvbGRhX1xcXV9hYmRnaGhmZGJeXVxcXl9iaWxwdnl6e3t6eXh4eXt+gYmNkZeam5ubmZiXlpWVl5meoKKmp6alo6Gel5SSjo6OkJGRkpKRYGBgoKCgoGBgoKBgYKBgoGB" +
"gYGCgoGBgYKCgYGBgYKCgYGBgYGCAg4eOkJGSkZCOjo6OkJKVnJ+hpqampKKfnZqYlpWVlpmam5ubmZeTkIyEgH15eXl6ent8e3p4cm9sZGFfXFxdX2FiZGdoaGZkYl5dXFxeX2JpbHB2eXp7e3p5e" +
"Hh5e36BiY2Rl5qbm5uZmJeWlZWXmZ6goqanpqWjoZ6XlJKOjo6QkZGSkpGgoGBgYGCgoKBgYKCgYGBgoKCgYGBgoGBgYKCgYGBgYGCgYGBgYICDh46QkZKRkI6Ojo6QkpWcn6Gmpqakop+dmpiWlZW" +
"WmZqbm5uZl5OQjISAfXl5eXp6e3x7enhyb2xkYV9cXF1fYWJkZ2hoZmRiXl1cXF5fYmlscHZ5ent7enl4eHl7foGJjZGXmpubm5mYl5aVlZeZnqCipqempaOhnpeUko6OjpCRkZKSkWBgoKBgYGBgY" +
"KBgYKCgYGBgYGCgYGBgoKBgYGCgoKBgYGCgoKCggIOHjpCRkpGQjo6OjpCSlZyfoaampqSin52amJaVlZaZmpubm5mXk5CMhIB9eXl5enp7fHt6eHJvbGRhX1xcXV9hYmRnaGhmZGJeXVxcXl9iaWx" +
"wdnl6e3t6eXh4eXt+gYmNkZeam5ubmZiXlpWVl5meoKKmp6alo6Gel5SSjo6OkJGRkpKRYGBgoKCgYGBgoKBgYGCgoGBgYGCgoGCgYKBgYGBgYKCgYGBgYGCAg4eOkJGSkZCOjo6OkJKVnJ+hpqamp" +
"KKfnZqYlpWVlpmam5ubmZeTkIyEgH15eXl6ent8e3p4cm9sZGFfXFxdX2FiZGdoaGZkYl5dXFxeX2JpbHB2eXp7e3p5eHh5e36BiY2Rl5qbm5uZmJeWlZWXmZ6goqanpqWjoZ6XlJKOjo6QkZGSkpG" +
"goGBgoKBgoGBgYKCgYGBgoKBgYGBgoKBgYKCgYGBgYKCgYGBgYICDh46QkZKRkI6Ojo6QkpWcn6Gmpqakop+dmpiWlZWWmZqbm5uZl5OQjISAfXl5eXp6e3x7enhyb2xkYV9cXF1fYWJkZ2hoZmRiX" +
"l1cXGFjZmhrb3R8fHt5cXJzdX6Dh4uUj5GTkpiVlJSOj5KUm6WoqqqinZqXnJqZmZqVl5mZn5qXk4iDgGBgoGBgYGBgoGBgYKBgYGBgYGBgoGBgoGBgYKCgYGCgYGCgoKCgfICEi4yUk5KRiYmKjJC" +
"anaSnoaKgnqCdnJuTlJWZm6Sko6GTj4uIhImHhoeBg4OChIF9eW1pZmJiamxub2hnZmNgZGFcXFVYW15rbW9vaGdmY2Joa25xc3d7gYmKiYmIgH+Ago+Tl5ibnJ2dnKGdnJuUlZecpqipqaifmZaSk" +
"5GQiYqMjY2NYGBgoKBgYKBgoKBgYGBgoGBgYGCgoGBgYKBgYGCgoGCgYGBgYGB8gISLjJSTkpGJiYmKkJqdpKehoqCeoJ2cm5OUlZmbpKSjoZOPi4iKiIiLjoOFhIKFf3l0YV9fY3R3enpqYVtWYF1" +
"cXWNaXmVlcm1pZVRTU1Vtc3iCdnZyb3p4eHl8eX+Fjp6fm5iHhISGmJ6jqKKjopyXoZuam5CTl5utrauhjYh/fYuMjpGUiIeFeoJ8cnBiY2VpbH18emJdWFBdXmBkaF5kZWRsaGRfUlRXXWN2f4GBb" +
"2xpeX+Ei4yZlpSRjoCChp+lqa+gnpuXk52am56YnJ+hrqqmoJuIgYGClZmbjYqGgXqCfXV1dm1wcoB+enVvXFdRUWFobHBlZGFeZ2NfXV9UXmRofX17aGVjYmNzd4WNhoyKhoyIhod+hY2cr7Kvqpa" +
"Mi4yepKqxq6uonKOclZaLkJWanamknX53cnGCh4yPkYJ4cGhnZGNbYWZqa3h0Zl9LRkdMZ21xZWJcVlFbWV9YYG90hIF8d2V5gYiQj5qRjXyAhY2iq7G0pKCZj5qaoqihp6qrqauknIWFiJCkqKmno" +
"459dXB6fYF8f398dn11ZWFSV1xhdnZ0WVNMR0VUWGVrY2dkYGNeXFxTWGBwhIeGgm9oZ2l8hIyUk5aVjpeSkJKKkZmgpre1r5WQjY+hqK6ztqmhmpOTj4+Gi5CUlaGdjYVvZmZphoqMcGlgV2VhYWl" +
"aYGRhcGFbV0JGTFN1eHdZU01KY2lye4Nycm5pdX6FjJ6alJCMd4KKkrW2tJSOiYeJoqm3p6ihmaebmpyMkpidsKujkXZzdnuWm5mAeG5lXm5xdmtubmNwZ2BcW0hUW2B1cWpHQ0NGYWlxfGhlW1Vma" +
"XB4bHV7fY6Jg2pscYOhp6qrqI6DgIGhqbGmpqOdlqSfn4+WoqW6r6eff3+BhqGmqaSJgG5pfIGHd3t7eHJ1bWdQVFlke3p2b2dLQkNHanF1YFtVTl5cXWldZXBwgnhzcFx1foWMnpqQjHeCipKvyMf" +
"BkYiEqbTA0LSslYmenaGqmKalnZ+SiGpye4SkpJ2DWU5KbXaGh2ZcT0I3UFdiWl5cZVpQTE87R2CChHZsSEdPXYeVnaB6cGiBiZaxnqOgmauim6COp7C0xLmthYePmcDIyr6Vh3WRlaevlZKIe2xzc" +
"nVqc3aIe21gPDk8UHZ7dmxEMC9PWGVxel9XTVhWXFhmcXd3jYV1c1x0gquzrqaAeXV4qbfDcn+Lkaaejox1f4yawsjBuIiEhbTAytCzrKGJnpyqtKGknayfkYiDcXuDo52QWE5ISlB2f4eCW0E3Tld" +
"ibVpeXFRaUE07R1VnhIB2bWRFUF2InqCecWhkipaksaCjoZCinKCqm7G0zcS5raWHj5nIysaUh3t1dJWerpWRemx7cXV9anJ2c3ptYDk8RVl7fHZsRDgvM1hxen1XTUNYV1xnZnF4coV8dFxng4+ys" +
"6+mnXZ4gbfDynJ/i5CRpp6OjHWMmsLIwbiRiISFtMDKs6yhiZ6coaq0oaSdrJGIg3F7g4ijnZBYTkhQdn+HgltPQTdOV2JtXlxUWlBNO0dVYGeEgG1kRVBdiJ6gnnpxaGSKlqSgo6GQopyboKqbsbT" +
"Nua2lh4+ZpMjKxpSHe3KSmamukIl+cGJsa29ja25ldmlcU080RVBZeXNpOTMyXmp3gohsZ1dPaHN+jYqOj4qelY+QfIiiq8rAtqyIhYeOcn+Kk6qjk491fIiVoszKw5OKhoyyvcfNzqyWin+UmaGVm" +
"ZaOgpCCcnJba3J0hHlrOTY5QElwd3hVSjYwTF1pdmNoZmFrZGJuXm2EiKOelo2Hb3iFu8PGu5WMhYOHq8LL0Kyilp2bnaOQmqCdsKOHf19ncXiZmZSJUUY/QWVvfX1cRzszSkxTXllgYldpYFpfTVt" +
"pdHyYkIhhYWiCq7e9vp2VhH+crbnFtLSupJiqoZ6ijp6ionJ/ipKVk6mZlZODjprLzs7HvrSOhYaNu8PHpJqNdIiFhoyTmoWBeXtuY1xDSlNbYWJzaF0wLzJFbHd+gX9dTEZEa3aEnYiKiIJ7j4qOl" +
"5Whqq3Eu7Goo4WQmqTMzMawh3x1c3SXpqqrgnZpbWZlcHdjaGdjWl9UTTI6RFlefHlyaWA8PkZ7iJOcfXdvaGRkj5upo6enma2koJ+krKaus8rBtZ59e36FjLC2sahyZVpUc3qCiYxvcn+KlZOpmZW" +
"Tg46apsvOzr60joWGjbvDx8akmo10iIWMk5qFgXltfXBlWVpDUlleeXJpX1YzMDhCTYCHioZjXFdVVneOmqedn5yQiJ6bnaKrpK2zsse8pp6ZfoSMk5e0sZ6SaVNPTnN6gYWFgV5IPjRLT1dsWV9iY" +
"VxUY19fUVxpgomopqOclXJ0eY+3ws7NyKSakYmFpKu7wqmgl4p+jYN+f4VweXl2fnJlVDU3PUVOVnl4cnJ+ipaWrqehmpaAh5KosNDKwriSiIOBiKuzvLq1gnZpX3RydH+Gb21nXWFXUE1OOEFUW19" +
"2b2dZPD5FUFyFm5+fenRta3CUrbjDyK6rpZOooqWqtKitraqhsqaJgHpja3KBoJ2ViXtsNS8sN11pfYGCYVlPRTUzVGl4iIeNkI2GfZGGhoyHlaO4u9XPw7erfXp8i5Wdw8G6nnNjV05KSnR9hY1vZ" +
"05BNEhDQ0lhUl5ubmt2bWZicoGPn6CdqJ6Xk3yGkZ+stdjTyrCGem9ydpukrLGupn1eT0NVWF9ocnxmZV9UWE1HSVFBX2x2e5iUjXx1c2BqeZjBys3Mxr2Lgn6Cp7HHz9G0rKCSc4R8e4GJfYKCfXN" +
"ndFdOSDI7RlxjgoB6cWc4NDZHVICep6ysp4N7bGptnKm40Lq7rqKWppyXlqGPmKKloqqdjn5xZ2BCSFBgZ4aAeG1iOzErLDI9dYKOnZ1+eHFpY3yAiXKAjqCjobixqKCWln+RnKe31tPMwrWncGhjZ" +
"GqNmp+ekWtdTkA1LUdMVWt2YmlmYVlRZF5dY21tfIqfoqK6s6qil3p9jpmk0tbVz8W5q3NqZGJoi5men5t4bmFEOC9GSlJoc2FnaWdjU2ZfXGFqaXiHnaK+u7WspJd5fIuWodDV1dHIvZJ3bGVigom" +
"XnZ+denFkSDtNRklQZVReZWloZHFoYVxfZ2V0g5GbvL+3rqZ8enuIk5/GcoCOoKOhsaiglpZ/jZehq7K208i+sZVsYVVUV1x/hIqQjohZTkIuKSdFS1NfeYWPfX57b2qAfXyAhpuMmrG4u7bKwLWpo" +
"Jd0dHiFi5CvrKWajoBxPDQvMjhBcHh/g4BfWFBJQz9fZn6MmrShpqimoZqmn5qan6acpaywsq+orZ+Rd25pTVBXXmVqiIV/dmA6MSkqMDpFbnyUnaKFgXtva2lrjJOet8PNvLy4pZqOlI2JiIuPeXJ" +
"/jaGlprqzq6OdmZiFjJWorrLLxLmsnY9mU05NVFp9iIqJhX1YTTcvKkdNV3B9ipWAhIV+eHKEhIaVoKydqbO5w8C4tqqchX54YmZscnd9f5KNhG5iVi0pJykwOUV2g5Gjp6iNh4F7dnNzkJeiuMLL1" +
"b+6s6eaim12bGJiZG9haG1xcW9ibmRRSkZITkRPX219l6C7vLiyo5yBfX6DiZKbuMXIx7mvoG1fUUY+OjlWXWZ2fYF1g5Ofqa+yrbyzopuVkn+Ei5Oaoam9uaeaimxfPjcxMDNBSmp8gYWDf2RdVlB" +
"NTVJwiZinwsvSvrqyqJ2Sh42KiI6UmpCUlJGLgnZuYVRBPTwyO0dSX2p0k5SSiYN9YWFla3WAjr3I0dnX0b2cjoF1bGVheH2JjpKTe3RrX1RHMkA8QUhUbnx2i5CUk5CLmo6KiI2Th52nsrm+v9LCt" +
"qeJfHBNTE1RVl1kg4aFfHRqQTkzMDE1PnWDk6mvsq28s6uim5WSf4STmqGpvbmyp5qKbF8+MTAzQUpqfIGFhYN/ZFZQTU1ScImYp7XCy9K+urKdkoeNioiKjpSakJSUi4J2bmFUSUE9PDI7R19qdJO" +
"Uko6Jg31hYWV1gI69yNHX2dfRvZyOdWxlYXh9iY6SlJN7dF9URzJAPEFIVGBufHaLkJSQi5qOioiJjZOHnaeyvr/SwranmYl8cE1MTVZdZIOGhYJ8dGpBOTMxNT51g5Ofqa+yrbyzopuVkn+Ek5qhp" +
"6m9uaeaimxfPjEwMzlBSmp8gYWDf2RWUE1LTVJwiZinwsvSvrqyqJ2Sh42KiI6UmpCUlJGLgnZuYVRBPTwyO0dSX2p0k5SSiYN9YWFldYCOm73I0dnX0b2cjnVsZWJheH2JjpKTe3RfVEc8MkA8QUh" +
"Ubnx2i5CUk5CLmo6KiI2Th52nsrm+v9LCtqeJfHBNTE1RVl1kg4aFfHRqQTkzMTU+SXWDk6mvsq28s6KblZKSf4STmqGpvbmnmop8bF8+MTAzQUpqfIGFhYN/ZFZQTU1ScImYp7XCy9K+urKdkoeNi" +
"oiKjpSakJSUi4J2bmFUQT08QDI7R19qdJOUkomDfXhhYWV1gI69yNHZ19HJvZyOdWxlYXh9iY6SlJN7dF9URzJAPEFIVGBufHaLkJSQi5qOioiJjZOHnaeyvr/SwraniXxwU01MTVZdZIOGhXx0akt" +
"BOTMxNT51g5Opr7KxrbyzopuVkn+Ek5qhp6m9uaeaimxfPjEwMzlBSmp8gYWDf2RWUE1LTVJwiZinwsvSvrqynZKHlI2KiI6UmpCUlIuCdn5uYVRBPTwyO0dfanR6k5SSiYN9YWFldYCOm73I0dnX0" +
"b2cjnVsZWJheH2JjpKTe3RfVEc8MkA8QUhUbnx2i5CUkIualI6KiI2Th52nsr6/0szCtqeJfHBNTE1WXWR/g4aFfHRqQTkzMTU+SXWDk6mvsq28s6KblZKSf4STmqGpvbmnmop8bF8+MTAzQUpqfIG" +
"Fg39kXVZQTU1ScImYp8LL0r++urKdkoeNioiOlJqLkJSUi4J2bmFUQT08QDI7R19qdJOUkomDfXhhYWV1gI69yNHZ19HJvZyOdWxlYXh9iY6Sk3t0a19URzJAPEFIVG58doCLkJSQi5qQi4mMkYSNm" +
"KKsu77Sx72wk3BiWE5JRkpkanh+goJqZFxUS0M4S011g5Kor7Oyxb+4p56YfH1/i5KYt7q4ta2klmVXSDQvLEdPWGJtdn91dXVsZmFta2xweIGNlKGtv8PDzsW6r6KXjGlnZ250eZeZmJSOhXpNQTY" +
"pJyhKVWJvfoqWkJOUjYeCjImKkJehlqGqs72+z7+zpId6WVBJR0ZOVHB9gYOAel5VTUQ+NzhSZXGAnquiq7GzsqigrZyWkpKWho2Um6CkuLKfkoNmRToyLSwvPVtleYGHi3NwdYOSnqivs8W/uKeem" +
"Hx8fYCGjJGxtbWwqZ9xZFZKPTRCPkFGWGJYbXR7fX+SkIeCfnllaXeAi5e4w8zX2Nazqp2Cdml1bWlmaW5daG1wcG19bmVdVU40Mzg/SWOGlK+4wMSysK2gmJCYk5GTl5yNk5mdoJ+unZGDaFs7Myw" +
"pKTNQWnB6hHt+f316dXF9eXl/hY2OmqWvub/D1c/Hr6J/Z15XUVJqbnR6foZxcGdgV1tTTUlISU51gpGnrrPIxL63rqaefnt6gIWKqq+xsrCrjnhsXkM5RT0+QUhRRlFncHmWl5aOiYWAaGhpc3uFs" +
"LvF1NfXuLCkmJCEhG5mYFtOUVpgZmt8f397d3BVT0hCQVJWXmZyjYuasLi+z8zHwbivpYV+eHJygomOkpaYi4qBenFpX1RDPTorLjI7UFx4kZulsKOknZiTjZaSj46RlZOaoayvvr24s6mSeGlPRTs" +
"/PkBESlJbYGlxfH6NeYWTnqmxt8jFwLKrooaBfXt8fY6XnKCll5WJgXVra2BUQTw4LDE5Tll0i5OcoaSXlo+LhoyKiY2RmJGaoam2ucjBu7GZfnBjVktCRkVHUVhgYmlvc3V2gnx3cmtaWl9lbneRn" +
"arAyNDIxsKyqKqekYd8bVxaWVtdcnV4e3pqZ2JcVkhRTEZHSklRXWl3hKC6xMzWyce9tq2kqJ+WiISAcXJ0eoqMjYyLh21lXElBOTo3Nzk+REB5hZSrtLvQz83IwrullI6Hf4uJjI+RiYuMi4iEi3p" +
"xZlA5MSYkJSg8RE9odHSOl6Gsvb27uLSvlpGNiIiJnKGlqq2io6KemJWKfWNYTDQrJiIkKD1RW2dxe4WMkpWYpKKfmJWFhIWIk6eutbvAxLm4s6Sam4B0ZVlNNi8oKSxHTldrc250eX1/f4uJg4CAc" +
"3Z6gYiQqLvDy9XIx762q6Cfk4RqYFU7OTg7TVJYX2ZsaWxvcXB9eYWTqrO7zdHS0cm1rZ2VjY6JhYOBgnR4enx+jYqEf3hjW1NKPEM/OzxAP0hUX215la65wsDDxL+7tLuzq6KTgHp0dHOEhoiLjI1" +
"+eXZwYmhgUElDLS0uMjhNV298iZWhrLzA0tLQzcispJuLhX+EgoGCgnd4fH5+ioeDd29ZUUlBOjA7O0FGT1ZicHyKpLHEys/Ewr6yq7GooJmSeXZ0c3V2iIuMjHx5dW9oYF5WTkI9LS8zOUF5hZOqs" +
"7vR0tHJta2mnZWNjomFgYJ0eHp8fn6NioR/eFtTSjxDPzw5OTxASFJpe4iirbfAwcfLzMvOwbqxl4+FdnFyb2xramZoaW1vd3d1c3BmYV1TT1NOTU9PVFtjbniLo624w8rP09LP0cnBt6GPg21kW1Z" +
"TT09PSk1UWV1tcXN2b29tbGloa2lpa2Zrd36GoKmyusPCyM3Ny8jAt6CUgHVnXFFHQTw5OzZBR05VZWxzgISBfIiUrLW9ys7Q0czAuqujm5CJgn14bmtqa2x2eXl7dHJwbWpmYlxXTkRCQkRJXWVve" +
"YaKlq64wdXY2tbSxb2zqp6PhHpoYlVPTk5PWVxfZ2tnbG1tcnBua2lmXmBhY2twd4aOmKCqsrvJztLW1dLHwLasn5SGbWFUPzgwKCcnLTI5QEpSXXB5g5KYnaSlp6empaOfnZuYmJeYmJqcnZ6foKC" +
"empaRg3xza2FZTz85MispKjA1PUWAi5mxusTR1NfW083IwLmwnZWKeXNsYmBdXFxcXl9hY2ZnaGhmZWJgXl1cW1xeYWVwdn6QmaOstr3G0dXX1dPNvrWpnpCFd15TRzYwLCgpKy81PERVXmh7gouXm" +
"5+ho6OkoqCem5mYl5eYm5yeoKKjpKOin5eSi3tzaGBVTUQ1MCsoKCw2PUdRXml3kJypvsbN1dfX1dHMxrato5CIfnBqZWFeXVxcXV5iY2VoaGhnZmVjX15cgIuZsbrE0dTX19bTzcC5sJ2VinlzbGd" +
"iYF1cXFxfYWNmZ2hoaGZlYmBeXFtcXmFlaXB2fpCZo7a9xtHV19fV082+tamQhXdeU0c/NjAsKCkrNTxEVV5oe4KLkZebn6OjpKKgnpuZmJiXl5ibnJ6io6Sjop+cl5KLe3NoVU1ENTArKSgoLDY9R" +
"15pd5CcqbO+xs3V19fRzMa2raObkIh+cGplXl1cXF1eYmNlZmhoaGZlY19eXICLmaSxusTR1NfW083AubCnnZWKeXNsYmBdXFxcXl9hY2ZnaGhmZWJgXl1cW1xeYWVwdn6QmaOstr3G0dXX1dPNvrW" +
"pkIV3bF5TRzYwLCgpKzU8RExVXmh7gouXm5+jo6SioqCem5mYl5eYm5yeoKKjpKOin5eSi3tzaGBVTUQ1MCsoKCw2PUdRXml3kJypvsbN1dfX0czGvrato5CIfnBqZV5dXFxcXV5iY2VoaGhmZWNiX" +
"15cgIuZsbrE0dTX19bTzcC5sJ2VinlzbGdiYF1cXFxfYWNmZ2hoaGZlYmBeXFtcXmFlcHZ+h5CZo7a9xtHV19XTzce+tamQhXdeU0c2MCwpKCkrNTxEVV5oe4KLkZebn6OjpKKgnpuZmJiXl5ibnJ6" +
"io6Sjop+cl5KLe3NoVU1ENTArKCgsLzY9R15pd5Ccqb7GzdLV19fRzMa2raOQiH54cGplXl1cXF1eYmNlZmhoaGZlY19eXICLmaSxusTR1NfW083AubCnnZWKeXNsYmBdXFxcX2FjZWZnaGhmZWJgX" +
"lxbXFxeYWVwdn6QmaO2vcbL0dXX1dPNvrWpkIV3bF5TRzYwLCgpKzU8RExVXmh7gouXm5+jo6SioqCem5mYl5eYm5yeoqOkpKOin5eSi3tzaFVNRDw1MCsoKCw2PUdeaXeDkJypvsbN1dfX0czGvra" +
"to5CIfnBqZV5dXFxcXV5iY2VoaGhmZWNiX15cgIuZsbrE0dTX1tPNyMC5sJ2VinlzbGJgXVxcXFxfYWNmZ2hoZmVkYmBeXFtcXmFlcHZ+h5CZo7a9xtHV19XTzce+tamQhXdeU0c2MCwpKCkrNTxEV" +
"V5oe4KLl5ufoaOjpKKgnpuZmJeXmJmbnJ6io6Sjop+XkouEe3NoVU1ENTArKCgsLzY9R15pd5Ccqb7GzdLV19fRzMa2raOQiH54cGplXl1cXF1eYmNlaGhoZ2ZlY19eXICLmbG6xMrR1NfW083AubC" +
"dlYqCeXNsYmBdXFxcX2FjZWZnaGhmZWJgXlxbXFxeYWVwdn6QmaO2vcbL0dXX1dPNvrWpkIV3XlNHPzYwLCgpKzU8RFVeaHF7gouXm5+jo6SioJ6dm5mYl5eYm5yeoqOkpKOin5eSi3tzaFVNRDw1M" +
"CsoKCw2PUdeaXeDkJypvsbN1dfX0czGtq2jm5CIfnBqZV5dXFxdXmBiY2VoaGhmZWNfXlxcgIuZsbrE0dTX1tPNyMC5sJ2VinlzbGJgXVxcXFxfYWNmZ2hoZmVkYmBeXFtcXmFlcHZ+kJmjrLa9xtH" +
"V19XTzb61qZ6QhXdeU0c2MCwoKSsvNTxEVV5oe4KLl5ufoaOjpKKgnpuZmJeXmJmbnJ6io6Sjop+XkouEe3NoVU1ENTArKCgsNj1HUV5pd5Ccqb7GzdXX19XRzMa2raOQiH5wamVhXl1cXF1eYmNla" +
"GhoZ2ZlY19eXICLmbG6xMrR1NfW083AubCdlYqCeXNsYmBdXFxcX2FjZmdoaGhmZWJgXlxbXF5hZWlwdn6QmaO2vcbR1dfX1dPNvrWpkIV3XlNHPzYwLCgpKzU8RFVeaHF7gouXm5+jo6SioJ6dm5m" +
"Yl5eYm5yeoqOko6KfnJeSi3tzaFVNRDUwKykoKCw2PUdeaXeQnKmzvsbN1dfX0czGtq2jm5CIfnBqZV5dXFxdXmBiY2VoaGhmZWNfXlxcgIuZsbrE0dTX1tPNwLmwp52VinlzbGJgXVxcXF5fYWNmZ" +
"2hoZmViYF5dXFtcXmFlcHZ+kJmjrLa9xtHV19XTzb61qZ6QhXdeU0c2MCwoKSsvNTxEVV5oe4KLl5ufo6OkoqKgnpuZmJeXmJucnqCio6Sjop+Xkot7c2hgVU1ENTArKCgsNj1HUV5pd5CcqbnBx9D" +
"S0tHOysS4saiYkIl8d3Jva2ppZ2doaGhpZ2ZlYF1aWFVST4CKlq22vsvP0dHRz8vBurOjm5SEfnl0cG1raGhoaGlpaWhnZWNhXlhVUk5NS05QU1hfZWyAiZSpsrvL0dbY2trXzsfArKGWf3RqWFFLR" +
"kE/P0BCRk5TWGFmam1xc3V4eXh6enp9f4GFiY6Tn6WsuLzBx8jJx8TAuqqhl4B1alNJQDgxLCknKSw3PkZYYmt0foaNm5+ip6iop6ajoJ6dnJubm5yeoKGio6Khn5yXko19dWxaUUiAipahrba+y8/" +
"R0c/LwbuzrKSdlYiCfXVycW9vb29vcG9vbWtmY15WUk1KRkRBQUJETlRbbXeCmaOut8HIz9fZ2dXRy7y0q6GXjoV0bWdeW1lXWFlaXF1fYmNkY2JhXVxZWFZVVFZYW2RqcYOLlp+qsrvL0NXa2tjPy" +
"sK5r6WahHpwXldRR0VDREVIS09TV19iZWprbG1tbGxsbGxtcHJ7f4aUm6Srs7rBzNDS09HOwruxqJyRhoCKlqu0vcnNz9HQzsrBu7SmoJiLhoF8end1dHN0dHNzcnBuZ2RfW1VRTERBPz0/QUpQV2B" +
"pc36Vn6q9xczW2NjYx8TBt7GrnZeQgn14c29tamZmZWVmZmZnZmZlZGNfXVtXVVRTUlRWWVxhbHJ5ipGZqbC2wsXIysrKyMG8t6iimoqEfXZwbGdgX11bXFxeYGFiY2NkY2NiYF9eXVtcXF5fYmltc" +
"oCGjp6lrLK5vsPJysrHxMCAh5CZoaivuby/wcG/ubayqKOemJSQi4SCgHx8e3p6eXh3dnRvbGlhXVlQTUpHRUNDRkhLVlxjdHuEjZaeprS5vsXGxsPAvLizraiblpCFgX12dHNxcHFwb29ubWxqZmN" +
"hWldUUk9MS0tLTFNXXGpweIGKkpqrsbjCxcfJx8XCvbmzpqCYioV/dHFtamhoZmVmZWZnZ2ZmZGNiX11ZV1VTUlJVV1tfZGlwf4aPoKeuu8DEysrKyYCHkKGor7m8v8HBv725trKoo56UkIuEgoB9f" +
"Hx7enp5d3Z0b2xpZWFdWVBNSkVDQ0ZIS1BWXGN0e4SWnqa0ub7CxcbGw8C8s62om5aQhYF9eXZ0c3BxcG9vbm1samhmY2FaV1RPTEtLS0xPU1dcanB4ipKaq7G4vcLFx8nHxb25s6agmJGKhX90cW1" +
"oaGZlZmVmZmdnZmZkYl9dWVdVU1JSU1VXW2RpcICHj56kq7G3u7/FxsaAho+dpKqvtLe6vLy8uLWyqqejn5uYlI+Ni4iHhoSEgoGAfnt1cm1kYFtRTUlFQkA/Pj9CSU1TYWhwf4aOlJyhp7Cytbe2t" +
"bKvraqnpKGcmpeVlJKRkY+Pjo2Lh4WBeHRvY19YVE5JRT48Ozs9QEhNU1lhZ3B/ho2ZnqOqrK+vr6+uq6mno6GgnZybm5uampqamZeWk46Lhnt2b2pjXVdLRkI7Ojk6PD9DSE1UYmhvfoSLlpmeoIC" +
"Gj52kqrS3ury8vLq4tbKqp6ObmJSPjYuKiIeGhISCgH57dXJtZWBcV1JOSUJAPTw9PkVJTVNaYWd3foSSl5ylqausrq6urKuppaSin5+enp6en6CgoaGhoJyal5OOiYR3cGpcVlBFQT47OTk5PEBDT" +
"VJXZGlven6ChoqMjpGRkZOTk5SVlpeanJ6kp6qws7W4ubm4trSxp6KcjYZ/cGliXFVRTEZERERFR01QU1ZbXmFnaWuAho2coqitsrW3urq6trSxq6ilnpyZl5WUk5GRkY+Pj4yKiIWBfXluaWNXUk1" +
"DQD07Ojk6PkFFUFZcanB3fYWKj5ibnqKio6OioqCgn5+fn5+io6SnqaqrrKyso6GfmJWQh4F8cGtlYFtXU01LSUhISk5QU1ZaXWFoa25zdXd5ent8fH19fn+AhIaJj5KWmp6hpayws7e4ubi2tLKuq" +
"qacl5GGgHtybmtoZWNhX19fYGBhY2NkgIWLkZaboKeqrK+vr66sq6mmpKGdm5mWlZSTk5OSkpKSkZCOi4iFfnl1cGtmYVhUUEpHRkRFRkdKTVBYXWFrcHV+gYWIi42OkZGSkpKTk5SUlpiZm52foaa" +
"pq66vr6+urKqnpKCWkYuAenRpZF9bWFVTUFBQUVNUWVteYGJkZmlqa2xsbG1tbW5vb3F1d3qBhoqUmZ6ip6uvtbi5u7q5tbKvp6KemZSPioF+enVycW9ubW1tbWyAhYuWm6Cnqqyur6+vrqyrpqShn" +
"ZuZmJaVlJOTk5KSkpGQjo2LiIV+eXVrZmFYVFBNSkdGREVGSk1QWF1ha3B1eX6BhYuNjpGRkpKSk5OTlJSWmJmdn6Gmqausrq+vr66sp6SglpGLhYB6dGlkX1hVU1BQUFBRU1RZW15iZGZpamtrbGx" +
"sbW1tb29xdXd6gYaKj5SZnqerr7W4ubu6ubi1sq+nop6Uj4qBfnp3dXJxb25tbW1sgIWLkZaboKeqrK+vr66sq6mmpKGdm5mWlZSTk5OSkpKSkZCOi4iFfnl1a2ZhXVhUUEpHRkRFRkpNUFRYXWFrc" +
"HV+gYWLjY6QkZGSkpKTk5SUlpiZm52foaapq66vr6+urKqnpKCWkYuAenRpZF9bWFVTUFBQUVNUWVteYmRmZ2lqa2xsbG1tbW9vcXJ1d3qBhoqUmZ6nq6+ytbi5u7q5tbKvp6KemZSPioF+enVycW9" +
"ubW1tbWyAhYuWm6Cnqqyur6+vrqyrpqShnZuZlpWUlJOTk5KSkpGQjouIhYF+eXVrZmFYVFBKR0ZFREVGSk1QWF1ha3B1eX6BhYuNjpGRkpKSk5OTlJSWmJmdn6Gmqausrq+vr66sp6SglpGLgHp0b" +
"mlkX1hVU1BQUFFTVFZZW15iZGZpamtsbGxtbW1tb29xdXd6gYaKj5SZnqerr7W4ubu6ubi1sq+nop6Uj4qBfnp3dXJxb25tbW1sgIWLlpugpKeqrK+vr66sq6akoZ+dm5mWlZSTk5OSkpKRkZCOi4i" +
"Ffnl1a2ZhXVhUUEpHRkRFRkpNUFRYXWFrcHV+gYWLjY6QkZGSkpKTk5SUlpiZnZ+hpKapq66vr6+urKekoJuWkYuAenRpZF9YVVNR\"},\"two\":{\"f0\":120.92,\"n\":5841,\"b64\":\"AAAAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgFCAgIBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgIBQUFBQgFCAUFCAgIBQgICAgIBQUFCAgFBQgICAgFBQUFCAUIBQgICAgFBQgICAgFBQgICAg" +
"FBQgICAUFBQgICAUFCAgICAUFCAUICAUFCAgICAUICAgICAUFCAgFBQUICAUFBQgFCAgFBQUICAUICAUICAgFBQgICAUFBQgICAUICAgIBQUFCAgIBQUICAgIBQUICAgIBQgICAgIBQUICAgFBQUIC" +
"AgFBQgICAgIBQgICAgFBQgFCAgFBQgIBQUFCAgIBQUFCAUIBQUFCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgHt8e3d1cnBubW5wc3Z8foCBgH99enh3dnd5foGFiYuLi4mHhYGAgIKEhoyPkZKSkI6Mi" +
"YeEg4SIio2RkpKRj4yJg4F/fn+BhYeIiYmIhoCDhoqKioeFg4GAf3+ChYiOkJKSkY+MioeFg4SFioyPkpKSkI6LiIKAf4CBg4eJioqIhoOAfHl2dXV4enyAgIB/fXp3cW9tbW5wdXh6e3x7enVzcG1" +
"tbXF0d3p9f4CAfnx4dnV2d3l8gIOGioqKh4WDgH9/gIKFiI6QkpKRj4qHhYOEhYeKjI+SkpKOi4iCgH9/gIGDh4mKioiGgnx2cWtoZWRlZ21xdHh5eXd0cW1kYF1aWlyAhYuQlJaYmJaTjYqHhYWHi" +
"Y2Rlp+ipaalopmVj4SBfXt7e32BhIeKi4qFgXx2cGtlXlxcXmFlbXF0d3h4d3Jua2RiYWJkaG1zeH+KjZCTkpCLiIWDgYGCh4qPmZ6ip6empKGdmI2JhYCAgYSIio+RkZCOjId8d3BmY2FgYmRoa29" +
"yd3h4dHBsZWFeXV1dX2htc36Ch4yMi4qIhYJ9fHx/goaRlpugo6WmpKGelZCMhoWEhYeJjYCFi5SWmJiWk42Kh4aFhYeNkZafoqWmpaKex72rk4h8cGliXFxVV1ldYG1wcXBuY1lSS0Q+Pzo0MzY4P" +
"0phdIGNmqSvt7u/v73AtrGrppqWlJOVnqarr7Czs7Gup6ielIhwXVA7MywsLC4xNjY9TVVdcXV5e3lxbmxpZ2ppa3J3eIuWoay3yNDd4OLX0su5tqyil46EcG1paGtzeXx9gHh4dm1nZ1ZNRS8pJSI" +
"kKTU+R1Jqb3x8iJWrtLzHy8zNxrq1qaOdnJmYmZqWmaClp7Ozsamjk4p/dGZWS0AxLCIjJiwyOklSZGxzdnh6eX58eXdzcmtscHyElKmzvcjP1dnb297Ty8Glmo56c2tuaWhnamdpbnFyeHZybWdZU" +
"UA5MjAtLTI4OUJNWGWFkZyts7G1tLOvq66poZ2blJWZoa6zuL3BxL68t6qhnIR4a0xDOjQvLDM3PEFIT1ZiZmlyc3Fwal9cV1ZXYmdudnyIlau0vMvMzca6ta+po52cmZialpmgpaers7OxqaOTf3R" +
"mVktAODEsIiMmLDpJUmRsc3Z4enp5fnx3c3JrbHB8hJSeqbO9yM/V29ve08vBt6Wajnpza2loZ2pnaWxucXJ4dnJnWVFAOTIsMC0tMjg5TVhlhZGcpa2zsbW0s6uuqaGdm5SVmZ2hrrO9wcS+vLeqo" +
"ZyRhHhrTEM6LywzNzxBSEhPVmJmaXNxcGpfXFlXVldiZ258iJWrtLzHy8zNxrq1qaOdnJmYmZqWmaClp7Ozsamjk390ZltWS0AxLCIjJiw6SVJbZGxzdnh6eX58d3NyaWtscHyElKmzvcjP1dnb297" +
"Ty8Glmo56c2tuaWhnamdpbnFyeHZybWdZUUA5MjAtLTI4OU1YZXGFkZyts7G1tLOrrqmloZ2blJWZoa6zvcHEvr68t6qhnIR4a0xDOjQvLDM3PEFIT1ZiZmlyc3Fwal9cV1ZXYmdudnyIlau0vMvMz" +
"ca6tamjnZ+cmZialpmgpaezs7GvqaOTf3RmVktAMSwiIiMmLDpJUmRsc3Z4enp5fnx3c3JrbHB8hJSeqbO9yM/V29ve08vBt6Wajnpza2loZ2pnaW5xcnp4dnJnWVFAOTIwLS0uMjg5TVhlhZGcrbO" +
"xtLW0s6uuqaGdm5SVmZ2hrrO9wcS+vLeqoZyRhHhrTEM6LywzNzxBSEhPVmJmaXNxcGpfXFdWV15iZ258iJWrtLzLzM3Kxrq1qaOdnJmYmpaZnaClp7Ozsamjk390ZltWS0AxLCIjJiw6SVJbZGxzd" +
"nh6eX58d3NyaWtscHyElKmzvcjP1dvb3trTy8Glmo56c2tpaGdpamdpbnFyeHZyZ1lRSUA5MjAtLTI4OU1YZXGFkZyts7G1tLOrrqmloZ2blJWZoa6zvcHEvr68t6qhnIR4a0xDOi8sMzQ3PEFIT1Z" +
"iZmlzcXBtal9cV1ZXYmdufIiVoKu0vMvMzca6tamjnZ+cmZialpmgpaezs7GvqaOTf3RmVktAMSwiIiMmLDpJUmRsc3Z4enl+fHl3c3JrbHB8hJSps73HyM/V29ve08vBpZqOhHpza2loZ2pnaW5xc" +
"np4dnJnWVFBOzQxLi4uMjc3SlRhgYyYrLKytbi4uLK1saejn5SUlZqkqa6zt7q4uLatp6WQhnltWU5DMiwvLi8zOD5GTlZdZHV4enpycGpoZmpqa218h5Srs7vMzc7MyL64rKagnZqYl5GUl5ueoK2" +
"urqmll4Z8cF9VST82MCMfICMvPUZZYWtrc3h9goqKhoOBdnV2dnl9ipmhqra+x9PX39/d2dK6sKSMgnZqZF5bWFFRVllcam1ub2ZjX1pVTklDPzg4MztBSmdyf4uYo6e5v8THzcrBu7WnoZyYkZeXm" +
"p2goKOlqKemqqCZkHNoW0c+PDYwLColKC06QkpjanN4f3yAhISEiIaFfIaTnKevt8jKzMi+urCrpaOfnJqZkpOWmZump6akoZSPh391Z15TQDkrIyIiJCg0PExUXmlwd4KNkJGRkI+GhIODg42UmZ+" +
"lpq21wsfS19fVxb61rKGXi3tyaFlNSERFRlJWWV1gXF5gYF5gXVlST0ZEREVIWV9oe4WLoaq1vcXR1dfW0sK8taamn5mUkY2Dg4OGh4+RkpCOgn53aWFeTEQ8KCUiIiMmK0BIU2dqdYeOlKSlpqZ8h" +
"pOnr7fIyszIvrq1sKulo5+cmZKTlpmbnaWmpaOhlYiBd2phV05EPC4kIiElMDZGTldZY2t0go6Tl5eYj42MiomJkJOWmp2iqba8x9DS0tLIxL6tpZqKgHRgUUlDPjw6QkRHUE1SWl5gYmpqamZkW1Z" +
"UVFxeYmZtdHaJk56zwsrX2tzW1NHNwMC3pZ2Uf3p0cW5tc3V3d3N0c3FvcmhiW1VGQDowLCsyNTpHSVNdaXN/m6SsfIaSpq+3w8jLzcrAvbOuqKWgnZqYkJCSlJWgoaGhn5SQioN7b2ZcSUEyJiMhI" +
"SMtMkFJUl5ncICNk5qbnJWUkpKOjZOUlpianqSqsLbCwMLDu7m2q6WenpSMhHNkXlFNSk5OTlBSVVBXWlxnaGhoZ15cW1lYVl1dYmVpbnV8hI2co7O6v8HDxMPAxLu2sKudmJOJhoOGhYWFf4CBgIB" +
"/gn98cmxgU01HQkNAPTo6NDtARlRja3J8hIydo6m5vL2+tbOwrammpqOgnJuUlJWWmJ+hoqGgmJGNiHp6c2NbVEZAOzcyOTo/Q0hMU1lfZmx4gIOFgoKBgYB/hoeHiI6Kjpido7W7v8PHycTCwL25s" +
"6ybk4R8dG1nXWFeW1tcWFpcXl9naGhnZVpXVE9MUU9PT1FOUldlbHSMlJysq7G1ury9xcPAua6qoJyYlJeVlJGQioqLjJOSkpGOi4d2cGpcXVZJREA1MzIxNThDfISMnKOptLm8vr+3ta+sqailopy" +
"bkpKRkpKbnJ2dnZWRjoqFfn95aWJbRkA7NDk4OTo9QENJUF1kcn6Dh4uIiouMjIuSkZCRi4yOkpSYqK2xur26vb6+vMC8uKqjlIN7c2NkXlRRT0hHR0lOV1pgY2VhYmJhYWBlYmFgWFlZXmJmcnl/h" +
"peXn660ucnLzMzLwr+1sauln5qOin99enh3fX1+f39/dnRyb2tual9aVEM/OzY2PXyDipGZn6W1uLq9tbSxrqyprKmmoJ6Wk5KSmJiYmJeWj4uJhn1/em1oYVROSEM7Pz08PT8/Q0hNVFpodXuBhYi" +
"MkZOUm5ycnJyVlZaXmKOlqK6wrK6wsrO5uLauqp6QioJ7c3NrXVhTREFAP0dJS05RVVVYXGJkbXFycnJsbGxtbm96fYCKh42SmZ+kt7vAx8HCwsC9uru3saOdj4J8dnNvbWhmZl5eXl9fZ2dmZmVaW" +
"FZTUU9TfIOKmZ+ltbi6vL21tLGurKyppqCelpSTkpKYmJiXlo+LiYaCfX96bWhhTkhDOz89PDw9Pz5CR1NZZnR6gISIjI+TlJafn5+fmJiYmJmgoqSlqqynq6yutbW0sq+roJWPiXp6c2NdV0tGQj8" +
"7QkJGSEtMUFRZXmFsdHZ4dXZ3eXl5gYKDhImFiJCUmKqus7u4u72+v7/DwLyyrJ+QiYJ7enRuY19cUE9OTlZYWVtcXlpcXV5eZHyDipGZn6S1uLu+t7azsK6rrquoop+WkpCPlZSUlJOSi4iHhX2Bf" +
"XJsZ1RPSkVAQ0E9PT06PUFMUl9lbXR6gYeLlZiapaampqafnp2cm6Kjo6WmoaKkpaevsLCsqqGYk46IgIF6amRdV1JPSklIR0hJSk9SVl1gZGtucXZ4ent8fX5/f4CBgoSHioyPkpaZoaWor7K0t7i" +
"4t7a0saqmoZeRjIB7dnJtamZhX15dXV5fYGBhYmNjgIWLlpugp6qsrq+vr66sq6akoZ2bmZaVlJSTk5OSkpKRkI6LiIWBfnl1a2ZhWFRQSkdGRURFRkpNUFhdYWtwdXl+gYWLjY6RkZKSkpOTk5SUl" +
"piZnZ+hpqmrrK6vr6+urKekoJaRi4B6dG5pZF9YVVNQUFBRU1RWWVteYmRmaWprbGxsbW1tbW9vcXV3eoGGio+UmZ6nq6+1uLm7urm4tbKvp6KelI+KgX56d3VycW9ubW1tbICFi5aboKSnqqyvr6+" +
"urKumpKGfnZuZlpWUk5OTkpKSkZGQjouIhX55dWtmYV1YVFBKR0ZERUZKTVBUWF1ha3B1foGFi42OkJGRkpKSk5OUlJaYmZ2foaSmqauur6+vrqynpKCblpGLgHp0aWRfWFVTUVBQUFFTVFlbXmJkZ" +
"mdpamtsbGxtbW1vb3FydXd6gYaKlJmep6uvsrW4ubu6ubWyr6einpSPioaBfnp1cnFvbm1tbWxsgIWLlpugp6qsr6+vr66sq6akoZ2bmZaVlJSTk5OSkpKRkI6LiIWBfnl1a2ZhWFRQSkdGRURFRkp" +
"NUFhdYWtwdX6BhYiLjY6RkZKSkpOTlJSVlpiZnZ+hpqmrrq+vr6+urKekoJaRi4B6dG5pZF9YVVNQUFBRU1RWWVteYmRmaWprbGxsbW1tbW9vcXV3eoGGipSZnqKnq6+1uLm7urm1sq+rp6KelI+Kg" +
"X56dXJxb29ubW1tbICFi5aboKSnqqyvr6+urKumpKGfnZuZlpWUk5OTkpKSkZGQjouIhX55dWtmYVhUUE1KR0ZERUZKTVBYXWFma3B1foGFi42OkZGSkpKSk5OUlJaYmZ2foaSmqauur6+vrqynpKC" +
"blpGLgHp0aWRfWFVTUVBQUFFTVFlbXmJkZmlqa2tsbGxtbW1vb3F1d3p+gYaKlJmep6uvtbi5uru6ubWyr6einpSPioaBfnp1cnFvbm1tbWxsgIWLlpugp6qsr6+vr66sq6akoZ2bmZaVlJOTk5KSk" +
"pKRkI6LiIV+eXVwa2ZhWFRQSkdGREVGR0pNUFhdYWtwdX6BhYiLjY6RkZKSkpOTlJSVlpiZnZ+hpqmrrq+vr6+urKekoJaRi4B6dGlkX1tYVVNQUFBRU1RZW15gYmRm\"},\"five\":{\"f0\":121.59," +
"\"n\":8940,\"b64\":\"AAAAcHBwcHBQUHBwcHBQUFBwcHBQUFBwcHBwcHBwcHBwUFBQcHBwcHBwUFBwcHBQcHBwcHBQcHBwUFBwcHBwcHBwcFBQUHBwUHBwcFBwcFBQUFBwcHBwcFBwcFBQUFBQUHBwcH" +
"BwcHBwUHBwcFBQcHBQUFBQcHBwcHBwcFBwcHBwcHBQUFBwcHBQUHBwcHBwcFBwcHBwcFBwcHBQUFBwcHBQUHBwcFBwcFBQUFBQcFBwcHBQcHBwcHBwcFBwcHBwcFBwcHBwcHBQUFBQUHBwUFBwcHBw" +
"cHBQcHBwcHBQUHBQUFBwcFBwcHBQUHBwcHBwcHBwcHBwcFBQUFBQUFBwcHBwUFBwUHBwcFBwcHBwcFBwcFBQUFBwcFBQUHBwcHBwcFBwUHBwUFBwUFBQcHBwcHBwcFBQUFBQUHBwcFBQcHBwcFBQUF" +
"BwUFBwcHBwcHBwcFBQUFBwcHBwcHBwcFBwUFBQUFBwcHBwcFBQUHBQcHBwcHBwcHBQUFBwcHBwcFBwcHBQcFBQUFBwcHBwcHBQcFBQcHBwcHBwcHBQUFBQUFBwcHBwcHBwcFBwUFBQcHBwUFBQcHBw" +
"cHBwUFBQUFBQcHBwcHBwcHBQUHBwcHBwcFBQcHBwcHBwUHBwcFBQUFBQcHBwUHBwcHBwUFBQcHBwcFBwcFBQUHBwcHBwcFBQcFBwcFBwcHBwcFBQUFBQUFBwcHBwcFBwcFBwcHBwcFBwcFBQUHBwcH" +
"BwUHBwUFBQUHBwcHBwcFBQUFBQUFBwcHBwUHBQUFBQUFBwcHBwUHBwUFBQcHBwcFBQcFBQcHBwUFBwcFBQcHBQcHBwcHBQUHBwUFBwcHBwcHBQUFBQcFBQcHBwcHBQcFBQUHBQcFBQUHBwcHBwcFBw" +
"UFBQUHBwUHBwcFBQUHBQUHBwcHBwcHBwcFBQUHBQcHBQUFBQcHBwcHBwcHBQUFBQUHBQcHBwcHBwUFBwcFBQcHBwUHBwcHBQUFBwUFBwcHBwcHBQUFBwcHBQUFBQUHBwUHBwcHBwcFBwUHBwcHBQUF" +
"BQUHBQUFBQcHBwcHBwcFBQcHBwcHBwUFBQUHBQcHBwcFBwcHBwcHBwUFBQcHBQcFBQcHBwcFBQcHBwcFBQUFBwcFBwcHBQUFBwcFBwcHBwcHBwcFBQUFBQUHBwcFBwcFBwcHBwcFBwcFBwcHBwcFBQ" +
"UFBQUFBwcHBwcHBQUHBQUFBQUFBwcHBwUHBwcHBwUHBwUFBwcHBQcHBwcHBQcHBwcHBQUFBQcHBwcHBwcFBwcHBwcFBwUFBwcHBQUHBwUHBwcHBwUFBQcHBwUHBQcHBwcHBwUFBQUHBwcFBQUHBQUF" +
"BQcHBwUFBQcHBwUFBQUHBwcFBwcHBwUFBQUHBwcHBwcHBQUFBwcFBQcHBwcHBQcFBQUFBwcHBwcHBwUHBwcFBQcHBwcHBQcFBwcFBQcHBwcHBQcHBQUFBwcFBwcHBQUFBQUFBwcHBwcHBwUFBwcHBw" +
"UFBQUFBQcHBQcHBQUHBwcHBwcFBwUFBQcHBQUFBQUHBwcHBwcHBwUFBQcHBQcFBQcHBQcHBwcHBwcFBQUHBwcHBwcFBwUHBwcFBQcFBQcHBwUFBQcHBQUHBwcHBwUFBQUHBwcHBwcHBQcHBQUHBwcH" +
"BwcHBwUFBwcHBwcHBwcFBwcFBQUHBwcHBQUFBQUHBwcHBwUFBQUHBwcHBQUFBQcHBwUFBQcFBwcHBQUHBwcHBwcHBwUFBQcFBQcHBwcHBwcHBQcHBQUFBwcFBwcHBwcHBwUFBQUFBwUFBwcHBwcHBw" +
"UHBQUFBQUHBwcHBwUFBwUHBwcHBwUHBwcHBwUFBQUFBQUHBwcHBwUHBwUHBwUFBQcHBQcHBwcFBwcFBQUHBwUFBwcHBwcHBwcFBwcHBwcHBwUFBwcHBQcHBQUFBQcHBQUHBQUHBwcHBwcHBwcFBQUF" +
"BwcFBQcHBwcHBwUHBwcHBQcHBQUHBQcHBwcHBQcHBwcHBwcFBQUFBQUHBQcHBwcHBwcHBQcHBwcHBQUHBQcHBwUFBQcHBwcHBwcHBQUFBwcHBwcHBQcHBwUFBwcHBQcHBwUFBQcHBwcHBwUFBQcFBQ" +
"cHBwcHBwUFBQcFBQUHBQcHBwUHBwcHBwcHBQUHBwcHBQcFBQUHBQUHBwcFBwcHBwcHBwcHBwUHBwcHBwUHBwcFBQUFBQUHBQUHBwcFBQUHBwcFBQUHBQcHBQUFBwUHBwcHBwcFBwcFBQcHBwcFBQcF" +
"BwcHBwcHBwcHBQUFBQUFBwcHBwcHBwUFBQcHBQUHBwcHBwcHBQUFBwcHBwcHBwUHBQUFBQcHBQUFBQUHBwcHBQUFBQcFBQcFBQUFBQcHBwUHBwUFBwcHBwcHBQUHBwcHBQcFBQUFBwcHBwUHBQUHBw" +
"cFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQUFBQUFBQcHBwcHBwUHBwUFBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQcHBQcHBwcHBQcHBQUFBQUHBwcFBQcFBwUHBwcHBwcHBwcHBQUFBQcHBwUFBQUH" +
"BwcHBwUHBwcFBQUFBwUHBwcHBQcHBwUFBwcHBwcHBwUFBQcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQcFBwcHBwcFBQUFBQUHBwcFBQcHBwcHBQcHBwcHBwcFBwcFBwUFBQcHBwcHCAgYOHiImL" +
"jIyMjIuLiYiHhIOCgIB/f3+AgIKDhIaHh4mJiYmJiIeFhIJ+fHt3dXRzcnFxcXFydHV3ent8fn+AgIGBgYCAf318fHt6eXl5enp8fX+ChIaJioyNjo+Pj4+OjIuJhoSDgYB+fXx7e3t8fH5/f4CBgo" +
"KDg4KBgH98e3l4dnV0cXFwcHFxc3V2eHp7fYGChIaHh4iHh4aGhYSCgYB/f39/gICChIWGiImKjI2NjY2NgIGDhYeIiYuMjIyLi4mIh4WEg4KAgH9/gICCg4SFhoeHiYmJiYiHhYSCgH58e3d1dHJx" +
"cWZnaGpsb3F3en2Bg4SGhoaFhISDgoGBgYGChIaIjI2PkZOUlZWUko6MiIF+enZyb2xoZmZmZ2hsb3F0d3p9gYOEhoaGhYSEg4KBgYGBgoSGiIyNj5GTlJWVlJKOjIiBfnpyb2xqaGZmZmdobG9xd3" +
"p9f4GDhIaGhoWEhIKBgYGBgYKAg4eOkZOXl5iXlpWUj42LhoSCf359fX19foCAgYKCgoB/fXt5d3VwbmxpaGdoamxxdHh8gIOHjpGTl5eYlpWUko+Ni4aEgn9+fX19fn+AgIGCgoKAf315d3VycG5s" +
"aWhnaGpscXR4fIWMlKKnq7Cwr6ikn5mSjYZ6dnJsa2pqa2xvcXJzdHR0cnFwb29ucHJ0eH2BhpKYnaeqrK6tqqahm5SEfHRkXllRT09QU1ZaZmtyfoSJgIePlp6jqK6vrqmmoZaQioR+enVvbW1sbW" +
"5wcXJ0dHNycnBvbW1sbW9xeX2DiI+UmqWprK+uraWfmZGJgXlpY1xTUVBSVVldY2hue4CEjZCRk5OSkZCPjoyLi4yNjpGSk5OTkpGLh4N3cWxgW1dRUFBSVllfbXV9jZScp6utr6+uq6KemIuGgHZz" +
"cG5tbGxtbnByc3Nzc3Jxb25tWVlcZnV/lqGusrzEy9bTzbiqkm1dSjozKSF8jqLCzt7l493CtqaWhXZtVU1GOzxBTVVkbHR7gYOFhoaMi4uLjYiMj5Wfq6+zs7Cflot/cWpbQjgoISIoQ1BhcoaYpM" +
"XR2+nn4cy+ppWCcV9LQTkzLzNDTFh2gIqRmJaZmZiXmZeUjIyNj5KUnqChoJGMg29kX1RKQjosLTJEUGaJmq21xdHa4ujizL6rf21aSzw4LygqLztGVHGFkpymrKmsq6imoZyTj4aEhISFjY6Niod6" +
"fI6iws7e4+Xj3cK2poV2bVVNRkM7PEFNVWR0e4GDhYaGhoyLi4uNjI+Vn6uvsrOzsJ+Wi3FqW0I4KCMhIihDUGGGmKTF0dvp5+HZzL6mgnFfS0E5My8zOkNMWHaAipiWmZmYl5uZl5SMjI2SlJ6goa" +
"CdkYyDb2RfSkI6LC0yOERQZomarcXR2uLo4tnMvqt/bVo8OC8oKi87RlRicYWSpqyprKuopqGcl5OPhoSEhI2OjYqHenV8jqLCzt7l493CtqaWhXZtVU1GOzxBTVVkbHR7gYOFhoaMi4uLjYiMj5Wf" +
"q6+zs7CflotxaltPQjgoISIoQ1BhhpiktcXR2+nn4cy+poJxX1hLQTkzLzNDTFh2gIqRmJaZmZiXmZeUjIyNj5KUnqChoJGMg29kX1RKQjosLTJEUGaJmq3F0drg4ujizL6rf21aPDgvKigqLztGVH" +
"GFkqasqaysq6imoZyTj4aEhISFjY6Niod6fI6iws7e4+Xj3cK2poV2bVVNRkM7PEFNVWR0e4GDhYaGjIuKi4uNjI+Vn6uvs7Owpp+Wi3FqW0I4KCEiKC9DUGGGmKTF0dvp5+HZzL6mgnFfS0E5My8z" +
"OkNMWHaAipiWmZmYl5uZl5SMjI2SlJ6goaCRjIN6b2RfSkI6LC0yRFBmdomarcXR2uLo4sy+q5N/bVo8OC8oKi87RlRicYWSpqyprKuopqGcl5OPhoSEhI2OjYqHenV8jqLCzt7l493CtqaFdm1gVU" +
"1GOzxBTVVkdHuBf4OFhoaMi4uLjYyPlZqfq6+zs7CflotxaltPQjgoISIoQ1BhhpiktcXR2+nn4cy+poJxX1hLQTkzLzNDTFh2gIqYlpmZmZiXmZeUjIyNkpSeoKChoJGMg29kX0pCOjYsLTJEUGaJ" +
"mq3F0drg4ujizL6rf21aPDgvKigqLztGVHGFkqasqaysq6imoZyTj4aEhISNjo2Niod6fI6iws7e5ePd1sK2poV2bVVNRjs8QUZNVWR0e4GDhYaGjIuKi4uNjI+Vn6uvs7Owpp+Wi3FqW0I4KCEiKC" +
"9DUGGGmKTF0dvp5+HMvqaVgnFfS0E5My8zQ0xYanaAipiWmZmYl5mXlJOMjI2SlJ6goaCRjIN6b2RfSkI6LC0yRFBmdomarcXR2uLo4sy+q5N/bVo8OC8oKi87RlRxhZKcpqyprKuopqGck4+GhISE" +
"hI2OjYqHenyOorLCzt7l493CtqaFdm1gVU1GOzxBTVVkdHuBf4OFhoaMi4uLjYyPlZqfq6+zs7CflotxaltCOCgjISIoQ1BhhpikxdHb4Onn4cy+poJxX0tBOTUzLzNDTFh2gIqYlpmZmZiXmZeUjI" +
"yNkpSeoKChoJGMg29kX0pCOjYsLTJEUGaJmq3F0dri6OLZzL6rf21aPDgvKCovMDtGVHGFkqasqayrqKSmoZyTj4aEhISNjo2Niod6fI6iws7e5ePd1sK2poV2bVVNRjs8QUZNVWR0e4GDhYaGjIuL" +
"i42IjI+Vn6uvs7Own5aLf3FqW0I4KCEiKENQYXKGmKTF0dvp5+HMvqaVgnFfS0E5My8zQ0xYanaAipiWmZmYl5mXlJOMjpCZnqmtrqyZkIVoWVJFNy4nHSIqRVdwmKu8w8/X29jXzrKklXFmXVdSWF" +
"heYWZna2xscG1qZmRbW15jfYmWsr/CzNPX19LHuZSCaHyPobPDzt3i39i6rZ+Ac29eWlhZU1daZGhxdHJwY19cWlphZHJ8h5yptsza3t7a08mikH1VSzwmIRocJC46X3B/nKanr7Cuqq2noZaTiomL" +
"jZmbnZ2aj4l2a19MQjgtJSg6R1ZvhJapxNHa4d7fx7ipmH5vYUtFSElNUllgZmtwc3t6eHZsa2x0gYqTn6q1wcjMy8vCppWDalVENCcjIi45OFlpeIagpqytqZiOioeVmJ2sp62zeYuev8ne39rSrK" +
"CTh312fnt9gHl9fXmCenBkWU4sJSMqQE1xg5edsL7K5OTfzMCkiH1zbHV0dHp+c3Z1cnJpX1RKMy0qLDReboGqrb3U2ejl3NLFmYt9aGJsbXFzd21wcWx1bVpRSTAuMThDXW2UprnL1Nvo4dfKuquO" +
"cGVdY2RmbnRpa2xraGlhWEo3NTxEUG1/kaTJyNTe3OXOv69/cGNYUU5bYGVqZmlqZW5oYFlTTj5ASHmLnr/J3uHf2tKsoJN9dn57fYCDeX19eYJ6YVRHJB4dIClDU3yPo7a/xtPNxbuvpY6Eg4Scoq" +
"etrJmDdWNgTT0wIRIXLj1Qg5Ohq7KmppyWnpWTlZOcprC4v8/KwbOBblk0NiwoKC42QlBfdYqPjoqGcm5rbIWOm7jGxtfa1tDSw7CHdFQ7NTJHT1dqY2hqaWZhYVtXV01XdIWnuMva5d/b1LiopIN3" +
"bGZWV1pleXx+e3RTRz0zeYygwMjb2NDGoJWLhH59i5SanpaVj3p6aVlHOS0TFBo0U2aOnaytr6+qsaqjmJaJk5ujwcfIx8C3m3ZjTzkuJiYfKTZGVWSLkpiXhYFxbn2Ci5amuMfT3drhw7CdfGpcU0" +
"1eZHN5fW5oX1NTRjotLCQ+UGWcrbvJu7ewpp2Ul5aaqqawwMK/xrqql19LOiUiMkNPW2djam1ocGhZVVRRXW2AlbbI4unazL+xoJSKhIKEe4iOknmNoL7G19XOxbqWjYiJjqS1vMGvp5qJdW9bOS4p" +
"Hyg0X2x4f4SEc2ZgWmRocI6SpbbI1Nzq49e2loduaHR1e4GHhISBbmBePjEnIhQaJUdne5yor6Gclo+Hj46UnJm1wcvi39e3pIFtWks/RUdNYFtiaWdhZ1xSSC4vNE1fgau9zNbLycOtr6SWlpqcp7" +
"G4u8nCppNwRjcrMjdATFhlYGppY19UTEc8RlVne5/G0tvNxbqglZp5jaGxvsPTx7uxj4mIk6u2wcnQ0bSnlGlkUTo4LDI9SFR0d3ZoXUU0MTJJVmZ6pam6ysjSvbGmnImIi5umvsrMxp2LdmBLSTwy" +
"Nj9IVF94d3JgVj85NzpCcIOZwcHKzca8vrGkm4aKkKKswcO+s6KBbVcyNi8zPUlWYWhseXRsWlE+QkpYjqK2ydfQ0si8r6OZk5WOlp+nr7+1qppiTjshKyw8SlhXY2tuaW9mV1FEU2F0iay/0HWKnb" +
"i8z76zpp2Eg4mgw9Hk5uGwnYhzYGhgYGhcbnR1e25dSzsuERQfLml8i5uGgXhvZnR1fYucr8HX2urRwrGNgXt6haSvvL24h3NeSUs9NTZAOFJdZHdvY1dMLSgxPk+PpLa1t7Kpn5OelpmiqLfF1Ofg" +
"08Csl15UT2pzfYyPeHBiUkA0KSQsJDVaa3eXk4yCeVxXXmqPt8vb2NbPxLS6qpWSlY+apa7BuauXg1gyKCI+SVZ1ip2tuLzPvrOmhIOJoMPR3eTm4bCdiGBoYGBoXGdudHV7bl07LhEUHy5pfIuWm4" +
"aBb2Z0dH6OorbH0tfU38Gxo4GDjKTFztHNw51yXUlKSU9lXGZramNXSzsuEhonTmOJl52emW9lXV9+jrfL3NLX1MrBsaOWmIyksLnNw7Kdh11JNTQ6ZXF7amNXRjYmLicvPE5jdIiemY+Eel1faXm3" +
"y9zs1Mq8rJyOlpihubC5uK6ynYdyXnWLn7e5ybSnnZaAhpGx1uPt59qfind1c3d/ipWIioJzYEw6KBQcKTlKWX9+d0s/NjM8YHSKoLS3ubSfp52Vm5GgscHO7efatJ93YF5if4qVnZ+Cc0s3OigpMT" +
"45SllqfndgVEszPEuOoLC6v72bhnx2l6Kx0MDHyMK3qKWalH2GkaOmvrWmlYFGPjtIb3mGhWJXRzgpNzlBXlJgb21neW9kX0hTZImZwcfBt5CGfXuGr7/a4shyhJSmpbyyp5yWe4SSsdri4NXHm4t/" +
"d5Sdp7q/oIp6ZnFhWFReTlhoaH5mV0g9GxwjQGx8jY2IWE5HRWZvf6S0pq+qoaadmZqhkaC7xOPWyLd8c252nKawtLWudWNQUUxOX2taYmViWVpMQDojMFBhi5KVkYpaUk9Zg5W5x9C2s6qfpJ2cqr" +
"eqwMXC1si3pYlnZnR+o6yonY5fTTwqRkxjb3lhW1FRRj49QkxBZHJ9nJWMeVhZX3KElKalvKeclnuEkqKx2uLg1ceLf3eUnaeyur+ginpmYVhUXk5YYmhofmZXSBscI0BsfIaNjYhYTkdmb3+ktKav" +
"qqGxpp2ZoZGgu8Tj1si3p3xzbnacprS1rnVjUEFRTE5fa1plYllaTEA6OiMwUGGLlZGKWlJPUVmDlbnH0LOqn6SdnKGqt6rAxcLIt6WJZ2Z0fqOqrKidX008KkZMY295YmFbUVFGPkJMQWRyfZ2clY" +
"x5WFlyhJSmpbyyp5yWe4SSsdri4NXHm4t/d5Sdp7q/oIp6ZnFhWFReTlhoaH5mV0gbHCMwQGx8jY2IWE5HZm9/kaS0pq+qoaadmaGRoK67xOPWyLd8c252nKawtLWudWNQUUxOX2taYmViWVpMQDoj" +
"MFBhi5KVkYpaUk9Zg5W5x9Czqp+SpJ2cqreqwMXCyLellolnZnR+o6yonV9NPDAqRkxjb3lhW1FRRj49QkxBZHJ9nJWMeVhZX3KElKalvKeclnuEkqKx2uLg1ceLf3eUnae6v6CZinpmYVhUXk5YaG" +
"h+dGZXSBscI0BsfI2NiGJYTkdmb3+ktKavqqGxpp2ZoZGgu8Tj08m7rYp/eHZ7maisroyAcmJRWlFNUlpYX2N0bGFJQCYlKTE+cHyHjndwYVpWbHJ7iamirbe1w7CnoJyJjpeuuNXX0ceVh3pybYKG" +
"lJyijIV6XGJVS0ZFNUdQWnZ1bllPMCopLDRkc4F1hJKkprmqopqVf4OKo6/Q3dzWqp2Qhn6Rk6CosaGelo+AcWRZVUBMVF19fHdjQTUrJCImTltpgHBxaGBtZmNjaGt6iaWsxL20q6KHhIaWtsLX29" +
"u2qpyBjoqKjpWIlpiWmIp7XFI4NztBS3J3eW9QRC4nJTxET11lcHd5c4FybWxwanF6jpezvLy6nJeSj4yMpK20ua6vr6WyqaCXkIpxcnR8lJWSjYZfVk1GQVNUW2BmWl1ddX+Ij5WYrqmloYaFh5GY" +
"tLzCx8mxq6SUjZyVlZeaio6QkY6djIJ5U05LS01RanN2dlxXUEJRTkxNUVdSWmJthIR/fHhfYGRpcpCZrLO3pKKelKShoKGllaKorcbEwLGoioJ7d3SLjpKYmYN5cWheamFbVVdET1RZcnJvamReRD" +
"w9P2BpcoR2en19e3iFg4KIeYCTnKTCw8G+uJ2Xjo2Nqa60vaqppqCZkJGJgmZmaHBziouJhoB5f4eTlpimo6GenIyMkJSZsri8wbSyrqmknZ+bmJWWio6RkpGdm5aIgWtdWFRgYWNpbGBhYF9bYFtW" +
"Tk1NRElQVl1wdn1+fm1qaGd2eX6EipKTmZ+ls7Ktqaajk5OUmp6xur2+raqlnpeRmI2KiHp9foGDkI2JhH1uWVJJR0dYXGBnXF1cW1hgoGBgYKCgoGBgYGBgoKCgoKBgoGBgYGBgYKBgoKBgYGCgYG" +
"BgYHl/h5OWmKajoZ6cjIyQlJmyuLzBtLKuqaSdn5uYlZaKjpGSkZ2bloiBa11YVGBhY2lsYGFgX1tgW1ZOTU1ESVBWXXB2fX5+bWpoZ3Z5foSKkpOZn6Wzsq2ppqOTk5SanrGusbKko6CdmZSPlJCM" +
"iHl5enx9jIyMioSBbmNfWmFfXV5gYlZZXGBgYGBgYGCgYKCgYGBgoGBgoKBgYGCgoKCgoGBgYGBgYGCgoKCgeX2DjI6RoKCfnZyMi4qLjaGkqK+ypqenp6SeqKObmJWEhISGlZaXl5eVgX14bWhxaW" +
"dlZVdYWl5gYXBwbmlYVVJPTUxbXF9obGNsb3N0doSEgoGAcXJ0e42Sl5yhpp6goaCdqaSioJ+QkZKWmZuur6+snJiOioSAiYaCf4BydHV2doOBfnp2oGCgoGBgYGCgoKCgoKCgYGBgYGBgoGBgoGBg" +
"YGBgYKBgYGBgYGB5fYOMjpGgoJ+dnIyLiouNoaSor7Kmp6ekop6oo5uYlYSEhIaVlpeXl5WBfXhtaHFpZ2VlV1haXmBhaWloZmRjYV9dXFpaWlxeYGZpa25xc3V3d3d3d3Z2dnd4eXt+hIeKkZSXmp" +
"ucnJuamZiXlpaWl5mbnKCio6WlpqWjoZ+Zl5SOjIqJiIhgoKBgYGCgYGCgoKBgYGBgYGBgYKCgoKBgYGBgoGBgYGCgYGBgYICDhoyOkJOTk5OTkpGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCR" +
"kZOTk5OSkIyJhoOAfHlzcW9sbGxtbW5ub29vbWxqZWNhXFpZWFhYWVxeYWVoam1ub29vbm5tbGxsbW9zdnmAg4aJjI6Qk5OTk5KRkJCQkZKTlZqcn6OlpqenpqWjoaCgoGBgYGBgYGCgYGBgoGCgoG" +
"BgYGBgoKCgoGBgYGCgoKBgYGBggIOGjI6Qk5OTk5KRkZCQkJKTlZqcn6Olpqenp6ajoZ+al5WSkZCQkJGRk5OTk5KQjImGg4B8eXNxb2xsbG1tbm5vb29tbGplY2FcWllYWFhZXF5hZWhqbW5vb25u" +
"bW1sbGxtb3N2eYCDhomMjpCTk5OTkpGQkJCRkpOVmpyfo6Wmp6empaOhYGBgYKCgoGBgYGCgoGBgoGCgoGBgoGBgYGCgoKCgoGBgYGBgYGCAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5" +
"qXlZKRkJCQkZGTk5OTkpCMiYaDgHx5c3FvbGxsbW1ubm9vb21samVjYVxaWVhYWVpcXmFlaGptbm9vbm5tbWxsbG1vc3Z5gIOGiYyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6alo6FgYGCgoKCgoKBg" +
"YKBgYGBgYGBgoGBgoGBgoKCgoGBgYGBgYGBgYICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhoOAfHlzcW9sbGxtbW5vb29ubWxqZWNhXFpZWFhZWlxeYW" +
"Voam1ub29ubm1tbGxsbW9zdnmAg4aJjI6Qk5OTk5KRkJCQkZKTlZqcn6OlpqenpqWjoaCgoKCgYGBgYGBgYGCgoGBgYKCgoGBgYGBgoKCgoGBgYGBgYGBggIOGjI6Qk5OTk5KRkZCQkJKTlZqcn6Ol" +
"pqenp6ajoZ+al5WSkZCQkZGSk5OTk5KQjImGgHx5dnNxb2xsbG1tbm9vb25tbGplY2FcWllYWFlaXF5hZWhqbW5vb25ubW1sbGxtb3N2eYCDhomMjpCTk5OTkpGQkJCSk5WXmpyfo6Wmp6emo6GfYG" +
"BgoGCgoKCgYGBgoKBgoGBgoKBgYGBgYKCgYKBgoGBgoGBgYGCAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYaAfHl2c3FvbGxsbW1ub29vbm1samVjYVxa" +
"WVhYWVpcXmFlaGptbm9vbm5tbWxsbG1vc3Z5gIOGiYyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6ajoZ+gYKBgYKCgYGCgoGCgYGBgYKCgYGBgoKBgoGBgYKBgYGCgYGBgYICDhoyOkJOTk5OSkZGQkJ" +
"CSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhoOAfHlzcW9sbGxtbW5vb29ubWxqZWNhXFpZWFhZWlxeYWVoam1ub29ubm1tbGxsbW9zdnmAg4aJjI6Qk5OTk5KRkJCQkZKTlZqcn6Ol" +
"pqenpqWjoaBgYGBgYGCgYGBgYKCgoKBgYGBgYKCgoKBgYGBgYGBgYKCgoKCggIOGjI6Qk5OTk5KRkZCQkJKTlZqcn6Olpqenp6ajoZ+al5WSkZCQkJGRk5OTk5KQjImGgHx5dnNxb2xsbG1tbm9vb2" +
"5tbGplY2FcWllYWFlaXF5hZWhqbW5vb25ubW1sbGxtb3N2eYCDhomMjpCTk5OTkpGQkJCRkpOVmpyfo6Wmp6em\"},\"one\":{\"f0\":121.91,\"n\":5365,\"b64\":\"AAAAgISJk5eboqWorK2vr6+urq" +
"uqqKWjoZ2cmpmYl5aVlZWVlpWVlZSUk5KRjYuIgn96cm5pZmFdWVJOS0dGRUVFRkdKTE9VWFxkZ2xzdnl8f4GDhoeIiomKi4uMjI2Oj5CRk5eZnKGjpqutr7GztLS1tLOvraqjn5qWkY2Hfnl0bGll" +
"X11bWllYWFhZWVtdXmBhYmNkZGRlZGRjYmJhYGBgYGFiZWZpbnF1fYCGj5OYnKGlqbCytICEiZOXm5+ipaisra+vrq6rqqinpaOhnZyamJeWlZWVlZWWlZWVlJOSkY2LiIaCf3pybmlhXVlSTktJR0" +
"ZFRUVGSkxPVVhcZGdsb3N2eX+Bg4aHiIqJioqLi4yMjY6QkZOXmZyeoaOmq62vs7S0tbSzsq+tqqOfmpGNh355dHFsaWVfXVtZWFhYWVlaW11eYGFiZGRkZWRkY2JiYWFgYGBhYmVmaW5xdXh9gIaP" +
"k5ihpamwsrS2gISJk5eboqWorK2vr6+urquqqKWjoZ2cmpmYl5aVlZWVlpWVlZSUk5KRjYuIgn96cm5pYV1ZVVJOS0dGRUVFRkpMT1JVWFxkZ2xzdnl/gYOEhoeIiomKi4uMjI2Oj5CRk5eZnKGjpq" +
"utr7GztLS1tLOvraqjn5qWkY2Hfnl0bGllX11bWVhYWFhZWVtdXmBhYmRkZGVlZGRjYmJhYGBgYWJjZWZpbnF1fYCGj5OYnKGlqbCytICEiZOXm5+ipaisra+vrq6rqqinpaOhnZyamJeWlZWVlZaV" +
"lpWVlJOSkY2LiIJ/endybmlhXVlSTktHRkVERUVGSkxPVVhcZGdsb3N2eX+Bg4aHiIqJioqLi4yMjY6QkZOXmZyeoaOmq62vs7S0tbSzr62qp6OfmpGNh355dGxpZWJfXVtZWFhYWVlbXV5fYGFiZG" +
"RkZWRkY2JiYWFgYGBhYmVmaW5xdXh9gIaPk5ihpamwsrS2gISJk5eboqWorK2vr66urauqqKWjoZ2cmpiXlpaVlZWVlpWVlZSTkpGPjYuIgn96cm5pYV1ZVVJOS0dGRUVFRkpMT1JVWFxkZ2xzdnl/" +
"gYOEhoeIiomKi4uMjI2OkJGTlZeZnKGjpqutr7O0tLW1tLOvraqjn5qRjYeDfnl0bGllX11bWVhYWFhZWVtdXmBhYmRkZGVlZGRjYmJhYGBgYWJjZWZpbnF1fYCGj5OYoaWprLCytICEiZOXm6KlqK" +
"qsra+vrq6rqqilo6GfnZyamJeWlZWVlZaVlpWVlJOSkY2LiIJ/endybmlhXVlSTktHRkVERUVGSkxPVVhcZGdsc3Z5fH+Bg4aHiIqJiouLjIuMjY6QkZOXmZyho6apq62vs7S0tbSzr62qp6OfmpGN" +
"h355dGxpZWJfXVtZWFhYWVlbXV5fYGFiZGRkZWRkY2JiYWBgYGBhYmVmaW5xdX2AhoqPk5ihpamwsrSAhImNk5eboqWorK2vr66urauqqKWjoZ2cmpiXlpaVlZWVlpWVlZSTkpGPjYuIgn96cm5pYV" +
"1ZUk5LSUdGRUVFRkpMT1VYXGBkZ2xzdnl/gYOGh4iJiomKi4uMjI2OkJGTlZeZnKGjpqutr7O0tLW1tLOvraqjn5qRjYeDfnl0bGllX11bWVhYWFlZWltdXmBhYmRkZGVkZGNjYmJhYGBgYWJlZmlr" +
"bnF1fYCGj5OYoaWprLCytICEiZOXm6KlqKqsra+vrq6rqqilo6GfnZyamJeWlZWVlZaVlZWUlJOSkY2LiIJ/enJuaWZhXVlSTktHRkVFRUZHSkxPVVhcZGdsc3Z5fH+Bg4aHiIqJiouLjIuMjY6QkZ" +
"OXmZyho6apq62vs7S0tbSzr62qo5+alpGNh355dGxpZV9dW1pZWFhYWVlbXV5gYWJjZGRkZWRkY2JiYWBgYGBhYmVmaW5xdX2AhoqPk5ihpamwsrSAhImNk5eboqWorK2vr66uq6qop6WjoZ2cmpiX" +
"lpWVlZWVlpWVlZSTkpGNi4iGgn96cm5pYV1ZUk5LSUdGRUVFRkpMT1VYXGBkZ2xzdnl/gYOGh4iJiomKi4uMjI2OkJGTl5mcnqGjpqutr7O0tLW0s7Kvraqjn5qRjYd+eXRxbGllX11bWVhYWFlZWl" +
"tdXmBhYmRkZGVkZGNjYmJhYGBgYWJlZmlrbnF1fYCGj5OYoaWpsLK0toCFi5aboKeqrK+vr6+urKumpKGdm5mWlZSUk5OTkpKSkZCOi4iFgX55dWtmYVhUUEpHRkVERUZKTVBYXWFrcHV5foGFi42O" +
"kZGSkpKTk5SUlZaYmZ2foaapq66vr6+vrqynpKCWkYuAenRuaWRfWFVTUFBQUVNUVllbXmJkZmlqa2xsbG1tbW1vb3F1d3qBhoqPlJmep6uvtbi5u7q5tbKvq6einpSPioF+enVycW9vbm1tbWyAhY" +
"uWm6Ckp6qsr6+vrqyrpqShn52bmZaVlJOTk5KSkpGRkI6LiIV+eXVrZmFdWFRQSkdGQUFES09VYWdudHt/hY2PkpSUlZSTkpKSkZKVl5mfoqWqra+wsbCvqqaglI6Gd3FpY1xXUkxKSUtNUFZaXWFl" +
"aGxwcXN0c3Rzc3NzdHV4foKHkpedqa6zury+vr28ubCrpJeRin13cm5qZ2VjY2NkZmZoaWlpaGdmYV9dWVZVVVVXWYCGjpyhp6+xs7OxsK2qp6OdmZaSkZCPj4+QkJGQj4+Nh4N+dG5oW1ZQTEdEQk" +
"BBQ0pPVWFnbnR7gIaPkpWYmJmYl5aVlZSUlZaZnaCiqKqsrq6uraikn5SOhndwaWJbVlFKSUdJS01PVFpgZmtvd3l6fHx8fX5/hYiNkpmfpbK4vcPFxL+5s6uimI55b2dXUU1IR0lLTVFVXWFkaWtr" +
"bGxramtrbHF0eYaNlaautbvBxcjJx8OAiZOnrrS4vb+/u7i0qqSflpKPioqJiYiIiYaFgnl1b2FaU0xGQTw4OTpESlJlb3mDjZadq6+xs7Oxq6ikoZ6bmZeXl5iZmpmYlpSPioR0bGNSSkM5NjU1Nz" +
"tAT1dgc32FlJqepKWlpKSioJ2cm5udnqKlp6ipqqmkoJuMhHtnXVRMRD46NTY4QEdOXmZudX2DiZGTlJWVlJSUlJWQlJikqrC5vb24s6uilot9YlZLOTUzNTpAgIyZprG4wMbFw7ixqpqUjomFhIOF" +
"h4mLjIqDfnduZFtRQDo0MTM4SVNfbXuHlKmwtru6uK+ppJ2YlZGOj5CVmJqbm5iTjIV8ZVtQPDUwLTA0RVBcaXaBjaClqq6sqqOfm5iVk5OWmZ2kqKmqqKSelY2BaF1QPDUwLTA1PEVPWnF8hpaZnZ" +
"6cmpmWk5GQkpScoqextri5t7WvnZSHbGBTPjgzMDM4P0hQWm52foqMjo6LiomHhoaAjJmxuMDGxcO+uLGqmpSOhYSDhYeJiouMioJ6cFJHPCstLC0zO0hgcIKitsHOz87CvLSsmpmSi4qKhYiIh4uG" +
"f3ZrYEE4LywsMEFNVmd4iZq8xczPzMCwp56WlpGMiYuEiImIiYN7cWZbRzMrJy0yO1Vdb3+RoK7Jzc/KvLWjm5OTjoyJi4aHiYiEf3dsVUM5MCklJTY/TWZ2iKezxcvPz825saiXkJGKioqMhoiJho" +
"ODcmdbfIyerLrD0dXRzLSqn4yGhoOBgYF9f397d3dlW1BHNzArKzA/WWh6laSzx8zV08/JwKWbkYKFgoCCg39/f31zdGtWTEMuKiotNERRcIGSrLjDztXSzcW8q5aOhoOCgIKFf39+fHdwZlxHPzEq" +
"KzA3SldniZqjvsbM1NDJt62bkoqDfoCBgoV/f3l1bWtiWE07LiotMj1eboCQoqq3yc3Ozca8qJeOh4B9eoGDhH9+e3FqZ11TSUB8jJ66w9HV0czEtKqfjIaGgYGBfX9/e3d3b2VbUDcwKyswP1loeo" +
"qVpLPHzNXPycClm5GKgoWCgIKDf399c3RrYVZMQy4qKjREUXCBkpysuMPO1dLFvKuWjoaAg4KAgoV/fnx3cGZcRz8xLCorMEpXZ4mao77GzM7U0Mm3rZuKg36AgYKEhX9/eXVtYlhNOy4qKi0yPV5u" +
"gKKqt8nNztLNxryol46AfXqBg4SGf357cWpnU0lAfIyeusPR1dXRzLSqn4yGhoGBgYN9f397d3dlW1A3MCsqKzA/WWh6laSzx8zV08/JwKWbkYKFgoCCg39/f31zdGtWTEMuKiotNERRcIGSrLjDzt" +
"XSxbyroJaOhoOCgIKFf358d3FwZlxHPzEqKzBKV2d3iZqjvsbM1NDJt62bkoqDfoCBgoV/f3l1bWtiWE07LiotMj1eboCQoqq3yc3Ozca8qJeOgH16gYGDhH9+e3FqZ1NJQDh8jJ66w9HV0cy0qp+V" +
"jIaGgYGBfX9/e3d3b2VbUDcwKyswP1loeoqVpLPHzNXPycClm5GKgoWCgIKDf399c3RrVkxDNC4qKjREUXCBkqy4w8nO1dLFvKuWjoaDgoCCgoV/fnx3cGZcRz8xLCorMEpXZ4mao77GzM7U0Mm3rZ" +
"uKg36AgYKEhX9/eXVtYlhNOy4qLTI9T15ugKKqt8nNzs3GvLOol46AfXqBg4R/fnt4cWpnU0lAfIyeusPR1dXRzLSqn4yGhoGBgYN9f397d3dlW1A3MCsqKzA/WWh6laSzx8zVz8nAr6WbkX+Fho2R" +
"j5aXlpmSiX9fVEg3MzlARlBTXmhxhomKh3x3b21sdXqBiZmjrsDMzsnDs6ickYZ6dXJybnN7foiIhoF7YVdNQj06PUNFXGd0hpGYnZqYlIuNiYeJhoyUnaa+w8fGurKbj4l9cGhhU1RXYW1yeXpxbW" +
"dhWVBKRj9CSV9yf4x8iJWrsbu7t7CclY+Kj46QmZifqausq6Saem1gVElJRENGRVRdZXh6e3p3bGZcWV5iaHCBjZmmuMDHyse6qqGXjoiFhH6AhY6ZnJuXkXVqXlJNRT45NDlKU2V6gYeDhYSBeHt3" +
"dXd0gIiYqK+1sbGwrKagmI2DgYWQlZqgpKCgnZeOhXxkXltZYWNocnB1eH57b2hZUkxIRlBVW2VtdYiKi4qHfHdua3B0eXqLlJ2rsbS1qaSefIWOm6anpKCTjoiEgYmMkZifpre5uLaxo5uJiYJ6eX" +
"R7gIWQk5SThH10aWFaUUlLTlRaaHR5dHNwa2dhXFlRUlZqc3yOjpSZmJyYk46CfHx+j5aepqyxs7izraWWjYB8gYKFio2RlJybl5J7cmhYWlZWUlddY2l1e3t5aGJbV1RSU1BVXW5+h5SXkY2Ji4eC" +
"f315foSbo6uwsrOxoJqUiIOAgYSJlZugpaShnZaQiX57eX2CiICGjZKWlpaOiYN5dnZ6f4aMk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KLkZegoqKblo+IgXx4dnh8h42Rl5aUiYJ7dG5raW" +
"tvdICEiImHgnx1bmdeXV1kanB7f4GAfnp0Z2FcWFlcZ210en6AgXt2cGRgXV5iZ251e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8dnZ4e4GHj5ufoqCcl4uGgn9+gISPlZylp6agmpSNh4J/gIaNlpaW" +
"jomDfnl2dnp/hpOZnqOhnpmTjYeAfn+HjZSgpKanpaGcj4mEfn+Ci5GXoKKioJuWj4F8eHZ4fIeNkZWXlpSJgntua2lrb3R6gISIiYeCdW5nXl1dYGRqcHt/gX56dGdhXFlYWVxnbXR+gIF7dnBqZG" +
"BdXmJndXuCiYmIgHp0b2tpaW50e4mPlJeVkY2HgXx2dniBh4+bn6KioJyXi4aCfoCEj5WcoaWnpqCalIeCf4CGjZKWlpaOiYN5dnZ6f4aMk5meo6Gek42HgH5/h42UmqCkpqWhnI+JhH5/goaLkZeg" +
"oqKblo+BfHh2dnh8h42Rl5aUiYJ7dG5raWtvdICEiImHgnx1bmdeXV1kanB7f4GAfnp0Z2FcWFlcZ210foCBf3t2cGRgXV5iZ3V7goaJiYiAenRraWludHuBiY+Ul5WRh4F8dnZ4e4GHj5ufoqCcl4" +
"uGgn9+gISPlZylp6agmpSNh4J/gIaNlpaWjomDeXZ2dnp/hpOZnqOhnpONh4OAfn+HjZSgpKaloZyWj4mEfn+Ci5GXoKKioJuWj4F8eHZ4fIeNkZWXlpSJgntua2lrb3R6gISIiYeCdW5nXl1dZGpw" +
"dnt/gX56dGdhXFhZXGFnbXR+gIF7dnBkYF1cXmJndXuCiYmIgHp0b2tpaW50e4mPlJeVkY2HgXx2dniBh4+bn6KioJyXi4aCfoCEj5WcpaempKCalIeCf4CGjZaWlpOOiYN5dnZ6f4aTmZ6ho6Gek4" +
"2HgH5/h42UmqCkpqWhnI+JhH5/goaLkZegoqKblo+BfHh2dnh8h42Rl5aUiYJ7bmtpaWtvdICEiImHgnVuZ2JeXV1kanB7f4F+enRuZ2FcWFlcZ210foCBf3t2cGRgXV5iZ3V7goaJiYiAenRraWlu" +
"dHuBiY+Ul5WRh4F8dnZ4gYePlZufoqCcl4uGgn6AhImPlZylp6agmpSHgn9+gIaNlpaWjomDeXZ2dnp/hpOZnqOhnpONh4OAfn+HjZSgpKaloZyWj4mEfn+Ci5GXoKKim5aPiIF8eHZ4fIeNkZeWlI" +
"+Jgntua2lrb3SAhIiKiYeCdW5nXl1dZGpwdnt/gX56dGdhXFhZXGFnbXR+gIF7dnBkYF1cXmJndXuCiYmIgHp0a2lpam50e4mPlJeVkYeBfHh2dniBh4+bn6KgnJeRi4aCfoCEj5WcpaempKCalIeC" +
"f4CGjZaWlpOOiYN5dnZ6f4aTmZ6ho6Gek42HgH5/h42UoKSmp6WhnI+JhH5/gouRl5ygoqKblo+BfHh2eHyBh42Rl5aUiYJ7bmtpaWtvdICEiImHgnVuZ2JeXV1kanB7f4F+enRuZ2FcWFlcZ210fo" +
"CBe3ZwamRgXV5iZ3V7gomJiISAenRraWludHuJj5SWl5WRh4F8dnZ4gYePlZufoqCcl4uGgn6AhImPlZylp6agmpSHgn9+gIaNlpaWjomDeXZ2en+GjJOZnqOhnpONh4B+f4KHjZSgpKaloZyPiYSA" +
"fn+Ci5GXoKKim5aPiIF8eHZ4fIeNkZeWlI+Jgntua2lrb3SAhIiKiYeCdW5nXl1dZGpwe3+BgH56dA==\"},\"not\":{\"f0\":121.52,\"n\":5337,\"b64\":\"AAAAgIaNlpaWjomDeXZ2dnp/hpOZnqOh" +
"npONh4OAfn+HjZSgpKaloZyWj4mEfn+Ci5GXoKKioJuWj4F8eHZ4fIeNkZWXlpSJgntua2lrb3R6gISIiYeCdW5nXl1dZGpwdnt/gX56dGdhXFhZXGFnbXR+gIF7dnBkYF1cXmJndXuCiYmIgHp0b2" +
"tpaW50e4mPlJeVkY2HgXx2dniBh4+bn6KioJyXi4aCfoCEj5WcpaempKCalIeCf4CGjZaWlpOOiYN5dnZ6f4aTmZ6ho6Gek42HgH5/h42UmqCkpqWhnI+JhH5/goaLkZegoqKblo+BfHh2dnh8h42R" +
"l5aUiYJ7bmtpaWtvdICEiImHgnVuZ2JeXV1kanB7f4F+enRuZ2FcWFlcZ210foCBf3t2cGRgXV5iZ3V7goaJiYiAenRraWludHuBiY+Ul5WRh4F8dnZ4gYePlZufoqCcl4uGgn6AhImPlZylp6agmp" +
"SHgn9+gIaNlpaWjomDeXZ2dnp/hpOZnqOhnpONh4OAfn+HjZSgpKaloZyWj4mEfn+Ci5GXoKKim5aPiIF8eHZ4fIeNkZeWlI+Jgntua2lrb3SAhIiKiYeCdW5nXl1dZGpwdnt/gX56dGdhXFhZXGFn" +
"bXR+gIF7dnBkYF1cXmJndXuCiYmIgHp0a2lpam50e4mPlJeVkYeBfHh2dniBh4+bn6KgnJeRi4aCfoCEj5WcpaempKCalIeCf4CGjZaWlpOOiYN5dnZ6f4aTmZ6ho6Gek42HgH5/h42UoKSmp6WhnI" +
"+JhH5/gouRl5ygoqKblo+BfHh2eHyBh42Rl5aUiYJ7bmtpaWtvdICEiImHgnVuZ2JeXV1kanB7f4F+enRuZ2FcWFlcZ210foCBe3ZwamRgXV5iZ3V7gomJiISAenRraWludHuJj5SWl5WRh4F8dnZ4" +
"gYePlZufoqCcl4uGgn6AhImPlZylp6agmpSHgn9+gIaNlpaWjomDeXZ2en+GjJOZnqOhnpONh4B+f4KHjZSgpKaloZyPiYSAfn+Ci5GXoKKim5aPiIF8eHZ4fIeNkZeWlI+Jgntua2lrb3SAhIiKiY" +
"eCdW5nXl1dZGpwe3+BgH56dGdhXFhZXGdtdHp+gIF7dnBkYF1eYmdudXuCiYmIgHp0a2lpam50e4mPlJeVkYeBfHh2dniBh4+bn6KgnJeRi4aCfoCEj5WcpaemoJqUjYeCf4CGjZaWlo6Jg355dnZ6" +
"f4aTmZ6joZ6Zk42HgH5/h42UoKSmp6WhnI+JhH5/gouRl5ygoqKblo+BfHh2eHyBh42Rl5aUiYJ7bmtpa290eoCEiImHgnVuZ15dXWBkanB7f4F+enRnYVxZWFlcZ210foCBe3ZwamRgXV5iZ3V7go" +
"mJiISAenRraWludHuJj5SWl5WRh4F8dnZ4gYePm5+ioqCcl4uGgn6AhI+VnKGlp6agmpSHgn+Aho2SlpaWjomDeXZ2en+GjJOZnqOhnpONh4B+f4KHjZSgpKaloZyPiYSAfn+Ci5GXoKKim5aPgXx4" +
"dnZ4fIeNkZeWlImCe3Rua2lrb3SAhIiJh4J8dW5nXl1dZGpwe3+BgH56dGdhXFhZXGdtdHp+gIF7dnBkYF1eYmdudXuCiYmIgHp0a2lpbnR7gYmPlJeVkYeBfHZ2eHuBh4+bn6KgnJeLhoJ/foCEj5" +
"WcpaemoJqUjYeCf4CGjZaWlo6Jg355dnZ6f4aTmZ6joZ6Zk42HgH5/h42UoKSmpaGclo+JhH5/gouRl6CioqCblo+BfHh2eHyHjZGVl5aUiYJ7bmtpa290eoCEiImHgnVuZ15dXWBkanB7f4F+enRn" +
"YVxZWFlcZ210foCBe3ZwZGBdXF5iZ3V7gomJiIB6dG9raWludHuJj5SXlZGNh4F8dnZ4gYePm5+ioqCcl4uGgn6AhI+VnKGlp6agmpSHgn+Aho2SlpaWjomDeXZ2en+Gk5meoaOhnpONh4B+f4eNlJ" +
"qgpKaloZyPiYR+f4KGi5GXoKKim5aPgXx4dnZ4fIeNkZeWlImCe3Rua2lrb3SAhIiJh4J8dW5nXl1dZGpwe3+Bfnp0bmdhXFhZXGdtdH6AgX97dnBkYF1eYmd1e4KGiYmIgHp0a2lpbnR7gYmPlJeV" +
"kYeBfHZ2eHuBh4+bn6KgnJeLhoJ/foCEj5WcpaemoJqUh4J/foCJkp+ipKCcloyIhYSGiY6coqq0tbWtpp6WjYV+d3Z3f4OIkJGQjYeAeGZeVk5NTlddZGtwdXh3dG9jXllUVllfZm95i5KYnJuZj4" +
"uGgICChoySmqqwtLa0r6GakYqEf31/goeQlJeXlI6HfnVsXFZTU1ZbZ21ydXd3dWxmX1RRT1NZYGlye4SQlJWRjYh+e3p6fIGImKCos7a2sKqjlI2HhIKDhY6TmJ+gn5aOhXxzamJZWFmAiZKfoqSj" +
"oJyWjIiFhomOnKKqr7S1ta2mno2Ffnd2d3p/g4iQkZCHgHhmXlZRTk1OV11kaG91e3t7dHBtamhnanZ9iKCqtcXJysnEvbSdkYVxamViZWdqb3R2eHd0aGFZS0ZDQkVJUGdzgJumsLu8vLiyq6SVj4" +
"uGiIqRlpmcnZ2ajIN4X1RJOTY1O0JMV2JueYuRlZaTkYmFg4ODhouZoam4vsC+ubGnmo2AZVtSSEdIUlhfZYCMma+2u7y4s6WdlpCLiIeJjZGYnJ2alY6EeW5iSkE6NTY6S1VgeIGKkZWWlpGNioSC" +
"g4qQmKCpsLfAwb+xqJyBdGhcU0xISExRXmVrdHV1dHFsaF9dXGFmboWRnaq1vsXKyMOzqZ6De2xgVlBLQkZKVmRrd3t3eXh3dXx6fICFhJOcprzDxsjGu7OcjnxfTz8nGhcYHSYzW26CobHA0tbd2t" +
"PJvpyPgGlgYFpaW1haX2Nqc3R8j6PDz9/j5OHavK6ffnBpVlFMRkpOVFpobnh7fXZ0c3F3eXuAho2YoavBx8nHwrGmmIh2WUk6JB8WHyk4TmF0iK21w9PU1M/EuayeinxnYGFdXl9fY2ZqbGxzcG1r" +
"YF5fZXF6j5qnrLjBydDW0byvnXFeSzszKCAdIiM+TmGNnq66xczJx8G6rqOYhHZvbGloaXJ1dndvbWZhYl1ZVlRPU1tvfJKwvsrU1dnZzsu9mYZyRTYpfI+jtMPP3+Th2ryun35waV9WUUxGSk5aaG" +
"54e312dnRzcXd5gIaNmKGrs8HHycfCsZiIdllJOi4kHxYfKThhdIittcPM09TUz8S5nop8Z2BhXV5fY19jZmxsc3Bta2BeX2BlcXqPmqe4wcnQ1tHJvK+dcV5LMyggHSIjLz5OYY2ersXMycfBuriu" +
"o5iEdm9paGlydXZ3d29tZmFiWVZUT1Nbb3ySobC+ytXZ2c7LvZmGclhFNil8j6PDz9/k4drQvK6ffnBpVlFMRkpOVFpobnh7fXZ0c3F3eXuAho2YoavBx8nHwrGmmIh2WUk6JB8WHyk4YXSIm621w9" +
"PU1M/EuZ6KfHFnYGFdXl9fY2ZsbHNycG1rYF5fZXF6j5qnrLjBydDW0byvnXFeSzszKCAdIiM+TmGNnq66xczJx8G6rqOYhHZvaWhpcXJ1dndvbWZhYllWVFRPU1tvfJKwvsrV2dnWzsu9mYZyRTYp" +
"fI+jtMPP3+Th2ryun35waV9WUUxGSk5aaG54e312dnRzcXd5gIaNmKGrwcfJy8fCsZiIdllJOiQfFhkfKThhdIittcPT1NTWz8S5nop8Z2BhXV5fY19jZmxsc3Bta2BeX2BlcXqPmqe4wcnQ1tHJvK" +
"+dcV5LMyggHSIjPk5hc42ersXMycfBuq6jmI6Edm9paGlydXZ3b21qZmFiWVZUT1Nbb3ySobC+ytXZ2c7LvZmGclhFNil8j6PDz9/k4drQvK6ffnBpVlFMRkpOWmhudHh7fXZ0c3F3eYCGjY6YoavB" +
"x8nHwrGYiHZkWUk6JB8WHyk4YXSIm621w9PU1M/EuZ6KfHFnYGFdXl9fY2ZsbHNycG1rYF5fZXF6j5qnuMHJztDW0byvnXFeSzMoIB0dIiM+TmGNnq7FzMnJx8G6rqOYhHZvaWhpcXJ1dndvbWZhYl" +
"lWVFRPU1tvfJKwvsrV2dnWzsu9mYZyRTYpfI+jw8/f4+Th2ryun35waVZRTExGSk5aaG54e312dHNycXd5gIaNmKGrwcfJy8fCsZiIdllJOiQfFhkfKThhdIittcPT1NTWz8S5nop8Z2BhXV5fX2Nm" +
"amxsc3Bta2BeX2VxeoOPmqe4wcnQ1tG8r52FcV5LMyggHSIjPk5hc42ersXMycfBuq6jmI6Edm9paGlydXZ3b21qZmFiWVZUT1Nbb3ySsL7K1NXZ2c7LvZmGckU2KSB8j6PDz9/k4dq8rp+OfnBpVl" +
"FMRkpOWmhudHh7fXZ0c3F3eYCGjY6YoavBx8nHwrGYiHZkWUk6JB8WHyk4YXSIrbXDzNPU1M/EuZ6KfGdgYV5dXl9fY2ZsbHNwbWtoYF5fZXF6j5qnuMHJztDW0byvnXFeSzMoIB0dIiM+TmGNnq7F" +
"zMnJx8G6rqOYhHZvaWhpcnV2d3dvbWZhYllWVE9TW2NvfJKwvsrV2dnOy72smYZyRTYpfI+jw8/f4+Th2ryun35waVZRTExGSk5aaG54e312dHNycXd5gIaNmKGrwcfJx8KxppiIdllJOiQfFh8pOE" +
"5hdIittcPT1NTPxLmsnop8Z2BhXV5fX2Nmamxsc3Bta2BeX2VxeoOPmqe4wcnQ1tG8r52FcV5LMyggHSIjPk5hjZ6uusXMycfBuq6jmIR2b2xpaGlydXZ3b21mYWJdWVZUT1Nbb3ySsL7K1NXZ2c7L" +
"vZmGckU2KSB8j6PDz9/k4dq8rp+OfnBpVlFMRkpOWmhueHt9dnZ0c3F3eYCGjZihq7PBx8nHwrGYiHZZSTouJB8WHyk4YXSIrbXDzNPU1M/EuZ6KfGdgYV5dXl9fY2ZsbHNwbWtoYF5fZXF6j5qno6" +
"mvu7q3samZjnhuZV9bWlVZXmJncnZ5eHdraGVqa21xeXmClp+vu76+sKqimY+Mg3RwZmVmaXV3eXl4b2xiXmBZWFlbYmt0gJKdr7WxfIaRo6mztLGsoJqUjouIh4iKhYmKio+Lhn9nX1dJTElMUVhZ" +
"ZG55k5qgpp+dlpOOkpCPj4yPlJqjpKCbjoZ8cmdaU01IQ0dUXGx0foWKi4yLiI2KiImEi5GXpKqusrOppJOKhnBmXlBLSUpXXGJvdXN5enl/fXt5cHJ0f4aVpq20srW1tLCnnoh3bV9aWF5fYmZnam" +
"5wd3VvbGhfZ2dndXqAh4yRlZyak4+DgH18fImNkZKUlXyCiI2RmpuWk4iAfXyFiIyQjpKVl5yZjoh6b2tpcHF0d3h7fYSCfnVpZGFfXmdvdHqAhYiSkY6Lh316eHmCi5GWmJubn5qVj4J8eHJ5eoCD" +
"gISEg4eDfXdlYV5dZmp1enl9gIKJhYJ+cW9ve4CFjJKRlZqan5eSjX17eXqChYmQjI2Mj4t+eGtmYmBga290dnp8fIF+dnJoZ2Zoa32Dio+SlZuYlZGMgX58fYePk5eVlpSRk46HfIKIkZqblpOIhI" +
"B9fIWIjI6SlZecmZSOiHp2dXt+gIJ/gICGhIF+cW9tdXZ5fnl7fIKAfXt4b25veH6BhIGCgoCFg4F3dnd8hYmPiYqKiYeLhoR8fX+BjZCRi4qJh4eEgnh4eX2GiImKg4J8eX13dm9xdHaAgoODenh1" +
"d3V0dW9yeIKEhoaFfXh2e3p7fXx/goyOj46Egn+DgoKGgYSHipKTkY+Ff32CgoOFgIOFho2LiXt4dnx/goWGjY2Jh316eoKGiYyIiouMkI6Lfn17g4WHjIeIiIeMiYOAdnN0fICChH9/f31/fHltbW" +
"13en1/gnx8enh9eHZvcXN2gISGiYOCgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgFCAgIBQgICAgIBQUICAUFBQgICAUFBQgICAUFBQgIBQUFBQgFCAUICAgIBQgICAgIBQUICAgFBQgICAgFBQUICAUIBQgICA" +
"gFBQgICAgFBQgICAgFBQgIBQUFBQgIBQUFCAgIBQUFCAUIBQUFCAgIBQUICAgIBQUFCAgFBQUICAUFCAgFCAgFBQgICAUIBQgICAgFCAgICAUFCAgICAUICAgIBQUFCAgIBQUICAgIBQUICAgIBQgI" +
"CAgIBQUICAUFBQUICAUFBQgICAgIBQgICAUFBQgFCAUFBQgIBQUICAgIBQUICAUIBQUICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICA\"},\"found\":{\"f0\":121.43,\"n\":10371,\"b64\":\"AAAAcHBwcHBQUHBwcHBQUFBwcHBQUFBwcHBwcHBwcHBwUFBQcHBwcHBwUFBwcHBQcHBwcHBQcHB" +
"wUFBwcHBwcHBwcFBQUHBwUHBwcFBwcFBQUFBwcHBwcFBwcFBQUFBQUHBwcHBwcHBwUHBwcFBQcHBQUFBQcHBwcHBwcFBwcHBwcHBQUFBwcHBQUHBwcHBwcFBwcHBwcFBwcHBQUFBwcHBQUHBwcFBwc" +
"FBQUFBQcFBwcHBQcHBwcHBwcFBwcHBwcFBwcHBwcHBQUFBQUHBwUFBwcHBwcHBQcHBwcHBQUHBQUFBwcFBwcHBQUHBwcHBwcHBwcHBwcFBQUFBQUFBwcHBwUFBwUHBwcFBwcHBwcFBwcFBQUFBwcFB" +
"QUHBwcHBwcFBwUHBwUFBwUFBQcHBwcHBwcFBQUFBQUHBwcFBQcHBwcFBQUFBwUFBwcHBwcHBwcFBQUFBwcHBwcHBwcFBwUFBQUFBwcHBwcFBQUHBQcHBwcHBwcHBQUFBwcHBwcFBwcHBQcFBQUFBwc" +
"HBwcHBQcFBQcHBwcHBwcHBQUFBQUFBwcHBwcHBwcFBwUFBQcHBwUFBQcHBwcHBwUFBQUFBQcHBwcHBwcHBQUHBwcHBwcFBQcHBwcHBwUHBwcFBQUFBQcHBwUHBwcHBwUFBQcHBwcFBwcFBQUHBwcHB" +
"wcFBQcFBwcFBwcHBwcFBQUFBQUFBwcHBwcFBwcFBwcHBwcFBwcFBQUHBwcHBwUHBwUFBQUHBwcHBwcFBQUFBQUFBwcHBwUHBQUFBQUFBwcHBwUHBwUFBQcHBwcFBQcFBQcHBwUFBwcFBQcHBQcHBwc" +
"HBQUHBwUFBwcHBwcHBQUFBQcFBQcHBwcHBQcFBQUHBQcFBQUHBwcHBwcFBwUFBQUHBwUHBwcFBQUHBQUHBwcHBwcHBwcFBQUHBQcHBQUFBQcHBwcHBwcHBQUFBQUHBQcHBwcHBwUFBwcFBQcHBwUHB" +
"wcHBQUFBwUFBwcHBwcHBQUFBwcHBQUFBQUHBwUHBwcHBwcFBwUHBwcHBQUFBQUHBQUFBQcHBwcHBwcFBQcHBwcHBwUFBQUHBQcHBwcFBwcHBwcHBwUFBQcHBQcFBQcHBwcFBQcHBwcFBQUFBwcFBwc" +
"HBQUFBwcFBwcHBwcHBwcFBQUFBQUHBwcFBwcFBwcHBwcFBwcFBwcHBwcFBQUFBQUFBwcHBwcHBQUHBQUFBQUFBwcHBwUHBwcHBwUHBwUFBwcHBQcHBwcHBQcHBwcHBQUFBQcHBwcHBwcFBwcHBwcFB" +
"wUFBwcHBQUHBwUHBwcHBwUFBQcHBwUHBQcHBwcHBwUFBQUHBwcFBQUHBQUFBQcHBwUFBQcHBwUFBQUHBwcFBwcHBwUFBQUHBwcHBwcHBQUFBwcFBQcHBwcHBQcFBQUFBwcHBwcHBwUHBwcFBQcHBwc" +
"HBQcFBwcFBQcHBwcHBQcHBQUFBwcFBwcHBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQUFBQcHBQcHBQUHBwcHBwcFBwUFBQcHBQUFBQUHBwcHBwcHBwUFBQcHBQcFBQcHBQcHBwcHBwcFBQUHBwcHBwcFB" +
"wUHBwcFBQcFBQcHBwUFBQcHBQUHBwcHBwUFBQUHBwcHBwcHBQcHBQUHBwcHBwcHBwUFBwcHBwcHBwcFBwcFBQUHBwcHBQUFBQUHBwcHBwUFBQUHBwcHBQUFBQcHBwUFBQcFBwcHBQUHBwcHBwcHBwU" +
"FBQcFBQcHBwcHBwcHBQcHBQUFBwcFBwcHBwcHBwUFBQUFBwUFBwcHBwcHBwUHBQUFBQUHBwcHBwUFBwUHBwcHBwUHBwcHBwUFBQUFBQUHBwcHBwUHBwUHBwUFBQcHBQcHBwcFBwcFBQUHBwUFBwcHB" +
"wcHBwcFBwcHBwcHBwUFBwcHBQcHBQUFBQcHBQUHBQUHBwcHBwcHBwcFBQUFBwcFBQcHBwcHBwUHBwcHBQcHBQUHBQcHBwcHBQcHBwcHBwcFBQUFBQUHBQcHBwcHBwcHBQcHBwcHBQUHBQcHBwUFBQc" +
"HBwcHBwcHBQUFBwcHBwcHBQcHBwUFBwcHBQcHBwUFBQcHBwcHBwUFBQcFBQcHBwcHBwUFBQcFBQUHBQcHBwUHBwcHBwcHBQUHBwcHBQcFBQUHBQUHBwcFBwcHBwcHBwcHBwUHBwcHBwUHBwcFBQUFB" +
"QUHBQUHBwcFBQUHBwcFBQUHBQcHBQUFBwUHBwcHBwcFBwcFBQcHBwcFBQcFBwcHBwcHBwcHBQUFBQUFBwcHBwcHBwUFBQcHBQUHBwcHBwcHBQUFBwcHBwcHBwUHBQUFBQcHBQUFBQUHBwcHBQUFBQc" +
"FBQcFBQUFBQcHBwUHBwUFBwcHBwcHBQUHBwcHBQcFBQUFBwcHBwUHBQUHBwcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQUFBQUFBQcHBwcHBwUHBwUFBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQcHB" +
"QcHBwcHBQcHBQUFBQUHBwcFBQcFBwUHBwcHBwcHBwcHBQUFBQcHBwUFBQUHBwcHBwUHBwcFBQUFBwUHBwcHBQcHBwUFBwcHBwcHBwUFBQcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQcFBwcHBwc" +
"FBQUFBQUHBwcFBQcHBwcHBQcHBwcHBwcFBwcFBwUFBQcHBwcHCAgYOHiIqLjIyMjIuKiIeGg4KBgIB/gICAgYOEhYeIiYqKiomJiIaDgoB8enh1dHNycXFyc3R1d3l6fX5/gICAgIB/f318e3l4eHh" +
"4eHh6e3yAgYOHiYqNjo6Pj4+OjIuJhoWDgYB/fn19fX5+f4GCg4SFhYWFhYSCgX98enl1dHJxcHBwcHFydHZ4e3x+gIGCg4SEhIODgoB/fn59fHx9fX6AgYOGh4mMjY6Pj4+Pjo2LiIeFgIGDhYeIi" +
"ouMjIyLioiHhoSDgoGAgH+AgIGDhIWGh4iJioqKiYiGg4KAfnx6eHV0c3FxcmlqbW9xdHd8fn+BgoKBgH99fXx8fH1+gYOGi46RlZeYmZmYl5OQjIWBfXZzcG5sa2prbG5xc3Z5e3x9fX59fHt6eHd" +
"3d3d5enx/goiLjpSXmZubmpmXlZKLh4R8eXZycHBvcHFydHV3eXp7e3t7eHd1dHNycXFyc3Z5fIOGio2RlJeAg4eOkZSWl5eXlZSSjYuIhIKBf39/gICBgoSFhYWEg398end0cW5pZ2ZlZmdrbnF5f" +
"YGEiIuOkZKTkpGQjIuJh4aEg4ODg4WGh4mKi4uKioiEgn54dHFraGZlZGRkZ2ptc3d6gYWHipeam5ybmZWSkIyLioqKi4yOjo+OjImBfHZpY11ZVFFQUVRYZWx1ho6VnKKnqauqqKCcloyHg4B9e3p" +
"5eXp7e3t4d3RxbWpmYF1bXF5hgIeQl5+kqa2urKahnJGLhoF9eXd1dHV2d3h4d3VxbmtoZWJgX2BhaW50hIyTmqKorbOzsquln5CJgXpzbWliYWFjZWhucHJ0dXZ2dXRzcnJydnl9goiNlJ+kqa6vr" +
"qijnZaNhXxsZV5VU1NVWF1mbHF2e3+Ch4iIh4eGhYaHiIqNkJeanaKiop6alY+IgHhoYVpQTkxPUlddZGtyjpyqusTFvbevoJePiYaEhIWHgoOCfnl6cmh8j6TEz9/i3tW2qJeJeWxnWVZVUlZbZWl" +
"zdXRzcWRhYGBqcIKNmqCuucTS29jIvKt+a1ZENC4kHiEiO0pdh5alsLm+urexq6OblIuJgIGChIWPjouAcmhUSUA6Nzg8REdWeYufydbh4+Ha0MKypoBuXT02MTM4R09bZG95f4SIh4yJiIeBhIiNn" +
"KqyvsHBsqqekYB2ZEI1KRcYHTRKXXCFl6TBytHZ1Mu1qJN7cmlkZ2Zna25qfI+kxM/f4uLe1baol3lsZ1lWVVZSVltlaXN0c3FkYWBfYGpwgo2arrnE0tvY08i8q35rVjQuJB4hIi07Sl2HlqW5vrq" +
"3saujm5SPi4mAgoSFj46LgHJoX1RJQDo3OERHVnmLn7fJ1uHj4drCsqaAbl1QPTYxMzhHW2RveX+EhoiHjImIh4SIjZyqsri+wcGyqp6AdmRCNSkXGB0mNEpdhZekwcrR2dTLwbWok3tyaWdmZ2tua" +
"mx8j6TEz9/i3tW2qJeJeWxnWVZVUlZbZWlzdXRzcWRhYGBqcIKNmqCuucTS29jIvKt+a1Y0LiQfHiEiO0pdh5alub66urexq6OblIuJgIKEhY6PjouAcmhUSUA6Nzg8REdWeYufydbh4+Ha0MKypoB" +
"uXT02MTM4R09bZG95f4SIh4yJiIeEiI2UnKqyvsHBsqqegHZkU0I1KRcYHTRKXYWXpLPBytHZ1Mu1qJN7cmlkZ2Zna25qfI+kxM/f4uLe1baol3lsZ1lWVVZSVltlaXN0c3FkYWBganB3go2arrnE0" +
"tvYyLyrk35rVjQuJB4hIjtKXW2HlqW5vrq3saujm5SPi4mAgoSFj46LgHJoX1RJQDo3OERHVnmLn7fJ1uHj4drCsqaAbl09NjEwMzhHW2RveX+EiIeMi4mIh4SIjZyqsr7Bwbiyqp6AdmRCNSkXGB0" +
"mNEpdhZekwcrR2dTLwbWok3tyaWdmZ2tuamx8j6TEz9/i3tW2qJd5bGdfWVZVUlZbZWlzdHNxZ2RhYGBqcIKNmq65xMzS29jIvKt+a1Y0LiQfHiEiO0pdh5alub66urexq6OblIuJgIKEhY6PjouAc" +
"mhUSUA6NzhER1ZleYufydbh4+HawrKmlIBuXT02MTM4R1tkb3h5f4SIh4yJiIeEiI2UnKqyvsHBsqqegHZkU0I1KRcYHTRKXYWXpLPBytHZ1Mu1qJN7cmlnZmdpa25qfI+kxM/f4t7Vy7aol3lsZ1l" +
"WVVJWW2BlaXN0c3FkYWBganB3go2arrnE0tvYyLyrk35rVjQuJB4hIjtKXW2HlqW5vrq3saujm5SLiYCBgoSFj46LgHJoVElAPzo3OERHVnmLn8nW4ejj4drCsqaAbl09NjEwMzhHW2RveX+EiIeMi" +
"4mIh4SIjZyqsr7Bwbiyqp6AdmRCNSkXGB00Sl1whZekwcrR2dTLtaiTh3tyaWdmZ2tuanyPpLXEz9/i3tW2qJd5bGdfWVZVUlZbZWlzdHNxZ2RhYGBqcIKNmq65xMzS29jIvKt+a1Y0LiQeISItO0p" +
"dh5alub66t7GrpKOblIuJgIKEhY+Oi4iAcmhUSUA6NzhER1ZleYufydbh4+HawrKmlIBuXT02MTM4R1tkb3h5f4SIh4yJiIeEiI2cqrK4vsHBsqqegHZkQjUpGxcYHTRKXYWXpMHK0dPZ1Mu1qJN7c" +
"mlnZmdpa25qfI+kxM/f4t7Vy7aol3lsZ1lWVVJWW2BlaXN0c3FkYWBganCCjZqgrrnE0tvYyLyrfmtWRDQuJB4hIjtKXYeWpbC5vrq3saujm5SLiYCBgoSFj46LgHJoVElAPzo3OERHVnmLn8nW4ej" +
"p4dzFt62HdWVDOjUzNkNLVF5ncnh+g4OJhoSDg36BhZObqrvBxb+7tKudjoVgTz8fGRYcLDhHWmx/nay4ydPTycG3ppmOhXV4dXN1d3yPobPDzt3i39i6rZ+Ac29eWlhZU1daZGhxdHJwY19cWlpaZ" +
"HJ8h5yptszT3t7a08mikH1VSzwmISEcJC46WHB/nKaur7CuqqanoZaTkYmLjZKbnZ2alol2a19MQjgtLCg6R1ZohJapy9ja4d7Yx7ipmIV2YUtFQUlNUmBnZmtwc3R6eHZza2x0eoOTn6q1yMjMy8S" +
"7ppWDcVxENCchHikvOFJXZnaFkJy0uLu6sa2inZiXlZORfIucuMLS2tnWwLesn5OJhXJsZ1xcXGBhamtsa2peW1hUUllfY2t0eIOQq7bI2d3ez8i9sKCRiGZZSzEsKS0yQUpUXml3f4aQkpqamZiQk" +
"JGTlpqlrbGzrqyompGMfnBjVTUsJR8hLEBMW2R1hJSwwMnR0M66s6qglpWMf3t3bm9vb3Z1c3BtaFdRTERJSVBWXmJvfIuqvcnc4OLUzcKmn45+bmJVPDc1N0JJWF9oaG91eX+HiHyLnLjC0tja2db" +
"At6yTiYVybGdkXFxcYGFqbGtqX1xYVVJQVVdbX2dxfJajtsHM1dvZ19PDt7GThHZTSUA5NDIyP0VLVFxkcnd6hIaHh4Z/f4KEh5mfpq21tLnBwsG+t62Uf3FiUkU5LiglKCYuRFBdcX+Ml6morLCvr" +
"a2ppaGdk5KQkZKcnZ2ck4+CenFuY1hOOy0pJSgtR1Jfbn+GlbK8xdfZ187At66imI6De3ZtZWRlZmdwfIuZtb/H2NnXzL61q6CVi395c2tjY2RlZ29vb25qX1tSTktOTlBaWmNte4iWuMPO3drb1M3" +
"Ev7GjlXZiV0M9OT9BRUpQUFdkam98fn5+dnZ1dXV3hIiOm5uisba8x8nJyL6xqJKHemddUkhBNDEvMTVJUVlsdHaEiY6RmZmZmJaOjIuMl5mdoaWqpqyur7KuqZiQfnJmXFBDPDYwMSw3P0hTX3B7k" +
"pqip6qsrLCuqqejn5GPjnyHlKuzu8fMzc3HurSknZSLhoB4b25tbm9veHl5dmxpYFxWWFNQTEpERlJYYn+KlqKusLvJzM7Sz8i2rpyRhXxyaGRfWlpUV1peYGpsb3BvZ2NhX2NiYmRnaml4gIqmr7n" +
"JzsvMy8a/trWpkYZ5W1NLQEVDRUdKT1RaYGt2en+AgHl2dnh5goWLj5SYnaSpr7O+w8TDtbGpmI+LgndtYkpFPjg4P0VKT1RVW2JvdHmIi42PiYp8hZGapKuywsTGw7m0qqSdn5iTjYR7d3R0c3l4d" +
"nZzcWdgXFdWUk9LS0VGSk5VbHR+k5ygsbi+wcvMy8XAuqWelIWFfnlzcG1iYmFhaWlpaWheXFpYVVtZWFlbW19mdX2Pl6Gps7q/xMfGy8G7s6uakoh1bm1iXltYUlJUVVhaZWdoaWJiYWFhaGlqbXN" +
"xd4WMlKyyusDFycTEwr64saeTindlXVVQUU5MS01IT1NXZ2pucXN1dnyFj6Corr/CxMTDurewq6WinZiPhYOAf359g4OCgH92cGtnYmRfWk9LQTw7O0BLUVdfZ3B8hY+gr7W/wsS8ure0sKusop2Yi" +
"IWDf36Eg4ODgnl4dnBrZ2RfWlRPREE8OztHS1FfYGlzfIWPp6+1v8K9vLq3tLeyrKKdkYiFg3+FhIODg4J5eHZwcm5kX1pIREE+PDtCR0tRWGBpfIWWn6evtbi7vby6t7eyrKeilpGIhYOGhYR8hY+" +
"YoKiuv8LEw7q3sKulp6KdmI+Fg39+fYODgoKAf3Zwa2dkX1pPS0E8Ozs9QEtRX2dweYCIl6SrsLW4u7e3t7OwtK2qpqKYlZKOjYuRkI+OhoWDgX97enZwZWBTSUVAPUE/P0BCPkdMU2JweH+HjpWZn" +
"aKnsLGwr66koqGfnZyioaGhm5ubm5uhoJ2bl4+EfXFqYlxWUEtGOzg1NTZDRktXXF1ja3B3io6TmZudmZiZmZmgn3yDjJqgp7e6vb6/uLaysKysqKSem5GNjIqJj4+OjIuDf3x5cXRuaWNeWEdDPzo" +
"/P0FDR0tKT1ZlbHyLkZicoKSmqaqrsbCvq6KgnZyaoaCgoKGhmpqamJuZlZKNiHptZ2BSVE1EQT5EREVGSEtPV1tfaW5ze3+DhomLjY+QkJGRkpKSk5SVl5icnqGmqKqur7CwsK+uqaaimZOOgn13c" +
"WxnYlpXVFFQUFJTVFZYW11hY2VoaWqAhYuWm6Ckp6qsr6+vrqyrpqShn52bmZaVlJOTk5KSkpGRkI6LiIV+eXVrZmFdWFRQSkdGREVGSk1QVFhdYWtwdX6BhYuNjpCRkZKSkpOTlJSWmJmdn6Gkpqm" +
"rrq+vr66sp6Sgm5aRi4B6dGlkX1hVU1FQUFBRU1RZW15iZGZnaWprbGxsbW1tb29xcnV3eoGGipSZnqerr7K1uLm7urm1sq+nop6Uj4qGgX56dXJxb25tbW1sbICFi5aboKeqrK+vr6+urKumpKGdm" +
"5mWlZSUk5OTkpKSkZCOi4iFgX55dWtmYVhUUEpHRkVERUZKTVBYXWFrcHV+gYWIi42OkZGSkpKTk5SUlZaYmZ2foaapq66vr6+vrqynpKCWkYuAenRuaWRfWFVTUFBQUVNUVllbXmJkZmlqa2xsbG1" +
"tbW1vb3F1d3qBhoqUmZ6ip6uvtbi5u7q5tbKvq6einpSPioF+enVycW9vbm1tbWyAhYuWm6Ckp6qsr6+vrqyrpqShn52bmZaVlJOTk5KSkpGRkI6LiIV+eXVrZmFYVFBNSkdGREVGSk1QWF1hZmtwd" +
"X6BhYuNjpGRkpKSkpOTlJSWmJmdn6Gkpqmrrq+vr66sp6Sgm5aRi4B6dGlkX1hVU1FQUFBRU1RZW15iZGZpamtrbGxsbW1tb29xdXd6foGGipSZnqerr7W4ubq7urm1sq+nop6Uj4qGgX56dXJxb25" +
"tbW1sbICFi5aboKeqrK+vr6+urKumpKGdm5mWlZSTk5OSkpKSkZCOi4iFfnl1cGtmYVhUUEpHRkRFRkdKTVBYXWFrcHV+gYWIi42OkZGSkpKTk5SUlZaYmZ2foaapq66vr6+vrqynpKCWkYuAenRpZ" +
"F9bWFVTUFBQUVNUWVteYGJkZmlqa2xsbG1tbW5vb3F1d3qBhoqUmZ6ip6uvtbi5u7q5tbKvq6einpSPioF+enVycW9vbm1tbWyAhYuWm6Cnqqyur6+vrqyrpqShnZuZmJaVlJOTk5KSkpGQjo2LiIV" +
"+eXVrZmFYVFBNSkdGREVGSk1QWF1hZmtwdX6BhYuNjpGRkpKSkpOTlJSWmJmdn6Gmqausrq+vr66sp6SglpGLhYB6dGlkX1hVU1BQUFBRU1RZW15iZGZpamtrbGxsbW1tb29xdXd6foGGipSZnqerr" +
"7W4ubq7urm1sq+nop6Uj4qBfnp3dXJxb25tbW1sgIWLkZaboKeqrK+vr66sq6mmpKGdm5mWlZSTk5OSkpKSkZCOi4iFfnl1cGtmYVhUUEpHRkRFRkdKTVBYXWFrcHV+gYWLjY6QkZGSkpKTk5SUlpi" +
"Zm52foaapq66vr6+urKqnpKCWkYuAenRpZF9bWFVTUFBQUVNUWVteYGJkZmlqa2xsbG1tbW5vb3F1d3qBhoqUmZ6nq6+ytbi5u7q5tbKvp6KemZSPioF+enVycW9ubW1tbWyAhYuWm6Cnqqyur6+vr" +
"qyrpqShnZuZmJaVlJOTk5KSkpGQjo2LiIV+eXVrZmFYVFBKR0ZFREVGSk1QWF1ha3B1eX6BhYuNjpGRkpKSk5OTlJSWmJmdn6Gmqausrq+vr66sp6SglpGLhYB6dGlkX1hVU1BQUFBRU1RZW15iZGZ" +
"pamtsbGxtbW1tb29xdXd6gYaKj5SZnqerr7W4ubu6ubi1sq+nop6Uj4qBfnp3dXJxb25tbW1sgIWLkZaboKeqrK+vr66sq6mmpKGdm5mWlZSTk5OSkpKRkZCOi4iFfnl1a2ZhXVhUUEpHRk1NT1VZX" +
"WFlaW1zdXd4d3Z0cnFwb29wc3Z6g4eNmJyhpamrrK2sqqWin5mWlZOSkpKVl5mdn6ChoZ+al5KNh4J8cm1pYmFfX2FiZGVoam1tbWxqaGJfXFlWVFJSUlRaXmNtcnh9goWJjY6PjoyLiYeHhoeIiY+" +
"Slp+jp66wsrOzsrCAhYqUmJygoKGfnZuZl5WUkpKSlpiboaSnqqytrayqp5+alYqFgHx4dXJwcHBydHV3eHh4dnRya2djWldTTk1MTE5QU1tfZG1wdXp8fX19fHt5d3d2dnd8f4SNkpecoaWpr6+wr" +
"qyqnJiUko+Pj5OWmaGkpqelo5+alZCFgHx3d3d7foGDhoeHhIF9cm1oXltYV1hZXGNmam9wcG1qZmJeWldTU1RZXmJtcnZ8fn59e3l2cW9ugIWLlJeYmZiXlI6MiYeHiY+TmJ2ipqqurq6opKCXk5C" +
"OjY2Ok5eaoKKioJ6alY+KhHp2c3Fyc3h7foCBgYF7d3NoYl5XVVRXWV1gZWhrb3BvamdjXFlWVlZXWWJnbHd8f4OEg4F+fHl0c3N3en6Jj5SanqGjpKKgmZaTj46OkJKVmaKmqq6uraejn5mUkIyGh" +
"YWJi46UlZeVk4+LhH12bGlpb3R5hIiKioeEfXBpY11dX2lvdXqAho2WlpaOiYN5dnZ2en+Gk5meo6Gek42Hg4B+f4eNlKCkpqWhnJaPiYR+f4KLkZegoqKblo+IgXx4dnh8h42Rl5aUj4mCe25raWt" +
"vdICEiIqJh4J1bmdeXV1kanB2e3+Bfnp0Z2FcWFlcYWdtdH6AgXt2cGRgXVxeYmd1e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8eHZ2eIGHj5ufoqCcl5GLhoJ+gISPlZylp6akoJqUh4J/gIaNlpaWk" +
"46Jg3l2dnp/hpOZnqGjoZ6TjYeAfn+HjZSgpKanpaGcj4mEfn+Ci5GXnKCiopuWj4F8eHZ4fIGHjZGXlpSJgntua2lpa290gISIiYeCdW5nYl5dXWRqcHt/gX56dG5nYVxYWVxnbXR+gIF7dnBqZGB" +
"dXmJndXuCiYmIhIB6dGtpaW50e4mPlJaXlZGHgXx2dniBh4+Vm5+ioJyXi4aCfoCEiY+VnKWnpqCalIeCf36Aho2WlpaOiYN5dnZ6f4aMk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KLkZego" +
"qKblo+IgXx4dnh8h42Rl5aUj4mCe25raWtvdICEiIqJh4J1bmdeXV1kanB7f4GAfnp0Z2FcWFlcZ210en6AgXt2cGRgXV5iZ251e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8eHZ2eIGHj5ufoqCcl5G" +
"LhoJ+gISPlZylp6agmpSNh4J/gIaNlpaWjomDfnl2dnp/hpOZnqOhnpmTjYeAfn+HjZSgpKanpaGcj4mEfn+Ci5GXnKCiopuWj4F8eHZ4fIGHjZGXlpSJgntua2lrb3R6gISIiYeCdW5nXl1dYGRqc" +
"Ht/gX56dGdhXFlYWVxnbXR+gIF7dnBqZGBdXmJndXuCiYmIhH56dW5tbXR6gIuPkZGQjYl/e3h4en6Kj5SampmWkYyHf35/hYqQmp2fn5yZlImEgYCChYCFi4+RkpGJhIB5d3h+g4mPlJibmZaSh4O" +
"Af4GFiY+VmZ+fnZSPioF/f4GFiY6Ym52alpCFgHx6e36DiI2RlZSRh4F7cnBwcXV5foeKioeDfXFsaGZmaGt1en6Cgn91cGpmYmFhZ2xxe36AfXl0b2plY2JlaXR5foSDgn55dHBpaGlxdnyHi42Lh" +
"4N+eXVzc3Z7h4yRl5aVkYyHg3x7fISJj5mcnp2bl5KIg4GAg4eSl5uen56bgISIjY2MhYF+e3l5e4KGi5KTlI+Lh4SAf36ChoqTlZeVko6GgoB/gIOGjpKVlpSRiISAfXx9foWJjZGRjoeCfnp3dnZ" +
"7foKIiomEgHt3c3BucHN3f4GDgX56dnFta2lrbnZ6foB+fHh0b2xoaGpydnuAgYB6dnJvbGtscXZ6g4WGg4B8eHVzcnV4fIaJjI2LiISAfHp5e3+IjJCUk5GOioaDfn6Ah4yQlpeWlJGNiYGAgISHi" +
"4CEiIuNjYyFgX55eXuChouSk5SSj4uHgH9+goaKk5WXl5WSjoaCgICDho6SlZaWlJGIhIB9fn+Fh4mLi4qIgn98eXl7gIKEhoeGhH57eHV1dnp9gIKCgoF7eHVxcXJ3eXyAgH99end0cHBxdXh7f4B" +
"/fnt5dnJxcnZ5fYKDg4F/fXp2dXV6fYCFh4eGhIJ/e3p6fYCEiYuMi4mHhH9+foGDhoyOj46NioeCgICChIeNjo+Ni4iFgIOGiYiHgoB9e3x9gIOGiY2NjIeEgX5/gIKFiIuPj46JhoSAgICChYiLj" +
"o+OiYaDf35+gIKFh4uMi4eEgHt6ent9gIOHiIeDgH13dnV4e32AgoODf3x5c3JxdHZ5fH6AgH17eHJwcHh4eHh4eHh4eHh4eHl5eXl5enp6e3t7e3x8fX19fX5+fn9/f4CAgIGBgoKCgoODg4SEhIW" +
"FhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4CAgIGBgYGCgoKDg4OEhISFhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWEhISDg4ODgoKCgYGAgIB/f39+fn59fX18fHt7e3t6e" +
"np6enl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eXl5eXp6ent7e3t7fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWFhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHgICAgYGBgoKCg4ODhISEhIW" +
"FhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhYSEhIODg4KCgoGBgICAgH9/f35+fX19fHx8e3t7e3p6enp5eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl6enp6e3t7e3x8f" +
"X19fn5+fn9/f4CAgIGBgoKCg4ODg4SEhIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4CAgIGBgYGCgoKDg4OEhISFhYWGhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoaFhYWEhISDg4O" +
"DgoKCgYGAgIB/f39+fn59fX18fHt7e3t6enp6enl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXp6ent7e3t8fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWFhoaGhoeHh4eHh4eHh4eHh" +
"4eHh4eHh4eAgICAgYGBgoKCg4ODhISEhYWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhYSEhIODg4KCgoGBgICAgH9/f35+fX19fHx7e3t7e3p6enp5eXl5eHh4eHh4eHh4eHh" +
"4eHh4eHh4eHh4eHl5eXl6enp6e3t7e3x8fX19fn5+fn9/f4CAgIGBgoKCg4ODg4SEhIWFhYaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4CAgIGBgYKCgoODg4OEhISFhYWGhoaGhoaHh4eHh4eHh4eHh" +
"4eHh4eHh4eHh4eGhoaGhoaFhYWEhISDg4OCgoKBgYGAgIB/f39+fn19fX18fHt7e3t6enp6eXl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXp6ent7e3t8fHyAf358e3p7fH6Cg4SEg4KBgH9" +
"/gIKDh4iJiIeFhIOCgoSFh4qLi4mIh4WEg4SGh4mLi4uAgYOEhYSEgYB/f4CBhYaIiImIh4WDgoODhYiKi4uLiomGhISEhYeJiouKiYeGhIOCg4SFiImJh4WDgoB/f4CBgoSFhIKAfn17e3p8fX6Ag" +
"IB9e3l4d3Z3eXp7fX18eXd2dXR0dXh5enx7enh2dXR0dXZ5enx9fHt5d3d3eHl7fX6AgH9+fHt6e3x+gIKDhISDgoB/f4CCg4WHiImIh4WDgoKEhYeJiouLiYiHhIOEhoeJiouLi4CAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA\"}}}"
const VOIX: any = JSON.parse(VOIX_TXT)

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
let graine = 40404
const rnd = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0
    return graine / 2147483648 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (Si, 35 cents
// trop bas : 121 Hz). Ici on les decode et on les reechantillonne.
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
    radio(f)
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}

/** La voix sort d un petit haut-parleur : on garde surtout le medium. */
function radio(x: Float32Array) {
    const m = bande(x, 1300, 0.8)
    for (let i = 0; i < x.length; i++) {x[i] = x[i] * 0.3 + m[i]}
}

// "Four. Zero. Four." : un mot tous les deux temps, sur le Si
const vOuvre = await phrase("404 four zero four", [["four", 0, 0, 0], ["zero", 2, 0, 0], ["four", 4, 0, 0]], 1, 0.3)
// "Zero", une quarte plus bas : le dernier mot avant la panne
const vZero = await phrase("404 zero", [["zero", 0, -5, 0]], 1, 0.4)
// Quatre octets, lus chiffre par chiffre : 42 45 41 54
const OCTETS: string[][] = [["four", "two"], ["four", "five"], ["four", "one"], ["five", "four"]]
const vOctets: any[] = []
for (let k = 0; k < OCTETS.length; k++) {
    vOctets.push(await phrase("404 octet " + (k + 1), [[OCTETS[k][0], 0, 0, 0], [OCTETS[k][1], 1.5, 0, 0]], 1, 0.3))
}
// "Not found", une quinte plus bas, donc plus lent
const vPerdu = await phrase("404 not found", [["not", 0, -7, 0], ["found", 1.5, -7, 0]], 1, 0.5)

// ---------- Projet ----------
const project = openDAW.newProject("4 h 04 v2")
project.bpm = BPM

// Une seule salle pour tout le monde
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.8, damping: 0.6, preDelay: 25, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Veille", start: 0, bars: 8},
    {name: "Signal", start: 8, bars: 8},
    {name: "Boucle 1", start: 16, bars: 16},
    {name: "Boucle 2", start: 32, bars: 16},
    {name: "Panne", start: 48, bars: 16},
    {name: "Boucle 3", start: 64, bars: 16},
    {name: "Boucle 4", start: 80, bars: 16},
    {name: "Extinction", start: 96, bars: 16}
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
    let s = (a * 374761393 + b * 668265263 + 404) >>> 0
    s = ((s ^ (s >>> 13)) * 1274126177) >>> 0
    s = (s ^ (s >>> 16)) >>> 0
    return s / 4294967296
}

// ---------- La carte du morceau ----------
/** Les boucles : la batterie entiere et la basse. */
const boucle = (bar: number) => (bar >= 16 && bar < 48) || (bar >= 64 && bar < 96)
/** La panne : tout s arrete sauf la nappe, la voix et le terminal. */
const panne = (bar: number) => bar >= 48 && bar < 64
/** La mesure avant la panne s arrete un temps plus tot : la voix dit "zero" dans le vide. */
const limite = (bar: number) => bar === 47 ? 12 : 16
/**
 * L accord de la mesure : 0 = Si mineur, 1 = Sol, 2 = Mi mineur, 3 = Do. Deux mesures chacun.
 * Pendant la panne la basse ne descend plus : Si mineur, puis Do pose sur le Si, quatre mesures chacun.
 */
const accord = (bar: number): number =>
    panne(bar) ? (Math.floor((bar - 48) / 4) % 2 === 0 ? 0 : 3) : Math.floor((bar % 8) / 2)
/** Les doubles-croches impaires arrivent un peu tard : la batterie et la basse trainent. */
const SWING = 30
const pos = (step: number) => Math.round(step * S16 + (step % 2 === 1 ? SWING : 0))

/** Les reglages de bande communs. Chaque instrument a sa phase : chacun derive de son cote. */
const bande404 = (phase: number, wow: number) => ({tune: FAUX, wow, flutter: 3, phase})

// ---------- La nappe ----------
// Quatre notes par accord. Le Fa diese ne bouge jamais ; d un accord au suivant
// une seule note change, parfois aucune (Sol et Mi mineur ont les memes notes :
// seule la basse descend).
const NAPPE = [[50, 54, 57, 61], [50, 54, 55, 59], [50, 54, 55, 59], [52, 54, 55, 59]]
const NAPPE_PANNE = [[47, 54, 57, 61], [47, 54, 55, 59], [47, 54, 55, 59], [47, 52, 55, 60]]
const V_NAPPE = 0.5
const pad = apparat("Nappe", MAGNETO, -8.5)
reglages("nappe", pad, {
    ...bande404(0, 18), shape: 0.35, pwm: 0.5, detune: 12, sub: 0, cutoff: 420, envmod: 1.4, track: 0.3, reso: 0.15,
    attack: 1100, decay: 3500, sustain: 0.75, release: 2200, vibrato: 0, drift: 8, glide: 1,
    drive: 0.35, age: 0.45, dropout: 0.25, width: 0.8, volume: V_NAPPE
})
pad.addSend(reverb, {amount: -12})
build(pad.noteTracks[0], "Nappe", bar => {
    const out: Note[] = []
    if (panne(bar)) {
        if ((bar - 48) % 4 !== 0) {return out}
        for (const pitch of NAPPE_PANNE[accord(bar)]) {out.push({position: 0, duration: 4 * BAR - 240, pitch, velocity: 0.7})}
        return out
    }
    if (bar % 2 !== 0) {return out}
    const notes = NAPPE[accord(bar)].slice()
    // Au sommet du morceau, une cinquieme voix une octave au-dessus du Fa diese
    if (bar >= 80 && bar < 96) {notes.push(66)}
    for (const pitch of notes) {out.push({position: 0, duration: 2 * BAR - 160, pitch, velocity: 0.7})}
    return out
})
// Le filtre s ouvre de boucle en boucle et se referme dans la panne
auto("nappe", pad, "cutoff", enLog([
    [0, 200], [8, 330], [16, 420], [32, 520], [47.9, 560], [48, 260], [56, 300], [64, 520], [80, 680],
    [96, 480], [104, 330], [112, 180]
], 40, 12000))
// La bande lache davantage quand la nappe est seule
auto("nappe", pad, "dropout", [
    [0, 0.6], [8, 0.4], [16, 0.12], [47.9, 0.12], [48, 0.75], [62, 0.6], [64, 0.12], [96, 0.12], [104, 0.6], [112, 0.8]
])
// La bande demarre (elle monte jusqu a sa vitesse), cale au debut de la panne, et ralentit a la fin
auto("nappe", pad, "tune", enDroit([
    [0, -260], [0.55, FAUX], [47.7, FAUX], [48, -150], [48.8, FAUX], [110.2, FAUX], [112, -400]
], -400, 100))
auto("nappe", pad, "volume", [[0, V_NAPPE], [110.5, V_NAPPE], [112, 0]])

// ---------- La basse ----------
// Une sinusoide sous une dent de scie tres fermee. Elle descend de tierce en
// tierce : Si, Sol, Mi, Do. Les notes sont ecrites une octave au-dessus de ce
// qu on entend (l instrument ajoute l octave du dessous).
const FOND = [47, 43, 52, 48]
/** La note qui mene a l accord suivant. */
const APPROCHE = [45, 50, 50, 45]
const bass = apparat("Basse", MAGNETO, -2)
reglages("basse", bass, {
    ...bande404(0.3, 8), shape: 0.2, pwm: 0.2, detune: 5, sub: 1, cutoff: 200, envmod: 1.6, track: 0.2, reso: 0.1,
    attack: 8, decay: 700, sustain: 0.55, release: 140, vibrato: 0, drift: 3, glide: 1,
    drive: 0.5, age: 0.7, dropout: 0, width: 0.15, volume: 0.5
})
build(bass.noteTracks[0], "Basse", bar => {
    const out: Note[] = []
    const n = (step: number, len: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: pos(step), duration: Math.round(Math.min(len, limite(bar) - step) * S16 - 40), pitch, velocity})}
    }
    const a = accord(bar), f = FOND[a]
    if (boucle(bar)) {
        if (bar % 2 === 0) {
            n(0, 6, f, 0.9); n(10, 3, f, 0.7)
        } else {
            n(0, 9, f, 0.85); n(12, 2, f, 0.6); n(14, 2, APPROCHE[a], 0.7)
        }
        return out
    }
    // La fin de la panne : le Si revient, une note longue toutes les deux mesures
    if (bar >= 56 && bar < 64 && bar % 2 === 0) {n(0, 14, 47, 0.7)}
    // L extinction : une note par mesure
    if (bar >= 96 && bar < 104) {n(0, bar % 2 === 0 ? 14 : 10, f, 0.75)}
    return out
})

// ---------- La melodie ----------
// Cinq notes (Si, Re, Mi, Fa diese, La), des valeurs longues, une voix qui
// glisse d une note a l autre et qui tremble en retard. Et une note en trop :
// le Do, a la fin de chaque phrase.
// Chaque mesure : [pas, longueur en pas, note].
type Ligne = number[][][]
const MEL_A: Ligne = [
    [[0, 6, 66], [6, 2, 64], [8, 6, 62], [14, 2, 59]],
    [[0, 10, 62], [12, 4, 64]],
    [[0, 6, 66], [6, 2, 69], [8, 6, 66], [14, 2, 64]],
    [[0, 12, 62]],
    [[0, 6, 59], [6, 2, 62], [8, 6, 64], [14, 2, 66]],
    [[0, 10, 64], [12, 4, 62]],
    [[0, 6, 64], [6, 2, 67], [8, 8, 66]],
    [[0, 12, 60]]
]
const MEL_B: Ligne = [
    [[0, 4, 71], [4, 4, 69], [8, 6, 66], [14, 2, 69]],
    [[0, 12, 66]],
    [[0, 4, 71], [4, 4, 74], [8, 6, 71], [14, 2, 69]],
    [[0, 10, 66], [12, 4, 64]],
    [[0, 6, 67], [6, 2, 66], [8, 6, 64], [14, 2, 59]],
    [[0, 12, 64]],
    [[0, 6, 64], [6, 2, 66], [8, 4, 67], [12, 4, 71]],
    [[0, 8, 72], [8, 6, 71]]
]
function melodie(bar: number): number[][] {
    const k = bar % 8
    if (bar >= 8 && bar < 16) {return MEL_A[k]}
    if (bar >= 24 && bar < 40) {return MEL_A[k]}
    if (bar >= 40 && bar < 48) {return MEL_B[k]}
    if (bar >= 64 && bar < 72) {return MEL_B[k]}
    if (bar >= 72 && bar < 80) {return MEL_A[k]}
    if (bar >= 80 && bar < 88) {return MEL_B[k]}
    // Au sommet, la premiere phrase une octave plus haut
    if (bar >= 88 && bar < 96) {return MEL_A[k].map(n => [n[0], n[1], n[2] + 12])}
    // L extinction : il n en reste que des bouts
    if (bar >= 96 && bar < 104) {return k < 2 || k === 4 || k === 5 ? MEL_A[k] : []}
    return []
}
const lead = apparat("Melodie", MAGNETO, -8.5, -0.1)
reglages("melodie", lead, {
    ...bande404(0.55, 22), flutter: 4, shape: 0.12, pwm: 0.2, detune: 6, sub: 0, cutoff: 750, envmod: 1.2, track: 0.5,
    reso: 0.3, attack: 35, decay: 900, sustain: 0.6, release: 500, vibrato: 16, drift: 6, glide: 70,
    drive: 0.25, age: 0.4, dropout: 0.1, width: 0.35, volume: 0.5
})
lead.addAudioEffect("Delay", {delay: 13, feedback: 0.42, cross: 1, filter: 0.3, wet: -11})
lead.addSend(reverb, {amount: -9})
build(lead.noteTracks[0], "Melodie", bar => {
    const notes = melodie(bar).filter(n => n[0] < limite(bar))
    return notes.map((n, k) => {
        // Deux notes qui se touchent sont liees : la voix glisse de l une a l autre
        const suivante = notes[k + 1]
        const liee = suivante !== undefined && suivante[0] === n[0] + n[1]
        return {
            position: n[0] * S16, duration: Math.round(Math.min(n[1], limite(bar) - n[0]) * S16 + (liee ? 30 : -40)),
            pitch: n[2], velocity: 0.8
        }
    })
})
auto("melodie", lead, "cutoff", enLog([
    [8, 520], [16, 650], [24, 700], [40, 850], [64, 850], [88, 1000], [96, 650], [104, 450]
], 40, 12000))

// ---------- L arpege ----------
// Des croches. Six notes par accord, dans une mesure qui en contient huit : le
// dessin ne retombe sur ses pieds que toutes les trois mesures.
const ARP = [[59, 62, 66, 73, 69, 66], [59, 62, 66, 71, 67, 62], [59, 64, 67, 71, 66, 64], [60, 64, 67, 71, 66, 64]]
const arp = apparat("Arpege", MAGNETO, -5, 0.15)
reglages("arpege", arp, {
    ...bande404(0.8, 14), shape: 0.55, pwm: 0.3, detune: 7, sub: 0, cutoff: 420, envmod: 2.8, track: 0.4, reso: 0.3,
    attack: 2, decay: 190, sustain: 0, release: 160, vibrato: 0, drift: 5, glide: 1,
    drive: 0.2, age: 0.15, dropout: 0, width: 0.6, volume: 0.5
})
arp.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.25, wet: -8})
arp.addSend(reverb, {amount: -13})
build(arp.noteTracks[0], "Arpege", bar => {
    const out: Note[] = []
    const on = (bar >= 16 && bar < 48) || (bar >= 56 && bar < 104)
    if (!on) {return out}
    const notes = ARP[accord(bar)]
    // Il entre et il sort doucement
    const force = bar < 24 || bar >= 96 || bar < 60 && bar >= 56 ? 0.75 : 1
    for (let i = 0; i < 8; i++) {
        if (i * 2 >= limite(bar)) {continue}
        const k = (bar * 8 + i) % 6
        const velocity = ((k === 0 ? 0.8 : 0.55) + (tirage(bar, i) - 0.5) * 0.12) * force
        out.push({position: i * 2 * S16, duration: S16, pitch: notes[k], velocity})
    }
    return out
})
auto("arpege", arp, "cutoff", enLog([
    [16, 300], [24, 480], [32, 560], [48, 620], [56, 190], [64, 560], [80, 680], [96, 620], [104, 250]
], 40, 12000))

// ---------- Le terminal ----------
// Des bips carres, tres courts, tres hauts, par rafales : une machine qui
// travaille dans la piece d a cote. Droits, sans swing : c est une machine.
// Les notes et les trous sont tires au sort, toujours de la meme facon.
const BIPS = [83, 86, 88, 90, 93, 95]
const term = apparat("Terminal", MAGNETO, -6, 0.35)
reglages("terminal", term, {
    ...bande404(0.2, 5), flutter: 1, shape: 1, pwm: 0, detune: 0, sub: 0, cutoff: 2600, envmod: 0.6, track: 0.3, reso: 0.2,
    attack: 1, decay: 40, sustain: 0, release: 25, vibrato: 0, drift: 2, glide: 1,
    drive: 0.2, age: 0.15, dropout: 0, width: 0, volume: 0.5
})
term.addAudioEffect("Delay", {delay: 11, feedback: 0.35, cross: 1, filter: 0.3, wet: -10})
term.addSend(reverb, {amount: -15})
build(term.noteTracks[0], "Terminal", bar => {
    const out: Note[] = []
    let from = -1, to = -1
    if (panne(bar)) {
        from = Math.floor(tirage(bar, 1) * 3) * 4
        to = from + 4 + Math.floor(tirage(bar, 2) * 8)
    } else if (bar === 6 || bar === 7) {
        from = 10; to = 16
    } else if ((boucle(bar) && bar >= 32) || (bar >= 96 && bar < 110)) {
        if (bar % 8 === 7) {from = 8; to = 16} else if (bar % 8 === 3) {from = 12; to = 16}
    }
    for (let step = from; step >= 0 && step < Math.min(to, limite(bar)); step++) {
        if (tirage(bar, 10 + step) < 0.22) {continue}
        out.push({
            position: step * S16, duration: 60, pitch: BIPS[Math.floor(tirage(bar, 40 + step) * 6)],
            velocity: 0.45 + 0.4 * tirage(bar, 70 + step)
        })
        // De temps en temps deux bips dans le meme pas
        if (tirage(bar, 90 + step) < 0.25) {
            out.push({position: step * S16 + 120, duration: 50, pitch: BIPS[Math.floor(tirage(bar, 120 + step) * 6)], velocity: 0.4})
        }
    }
    return out
})

// ---------- L aspiration ----------
// La meme quinte, Si et Fa diese, qui enfle pendant une mesure et s arrete net
// sur le premier temps de la suivante. Elle annonce chaque changement.
const swell = apparat("Aspiration", MAGNETO, -11.5)
reglages("aspiration", swell, {
    ...bande404(0.7, 20), shape: 0.3, pwm: 0.6, detune: 14, sub: 0, cutoff: 260, envmod: 3.2, track: 0.3, reso: 0.25,
    attack: 2400, decay: 400, sustain: 1, release: 45, vibrato: 0, drift: 10, glide: 1,
    drive: 0.3, age: 0.4, dropout: 0, width: 0.9, volume: 0.5
})
swell.addSend(reverb, {amount: -4})
build(swell.noteTracks[0], "Aspiration", bar => {
    if (![15, 31, 47, 63, 79, 95].includes(bar)) {return []}
    return [71, 78].map(pitch => ({position: 0, duration: limite(bar) * S16 - 20, pitch, velocity: 0.7}))
})

// ---------- La batterie ----------
// Une boucle lente qui traine : le pied, la caisse claire sur les temps 2 et
// 4, des croches de charley. Une mesure sur deux, le pied se deplace.
const KICK = 36, RIM = 37, SNARE = 38, HAT = 42, OPEN = 46
/** 0 = rien ; 1 = un coeur qui bat ; 2 = la boucle ; 3 = la boucle et ses notes fantomes ; 4 = et le charley ouvert ; 5 = ce qu il en reste. */
function batterie(bar: number): number {
    if (bar >= 8 && bar < 16) {return 1}
    if (bar >= 16 && bar < 32) {return 2}
    if (bar >= 32 && bar < 48) {return 3}
    if (bar >= 56 && bar < 64) {return 1}
    if (bar >= 64 && bar < 80) {return 3}
    if (bar >= 80 && bar < 96) {return 4}
    if (bar >= 96 && bar < 104) {return 5}
    if (bar >= 104 && bar < 110) {return 1}
    return 0
}
const drums = apparat("Poussiere", POUSSIERE, -8)
reglages("poussiere", drums, {
    tune: 54, punch: 0.6, kdecay: 190, stone: 185, snap: 0.35, sdecay: 130, htone: 8500, hdecay: 36, odecay: 240,
    rate: 24000, bits: 10, drive: 0.15, tone: 14000, volume: 0.6
})
drums.addSend(reverb, {amount: -24})
build(drums.noteTracks[0], "Poussiere", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step >= limite(bar)) {return}
        const v = velocity + (tirage(bar, step * 7 + pitch) - 0.5) * 0.08
        out.push({position: pos(step), duration: S16 / 2, pitch, velocity: Math.max(0.05, Math.min(1, v))})
    }
    if (b === 0) {return out}
    if (b === 1) {
        // Deux coups rapproches, puis rien : un coeur
        hit(0, KICK, 0.75); hit(3, KICK, 0.45)
        if (bar % 2 === 1) {hit(12, RIM, 0.45)}
        return out
    }
    if (b === 5) {
        hit(0, KICK, 0.85); hit(10, KICK, 0.7); hit(4, RIM, 0.6); hit(12, RIM, 0.6)
        for (let s = 0; s < 16; s += 2) {hit(s, HAT, s % 4 === 0 ? 0.42 : 0.3)}
        return out
    }
    const pair = bar % 2 === 0
    hit(0, KICK, 1)
    if (pair) {
        hit(7, KICK, 0.7); hit(10, KICK, 0.9)
    } else {
        hit(6, KICK, 0.6); hit(10, KICK, 0.9)
        if (b >= 3) {hit(13, KICK, 0.5)}
    }
    hit(4, SNARE, 0.95); hit(12, SNARE, 1)
    // Les notes fantomes : une caisse claire a peine touchee
    if (b >= 3) {
        if (pair) {hit(15, SNARE, 0.3)} else {hit(9, SNARE, 0.28)}
    }
    for (let s = 0; s < 16; s += 2) {
        const ouvert = (b >= 3 && bar % 4 === 3 && s === 14) || (b === 4 && !pair && s === 6)
        hit(s, ouvert ? OPEN : HAT, s % 4 === 0 ? 0.68 : 0.46)
    }
    if (b >= 3) {hit(3, HAT, 0.25); hit(11, HAT, 0.25)}
    // Fin de phrase : la caisse claire relance
    if (bar % 8 === 7) {hit(14, SNARE, 0.55); hit(15, SNARE, 0.75)}
    return out
})

// ---------- La voix ----------
// Une seule piste, dans un echo et dans la salle. Deux regions ne doivent
// jamais se chevaucher.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -7.5})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.3, wet: -8})
voix.addSend(reverb, {amount: -7})
const dire = (quoi: string, sample: any, bar: number, step: number) =>
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
// "Four, zero, four", seule avec la nappe
dire("ouverture", vOuvre, 2, 0)
// "Zero" : la batterie vient de s arreter, la panne commence
dire("zero", vZero, 47, 12)
// La panne : quatre octets, un toutes les deux mesures
vOctets.forEach((sample, k) => dire("octet " + (k + 1), sample, 50 + 2 * k, 0))
// L extinction : les nombres reviennent, puis le verdict
dire("rappel", vOuvre, 100, 0)
dire("not found", vPerdu, 106, 0)

// Limiteur de sortie, leger : les deux references ne sont presque pas limitees
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -0.8} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur la deuxieme boucle (mesures 32 a 48), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [pad, bass, lead, arp, term, swell, drums, voix]
const STEMS: [string, any][] = [["Nappe", pad], ["Basse", bass], ["Melodie", lead], ["Arpege", arp],
    ["Terminal", term], ["Aspiration", swell], ["Poussiere", drums]]
if (MESURER) {
    const parts = [["veille", 0, 8], ["signal", 8, 16], ["boucle1", 16, 32], ["boucle2", 32, 48], ["panne", 48, 64],
        ["boucle3", 64, 80], ["boucle4", 80, 96], ["extinction", 96, 112]]
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
        // Les memes mesures que sur les references, sur la deuxieme boucle (mesures 32 a 48)
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
                line += " || boucle2 : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
