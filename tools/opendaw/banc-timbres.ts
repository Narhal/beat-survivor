// BANC D ECOUTE - trois timbres candidats pour la ligne principale
// 126 BPM - La - 72 mesures (2 min 17)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// banc-timbres.src.ts et des instruments du dossier apparat/.
//
// Ce n est pas un morceau. Apres deux paris manques sur le timbre de la ligne
// principale (Rivet : "naif, voire attendu" ; Glotte : "fait jouet"), N4
// tranche a l oreille entre trois candidats avant qu un morceau soit ecrit.
//
// La meme machine tourne du debut a la fin (pied, basse, tic a contretemps).
// Chaque candidat a 24 mesures, et suit la regle de dosage tiree des deux
// references berlinoises : 4 mesures d absence, 8 de parcimonie, 8 d arrivee,
// 4 plus chargees.
//   mesures  1 a 24 : 1 - LARSEN     une boucle de retour qui enfle et qu on coupe
//   mesures 25 a 48 : 2 - GUIMBARDE  une lame sur une seule note, une bouche qui en tire les harmoniques
//   mesures 49 a 72 : 3 - REVERS     du metal joue a l envers, qui finit sur le temps
//
// Les lignes evitent ce que mes melodies avaient de trop attendu : pas de
// tonique sur les temps forts, pas de "demi-ton de menace", des phrases de
// trois mesures contre des blocs de huit, des entrees hors du temps. Le
// Larsen et la Guimbarde ne jouent pas les notes du clavier : ils choisissent
// parmi les harmoniques d un La grave (le 7e, le 10e et le 11e tombent entre
// deux touches).

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 72
const barSec = 240 / BPM
const PAS_MS = 60000 / BPM / 4

const FRAPPE: string = "// @label Frappe\n// @param tune    50    38    70    exp     Hz\n// @param start   420   120   2000  exp     Hz\n// @param sweep   55    15   " +
" 160   exp     ms\n// @param decay   180   60    600   exp     ms\n// @param punch   0.5   0     1     linear\n// @param click   0.5   0     1 " +
"    linear\n// @param drive   0.35  0     1     linear\n// @param volume  0.8   0     1     linear\n\n// La grosse caisse, en couches separees, " +
"chacune avec son role :\n// - le corps : une sinusoide qui tombe de \"start\" a \"tune\" en \"sweep\" ms puis\n//   tient sa note (\"decay\" = sa long" +
"ueur). C'est le sub ;\n// - le coup dans la poitrine (\"punch\") : une chute de hauteur tres rapide\n//   (8 ms) ajoutee par-dessus, qui travers" +
"e les 100-200 Hz ;\n// - le claquement (\"click\") : 3 ms de bruit filtre vers 2 a 5 kHz, une couche\n//   a part, qui ne depend pas de la satur" +
"ation ;\n// - la saturation (\"drive\"), en parallele : le corps propre et sa copie\n//   ecrasee sont additionnes, le grave reste net et les me" +
"diums gagnent de\n//   quoi exister sur de petites enceintes.\n// La sortie est ecretee en douceur : la pointe de l'attaque ne depasse pas\n// " +
"le corps de plus de quelques dB, pour que le limiteur final n'ait presque\n// rien a faire.\nclass Processor {\n    tune = 50\n    start = 420\n " +
"   sweepMs = 55\n    decayMs = 180\n    punch = 0.5\n    click = 0.5\n    drive = 0.35\n    volume = 0.8\n    phase = 0\n    amp = 0\n    envSweep =" +
" 0\n    envPunch = 0\n    envClick = 0\n    level = 0\n    seed = 24680\n    bandLow = 0\n    bandBand = 0\n    paramChanged(name, value) {\n       " +
" switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"start\": this.start = value; break\n            case \"swe" +
"ep\": this.sweepMs = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"punch\": this.punch = value; break\n " +
"           case \"click\": this.click = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volum" +
"e = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        // La phase repart toujours du meme point : chaque coup est" +
" identique\n        this.phase = 0\n        this.amp = 1\n        this.envSweep = 1\n        this.envPunch = 1\n        this.envClick = 1\n       " +
" this.level = velocity\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.amp = 0\n        this.envClick = 0\n    }\n    process(output, " +
"block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kAmp = Math.exp(-" +
"1 / (this.decayMs * 0.001 * sr))\n        const kSweep = Math.exp(-1 / (this.sweepMs * 0.001 * 0.35 * sr))\n        const kPunch = Math.exp(-1" +
" / (0.008 * sr))\n        const kClick = Math.exp(-1 / (0.003 * sr))\n        const gain = 1 + this.drive * 7\n        const wet = this.drive\n " +
"       const fClick = 2 * Math.sin(Math.PI * 3200 / sr)\n        const out = this.level * this.volume\n        const ratio = this.start / this" +
".tune - 1\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.amp < 0.0002 && this.envClick < 0.0002) {continue}\n      " +
"      const f = this.tune * (1 + ratio * this.envSweep) * (1 + 1.2 * this.punch * this.envPunch)\n            this.phase += f / sr\n          " +
"  if (this.phase >= 1) {this.phase -= 1}\n            const body = Math.sin(twoPi * this.phase) * this.amp\n            // Saturation en paral" +
"lele : corps propre + copie ecrasee\n            const sat = Math.tanh(body * gain) / Math.tanh(gain)\n            const low = body * (1 - 0.5" +
" * wet) + sat * wet * 0.8\n            // Le claquement : bruit dans un passe-bande\n            this.seed = (this.seed * 1664525 + 1013904223" +
") >>> 0\n            const noise = (this.seed / 2147483648 - 1) * this.envClick\n            this.bandLow += fClick * this.bandBand\n          " +
"  this.bandBand += fClick * (noise - this.bandLow - 0.9 * this.bandBand)\n            const tick = this.bandBand * this.click * 1.4\n         " +
"   // Ecretage doux de la pointe\n            const x = (low + tick) * 1.15\n            const y = (x > 0.9 ? 0.9 + Math.tanh((x - 0.9) * 3) /" +
" 3 : x < -0.9 ? -0.9 + Math.tanh((x + 0.9) * 3) / 3 : x) * out\n            outL[s] += y\n            outR[s] += y\n            this.amp *= kAm" +
"p\n            this.envSweep *= kSweep\n            this.envPunch *= kPunch\n            this.envClick *= kClick\n        }\n    }\n}"
const ROULANTE: string = "// @label Roulante\n// @param pas      121   60    300   exp     ms\n// @param long     0.8   0.2   1.5   linear\n// @param cutoff   90    40  " +
"  400   exp     Hz\n// @param envmod   3     0     6     linear\n// @param fdecay   0.45  0.05  1     linear\n// @param pinch    0.5   0     1 " +
"    linear\n// @param sub      0.7   0     1     linear\n// @param sublen   0.6   0.2   1     linear\n// @param disperse 0.3   0     1     line" +
"ar\n// @param drive    0.4   0     1     linear\n// @param volume   0.7   0     1     linear\n\n// La basse roulante : des notes courtes entre l" +
"es coups de pied. Chaque note\n// repart exactement du meme point (meme phase, filtre remis a zero) et\n// retombe a zero avant la suivante. S" +
"a duree se compte en pas, pas en\n// millisecondes : \"pas\" est la duree d'une double-croche au tempo du morceau,\n// \"long\" la longueur de la " +
"note en pas. Tout suit donc le tempo.\n// Le son a deux chemins :\n// - la fondamentale : une sinusoide seule, propre, plus courte que le rest" +
"e\n//   (\"sub\" = son niveau, \"sublen\" = sa longueur, en part de la note) ;\n// - les harmoniques : une dent de scie privee de sa fondamentale," +
" dans un\n//   passe-bas dont la coupure part haut et retombe (\"cutoff\" = ou elle\n//   retombe, \"envmod\" = de combien d'octaves elle part, \"f" +
"decay\" = en quelle\n//   part de la note ; \"pinch\" = une seconde enveloppe de 6 ms, le pincement),\n//   puis une saturation (\"drive\"). Le gra" +
"ve, lui, n'est jamais sature.\n// \"disperse\" decale la phase des harmoniques les unes par rapport aux autres :\n// le spectre ne change pas, l" +
"'attaque oui (elle s'etale, la pointe baisse).\n// La velocite regle la part de fondamentale : en dessous de 0,35 il n'y en a\n// plus, a 0,75" +
" elle est entiere. La note qui suit le pied se joue sans elle,\n// pour ne pas s'ajouter a la queue du pied.\nclass Processor {\n    pasMs = 12" +
"1\n    long = 0.8\n    cutoff = 90\n    envmod = 3\n    fdecay = 0.45\n    pinch = 0.5\n    sub = 0.7\n    sublen = 0.6\n    disperse = 0.3\n    driv" +
"e = 0.4\n    volume = 0.7\n    table = null\n    built = -1\n    phase = 0\n    freq = 49\n    age = 0\n    length = 1\n    on = false\n    subGain =" +
" 1\n    bright = 1\n    low = 0\n    band = 0\n    pole = 0\n    g = 0\n    k1 = 0\n    paramChanged(name, value) {\n        switch (name) {\n       " +
"     case \"pas\": this.pasMs = value; break\n            case \"long\": this.long = value; break\n            case \"cutoff\": this.cutoff = value;" +
" break\n            case \"envmod\": this.envmod = value; break\n            case \"fdecay\": this.fdecay = value; break\n            case \"pinch\":" +
" this.pinch = value; break\n            case \"sub\": this.sub = value; break\n            case \"sublen\": this.sublen = value; break\n           " +
" case \"disperse\": this.disperse = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volume = " +
"value; break\n        }\n    }\n    // Une periode d'onde : les harmoniques 2 a 48 d'une dent de scie, dephases par \"disperse\"\n    build() {\n  " +
"      const n = 2048\n        const table = new Float32Array(n + 1)\n        const d = this.disperse\n        let peak = 0\n        for (let k =" +
" 2; k <= 48; k++) {\n            const theta = d * 2 * Math.PI * 3 * (k - 1) / (k + 5)\n            const a = 1 / k\n            for (let i = 0" +
"; i < n; i++) {\n                table[i] += a * Math.sin(2 * Math.PI * k * i / n + theta)\n            }\n        }\n        for (let i = 0; i " +
"< n; i++) {peak = Math.max(peak, Math.abs(table[i]))}\n        for (let i = 0; i < n; i++) {table[i] /= peak}\n        table[n] = table[0]\n   " +
"     this.table = table\n        this.built = d\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {return}\n        if (th" +
"is.table === null || Math.abs(this.built - this.disperse) > 0.01) {this.build()}\n        this.freq = 440 * Math.pow(2, (pitch - 69 + cent / " +
"100) / 12)\n        this.phase = 0\n        this.age = 0\n        this.length = Math.max(64, Math.round(this.long * this.pasMs * 0.001 * sample" +
"Rate))\n        this.subGain = Math.max(0, Math.min(1, (velocity - 0.35) / 0.4))\n        this.bright = 0.6 + 0.4 * velocity\n        this.low " +
"= 0\n        this.band = 0\n        this.pole = 0\n        this.on = true\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.on = false\n " +
"   }\n    process(output, block) {\n        if (!this.on) {return}\n        const [outL, outR] = output\n        const sr = sampleRate\n        c" +
"onst twoPi = 2 * Math.PI\n        const table = this.table\n        const dt = this.freq / sr\n        const attack = Math.round(0.0015 * sr)\n " +
"       const kPinch = 1 / (0.006 * sr)\n        const push = 1 + 6 * this.drive\n        const subEnd = this.sublen * this.length\n        for " +
"(let s = block.s0; s < block.s1; s++) {\n            if (this.age >= this.length) {\n                this.on = false\n                return\n  " +
"          }\n            const u = this.age / this.length\n            const p = this.phase\n            // Les harmoniques, lus dans la table\n" +
"            const pos = p * 2048\n            const i = pos | 0\n            const harm = table[i] + (table[i + 1] - table[i]) * (pos - i)\n   " +
"         // La coupure : une enveloppe large et un pincement de 6 ms, recalcules toutes les 8 notes d'horloge\n            if ((this.age & 7)" +
" === 0) {\n                const wide = 0.18 + 0.82 * Math.exp(-u / (this.fdecay * 0.35))\n                const pinch = Math.exp(-this.age * " +
"kPinch)\n                const fc = Math.min(this.cutoff * Math.pow(2, this.envmod * this.bright * wide + 2.5 * this.pinch * pinch), 7000)\n  " +
"              this.g = 2 * Math.sin(Math.PI * fc / sr)\n                this.k1 = 1 - Math.exp(-twoPi * fc * 2 / sr)\n            }\n          " +
"  this.low += this.g * this.band\n            this.band += this.g * (harm - this.low - 1.3 * this.band)\n            this.pole += (this.low - " +
"this.pole) * this.k1\n            const sat = Math.tanh(this.pole * push) / Math.sqrt(push)\n            // La fondamentale : propre, plus cou" +
"rte\n            const us = this.age / subEnd\n            const subAmp = us < 1 ? Math.pow(Math.cos(0.5 * Math.PI * us), 1.5) : 0\n           " +
" const fund = Math.sin(twoPi * p) * subAmp * this.sub * this.subGain\n            // L'enveloppe de la note : 1,5 ms de montee, puis une desc" +
"ente qui arrive a zero\n            const amp = (this.age < attack ? this.age / attack : 1) * Math.pow(Math.cos(0.5 * Math.PI * u), 1.2)\n    " +
"        const y = (sat * 0.7 * amp + fund * (this.age < attack ? this.age / attack : 1)) * this.volume\n            outL[s] += y\n            " +
"outR[s] += y\n            this.phase = p + dt\n            if (this.phase >= 1) {this.phase -= 1}\n            this.age++\n        }\n    }\n}"
const GRESIL: string = "// @label Gresil\n// @param decay   30    5     600   exp     ms\n// @param index   3     0     12    linear\n// @param snap    3     0.5   60 " +
"   exp     ms\n// @param body    0.2   0     1     linear\n// @param r2      2.41  0.5   9     linear\n// @param r3      5.63  0.5   13    line" +
"ar\n// @param noise   0.3   0     1     linear\n// @param chirp   0     0     36    linear  st\n// @param lowcut  400   20    8000  exp     Hz\n" +
"// @param drift   0.4   0     1     linear\n// @param width   0.5   0     1     linear\n// @param duck    0     0     1     linear\n// @param v" +
"olume  0.6   0     1     linear\n\n// Des percussions seches, sans bruit blanc ni echantillon. Trois sinusoides\n// en cascade : la troisieme m" +
"odule la phase de la deuxieme, qui module la\n// phase de la premiere. A fort indice (\"index\"), la cascade donne un bruit ;\n// l'indice retom" +
"be en \"snap\" ms et il ne reste qu'un son presque pur\n// (\"body\" = ce qu'il garde de l'indice). Du bruit a la note en quelques\n// millisecond" +
"es : un tic, un toc, une goutte, selon la hauteur jouee.\n// - \"r2\" et \"r3\" : les rapports de frequence des deux modulateurs. Des\n//   rappor" +
"ts a virgule donnent du metal ;\n// - \"noise\" : la troisieme sinusoide se module elle-meme et devient un bruit ;\n// - \"chirp\" : la note part " +
"plus haut et retombe en 10 ms ;\n// - \"lowcut\" : coupe-bas, pour laisser le grave au pied et a la basse ;\n// - \"drift\" : deux coups de suite " +
"ne sont jamais identiques (rapports et\n//   longueur bougent un peu, de facon rejouable).\n// Un coup plus fort est plus clair et plus long.\n" +
"// \"duck\" : toute note plus grave que 24 ne sonne pas, elle fait plonger le son.\nclass Processor {\n    decayMs = 30\n    index = 3\n    snapMs" +
" = 3\n    body = 0.2\n    r2 = 2.41\n    r3 = 5.63\n    noise = 0.3\n    chirp = 0\n    lowcut = 400\n    drift = 0.4\n    width = 0.5\n    duck = 0\n" +
"    volume = 0.6\n    voices = []\n    count = 0\n    dip = 0\n    dipSmooth = 0\n    paramChanged(name, value) {\n        switch (name) {\n       " +
"     case \"decay\": this.decayMs = value; break\n            case \"index\": this.index = value; break\n            case \"snap\": this.snapMs = va" +
"lue; break\n            case \"body\": this.body = value; break\n            case \"r2\": this.r2 = value; break\n            case \"r3\": this.r3 = " +
"value; break\n            case \"noise\": this.noise = value; break\n            case \"chirp\": this.chirp = value; break\n            case \"lowcu" +
"t\": this.lowcut = value; break\n            case \"drift\": this.drift = value; break\n            case \"width\": this.width = value; break\n     " +
"       case \"duck\": this.duck = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocit" +
"y, cent, id) {\n        if (pitch < 24) {\n            this.dip = 1\n            return\n        }\n        const sr = sampleRate\n        this.co" +
"unt++\n        // Un hasard rejouable : il ne depend que du rang du coup\n        const hash = (k) => {\n            let x = (this.count * 2654" +
"435761 + k * 40503) >>> 0\n            x ^= x >>> 15\n            x = Math.imul(x, 2246822519) >>> 0\n            x ^= x >>> 13\n            ret" +
"urn (x >>> 0) / 4294967296 - 0.5\n        }\n        const d = this.drift\n        const f = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n" +
"        const ms = this.decayMs * (0.55 + 0.7 * velocity) * (1 + 0.3 * d * hash(1))\n        if (this.voices.length >= 6) {this.voices.shift(" +
")}\n        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width\n        const angle = (1 + place * 0.6) * Math.PI / 4\n    " +
"    this.voices.push({\n            // Pas de phase par demi-echantillon : le calcul se fait deux fois par echantillon\n            d1: f / sr" +
" / 2, d2: f * this.r2 * (1 + 0.04 * d * hash(2)) / sr / 2, d3: f * this.r3 * (1 + 0.04 * d * hash(3)) / sr / 2,\n            p1: 0, p2: 0, p3" +
": 0, back: 0,\n            amp: 1, kAmp: Math.exp(-1 / (ms * 0.001 * sr)), attack: 0,\n            index: this.index * (0.5 + 0.7 * velocity)," +
" env: 1, kEnv: Math.exp(-1 / (this.snapMs * 0.001 * sr)),\n            bend: Math.pow(2, this.chirp / 12) - 1, envBend: 1, kBend: Math.exp(-1" +
" / (0.010 * sr)),\n            level: 0.3 + 0.7 * velocity, h1: 0, h2: 0,\n            left: Math.cos(angle), right: Math.sin(angle)\n        }" +
")\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.voices = []\n        this.dip = 0\n        this.dipSmooth = 0\n    }\n    process(out" +
"put, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kDip = Math." +
"exp(-1 / (0.110 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))\n        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)\n " +
"       const attackStep = 1 / (0.0003 * sr)\n        const fb = this.noise * 5\n        const body = this.body\n        for (let s = block.s0; " +
"s < block.s1; s++) {\n            this.dip *= kDip\n            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth\n            let left =" +
" 0, right = 0\n            for (const v of this.voices) {\n                if (v.amp < 0.0003) {continue}\n                const idx = v.index " +
"* (body + (1 - body) * v.env)\n                const m = 1 + v.bend * v.envBend\n                let y = 0\n                for (let half = 0; " +
"half < 2; half++) {\n                    v.p3 += v.d3 * m\n                    if (v.p3 >= 1) {v.p3 -= 1}\n                    const o3 = Math." +
"sin(twoPi * v.p3 + fb * v.back)\n                    v.back = 0.5 * (v.back + o3)\n                    v.p2 += v.d2 * m\n                    if" +
" (v.p2 >= 1) {v.p2 -= 1}\n                    const o2 = Math.sin(twoPi * v.p2 + idx * o3)\n                    v.p1 += v.d1 * m\n             " +
"       if (v.p1 >= 1) {v.p1 -= 1}\n                    y += Math.sin(twoPi * v.p1 + idx * o2)\n                }\n                y *= 0.5\n    " +
"            // Coupe-bas a deux etages\n                v.h1 += (y - v.h1) * kHp\n                const a = y - v.h1\n                v.h2 += (" +
"a - v.h2) * kHp\n                const b = a - v.h2\n                if (v.attack < 1) {v.attack = Math.min(1, v.attack + attackStep)}\n       " +
"         const out = b * v.amp * v.attack * v.level\n                left += out * v.left\n                right += out * v.right\n            " +
"    v.amp *= v.kAmp\n                v.env *= v.kEnv\n                v.envBend *= v.kBend\n            }\n            const g = this.volume * 2" +
".5 * (1 - this.duck * this.dipSmooth)\n            outL[s] += left * g\n            outR[s] += right * g\n        }\n        if (this.voices.len" +
"gth > 0 && this.voices[0].amp < 0.0003) {this.voices.shift()}\n    }\n}"
const LARSEN: string = "// @label Larsen\n// @param tune    0     -100  100   linear  ct\n// @param rise    1.6   1.05  4     exp\n// @param fall    25    3     400   " +
"exp     ms\n// @param focus   5     1     20    exp\n// @param dark    0.5   0     1     linear\n// @param grit    0.5   0     1     linear\n// " +
"@param drift   4     0     30    linear  ct\n// @param sweep   1     0     3     linear\n// @param slew    70    5     600   exp     ms\n// @pa" +
"ram lowcut  120   40    400   exp     Hz\n// @param volume  0.5   0     1     linear\n\n// Un larsen qu'on dompte. Pas d'oscillateur : une bouc" +
"le de retour (un retard\n// tres court, un filtre, une saturation) qu'on laisse s'emballer tant que la\n// note est tenue. Elle part de presqu" +
"e rien, enfle toute seule jusqu'a\n// saturer, et meurt des qu'on la lache. Une note ne frappe pas : elle monte.\n// - La hauteur de la note d" +
"onne la longueur du retard : c'est le grave sur\n//   lequel la boucle peut chanter. Elle chante un de ses harmoniques.\n// - La VELOCITE ne r" +
"egle pas le volume : elle choisit lequel. 0,30 = le 2e\n//   harmonique ; 0,35 = le 3e ; ... 0,95 = le 15e. Ces notes-la ne sont pas\n//   cel" +
"les du clavier : le 7e et le 11e tombent entre deux touches.\n// - Deux notes qui se chevauchent : la boucle ne repart pas, elle saute d'un\n/" +
"/   harmonique a l'autre, comme un vrai larsen.\n// - \"rise\" : la force du retour. Plus il est fort, plus la note enfle vite ;\n// - \"fall\" : " +
"le temps qu'elle met a mourir une fois lachee ;\n// - \"focus\" : la finesse du filtre. Etroit, un seul harmonique gagne ; large,\n//   plusieur" +
"s se battent ;\n// - \"dark\" : ce que chaque tour de boucle perd en aigus ;\n// - \"grit\" : la durete de la saturation ;\n// - \"drift\" : la haute" +
"ur derive lentement, a peine ;\n// - \"sweep\", \"slew\" : le filtre ne vise pas tout de suite le bon harmonique.\n//   Il part plus bas (\"sweep\"," +
" en octaves) et monte (\"slew\", en ms) : la\n//   boucle saute d un harmonique au suivant, en escalier, avant de se poser.\n//   Entre deux not" +
"es liees, il glisse de la meme facon.\n// Une seule voix, en mono.\nclass Processor {\n    tune = 0\n    rise = 1.6\n    fallMs = 25\n    focus = " +
"5\n    dark = 0.5\n    grit = 0.5\n    drift = 4\n    sweep = 1\n    slewMs = 70\n    lowcut = 120\n    volume = 0.5\n    buf = new Float32Array(409" +
"6)\n    w = 0\n    len = 400\n    fc = 440\n    fcNow = 440\n    held = []\n    gate = false\n    n = 0\n    grain = 0\n    level = 0\n    lp = 0\n    " +
"bp = 0\n    dk = 0\n    hp = [0, 0]\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n" +
"            case \"rise\": this.rise = value; break\n            case \"fall\": this.fallMs = value; break\n            case \"focus\": this.focus =" +
" value; break\n            case \"dark\": this.dark = value; break\n            case \"grit\": this.grit = value; break\n            case \"drift\": " +
"this.drift = value; break\n            case \"sweep\": this.sweep = value; break\n            case \"slew\": this.slewMs = value; break\n          " +
"  case \"lowcut\": this.lowcut = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    viser(note) {\n        " +
"const f = 440 * Math.pow(2, (note.pitch - 69 + this.tune / 100) / 12)\n        this.len = Math.max(8, Math.min(4000, sampleRate / f))\n       " +
" this.fc = f * note.h\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {return}\n        const h = 2 + Math.max(0, Math." +
"min(13, Math.round((velocity - 0.3) / 0.05)))\n        const note = {id, pitch, h}\n        this.held.push(note)\n        this.viser(note)\n    " +
"    // Si la boucle est muette, il lui faut un grain pour partir : toujours le meme\n        if (this.level < 0.0005) {\n            this.buf." +
"fill(0)\n            this.lp = 0; this.bp = 0; this.dk = 0\n            this.grain = 0.02\n            this.fcNow = this.fc * Math.pow(2, -this" +
".sweep)\n        }\n        this.gate = true\n    }\n    noteOff(id) {\n        this.held = this.held.filter(n => n.id !== id)\n        if (this.h" +
"eld.length === 0) {\n            this.gate = false\n        } else {\n            this.viser(this.held[this.held.length - 1])\n        }\n    }\n " +
"   reset() {\n        this.held = []\n        this.gate = false\n        this.level = 0\n        this.buf.fill(0)\n    }\n    process(output, bloc" +
"k) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const k = 1 + 3 * this.grit" +
"\n        const damp = 1 / this.focus\n        const kd = 1 - 0.8 * this.dark\n        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)\n    " +
"    const fallGain = Math.pow(10, -3 * this.len / (this.fallMs * 0.001 * sr))\n        const kSlew = 1 - Math.exp(-1 / (this.slewMs * 0.001 *" +
" 0.35 * sr))\n        const buf = this.buf, hp = this.hp\n        for (let s = block.s0; s < block.s1; s++) {\n            this.n++\n           " +
" if (!this.gate && this.level < 0.00002) {this.level = 0; continue}\n            // La longueur du retard derive un peu ; le filtre de la bou" +
"cle ajoute son propre retard, qu'on retire\n            const wob = 1 + 0.00058 * this.drift * Math.sin(twoPi * 0.31 * this.n / sr)\n         " +
"   const len = this.len * wob - (1 - kd) / kd\n            let pos = this.w - len\n            if (pos < 0) {pos += 4096}\n            const i0" +
" = Math.floor(pos), fr = pos - i0\n            const x = buf[i0] * (1 - fr) + buf[(i0 + 1) & 4095] * fr\n            // Le filtre : il laisse " +
"passer l'harmonique vise, et freine les autres\n            this.fcNow += (this.fc - this.fcNow) * kSlew\n            const g = 2 * Math.sin(M" +
"ath.PI * Math.min(this.fcNow * wob, sr * 0.15) / sr)\n            this.lp += g * this.bp\n            this.bp += g * (x - this.lp - damp * thi" +
"s.bp)\n            let y = this.bp * damp\n            this.dk += (y - this.dk) * kd\n            y = this.dk\n            // Le retour : plus f" +
"ort que 1 tant que la note est tenue, il s'emballe ; la saturation le borne\n            y = Math.tanh(y * (this.gate ? this.rise : fallGain)" +
" * k) / k\n            buf[this.w] = y + this.grain\n            this.grain = 0\n            this.w = (this.w + 1) & 4095\n            const a =" +
" Math.abs(y) * k\n            this.level += (a - this.level) * (a > this.level ? 0.01 : 0.0005)\n            let o = y * k\n            hp[0] +" +
"= (o - hp[0]) * kHp\n            o -= hp[0]\n            hp[1] += (o - hp[1]) * kHp\n            o -= hp[1]\n            o *= this.volume\n      " +
"      outL[s] += o\n            outR[s] += o\n        }\n    }\n}"
const GUIMBARDE: string = "// @label Guimbarde\n// @param tune    0     -100  100   linear  ct\n// @param decay   320   40    3000  exp     ms\n// @param focus   18    3 " +
"    60    exp\n// @param glide   60    2     600   exp     ms\n// @param drone   0.25  0     1     linear\n// @param edge    0.5   0     1     " +
"linear\n// @param drive   0.2   0     1     linear\n// @param lowcut  150   40    500   exp     Hz\n// @param volume  0.5   0     1     linear\n" +
"\n// Une guimbarde : une lame qu'on pince, toujours sur la meme note grave, et\n// une bouche qui choisit ce qu'on en entend. La lame contient" +
" tous les\n// harmoniques de sa note ; la bouche est un filtre tres etroit qui n'en laisse\n// sortir qu'un a la fois. La melodie n'est donc p" +
"as jouee : elle est choisie,\n// dans les harmoniques d'une seule note. Le 7e et le 11e tombent entre deux\n// touches du clavier.\n// - La hau" +
"teur de la note donne la note de la lame (le bourdon).\n// - La VELOCITE ne regle pas le volume : elle dit ou va la bouche. 0,30 = le\n//   3e" +
" harmonique ; 0,35 = le 4e ; ... 0,95 = le 16e.\n// - Chaque note pince la lame de nouveau ; entre deux pincements le son\n//   s'eteint (\"dec" +
"ay\"), et la bouche glisse vers sa nouvelle place (\"glide\") ;\n// - \"focus\" : l'etroitesse de la bouche. Etroite, on n'entend qu'un harmonique" +
",\n//   qui siffle ; large, on entend la lame entiere ;\n// - \"drone\" : ce qu'on laisse entendre de la lame elle-meme, sous le sifflement ;\n//" +
" - \"edge\" : la durete de la lame (ronde ou mordante) ;\n// - \"lowcut\" : coupe le bas, pour laisser le grave au pied et a la basse.\n// Une seu" +
"le voix, en mono.\nclass Processor {\n    tune = 0\n    decayMs = 320\n    focus = 18\n    glideMs = 60\n    drone = 0.25\n    edge = 0.5\n    drive" +
" = 0.2\n    lowcut = 150\n    volume = 0.5\n    freq = 55\n    ph = 0\n    env = 0\n    att = 0\n    fcNow = 330\n    fcTo = 330\n    comp = 1\n    f " +
"= [0, 0, 0, 0]\n    hp = [0, 0]\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n   " +
"         case \"decay\": this.decayMs = value; break\n            case \"focus\": this.focus = value; break\n            case \"glide\": this.glideM" +
"s = value; break\n            case \"drone\": this.drone = value; break\n            case \"edge\": this.edge = value; break\n            case \"dri" +
"ve\": this.drive = value; break\n            case \"lowcut\": this.lowcut = value; break\n            case \"volume\": this.volume = value; break\n " +
"       }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {return}\n        const h = 3 + Math.max(0, Math.min(13, Math." +
"round((velocity - 0.3) / 0.05)))\n        this.freq = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)\n        this.fcTo = thi" +
"s.freq * h\n        // Un harmonique haut est plus faible dans la lame : on le remonte un peu\n        this.comp = Math.pow(h / 6, 0.7)\n      " +
"  // La premiere fois, la bouche est deja en place\n        if (this.env < 0.001) {this.fcNow = this.fcTo; this.ph = 0}\n        this.env = 1\n" +
"        this.att = 0\n    }\n    noteOff(id) {}\n    reset() {\n        this.env = 0\n    }\n    blep(p, dt) {\n        if (p < dt) {const u = p / " +
"dt; return u + u - u * u - 1}\n        if (p > 1 - dt) {const u = (p - 1) / dt; return u * u + u + u + 1}\n        return 0\n    }\n    process(" +
"output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kDec = Ma" +
"th.exp(-1 / (this.decayMs * 0.001 * 0.33 * sr))\n        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))\n        const k" +
"Hp = 1 - Math.exp(-twoPi * this.lowcut / sr)\n        const damp = 1 / this.focus\n        const rise = 0.002 * sr\n        const push = 1 + 4 " +
"* this.drive\n        const f = this.f, hp = this.hp\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.env < 0.0003) {" +
"this.env = 0; continue}\n            this.env *= kDec\n            this.fcNow += (this.fcTo - this.fcNow) * kGlide\n            // La lame : un" +
"e dent de scie, plus ou moins mordante\n            const dt = this.freq / sr\n            let p = this.ph + dt\n            if (p >= 1) {p -= " +
"1}\n            this.ph = p\n            let x = 2 * p - 1 - this.blep(p, dt)\n            if (this.edge > 0) {\n                let q = p + 0.1" +
"2\n                if (q >= 1) {q -= 1}\n                x = x * (1 - this.edge) + (x - (2 * q - 1 - this.blep(q, dt))) * this.edge\n          " +
"  }\n            // La bouche : deux filtres etroits a la suite, au meme endroit\n            const g = 2 * Math.sin(Math.PI * Math.min(this.f" +
"cNow, sr * 0.12) / sr)\n            f[0] += g * f[1]\n            f[1] += g * (x - f[0] - damp * f[1])\n            const m1 = f[1] * damp\n    " +
"        f[2] += g * f[3]\n            f[3] += g * (m1 - f[2] - damp * f[3])\n            const m2 = f[3] * damp\n            let y = (m2 * 3 * " +
"this.comp + x * 0.3 * this.drone) * this.env * Math.min(1, this.att / rise)\n            this.att++\n            y = Math.tanh(y * push) / pus" +
"h\n            hp[0] += (y - hp[0]) * kHp\n            y -= hp[0]\n            hp[1] += (y - hp[1]) * kHp\n            y -= hp[1]\n            y " +
"*= this.volume * 2\n            outL[s] += y\n            outR[s] += y\n        }\n    }\n}"
const REVERS: string = "// @label Revers\n// @param tune    0     -100  100   linear  ct\n// @param pas     118   60    300   exp     ms\n// @param long    3     0.5  " +
" 8     linear\n// @param curve   0.35  0.1   1     linear\n// @param metal   0.6   0     1     linear\n// @param bright  0.5   0     1     line" +
"ar\n// @param bend    3     0     12    linear  st\n// @param tail    6     1     80    exp     ms\n// @param drive   0.2   0     1     linear\n" +
"// @param lowcut  120   40    400   exp     Hz\n// @param volume  0.5   0     1     linear\n\n// Du metal joue a l'envers. Une note ne part pas" +
" d'un coup pour s'eteindre :\n// elle sort du silence, enfle, s'eclaircit, et s'arrete net. Ce qui serait la\n// fin d'un coup de metal en dev" +
"ient le debut ; le coup lui-meme arrive en\n// dernier. La note aspire vers l'instant ou elle s'arrete.\n// - On ecrit la note AVANT l'instant" +
" vise : elle s'arrete \"long\" pas apres son\n//   debut (\"pas\" = la duree d'une double-croche, en ms). Pour qu'elle finisse\n//   sur un temps," +
" on la pose \"long\" pas avant ce temps. La fin de la note\n//   ecrite est ignoree.\n// - \"curve\" : la forme de la montee. Petit, elle reste lo" +
"ngtemps presque\n//   muette puis surgit ; grand, elle monte tout du long ;\n// - \"metal\" : a 0 les partiels sont justes ; a 1 ce sont ceux d'" +
"une barre de\n//   metal, faux entre eux ;\n// - \"bright\" : la force des partiels du haut. Ils arrivent les derniers : le\n//   son s'eclaircit" +
" en approchant de la fin ;\n// - \"bend\" : la hauteur monte juste avant l'arret, en demi-tons ;\n// - \"tail\" : le temps de l'arret (quelques mi" +
"llisecondes : net) ;\n// - la velocite regle la force et la clarte.\n// Trois voix, en mono.\nclass Processor {\n    tune = 0\n    pasMs = 118\n  " +
"  long = 3\n    curve = 0.35\n    metal = 0.6\n    bright = 0.5\n    bend = 3\n    tailMs = 6\n    drive = 0.2\n    lowcut = 120\n    volume = 0.5\n " +
"   voices = [0, 1, 2].map(() => ({on: false, f: 220, t: 0, total: 1, vel: 0, cut: 1, order: 0, p: [0, 0, 0, 0], r: [1, 2, 3, 4], a: [1, 0, 0" +
", 0]}))\n    count = 0\n    hp = [0, 0]\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; br" +
"eak\n            case \"pas\": this.pasMs = value; break\n            case \"long\": this.long = value; break\n            case \"curve\": this.curve" +
" = value; break\n            case \"metal\": this.metal = value; break\n            case \"bright\": this.bright = value; break\n            case \"" +
"bend\": this.bend = value; break\n            case \"tail\": this.tailMs = value; break\n            case \"drive\": this.drive = value; break\n    " +
"        case \"lowcut\": this.lowcut = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, ve" +
"locity, cent, id) {\n        if (pitch < 24) {return}\n        let v = null\n        for (const w of this.voices) {\n            if (!w.on) {v =" +
" w; break}\n            if (v === null || w.order < v.order) {v = w}\n        }\n        const m = this.metal\n        v.on = true\n        v.f =" +
" 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)\n        v.t = 0\n        v.total = Math.max(64, Math.round(this.long * this." +
"pasMs * 0.001 * sampleRate))\n        v.vel = velocity\n        v.cut = 1\n        v.order = ++this.count\n        v.r[0] = 1\n        v.r[1] = 2" +
" + 0.756 * m\n        v.r[2] = 3 + 2.404 * m\n        v.r[3] = 4 + 4.933 * m\n        const clair = this.bright * (0.4 + 0.8 * velocity)\n      " +
"  v.a[0] = 1\n        v.a[1] = 0.6 * clair\n        v.a[2] = 0.4 * clair\n        v.a[3] = 0.25 * clair\n        for (let i = 0; i < 4; i++) {\n " +
"           v.p[i] = 0\n            // Rien au-dessus de 5 kHz\n            if (v.f * v.r[i] > 5000) {v.a[i] = 0}\n        }\n    }\n    noteOff(i" +
"d) {}\n    reset() {\n        for (const v of this.voices) {v.on = false}\n    }\n    process(output, block) {\n        const [outL, outR] = outp" +
"ut\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kTail = Math.exp(-1 / (this.tailMs * 0.001 * 0.3 * sr))\n   " +
"     const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)\n        const push = 1 + 4 * this.drive\n        const bendTau = 0.03 * sr\n        c" +
"onst hp = this.hp\n        for (let s = block.s0; s < block.s1; s++) {\n            let x = 0\n            let any = false\n            for (con" +
"st v of this.voices) {\n                if (!v.on) {continue}\n                any = true\n                // Ce qui reste avant l'arret : tout" +
" en depend\n                const left = v.total - v.t\n                if (left <= 0) {\n                    v.cut *= kTail\n                  " +
"  if (v.cut < 0.0003) {v.on = false; continue}\n                }\n                const rest = Math.max(0, left)\n                const base =" +
" v.f * Math.pow(2, this.bend / 12 * Math.exp(-rest / bendTau)) / sr\n                let y = 0\n                for (let i = 0; i < 4; i++) {\n" +
"                    if (v.a[i] === 0) {continue}\n                    v.p[i] += base * v.r[i]\n                    if (v.p[i] >= 1) {v.p[i] -=" +
" 1}\n                    // Un partiel haut arrive plus tard qu'un partiel bas\n                    const tau = v.total * this.curve / (1 + 0." +
"9 * i)\n                    y += Math.sin(twoPi * v.p[i]) * v.a[i] * Math.exp(-rest / tau)\n                }\n                x += y * v.cut *" +
" (0.3 + 0.7 * v.vel) * 0.4\n                v.t++\n            }\n            if (!any && Math.abs(hp[0]) < 0.00001) {continue}\n            let" +
" o = Math.tanh(x * push) / push\n            hp[0] += (o - hp[0]) * kHp\n            o -= hp[0]\n            hp[1] += (o - hp[1]) * kHp\n       " +
"     o -= hp[1]\n            o *= this.volume * 2\n            outL[s] += o\n            outR[s] += o\n        }\n    }\n}"

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

const project = openDAW.newProject("Banc - trois timbres")
project.bpm = BPM

const SECTIONS = [
    {name: "1 Larsen", start: 0, bars: 24},
    {name: "2 Guimbarde", start: 24, bars: 24},
    {name: "3 Revers", start: 48, bars: 24}
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

// ---------- La machine : la meme pour les trois ----------
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 55, start: 360, sweep: 46, decay: 165, punch: 0.6, click: 0.45, drive: 0.4})
build(kick.noteTracks[0], "Frappe", () => [0, 4, 8, 12].map(step => ({position: step * S16, duration: S16, pitch: 36, velocity: 0.95})))

const LA1 = 33
const bass = apparat("Roulante", ROULANTE, -2)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar =>
    (bar % 2 === 0 ? [3, 6, 11, 14] : [3, 6, 10, 14]).map((step, k) => ({position: step * S16, duration: S16, pitch: LA1, velocity: k === 0 ? 0.65 : 0.8})))

const ticks = apparat("Tics", GRESIL, -3)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
build(ticks.noteTracks[0], "Tics", () => [2, 6, 10, 14].map(step => ({position: step * S16, duration: S16 / 2, pitch: 84, velocity: 0.85})))

// ---------- Le dosage : le meme pour les trois ----------
/** La mesure dans les 24 du candidat. */
const local = (bar: number) => bar % 24
/** 0 = absence ; 1 = parcimonie ; 2 = arrivee ; 3 = charge. */
const dose = (bar: number): number => local(bar) < 4 ? 0 : local(bar) < 12 ? 1 : local(bar) < 20 ? 2 : 3

// ---------- 1. Larsen ----------
// Le retard est accorde sur le La grave (55 Hz) ; la velocite choisit
// l harmonique qui chante. Chaque note : [pas de depart, longueur en pas,
// harmonique]. Une note enfle pendant un pas environ, tient, et s arrete net :
// la plupart finissent pile sur un coup de pied, qui les coupe.
// 6 = Mi ; 7 = un Sol trop bas ; 8 = La ; 9 = Si ; 10 = un Do diese trop bas ;
// 11 = entre Re et Re diese.
type Souffle = number[][]
const L_RARE: {[bar: number]: Souffle} = {4: [[5, 3, 7]], 6: [[13, 3, 9]], 8: [[5, 3, 7]], 9: [[9, 3, 6]], 10: [[13, 3, 11]]}
// Trois mesures qui tournent dans un bloc de huit : la phrase ne retombe pas sur ses pieds
const L_PHRASE: Souffle[] = [
    [[5, 3, 7], [13, 3, 9]],
    [[1, 3, 6], [9, 3, 11]],
    [[5, 7, 10]]
]
const L_CHARGE: Souffle[] = [
    [[5, 3, 7], [9, 3, 10], [13, 3, 9]],
    [[1, 3, 6], [5, 3, 11], [13, 3, 7]],
    [[1, 3, 9], [5, 7, 10], [13, 3, 6]],
    [[1, 3, 7], [5, 3, 11], [9, 3, 9], [13, 3, 8]]
]
const hLarsen = (h: number) => 0.3 + 0.05 * (h - 2)
const larsen = apparat("1 Larsen", LARSEN, -12)
reglages("larsen", larsen, {
    tune: 0, rise: 3.5, fall: 22, focus: 2.5, dark: 0.6, grit: 0.8, drift: 5, sweep: 1, slew: 90, lowcut: 130
})
build(larsen.noteTracks[0], "Larsen", bar => {
    if (bar >= 24) {return []}
    const d = dose(bar), b = local(bar)
    const notes: Souffle = d === 0 ? [] : d === 1 ? (L_RARE[b] ?? []) : d === 2 ? L_PHRASE[(b - 12) % 3] : L_CHARGE[b - 20]
    return notes.map(n => ({position: n[0] * S16, duration: n[1] * S16 - 20, pitch: LA1, velocity: hLarsen(n[2])}))
})

// ---------- 2. Guimbarde ----------
// La lame reste sur le La grave. Chaque pincement deplace la bouche : la suite
// des harmoniques (sept) ne suit pas la suite des pincements, qui ne suit pas
// la mesure. Les pincements evitent les coups de pied.
const BOUCHES = [6, 7, 9, 7, 11, 8, 10]
const hGuimbarde = (h: number) => 0.3 + 0.05 * (h - 3)
const G_RARE: {[bar: number]: number[]} = {4: [3], 5: [10], 6: [6], 7: [13], 8: [3, 10], 9: [6], 10: [13, 3], 11: [10]}
const guimbarde = apparat("2 Guimbarde", GUIMBARDE, -1)
reglages("guimbarde", guimbarde, {
    tune: 0, decay: 300, focus: 18, glide: 50, drone: 0.25, edge: 0.5, drive: 0.25, lowcut: 150
})
/** Les pas pinces d une mesure, selon la dose. */
function pinces(bar: number): number[] {
    const d = dose(bar), b = local(bar)
    if (d === 0) {return []}
    if (d === 1) {return (G_RARE[b] ?? []).slice().sort((p, q) => p - q)}
    const out: number[] = []
    for (let step = 0; step < 16; step++) {
        if (step % 4 === 0) {continue}
        const t = b * 16 + step
        // Un pincement tous les cinq pas ; dans les quatre dernieres mesures, deux
        if (t % 5 === 2 || (d === 3 && t % 5 === 4)) {out.push(step)}
    }
    return out
}
// Le rang de chaque pincement dans le candidat, pour lire la suite des bouches sans rupture
const rangPince: {[cle: string]: number} = {}
{
    let k = 0
    for (let bar = 24; bar < 48; bar++) {for (const step of pinces(bar)) {rangPince[bar + ":" + step] = k++}}
}
build(guimbarde.noteTracks[0], "Guimbarde", bar => {
    if (bar < 24 || bar >= 48) {return []}
    return pinces(bar).map(step => ({
        position: step * S16, duration: S16, pitch: LA1, velocity: hGuimbarde(BOUCHES[rangPince[bar + ":" + step] % 7])
    }))
})

// ---------- 3. Revers ----------
// Une note finit "long" pas apres son debut : on l ecrit donc trois pas avant
// l instant vise. Chaque note : [pas ou elle FINIT, note]. Elles finissent sur
// les temps 2 et 4, ou juste apres.
// Quatre notes, aucune n est la tonique ni sa quinte : Fa, Do, Re, Sol.
const FA3 = 53, DO4 = 60, RE3 = 50, SOL3 = 55
const LONG = 3
type Fins = number[][]
const R_RARE: {[bar: number]: Fins} = {4: [[12, FA3]], 6: [[4, DO4]], 8: [[12, RE3]], 10: [[6, SOL3]], 11: [[14, FA3]]}
const R_PHRASE: Fins[] = [
    [[4, FA3], [14, DO4]],
    [[8, RE3], [12, FA3]],
    [[6, SOL3]]
]
const R_CHARGE: Fins[] = [
    [[4, FA3], [10, DO4], [14, RE3]],
    [[6, SOL3], [12, FA3]],
    [[4, DO4], [8, RE3], [14, SOL3]],
    [[4, FA3], [8, DO4], [12, RE3], [15, FA3]]
]
const revers = apparat("3 Revers", REVERS, 0)
reglages("revers", revers, {
    tune: 0, pas: PAS_MS, long: LONG, curve: 0.3, metal: 0.6, bright: 0.6, bend: 2, tail: 6, drive: 0.25, lowcut: 120
})
build(revers.noteTracks[0], "Revers", bar => {
    if (bar < 48) {return []}
    const d = dose(bar), b = local(bar)
    const fins: Fins = d === 0 ? [] : d === 1 ? (R_RARE[b] ?? []) : d === 2 ? R_PHRASE[(b - 12) % 3] : R_CHARGE[b - 20]
    // Toutes ces notes finissent au pas 4 ou plus tard : elles commencent dans la meme mesure
    return fins.map(f => ({position: (f[0] - LONG) * S16, duration: S16, pitch: f[1], velocity: 0.8}))
})

// Limiteur de sortie, comme dans les morceaux
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu ----------
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, ticks, larsen, guimbarde, revers]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Tics", ticks], ["Larsen", larsen],
    ["Guimbarde", guimbarde], ["Revers", revers]]
if (MESURER) {
    const parts = [["L absent", 0, 4], ["L rare", 4, 12], ["L arrive", 12, 20], ["L charge", 20, 24],
        ["G absent", 24, 28], ["G rare", 28, 36], ["G arrive", 36, 44], ["G charge", 44, 48],
        ["R absent", 48, 52], ["R rare", 52, 60], ["R arrive", 60, 68], ["R charge", 68, 72]]
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
        // Les memes mesures que sur les references, sur l arrivee du premier candidat (mesures 12 a 20)
        const from = Math.floor(12 * barSec * rate), to = Math.min(n, Math.floor(20 * barSec * rate))
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
                line += " || mesures 12-20 : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
