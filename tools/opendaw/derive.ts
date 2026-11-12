// DERIVE - Beat Survivor, mode Survie
// Acid hypnotique - 126 BPM - Fa diese phrygien - 160 mesures (5 min 05)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// derive.src.ts (le morceau) et des instruments du dossier apparat/.
//
// L'idee : deux voix acid jouent la meme boucle. La premiere la joue sur 16
// pas ; la seconde saute le dernier pas, qui est un silence, et la joue sur
// 15. Elles partent ensemble, puis la seconde prend un pas d'avance a chaque
// mesure : l'unisson devient un echo, l'echo un canon, le canon un tissu ou
// l'on ne sait plus qui joue quoi. Au bout de quinze mesures elles se
// retrouvent. A chaque drop elles repartent ensemble, comme une seule voix.
// C'est le dephasage des musiques repetitives, pose sur un pied de techno :
// rien ne change et tout bouge, de quoi laisser l'esprit se perdre.
//
// Pendant la derive, la boucle elle-meme glisse : toutes les huit mesures une
// de ses notes change, pour les deux voix. Avant le dernier drop, elle
// revient a sa forme de depart.
//
// Ce qui vient de la chaine Dash Glitch (vault, Concepts/Musique) : la voix
// acid a accent dont la velocite porte la couleur de chaque note (Venin), la
// basse en deux chemins aux durees comptees en pas (Roulante), un hasard a
// graine fixe, donc rejouable, et un instrument neuf : Gresil, des
// percussions seches faites de trois sinusoides en cascade, sans bruit blanc.
// D'Underdog : blocs de 16 mesures, arrangement par soustraction, un bloc qui
// demarre sans sa basse, un seul jeu de boucles inegales (16 contre 15).
//
// Aucun souffle, aucune nappe : les creux tiennent par les deux voix seules.
// Pour le jeu : avant chaque drop, le dernier temps est vide et rien n'enfle.
//
// Instruments : Frappe (grosse caisse), Roulante (basse), Venin (les deux voix
// acid), Gresil (tics et tocs) et Lueur (le gong) sont ecrits pour ces
// morceaux (Apparat = instrument scriptable d'openDAW). Rim, clap, ride : TR-909.

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 160
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : la basse compte en pas. */
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
const VENIN: string = "// @label Venin\n// @param cutoff  300   60    4000  exp     Hz\n// @param reso    0.75  0     1     linear\n// @param envmod  2.5   0     5   " +
"  linear\n// @param decay   340   60    2000  exp     ms\n// @param accent  0.7   0     1     linear\n// @param tint    1.2   0     3     linea" +
"r\n// @param glide   90    5     400   exp     ms\n// @param shape   0     0     1     linear\n// @param drive   0.4   0     1     linear\n// @p" +
"aram lowcut  180   40    600   exp     Hz\n// @param tonic   43    24    72    linear\n// @param just    1     0     1     linear\n// @param du" +
"ck    0.3   0     1     linear\n// @param volume  0.6   0     1     linear\n\n// La voix acid. Une seule voix, une dent de scie (\"shape\" a 0) o" +
"u un carre\n// (a 1) dans un filtre passe-bas a quatre poles tres resonant, puis une\n// saturation, puis un coupe-bas (\"lowcut\") : le grave r" +
"este au pied et a la\n// basse. Ce qui fait l'acid, c'est l'articulation, ecrite dans les notes :\n// - deux notes qui se chevauchent sont lie" +
"es : la hauteur glisse (\"glide\")\n//   et les enveloppes ne repartent pas ;\n// - une note de velocite 0,9 ou plus est accentuee : une envelop" +
"pe breve\n//   frappe ensemble le filtre, la resonance, la saturation et le volume\n//   (\"accent\" = sa force). Des accents qui se suivent s'a" +
"dditionnent ;\n// - la velocite porte aussi la couleur de la note : de 0,5 a 0,85 (ou de 0,9\n//   a 1 pour une note accentuee), elle ouvre ou" +
" ferme le filtre de \"tint\"\n//   octaves autour de \"cutoff\". Le timbre change a chaque pas sans qu'aucun\n//   bouton ne bouge ; le volume, lu" +
"i, ne depend pas de la velocite.\n// L'enveloppe du filtre (\"envmod\" octaves, \"decay\" ms) est deux fois plus\n// courte sur une note accentuee" +
".\n// \"tonic\" et \"just\" : accord sur les harmoniques naturels de la tonique.\n// \"duck\" : toute note plus grave que 24 ne sonne pas, elle fait" +
" plonger le son.\nclass Processor {\n    cutoff = 300\n    reso = 0.75\n    envmod = 2.5\n    decayMs = 340\n    accent = 0.7\n    tint = 1.2\n    g" +
"lideMs = 90\n    shape = 0\n    drive = 0.4\n    lowcut = 180\n    tonic = 43\n    just = 1\n    duck = 0.3\n    volume = 0.6\n    held = []\n    fre" +
"q = 110\n    target = 110\n    phase = 0\n    gate = false\n    amp = 0\n    envFilter = 0\n    kFilter = 0.999\n    envAccent = 0\n    color = 0\n  " +
"  colorSmooth = 0\n    y1 = 0\n    y2 = 0\n    y3 = 0\n    y4 = 0\n    last = 0\n    hp1 = 0\n    hp2 = 0\n    g = 0.05\n    k = 2\n    push = 1\n    t" +
"ick = 0\n    dip = 0\n    dipSmooth = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"cutoff\": this.cutoff = value" +
"; break\n            case \"reso\": this.reso = value; break\n            case \"envmod\": this.envmod = value; break\n            case \"decay\": th" +
"is.decayMs = value; break\n            case \"accent\": this.accent = value; break\n            case \"tint\": this.tint = value; break\n          " +
"  case \"glide\": this.glideMs = value; break\n            case \"shape\": this.shape = value; break\n            case \"drive\": this.drive = value" +
"; break\n            case \"lowcut\": this.lowcut = value; break\n            case \"tonic\": this.tonic = value; break\n            case \"just\": t" +
"his.just = value; break\n            case \"duck\": this.duck = value; break\n            case \"volume\": this.volume = value; break\n        }\n  " +
"  }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {\n            this.dip = 1\n            return\n        }\n        const sr" +
" = sampleRate\n        const JUST = [0, 0, 3.91, 0, -13.69, 0, -48.68, 1.96, 0, -59.47, -31.17, 0]\n        const degree = (((Math.round(pitch" +
") - Math.round(this.tonic)) % 12) + 12) % 12\n        const freq = 440 * Math.pow(2, (pitch - 69 + (cent + JUST[degree] * this.just) / 100) /" +
" 12)\n        const accented = velocity >= 0.9\n        const c = accented ? (velocity - 0.9) / 0.1 : (velocity - 0.5) / 0.35\n        this.col" +
"or = Math.max(0, Math.min(1, c)) - 0.5\n        const legato = this.held.length > 0\n        this.held.push({id, freq})\n        this.target = " +
"freq\n        if (!legato) {\n            // Une note detachee repart d'un etat connu : meme phase, memes enveloppes\n            this.freq = f" +
"req\n            this.phase = 0\n            this.envFilter = 1\n            this.kFilter = Math.exp(-1 / (this.decayMs * 0.001 * (accented ? 0" +
".5 : 1) * sr))\n            this.colorSmooth = this.color\n        }\n        if (accented) {this.envAccent += (1 - this.envAccent) * 0.75}\n   " +
"     this.gate = true\n    }\n    noteOff(id) {\n        this.held = this.held.filter(n => n.id !== id)\n        if (this.held.length === 0) {\n " +
"           this.gate = false\n        } else {\n            this.target = this.held[this.held.length - 1].freq\n        }\n    }\n    reset() {\n " +
"       this.held = []\n        this.gate = false\n        this.amp = 0\n        this.envFilter = 0\n        this.envAccent = 0\n        this.y1 =" +
" 0\n        this.y2 = 0\n        this.y3 = 0\n        this.y4 = 0\n        this.dip = 0\n        this.dipSmooth = 0\n    }\n    process(output, blo" +
"ck) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.3" +
"5 * sr))\n        const kAccent = Math.exp(-1 / (0.090 * sr))\n        const kUp = 1 - Math.exp(-1 / (0.002 * sr))\n        const kDown = 1 - M" +
"ath.exp(-1 / (0.008 * sr))\n        const kColor = 1 - Math.exp(-1 / (0.004 * sr))\n        const kDip = Math.exp(-1 / (0.110 * sr))\n        c" +
"onst kSmooth = 1 - Math.exp(-1 / (0.003 * sr))\n        const kHp = 1 - Math.exp(-2 * Math.PI * this.lowcut / sr)\n        const shape = this." +
"shape\n        for (let s = block.s0; s < block.s1; s++) {\n            this.dip *= kDip\n            this.dipSmooth += (this.dip - this.dipSmo" +
"oth) * kSmooth\n            this.amp += ((this.gate ? 1 : 0) - this.amp) * (this.gate ? kUp : kDown)\n            if (this.amp < 0.0002 && !th" +
"is.gate) {\n                this.envAccent *= kAccent\n                continue\n            }\n            this.freq += (this.target - this.fre" +
"q) * kGlide\n            const dt = this.freq / sr\n            let p = this.phase + dt\n            if (p >= 1) {p -= 1}\n            this.phas" +
"e = p\n            // Dent de scie et carre, la marche arrondie (pas de repliement)\n            let saw = 2 * p - 1\n            if (p < dt) {" +
"const t = p / dt; saw -= t + t - t * t - 1}\n            else if (p > 1 - dt) {const t = (p - 1) / dt; saw -= t * t + t + t + 1}\n            " +
"let x = saw\n            if (shape > 0) {\n                let q = p + 0.5\n                if (q >= 1) {q -= 1}\n                let saw2 = 2 *" +
" q - 1\n                if (q < dt) {const t = q / dt; saw2 -= t + t - t * t - 1}\n                else if (q > 1 - dt) {const t = (q - 1) / d" +
"t; saw2 -= t * t + t + t + 1}\n                x = saw * (1 - shape) + (saw - saw2) * shape\n            }\n            // Les reglages du filt" +
"re, recalcules toutes les 8 notes d'horloge\n            this.colorSmooth += (this.color - this.colorSmooth) * kColor\n            if ((this.t" +
"ick++ & 7) === 0) {\n                const acc = this.accent * this.envAccent\n                const octaves = this.colorSmooth * this.tint + " +
"this.envmod * this.envFilter + 2 * acc\n                const fc = Math.min(this.cutoff * Math.pow(2, octaves), sr * 0.3)\n                thi" +
"s.g = 1 - Math.exp(-Math.PI * fc / sr)\n                this.k = 3.9 * Math.min(1, this.reso + 0.15 * acc)\n                this.push = 1 + 5 " +
"* Math.min(1, this.drive + 0.5 * acc)\n            }\n            // Echelle a quatre poles, calculee deux fois par echantillon\n            co" +
"nst g = this.g\n            const k = this.k\n            const mid = (x + this.last) * 0.5\n            this.last = x\n            let u = Math" +
".tanh(mid * 0.7 - k * this.y4)\n            this.y1 += g * (u - this.y1)\n            this.y2 += g * (this.y1 - this.y2)\n            this.y3 +" +
"= g * (this.y2 - this.y3)\n            this.y4 += g * (this.y3 - this.y4)\n            u = Math.tanh(x * 0.7 - k * this.y4)\n            this.y" +
"1 += g * (u - this.y1)\n            this.y2 += g * (this.y1 - this.y2)\n            this.y3 += g * (this.y2 - this.y3)\n            this.y4 += " +
"g * (this.y3 - this.y4)\n            // La resonance mange le grave : on le rend, puis on sature\n            let y = this.y4 * (1 + 0.6 * k)\n" +
"            y = Math.tanh(y * this.push) / Math.sqrt(this.push)\n            // Coupe-bas a deux etages\n            this.hp1 += (y - this.hp1" +
") * kHp\n            const h1 = y - this.hp1\n            this.hp2 += (h1 - this.hp2) * kHp\n            const h2 = h1 - this.hp2\n            c" +
"onst a = this.amp * this.volume * (1 + 0.5 * this.accent * this.envAccent) * (1 - this.duck * this.dipSmooth)\n            const out = h2 * a" +
"\n            outL[s] += out\n            outR[s] += out\n            this.envFilter *= this.kFilter\n            this.envAccent *= kAccent\n    " +
"    }\n    }\n}"
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
const LUEUR: string = "// @label Lueur\n// @param decay   260   30    4000  exp     ms\n// @param matter  0.25  0     1     linear\n// @param strike  0.5   0     1   " +
"  linear\n// @param damp    0.5   0     1     linear\n// @param chirp   0     0     24    linear  st\n// @param grain   0.3   0     1     linea" +
"r\n// @param tonic   43    24    72    linear\n// @param just    1     0     1     linear\n// @param drift   0.4   0     1     linear\n// @param" +
" duck    0.3   0     1     linear\n// @param width   0.5   0     1     linear\n// @param drive   0.2   0     1     linear\n// @param volume  0." +
"6   0     1     linear\n\n// Une percussion qui chante. Pas d'oscillateur : un coup tres bref (un clic et\n// une pincee de bruit, \"grain\") fra" +
"ppe six resonateurs accordes, et ce sont\n// eux qui donnent la note. C'est le principe d'une lame, d'un verre ou d'une\n// cloche : la hauteu" +
"r vient de l'objet, le coup ne donne que le grain.\n// - \"matter\" change la matiere : a 0 les six resonateurs sont en rapports\n//   entiers (" +
"corde, verre), a 1 ce sont ceux d'une lame libre (bois, metal),\n//   entre les deux une cloche ;\n// - \"strike\" : la durete du coup. Un coup " +
"dur reveille les resonateurs aigus ;\n// - \"damp\" : a quel point les aigus s'eteignent plus vite que le grave ;\n// - \"chirp\" : la note part p" +
"lus haut et retombe en 12 ms (une peau frappee) ;\n// - \"tonic\" et \"just\" : les notes sont accordees sur les harmoniques naturels\n//   de la " +
"tonique (9/8, 5/4, 11/8, 3/2, 13/8, 7/4) et non sur le clavier\n//   tempere. \"just\" a 0 rend le clavier ordinaire ;\n// - \"drift\" : deux coup" +
"s de suite ne sont jamais identiques (matiere, durete\n//   et grain bougent un peu, sur une horloge lente) ;\n// Comme sur un instrument, un " +
"coup plus fort est plus clair et plus long.\n// \"duck\" : toute note plus grave que 24 ne sonne pas, elle fait plonger le son.\nclass Processor" +
" {\n    decayMs = 260\n    matter = 0.25\n    strike = 0.5\n    damp = 0.5\n    chirp = 0\n    grain = 0.3\n    tonic = 43\n    just = 1\n    drift =" +
" 0.4\n    duck = 0.3\n    width = 0.5\n    drive = 0.2\n    volume = 0.6\n    voices = []\n    count = 0\n    lfo = 0\n    dip = 0\n    dipSmooth = 0" +
"\n    paramChanged(name, value) {\n        switch (name) {\n            case \"decay\": this.decayMs = value; break\n            case \"matter\": th" +
"is.matter = value; break\n            case \"strike\": this.strike = value; break\n            case \"damp\": this.damp = value; break\n           " +
" case \"chirp\": this.chirp = value; break\n            case \"grain\": this.grain = value; break\n            case \"tonic\": this.tonic = value; b" +
"reak\n            case \"just\": this.just = value; break\n            case \"drift\": this.drift = value; break\n            case \"duck\": this.duc" +
"k = value; break\n            case \"width\": this.width = value; break\n            case \"drive\": this.drive = value; break\n            case \"v" +
"olume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {\n            this.dip = " +
"1\n            return\n        }\n        const sr = sampleRate\n        this.count++\n        // L'ecart, en cents, entre le clavier tempere et " +
"les harmoniques de la tonique\n        const JUST = [0, 0, 3.91, 0, -13.69, 0, -48.68, 1.96, 0, -59.47, -31.17, 0]\n        const degree = (((" +
"Math.round(pitch) - Math.round(this.tonic)) % 12) + 12) % 12\n        const f0 = 440 * Math.pow(2, (pitch - 69 + (cent + JUST[degree] * this." +
"just) / 100) / 12)\n        const sway = Math.sin(2 * Math.PI * this.lfo)\n        const tick = this.count % 2 === 0 ? 1 : -1\n        const cl" +
"amp = (v) => Math.max(0, Math.min(1, v))\n        const matter = clamp(this.matter + this.drift * (0.05 * tick + 0.07 * sway))\n        const " +
"bright = clamp(this.strike * (0.5 + 0.7 * velocity) + this.drift * 0.08 * sway)\n        // Rapports entiers (corde, verre) et rapports d'une" +
" lame libre (bois, metal)\n        const H = [1, 2, 3, 4, 5, 6]\n        const B = [1, 2.756, 5.404, 8.933, 13.344, 18.64]\n        const tau =" +
" this.decayMs * 0.001 * (0.5 + 0.7 * velocity)\n        const modes = []\n        let norm = 0\n        for (let k = 0; k < 6; k++) {\n         " +
"   const ratio = H[k] + (B[k] - H[k]) * matter\n            const f = f0 * ratio\n            if (f > sr * 0.42) {continue}\n            const " +
"gain = Math.pow(ratio, -(2.6 - 2.2 * bright))\n            const t = tau / Math.pow(ratio, 0.3 + 1.5 * this.damp)\n            const w = 2 * M" +
"ath.PI * f / sr\n            modes.push({w, c: Math.cos(w), s: Math.sin(w), r: Math.exp(-1 / (Math.max(0.004, t) * sr)), gain, re: 0, im: 0})" +
"\n            norm += gain\n        }\n        if (modes.length === 0) {return}\n        if (this.voices.length >= 8) {this.voices.shift()}\n    " +
"    const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width\n        const angle = (1 + place * 0.6) * Math.PI / 4\n        thi" +
"s.voices.push({\n            modes, norm: 1 / norm, age: 0, life: Math.round(7 * tau * sr),\n            level: 0.3 + 0.7 * velocity,\n        " +
"    // Le coup : un clic, puis 1,5 ms de bruit. La graine du bruit bouge avec \"drift\".\n            burst: Math.round(0.0015 * sr), seed: (97" +
"531 + (this.drift > 0 ? this.count * 7919 : 0)) >>> 0,\n            bend: Math.pow(2, this.chirp / 12) - 1, envBend: this.chirp > 0 ? 1 : 0, " +
"kBend: Math.exp(-1 / (0.012 * sr)),\n            left: Math.cos(angle), right: Math.sin(angle)\n        })\n    }\n    noteOff(id) {\n    }\n    r" +
"eset() {\n        this.voices = []\n        this.dip = 0\n        this.dipSmooth = 0\n    }\n    process(output, block) {\n        const [outL, ou" +
"tR] = output\n        const sr = sampleRate\n        this.lfo += 0.05 * (block.s1 - block.s0) / sr\n        if (this.lfo >= 1) {this.lfo -= 1}\n" +
"        const kDip = Math.exp(-1 / (0.110 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))\n        const g = 1 + 4 * this.driv" +
"e\n        const grain = this.grain\n        for (let s = block.s0; s < block.s1; s++) {\n            this.dip *= kDip\n            this.dipSmoo" +
"th += (this.dip - this.dipSmooth) * kSmooth\n            let left = 0, right = 0\n            for (const v of this.voices) {\n                /" +
"/ Le coup qui frappe les resonateurs\n                let x = v.age === 0 ? 1 - 0.5 * grain : 0\n                if (v.age < v.burst) {\n      " +
"              v.seed = (v.seed * 1664525 + 1013904223) >>> 0\n                    x += (v.seed / 2147483648 - 1) * grain * 0.3 * (1 - v.age /" +
" v.burst)\n                }\n                // La chute de hauteur : les resonateurs sont reaccordes toutes les 8 notes d'horloge\n          " +
"      if (v.envBend > 0.002) {\n                    if ((v.age & 7) === 0) {\n                        const m = 1 + v.bend * v.envBend\n       " +
"                 for (const q of v.modes) {\n                            const w = Math.min(q.w * m, 2.6)\n                            q.c = M" +
"ath.cos(w)\n                            q.s = Math.sin(w)\n                        }\n                    }\n                    v.envBend *= v." +
"kBend\n                } else if (v.envBend > 0) {\n                    v.envBend = 0\n                    for (const q of v.modes) {\n         " +
"               q.c = Math.cos(q.w)\n                        q.s = Math.sin(q.w)\n                    }\n                }\n                let y" +
" = 0\n                for (const q of v.modes) {\n                    const re = (q.re * q.c - q.im * q.s) * q.r + x * q.gain\n                " +
"    q.im = (q.re * q.s + q.im * q.c) * q.r\n                    q.re = re\n                    y += q.im\n                }\n                y *" +
"= v.norm * v.level\n                left += y * v.left\n                right += y * v.right\n                v.age++\n            }\n           " +
" const a = this.volume * (1 - this.duck * this.dipSmooth) / g\n            outL[s] += Math.tanh(left * g) * a\n            outR[s] += Math.tan" +
"h(right * g) * a\n        }\n        if (this.voices.length > 0 && this.voices[0].age > this.voices[0].life) {this.voices.shift()}\n    }\n}"

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Derive")
project.bpm = BPM

// Une reverb, pour le gong seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.6, damping: 0.5, preDelay: 12, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seuil", start: 0, bars: 16},
    {name: "Pente", start: 16, bars: 16},
    {name: "Double", start: 32, bars: 16},
    {name: "Large", start: 48, bars: 16},
    {name: "Creux", start: 64, bars: 8},
    {name: "Derive", start: 72, bars: 16},
    {name: "Loin", start: 88, bars: 16},
    {name: "Retour", start: 104, bars: 8},
    {name: "Unisson", start: 112, bars: 16},
    {name: "Large 2", start: 128, bars: 16},
    {name: "Sortie", start: 144, bars: 16}
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
/** Une valeur reelle ramenee entre 0 et 1, pour un bouton a echelle droite ou logarithmique. */
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)
/** Des points [mesure, valeur reelle] convertis d'un coup. */
const enLog = (points: number[][], lo: number, hi: number) => points.map(p => [p[0], loga(p[1], lo, hi)])
const enDroit = (points: number[][], lo: number, hi: number) => points.map(p => [p[0], droit(p[1], lo, hi)])

/** Une pente sur laquelle on pose une vague lente : la main qui ne lache jamais le bouton. */
function vague(trend: number[][], period: number, depth: number): number[][] {
    const at = (bar: number) => {
        let before = trend[0], after = trend[trend.length - 1]
        for (const p of trend) {
            if (p[0] <= bar) {before = p} else {after = p; break}
        }
        if (after[0] <= before[0]) {return before[1]}
        return before[1] + (after[1] - before[1]) * (bar - before[0]) / (after[0] - before[0])
    }
    const wave = (bar: number) => depth * Math.sin(2 * Math.PI * bar / period)
    const out: number[][] = []
    let next = 0
    for (let bar = 0; bar <= TOTAL; bar += 2) {
        while (next < trend.length && trend[next][0] <= bar) {
            out.push([trend[next][0], trend[next][1] + wave(trend[next][0])])
            next++
        }
        if (!trend.some(p => p[0] === bar)) {out.push([bar, at(bar) + wave(bar)])}
    }
    return out
}

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
function hasard(graine: number) {
    let a = graine >>> 0
    return () => {
        a = (a + 0x6D2B79F5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ---------- La carte du morceau ----------
/** Les creux : le pied et la basse se taisent. */
const inBreak = (bar: number) => (bar >= 64 && bar < 72) || (bar >= 104 && bar < 112)
/** Le bloc qui demarre sans sa basse. */
const nu = (bar: number) => bar >= 88 && bar < 92
const kickOn = (bar: number) => bar >= 8 && bar < 152 && !inBreak(bar)
const bassOn = (bar: number) => bar >= 16 && bar < 144 && !inBreak(bar) && !nu(bar)
const drop = (bar: number) => (bar >= 72 && bar < 104) || (bar >= 112 && bar < 144)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 71 || bar === 111
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. */
const finDeBloc = (bar: number) => [31, 47, 63, 87, 103, 127, 143].includes(bar)
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    const v = bar < 16 || bar >= 144 ? 0.8 : drop(bar) ? 1 : 0.92
    const out = [[0, v], [4, v], [8, v], [12, v]]
    return finDeBloc(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Fa diese 1 = 46 Hz : le pied et la basse.
const FA1 = 30, FA2 = 42

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -6.5)
reglages("frappe", kick, {tune: 46.3, start: 340, sweep: 48, decay: 150, punch: 0.6, click: 0.5, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
auto("frappe", kick, "click", [[0, 0.1], [8, 0.1], [16, 0.5], [144, 0.5], [152, 0.2], [160, 0.2]])

// ---------- Roulante : la basse ----------
// Une seule note par temps, a contretemps, plus longue qu'un pas : "BOUM-baa".
// Elle a fini avant le coup suivant : un seul acteur dans le grave a la fois.
const bass = apparat("Roulante", ROULANTE, -2)
reglages("roulante", bass, {
    pas: PAS_MS, long: 1.3, cutoff: 85, envmod: 3.2, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.75, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    const out: Note[] = []
    for (let beat = 0; beat < 4; beat++) {
        const step = beat * 4 + 2
        if (step >= limite(bar) || (finDeBloc(bar) && beat === 3)) {continue}
        out.push({position: step * S16, duration: S16, pitch: FA1, velocity: 0.8})
    }
    return out
})
auto("roulante", bass, "envmod", vague(enDroit([
    [0, 2.6], [48, 3.0], [72, 3.4], [112, 3.8], [144, 3.0], [160, 2.4]
], 0, 6), 12, 0.04))

// ---------- La boucle ----------
// Demi-tons au-dessus du Fa diese 2. 12 = l'octave, 1 = le Sol (le demi-ton
// de menace), 10 = le Mi. Le dernier pas est un silence : c'est lui que la
// seconde voix saute.
const N = null
type Boucle = (number | null)[]
const BOUCLE: Boucle = [0, N, 0, 12, N, 0, 1, N, 0, N, 0, 10, N, 0, 12, N]
const ACCENTS = [3, 6, 11]
const SLIDES = [2, 10]
/** La derive : une note de la boucle change, parmi celles qui ne portent pas d'accent. */
const CHOIX = [0, 12, 1, 7, 3, 10]
const tirageBoucle = hasard(1126)
function glisse(boucle: Boucle): Boucle {
    const libres: number[] = []
    boucle.forEach((v, step) => {if (v !== null && !ACCENTS.includes(step) && step !== 0) {libres.push(step)}})
    const step = libres[Math.floor(tirageBoucle() * libres.length)]
    let note = boucle[step]
    while (note === boucle[step]) {note = CHOIX[Math.floor(tirageBoucle() * CHOIX.length)]}
    const out = boucle.slice()
    out[step] = note
    return out
}
// Une boucle par fenetre de huit mesures. Elle ne bouge pas pendant 80
// mesures, glisse trois fois, revient, puis glisse encore trois fois.
const BOUCLES: Boucle[] = []
for (let w = 0; w < 20; w++) {
    const glisser = (w >= 10 && w <= 12) || (w >= 15 && w <= 17)
    const retour = w === 13 || w === 18
    BOUCLES.push(w === 0 || retour ? BOUCLE : glisser ? glisse(BOUCLES[w - 1]) : BOUCLES[w - 1])
}
const boucleDe = (bar: number): Boucle => BOUCLES[Math.min(19, Math.floor(bar / 8))]
const couleur = (accent: boolean, c: number) => accent ? 0.9 + 0.1 * c : 0.5 + 0.35 * c

/** La note de la boucle qui tombe au rang "rangDansBoucle", posee sur le pas "step" de la mesure. */
function noteAcid(boucle: Boucle, rangDansBoucle: number, longueur: number, step: number, c: number): Note | null {
    const semi = boucle[rangDansBoucle]
    if (semi === null) {return null}
    // Une note liee deborde sur la suivante : c'est le chevauchement qui fait glisser
    const liee = SLIDES.includes(rangDansBoucle) && boucle[(rangDansBoucle + 1) % longueur] !== null
    return {
        position: step * S16, duration: Math.round(S16 * (liee ? 1.3 : 0.55)),
        pitch: FA2 + semi, velocity: couleur(ACCENTS.includes(rangDansBoucle), c)
    }
}

// ---------- Venin A : la voix qui tient la mesure (16 pas) ----------
const COULEURS_A = [0.3, 0.6, 0.95, 0.45, 0.75]
const voixA = apparat("Venin A", VENIN, -1, -0.3)
reglages("venin a", voixA, {
    cutoff: 200, reso: 0.78, envmod: 2.0, decay: 280, accent: 0.7, tint: 0.8, glide: 80,
    shape: 0, drive: 0.45, lowcut: 180, tonic: FA2, just: 0, duck: 0.35
})
essai("saturation venin a", () => voixA.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
voixA.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.45, wet: -20})
/** Les pas que la voix A joue : un squelette d'abord, la boucle entiere ensuite. */
function pasDeA(bar: number): number[] | null {
    const S1 = [0, 3, 8, 11], S2 = [0, 2, 3, 5, 8, 10, 11, 13]
    if (bar < 8) {return S1}
    if (bar < 32) {return S2}
    if (bar >= 104 && bar < 108) {return S1}
    if (bar >= 108 && bar < 112) {return S2}
    if (bar >= 144 && bar < 152) {return S2}
    if (bar >= 152) {return S1}
    return null
}
build(voixA.noteTracks[0], "Venin A", bar => {
    const out: Note[] = plongeons(bar)
    const boucle = boucleDe(bar)
    const garde = pasDeA(bar)
    for (let step = 0; step < limite(bar); step++) {
        if (garde !== null && !garde.includes(step)) {continue}
        const note = noteAcid(boucle, step, 16, step, COULEURS_A[(bar * 16 + step) % 5])
        if (note !== null) {out.push(note)}
    }
    return out
})
auto("venin a", voixA, "cutoff", vague(enLog([
    [0, 150], [16, 170], [32, 220], [64, 330], [64, 170], [71.75, 420], [72, 330], [104, 460],
    [104, 160], [111.75, 560], [112, 420], [144, 620], [152, 220], [160, 150]
], 60, 4000), 12, 0.035))
auto("venin a", voixA, "envmod", vague(enDroit([
    [0, 1.6], [32, 1.8], [72, 2.4], [112, 2.8], [144, 3.0], [152, 1.6], [160, 1.4]
], 0, 5), 20, 0.03))
auto("venin a", voixA, "tint", enDroit([
    [0, 0.5], [32, 0.7], [72, 1.2], [112, 1.6], [144, 1.8], [152, 0.6], [160, 0.5]
], 0, 3))
auto("venin a", voixA, "reso", vague([
    [0, 0.76], [64, 0.80], [64, 0.88], [72, 0.80], [104, 0.82], [104, 0.90], [112, 0.82], [144, 0.84], [160, 0.76]
], 28, 0.015))
auto("venin a", voixA, "decay", enLog([
    [0, 240], [64, 280], [64, 520], [72, 300], [104, 320], [104, 700], [112, 320], [144, 360], [160, 220]
], 60, 2000))

// ---------- Venin B : la voix qui derive (15 pas) ----------
// Les memes notes, sans le silence final. Elle part avec la voix A a la
// mesure 32, puis a chaque drop ; entre deux, elle gagne un pas par mesure.
// Un carre plutot qu'une dent de scie, de l'autre cote, et son filtre
// respire sur une vague plus lente : les deux voix ne s'ouvrent jamais ensemble.
const DEPARTS = [32, 72, 112]
const COULEURS_B = [0.6, 0.2, 0.85, 0.4, 0.7, 0.1, 0.5]
const voixB = apparat("Venin B", VENIN, -3, 0.3)
reglages("venin b", voixB, {
    cutoff: 220, reso: 0.72, envmod: 1.8, decay: 260, accent: 0.6, tint: 1.0, glide: 80,
    shape: 0.7, drive: 0.4, lowcut: 200, tonic: FA2, just: 0, duck: 0.35
})
essai("saturation venin b", () => voixB.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
voixB.addAudioEffect("Delay", {delay: 11, feedback: 0.34, cross: 1, filter: 0.4, wet: -18})
build(voixB.noteTracks[0], "Venin B", bar => {
    const out: Note[] = plongeons(bar)
    const on = (bar >= 32 && bar < 104) || (bar >= 112 && bar < 144)
    if (!on) {return out}
    let depart = DEPARTS[0]
    for (const d of DEPARTS) {if (d <= bar) {depart = d}}
    const boucle = boucleDe(bar)
    for (let step = 0; step < limite(bar); step++) {
        const t = (bar - depart) * 16 + step
        const note = noteAcid(boucle, t % 15, 15, step, COULEURS_B[t % 7])
        if (note !== null) {out.push(note)}
    }
    return out
})
auto("venin b", voixB, "cutoff", vague(enLog([
    [0, 200], [32, 200], [48, 260], [64, 300], [72, 300], [104, 430], [112, 380], [144, 560], [160, 200]
], 60, 4000), 20, 0.05))
auto("venin b", voixB, "envmod", vague(enDroit([
    [0, 1.4], [32, 1.4], [72, 2.0], [112, 2.4], [144, 2.6], [160, 1.4]
], 0, 5), 14, 0.03))
auto("venin b", voixB, "tint", enDroit([
    [0, 0.8], [32, 0.8], [72, 1.4], [112, 1.8], [144, 2.0], [160, 0.8]
], 0, 3))
// Elle entre de loin, sur huit mesures
auto("venin b", voixB, "volume", [[0, 0.28], [32, 0.28], [40, 0.6], [160, 0.6]])

// ---------- Gresil : les tics ----------
// Des percussions sans bruit blanc : trois sinusoides en cascade. Leur vitesse
// change a chaque bloc.
const ticks = apparat("Tics", GRESIL, 6)
reglages("tics", ticks, {
    decay: 22, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.5, duck: 0
})
const TIC = 84
function vitesse(bar: number): number {
    if (!kickOn(bar) || bar < 16) {return 0}
    if (bar < 48) {return 1}                 // un tic a contretemps
    if (bar < 64) {return 2}                 // + le pas d'apres, en sourdine
    if (nu(bar)) {return 1}
    if (bar < 104) {return 3}                // + le pas d'avant
    if (bar < 128) {return 4}                // toutes les doubles-croches
    if (bar < 144) {return 5}                // + la ride
    return 1
}
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        const force = beat === 2 ? 0.85 : beat === 3 && v >= 2 ? 0.48 : beat === 1 && v >= 3 ? 0.36 : beat === 0 && v >= 4 ? 0.26 : 0
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force})}
    }
    return out
})
auto("tics", ticks, "decay", vague(enLog([
    [0, 18], [72, 22], [112, 27], [144, 19], [160, 16]
], 5, 600), 6, 0.02))

// ---------- Gresil : les tocs ----------
// Le meme instrument, plus grave et plus long, avec une chute de hauteur a
// l'attaque : une syncope seche, et le roulement qui annonce les drops.
const TOCS = [62, 57, 65]
const tocs = apparat("Tocs", GRESIL, -13, 0.15)
reglages("tocs", tocs, {
    decay: 70, index: 2.5, snap: 4, body: 0.1, r2: 1.48, r3: 3.7, noise: 0.1, chirp: 7,
    lowcut: 150, drift: 0.5, width: 0.4, duck: 0.2
})
tocs.addSend(reverb, {amount: -24})
build(tocs.noteTracks[0], "Tocs", bar => {
    // Le roulement avant un drop : il enfle, puis laisse le dernier temps vide
    if (avantDrop(bar)) {
        const out: Note[] = []
        for (let step = 0; step < 12; step++) {
            out.push({
                position: step * S16, duration: S16 / 2, pitch: TOCS[step % 3 === 0 ? 0 : step % 2 === 0 ? 1 : 2],
                velocity: Math.min(1, (step % 3 === 0 ? 0.75 : 0.45) * (0.6 + 0.7 * step / 12))
            })
        }
        return out
    }
    const out: Note[] = plongeons(bar)
    const on = bar >= 32 && bar < 144 && !inBreak(bar) && !nu(bar)
    if (!on) {return out}
    const hit = (step: number, k: number, velocity: number) => out.push({position: step * S16, duration: S16 / 2, pitch: TOCS[k], velocity})
    hit(7, 0, 0.8)
    if (rang(bar) === 1 || rang(bar) === 3) {hit(13, 1, 0.6)}
    if (rang(bar) === 3) {hit(10, 2, 0.5)}
    if (finDeBloc(bar)) {hit(12, 1, 0.6); hit(14, 2, 0.7); hit(15, 0, 0.9)}
    return out
})

// ---------- Lueur : le gong ----------
// Une percussion tres longue, en tete de bloc seulement. Avant le dernier
// drop, elle frappe le Fa diese et le Sol ensemble : le demi-ton qui frotte.
const GONGS: {[bar: number]: number[]} = {
    0: [54], 32: [54, 61], 64: [54], 72: [54, 61, 66], 104: [54, 55], 112: [54, 61, 66], 144: [54, 61]
}
const gong = apparat("Gong", LUEUR, -9)
reglages("gong", gong, {
    decay: 2200, matter: 0.9, strike: 0.4, damp: 0.4, chirp: 0, grain: 0.5, tonic: FA2, just: 1,
    drift: 0.3, duck: 0, width: 0.7, drive: 0.1
})
gong.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.3, wet: -12})
gong.addSend(reverb, {amount: -10})
build(gong.noteTracks[0], "Gong", bar => {
    const notes = GONGS[bar]
    if (!notes) {return []}
    return notes.map((pitch, k) => ({position: k * 2 * S16, duration: S16, pitch, velocity: k === 0 ? 1 : 0.7}))
})

// ---------- Rim, clap, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const RIM = 37, CLAP = 39, RIDE = 51
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -6, panning: -0.1}],
    ["Clap", CLAP, {volume: -4}],
    ["Ride", RIDE, {volume: -13, panning: 0.15}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})}
    }
    if (!kickOn(bar) || nu(bar)) {return out}
    // Le rim sur le deuxieme et le quatrieme temps ; le clap ne le double qu'au dernier drop
    if (bar >= 48 && bar < 144) {hit(4, RIM, 0.7); hit(12, RIM, 0.75)}
    if (bar >= 112 && bar < 144) {hit(4, CLAP, 0.8); hit(12, CLAP, 0.85)}
    if (vitesse(bar) >= 5) {hit(0, RIDE, 0.45); hit(4, RIDE, 0.35); hit(8, RIDE, 0.45); hit(12, RIDE, 0.35)}
    if (finDeBloc(bar)) {hit(14, CLAP, 0.5); hit(15, CLAP, 0.7)}
    return out
})

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le premier drop, on mesure aussi ce qu'on a mesure sur les references :
// la part du grave et de l'aigu, l'energie par bande d'octave, l'ecart entre
// la crete et le niveau moyen, et la force des attaques sur les 16 pas.
const MESURER = true
const ISOLER = true
const units: any[] = [kick, bass, voixA, voixB, ticks, tocs, gong, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["VeninA", voixA], ["VeninB", voixB],
    ["Tics", ticks], ["Tocs", tocs], ["Gong", gong], ["909", drums]]
if (MESURER) {
    const parts = [["seuil", 0, 16], ["pente", 16, 32], ["double", 32, 48], ["large", 48, 64], ["creux", 64, 72],
        ["derive", 72, 88], ["nu", 88, 92], ["loin", 92, 104], ["retour", 104, 112], ["unisson", 112, 128],
        ["large2", 128, 144], ["sortie", 144, 160]]
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
        // Les memes mesures que sur les references, sur le premier drop (mesures 72 a 88)
        const from = Math.floor(72 * barSec * rate), to = Math.min(n, Math.floor(88 * barSec * rate))
        if (to > from) {
            const hop = 512
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            const kA = 1 - Math.exp(-2 * Math.PI * 300 / rate), kB = 1 - Math.exp(-2 * Math.PI * 3000 / rate)
            let lp = 0, lp2 = 0, hl = 0, ma = 0, mb = 0, sLow = 0, sHigh = 0, sTot = 0, pk = 0
            const eL: number[] = [], eM: number[] = [], eH: number[] = []
            const centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
            const bandes = centres.map(c => filtre(2, c, 1.414))
            const sBandes = centres.map(() => 0)
            for (let i = from; i < to; i += hop) {
                let l = 0, m = 0, h = 0
                for (let j = i; j < i + hop && j < to; j++) {
                    const x = (L[j] + R[j]) / 2
                    if (Math.abs(x) > pk) {pk = Math.abs(x)}
                    lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                    hl += (x - hl) * kHigh
                    ma += (x - ma) * kA; mb += (x - mb) * kB
                    const hh = x - hl, mm = mb - ma
                    l += lp2 * lp2; m += mm * mm; h += hh * hh; sTot += x * x
                    for (let b = 0; b < bandes.length; b++) {const y = bandes[b](x); sBandes[b] += y * y}
                }
                eL.push(Math.sqrt(l)); eM.push(Math.sqrt(m)); eH.push(Math.sqrt(h))
                sLow += l; sHigh += h
            }
            if (sTot > 0) {
                const perBar = barSec * rate / hop
                const pas = (e: number[]) => {
                    const acc: number[] = []
                    for (let s = 0; s < 16; s++) {acc.push(0)}
                    for (let i = 1; i < e.length; i++) {
                        const d = e[i] - e[i - 1]
                        if (d > 0) {acc[Math.floor(((i / perBar) % 1) * 16 + 0.2) % 16] += d}
                    }
                    let mx = 0
                    for (const v of acc) {if (v > mx) {mx = v}}
                    return acc.map(v => String(Math.round(9 * v / (mx || 1)))).join("")
                }
                const rms = Math.sqrt(sTot / (to - from))
                line += " || drop : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
                    " creteSurMoyen " + (20 * Math.log10(pk / rms)).toFixed(1) +
                    " bandes " + sBandes.map(v => (10 * Math.log10(v / sTot + 1e-12)).toFixed(0)).join(" ")
                if (stem[1] === null) {line += " pas grave " + pas(eL) + " medium " + pas(eM) + " aigu " + pas(eH)}
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
