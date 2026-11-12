// STAY ALIVE - Beat Survivor, mode Survie
// Acid a voix robot - 130 BPM - Sol diese phrygien - 144 mesures (4 min 26)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// stay-alive.src.ts (le morceau), de voix-stay.json (la voix robot, rendue
// par voix.mjs) et des instruments du dossier apparat/.
//
// La surprise : le robot connait le jeu. Il annonce son nom ("Beat.
// Survivor."), donne la consigne ("Stay alive"), compte avant le premier drop
// ("three, two, one"), et quand le morceau s'acheve, donc quand le joueur a
// tenu jusqu'au bout, il le lui dit : "You survived."
// Deux autres tours : dans les creux il chante (ses mots passent dans un
// vocodeur, sur les notes du morceau) ; et avant le second drop il repete
// "beat" de plus en plus vite, jusqu'a ce que les repetitions soient si
// serrees qu'on n'entend plus un mot mais une note qui monte.
//
// La voix : SAM (Software Automatic Mouth, 1982), le synthetiseur vocal des
// micro-ordinateurs 8 bits, sur une seule note comme le robot de Kraftwerk.
// Tout son traitement est calcule ici, avant meme de creer le projet.
//
// Le reste applique les notes Dash Glitch et Underdog du vault : basse en
// deux chemins aux durees comptees en pas (Roulante), voix acid a accent dont
// la velocite porte la couleur (Venin), percussions seches sans bruit blanc
// (Gresil), boucles de longueurs inegales sous un squelette carre, blocs de
// 16 mesures, un bloc qui demarre sans sa basse. Aucun souffle.
// Pour le jeu : avant chaque drop, le dernier temps est vide.
//
// Instruments : Frappe, Roulante, Venin, Gresil sont ecrits pour ces morceaux
// (Apparat = instrument scriptable d'openDAW). Clap, ride : TR-909.

const BPM = 130
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM
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
const VOIX_TXT: string = "{\"rate\":22050,\"cible\":103.83,\"mots\":{\"beat\":{\"f0\":104.69,\"n\":5104,\"b64\":\"AAAAgICAgYGBgoKCg4ODhISEhIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFh" +
"YSEhIODg4KCgoGBgYCAgH9/f35+fX19fXx8e3t7e3p6enp5eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl5enp6e3t7e3x8fX19fX5+fn9/f4CAgIGBgoKCgoODg4SEhIWFhYaGhoaGh4eHh4e" +
"Hh4eHh4eHh4eHh4eHh4eHh4aGhoaGhoWFhYSEhIODg4KCgoKBgYCAgH9/gICAgIGBgYKCgoODg4SEhIWFhYWGhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWFhYSEhISDg4OCgoKBgYCAg" +
"H9/f39+fn19fXx8e3t7e3t6enp6eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5enp6e3t7e3t8fH19fX5+fn9/f4CAgICBgYKCgoODg4SEhISFhYWGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4e" +
"Hh4eGhoaGhoWFhYWEhISDg4OCgoKBgYCAgIB/f4CAgIGBgYKCgoODg4OEhISFhYWGhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoaFhYWEhISDg4ODgoKCgYGAgIB/f39+fn19fX18fHt7e" +
"3t6enp6eXl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXp6ent7e3t8fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWGhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWEhIS" +
"Dg4ODgoKCgYGAgIB/f3+AgICBgYGCgoKDg4OEhISEhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWFhISEg4ODgoKCgYGAgICAf39/fn59fX18fHx7e3t7enp6enl5eXl5eHh4e" +
"Hh4eHh4eHh4eHh4eHh4eHh4eXl5eXp6enp7e3t7fHx9fX1+fn5+f39/gICAgYGCgoKDg4ODhISEhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWFhISEg4ODgoKCgYGBgICAf3+" +
"AgICBgYGBgoKCg4ODhISEhYWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhISEg4ODg4KCgoGBgICAf39/fn5+fX19fHx7e3t7enp6enp5eXl5eHh4eHh4eHh4eHh4eHh4eHh4e" +
"Hh4eHl5eXl6enp7e3t7e3x8fX19fn5+f39/gICAgYGBgoKCg4ODhISEhYWFhYaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhISEhIODg4KCgoGBgICAgH9/gICAgYGBgoKCg4ODhIS" +
"EhIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhYSEhIODg4KCgoGBgYCAgH9/f35+fX19fXx8e3t7e3p6enp5eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl5enp6e3t7e" +
"3x8fX19fX5+fn9/f4CAgIGBgoKCgoODg4SEhIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhoWFhYSEhIODg4KCgoKBgYCAgH9/gICAgIGBgYKCgoODg4SEhIWFhYWGhoaGhoeHh4e" +
"Hh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWFhYSEhISDg4OCgoKBgYCAgH9/f39+fn19fXx8e3t7e3t6enp6eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5enp6e3t7e3t8fH19fX5+foODg4ODg" +
"4KCgYGAgICAgICAgIGBgoOEhYaHiImKiouLi4uLi4qKiYiHhoaFhYSDg4OCg4ODg4SEhYWFhoaHh4eGhoWEg4KBgYB/foCAgYOEhIaGhoaHh4eGhoWFhISDg4OCgoKDg4SEhYaGiIiJioqKi4uLi4u" +
"KioiIh4aFhYSCgoGAgICAgICAgIGBgoKCg4ODg4OCgYGAf359fHt6eXd3dnZ2dXZ2dnZ3eHh5enp7e3t8fHx7e3p6eXl4d3d2dnZ2dXZ2dnd4eXt7fH1+f4CBgYKDg4ODg4KCgoGBgICAgICAgIGBg" +
"oOEhICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICJeXZ0cnFweXt9gYKQkI6Ne3l4d3Z2hIeJi4KEhoiWlZSTkY99e3qGh4iLjYGDhYaHlJSSjn17d3V0goKDhIh8fYCAjoyLiYZ2c3FubXt8fX91d3h5eoiHhIKAbWx" +
"qaXd4e31xc3V3eIeHhoOBcW1sbHp6fH2Cdnl9fn+NjIqJeXd1c3OBg4WHfoGDhIaGlJKRj317eniGh4iKjI6EhoeWlpWRj358enl3hYWGin5/goOEkI+Ni4h4dXFwfn6AgXd5ent8fIqHhYNwbmxqe" +
"Hh5enx+dHZ3eYaFeXt9f4GCkJCOjXt5eHZ2hIWTmJ2Oj46dmJSOeXp9gYafpKWjhoF9i4qLkYCDhoiIm5KNh2tqa3CJjY+RkXpxbGd1dHRlaW1xcoiGfnpgWllbd3yAhHFycWpmd3JydGhtcnaOj4+" +
"JcGxoaICIjZOChYaGlZGNiXR2foOIo6SjoIiDf3mOj5abio+QjqCblpJ2dXZ8lZidnYaCfXhygH+AhXR4fHyPi4aBfGBfX3p+godzcW5pZXVvbnBiZ2txh4aDf3tiXV1ffYKHeXp6dIWBf319a3V6f" +
"4SEl5CMiXJyc3eVmp+jjYuEf5GOjo+RhYmNpaShmX97eHZ3eba9vpOGd4CAhY57goR2hXZiYUhbZISCem9hMjE2Z3J5WU9EM09VX216aGpidWZlbGl3g4ilnpZqaG6Gr7vCvJeMhIGfs7/KtK2ip6G" +
"gpZKdpqrAs5hzb3mDp62rpZlgVlF0foZxbGJURlhSWklTX11wWU9LOERReH5/ekpCPklxgJZ8enJpYHiBjZyYnJqlm5aVgIqXrs3LuJGJiJC3wsvOy5mMgZacpZqdmZByf4uRpp6OjHWMmsLIyMG4i" +
"ISFtMDKs6yhiZ6coaq0oaSdrJGIg3F7g4ijnZBYTkhQdn+HgltPQTdOV2JtXlxUWlBNTztHVWeEgG1kRVBdiJWeoJ5xaGSKlqSgo6GZkKKcoKqbsbTNua2lh4+ZpMjKxpSHe3SVnq6VkYh6bHtxdX1" +
"ydnN6bWBYOTxFWXt8bEQ4LzNYZXF6fVdNQ1dcZ2ZxeHdyhXx0XGeDj7Kvpp15dniBt8PKqqGWhqKnvayys62isZyZm5GboLWrnI5nYmJyl51yf4uRpp6Ujox1jJrCyMG4iISFjbTAyrOsoYmenKq0o" +
"aaknayRiINxe4OjnZCDWE5IUHZ/h4JbQTdOV2JtWl5cVFpQTTtHVWeEgHZtZEVQXYieoJ5xaGRlipakoKOhkKKcoKqbp7G0zbmtpYePmcjKxr6Uh3t0lZ6ulZF6bHtzcXV9cnZzem1gOTxFWXt8dmx" +
"EOC8zWHF6fVdNQ1hXXGdmcXhyhXx0XGd0g4+yr6addniBt8PKy6qhloaip72ssq2isaWcmZuRm6C1q5xnYmJpcpedcn+Lkaaejox1jJrCyMjBuIiEhbTAyrOsoZWJnpyqtKGknayRiINqcXuDo52QW" +
"E5IUHZ/hoeCW0E3TldibV5cVElaUE07R1VnhIBtZEVHUF2InqCecWhkipakoKOhmZCinKCqm7G0zbmtpYWHj5nIysaUh3t0lZ6nrpWRemx7cXV9cnZziHptYDk8RVl7fGxEODAvM1hxen1XTUNXXGd" +
"0ZnF4coV8dFxng4+yr6adeXZ4gbfDyqqhloaip7K9rLKtorGcmZuRm6C8taucZ2Jicpedcn+LkJGmno6MdYyawsjBuJGIhIW0wMqzrKGJnpyhqrShpJ2skYiDcXuDo52Qg1hOSFB2f4eCW0E3TlBXY" +
"m1eXFRaUE07R1VgZ4SAbWRFUF2InqCeenFoZIqWpKCjoZCinJugqpuxtM25raWHj5mkyMrGlId7dJWerpWRemx7c3F1fXd6eoR8dFRUWF96gISAZFxPTmRxeWpubmpkbGhoXWVtjY2Jg2ljYGaCi5q" +
"diH53h4WHjJSPlZelnph7fYKJpq2xrpOLfnuSnaSVlpGJlo6IhnV+hImalImGcnZ+hqOsq6aEf3yWnaSsm5yajJqUkYCHk5erp5+XenBxdZabnYF6cWl3dXdscnd2hX5taVJVWmF9g4F8V1FOZ252b" +
"m9taGFwa2tcY3R5j4mCZ2NjZmyTmp+Ig3yIiIySho6VmKmilZJ9h46qsLKvqoZ/e5OZoJWVkouCj4iEcniEhpuOhmhiXl9jhIqMcGlgb25uZ2xxdHWCfnNhXl9jdoCDdnRwbGdvcHNwdnqLiYWAbmt" +
"qfoSKlIeHf4mFg4OFfIiMnp2ZlH18fI15foOHk5CGdXR5fpKYnJ6QiIN/iYuPjJCToJyXkn98fIKVmp+RjoN9hoSEhn2GiJeRi4VubG1+goaKfnx3eXRxcmhtcXWFhHx3Y11eb3l+c3V0cGxwbW1la" +
"nCHiIaDcGxoZ3h9iYCDgX2Hf35ydnyCh5uamIB8eoqOk5mQk5OblpGLfX+JnJ+hoJ2Kf3uHio6TjIyKlI6Ig3BxdIuPkH96dG5pdHR6cHV5eIJ3cmBeamxug4WGd3RxeXd3bXB0d4eHh3Rwbmt6fIN" +
"4e319iYeBfm95fH+Cj4yKh3Z0dniJkZOGhIGMiYeGhn2AhJaWlYF9e3mHiIqChYeVko+IeHd3eYmMkYSEf3uFgYBzeXyMjY2MiXRxbnx+gXl7e3qGg4Bramp8f4KHeXd1cXx5d2psc3aGh4V0cW5re" +
"Xt+gnp8fIeEgXBvb3CFiIyBgH6HhIKBgnd6gZKTkoF+eXeGio2DhoiIlY+MiXl5fJCTlYiHhYKJh4V5e36Sk5ORjn15c4GCh3x+gH+Lh4SAcG5wgYeJinl3c316eXiAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC" +
"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB" +
"QgIBQgICAgIBQUFCAgFBQgICAgFBQgICAgFBQgICAUFBQgIBQgFCAgICAUICAgICAUFCAgIBQUICAgFBQUFCAUICAUICAgFBQUICAgFBQUICAgFBQUICAUFBQUICAUFBQgICAUFBQgFCAUFCAgICAU" +
"ICAgICAUFCAgIBQUICAgFBQgFCAgIBQUICAgFCAUICAgIBQgICAgFBQgICAgFCAgIBQUFBQgIBQUFCAgIBQUFCAgIBQUICAgIBQUFCAgFBQUFCAgFBQgICAgIBQgICAgFBQgIBQgFBQgICAUFCAgIC" +
"AUFCAUFCAUFCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" +
"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==\"},\"survivor\":{\"f0\"" +
":104.69,\"n\":17311,\"b64\":\"AAAAUICAgIBQUICAUFBQgICAUFBQUICAUFBQgICAUFBQgICAUFCAgIBQUFCAgICAUFCAgIBQUICAgICAUICAgFBQgICAgIBQgICAgFBQgICAgFBQgICAgFCAgICAU" +
"FCAgICAUFCAgICAUFCAgICAUFCAUICAUICAgICAUFCAgFBQUICAUICAUICAgFBQUICAgFCAgICAgFBQUICAUFCAgICAUFCAgICAUICAgICAUICAgIBQgICAgICAgFCAgIBQgICAgFBQgFCAgIBQgIC" +
"AgFCAgFCAgFBQgICAgIBQgICAgFBQgICAgFCAgIBQUIBQgIBQUFCAgIBQUICAgFBQUFCAgIBQUICAgIBQUICAgIBQUICAUIBQUICAgFCAgICAUICAgFCAgFCAgIBQUIBQgIBQgFBQgIBQUIBQgIBQg" +
"FCAUFCAUICAgIBQgFCAUFBQgICAUFCAgFCAgIBQgFCAUFCAgIBQgICAUFCAgIBQgFBQgIBQgFCAUFCAUIBQgICAUIBQgICAgFCAgICAUICAUFCAgFBQgIBQUIBQUFCAgFCAgIBQgFCAgICAgFCAgIC" +
"AUICAgICAUIBQgIBQgFCAUFCAUICAUFBQgFCAgIBQgICAUFCAgFCAUFBQgIBQgFBQUIBQUICAUIBQgICAgFCAUICAgICAUICAUICAUICAUIBQgICAgFBQgICAgFCAgICAgFCAgICAgFCAgICAUICAg" +
"ICAUIBQgFBQUIBQgFBQUICAgFBQUICAgFBQUICAgFBQgICAUFBQgICAUFBQgICAUICAgICAUFCAgIBQUFCAgIBQUIBQUIBQUICAgIBQUICAgIBQgICAgFBQgICAgFBQUICAgIBQgICAgFBQgIBQUFC" +
"AgIBQUFCAgIBQUFCAgIBQUFCAgFBQgIBQgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgFBQUICAUFBQUICAUFBQgICAUFBQgFBQgICAUIBQUICAUIBQgFBQgIBQUFBQgFCAUICAgIBQg" +
"FBQgIBQUICAgFCAUICAgIBQUICAgIBQgICAgIBQgIBQUIBQgICAgFCAgICAgIBQgFCAgIBQgFCAgFCAgFCAgFBQUIBQUFBQgICAgFBQgIBQUFCAgICAgFCAgFBQUFCAgFBQgICAgFCAUFCAgFBQgIC" +
"AgIBQgICAUFBQgICAUIBQgICAgFCAUFCAUFCAgICAUFCAgIBQUFCAgICAUFCAgIBQUFCAgFBQUICAgFBQUICAgFBQgICAgFBQUICAUFBQgIBQgFBQUICAUICAgFCAUFBQgICAUICAUICAUFBQgICAU" +
"FBQgICAUICAgICAUICAgIBQUICAgFBQUIBQUIBQgICAgIBQUICAgFCAUIBQUFBQgICAgFBQgICAgIBQgFCAgFCAUIBQUFCAgFCAgFCAUIBQUFCAgFBQUICAgIBQUIBQgFBQUICAgFBQgICAgFCAgIC" +
"AUFCAgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUICAgICAUICAUFCAUICAgIBQUICAgIBQgFCAUFBQgICAUFBQgICAUFBQgIBQgICAgICAUFCAgIBQgIBQgICAUFCAgFCAUFBQgICAUFBQgIBQU" +
"FBQgIBQUICAgIBQUICAUIBQUICAUIBQUICAUIBQgFBQgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFBQgFBQgIBQgFBQgFCAgFBQgFCAUICAUFCAUIBQUFCAgFBQUFCAgFBQUICAgFBQUICAgFBQUIC" +
"AgFCAgICAUIBQUICAUFCAgFCAUFCAgICAUFBQgICAgFCAgIBQUFCAgICAUICAUFCAUFBQgIBQUIBQgICAUICAgICAUFCAgIBQUICAUFCAUICAgIBQUICAgIBQgFCAUFBQUICAUFBQgIBQUFBQgICAU" +
"FBQUICAUICAUICAUFBQgIBQUICAgIBQUICAgIBQUICAgFBQgIBQUIBQUICAgIBQgICAgFBQgICAgFBQgIBQUFCAgICAgFCAgICAgIBQgIBQUFCAgICAgFCAgIBQUIBQgIBQUFCAgFCAgFCAgFCAgFC" +
"AUIBQUFCAgFBQUICAUIBQUICAgFCAgICAUIBQUICAgFCAgIBQgFBQUIBQUFCAUFCAUIBQgIBQUICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFCAgIBQUFCAUICAUFBQgICAUFCAgIBQUFCAgIBQg" +
"ICAgIBQUICAgFBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgICAgFBQgICAgFCAgICAgFCAgICAUFCAUICAUFCAgICAUFCAUICAUFCAUIBQUICAgFBQUIBQgFCAgICAgIBQUICAgIBQUICAUIBQUIB" +
"QgICAgFCAgFCAgFCAUIBQUIBQUIBQUIBQgIBQUIBQgICAgFCAgFCAgFCAgIBQUICAgFCAgFBQgFCAgFBQgFBQUICAUICAgFCAgIBQUICAUIBQUICAUIBQUICAUFCAgICAUFCAgIBQUFCAgIBQUICAg" +
"IBQgFCAgICAUICAgIBQUICAUFBQgICAUFCAgFCAUFCAUIBQUFBQgFCAUFCAUIBQgICAgFCAUFCAUIBQgICAUIBQgICAgFCAgIBQUICAgIBQgFCAgICAUICAUFCAUFCAgIBQUIBQgIBQgICAgIBQgIC" +
"AUFBQgFCAgIBQgICAUFBQgICAUFBQgICAUICAgICAUFBQgICAUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgFBQUFCAUIBQUICAgFCAg" +
"ICAgFBQUICAUFCAgICAUFBQUIBQgFCAgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQUIBQgIBQUICAgIBQgICAgIBQUICAUFBQgIBQUFCAUICAUFBQgIBQgIBQgICAUFCAgIBQUFCAgIB" +
"QgICAgFBQUFCAgFBQgICAgFBQgICAgFCAgICAgFBQgICAUFBQgICAUFCAgICAgFCAgICAUFCAUICAUFCAgFBQUICAgFBQUIBQgFBQUICAgICAgIB8f4KGhYqFg4F5e32BhIeRkZCNgH58fYaJjI+Rk" +
"oqHhISCgYOFgYaHh4WKhoN9dHR3en2HiIeEgXdzbm52e36AfHx6eHRxdnN0dnZ5e32DgX58eXdxcnV9h4mJiH57eXd2f4KFjI+Jh4WChoSCgoaChYuMjI+MiHx8fH6Ag42QkI+Cf3t3d3+BhIaJg4K" +
"AeX16d3h6dnl7fYSCgHl2bW1vcnV/goOCeXZwbm53en6BhH+Afnt/e3p7eHx/goWGjYmHhHl5e4GLjpKSkYeEgX98hIV8f4KGhYqIhYOBeXt9hIeRkZCNg4B+fHmKjZWZm46LiIN+eYN/f4F5fH+Cg" +
"H2Hgn14cmNkam5yhoeGhIB8amRiY3d8gYqNgH57d3RxfX2BhYqGioyMmJSRjImHeXx/iIucnJqWkn96dnJydIiMj5GBfnp1cGtzcnN5fXN4eXh1f3t3cXBiaW1ye4yNjIqHhHBubnKFipSXmouJhYJ" +
"+e4eHio6IjI6PjJeSjYiEgXN1fH+CkpCNiYRxbGZlZnp+goeHeHVxbWlwb3B2e4B6fX59e4aDeX6CiIiHj4uIhYR2eICFiZ2enZeTgHl3d3iIjI+Vl4iDfnlvenh4eXt/eHp7dnN8cGtnZGRWWWRqc" +
"ImMjoyJhnRxb29zd4uZnqOpqZmVkIuGfYmIi46Si42NjIiEfn53cWpqXWRobXODgoB9eXReW1pfY2mFi5GWmJmKhIF9eXiIkJWaoKWanJmVkJGLhoB/gHV4e36Cgo2EfnhrWVdWV1pfd3yBhYWDb2t" +
"oZWRldX+FjJqelJSSj4aQjYuKjI+JjpKWlpSYkouEfnloZmhrcoSGeX+Gi4+RkZuXk4yKioCEiY6Tlqemo56RfHZta2tsfYCEiYqJdXBqXlpkY2RmanVtc3t8fHeCfnl4en1zeYCNkpanpqKwp56Be" +
"nZydHl9naKlpKGZe3BlWEM7NUhMU2Zwe4R4foKCfnqEf3x9gIaPhI+ZrLO3tcW9p5yQhXxgW1teY22Ii42LhXZYT0Y+OTc7QmB4hJGmrJydnZmUiIGRjY6RnqaZoKaqqqSdko+CdWFaVkFCR01cZGq" +
"GhoV7dG9TT0xMU1tlk5+sv8XIx6+poY+GfnWBjqGnqqe2sKihmZONeXuGjJKctLKvqaGWfXBPPTk3PUNhanN7g4yNd29pZFtZb3J5gYujr7q0t7evp52onJOJfnx8bnR4gYSDlY+If2lfVTQyND9JV" +
"IGMlp2jpaWJhH91cnKNk5ukrra+x7OwopeLcXtxaWRiYWlaYGxwcm9/eHFpYlxVVUVVYGyGkbG4vb++tK2Rgn15eX2XnaOqrrOyrYh9cFdMQk1MT1RbZG1pcHV4dnJ9d3NvbnB0b3qGnqewzczIwbm" +
"upHpybGdoa3WQlJh1gY6hp6qntrChmZOPjXl7hoySnLSyqaGWin1wTz05Nz1DYXN7g4yNd3NvaWRbWW95gYujr7qttLe3r6ednJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpaWiiYR/dXJyj" +
"ZObrra+xMezsKKXi3F7cWRiYWlaYGdscHJvf3hpYlxVVUVLVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZG1haXB1eHZyfXdzbnB0e296hp6nsM3MyLmupHpybGhnaGt1kJR1gY6" +
"hp6qpp7awoZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2Fze4OMjXdvaWRfW1lveYGLo6+6tLe3tK+nnZyTiX58fG50eIGEg5WPiH9pX1U0MjQ/SVRggYyWo6WliYR/dXJydI2Tm662vsezsKKXi39xe" +
"3FkYmFpWmBscHJxb394aWJcVVVFVWBseYaRsb2/vrStkYJ9eXl9l52jqq6zsq2IfXBXTEJRTUxPW2RtaXB1eHZybX13c25wdG96hp6nsLXNzMi5rqR6cmxnaGtwdZCUdYGOoaeqp7awqKGZk415e4a" +
"Mkpy0sqmhlop9cE89OTc9Q2Fze4OIjI13b2lkW1lveYGLl6OvurS3t6+nnZyTiYN+fHxudHiBhIOPiH90aV9VNDI0P0lUgYyWnaOlpYmEf3Vyco2Tm662vsTHs7Cil4txe3FkYmFlaVpgbHByb394a" +
"WJcV1VVRVVgbIaRsb2/vrq0rZGCfXl5fZejqq6zs7KtiH1wV0xCTUxPVFtkbWlwdXh2cn13c25wdHtveoaep7DNzMi5rqSZenJsZ2hrdZCUdYGOmKGnqqe2sKGZk415e4CGjJKctLKpoZZ9cE9FPTk" +
"3PUNhc3uDjI13c29pZFtZb3mBi6OvurS3t7Svp52ck4l+fHxudHh+gYSDj4h/aV9VNDI0OD9JVIGMlqOlpYmEf3l1cnKNk5uutr7Hs7CropeLcXtxZGJhaVpgZ2xwcm9/eGliXFVVRVVgbHmGkbG9v" +
"760rZGCfXl4eX2Xo6qus7KtiH1wZFdMQk1MT1tkbWlwdXh4dnJ9d3NucHRveoaSnqewzczIua6kenJsaGdoa3WQlHWBjqGnqqe2sKihmZONeXuGjJKctLKvqaGWfXBPPTk3PUNhanN7g4yNd29pZFt" +
"Zb3J5gYujr7q0t7evp52onJOJfnx8bnR4gYSDlY+If2lfVTQyND9JVIGMlp2jpaWJhH91cnKNk5ukrra+x7OwopeLcXtxaWRiYWlaYGxwcm9/eHFpYlxVVUVVYGyGkbG4vb++tK2Rgn15eX2XnaOqr" +
"rOyrYh9cFdMQk1MT1RbZG1pcHV4dnJ9d3NvbnB0b3qGnqewzczIwbmupHpybGdoa3WQlJh1gY6hp6qntrChmZOPjXl7hoySnLSyqaGWin1wTz05Nz1DYXN7g4yNd3NvaWRbWW95gYujr7qttLe3r6e" +
"dnJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpaWiiYR/dXJyjZObrra+xMezsKKXi3F7cWRiYWlaYGdscHJvf3hpYlxVVUVLVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZ" +
"G1haXB1eHZyfXdzbnB0e296hp6nsM3MyLmupHpybGhnaGt1kJR1gY6hp6qpp7awoZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2Fze4OMjXdvaWRfW1lveYGLo6+6tLe3tK+nnZyTiX58fG50eIGEg5W" +
"PiH9pX1U0MjQ/SVRggYyWo6WliYR/dXJydI2Tm662vsezsKKXi39xe3FkYmFpWmBscHJxb394aWJcVVVFVWBseYaRsb2/vrStkYJ9eXl9l52jqq6zsq2IfXBXTEJRTUxPW2RtaXB1eHZybX13c25wd" +
"G96hp6nsLXNzMi5rqR6cmxnaGtwdZCUdYGOoaeqp7awqKGZk415e4aMkpy0sqmhlop9cE89OTc9Q2Fze4OIjI13b2lkW1lveYGLl6OvurS3t6+nnZyTiYN+fHxudHiBhIOPiH90aV9VNDI0P0lUgYy" +
"WnaOlpYmEf3Vyco2Tm662vsTHs7Cil4txe3FkYmFlaVpgbHByb394aWJcV1VVRVVgbIaRsb2/vrq0rZGCfXl5fZejqq6zs7KtiH1wV0xCTUxPVFtkbWlwdXh2cn13c25wdHtveoaep7DNzMi5rqSZe" +
"nJsZ2hrdZCUdYGOmKGnqqe2sKGZk415e4CGjJKctLKpoZZ9cE9FPTk3PUNhc3uDjI13c29pZFtZb3mBi6OvurS3t7Svp52elo+Fg4J4e36ChIWFjYeAbmZdQj89PkFGTWtze4eKjH17d3Rxb25/hIq" +
"aoqussLO0sq6op56WiIN/cXJ1eXx+gI6KhXdvZklDPz5ARVpianODiY6DgoB6d3SBgYOGkpmipKqwtLKvt7Cnn42GgGxsbXN2eYmLioh+eG9RS0Q+PkBTWWFqfISLhoiIg4B8h4WFho2SmXmCjJyhp" +
"KOvqqWgm5eFhYaOkpegsLCvq6aefXNpWFJNS1teY2htc2ttbWdjXlVhX19hZmxweYOWnaOotbOuqaSeh4WEh4qOl6mrrKuoo4Z8cl5WT19eXmFkZ2tgYmRlZGJraGZkY2VaXmNqeH+GoKSoqqmol5W" +
"SkIyMm5+hpautoaGgnpqPiY+Be3VtXVtcXV9gZXR1c3FvWVVST01LTF9jaHZ8hIOHi46OjpqZl5aVlZePkpegpKa2t7a0q6WRg313bmx4eHh5en1+cG1qZlxlYFx5f4eSlpqqqaiioJ2bjIyNkZSXq" +
"66vrqyolY+IgXJtZ21raWttYWVmZ2dlY25nY2BaWUxRVVthaH2EkZWZnI6Oi4mIhoaVl52hpaCkpqmopaKrpZ6Qi4RubGpqbG18fX5+e3h0XFdSSkdUVFVYXGZsY25ydnqIh4WDgYByc3V7gIWgpqu" +
"0t7iqqaajmpagmZeVlpeLjY+RkpKeYGCgYGCgoKBgYGBgYKCgoKCgYKBgYGBgYGCgoGCgYGBgoGBgYGBgYGBgoGBgYGB5f4aRlZenp6WhnpyMi4uLkJOlrLCztbSloZ2XkYWMh357eWtsbm9xcnOAf" +
"npybGdPS0hGRUZWXWJncnZscnNzcnF9fHl5eXB0eYWLkauvs7S1tbOem5eQjZmZmpyeoaOXmZmXkZmUh4B5dGBcWlhYWmxvcnR1dGRhXlpTT1pYWVpiWmBmbHN4gZKUlJORgH9+fn+BhZuhprC0t6C" +
"gYGBgoGCgoGBgYGCgoKCgoGBgYGBgYKCgoGCgYGBgYKCgoKCgoKCgYGBgYGB5f4aRlZenp6WhnpyMi4uLkJOlrLCztbSloZ2XkYuOiYKAfXV1dnd4eXl/fnx2cmdeWlZTUFZVVlhbWl1gZWdob29ub" +
"WtpYWFhZGl0eX2DiI2PkZSXl5ebmpmXlpCRk5WYnqirsLGxqKain5qWkZCNioeHf4GCgoODiomEgX1taGNbV1RaWVlaXmBbYWJkZWtqaWdlY1lYWFtdYWBgYKBgYKBgYGBgYGCgYGBgYKCgYGCgYGB" +
"goKCgYGBgYGBgYKCgoKCgYGBgYGB8gYaPkZSenp6dm5qZkI+Qk5WfpairrrCqqqimoqGdmJCNioCAf4CBgomKiomEenZtaGNfYl5bWVlaV1lbYWJra2xramdeXFlYWGJkaGxxdnt+goaLjJSUk5KRk" +
"IiIi4yPnaCkrK6xq6yrqqOhn5qXlZKRkJCRkZKTk5OTkpCMiYaAfHl2c3FvbGxsbW1ub29vbm1samVjYVxaWWBgoGBgYKBgoKCgoGBgYGBgYKBgYGCgoGCgYGBgYGCgoKCgYGBgYKCgoGBgYGCAg4a" +
"MjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbG1tbm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSk" +
"ZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhmBgYGCgoGBgYGBgoKBgYKBgoGBgoGBgYGBgoKCgoGBgYGBgYGBgoKCgoKCgoKCAg4aMjpCSk5OTk5KRkJCQkpOVmpyfoaOlpqe" +
"npqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbG1tbm9vb21samVjYV5cWllYWFlcXmFlaGpsbW5vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVk" +
"pGQkJCRkZOTk5OSkIyJhmBgoGBgYGBgYGCgYGCgYGCgoKCgYGBgYGBgoKCgoKBgYGBgYGBgYKCgYGBgYGCAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjIm" +
"GgHx5c3FvbGxsbG1tbm9vb21samVjYV5cWllYWFlcXmFlaGpsbW5vb25ubWxsbG1vcXN2eYCDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhmCgoGBgYGBgY" +
"KCgoKBgYGBgYGBgoKBgoKCgYGBgoKBgoKBgYKBgYGBgYKCgoKCAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5yal5WSkZCQkZGTk5OTk5KQjImGgHx5c3FvbWxsbG1tbm9vb21samVjYV5" +
"cWllYWFlcXmFlaGpsbW5vb25ubWxsbG1vcXN2eYCDhoyOkJOTk5OTkpGQkJCSk5WanJ+ho6Wmp6emo6GfmpeVk5KRkJCRkZOTk5OSkIyJhqBgoGCgYGCgYKBgoGBgoGBgoKCgYKBgYGBgoGBgYKCgo" +
"GCgYGBgoGBgoGBgYGCAg4aJjI6Qk5OTk5KRkJCQkZKTlZqcn6OlpqenpqWjoZ+al5WSkZCQkZGSk5OTk5KQjImGgHx5c3FvbWxsbG1tbm9vb21samhlY2FcWllYWFlcXmFjZWhqbW5vb25ubWxsbGx" +
"tb3N2eYCDhoyOkJKTk5OTkpGQkJCSk5WXmpyfo6Wmp6emo6GfmpeVk5KRkJCRkZOTk5OSkI6MiaBgYGBgYGCgYGBgYKCgoKBgYGBgYKCgoKBgYGBgYGBgYKCgoKCgoKBgYGBgYGCAg4aJjI6Qk5OTk" +
"5KRkJCQkZKTlZqcn6OlpqenpqWjoZ+al5WSkZCQkZGSk5OTk5KQjImGgHx5c3FvbWxsbG1tbm9vb21samhlY2FcWllYWFlcXmFjZWhqbW5vb25ubWxsbGxtb3N2eYCDhpKUl5mbm5uZl5aTkpKTlJa" +
"Ym52gpKanpqWim5eSiYSAfHl3dnR1dXd4eHh3dnNwbmBgoKCgoKCgYGBgYGBgYKCgoGBgYGCgoGBgYKCgoKBgYKCgoGBgYGBgYGBgYGCAhImNkpSXm5ubmZeWk5KSkpOUlpudoKSmp6alop+bl5KJh" +
"IB5d3Z0dXV2d3h4eHd2cG5qYl9bWVZVVFVXWmBkaG9ydXl5enp6eHh3dnd6e3+Hi5CVmZ2hpqenpqSinZqYlZOSkZGSk5aYmZmZl5WSj4uBfXhua2djY2JjZGVnamtsbGxrZ2RiX11bWlpbXWNna3V" +
"5foaIi4yNjWCgoKCgYGBgYGCgYGBgoGBgYGBgoGBgoKBgYGBgYGBgYKCgYGCgYGCgYGBgYGBggISJkpSXm5ubmZeWlJOSkpOUlpudoKSmp6alop+dl5CCfHZsaWZkZWVmaGprbW1saWdkX1xaWVlZW" +
"2JmbHqAh5Wan6Klpqakop+al5WTkpOUlZeYm5ycmJaSh4J7dGxmYFZUUlFTVVxgZGtucXJ0dHRycXFxcXN5fYKIj5SbpquusrKxq6einZiTjoaDgX9/f4CBgYB/fntzb2lfWlZPTU1NT1JXYmduen+" +
"Ei4yNjo6NjIuKi42Pkpmdoamrrq6uraqhnJWHgXtvbGhmZGRkZmhqgIaNmZ6ipKampqKgnZiVlJKTk5WWmJmbnJuWk46CfHVuZ2JcVFJRUlVYX2Nna25wcnR0c3Nyc3V3eoSJkJefpay3ur28urapo" +
"pmRh393aWRgXFtbXmBiZWZnaGdmZWFgYGBhZGhtc3qLk5yssre9vr27trKrnZaOgXt2cG9ubm5ub29ubWhlYlpXVFBPUFJXW2JyeoSXn6eytri4t7WxqKOdk4+KhYSDg4KCgoF/fHVwa15ZU05KR0V" +
"GSU1aYmt+ho+WnqOnrKyrp6ShmpiWlZSUlICIkqKorrS0tK+rp6KemZWPjYuKiomKiYiGgn95bWdgU05JQ0JDRUpPVmdveYqRmKGkpqampKOenJqXl5eYmpudnZ2dmJWQg3xzWU5DOjMvLTI3QFhkc" +
"o2Yo7O3urm4tbGln5mPi4iGhoaHh4iHhIF8b2hfT0lDPjw7PUlRXXeEkq24wsnNz8/FvrWflIl1bWZjX15dYWNlamtsamlmY2BeXVxdYWx0fpWgq8DHzNDQzsm4raCDdmhRSUI/PT1ASlFYaG92gIK" +
"FhYWEhIODhYqPlICMm6i0vMTLyse7tKqWjoR9dnFtamtrbm9vb21rZ2NfW1NRUFJWXG13hJ6qtb/IztHQzMWwpJZ7b2NaUUxHRkhMVlxibXF1d3l5eXd3d3l7gIuSmqOrsrnCxMS7taqRhXZoUTorG" +
"hYXKTRCXG2AkKGtwc/R0cC5r5mPi3lybGlgYGFkZm9zc3NpZ2NhX2RkZmpweoOPp7jCys/T08O7rpeGc1BBLCEaFhYpM0JldoOntcPM2tzc0si2m45/b2ZeWVZNTlNYXW5ydXpzc3JxcHZ4eX18jqL" +
"Czt7l493WwramhXZtVU1GOzxBRk1VZHR7gYOFhoaMi4qLi42Mj5Wfq6+zs7Cmn5aLcWpbQjgoISIoL0NQYYaYpMXR2+nn4cy+ppWCcV9LQTkzLzNDTFhqdoCKmJaZmZiXmZeUk4yMjZKUnqChoJGMg" +
"3pvZF9KQjosLTJEUGZ2iZqtxdHa4ujizL6rk39tWjw4LygqLztGVHGFkpymrKmsq6imoZyTj4aEhISEjY6Niod6bWZdXFRNSEI7P05YZoybrbvJzdbe3dfJu6l8alZGfI6iws7e5ePdwramloV2bVV" +
"NRjs8QU1VZHR7gX+DhYaGjIuLi42Mj5Wan6uvs7Own5aLcWpbT0I4KCEiKENQYYaYpLXF0dvp5+HMvqaCcV9YS0E5My8zQ0xYdoCKkZiWmZmYl5mXlIyMjZKUnqCgoaCRjINvZF9KQjo2LC0yRFBmi" +
"ZqtxdHa4OLo4sy+q39tWjw4LyooKi87RlRxhZKmrKmsrKuopqGck4+GhISEhY2OjYqHem1mXVRNSEI7P0VOWGaMm63Jzdbe3dfWybupfGpWfI6iws7e4+Xj3cK2poV2bVVNRkM7PEFNVWR0e4GDhYa" +
"GhoyLi4uNjI+Vn6uvsrOzsJ+Wi3FqW0I4KCEiKC9DUGGGmKTF0dvp5+HZzL6mgnFfS0E5My8zOkNMWHaAipiWmZmYl5uZl5SMjI2SlJ6goaCdkYyDb2RfSkI6LC0yOERQZomarcXR2uLo4sy+q5N/b" +
"Vo8OC8oKi87RlRicYWSpqyprKuopqGcl5OPhoSEhI2OjYqHenVtZl1UTUhCOz9OWGZ7jJutyc3W3t3Xybupl3xqVnyOosLO3uXj3cK2ppaFdm1VTUY7PEFNVWRsdHuBg4WGhoyLi4uNiIyPlZ+rr7O" +
"zsJ+Wi39xaltCOCghIihDUGFyhpikxdHb6efhzL6mlYJxX0tBOTMvM0NMWHaAipGYlpmZmJeZl5SMjI2PkpSeoKGgkYyDb2RfVEpCOiwtMkRQZomarbXF0dri6OLMvqt/bVpLPDgvKCovO0ZUcYWSn" +
"KasqayrqKahnJOPhoSEhIWNjo2Kh3ptZl1UTUhDQjs/TlhmjJutyc3W3N7d18m7qXxqVnyOorLCzt7l493CtqaFdm1gVU1GOzxBTVVkdHuBf4OFhoaMi4uLjYyPlZ+rr7Kzs7CflotxaltCOCgjISI" +
"oQ1BhhpikxdHb4Onn4cy+poJxX0tBOTUzLzNDTFh2gIqYlpmZmZiXmZeUjIyNkpSeoKChoJGMg29kX0pCOiwtMjhEUGaJmq3F0dri6OLZzL6rf21aPDgvKCovMDtGVHGFkqasqayrqKSmoZyTj4aEh" +
"ISNjo2Niod6bWZdVE1IQjs/RU5YZoybrcnN1t7d18m7qZd8alZ8jqLCzt7l493WwramhXZtVU1GOzxBRk1VZHR7gYOFhoaMi4qLi42Mj5Wfq6+zs7Cmn5aLcWpbQjgoISIoL0NQYYaYpMXR2+nn4cy" +
"+ppWCcV9LQTkzLzNDTFhqdoCKmJaZmZiXmZeUk4yMjZKUnqChoJGMg3pvZF9KQjosLTJEUGZ2iZqtxdHa4ujizL6rk39tWjw4LygqLztGVHGFkpymrKmsq6imoZyTj4aEhISEjY6Niod6bWZdXFRNS" +
"EI7P05YZoybrbvJzdbe3dfJu6l8alZGfI6iws7e5ePdwramloV2bVVNRjs8QVBYZ3Z6fXl5eHd0eXh9gIeRm6WvuMfMz8zFppeGYFVENikhFhohLFNkdpuqr7nBxMTEvbWimYp9eXd+foCChX59dXB" +
"pXlVNRkE3NkBJVHqMnrrJ1OHi5t/TxbWIdWRFOjo0NjtDRU9ab3eGj5GRh4WDgoKKjJaco6uxt7q/urOnmothUEElJB8hKCs4S11vnq680dbRysK4rqebkHx1aWVmaHN2d3dua2ZgWlRRTkxTUlt2h" +
"ZWtvcvX3t/dfI+hw87d4uLf2Lqtn4Bzb15aWFlTV1pkaHF0cnBjX1xaWmFkcnyHnKm2zNre3uDZzZyKdl1OQTIwJTQ+SlZweYKMjH13c3B9f4SLlZKfuMPL397XvZ+MeGNRTjQuKyUtOFJeeIOLkJO" +
"EgH13g4SNlJ2aprK7ytvayr6ueWdTQT80KyguJ0BNW4SNlZybi4iEgH6LjZOkoKu9xMfU0Mm9nHxpQTMzJSUpLy06SGh1j6CipJGNioaDj5GZoKittbzBzMa7rZ6MVkU0KSQiLDY1RFVldHmLnr/J3" +
"t/a0qygk4d9dn57fYB5fX15gnpwZFlOLCUjKkBNcYOXnbC+yuTk38zApIh9c2x1dHR6fnN2dXJyaV9USjMtJys1YXSJsbTDzNHR28i8sIqCfHl8jpmdnp6Lg3haWEguJiMcJzZHW3yQr7nAs6+op5+" +
"al5aZkJ+orcPCvKWVdGFMOiolIiQ3NkVmdICXnJ2dlIB9eHqOoa25xsTM0c7Gx6KPekY4Lic4PkhTXmlrb3Frc29lY2VbZXCAscHR6Ozez8Kxn5mHdl5YR0xSWHmMoLHAyNvY0MaglYt+fYuPlJqel" +
"pWPenppRzktFhMUGjRTZo6drK2vr7Gqo52YlomTm6PBx8jAt5uLdmNPOS4mJh8pRlVkf4uSmJeFgXd0g4yUoK2tusbU1d/It6NsWktBO0dKWWNraGlmVlpPRj06LT5NX5ervdXay7yypqiemJSXkJi" +
"prq+0qZqIZFE+IBolMT1KW2dxd3mGgnRuaVxjbY6uwNHf6N/Xzb6pl4l1cGJmbHN5j42IclVFJxwWIycwPmNpfJqitbGro4eCgoWMlq95jaC+xtfOxbqvlo2IiY6ktbzBr6eaiXVvWzkuKR8oNF9se" +
"H+EhHNmYFpkaHCOkqW2yNTc6uPXtpaHbmh0dXuBh4SEgW5gXj4xJxQaJTNHZ3ucqK+hnJaHj46PlJyZtcHL4t/Xt6SBbVpLP0VHTWBbYmlmXmFVST4nKDFRZYixvsjNv7iwm5+ZmJ2msLvEyNXQxJ+" +
"LZ0M3MEFJU2ljaGhlXVNLQTs+OEdwhKe5x8/TvbKnkpmXnaaxrrjAw7m7qoBsSi8rKy9GUl1xdmheVElFPz9FeY2hvsPTx7uxj4mIjJOrtsnQ0bSnlGlkUTo4LDI9SFR0d3ZoXUU0MTJJVmZ6pam6y" +
"sjSvbGmnImIi5umvsrMxp2LdmBLSTwyNj9IVF94d3JqYFY/NzpCcIOZwcHKz83GvLGkm4aKkKKswcO+s6KBbVcyNi8zPUlWYWhseXRsWlE+QkpYjqK2ydnKyrqtoJ+amqmhrbnAxNa+q5ZXRzw2Ult" +
"mcHp+ZFpNLjYtLTYxQ1htf6yurJySdW9zfbLE1ePt29nBsLKRhoFweIKMkpapkoFtdYqduLzPx76zpoSDiaDD0eTm4cGwnYhgaGBgaFxudHVwe25dOy4RFB8uaXyLlpuGgW9mdHV9i5yvwdfa6uDRw" +
"rGBe3qFpK+8vbiYh3NeSz01NkA4Ul1ke3dvY0wtKDE+T4+ktsK1t7Kfk56WmaKot8XP1OfgwKyXXlRPanN9hoyPeGJSQDQpJCwkNVprd5OXk4x5XFdeao+3y9vm2NbPsbWmlZadn6u0ubfDtIp0SzM" +
"xNmBtd35/ZVk5KRwoLTpLYHOCioydin93YGh3n8ja5+3r43WLn7e5ybSnnYCGkaCx1uPt59qfind1c3d/ipWIioJzYEw6KBQcKTlKWX9+d0s/NjM8YHSKoLS3ubSfp52Vm5GgscHO7efatJ93YF5if" +
"4qVnZ+Cc0s3OigpMTlKWWVqfndgVEszPEt1oLTDzM60n5KIlZumxsHO1tjSxbSfjGBeYnWAnaGfl4hLNyUTKTFOX25lamliYFRLSFFLdYufw8zOybSSiICGpsbW49jSxbOfiox1c3d3goiGmIl3ZVU" +
"sJiw3bHd9eFJFOC0lJFBgcneCh3KElJ+mpbynnJZ7hJKx2uLk4NXHi393lJ2nur+gmYp6ZmFYVF5OWGhofmZXSD0bHCNAbHyNjYhYTkdFZm9/pLSmr6qhpp2ZmqGRoLvE49bIt3xzbnB2nKa0ta51Y" +
"1BRTE5VX2taZWJZWkxAOiMwP1Bhi5WRilpST1mDlbnH0Lazqp+knZyqt6rAxcLWyLeliWdmdH6jrKidjl9NPCpGTGNveWFbUUNRRj5CTEFkcn2clYyCeVhZbHyqzNXZs6eajoWdn7LAzb+/t7Wkknt" +
"5YGhyfINyhJSmpbynnJaUe4SSsdri4NXHi393dZSdp7q/oIp6ZmFYVFdeTlhoaH5mV0gbHCMwQGx8jY2IWE5HZm9/kaS0pq+qoaadmaGRoLvE4+DWyLd8c252nKa0ta6GdWNQUUxOX2taZWJZaVpMQ" +
"DojMFBhi5WRioBaUk9Zg5W5x9Czqp+SpJ2cqreqwMXCyLellolnZnR+o6yonV9NPCpGTFdjb3lhW1FRRj5CTEFSZHJ9nJWMeVhZbHyqvMzV2bOnmoWdn7LAzbu/v7e1pJJ7eWByfIOjcoSUpqW8p5y" +
"We4SSorHa4uDVx4t/d5Sdp7q/oJmKemZhWFReTlhoaH50ZldIGxwjQGx8jY2IYlhOR2Zvf6S0pq+qobGmnZmhkaC7xOPWyLenfHNudpymtLWudWNQQVFMTl9rWmViWVpMQDojMD9QYYuVkYpaUk9Zg" +
"5WnucfQs6qfpJ2cqreqt8DFwsi3pYlnZnR+o6qsqJ1fTTwqRkxjb3liYVtRUUY+QkxBZHJ9nZyVjHlYWWx8qszV2bOnmo6FnZ+ywM2/v7e1pJKFe3lgcnyDcoSUpqW8sqeclnuEkrHa4uDVx5uLf3e" +
"Unae6v6CKemZxYVhUXk5YZ2h7aV1QRScjIzM/YnuDhmtkW09iZGx4hpafqa7Aua+fmoSIkZun09nb0bGjiH13ioySmqiXmIp9bmNYUE04PkZZYHlzal8yKiUlK0lWc3+IenZvYG9sbXR+d5elr8zJw" +
"q6mioqPmbnFz9bWuq+ShHiBgoaOgIiNi4OMbV9SLzA2P0hScHZ0bUI4LylDS1hodoSBg4GJgXp3e3B9jJup0dPQv6CViYmNq7W/yXWEkqSmuaqimn+Dipajr9Dd3NaqnZB+kZOZoKixoZ6Wj4BxWVV" +
"ARUxUXX18d2NBNSQiJkNOW2mAcHFoYG1wcHJ3aXJ7j5extrSxk46LioqNp7S6wbOyr6Kap5eSjo56fYCHiZ2VjoZdVE1HRFlbZGluXl5bUWBaVFBPUEVNVWeEiY2MiXFtamhsho2gqbKpq6uouLOup" +
"KKNk5ievsHBwLy1mIV8dYGAgYiLeXp3cmt3bmVWUjtARUpscHJzcVhTSUVCWV5leG11fYKFhpaTj4t3enV/iI+VmK6ppaGGhYeRmLS8wsfJsauklI2clZWXmoqOkJGOnYyCeVNOS01Ram9zdnZcV1B" +
"CUU5NUVdJUlpibYSEf3x4X2BkaXKQmayzt6SinpSkoaCho6ahpquwv721sKmUjYiCfIqKjY+Rg4J+eXNsc2ReWkdISlFVZmpramdWUk1GRFJWWmFhaG91enx9i4iGg3V2foOKoKetoKCgYGBgYGCgY" +
"GCgoKCgoGBgYGBgYGCgYGBgoGBgYKCgoGBgYGBgYKBgYGBgYHl/h46Tlpimo6GcjIyQlJmtsri8wbSyqaSdn5uYlZWWio6Rkp2bloiBa2RdWFRgYWNpbGBgX1tgW1ZRTk1NRElQXXB2fX5+b21qaGd" +
"2eYSKkpOZn6Ols7KtqaaTk5SanrG2ur2+raqll5GYjYqIh3p9foGDkImEfW5ZUk1JR0dYXGBnXF1bWFVbV1RTU0dLV15lgYaKjYx9e3l3YGBgoKCgoGBgoKBgYGBgYKCgYGBgYKBgYKCgoGBgYKCgY" +
"GCgYGCgoKCgoGBgYGB5f4eTlpign56ai4qLjI6Ro6aqsbOnp6ajqqahnZmXlISEhYeWl5eWlJF/e3VrZm9oZmVYWVtdX2FicG9taFZTTkxMTFteYWpuZW5xdISEg4KBgH9yc3V9j5Wfo6ifoKGgnpy" +
"oo6GfkJGTl5qdra6vr6ualoyHgoeEgYB/gHN1dneEgn94dG9cV1RQTFpaXmFkXV9hYmJib2tpoGBgYKBgYGBgYGCgYGBgYGCgYGBgYGCgoKCgYGBgoGBgYGBgoGBgYGBgoKCgoKB5fYOMjpGgoJ+cj" +
"IuKiouNoaSor7Kmp6ekop6oo5uYlYSEhIaVlpeXlZOBfXhtaHFpZ2VXWFpcXmBhcHBuaVhVT01MTFtcX2hsY2xvc3aEhIOCgYB7e3yAgoWLjpKVmJqcn5+fnp2cmZiYl5eXmJqcnqGio6Sjop+cmpe" +
"UkY6Jh4WDg4OEhISFhISDf316dHFtZ2VjYWBgYGFiYGCgoGBgoGBgoKBgYGBgYGBgYGBgYKCgoKCgoKBgYGCgoGCgYGCgYGBgYGBgYGCAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5qXl" +
"ZKRkJCQkZGTk5OTkpCMiYaDgHx5c3FvbGxsbW1ub29vbm1samVjYVxaWVhYWVpcXmFlaGptbm9vbm5tbWxsbG1vc3Z5gIOGiYyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRk5O" +
"Tk5OSkIyJoKBgYKCgoGBgoKBgYGBgYGCgYKBgoKBgoKCgYGBgYGBgoKCgoKBgYGBgoGBgYGCAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYaDgHx5c3Fvb" +
"GxsbW1ubm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vbm5tbWxsbG1vc3Z5gIOGiYyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRkpOTk5OSkIyJhmBgYKCgoGCgoGBgYGBgYGC" +
"goKCgYGBgYGBgYKBgoKCgoGBgYGBgoKCgYKCgoKCAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYaDgHx5c3FvbGxsbW1ubm9vb21samVjYVxaWVhYWFlcX" +
"mFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRkpOTk5OSkIyJhmBgYGBgYKCgoGBgYGBgoGBgoGCgoKBgYGBgYGCgYKCgYGBgYGBgYKC" +
"goKCgoKCAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbW1ubm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDh" +
"oyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJGRkpOTk5OSkIyJhqBgYGBgYGBgoKBgoKBgYGCgoGBgYGBgYKCgoKCgYGBgYGBgYGCgoGBgYGBgYGCAg4aMjpCTk5OTk5KRkJCQkpO" +
"VmpyfoaOlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbG1tbm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp" +
"6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhmCgYGBgYGCgYGBgYKCgoKBgYKBgYGBgYKCgoGBgYKBgYKCgoGBgYGBgoKCgoKCAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5qXlZOSkZCQkZG" +
"Tk5OTkpCOjImGgHx5c3FvbGxsbG1tbm9vb21samVjYV5cWllYWFlcXmFqbG9xa2xubm5udXR1d3h0dnl8gIiSlpyen5qamZiWlZubmpucnZeanJ2epaWkoqCdj4yIgX57fn58fHx8dXV1dHF2dG5ra" +
"GCgYKBgYGBgYKCgoKCgoGBgYGCgoGBgoGBgYGCgYKCgoKBgYGBgoGBgoKCgoKB8f4OKjY+YmZmamZiRkJCRkpucnqGjpKGioqGgnp+cmZaSkIaCgX9+hoWFhYSEe3l2cG1pamdkYF9YWFhaW19naWx" +
"sbWZlZGJiaWhpamxwbHB4e3+Nj5KTlZWWjo6OjY2VmJmbnaCbnqGio6mop6KfnJKPjImGhYuKioqKg4KBf357e3h0bWpnXFtaWlpbY2ZoaWRkZGRjYmdmZaBgYGBgYGCgoKCgoKBgYGCgYKCgoKCgo" +
"GBgYKBgYKCgoGBgYGCgYKCgYGBgYGB8f4OHio2PoaKhnp2bi4uLjY+go6aoq62fn5qXkpaSjIiEgH5tbW1vb3B+fnx6d3RiWlZTTltbXmFkaF9jZ25xc4ODgoGAf3FydHZ9gZSdoqatoaGhoJ+clqG" +
"emZiXiYqLjo6PnZybmJGMeW5pZV1oZ2ZmZ2ltYWJlZWRwbmtpZ2VkVVdZYGR4goeMkJSIiouLioiVlJSVl5qPkpWcn6GxsK+ppZOOioWBeniEhISFh3l5d3Vybnh0b2djYE5OTlJVZmpucXR5em1sb" +
"Gtpd3d4eXx/eX6DjI+SoqKioJ+dm4uLi46QoKaoq6ytn56ZlZGFjIV7eHV0ZWZnamxtfHx6c3BrVVFOTExNT2VqcX6EfISGiIiHhpOPjo6Pg4ePlJmdobK0tLKvl5GLf3p1cn18fH5/gXV2dHBtaHJ" +
"sZ2NbWVdMT1NeY3h9goaKjY1+fHp5eIeJkJSan6WcoKeoqLKuqZ6Yk458end2eHmKi4yKiIVzbWhiV1JcWFdZX2NaX2VqbnSEhYOCgX5vcHBzd3uHmqGssLOnpqSgnJiTl5SQjY2NgoOFeX+Gi5GVm" +
"KinpaCdm4mIiIqMjpGmqKqrqqeQioN9dm93bmxpamxgZGdoamp3dXBsaWNSUVBTWF9nfYWVnKGZmZiTkIyJlJOSlZicl5ueoJ+cn5iPh353b1dVVFdaXnR3eXt7eXdiXlpVVFVqb3d+h4+YmJyfoJ6" +
"boZyYlZOSk4mMkJaYmaWhnJWNhX1fWFNOTlBlaW5zd3p7bmxpYmBdamtueYGJg4yTmqSmtK+rppyYhoOBgYKHipufn56Ykn12bWVdUExYWFtfam9na29xcnFvenmBiZabnp+sqqefm5eFhIWKjZGVp" +
"qippqKdgHhvX1lUXV1fYmZrb2lsbWxqZ25raWhoam1rcnqLk5qws7KxrqqljYmFgoKEl5qdn66wro6FeWBUSU5LS01TW2RianJ6enmGgHt2c3J0anJ9lZ+qts3Mwbetopd4b2VkZGyHi5OVlJGKbmR" +
"PRj40M0tZZHB7iJOIk5STjIaWjImJjJCXipukqrGwrLClmIx/dGpKSUpTWWCBhYaGg313VExHQ0VKcXyKo663vqytqp+Xj5WQjY6Rlpx1gY6hp6qntrChmZOPjXl7hoySnLSyqaGWin1wTz05Nz1DY" +
"XN7g4iMjXdvaWRbWW95gYuXo6+6tLe3r6ednJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpaWiiYR/dXJyjZObrra+xMezsKKXi3F7cWRiYWVpWmBscHJvf3hpYlxXVVVFVWBshpGxvb++tK2" +
"RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZG1haXB1eHZyfXdzbnB0e296hp6nsM3MyLmupJl6cmxnaGt1kJR1gY6Yoaeqp7awoZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2Fze4OMjXdvaWRfW1lve" +
"YGLo6+6tLe3tK+nnZyTiX58fG50eH6BhIOPiH9pX1U0MjQ4P0lUgYyWo6WliYR/dXJydI2Tm662vsezsKKXi39xe3FkYmFpWmBscHJxb394aWJcVVVFVWBseYaRsb2/vrStkYJ9eXh5fZejqq6zsq2" +
"IfXBkV0xCTUxPW2RtaXB1eHZybX13c25wdG96hp6nsLXNzMi5rqR6cmxnaGtwdZCUdYGOoaeqp7awqKGZk415e4aMkpy0sq+poZZ9cE89OTc9Q2Fqc3uDjI13b2lkW1lveYGLl6OvurS3t6+nnZyTi" +
"YN+fHxudHiBhIOPiH90aV9VNDI0P0lUgYyWnaOlpYmEf3Vyco2Tm6Sutr7Hs7Cil4txe3FpZGJhaVpgbHByb394aWJcV1VVRVVgbIaRsb2/vrq0rZGCfXl5fZejqq6zs7KtiH1wV0xCTUxPVFtkbWl" +
"wdXh2cn13c29ucHRveoaep7DNzMjBua6kenJsZ2hrdZCUdYGOmKGnqqe2sKGZk415e4CGjJKctLKpoZZ9cE9FPTk3PUNhc3uDjI13c29pZFtZb3mBi6Ovuq20t7evp52ck4l+fHxqbnR4gYSDj4h/a" +
"V9VNDI0OD9JVIGMlqOlpYmEf3l1cnKNk5uutr7Hs7CropeLcXtxZGJhaVpgZ2xwcm9/eGliXFVVRUtVYGyGkbG9v760rZGJgn15eX2Xo6qus7KtiH1wZFdMQk1MT1tkbWlwdXh4dnJ9d3NucHRveoa" +
"SnqewzczIua6kenJsaGdoa3WQlHWBjqGnqqmntrChmZONeXuGjJKYnLSyqaGWfXBPPTk3PUNhanN7g4yNd29pZFtZb3J5gYujr7q0t7evp52onJOJfnx8bnR4gYSDlY+If2lfVTQyND9JVGCBjJajp" +
"aWJhH91cnJ0jZObrra+x7OwopeLcXtxaWRiYWlaYGxwcm9/eHFpYlxVVUVVYGyGkbG4vb++tK2Rgn15eX2XnaOqrrOyrYh9cFdMQlFNTE9bZG1pcHV4dnJtfXdzbnB0b3qGnqewzczIwbmupHpybGd" +
"oa3WQlJh1gY6hp6qntrChmZOPjXl7hoySnLSyqaGWin1wTz05Nz1DYXN7g4iMjXdvaWRbWW95gYuXo6+6tLe3r6ednJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpaWiiYR/dXJyjZObrra+x" +
"MezsKKXi3F7cWRiYWVpWmBscHJvf3hpYlxXVVVFVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZG1haXB1eHZyfXdzbnB0e296hp6nsM3MyLmupJl6cmxnaGt1kJR1gY6Yoaeqp7a" +
"woZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2Fze4OMjXdvaWRfW1lveYGLo6+6tLe3tK+nnZyTiX58fG50eH6BhIOPiH9pX1U0MjQ4P0lUgYyWo6WliYR/dXJydI2Tm662vsezsKKXi39xe3FkYmFpW" +
"mBscHJxb394aWJcVVVFVWBseYaRsb2/vrStkYJ9eXh5fZejqq6zsq2IfXBkV0xCTUxPW2RtaXB1eHZybX13c25wdG96hp6nsLXNzMi5rqR6cmxnaGtwdZCUdYGOoaeqp7awqKGZk415e4aMkpy0sq+" +
"poZZ9cE89OTc9Q2Fqc3uDjI13b2lkW1lveYGLl6OvurS3t6+nnZyTiYN+fHxudHiBhIOPiH90aV9VNDI0P0lUgYyWnaOlpYmEf3Vyco2Tm6Sutr7Hs7Cil4txe3FpZGJhaVpgbHByb394aWJcV1VVR" +
"VVgbIaRsb2/vrq0rZGCfXl5fZejqq6zs7KtiH1wV0xCTUxPVFtkbWlwdXh2cn13c29ucHRveoaep7DNzMjBua6kenJsZ2hrdZCUdYGOmKGnqqe2sKGZk415e4CGjJKctLKpoZZ9cE9FPTk3PUNhc3u" +
"DjI13cw==\"},\"stay\":{\"f0\":104.59,\"n\":8610,\"b64\":\"AAAAUICAgIBQUICAUFBQgICAUFBQUICAUFBQgICAUFBQgICAUFCAgIBQUFCAgICAUFCAgIBQUICAgICAUICAgFBQgICAgIBQgICAgF" +
"BQgICAgFBQgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUFCAUICAUICAgICAUFCAgFBQUICAUICAUICAgFBQUICAgFCAgICAgFBQUICAUFCAgICAUFCAgICAUICAgICAUICAgIBQgICAgICAgFCA" +
"gIBQgICAgFBQgFCAgIBQgICAgFCAgFCAgFBQgICAgIBQgICAgFBQgICAgFCAgIBQUIBQgIBQUFCAgIBQUICAgFBQUFCAgIBQUICAgIBQUICAgIBQUICAUIBQUICAgFCAgICAUICAgFCAgFCAgIBQUI" +
"BQgIBQgFBQgIBQUIBQgIBQgFCAUFCAUICAgIBQgFCAUFBQgICAUFCAgFCAgIBQgFCAUFCAgIBQgICAUFCAgIBQgFBQgIBQgFCAUFCAUIBQgICAUIBQgICAgFCAgICAUICAUFCAgFBQgIBQUIBQUFCA" +
"gFCAgIBQgFCAgICAgFCAgICAUICAgICAUIBQgIBQgFCAUFCAUICAUFBQgFCAgIBQgICAUFCAgFCAUFBQgIBQgFBQUIBQUICAUIBQgICAgFCAUICAgICAUICAUICAUICAUIBQgICAgFBQgICAgFCAgI" +
"CAgFCAgICAgFCAgICAUICAgICAUIBQgFBQUIBQgFBQUICAgFBQUICAgFBQUICAgFBQgICAUFBQgICAUFBQgICAUICAgICAUFCAgIBQUFCAgIBQUIBQUIBQUICAgIBQUICAgIBQgICAgFBQgICAgFBQ" +
"UICAgIBQgICAgFBQgIBQUFCAgIBQUFCAgIBQUFCAgIBQUFCAgFBQgIBQgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgFBQUICAUFBQUICAUFBQgICAUFBQgFBQgICAUIBQUICAUIBQgF" +
"BQgIBQUFBQgFCAUICAgIBQgFBQgIBQUICAgFCAUICAgIBQUICAgIBQgICAgIBQgIBQUIBQgICAgFCAgICAgIBQgFCAgIBQgFCAgFCAgFCAgFBQUIBQUFBQgICAgFBQgIBQUFCAgICAgFCAgFBQUFCA" +
"gFBQgICAgFCAUFCAgFBQgICAgIBQgICAUFBQgICAUIBQgICAgFCAUFCAUFCAgICAUFCAgIBQUFCAgICAUFCAgIBQUFCAgFBQUICAgFBQUICAgFBQgICAgFBQUICAUFBQgIBQgFBQUICAUICAgFCAUF" +
"BQgICAUICAUICAUFBQgICAUFBQgICAUICAgICAUICAgIBQUICAgFBQUIBQUIBQgICAgIBQUICAgFCAUIBQUFBQgICAgFBQgICAgIBQgFCAgFCAUIBQUFCAgFCAgFCAUIBQUFCAgFBQUICAgIBQUIBQ" +
"gFBQUICAgFBQgICAgFCAgICAUFCAgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUICAgICAUICAUFCAUICAgIBQUICAgIBQgFCAUFBQgICAUFBQgICAUFBQgIBQgICAgICAUFCAgIBQgIBQgICAUF" +
"CAgFCAUFBQgICAUFBQgIBQUFBQgIBQUICAgIBQUICAUIBQUICAUIBQUICAUIBQgFBQgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFBQgFBQgIBQgFBQgFCAgFBQgFCAUICAUFCAUIBQUFCAgFBQUFCA" +
"gFBQUICAgFBQUICAgFBQUICAgFCAgICAUIBQUICAUFCAgFCAUFCAgICAUFBQgICAgFCAgIBQUFCAgICAUICAUFCAUFBQgIBQUIBQgICAUICAgICAUFCAgIBQUICAUFCAUICAgIBQUICAgIBQgFCAUF" +
"BQUICAUFBQgIBQUFBQgICAUFBQUICAUICAUICAUFBQgIBQUICAgIBQUICAgIBQUICAgFBQgIBQUIBQUICAgIBQgICAgFBQgICAgFBQgIBQUFCAgICAgFCAgICAgIBQgIBQUFCAgICAgFCAgIBQUIBQ" +
"gIBQUFCAgFCAgFCAgFCAgFCAUIBQUFCAgFBQUICAUIBQUICAgFCAgICAUIBQUICAgFCAgIBQgFBQUIBQUFCAUFCAUIBQgIBQUICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFCAgIBQUFCAUICAUF" +
"BQgICAUFCAgIBQUFCAgIBQgICAgIBQUICAgFBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgICAgFBQgICAgFCAgICAgFCAgICAUFCAUICAUFCAgICAUFCAUICAUFCAUIBQUICAgFBQUIBQgFCAgICA" +
"gIBQUICAgIBQUICAUIBQUIBQgICAgFCAgFCAgFCAUIBQUIBQUIBQUIBQgIBQUIBQgICAgFCAgFCAgFCAgIBQUICAgFCAgFBQgFCAgFBQgFBQUICAUICAgFCAgIBQUICAUIBQUICAUIBQUICAUFCAgI" +
"CAUFCAgIBQUFCAgIBQUICAgIBQgFCAgICAUICAgIBQUICAUFBQgICAUFCAgFCAUFCAUIBQUFBQgFCAUFCAUIBQgICAgFCAUFCAUIBQgICAUIBQgICAgFCAgIBQUICAgIBQgFCAgICAUICAUFCAUFCA" +
"gIBQUIBQgIBQgICAgIBQgICAUFBQgFCAgIBQgICAUFBQgICAUFBQgICAUICAgICAUFBQgICAUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFCAgICAgFBQgICAUFCAgICAUFCAgICAUF" +
"CAgFBQUFCAUIBQUICAgFCAgICAgFBQUICAUFCAgICAUFBQUIBQgFCAgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQUIBQgIBQUICAgIBQgICAgIBQUICAUFBQgIBQUFCAUICAUFBQgIBQ" +
"gIBQgICAUFCAgIBQUFCAgIBQgICAgFBQUFCAgFBQgICAgFBQgICAgFCAgICAgFBQgICAUFBQgICAUFCAgICAgFCAgICAUFCAUICAUFCAgFBQUICAgFBQUIBQgFBQUICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAh4aGhoaGhYWFhYSEhIODg4KCgoGBgYCAgH9/f35+fX19fXx8e3t7e3p6enp5eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl5enp6e3t7e3x8fX19fX5+fn9/f4CAgIGBgoKCgoODg4SE" +
"hIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhoWFhYSEhIODg4KCgoKBgYCAgH9/gICAgIGBgYKCgoODg4SEhIWFhYWGhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWFhY" +
"SEhISDg4OCgoKBgYCAgH9/f39+fn19fXx8e3t7e3t6enp6eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5enp6ent7e3t8fH19fX5+fn9/f4CAgICBgYKCgoODg4SEhISFhYWGhoaGh4eHh4eH" +
"h4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWFhYWEhISDg4OCgoKBgYGAgIB/f4CAgIGBgYKCgoODg4OEhISFhYWGhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoaFhYWEhISDg4ODgoKCgYGAgI" +
"B/f39+fn59fX18fHt7e3t6enp6eXl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXp6ent7e3t8fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWFhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eH" +
"h4eHhoaGhoaFhYWEhISDg4ODgoKCgYGAgIB/f3+AgICBgYGCgoKDg4OEhISEhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWFhISEg4ODgoKCgYGAgICAf39/fn59fX18fHx7e3" +
"t7enp6enl5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHl6fH18e3l3d3Z3eHl9foCAf358e3p6e3x+goOEhIOCgH9/f4CCg4eIiYiHhYOCgoOEhYeKi4uJiIeEg4SEhoeJi4uLiIeFg4KCg4WGh4mJiIWD" +
"gX9/f4GDhIWFhIOAfnyAgYOFhISDgYB/f4CBhYaIiYiHhoWDgoODhYiKi4uKiYeGhISEhYeJiouKiYeGhIOCg4SFiImJh4WDgoB/f4CBgoSFhIKAfnt7ent8fX6AgIB9e3l3dnd4eXp7fX18eXd2dH" +
"R1dnh5enx7enh2dXR1dnd5enx9fHt5d3d3eHl7fX6AgH9+fHt6gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAeXh4iYyQh4iIhI+MiYd4eH1/kJSUhH57eIGBgnd5fH6OjYt2cm9tfH6Ag3h6eniDfHpqeXx/gYKQjol4dnZ3iI+S" +
"hoeHhYOLiId6fH+TlZaWhoOAeoaFhnt9goORkI2KeHJxcYKEh319fISBfntra2twgYSHeHdxbnl3d3hscnV4iIeFcW9tbHt9gHl8fn+LiYNzcnN1d4mQkoWEgX6HhoZ5e36ClZaWhIF+eYaGiIt/go" +
"aGkoyJeHNzdIeKjICAf32EgH1tbnB1hoiIiHh1bmx4eHpudXd4h4WDgG1rant+gXp8fHx6hoN3aGp1fJKdnp2MhoF7hYaKl5CVmJWemJCKeHd6f3mAh42aloyHdXR2eoCdoqWVkIp9h4aHioGHkZKf" +
"lY6GbWtrboKHjJCAfG5nb2prYmduc3eFgnxiXVtfcnmBh4yAfXhzeHd4dXyEip2fnpWBfHd4ipedo5iVkIqRioZ2eX6Jm52YkXx0bWlneH2CfX99c3pzbWlaXGZtgYeGg2lkX11sb3WEfYKEgYqAfG" +
"1ucnmAnKCij4qEeoaHi5CXj5eXlJaPiHNzdo6Tl5mXhoBwanNxdHl2ent6hX94XVpZYHR7hoh6d3JsZ25vc255hJCkoJl1gIuVk6OTjId1fIaQr7a5s5WKdnBuipKaoY+Pi3eAdGZmVWNsc4uGfnVr" +
"TUhLUnKIkJV9dm5ndnR2h5KJm52cpJuSjHV3fI6ss7SvpXlwaGV7gIeWhYV5b3hkX19NVF1ndIqHeG9STVBYeISPmIuIgXJsfoWOmZqgo6GwqJ6NdHSAiKavrqeefXJmW3B1g4t7eXNpdGlgXF9SXH" +
"B2jod/d1tWVVmAjJiolZKFfXaHh4uSkpuiorGnkopvbnF3f6KlpJV1aVVRZnJ6g3R2dXBdaWF1gIuVk6Obk4yHdXyGr7a55tCVfGhcWI+gr7+WhlQ6Izg0OklyYWxoWWlHPkBMPlh0oKnMs6GSZGx9" +
"k6rj8vPkznlmW4ORoby/lIRsUTY3NDtfUWNuZldnVEU/TkBckKGqwbCgkGVkbZWt5ffx4Y93ZFtZhJKyvb6BaU4fNjQ9TWFTbW5lZVJEQlBEXnqSo8q/r49kZYGYr/T38N+ljHVZWoWltL2Rf2VLMR" +
"41P1BkZW5tU2NQQz5DUmJ9lc3JvpyNZGVxg5vo9ffdo4lhWVqHlqe1bomhtrLJpZWOjnWGnMXQ89e/pFZOTmebqbKxp5Q+JhQwPE97i3FwaFdGTEhQeXCMsbaxx7WjlY93ibXH8+jVu6FmVk1ZaZyy" +
"saVVPCQTCzI+aH2NcGZWM0tJUWN7dKWytsWzoo2PeKK3yPTy5tKeZFRQW2qrs6+kbFM4EQsyVGp/cm9lU0IxSlNlf5Kms6/DsZ+SjZGOpLn08eS1nGFTTVFcoK2yoWpQHxALNEJXbI9yb1I/U0pUaH" +
"qUqbO2rcGekY18kKbL9PDjzLOZUk1RbqKubomhsLayyaWVjnWGnMXQ8+rXv6RWTk5nm6mxp5RZPiYUMDxPe4txaFdGNExIUHlwjLG2sbWjlY93iZ+1x/Po1btmVk1ZaZyrsrGlVTwkCzI+aH2NcXBm" +
"VjNLSWN7dKWytq/Fs6KNj3iit8jy5tK4nmRUUFtqq7OvbFM4IhELMlRqf3JvZUIxSlNlf3eSprOvw7GSjZGOpLnJ9PHktZxhTVFcoK2yr6FqUB8QC0JXbI9yb2NSP1NKVGh6lKm2rcGvnpGNfJCmy/" +
"TwzLOZYFJNUW6irm6JobayyaWVjo51hpzF0PPXv6RWTk5YZ5upsaeUPiYUMDxPZXuLcWhXRkxIUHlwjKKxtrG1o5WPd4m1x/Pz6NW7ZlZNWWmcsrGlklU8JAsyPmh9jXBmVjNLSVFje3SlsrbFs6KN" +
"j3iLorfI8ubSnmRUUFtqnquzr2xTOBELMlRqf45yb2VCMUpTZX+SprO2r8Oxko2RjqS59PHk0LWcYU1RXKCtsqFqUB8QCzRCV2yPcm9SP1NKVGiBepSptq3BnpGNfJCmvMv08MyzmVJNUW6irrNuia" +
"G2ssmllY51hpyyxdDz17+kVk5OZ5upsrGnlD4mFDA8T3uLcWhXRjRMSFB5cIyxtrG1o5WNj3eJtcfz6NW7ZlZNUFlpnLKxpVU8JAsyPlJofY1wZlYzS0lje3SPpbK2xbOijY94orfI9PLm0p5kVFBb" +
"aquzr2xTOCIRCzJUan9yb2VCMUpJU2V/kqazr8Oxko2Reo6kufTx5LWcYU1RXG2grbKhalAfEAtCV2yBj3JvUj9TSlRoepSps7atwZ6RjXyQpsv08MyzmWBSTVFuoq5uiaG2ssm3pZWOdYacxdDz17" +
"+kaVZOTmebqbGnlD4mFAwwPE97i3FoV0ZMSFBgeXCMsbaxtaOVj3eJn7XH8+jVu2ZWTVlpnLKxpZJVPCQLMj5ofY1wZlZDM0tJY3t0pbK2xbOik42PeKK3yPLm0p5kVE5QW2qrs69sUzgRCzJAVGp/" +
"cm9lQjFKU2V/d5Kms6/DsZKNkY6kufTx5NC1nGFNUVygrbKhalA2HxALQldsj3JvUj9TSkpUaHqUqbatwZ6RjW58kKbL9PDMs5lSTVFebqKubomhtrLJpZWOjnWGnMXQ89e/pFZOTmebqbKxp5Q+Jh" +
"QwPE97i3FwaFdGTEhQeXCMsbaxx7WjlY93ibXH8+jVu6FmVk1ZaZyysaVVPCQTCzI+aH2NcGZWM0tJUWN7dKWytsWzoo2PeKK3yPTy5tKeZFRQW2qrs6+kbFM4EQsyVGp/cm9lU0IxSlNlf5Kms6/D" +
"sZ+SjZGOpLn08eS1nGFTTVFcoK2yoWpQHxALNEJXbI9yb1I/U0pUaHqUqbO2rcGekY18kKbL9PDjzLOZUk1RbqKubomhsLayyaWVjnWGnMXQ8+rXv6RWTk5nm6mxp5RZPiYUMDxPe4txaFdGNExIUH" +
"lwjLG2sbWjlY93iZ+1x/Po1btmVk1ZaZyrsrGlVTwkCzI+aH2NcXBmVjNLSWN7dKWytq/Fs6KNj3iit8jy5tK4nmRUUFtqq7OvbFM4IhELMlRqf3JvZUIxSlNlf3eSprOvw7GSjZGOpLnJ9PHktZxh" +
"TVFcoK2yr6FqUB8QC0JXbI9yb2NSP1NKVGh6lKm2rcGvnpGNfJCmy/TwzLOZYFJNUW6irm6JobayyaWVjo51hpzF0PPXv6RWTk5YZ5upsaeUPiYUMDxPZXuLcWhXRkxIUHlwjKKxtrG1o5WPd4m1x/" +
"Pz6NW7ZlZNWWmcsrGlklU8JAsyPmh9jXBmVjNLSVFje3SlsrbFs6KNj3iLorfI8ubSnmRUUFtqnquzr2xTOBELMlRqf45yb2VCMUpTZX+SprO2r8Oxko2RjqS59PHk0LWcYU1RXKCtsqFqUB8QCzRC" +
"V2yPcm9SP1NKVGiBepSptq3BnpGNfJCmvMr08tC4n1ZQU26hr7duiJ+2ssmml41ygpetws7138mxYVVTZ5qqt7q0plI5IzI3RW6AampeSzhKQD5ZTWiYpKi4qJaJhGRwnLLp9/DfjXdnX2BpnLzFx4" +
"lyVyc+O0JRY3dtbmVAUD82QDBJZHyPvbWmhnxWboSc2Ov19tqii2pnbK29zK+kkHdbQlJHT19gbHJgTltGNi8xLkdgh7Guk4R1SUxWab/W6PDmsIZ3bW6ZqLzbvrqVe2FaU1Vgb11td3CCVUAxDBku" +
"Rl9yoZ+SgUE8QGWhu+Tq57imk39ulaJuiJ+2ssm3ppeNcoKXws7138mxdWFVU2eaqrq0g1I5IxQyN0VugGpqXktKQD5GWU1omKSouKiWYWRwhJyy6ffw3413Z2CMnLzFx5yJcldKPjtRY1RtbmVUY1" +
"A/Nh0wZHyPvbWmlWNZVm6Ev+v19reii3dqio+tvcyvpJBbZVJIR088YGxyg3FbNgwOGi5HYKqxrpNhUkxWjL/W6PHNw7CGd5CZqLy4vrqslZ6EWlMyTF1tmpOCbFVADgwZLoKVoZ9vXk1BPECIobvB" +
"x8Smk6KWkZWiboiftrLJppeNjHKCl8Lx9d/JsWFVU2eaqre6tINSOSM3OkZmdmZqZ15PTUI/UUhfipe6uLCklmdnb5Km1uzq4baikH9wkJu2wsihkXtkaVlNUVxPaG5scF5MPDMVHD5TaJ6fmmZaUF" +
"JejqS7zdvDuaqJmpWisMG0v8O/vKePbWZLX2x4f5uUhl0tHRUdLG19iIyIY1Q6M1BpfZWhrLCsoa+gj5CZn7HCz+XYxrCccGNoc6qzt6aUYTYoIT5HVWaBamdPP0o5PEdZU2l+lJSpj4R8coicqrCu" +
"waWZkHqGmb3l6+jdzbd0aGNvl6W2tI9+aFI8PjxEYHBiaWJUYFBCOkM2THiJr6yilGJfZG+Blsjm6uatm4l2kpqntsPNr6OPfWlbVVxOW2lxcntqVjYTFS9DWIaTmJZkWExGT3unvc/Zv7qujp6Wna" +
"q7vsfHwc25o3xxUmFue6ShlG08KRwXGiRic4GHY1Y5L0dLV2qBkJ+nn6+hi4qQgJOmudDr4r+sfWpsdYGrt762p3VINipIUmJxfmpqVkZQNzU7QVZsfomNpY6BdnKInLCuwaWZkI96hpm95evdzbd0" +
"aGNlb5eltrSPaFI8PjxEUGBwYmliVFBCOkM2TGJ4ia+sopRiX2SBlsja5urmrZuJdpKatsPNtK+jj39sXlZeTmlydYBwXUo5FRMnOmmLkZJkVUk/PEBokaa7trWuk6CWkpSekbXEzOLVwZhtZGFncn" +
"+ytrJ5ZE4qIz5GU2NyaWlhQ05AOD5NRVtvgKumnIJ3V2R0ic/d5eXcs6KCenmntsW+wLiplH+FZmNmYW95fZGCbllHHBUeLG59h4dgU0Vyh5qvrcGmmJB3gpOmuePr4tTBfnFpjZmmsru/nX1nUUpF" +
"RlxPXWxpX2xZSDsYIDBabZiinJFoW1FPYI2jzdrFu6ycjJyWl629scXFu7KdiHhtUFVsep+flYQ9Kx4XGT5NcX6GZVhKL0RFTV5ybZSeoa+hlIRqc5eqvebs6d+gjn9yd5y5xcuupZaCVGBUVF9san" +
"FxandlUjUvFjFFWZKWlIt+VElDSXSgtci7t62fj4KVmaW2vMjMvsq1oIx/XWZzgK+wqYZVPyEeIklYaXdqZlxyh5qvrcG0ppiQd4KTuePr4tTBkX5xaY2Zpru/nX1nUVlKRUZcT11saV9ZSDs0GCAw" +
"Wm2YopyRW1FPU2CNo83axbusnJyWl629sb3FxbuynYhtUFVsep+jn5WEPSseGT5NcX6Ga2VYSi9ERV5ybZSeoZ2voZSEanOXqr3k4tvOo5SHe36htsHHppuKeGRxZF9lUmZtb31vX0IdGx8oN0Z+hY" +
"ZeU0g8PWJugZOloqWkkqKZlJmJl6e2wuPd0bKHfHZ8hay2vr+VhnNPQ1daY25dZWlncoSUpqW8p5yWlHuEkrHa4uDVx4t/d5Sdp7K6v6CKemZhWFReTlhiaGh+ZldIGxwjQGx8ho2NiFhOR2Zvf6S0" +
"pq2vqqGmnZmhkaC7xOPg1si3fHNudpymtLWuhnVjUFFMTl9rWmViWVpMQDo6IzBQYYuVkYpaUk9RWYOVucfQs6qfpJ2coaq3qsDFwsi3pYlnZmx0fqOsqJ1fTTwqRkxXY295YVtRUUY+QkxBUmRyfZ" +
"yVjHlYWWx8qszV2dazp5qFnZ+ywM2/v7eqtaSSe3lgcnyDcoSUn6alvKeclnuEkrHa4uTg1ceLf3eUnae6v6CZinpmYVhUXk5YaGh+dGZXSBscI0BsfI2NiFhOR0Vmb3+ktKavqqGmnZmaoZGgu8Tj" +
"1si3fHNucHacprS1rnVjUFFMTlVfa1plYllaTEA6IzA/UGGLlZGKWlJPWYOVp7nH0LOqn6SdnKq3qsDFwtbIt6WJZ2Z0fqOsqJ2OX008KkZMY295YVtRQ1FGPkJMQWRyfZyVjIJ5WFlsfKrM1dmzp5" +
"qOhZ2fssDNv7+3taSShXt5YHJ8g3KElKalvKeclpR7hJKx2uLg1ceLf3d1lJ2nur+ginpmYVhUV15OWGhofmZXSBscIzBAbHyNjYhYTkdmb3+RpLSmr6qhpp2ZoZGgrrvE49bIt3xzbnacprS1roZ1" +
"Y1BRTE5fa1plYllpWkxAOiMwUGGLlZGKgFpST1mDlbnH0LOqn5KknZyqt6rAxcLIt6WWiWdmdH6jrKidX008MCpGTGNveWFbUVFGPkJMQVJkcn2clYx5WFlsfKq8zNXZ\"},\"alive\":{\"f0\":104.6" +
",\"n\":10486,\"b64\":\"AAAAfIyeusPR1dHMtKqflYyGhoGBgX1/f3t3d29lW1A3MCsrMD9ZaHqKlaSzx8zVz8nApZuRioKFgoCCg39/fXN0a2FWTEMuKio0RFFwgZKcrLjDztXSxbyrlo6Gg4KAgoKF" +
"f358d3BmXEc/MSwqKzBKV2eJmqO+xszO1NDJt62bioN+gIGChIV/f3l1bWJYTTsuKiotMj1eboCiqrfJzc7Szca8qJeOgH16gYOEf357eHFqZ1NJQCwqKzdBVmV3h5mxvMbOzdDBuK2kk4uDe3qAg4" +
"WGfIyerLrD0dXRzLSqn4yGhoOBgYF9f397d3dlW1BHNzArKzA/WWh6laSzx8zV08/JwKWbkYKFgoCCg39/f31zdGtWTEMuKiotNERRcIGSrLjDztXSzcW8q5aOhoOCgIKFf39+fHdwZlxHPzEqKzA3" +
"SldniZqjvsbM1NDJt62bkoqDfoCBgoV/f3l1bWtiWE07LiotMj1eboCQoqq3yc3Ozca8qJeOh4B9eoGDhH9+e3FqZ11TSUAsKis3QVZ3h5mosbzGzs3Qwbitk4uDe3qAgoOFhnyMnrrD0dXRzMS0qp" +
"+MhoaBgYF9f39+e3d3ZVtQNzArKzA/SlloepWks8fM1c/JwK+lm5GChYKAgoN/f316c3RrVkxDLioqNERRcIGSnKy4w87V0sW8q5aOhoCDgoCChX9+fHdwZlxSRz8xKiswSldniZqjsb7GzNTQybet" +
"m4qDfoOAgYKFf395dW1iWE1EOy4qLTI9Xm6Aoqq3yc3O0s3GvKiXjoB9eoGDhIZ/fntxamdTSUAsKisvN0FWd4eZsbzGzs3QysG4rZOLg3t6gIOFhn98jJ66w9HV0cy0qp+VjIaGgYGBfX9/e3d3ZV" +
"tQRzcwKyswP1loepWks77HzNXPycClm5GChYKBgIKDf399c3RrVkxDNC4qKjREUXCBkqy4w8nO1dLFvKuWjoaDgoCCgoV/fnx3cGZcRz8xKiswN0pXZ4mao77GzNTQycG3rZuKg36AgYKFf399eXVt" +
"YlhNOy4qLTI9T15ugKKqt8nNzs3GvLOol46AfXqBg4R/fnt4cWpnU0lALCorN0FWd4eZqLG8xs7N0MG4rZOLg397eoCDhYZ8jJ66w9HV1dHMtKqfjIaGgYGBg31/f3t3d2VbUDcwKyorMD9ZaHqVpL" +
"PHzNXTz8nApZuRgoWCgIKDf399enN0a1ZMQy4qKjREUV9wgZKsuMPO1dLFvKuglo6GhIKChIWAgH57fXRsYkw8MygoKT5IVmVwgJCuucnR0c25saiflpeRiomKhoeJj4uHdm1aT0M5MCwrLTs/TW59" +
"jaOxvMTLxMC0raydmJSRiYmLj5eZlpKMcmdbTkE+NCkoIzI9S3OCkqCtt7e+vbq2sKmdko+Pj5CafIucuMHQ1NLNtq6jmpGRjISEhYGChIGFgHlvZlQ+Ni4uLjJEUFhoeomZvMXL0MbBs6upoZmTj4" +
"SFhoqLk4+LhHVqX1M8OjEqKy87R1Vmf46dt8C+w8C7ta6mmo+Mi4uMj5qbm4+JgmtfWk1BNy8gISU5TFh1hIqXoquywMC+tqulm5icm5qbnJmampmcl4d9a19RRjsxLCktLDRLWG17iZahqa6xsbWy" +
"qaWbl5eXmaOlp6ujoZmRj3hrX1I/NCwiKCo3QUVgbXqGmKGosKqqpaKmfIuZprK8ytHQzruzq5qalI6LiICAgIGIhoNxamJYT0VENjIxLzU+V2x7mKWqtbzBxcrGwKyknZGNkY+Pj4+KiomEhX9tY1" +
"JIPTUuLS0xOEJPbHqQnam0vL6/vra4sqWglZGPj4+YmZmSkIx/dnNoXFFHLSgkJjI5T11jgY6aq7O6vre1sqijpZ6dnJWVl5efoJ+Zj4l4cG1jWVFINTIxNUFIWmNncXyEjaCjpqGfnpugn5+fn5qf" +
"oaStrq2empOKgH5yXVNKNjMyPUFHWFljbHV7inyHkqeuu8LCwbezrqijnpmRiIaEhYuLioqHd3NsY1xURzs3NTY4PFJaZXaAi56ssra4uLGsqKSjn52SkpKSk5ubmZeNgXpyZl1URDg0MjI0P01WYG" +
"95g5uhpqqspaShn6Sgn5+Zm52foKmpp6SZi4N5amFWTT44NDI6PkxUVmlye4qRlZmXlpaWm5qcnZ+bn6Kms7a2s6mjk4uHcGVaSkZAPD8/QkpITlxicXZ8gX6EhYaPkJGOkJSXm6estLi0t7e0s62l" +
"nYyDeGRjWk1CPz9ASk58hZCisLa+v7i1sa2wqqahko+Lh46MiomAe3hydW5oYU1HQkJAQEVCSVBZYnSHkJmhpqq1tbWzsaeknpugnZ2clZSTmpiWkoF7dGRjW0xGOjc2NjdGTFReZ3GDkZidoqWhoq" +
"KopqSjnJycpqeoqamioZuXmIqCeF5WTUZGQj49NzpFUltrcnR6gYaLmJmalZWVlp6goqWopKqsrrW0saGbkouHfnRgUUk+O0BCRElGTVNabnN5f3t9f4eIiYuFh4qNkJ6jp6irrrm5uLazp6KVlY18" +
"hIuZpaqusbOtrKquqaWilZOQj5SUk4uKioeMioJ+cWxmYGFWUk5CQUJNUVZbWmFodoOJk5eTl5efn56el5aWl6Cho6ChoqOqqaajn5OHgIBxamNQTEhGTExNSk5SW2dsdHdzdnh5goOEhYCChZKWmp" +
"+doaaut7m6srCooqOclY6GcWtlY2BdVVVWWGFjZWZgYWJiaGdnZ2JjZnBzeH2DiZCeq7C5tba3trS4sKulkoyHhIB8enFwb210c3JpaGNgZGFdWlhMS0tVWFxfZm11fIuSfISLmaWqsbOtrKqurKml" +
"opWTkJSUk4uKiomHjIqCfnFmYGFWUk5EQkFCTVFWWmFodoOJjpOXk5eXn5+enpaWl5igoaOgoaKjqqmjn5OOh4CAcWpjUExITExNSk5SV1tnbHR3c3h5goOEhX+AgoWSlpqdoaaut7m6urKwqKKjlY" +
"6GcWtlZ2NgXVVVVlhhY2ZgYWJiYmhnZ2diY2ZzeH2Dg4mQnquwubW2trS4sKulmJKMh4SAfHFwb210c3JyaWhjYGRdWlhMS0tTVVhcX2ZtfIuSfISLkpmlqrGzrayqrqmlopiVk5CUlJOLioqHjIqG" +
"gn5xZmBhVlJOQkFCTVFWW1phaHaDiZOXk5eXn5+fnp6WlpegoaOgoaKjo6qpo5+Th4CAcWpjVlBMSExMTUpOUltnbHB0d3N4eYKDhIWAgoWIkpaanaGmrre5urKwqKKjnJWOhnFrZWNgXVVVVldYYW" +
"NmYGFiYmhnZ2dhYmNmc3h9g4mQnquwtrm1tra0uLCrpZKMh4iEgHxxcG9tdHNyaWhlY2BkXVpYTEtLVVhcX2ZtdXyLknyEi5mlqrGzra2sqq6ppaKVk5CUlJOSi4qKh4yKgn5xZmBhW1ZSTkJBQk1R" +
"VlphaG92g4mTl5OXl5+fnp6XlpaXoKGjoKGio6qpo5+TjoeAgHFqY1BMSExMTU9KTlJbZ2x0d3N4eYKCg4SFgIKFkpaanaGmqq63ubqysKiio5WOhnhxa2VjYF1VVVZYYWNlZmBhYmJoZ2dnYmNmc3" +
"h9g4OJkJ6rsLm1tra0uLSwq6WSjIeEgHxxcG9ubXRzcmloY2BkXVpYTkxLS1VYXF9mbXyLkpl8hIuZpaqxs62sqq6sqaWilZOQlJSTi4qKh4yKhoJ+cWZgYVZSTkJBQkNNUVZaYWh2g4mTl5OVl5ef" +
"n56elpaXoKGjpaChoqOqqaOfk4eAgHlxamNQTEhMTE1KTlJXW2dsdHdzeHmCg4SFgIKFiJKWmp2hpq63ubqysKyooqOVjoZxa2VjYF1cVVVWWGFjZmBhYmJoaGdnZ2JjZnN4fYOJkJeeq7C5tba2tL" +
"iwq6WYkoyHhIB8cXBvbXRzcmloZWNgZF1aWExLS1VYXGFfZm18i5J8hIuZpaqusbOtrKquqaWilZOQj5SUk4uKioeMioJ+cWxmYGFWUk5CQUJNUVZbWmFodoOJk5eTl5efn56el5aWl6Cho6ChoqOq" +
"qaajn5OHgIBxamNQTEhGTExNSk5SW2dsdHdzdnh5goOEhYCChZKWmp+doaaut7m6srCooqOclY6GcWtlY2BdVVVWWGFjZWZgYWJiaGdnZ2JjZnBzeH2DiZCeq7C5tba3trS4sKulkoyHhIB8enFwb2" +
"10c3JpaGNgZGFdWlhMS0tVWFxfZm11fIuSfISLmaWqsbOtrKqurKmlopWTkJSUk4uKiomHjIqCfnFmYGFWUk5EQkFCTVFWWmFodoOJjpOXk5eXn5+enpaWl5igoaOgoaKjqqmjn5OOh4CAcWpjUExI" +
"TExNSk5SV1tnbHR3c3h5goOEhX9/gYSRlZqkoqauuLq6ubesoZqSh391XldQTEhNTE5RTldbaHF1eXR3eHqDg4OFf4GHipaan6Sqq6+xurm2pqCZiIZ9dWxkVktIRk1PUVNXXGFtcXZ8d3l7e4OEhY" +
"eBhIeLm6ClqKyvfISOlp6rsbi5s7CsqKahnJiMiYWAhoSDfHt5eH17dnNuXVhUUk9NTUdKVFpqcnuDhpeepbW4urGvrKikpqGXk4iCgH6EhIN8e3p4eXZyaV1YT0tPTUxMTk9UXHN8hZCXoKWrtbm6" +
"uK+oo56blpKPhIKAfYSDgnt5dXJ2bWhjV1NOSktKS1JQV2lzhI6Yoquyt7rCwL2ypJ2VjYWGenVyZ2Zmbm9vcHFqaWdkaWViYVlZW15pbnWFhpChqbfCxMa+vLeyqaCWgnJpWlVYU1NVUFNXW3yGkK" +
"Oqt77Av7ayrqiim5SIe3dxb3V0dHR1bm5tcW9sZltYVlRSWV1gZWtzfJegqbG5t7y/vsO5samQhnxzcmtlXVNSVFZfZmlsamxtbnV1dXRtbnFzfoiOlJSboqi5vb++tbCjmpeNg3lvVU5ISEZHTUtQ" +
"Vl1kcn6EiIeJipKSkZGRiouOkJqhpKekpqalqaahlIV8aF9dQDkzKSwwN0BSXnmFi6GpsL+/vry3q6WYkpOKh4N6e3p7e4KBfXpvZF5YU09MSUFCRlNbbYaToLG7xMl8iZevuMfPz828tayjn5aLen" +
"NmYF9eZ2lqZ2hoaGdsa2ZjYlpbXm1zfIWQk56yusHQ0c+9taqfkIt9YlZFNjMxPUJIUFlcZniAjpianZaUlJKRlpaXmJOYm56oqqino5iRf3VxW1FIMi4tOD1FTltnboqWo77EycTCvrixqaeUjIRx" +
"bGltbm5vcGtrampoaWZjVVNTUlRdY3F5hJSfqsTL0NPTy8a1q6WKfW9QRz86MTc6RUxVZG54kZidoqOcm5mWk5WUk5ONjpKTm5ubmpeFfnZ8i5q1v83T1dXSvbOpkIp+amJcUE5NTltfY21xbnN0dX" +
"x7e3t6dHZ9go+dpKuysbW4t7u1pJmMaVtOPjYwLi0wLkFOXIGQnre5wMXGxsq9tayQhnxsbWhmZWRlYmRmcnNzcnFoZmRjYmpscHx9hpmjs7rCx8rCvrejnZBxY1VBNi4pLTA1SFRbeIaTr7i+wsO7" +
"ua6nppaOiHZycG5vdnZ4eHhwbWtqZmJfW1pSVFhddX+Ko6exu8PI09HMxaeai2xkV0o/NzIaHic/VGaHlp6os7m+fI6iws7e5ePdwramloV2bVVNRjs8QU1VZGx0e4GDhYaGjIuLi42IjI+Vn6uvs7" +
"Own5aLf3FqW0I4KCEiKENQYXKGmKTF0dvp5+HMvqaVgnFfS0E5My8zQ0xYdoCKkZiWmZmYl5mXlIyMjY+SlJ6goaCRjINvZF9USkI6LC0yRFBmiZqttcXR2uLo4sy+q39tWks8OC8oKi87RlRxhZKc" +
"pqyprKuopqGck4+GhISEhY2OjYqHem1mXVRNSENCOz9OWGaMm63Jzdbc3t3XybupfGpWfI6issLO3uXj3cK2poV2bWBVTUY7PEFNVWR0e4F/g4WGhoyLi4uNjI+Vn6uvsrOzsJ+Wi3FqW0I4KCMhIi" +
"hDUGGGmKTF0dvg6efhzL6mgnFfS0E5NTMvM0NMWHaAipiWmZmZmJeZl5SMjI2SlJ6goKGgkYyDb2RfSkI6LC0yOERQZomarcXR2uLo4tnMvqt/bVo8OC8oKi8wO0ZUcYWSpqyprKuopKahnJOPhoSE" +
"hI2OjY2Kh3ptZl1UTUhCOz9FTlhmjJutyc3W3t3Xybupl3xqVnyOosLO3uXj3dbCtqaFdm1VTUY7PEFGTVVkdHuBg4WGhoyLiouLjYyPlZ+rr7OzsKaflotxaltCOCghIigvQ1BhhpikxdHb6efhzL" +
"6mlYJxX0tBOTMvM0NMWGp2gIqYlpmZmJeZl5STjIyNkpSeoKGgkYyDem9kX0pCOiwtMkRQZnaJmq3F0dri6OLMvquTf21aPDgvKCovO0ZUcYWSnKasqayrqKahnJOPhoSEhISNjo2Kh3ptZl1cVE1I" +
"Qjs/TlhmjJutu8nN1t7d18m7qXxqVkZ8jqLCzt7l493CtqaWhXZtVU1GOzxBTVVkdHuBf4OFhoaMi4uLjYyPlZqfq6+zs7CflotxaltPQjgoISIoQ1BhhpiktcXR2+nn4cy+poJxX1hLQTkzLzNDTF" +
"h2gIqRmJaZmZiXmZeUjIyNkpSeoKChoJGMg29kX0pCOjYsLTJEUGaJmq3F0drg4ujizL6rf21aPDgvKigqLztGVHGFkqasqaysq6imoZyTj4aEhISFjY6Niod6bWZdVE1IQjs/RU5YZoybrcnN1t7d" +
"19bJu6l8alZ8jqLCzt7j5ePdwramhXZtVU1GQzs8QU1VZHR7gYOFhoaGjIuLi42Mj5Wfq6+ys7Own5aLcWpbQjgoISIoL0NQYYaYpMXR2+nn4dnMvqaCcV9LQTkzLzM6Q0xYdoCKmJaZmZiXm5mXlI" +
"yMjZKUnqChoJ2RjINvZF9KQjosLTI4RFBmiZqtxdHa4ujizL6rk39tWjw4LygqLztGVGJxhZKmrKmsq6imoZyXk4+GhISEjY6Niod6dW1mXVRNSEI7P05YZnuMm63Jzdbe3dfJu6mXfGpWfI6iws7e" +
"5ePdwramloV2bVVNRjs8QU1VZGx0e4GDhYaGjIuLi42IjI+Vn6uvs7Own5aLf3FqW0I4KCEiKENQYXKGmKTF0dvp5+HMvqaVgnFfS0E5My8zQ0xYdoCKkZiWmZmYl5mXlIyMjY+SlJ6goaCRjINvZF" +
"9USkI6LC0yRFBmiZqttcXR2uLo4sy+q39tWks8OC8oKi87RlRxhZKcpqyprKuopqGck4+GhISEhY2OjYqHem1mXVRNSENCOz9OWGaMm63Jzdbc3t3XybupfGpWfI6issLO3uXj3cK2poV2bWBVTUY7" +
"PEFNVWR0e4F/g4WGhoyLi4uNjI+Vn6uvsrOzsJ+Wi3FqW0I4KCMhIihDUGGGmKTF0dvg6efhzL6mgnFfS0E5NTMvM0NMWHaAipiWmZmZmJeZl5SMjI2SlJ6goKGgkYyDb2RfSkI6KisuNkNRaI6hs8" +
"zX3uHk29DBsaB1ZVhDREFESlBQWWFodH6AgH92cnJzdoGIj6OtsMDFyMrDuq2ci3JMOy4gHR0pLjxMX3GDq7fBy8TCta2jmJCJhHl3dnyPocPO3eLf2M+6rZ+Ac29eWlhTV1pfZGhxdHJwY19cWmFk" +
"aXJ8h5yptsza3trTybSikH1VSzwmIRokLjpIX3B/nKanr7CuraehlpOKiYmLjZmbnZqPiXZrX1lMQjgtJSg6R1aElqm7xNHa4d7fx7ipfm9hVUtFSElNUllgZnBze3t6eHZsa2x0gYqfqrW4wcjMyt" +
"PIqZeETT0uKigpLjhDQmBseJeanJmUg4B+fH6Vnaa7tr/GxsHGuauZcVA+IhskKjI9S01caoSMoaSin4mEgoJ5i56/yd7f2tKsoJOHfXZ+e32AeX19eYJ6ZFlONiwlIypATXGDl7C+ytPk5N/MwKSI" +
"fXN1dHR2en5zdnVycmlfSjMtKSosNF5ugaqtvdTZ6OXc0sWZi31oYmxtcXN3bXBxbHVtWlFJMC4xQ11tf5SmucvU2+jh17qrjn5wZV1jZGZudGlsa2hwaWFYSjc1PERQf5GktsnI1N7c5c6/r39wY1" +
"hRTltgZWppa2thZ11TSkI+MjpGaIqexdPe2NTNwsO1po2FcXBzd4+TkpGLg2pNPjF5jKDAyNvc2NDGoJWLfn2LlJqeopaVj3p6aUc5LRMUGiU0U2aOnaytr6+xqqOdmJaJk5ujwcfIwLebdmNPSzku" +
"JiYfKUZVZIuSmJmXhYF3dIOMlKCtusbO1NXfybmlbltJMjo5O0JLVVxkam55dWljYFBSV2GMnK/R3trf2dDDwK6ceWxUTU5Ra3J3empkXVNJPz47PU1MXYaZu8vY4eXQx7ufkpSDgH+Bd32Bh5SQfn" +
"JjNyogGRcoL0xeco2dq8bFwbqwp5GIiY2tuMHRxcK7rZ2KeY2gvsbXzsW6lo2Ih4mOpLW8wa+nmnVvW0g5LikfKDRfbHiEhHNuZmBaZGhwjpKlyNTc7erj17aWh25odHuBh42EhIFuYF4+MScUGiUz" +
"R2d7nKivoZyWh4+OlJyZprXBy+Lf17ekgVpLP0ZFR01gW2JpZ2FcUkhBLi80TV+Bq73Mzc3IwLSpq5iTko2Vnau7ubOpmohSPi4nJSc6SElYZnF4iYV/cV5cZG57rb/Q3ejf3s2/vJiJfGBfYmhvdo" +
"mLh39WRzgeJiMnMD1OaHuNpLe4eY2gsb7D08e7sY+JiJOrtsHJ0NG0p5RpZFE6OCwyPUhUdHd2aF1FNDEyVmZ6kKWpusrI0r2xpomIi5Kbpr7KzMadi3ZLSTw1MjY/SFRfeHdyYFY/OTc6QnCDmcHB" +
"ys3GvL6xpJuGipCirMHDvrOigW1XMjYvMz1JVmFoeXRsY1pRPkJKWI6ittfQ0tDIvK+jmZOVjpanr7+9taqaYk47ISssPEpYV2NrbmlvZldRRFNhdImsv9Dj5NK8rZ+WkY+Rl5ObqKu2oZF8RTMlGR" +
"wxPUtaaHmNob7D08e7saWPiYiTq7bJ0NG0p5R/aWRRQEAwRVFce3lyZllLKBweJlxxhqugpaSflqGQjY+NnK3M1u/t5NfFiXdrX3d+kZqeg3hoVlZENCUmGjdIWISIhoB4WU9GSFCHm7DAys/NxrrC" +
"pp2ZipSgttLU0MS0oWBNPkVHTmNvY2hnYVdPQTUtHShNYnadq7O0qouBdHOOp7jJ0tnb18vRvpiKgGZrdYajpaKYimM7KRsmKzVUZF5ob29rbWNaVkZRd4y2yNfe4L6xo4yGmqayv7Z1ip24vM++s6" +
"aEg4mSoMPR5ObhsJ2IYGhgYGhcZ250dXtuXTsuERQfLlZpfIubhoFqYG5zf5ClpbnJ1ebcva2hgoaQnanK0c7Cm3BaSExNU19qYWlqYVNHNysTGyo9UWWLm5qUamBZXn+Qus7e0tXRx72toZebkKm1" +
"vNPOwrCFWkg3OD5qdn6CamFTMiIrKDA/UWV2gYaalH91WV5qe7rO3ufq0ceomIyXm6W+tby+ua2whW9dNzg+VXZ+f3ZoQzIiFigwP2Z6doaFf3V/dW5zant1i5+3ucnAtKedgIaRsdbj7efas5+Kd3" +
"Vzd4qViIqCc3VgTDooFBw5Sll/fndtSz82MzxgiqC0t7m0n6edlpWbkbHBzu3n2rCDdWtnaW+fqKyJfWtHOEpGSFFcWGBiV2dZQjw+KTZHWZOanZGHYVdZY4yfsMLXvLehlKWdoqy4qba+vdDAnI2B" +
"XmRtnKOjn5OEVjQpJElUYXhhYVtQQ1NCQUhJW22GpaSdk4mBYWh1s8TT3tq1qJqOhZ+nssq3u7CirJqIe3NYYWt8m5eBcF4yJiAgcoSUpqW8p5yWe4SSorHa4uDVx4t/d5Sdp7K6v6CKemZhWFReTl" +
"hiaGh+ZldIGxwjQGx8ho2NiFhOR2Zvf6S0pq2vqqGmnZmhkaC7xOPg1si3fHNudpymtLWudWNQQVFMTl9rWmViWVpMQDo6IzBQYYuVkYpaUk9RWYOVucfQs6qfpJ2coaq3qsDFwsi3pYlnZmx0fqOs" +
"qJ1fTTwqRkxXY295YVtRUUY+QkxBZHJ9nZyVjHlYWWx8qszV2dazp5qFnZ+ywM2/v7eqtaSSe3lgcnyDcoSUn6alvKeclnuEkrHa4uTg1ceLf3eUnae6v6CZinpmYVhUXk5YaGh+ZldIPRscI0BsfI" +
"2NiFhOR0Vmb3+ktKavqqGmnZmaoZGgu8Tj1si3fHNucHacprS1rnVjUFFMTlVfa1plYllaTEA6IzA/UGGLlZGKWlJPWYOVucfQtrOqn6SdnKq3qsDFwtbIt6WJZ2Z0fqOsqJ2OX008KkZMY295YVtR" +
"Q1FGPkJMQWRyfZyVjIJ5WFlsfKrM1dmzp5qOhZ2fssDNv7+3taSSe3lgaHJ8g3KElKalvKeclpR7hJKx2uLg1ceLf3d1lJ2nur+ginpmYVhUV15OWGhofmZXSBscIzBAbHyNjYhYTkdmb3+RpLSmr6" +
"qhpp2ZoZGgu8Tj4NbIt3xzbnacprS1roZ1Y1BRTE5fa1plYllpWkxAOiMwUGGLlZGKgFpST1mDlbnH0LOqn5KknZyqt6rAxcLGuaqcj3JtcXiBo6SiemxcPzZGRkpSXFpgYllkWUQ/PSw0QE9tjJSW" +
"kXNlYGBkg46dvMe6u7WsrKSfnqKUnrO7v83Dtpd1a2V1hJKkprmqopp/g4qWo6/Q3dzWqp2QfpGToKixoaGelo+AcVlVQExUXWR9fHdjQTUkIiZOW2l2gHBxaGBtY2Noa3qJmKWsxL20q4eEhpa2ws" +
"7X29u2qpyBjoqOlYiRlpiWmIp7XFI4O0FLcnd5dm9QRC4nJURPXWVwd3l5c4FybWxlcH+fq8jMy8a9lY2IjKmzytPYw721qJ+SiICDdISKjo2Uj4d0a01CQEFdYmhtcV1dVlBLVVJSWEpTZW51j5KS" +
"kYpyb29yeJ2mr7i+ra6ppJ51f4iVmK6sqaWhhoWHkZi0wsfJybGrpJSNnJWVl4qOkJKRjp2MgnlTTktNUWpvc3Z2XFdQQlFOTVFXUlpiaW2EhH98eF9gZHKQmaOss7ekop6UpKGhpZWboqitxsTAsa" +
"iKe3d0dIuOkpiZg3lxaGphW1dVV0RPVFlycm9kXkQ/PD0/YGlyhHZ6fXt4hYOChIh5gJOcpMLDwbidl5KOjY2prrS9qqmgmZCbkYmCZmZocHOKiYaAeFpRSUVCT1FVWVVZXF5eXVtjYF1bTVBbYWl/" +
"h42SeX+Hk5aYpqOhnIyMjpCUmbK4vMG0sqmknaWfm5iVloqOkZKdm5aQiIFrXVhUYGFjaWxgYWBfW2BbVk5NTURJUFZdcHZ9fn5tamhndnl+hIqSk5mfpbOyrammk5OUlpqesbq9vq2qpZeRmJKNio" +
"h6fX6Bg5CJhH12bllSSUdHWFxgZ1xdXFtYVVtXVFNHS1deZXuBhoqNjH15d3ZgoGBgoKCgYGBgYGBgoKCgoGCgYGBgYGBgYKBgoGBgYKBgYGBgYGBgYKBgYGBgeX+Hk5aYpqOhnpyMjJCUmbK4vMG0" +
"sq6ppJ2fm5iVloqOkZKdm5aQiIFrXVhUYGFjaWxgYWRjYVxnY11bWUtMT1JWaW12en1ycnJwb3x7fHx+hHqAio+UqausrKucmpWTkZ6eoKSnnJ6ho6OhramgnJd/fHl1g4SFhoeIenl3cG11a2diX1" +
"1OTVBSVWlrbW9hYF9cWlhiYWJlaF+goGBgYKBgoKBgYGBgoKCgoKBgYGBgYGBgoKBgoGBgYGCgoKCgoKCgoGBgYGBgeX2DjI6RoKCfnZyMi4qLjaGkqK+ypqenp6SeqKObmJWEhISFhpWWl5eVgX14" +
"bWhxbWlnZVdYWl5gYXBwbmlYVVJPTUxbXF9obGNsb3N0doSEgoGAcXJ0e42Sl5yhpp6goaCdqaSioJ+QkZKWmZuur6+snJiUjoqEiYaCf4BydHV2d3x7enZ0cWtpZWBeXVtbXF1eYGFlZmdoaGhgYG" +
"CgYGCgYGBgYGBgoGBgYGCgoGBgYKBgYKCgoGBgYGBgYGBgoKCgoGBgYGBggIOGjI6Qk5OTk5OSkZCQkJKTlZqcn6Gjpaanp6ajoZ+al5WTkpGQkJGRk5OTk5KQjoyJhoB8eXNxb2xsbGxtbW5vb29t" +
"bGplY2FeXFpZWFhZXF5hZWhqbW5vb29ubm1sbGxtb3N2eXyAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYZgYKBgYGCgYGCgoKBgYGBgYGCgYGBgYKBgoG" +
"BgYGBgoKCgoKBgYGCgoKBgYGBggIOGjI6QkpOTk5OSkZCQkJKTlZeanJ+jpaanp6ajoZ+al5WTkpGQkJGRk5OTk5KQjoyJhoB8eXNxb2xsbGxtbW5vb29tbGplY2FeXFpZWFhZXF5hZWhqbG1ub29u" +
"bm1sbGxtb3FzdnmAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYZgYGBgoKBgYGBgYKCgYGCgYKBgYGCgYGBgYKCgoKBgYGBgYGBgYKCgoKCgoKCggIOGjI" +
"6QkpOTk5OSkZCQkJKTlZeanJ+jpaanp6ajoZ+cmpeVkpGQkJGRk5OTk5OSkIyJhoB8eXNxb2xsbGxtbW5vb29tbGplY2FeXFpZWFhZXF5hZWhqbG1ub29ubm1sbGxtb3FzdnmAg4aMjpCTk5OTk5KR" +
"kJCQkpOVmpyfoaOlpqenpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYZgYKBgYGBgYGBgoGBgoGBgoKCgoKBgYGBgYKCgoKCgYGBgYGBgYGCgoGBgYGBggIOGjI6QkpOTk5OSkZCQkJKTlZeanJ+jpaanp6" +
"ajoZ+cmpeVkpGQkJGRk5OTk5OSkIyJhoB8eXNxb21sbGxtbW5vb29tbGpoZWNhXFpZWFhZXF5hZWhqbG1ub29ubm1sbGxtb3FzdnmAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZOS" +
"kZCQkZGTk5OTkpCOjIlgoKBgYGBgYGCgoKCgYGBgYGBgYGCgYKCgoGBgYKCgYGCgYGCgYGBgYGCgoKCggIOGiYyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6ajoZ+cmpeVkpGQkJGRk5OTk5OSkIyJho" +
"B8eXNxb21sbGxtbW5vb29tbGpoZWNhXFpZWFhZXF5hY2Voam1ub29ubm1sbGxsbW9zdnmAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImgYKBgYKBgoGCg" +
"YKBgYKBgYGCgoGCgYGBgYKBgYGBgoKBgoGBgYKBgYKCgYGBgYICDhoyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRkpOTk5OSkIyJhoB8eXZzcW9sbGxtbW5vb29ubWxqZWNhXF" +
"pZWFhZWlxeYWVoam1ub29ubm1sbGxsbW9zdnmAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5yal5WSkZCQkZGTk5OTk5KQjImgYGBgYGBgoGBgYGCgoKCgoGBgYGCgoKCgYGBgYGBgYGCg" +
"oKCgoKCgYGBgYGBgYICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRkpOTk5OSkIyJhoB8eXZzcW9sbGxtbW5vb29ubWxqZWNhXFpZWFhZWlxeYWVoam1ub29ubm1tbGxsbW" +
"9zdnmAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5yal5WSkZCQkZGTk5OTk5KQjIlgYGCgoKCgoGBgYGBgYGBgoKBgYGBgoKBgYGCgoKCgYGCgoKBgYGBgYGBgYGBgYICDhoyOkJOTk5OS" +
"kZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJGRkpOTk5OSkA==\"},\"three\":{\"f0\":104.78,\"n\":5272,\"b64\":\"AAAAUFBwcHBwcHBwcHBwcHBQUFBQUFBQcHBwcFBQcHBQcHBQcHBwcHBQcH" +
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
"N/gYN7eXd0eHZ1dXBzeXyFh4aEenh1dHt8fn6BhIeNjImHhHt6e3yJjI+Li4qIhYmGg3x9goSOkZGQh4SBfoB/f4J+gYSFi4mHg3lzcnF6fX99fn57f3x5dnRtbnF0gIKDe3l2c3h2dXZxdXt+hoeG" +
"g3p4dXR8foCAg4aHjYuJh4R7enx+i46QjIuJh4SIhXx/goaNi4eFe3p5eXuIi46Li4qGioeIh3l6fYGEmZqbl5OAdnJwfHx9gId7fn58h356dXJiYmNpbX+Fh4d1cm5qZ3Rzd3t/e3+CkpGPjIiFdX" +
"R1eI+TmJ2Qj4yJhYGIhoZ7foKIipmVko2IdXFua3p9g4aJfHt4dX56dXBvYmhscIWHiIeFdHBqaGd4fIGKgYSGh4aSi4iFdnd5gYWYm52enYqGgXqFhYeKf4KGiImUkIyCfmxpamyAg4aIiXp4cGxo" +
"cG9vZ2twdHh6iYeFgW1ranl9goWIiJaQjYp3dnd9j5OYm52ejYqGfYeFhIV6fYGEhpWTj4aBbmhnaHh7foKChHZxbWdsaGZnam9mbXN6g4WUkI2KhHR1d3p/hZ6jp6qpl42IgXx4hIOGiYyEhoaBfY" +
"V+d3FsZlhZYGVqgYOEg4F+bGViYWR2fImPlpuRkpKOioaNi4qOg4iRlZeYpaKekYuEbGloa25/goWHiHZybWFcWGNkZ2xyeHB6fX9+iYV/fXxvcnZ8iI6iqKmnoI2Ig358eomMkJaZjYqHgnx1fHVs" +
"amp5f4aPkZGbl5SQjIp8f4KHkaOmpqSfjIV/eG5reHp9gIZ6e3p3c25xbGdjZFhiaG50eImLioiEcG1tcHR5jZSaoKiamaWeloeBkI2MjI6UmJqGhH9waF1fWFNQT1FWUFhicXZ6kI6Lh4SCgYV0e4" +
"yVnqvExcTAurGflnhraGZpbYWIiouKg311UElCOzw/WWFqdYmRmYyMi4WCfnt7kJOdo6u4qKuppZ2KgIqBd3FsamxaYmZpa2lldW9pY1pZWk5WYHaAipKtsbKuqqWHg4GDhoqPdX+Km5+ioLGroJyY" +
"lpaXhY6Tl5uaq52ViX90amFDQkNMUll6foCAfXp2XVpYWl5ljJahtLvAwcGppJaPh3yPjZGUl5udn4mCe3JeVWBTUFBSV11lYWhvd3h4iISBf35/gnmBi52lq7HEwLqyqqCOc21pamxzdo2MioR+dm" +
"5QQj07PkNLc32Hj5ebnoiFgnx5eJGWnKOrsrmsraufl4x3g3p0b21tcmFla2xrZWBuZ2FcWFhbTF9pdIiPlq6wrqyjnpqBgYOLkZa1t7e0sKmfdWtgdX+Km5+ioqCxq6CcmJaXhY6Tl5qbmqudlYl0" +
"amFDQkNHTFJZen6AgH16XVpYWFpeZYyWobS7wMGppJ6Wj4d8j42RlJedn4mCe3JpXlVgU1BQV11lYWhvdHd4eIiEgX5/gnmBi5SdpauxxMCyqqCOc21raWpsc3aNjIqEdm5QSEI9Oz5DS3N9h5ebno" +
"mIhYJ8eXiRlpyrsrmsraumn5eMd4N6b21tcmFlaWtsa2VgbmFcWFhbTFRfaXSIj5awrqyjnpqCgYGDi5GWtbe3sKmflnVrYHV/ipufoqCxq6agnJiWl4WOk5ebmqudlYl/dGphQ0JDTFJZen6AgYB9" +
"el1aWFpeZYyWoau0u8DBqaSWj4d8j42OkZSXnZ+JgntyXlVgWVNQUFddZWFob3d4eIuIhIF+f4J5gYudpauxxMC6sqqgjnNtaWpsc3aNjoyKhHZuUEI9Oz5DS2lzfYeWmoWAfHdycoqPl5+pu6ywra" +
"igoZiPiYWDhHZ6f4F/e391a2FYUzs+RExee4KJiIV9ZGBeYGRqk56our/BqKGakoqEf5KVmaKnlXWAi5Obnp+tqKKYlpaIjpWcoaW8ta6kjYJjVlVVWFx2e4KCf19XT0I/PkBbY22EjpeLjIqDfo+M" +
"j5OaoqufrK+vpbKok4qDf2hobHR4e46Kg3BnXkE8OjtGTmx/houOi3JuamdlaoaOo623ra+tqKGZkZaRj5CUmIuOjoyGfolzaF9VP0JNVV1ogIF/e3ZxVFJTX2hyn6mxt7q5tpaPiYGXnKqyuLyopZ" +
"6IfYZ3dXVpb3R4eHZwcWddUDo9TFVfZ4KEg3p0WVRVW2+Pm6ausrSXkYp1gIuZm5mjnJeTkn+Flp+nxMO9qqCAd3Bub3eSl5uZkmheUklCVVZhaXFoaWhdVmNeW1xgX2l2io6QoJqUj4x2eomTncLF" +
"xbmwkYZ+eXd8lpylpqN+dGdRYFxcX2ZtZWlpYlpnWFVVWUtUYHd/hJqWkIZubnJ5go24vsPAupyKg399f5ifq6+wkop+ZXFpZWRobWVqbWljb11WUVA+RE1kbXWRj4uAZmNob3mFprC5v72jk4uFl5" +
"ykrLW7qJ+ViIZ+eX1vdnx/f3p7cGM/PkJSW3h9dYGNmJeompOPfoWQmqWtxb+2q4J8eoGdpKutrad8cGNoZ2l2fm5vaWBWYFdQUkNOY2twgnt0bWhRVWdylamtrY2Gf3p6fZmuuMGwq6KNmZKPkJWc" +
"lZmYipSGcGlRU1lgaIWFf2xiQjk8QmFsdn+FbWhZU1FweYaKkpiYlY6ckI+SjZeisLDBua6kmXp7f42pramhlXRnXFVobXSChXBjWU5EUk9QYFVgb3Budm9pZmhZY3yIp62qpIF7enuCi6u/xMWlm5" +
"B+j4+aoaiYl5GIiX11cn+Kko+knJOOjn+Ll8XHw7CKgn5+hKi8wcKYi3+HhYeNlYGHhHxvcWhkTldgZ2uGgGpfOjg/SXuChYNgV05EYmmCj32EgHiEgYKIkoOQoqO8qqGaf4aQm8HHyLmShnZ0lKWt" +
"spaRh3thdHF5gW11cmp7bmJaPEJMX4GCdWtFPjo9RXmFjnZwaVlydXyHlaKXmJSfl5KXhI+mq8jDuq+kfH2Csbm+uJKFeW1lf4iRmIJ+dVtrYl9hZ1RlaGdzZ102OUBLV36FhX9aS0lMfImWoImJhX" +
"J/ipKPpJOOjnZ/i5fFx8O0jYeKsLvMzauhk4d9l56om5yVmIp+eV1ja3uZk3tuRT5EaXR8gH1NQTZMUl1XXl9ZUGFYU1pKZW6OhHpyUFJYZJ2nrIl/d3CRnKm3wqykmqufoqqmsLTHvK+kgYKGmr/C" +
"uKyBa2mHj5ihpYB0ZWllZ1xla2tld2lSTzVHU3Z3b2M8NDA0ZXJ9Z2JZR2BkbXtseoSAlIN/gnuJl7u/u7OEfn+QucXQsKeQiKGkrLfCrqqgoZeRe4SNlJauo4dfV1pjiHJ/i5CRpp6OjHWMmsLIwb" +
"iRiISFtMDKs6yhiZ6coaq0oaSdrJGIg3F7g4ijnZBYTkhQdn+HgltBN05QV2JtXlxUWlBNO0dVYGeEgG1kRVBdiJ6gnnpxaGSKlqSgo6GQopyboKqbsbTNua2lh4+ZpMjKxpSHe3SVnq6VkYh6bHtx" +
"dX1ydnN6bWA5PEVQWXt8bEQ4LzNYcXp9X1dNQ1dcZ2ZxeHKFfHV0XGeDj7Kvpp12eIGpt8PKqqGWhqKnvayys62isZyZm5GboLWrnI5nYmJyl51yf4uRpp6OjHV/jJrCyMG4iISFtMDK0LOsoYmenK" +
"q0oaSdrJ+RiINxe4OjnZBYTkhKUHZ/h4JbQTdOV2JtWl5cVFpQTTtHVWeEgHZtZEVQXYieoJ5xaGSKlqSxoKOhkKKcoKqbsbTNxLmtpYePmcjKxpSHe3V0lZ6ulZF6bHtxdX1qcnZzem1gOTxFWXt8" +
"dmxEOC8zWHF6fVdNQ1hXXGdmcXhyhXx0XGeDj7Kzr6addniBt8PKqqGWi4aip72ssq2isZyZm4eRm6C1q5xnYmJyl52ecn+Lkaaejox1jJrCyMjBuIiEhbTAyrOsoZWJnpyqtKGknayRiINxe4OIo5" +
"2QWE5IUHZ/h4JbT0E3TldibV5cVFpQTU87R1VnhIBtZEVQXYiVnqCecWhkipakoKOhmZCinKCqm7G0zbmtpYWHj5nIysaUh3t0lZ6ulZGIemx7cXV9cnZzem1gWDk8RVl7fGxEOC8zWGVxen1XTUNX" +
"XGdmcXh3coV8dFxng4+yr6adeXZ4gbfDyqqhloaip7K9rLKtorGcmZuRm6C1q5yOZ2Jicpedcn+LkaaelI6MdYyawsjBuIiEhY20wMqzrKGJnpyqtKGmpJ2skYiDcXuDo52Qg1hOSFB2f4eCW0E3Tl" +
"BXYm1eXFRaUE07R1VnhIB2bWRFUF2InqCecWhkZYqWpKCjoZCinKCqm6extM25raWHj5nIysa+lId7dJWerpWRemx7c3F1fXJ2c3ptYDk8RVBZe3xsRDgvM1hxen1XTUNYV1xnZnF4coV8dFxndIOP" +
"sq+mnXZ4gbfDysuqoZaGoqe9rLKtorGlnJmbkZugtaucZ2JiaXKXnXJ/i5Gmno6MdX+MmsLIwbiIhIW0wMqzrKGViZ6cqrShpJ2skYiDanF7g6OdkFhOSFB2f4aHgltBN05XYm1eXFRJWlBNO0dVZ4" +
"SAbWRFR1BdiJ6gnnFoZIqWpLGgo6GQopygqpuxtM25raWFh4+ZyMrGlId7dJWep66VkXpsew==\"},\"two\":{\"f0\":103.93,\"n\":5841,\"b64\":\"AAAAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgFCAgIBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgIBQUFBQgFCAUFCAgIBQgICAgIBQUFCAgFBQgICAgFBQUFCAUIBQgICAgFBQgICAgFBQgICAgFBQgICAUFBQgICAUFCAgICAUFCA" +
"UICAUFCAgICAUICAgICAUFCAgFBQUICAUFBQgFCAgFBQUICAUICAUICAgFBQgICAUFBQgICAUICAgIBQUFCAgIBQUICAgIBQUICAgIBQgICAgIBQUICAgFBQUICAgFBQgICAgIBQgICAgFBQgFCAgF" +
"BQgIBQUFCAgIBQUFCAUIBQUFCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIaEgoGBg4WHiYuMjIqFgn95eHd3eXp8gIKCgX98dnNwb25ucHR2eHt8e3h1c25tbG1ucHN5e31+fnx4dnRzc3N1en2AhoeI" +
"h4WDgX99fX6Bg4mMj5GRkI6LiYeEg4SHioyRkpOSkY+MhoSCgYGDh4mLjIyMioWCf3l4d3l6fICCgoKBf3x2c3BubnB0dnh6e3x7eHVzbm1sbnBzdnl7fX5+fHh2dICDhoiKioqHhYOAf3+ChYiLjp" +
"CSkpGPioeFg4SFh4qMj5KSko6LiIKAf4CBg4WHiYqKiIaAfHl2dXV2eHp8gICAfXp3ZmFdWllZWmBkaHJ1eHt7eXd0cW5paGhscHWAhoyRlZiampiVj4yJhoaHiY2RlZ6hpKWkopmUjoSAfHp5eXp/" +
"goWIiYmDgHt1b2plXVxbXWBkbHB0dnh4eHNwbWZkYmRmaW50eYCLjpKVlJKNioeFg4KDh4uPmZ2hpqempKGdmI2JhX9/f4KFiI2Pj4+NioaAhYuUlpiYlpOQjYqHhYWHjZGWn6KlpqalopmVj4SBfX" +
"t7fX6BhIeKi4qFgXxwa2VhXlxcXmFlbXF0eHh3dXJua2RiYWJkaHN4f4qNkJKTkpCLiIWBgYKHio+UtL3F2dze29DJt6ygnI+EeGZZU05PT1xgY2drbWdmZGBdV1BEPjQxMTI1SFBcdH+Nnqiyub/J" +
"zMrGwq+po5mcmpmanaCdoqWrrrSwrKWNgnZqXVJNOTMuKSQmMjlBUVpiandzd3l3dnh1c3Bwb2t0eYKbprHFzs/VfIiVq7S8y8zNxrq1r6mjnZyZmJqWmaClp7Ozsa+po5N/dGZWS0AxLCIiIyYsOk" +
"lSZGxzdnh6enl+fHdzcmtscHyElJ6ps73Iz9Xb297Ty8G3pZqOenNraWhnamdpbG5xcnh2cmdZUUA5MjAtLS4yODlNWGWFkZyts7G0tbSzq66poZ2blJWZnaGus73BxL68t6qhnJGEeGtMQzovLDM3" +
"PEFISE9WYmZpc3Fwal9cWVdWV2JnboCEkKeyvdXb3uDg3dLEu7KlnJOGgnZ2dHZ3fIaIfIiVq7S8x8vMzca6tamjnZyZmJmalpmgpaezs7Gpo5OKf3RmVktAMSwiIyYsMjpJUmRsc3Z4enl+fHdzcm" +
"lrbHB8hJSps73Iz9XZ29ve08vBpZqOenNrbmloZ2pnaW5xcnh2cm1nWVFAOTIwLS0yODlCTVhlhZGcrbOxtbSzr6uuqaGdm5SVmaGus73BxL6+vLeqoZyEeGtMQzo0LywzNzxBSE9WYmZpcnNxcGpf" +
"XFdWV2JnbnaAhJCnsr3V297g3dLMxLuypZyThoJ2dHZ3enyGiHyIlau0vMvMzca6ta+po52cmZialpmgpaers7OxqaOTf3RmVktAODEsIiMmLDpJUmRsc3F2eHp5fnx3c3JrbHB1fISUqbO9yM/V29" +
"ve2tPLwaWajnpza2loZ2pnaWxucXJ4dnJnWVFAOTIsMC0tMjg5TVhlhZGcpa2zsbW0s6uuqaGdm5OUlZmhrrO9wcS+vLeyqqGchHhrTEM6LywzNDc8QUhPVmJmaXNxcGpfXFlXVldiZ26AhJCnsr3G" +
"1dve4N3SxLuypZyTjIaCdnR2d3yGiHyIlaCrtLzLzM3GurWpo52fnJmYmpaZoKWns7Oxr6mjk390ZlZLQDEsIiMmLDI6SVJkbHN2eHp5fnx5d3Nya2xwfISUqbO9x8jP1dvb3tPLwaWajoR6c2tpaG" +
"dqZ2lucXJ6eHZyZ1lRQDkyMC0tLjI4OU1YZYWRnK2zsbW0s6+rrqmhnZuUlZmhrrO4vcHEvry3qqGchHhrX0xDOi8sMzc8QUhPVlxiZmlzcXBqX1xXVldeYmdugISQp7K91dve4ODd0sS7sqWck4aC" +
"dnR2d3p8hoh8iJWrtLzLzM3Kxrq1qaOdnJmYmpaZnaClp7Ozsamjk390ZltWS0AxLCIjJiw6SVJbZGxzdnh6eX58d3NyaWtscHyElKmzvcjP1dvb3trTy8Glmo56c2tpaGdpamdpbnFyeHZyZ1lRSU" +
"A5MjAtLTI4OU1YZXGFkZyts7G1tLOrrqmloZ2blJWZoa6zvcHEvr68t6qhnIR4a0xDOi8sMzQ3PEFIT1ZiZmlzcXBtal9cV1ZXYmdugISQm6eyvdXb3uDd0sS7sqilnJOGgnZ0dHV6hIaJfIeUq7O7" +
"zM3OyL64sqymoJ2amJeRlJueoK2urq2ppZeGfHBfVUk2MCMhHyAjLz1GWWFrc3h9gIKKioaDgXZ1dnl9ipGZoaq2vsfT19/d2dLLurCkjIJ2amReWFFRVFZZXGptbm9mY1pVTklDPzs4ODM7QUpncn" +
"+Yo6exub/Ex83Kwbu1oZyYlJGXl5qdoKCjpaemqqagmZBzaFtFOzksKCYnIycsPEVOaHB4g4CCgoOCgIJ/fXx2eIKHj6ixusPM09LY2dfUzcSupJCFeW9mWFxZfIeUq7O7x8zNzsi+uKymoKGenJua" +
"lJWZnJ6oqamloZSOhX1yZFtQPjcpIyIjJis3P09XYWtyeIKMjo+OjISDgYCBgoyVmqGpsLi+xcrV2NfVw7yznpSIhHlwZlhNSUZHSVVZXGBjXl9gX11eWlZPTENCQ0RHWmBqfoiOpK23v8bR1dbU0L" +
"+5sqOknZSRjYWEhYaJipKUk5GCfnZwZl5bSUE5JyQiJCctOkNLVmptd4iOlKKkpKOjmpiUkZGZmp2kqaits7i9y83NyMS2pZyQhXl2anyGk6evt8jKzMi+urWwq6Wjn5yZkpOWmZudpqempKGUh391" +
"Z15TSkE6LCMiIiczOUlRWlxmbnWCjZKVlZWMiomHh4ePk5abn6Wsub/KztLT08jDvauil4d9cV5QSEM/PTtER0pTUFRcX2FiaWloY2FYU1FSW11iZ251eIyWobbFzdjb3NXT0Mu9vbSjm5J+enVycH" +
"B2eHp6dXZ1cm9xbWZgWUM9Ny0qKTI1O0pLVWBsdoKdpa25tbi4tbSwtLCspKKYl5iZpKeqra+yq6uppZubknyGkpymr7fIy83KwL2zrqiqpaCdmJCQkpSVoKGhoqGflIqDe29mXElBMiYjISEjLTJB" +
"SVJeZ3CAjZOXmpucj46NjIySlJWXmZaanqest7/CxMW9u7eyraadlY17bWZYVFBNUVBRU1VQVllbZmdnaGdmZVpYVlNaWV1fY2dtc3uEjJussrm8v8LDwcbCvrq1qZ2YjouIiomJiYmCg4SEhIeFgX" +
"hzZmBYUkxHQj46OTk3O0BGTVtjc3qBh4yQlpifn6CenZSTkpKTm6Cjpqerr7K0t7h8hIydo6m5vL2+vrWzrammpqOgnJuUlJSVlp+hoqGgmJGNiIJ6enNjW1RAOzcyOTo8P0NITFNZZmx4gIOFh4KC" +
"gYGAf4eHiI6Kjpido7C1u7/HycTCwL26tK2mnZWGdm9pXWBdWVhZU1RVV1tkZmdnZ11cWldVU1dVVFNQUlZhZm17hIyUpaWsuLy+yMjHxMG2saeinZqXk42MhIODhIWLi4yKiYd4dG9jZF5XUUxGNz" +
"UzMzU+SE1UW1xka3uCj5mdoKSdnZycm5menZyclpicn6KlfISMnKOpuby+v7e1sq+sqailopybkpGSkpucnZ6dnZWRjop+f3lpYltNRkA7NDk4Oj1AQ0lQVl1kcn6Dh4iKi4yMi5GSkZCRi4ySlJio" +
"rbG2ur26vb6+wLy4qqOUjIN7c2NkXlRRT0dHSU1WWFpdX2FdXl5fX2VkZGNjXV5eY2ZqeoCGlJOaoKius8PGyMrCwLq2saytqKKWkYV8eHZ4d3Z2dXV1bWxraG1rZGFdUk5LR0JARkZHSUpOVGJpd3" +
"6GjZWioKWtr7G5uLe1s6qnop+dfIOKmZ+lsLW4ur21tLGurKyppqOgnpaTkpKYmJiXlo+Oi4mGfX96bWhhTkhDPzs/PTw9Pz9DSFRaaHV7gYaFiIyRk5ScnJyclZWVlpeYo6WorrCssLKzs7m4tq6q" +
"npCKgnNza2VdWFNEQUA/R0lOUVVYVVhcYmRtcXJybGxsbG1ub3t9gImHjJidorW5vsLFwMLCwb++ubWnoZONhX95dG9sZWNhWFhZWVliY2NkZF1cWlhWW1pZWFdQUVJXW2Zxdn2DjIuSoaetvsHEx8" +
"C/vbu4tHyDipmfpLW4u763trWzsK6uq6iin5aSkI+PlZSUk5KLiIeFfYF9eHJsZ1RPSkBDQT09PT46PUFMUl9tdHqBh4uQlZiapaampp+enZyboqKjo6WmoaSlp6+wsKyqoZ2Yk46AgXpqZF1KRUE9" +
"OkA/QEJERUlOWF1obXJ2eXl7fYCAgYmJiouNh4mPkZSkqKy0sbS3ubu8wsG/q6ejmZONiIJ8d21oZF1bWVdWVlhZWlxdX2BjZGVlZWVlZGRkY2RkZWdpbnF1fYKHjZKXnaerr7W3uYCFi5GWm6Cnqq" +
"yvr6+urKuppqShnZuZlpWUk5OTkpKSkpGQjouIhX55dWtmYV1YVFBKR0ZERUZKTVBUWF1ha3B1foGFi42OkJGRkpKSk5OUlJaYmZudn6Gmqauur6+vrqyqp6SglpGLgHp0aWRfW1hVU1BQUFFTVFlb" +
"XmJkZmdpamtsbGxtbW1vb3FydXd6gYaKlJmep6uvsrW4ubu6ubWyr6einpmUj4qBfnp1cnFvbm1tbW1sbGtraWdmYmBeW1lWVFFQUFBRU1hbX2ludHqAhYuAhYuWm6Cnqqyur6+vrqyrpqShnZuZmJ" +
"aVlJOTk5KSkpGQjo2LiIV+eXVrZmFYVFBNSkdGREVGSk1QWF1hZmtwdX6BhYuNjpGRkpKSk5OTlJSWmJmdn6Gmqausrq+vr66sp6SglpGLhYB6dGlkX1hVU1BQUFBRU1RZW15iZGZpamtrbGxsbW1t" +
"b29xdXd6foGGipSZnqerr7W4ubu6ubi1sq+nop6Uj4qBfnp3dXJxb25tbW1sbGtramlnZmJgXllWVFFQUFBQUVNYW19pbnSAhYuRgIWLlpugp6qsr6+vr66sq6akoZ2bmZaVlJOTk5KSkpKRkI6LiI" +
"V+eXVwa2ZhWFRQSkdGREVGR0pNUFhdYWtwdX6BhYiLjY6RkZKSkpOTlJSVlpiZnZ+hpqmrrq+vr6+urKekoJaRi4B6dGlkX1tYVVNQUFBRU1RZW15gYmRmaWprbGxsbW1tbm9vcXV3eoGGipSZnqKn" +
"q6+1uLm7urm1sq+rp6KelI+KgX56dXJxb29ubW1tbGxra2lnZmJgXltZVlRRUFBQUVNYW19kaW50gIWLgIWLlpugpKeqrK+vr66sq6akoZ+dm5mWlZSTk5OSkpKRkZCOi4iFfnl1a2ZhXVhUUEpHRk" +
"RFRkpNUFhdYWZrcHV+gYWLjY6RkZKSkpKTk5SUlpiZnZ+hpKapq66vr6+urKekoJuWkYuAenRpZF9YVVNRUFBQUVNUWVteYmRmZ2lqa2xsbG1tbW9vcXV3en6BhoqUmZ6nq6+1uLm6u7q5tbKvp6Ke" +
"lI+KhoF+enVycW9ubW1tbGxsa2tpZ2ZiYF5ZVlRTUVBQUFFTWFtfaW50eoCFi4CFi5aboKeqrK+vr6+urKumpKGdm5mWlZSUk5OT\"},\"one\":{\"f0\":104.94,\"n\":5365,\"b64\":\"AAAAgISJk5eb" +
"oqWorK2vr6+urquqqKWjoZ2cmpmYl5aVlZWVlpWVlZSUk5KRjYuIgn96cm5pZmFdWVJOS0dGRUVFRkdKTE9VWFxkZ2xzdnl8f4GDhoeIiomKi4uMjI2Oj5CRk5eZnKGjpqutr7GztLS1tLOvraqjn5" +
"qWkY2Hfnl0bGllX11bWllYWFhZWVtdXmBhYmNkZGRlZGRjYmJhYGBgYGFiZWZpbnF1fYCGj5OYnKGlqbCytLi4ubi3tbOxrqulop+YlpONi4mHhYWDgYGAgIB/gISJjZOXm6KlqKytr6+urq2rqqil" +
"o6GdnJqYl5aWlZWVlZaVlZWUk5KRjYuIhoJ/enJuaWFdWVJOS0lHRkVFRUZKTE9VWFxgZGdsc3Z5f4GDhoeIiYqJiouLjIyNjpCRk5WXmZyho6arra+ztLS1tbSzr62qo5+akY2Hfnl0cWxpZV9dW1" +
"lYWFhZWVpbXV5gYWJkZGRlZGRjY2JiYWBgYGFiZWZpa25xdX2Aho+TmKGlqaywsrS4uLm4t7WxrquppaKfmJaTjYuJhYWDgYGAgICAf4CEiZOXm6KlqKqsra+vrq6rqqilo6GfnZyamJeWlZWVlZaV" +
"lpWVlJOSkY2LiIJ/endybmlhXVlSTktHRkVERUVGSkxPVVhcZGdsc3Z5fH+Bg4aHiIqJiouLjIuMjY6QkZOXmZyho6apq62vs7S0tbSzr62qp6OfmpGNh355dGxpZWJfXVtZWFhYWVlbXV5fYGFiZG" +
"RkZWRkY2JiYWBgYGBhYmVmaW5xdX2AhoqPk5ihpamwsrS4uLm4uLe1sa6rpaKfmJaTkI2LiYWFg4GBgICAf3+AhImTl5uipaisra+vr66uq6qopaOhnZyamJeWlpWVlZWWlZWVlJOSkY+Ni4iCf3py" +
"bmlhXVlVUk5LR0ZFRUVGSkxPUlVYXGRnbHN2eX+Bg4SGh4iKiYqLi4yMjY6PkJGTl5mcoaOmq62vs7S0tbW0s6+tqqOfmpGNh4N+eXRsaWVfXVtZWFhYWFlZW11eYGFiZGRkZWVkZGNiYmFgYGBhYm" +
"NlZmlucXV9gIaPk5icoaWpsLK0uLi5uLe1sa6rqaWin5iWk42LiYWFg4KBgYCAgH+AhImTl5ufoqWorK2vr66uq6qop6WjoZ2cmpiXlpWVlZWVlpWVlZSTkpGNi4iGgn96cm5pYV1ZUk5LR0ZFREVF" +
"RkpMT1VYXGRnbG9zdnl/gYOGh4iKiYqKi4uMjI2OkJGTl5mcnqGjpqutr7O0tLW0s7Kvraqjn5qRjYd+eXRxbGllX11bWVhYWFlZW11eX2BhYmRkZGVkZGNiYmFhYGBgYWJlZmlucXV4fYCGj5OYoa" +
"WpsLK0tri4ubi3tbGuq6Win5yYlpONi4mFhYOBgYCAgIB/gISJk5eboqWorK2vr6+urquqqKWjoZ2cmpmYl5aVlZWVlpWVlZSUk5KRjYuIgn96cm5pZmFdWVJOS0dGRUVFRkdKTE9VWFxkZ2xzdnl8" +
"f4GDhoeIiomKi4uMjI2Oj5CRk5eZnKGjpqutr7GztLS1tLOvraqjn5qWkY2Hfnl0bGllX11bWllYWFhZWVtdXmBhYmNkZGRlZGRjYmJhYGBgYGFiZWZpbnF1fYCGj5OYnKGlqbCytLi4ubi3tbOxrq" +
"ulop+YlpONi4mHhYWDgYGAgIB/gISJjZOXm6KlqKytr6+urq2rqqilo6GdnJqYl5aWlZWVlZaVlZWUk5KRjYuIhoJ/enJuaWFdWVJOS0lHRkVFRUZKTE9VWFxgZGdsc3Z5f4GDhoeIiYqJiouLjIyN" +
"jpCRk5WXmZyho6arra+ztLS1tbSzr62qo5+akY2Hfnl0cWxpZV9dW1lYWFhZWVpbXV5gYWJkZGRlZGRjY2JiYWBgYGFiZWZpa25xdX2Aho+TmKGlqaywsrS4uLm4t7WxrquppaKfmJaTjYuJhYWDgY" +
"GAgICAf4CEiZOXm6KlqKqsra+vrq6rqqilo6GfnZyamJeWlZWVlZaVlpWVlJOSkY2LiIJ/endybmlhXVlSTktHRkVERUVGSkxPVVhcZGdsc3Z5fH+Bg4aHiIqJiouLjIuMjY6QkZOXmZyho6apq62v" +
"s7S0tbSzr62qp6OfmpGNh355dGxpZWJfXVtZWFhYWVlbXV5fYGFiZGRkZWRkY2JiYWBgYGFiZGhrbnZ6f4qQlZqgpamxtLa5ubm2tLGuq6ejm5eTjImGgYB+fXx8e3p6eXd2dXFua2iAhYuWm6Cnqq" +
"yvr6+vrqyrpqShnZuZlpWUk5OTkpKSkpGQjouIhX55dXBrZmFYVFBKR0ZERUZHSk1QWF1ha3B1foGFiIuNjpGRkpKSk5OUlJWWmJmdn6Gmqauur6+vr66sp6SglpGLgHp0aWRfW1hVU1BQUFFTVFlb" +
"XmBiZGZpamtsbGxtbW1ub29xdXd6gYaKlJmeoqerr7W4ubu6ubWyr6unop6Uj4qBfnp1cnFvb25tbW1sb29ua2lnYV1aV1RRT01NT1RXXGlvd36GjJShpqyAho6coaerr7Gzs7GwqqejnZmWlJKRkI" +
"+Pj5CRkI+PjYuHg350bmhbVlBHREJAQEFDSk9VYWdue4CGj5KVlpiYmZiXlpWUlJWWmZqdoKKoqqyurq2opJ+alI6Gd3BpW1ZRSklHSElLTVRYXGVobHJ0dnZ3d3h3d3d4eHuAg4iMkpedqK2xubu9" +
"vbu5sKuln5iRinx2cGhlYl9fX2BhYmRmZ2hoaGZjYV9dW1lZWFhaX2NodHqBiJCXnquvtLq7u7i2sq+qpqGXk46HhYN+fX5+fX19gImTp660vb+/u7i0r6qkn5aSj4qKiYiIiYiGhYJ5dW9hWlNGQT" +
"w5ODk6REpSZW95jZadpKuvsbOzsauopJ6bmZiXl5eYmZqZmJaPioR8dGxjUkpDOTY1NztAT1dgaXN9hZSanqSlpaSioJ6dnJubnZ6ipaepqqmopKCbjIR7Z11URD46NzU2OEBHTl5mbn2DiY2Rk5SV" +
"lZSUlJSXmp2gpKissrW3trSwpJ2UgHZsYlhQST47OjxARFBWXWNqb3R9f4GEg4OEhYaHi46SnKKns7i8gImTnaeutL2/v7u4tKqkn5qMiYWEhYaJjIyJh4F7c2thTkU+MzEyOkJMZXF/jJiiq7i6u7" +
"ayrKGbl5OQj4+RlZeanJyWkoqBd21iTEI6Ly0uNz9JVWFtepGaoautramloZ2alpSUlZeeo6aqrKqnopyTfHFkTEI5Ly0uNz9JU19qdYmQlp2dnZqWlJKRkJCVmp+pr7O4ubezrKWagnVoTkU8MTAy" +
"NTtCS15ocYGGio6NjIuJh4aGiIuWnKSyub7CxMTCta2hh3ptU0pCODg5PEFIT4CMmbG4wMbFw764saqalI6FhIOFh4mKi4yKg353ZFtRQDo0MjEzOENSY4Wcq8HHy8TCvLampp6TkY6Ii4yOjpaSh3" +
"9tVUg9MSwqMDc8SlpqfKOwvMrLxLqzq6Oim5WPj4iLjY6UkYuDemhcQzguKiotPUJRYXODlLbAx8zCvbCnn5+YlJCPiYqNj46OiH91aVZJMyssKy83SVhpi5qvusTIy8C6tKOcnJKQjo+Ji4yOjpGE" +
"e3BQRDkwKCMqMjtIYHCCobW/xsrLybiwqJiZlI6Pj4t8jJ66w9HV0cy0qp+VjIaGgYGBfX9/e3d3ZVtQRzcwKyswP1loepWks77HzNXPycClm5GChYKBgIKDf399c3RrVkxDNC4qKjREUXCBkqy4w8" +
"nO1dLFvKuWjoaDgoCCgoV/fnx3cGZcRz8xKiswN0pXZ4mao77GzNTQycG3rZuKg36AgYKFf399eXVtYlhNOy4qLTI9T15ugKKqt8nNzs3GvLOol46AfXqBg4R/fnt4cWpnU0lALCorN0FWd4eZqLG8" +
"xs7N0MG4rZOLg397eoCDhYZ8jJ66w9HV1dHMtKqfjIaGgYGBg31/f3t3d2VbUDcwKyorMD9ZaHqVpLPHzNXTz8nApZuRgoWCgIKDf399enN0a1ZMQy4qKjREUV9wgZKsuMPO1dLFvKuglo6Gg4KAgo" +
"V/fnx3cXBmXEc/MSorMEpXZ3eJmqO+xszU0Mm3rZuSioN+gIGChX9/eXVtYlhNRDsuKi0yPV5ugKKqt8HJzc7Nxryol46AfXqBgYOEf357cWpnU0lAOCwqKzdBVneHmbG8xszOzdDBuK2Ti4N7eoCC" +
"g4WGfIyeusPR1dHMtKqflYyGhoGBgX1/f3t3d29lW1A3MCsrMD9ZaHqKlaSzx8zVz8nApZuRioKFgoCCg39/fXN0a2FWTEMuKio0RFFwgZKcrLjDztXSxbyrlo6Gg4KAgoKFf358d3BmXEc/MSwqKz" +
"BKV2eJmqO+xszO1NDJt62bioN+gIGChIV/f3l1bWJYTTsuKiotMj1eboCiqrfJzc7Szca8qJeOgH16gYOEf357eHFqZ1NJQCwqKzdBVmV3h5mxvMbOzdDBuK2kk4uDe3qAg4WGfIyerLrD0dXRzLSq" +
"n4yGhoOBgYF9f397d3dlW1BHNzArKzA/WWh6laSzx8zV08/JwKWbkYKFgoCCg39/f31zdGtWTEMuKiotNERRcIGSrLjDztXSzcW8q5aOhoOCgIKFf39+fHdwZlxHPzEqKzA3SldniZqjvsbM1NDJt6" +
"2bkoqDfoSHjI6Rk46JiH5yZls+ODM6PkVZXGdxe4GMj4yIeXVycn2CipWeore/xM3Kw6+dkYV6cnJsbXBxdXqEg4B6cmNYRT44Oz5DUFtogpKboKWlnXyIlauxu7u3sKKclY+PjpCZmJ+pq6yxq6Sa" +
"em1gSUlEQ0ZFTFRdZXh6e3dsZlxZXl5iaHCBjZm4wMfKx7qzqqGXjoiFfoCFjpmcm5eRgXVqXk1FPjk0OUpTZXB6gYeFhIF4e3d1d3R7hI6Zt8DHx8bCsaeilouBeWloanh8gYd/fnlyamhTSkIzND" +
"dGWGRwfYiLmJubnJiTfHt7gY6VnaWtrLOzuK2mnYeCfXuChIiLj5SXnZqNhHRrYVpbV1hbX2Rqent7eXRoYVRWUlJVVGRsdoV8hY6bpqekoJOIhIGIiYyRmJ+mt7m4saObiYmCfXp5dHuAhZOUk4R9" +
"dGtpYVpRSUtUWmh0eXR1c3BrZ2FcUVJWanN8hY6OlJmYnJOOgnx8fomPlp6mrLGzuLOllo2GgHyBgoWKjZGUm5eSe3JoYFhaVlZSV2NpdXt7eW5oYltXVFJQVV1ufoeOlJeRjYmLgn99eX6Ei5ujq7" +
"Cys6yuppeRhIB/f4KRlpycnJuZkomAd3FsaGptd32CiYqIf3hxa2RgXV5iZ3N4fYGAfHdxa2RaWFiAho2WlpaTjomDeXZ2en+Gk5meoaOhnpONh4B+f4eNlJqgpKaloZyPiYR+f4KGi5GXoKKim5aP" +
"gXx4dnh8gYeNkZeWlImCe25raWlrb3SAhIiJh4J1bmdiXl1dZGpwe3+Bfnp0bmdhXFhZXGdtdH6AgX97dnBkYF1eYmd1e4KGiYmIgHp0a2lpbnR7iY+UlpeVkYeBfHZ2eIGHj5Wbn6KgnJeLhoJ+gI" +
"SJj5WcpaemoJqUh4J/foCDh5OZnqOinpONhoB6d3Z5foOOk5aWk42HgHlygIaNlpaWjomDeXZ2dnp/hpOZnqOhnpONh4OAfn+HjZSgpKaloZyWj4mEfn+Ci5GXoKKioJuWj4F8eHZ4fIeNkZWXlpSJ" +
"gntua2lrb3R6gISIiYeCdW5nXl1dZGpwdnt/gX56dGdhXFhZXGFnbXR+gIF7dnBkYF1cXmJndXuCiYmIgHp0b2tpaW50e4mPlJeVkY2HgXx2dniBh4+bn6KioJyXi4aCfoCEj5WcpaempKCalIeCf4" +
"CDh5OZnqGjop6TjYZ6d3Z5foOJjpOWlpONgHlygIaNkpaWlo6Jg3l2dnp/hoyTmZ6joZ6TjYeAfn+Ch42UoKSmpaGcj4mEfn+ChouRl6CiopuWj4F8eHZ2eHyHjZGXlpSJgnt0bmtpa290gISIiYeC" +
"fHVuZ15dXWRqcHt/gYB+enRnYVxYWVxnbXR6foCBe3ZwZGBdXmJndXuChomJiIB6dGtpaW50e4GJj5SXlZGHgXx2dnh7gYePm5+ioJyXi4aCf36AhI+VnKWnpqCalI2Hgn+Ag4eTmZ6jop6ak42Gen" +
"d2eX6DjpOWlpONh4B5coCGjZaWlo6Jg355dnZ6f4aTmZ6joZ6Zk42HgH5/h42UoKSmp6WhnI+JhH5/gouRl5ygoqKblo+BfHh2eHyBh42Rl5aUiYJ7bmtpa290eoCEiImHgnVuZ15dXWBkanB7f4F+" +
"enRnYVxZWFlcZ210foCBe3ZwamRgXV5iZ3V7gomJiISAenRraWludHuJj5SWl5WRh4F8dnZ4gYePm5+ioqCcl4uGgn6AhI+VnKGlp6agmpSHgn+Ag4eNk5meo6Kek42Gend2dnl+g46TlpaTjYB5cm" +
"2Aho2WlpaOiYN5dnZ2en+Gk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KLkZegoqKblo+IgXx4dnh8h42Rl5aUj4mCe25raWtvdICEiIqJh4J1bmdeXV1kanB2e3+Bfnp0Z2FcWFlcZ210en6A" +
"gXt2cGRgXV5iZ251e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8eHZ2eIGHj5ufoqCcl5GLhoJ+gISPlZylp6akoJqUh4J/gIOHk5meo6KempONhnp3dnl+g46TlpeWk42AeXKAho2WlpaTjomDeXZ2en" +
"+Gk5meoaOhnpONh4B+f4eNlJqgpKaloZyPiYR+f4KGi5GXoKKim5aPgXx4dnh8gYeNkZeWlImCe25raWlrb3SAhIiJh4J1bmdiXl1dZGpwe3+Bfnp0bmdhXFhZXGdtdH6AgX97dnBkYF1eYmd1e4KG" +
"iYmIgHp0a2lpbnR7iY+UlpeVkYeBfHZ2eIGHj5Wbn6KgnJeLhoJ+gISJj5WcpaemoJqUh4J/foCDh5OZnqOinpONhoB6d3Z5foOOk5aWk42HgHlygIaNlpaWjomDeXZ2dnp/hpOZnqOhnpONh4OAfn" +
"+HjZSgpKaloZyWj4mEfn+Ci5GXoKKioJuWj4F8eHZ4fIeNkZWXlpSJgntua2lrb3R6gISIiYeCdW5nXl1dZGpwdnt/gQ==\"},\"you\":{\"f0\":104.64,\"n\":5365,\"b64\":\"AAAAcn+Kj6adjIlvhJ" +
"G5wcPAuIiBgKu2w7Syq6CUpqGosqGwsMauo5l6fISOuru3hHdrY4SNlp6ihHFkc2Vnb2Zsbml8b2I2NjxQdXt1akI4MC9PZG95XldNVlNWTltnb3GJgW5pTl9slqWlnnlwaWaPnKmhop6Mn5mZno2a" +
"r7LMua6mh46ZwMrPzqCUiX6dprmkpaCWiZeGhouCiY2ekoR4U1BSY4iOimRXPzpWZnB5YWBZTlNMSz1IVF93cGVaNzM/S3SGh4JUS0dka3aEf4OBcoV+cn+Kj4+mnYyJb4SRucPAuJKIgYCrtsO0sq" +
"uUpqGiqLKhsLDGrqOZfISOuru3roR3a2OEjZ6ihHFkc2llZ29mbG58b2I2NjxFUHV7dWpCMC9PZG95YF5XTVZTVk5bZ3GJgXduaU5fbJalpZ5waWZqj5ypoaKejJ+Zno2ar7LMxLmupoeOmcrPzqCU" +
"iYF+naa5pKWWiZeGhot4gomNnpKEU1BSY4iOj4pkVz86VmZweWBZTl5TTEs9SFRfd3BaNzM3P0t0hoeCVEtHa3aEf4OBe3KFfnJ/io+mnYyJb3iEkbnDwLiIgYCrtsPMtLKrlKahqLKhsLDGu66jmX" +
"yEjrq7t4R3a2RjhI2eooRxZHNlZ29cZmxufG9iNjY8UHV7dWpCODAvT2RveV5XTVZTVl5OW2dxiYFuaU5fbJagpaWecGlmj5ypoaKeloyfmZ6Nmq+yzLmupoWHjpnKz86glIl+naawuaSllomXhoaL" +
"gomNnpKEeFNQUmOIjopkVz86VlxmcHlgWU5TTEs9SFRcX3dwWjczP0t0hoeCXlRLR2t2hH+DgXKFfnxyf4qPpp2MiW+EkbnBw8C4iIGAq7bDtLKrlKahoqiyobCwxq6jmXyEjpe6u7eEd2tjhI2eoo" +
"R9cWRzZWdvZmxufG9iWDY2PFB1e3VqQjAvT1hkb3leV01WU1ZOW2dvcYmBbmlOX2yWpaWecGlmao+cqaGinoyfmZ6NmqWvssy5rqaHjpnKz87HoJSJfp2muaSllomXjYaGi4KJjZ6ShFNQUlpjiI6K" +
"ZFc/OlZmcHlhYFlOU0xLPUhUX3dwWjczNz9LdIaHglRLR2t2hJF/g4FyhX5yf4qPpp2UjIlvhJG5w8C4iIGAhau2w7Syq5SmoaiyoauwsMauo5l8hI66u7euhHdrY4SNnqKEcWRzZWdvXGZsbnxvYj" +
"Y2PFB1e3p1akIwL09kb3leV01DVlNWTltncYmBbmlOVF9slqWlnnBpZo+cqbWhop6Mn5mejZqvsszEua6mh46Zys/OoJSJfp2msLmkpZaJl4aGi4KJjaaekoRTUFJjiI6KZFdKPzpWZnB5YFlOU0xL" +
"Tz1IVF93cFo3Mz9LdH+Gh4JUS0drdoR/g4F7coV+cn+Kj6adjIlvhJG5wcPAuIiBgKu2w7Syq6CUpqGosqGwsMauo5l6fISOuru3hHdrY4SNlp6ihHFkc2Vnb2Zsbml8b2I2NjxQdXt1akI4MC9PZG" +
"95XldNVlNWTltnb3GJgW5pTl9slqWlnnlwaWaPnKmfo6OWqaGcmp2Jnqiwzsi/j4iFh42yu8vMrpyRopSVmYWOlpq0rKGIY15iaY2UmpuXaFxQXl5icl5kZHluZFhQMDc/SXZ6eU5EOzUyUFZsd2Rp" +
"ZV5pY2JkUFtnmZ+glXFpcn6Ij5GrpZSOb3eBjL7FxsSgl46Dn6S4wq+0sKi6r6agh46XxMfHt5CEc3COlJ2lrJGLgYV6c3JcY2xzdpGBdWo8OjxocXh9YVxUPlFMTlZEWF5geXFpXzc3PFF4g42Lam" +
"JZUmtxe4eCio2im5OMiGxyh5O5xMK8joaCoam0v8iztKq8sqKghpSbo6rDw8Gwkod0cISKkJeJjIyKj4V6ZUtJT1VdeX1/fl1USjlJSFBXS1RcYWJxa2NAPDxGT295hIuPeXRtd3NyfXF7kpq0tbSw" +
"qXWAiZaXqZ6XkXh4e4Gps73ItLGjm6ehnp6im6OrtMjEs6mKgXp4eZiepZeWkn+JfnVtaWlcYmmHh4R0VUtCOjdLVV1mXmFha2NbTUs3PERNV3+Fh21nYFVoaW53gXeMk5aoo5yQeHh7g4yrv8XIsK" +
"mhpqCen6OUna2ytMK7sYd/enl5k5mmq5ePiH17cmxpVFddanCHgnxySEA5TFBXX15WW2FhX2RfWkRCREdNU2p7gomBgYB5gn99fn92hIyVsre7u6qloJuWoJ6gpKGmrLPBv7x5gYqWmaikoJyHhYaI" +
"jJ+ntry0uLaytK6nnIyLjZCUmK+xsZ2Xj311e3Vxb29na26Bgn92b1hRSUM+SkxQXFRaYWJvbGhiXkhGR09jbH6FjIOGhoWNiIWCdXmGjZastLm9sa2pnpminp+inqSprrG/vbStloZ/eYKDhYmNg4" +
"WGhIx+dWxPSkdHSFleaGxvYV9aXFZQTEpKPklQWHZ7f4FxbmpnY29xdHt9hY+drrGwr6uYkI2LnJ6hq7CosbS1tcG+uayXkIJ9eYGCgoSGe31/gH55gIiVmautrauqlpKQjYycoaarsKitsbW1wbmz" +
"rI+Jgnx4g4GBhIZ8f399iYR+eHFqTUhDPEtMUldOWF1gY3JycWxpWFNRUmVob3Z+hX+PlJmtraynlpOQjoyMnqGmsKess7W1wb66tJeRiXx5g4CCg4V5fH5+fol/eXJUTkhDPz1KTlJXU1hdY3JycG" +
"xpWFZTUlNkaHV8hYeNlJmdrK2rp5aRjo2bnaGlqq+nsLO1wb+6raaRioN+eYGBgYV6fH9/fomFgHlqVk5DPz1GRkhKTVBUgIaMmJyhp6mqq6qop6WjoZ2cm5ubnJ+hoqOkpKWjoZ6WkYt/eXNsZmFc" +
"VFJQT1BRVVdaXV9hY2ZmZmVlY2JhYWFiY2ZscHWAho2Zn6SprbCytLSzr6ypo6CdmJaVlJSUlZaWl5eWlI+MiIN+eHJmYFtRTktISEhKTE9SWV1hZ2pscHBxcXBwcHBwcXR3eoOIjZOZnqSusrW5ub" +
"m2tLCsqKSgl5SRi4qIh4eHh4eHhoWDgXp2cWdiXFJOS0hGRERHSUxUWV5nbHB0d3p8f4CAgIB/gIaMkpicoaepqquqqKWjoZ+dnJubm5yfoaKkpKWko6GelpGLf3lzZmFcVFJQT09QUVVXWl9hY2Zm" +
"ZmZlZWNiYWFiY2ZscHV6gIaNmZ+krbCytLSzsa+sqaOgnZiWlZSUlZWWlpeXlpSPjIh+eHJsZmBbUU5LSEhITE9SWV1hZGdqbHBwcXBwcHBwcXJ0d3qDiI2ZnqSusrW3ubm5trSwqKSgl5SRjouKiI" +
"eHh4eHh4WDgX56dnFnYlxSTktGRERFR0lMVFleZ2xwd3p8f4CAgICAf4CGjJicoaepqqurqqilo6GdnJubm5yen6GipKSlo6GelpGLhn95c2ZhXFRSUE9QUVNVV1pfYWNmZmZlZWNjYmFhYmNmbHB1" +
"gIaNmZ+kqa2wsrS0s6+sqaOgnZqYlpWUlJWWlpeXlpSSj4yIfnhyZmBbUU5LSUhISExPUlldYWdqbG5wcHFwcHBwcHF0d3p+g4iNmZ6krrK1ubm5trSwrKikoJeUkYuKiIeHh4eHh4eFg4F6dnFnYl" +
"xXUk5LRkRER0lMVFleYmdscHd6fH+AgICAf4CAhoyYnKGnqaqrqqinpaOhnZybm5ucn6GipKSlpKOhnpaRi395c2ZhXFhUUlBPUFFVV1pfYWNlZmZmZWVjYmFhYmNmaWxwdYCGjZmfpK2wsrS0tLOv" +
"rKmjoJ2YlpWUlJSVlpaXl5aUj4yIfnhybGZgW1FOS0hISExPUlVZXWFnamxwcHFwcHBwcHBxdHd6g4iNmZ6kqa6ytbm5uba0sKikoJyXlJGLioiHh4eHh4eGhYOBenZxZ2JcUk5LRkRERUdJTFRZXm" +
"dscHd6fH5/gICAgH+AhoyYnKGlp6mqq6qopaOhnZybm5ubnJ+hoqSkpaOhnpqWkYt/eXNmYVxUUlBPT1BRVVdaX2FjZmZmZWVjY2JhYWJjZmxwdYCGjZOZn6StsLK0tLOvraqno6CemJeVlJOTlJSV" +
"lZWUk4+MiYB7dWlkXllUUExIR0ZIS01VWFxgZGhrcXN0dnZ2dnZ2d3l7fYCEiJKXnKarr7a4uru7ubexramfm5aNiYaDgX9+fX19fX18enh2c29rZ15aVk5KSEVFRUdKTVFaX2VwdXqDhomLjI2OgI" +
"aMl5yhp6qrq6uqqKakop6dnJubm52en6ChoqKhoJ6Xk46DfXdxa2VfVlJPTUxNUFJUV1pdYGVnaGpqamloaGhoaGlsb3J6f4WQlpyhp6ywtre4t7WzrammnpqXlJGPjoyLi4yLi4uKiIaDgHxzbWhe" +
"WVRMSUdFREVGSk1RWV5ibHB0eHt9gIKDg4SEhIWGh4mLjpGYnaGprbC2uLm5ubi1r6umm5aQhYB7dHFvbWxra2trbGxsa2lnZWNgXVpUUk9MTExOUVRYXGFnc3l/i5CUgIaMkpecoaeqq6ysq6impK" +
"KgnpyampqbnJ2en5+fn56dmJSQh4F7b2ljWVRRTkxKSktMT1RXW2FkZ2lrbW5vb29vb29wcXN1eHt/iY6TnqSpsbW3ubq6ubazsKijn5aSjouIhYOBgICAf39+fXx6d3RxaWVgV1NPSUdGRUZIS05S" +
"VmFma3Z6f4eKjY+QkZKSkpKSkpKUlZeZnJ6hqKqtsbKzs7KwramloJWPiX13cmllYV5dW1pbW1xeX2FjY2RkY2NiX15dWlpZWlxdZGdscXZ8goCFi5ecoKeqrK2traypqKahn52bmpmZmZmam5ucnJ" +
"ybl5SRjYmFf3RuaF1YU01KSUhHSElOUVRcX2NqbG9xc3R1dnd3d3h4enx+hIiMkZWan6mtsbe5uru6uLWyrqqgm5aMh4N8eXd1dHNzc3JycnFwbmxqZ2RhXVZTUExKSUlLTVBUWF1obXN/hYqTlpqc" +
"nqCgoKCfnZybmpqbnZ2foaOkpqmqqqmopp+blpGLhoB0bmheWlZRUE9PUFFTV1lcYWNkZ2hpaWhoaGdnZ2hpa3Bzd3uAhYuXnKCnqqytrayrqaimoZ+dm5qZmZmam5ucnJycm5eUkYmFf3RuaGJdWF" +
"NNSklHSElOUVRYXF9jamxvc3R1dnd3d3d4eHp8foSIjJWan6SprbG3ubq7uriyrqqloJuWjIeDfHl3dHNzc3JycnJxcG5samRhXVZTUE1MSklJS01UWF1obXN5f4WKk5aanqCgoKCfnp2cm5qam52d" +
"n6OkpqipqqqpqKafm5aLhoB6dG5oXlpWUU9OT1BRVVdaXV9hY2doamprampqamprbG1wc3aAhYuXm6Ckp6qsrq6tq6mno6GenZuamZiXmJiYmZmZmJeWlJGLh4J4cm1iXVdTT0xJRkZGSUtOVVldZW" +
"ltcHR2eXx9fn+AgICBgoSFh4qPk5efo6evsrW3uLm5t7Wyq6ahlpGLhoB7d3Bta2dmZmZmZmdnZ2hnZmViYF5ZV1VUUlJRUlRWXGBlcHV8h42TmJ2ipausrq6trKimpKKgnpyZmJiXmJiZmZmZmZiX" +
"k5CNhYF7cGtlYFtWUktIR0ZGSExPU1ZaXmNqbnF3enx/gICBgYGCgIWLlpugp6qsr6+urqyrqaSioJyamZeWlpWVlZaWlpWUkpCLiISAe3ZxZ2JdU09MR0ZFRUVHSU9SVl9kaHF1eHx/gYOGh4iJiY" +
"mKi4yNj5GTmJuepairsLO0trW0s7GtqqGcl4uFf3Rwa2djYF5bWlpaW1xfYGFiY2RkZGNjYWBfXl5eXl9gYmhrb3h9g4+Ump+kqa2ztba3t7WxrquopKGdlpOQi4qIhoWFhISDgoKBf3t4dW5qZl1Z" +
"VVJOS0lGRUVIS05VWl9kam90f4SIj5KVgIWLkZaboKeqrK+vr62rqqimo6Gdm5mWlZWTk5OTk5OSkZCPi4iFfXl0a2ZhXFhTUElHRURFRkpNUVVZXmJscXV+goWKjI6PkJCRkpKSkpOUlpiZm52goq" +
"epq66vsK+urKqno5+VkIp/eXNpZF9bWFVTUFBQUlRVWVxeYmRmZ2lqamxsbGxsbW5vcHJ0d3qChouUmZ6nrK+ztri6u7q5tbKupqKdmJOOioF9enVzcW9vbm5tbW1tbGtpZ2ZiX11bWFZUUVBPUFFT" +
"WFxgam91e4CGjICFi5aboKeqrK6vr6+urKumpKGdm5mYlpWUk5OTkpKSkZCOjYuIhX55dWtmYVhUUE1KR0ZERUZKTVBYXWFma3B1foGFi42OkZGSkpKTk5OUlJaYmZ2foaapq6yur6+vrqynpKCWkY" +
"uFgHp0aWRfWFVTUFBQUFFTVFlbXmJkZmlqa2tsbGxtbW1vb3F1d3p+gYaKlJmep6uvtbi5u7q5uLWyr6einpSPioF+end1cnFvbm1tbWxsa2tqaWdmYmBeWVZUUVBQUFBRU1hbX2ludICFi5GAhYuW" +
"m6Cnqqyvr6+vrqyrpqShnZuZlpWUk5OTkpKSkpGQjouIhX55dXBrZmFYVFBKR0ZERUZHSk1QWF1ha3B1foGFiIuNjpGRkpKSk5OUlJWWmJmdn6Gmqauur6+vr66sp6SglpGLgHp0aWRfW1hVU1BQUF" +
"FTVFlbXmBiZGZpamtsbGxtbW1ub29xdXd6gYaKlJmeoqerr7W4ubu6ubWyr6unop6Uj4qBfnp1cnFvb25tbW1sbGtraWdmYmBeW1lWVFFQUFBRU1hbX2RpbnSAhYuAhYuWm6Ckp6qsr6+vrqyrpqSh" +
"n52bmZaVlJOTk5KSkpGRkI6LiIV+eXVrZmFdWFRQSkdGREVGSk1QWF1hZmtwdX6BhYuNjpGRkpKSkpOTlJSWmJmdn6Gkpqmrrq+vr66sp6Sgm5aRi4B6dGlkX1hVU1FQUFBRU1RZW15iZGZnaWprbG" +
"xsbW1tb29xdXd6foGGipSZnqerr7W4ubq7urm1sq+nop6Uj4qGgX56dXJxb25tbW1sbGxra2lnZmJgXllWVFNRUFBQUVNYW19pbnR6gIWLgIWLlpugp6qsr6+vr66sq6akoZ2bmZaVlJSTk5OSkpKR" +
"kI6LiIWBfnl1a2ZhWFRQSkdGRURFRkpNUFhdYWtwdXl+gYWLjY6RkZKSkpOTk5SUlpiZnZ+hpqmrrq+vr6+urA==\"},\"survived\":{\"f0\":104.68,\"n\":16347,\"b64\":\"AAAAUICAgIBQUICAUF" +
"BQgICAUFBQUICAUFBQgICAUFBQgICAUFCAgIBQUFCAgICAUFCAgIBQUICAgICAUICAgFBQgICAgIBQgICAgFBQgICAgFBQgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUFCAUICAUICAgICAUFCA" +
"gFBQUICAUICAUICAgFBQUICAgFCAgICAgFBQUICAUFCAgICAUFCAgICAUICAgICAUICAgIBQgICAgICAgFCAgIBQgICAgFBQgFCAgIBQgICAgFCAgFCAgFBQgICAgIBQgICAgFBQgICAgFCAgIBQUI" +
"BQgIBQUFCAgIBQUICAgFBQUFCAgIBQUICAgIBQUICAgIBQUICAUIBQUICAgFCAgICAUICAgFCAgFCAgIBQUIBQgIBQgFBQgIBQUIBQgIBQgFCAUFCAUICAgIBQgFCAUFBQgICAUFCAgFCAgIBQgFCA" +
"UFCAgIBQgICAUFCAgIBQgFBQgIBQgFCAUFCAUIBQgICAUIBQgICAgFCAgICAUICAUFCAgFBQgIBQUIBQUFCAgFCAgIBQgFCAgICAgFCAgICAUICAgICAUIBQgIBQgFCAUFCAUICAUFBQgFCAgIBQgI" +
"CAUFCAgFCAUFBQgIBQgFBQUIBQUICAUIBQgICAgFCAUICAgICAUICAUICAUICAUIBQgICAgFBQgICAgFCAgICAgFCAgICAgFCAgICAUICAgICAUIBQgFBQUIBQgFBQUICAgFBQUICAgFBQUICAgFBQ" +
"gICAUFBQgICAUFBQgICAUICAgICAUFCAgIBQUFCAgIBQUIBQUIBQUICAgIBQUICAgIBQgICAgFBQgICAgFBQUICAgIBQgICAgFBQgIBQUFCAgIBQUFCAgIBQUFCAgIBQUFCAgFBQgIBQgFCAgICAgF" +
"BQgICAUFCAgICAUFCAgICAUFCAgIBQUFCAgFBQUICAUFBQUICAUFBQgICAUFBQgFBQgICAUIBQUICAUIBQgFBQgIBQUFBQgFCAUICAgIBQgFBQgIBQUICAgFCAUICAgIBQUICAgIBQgICAgIBQgIBQ" +
"UIBQgICAgFCAgICAgIBQgFCAgIBQgFCAgFCAgFCAgFBQUIBQUFBQgICAgFBQgIBQUFCAgICAgFCAgFBQUFCAgFBQgICAgFCAUFCAgFBQgICAgIBQgICAUFBQgICAUIBQgICAgFCAUFCAUFCAgICAUF" +
"CAgIBQUFCAgICAUFCAgIBQUFCAgFBQUICAgFBQUICAgFBQgICAgFBQUICAUFBQgIBQgFBQUICAUICAgFCAUFBQgICAUICAUICAUFBQgICAUFBQgICAUICAgICAUICAgIBQUICAgFBQUIBQUIBQgICA" +
"gIBQUICAgFCAUIBQUFBQgICAgFBQgICAgIBQgFCAgFCAUIBQUFCAgFCAgFCAUIBQUFCAgFBQUICAgIBQUIBQgFBQUICAgFBQgICAgFCAgICAUFCAgICAgFCAgICAUFCAgICAUFCAgICAUFCAgICAUI" +
"CAgICAUICAUFCAUICAgIBQUICAgIBQgFCAUFBQgICAUFBQgICAUFBQgIBQgICAgICAUFCAgIBQgIBQgICAUFCAgFCAUFBQgICAUFBQgIBQUFBQgIBQUICAgIBQUICAUIBQUICAUIBQUICAUIBQgFBQ" +
"gIBQUICAgIBQUICAgIBQgICAgFCAUICAgFBQgFBQgIBQgFBQgFCAgFBQgFCAUICAUFCAUIBQUFCAgFBQUFCAgFBQUICAgFBQUICAgFBQUICAgFCAgICAUIBQUICAUFCAgFCAUFCAgICAUFBQgICAgF" +
"CAgIBQUFCAgICAUICAUFCAUFBQgIBQUIBQgICAUICAgICAUFCAgIBQUICAUFCAUICAgIBQUICAgIBQgFCAUFBQUICAUFBQgIBQUFBQgICAUFBQUICAUICAUICAUFBQgIBQUICAgIBQUICAgIBQUICA" +
"gFBQgIBQUIBQUICAgIBQgICAgFBQgICAgFBQgIBQUFCAgICAgFCAgICAgIBQgIBQUFCAgICAgFCAgIBQUIBQgIBQUFCAgFCAgFCAgFCAgFCAUIBQUFCAgFBQUICAUIBQUICAgFCAgICAUIBQUICAgF" +
"CAgIBQgFBQUIBQUFCAUFCAUIBQgIBQUICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFCAgIBQUFCAUICAUFBQgICAUFCAgIBQUFCAgIBQgICAgIBQUICAgFBQgICAgIBQUICAgFBQgICAgFBQgICA" +
"gFBQgICAgFBQgICAgFCAgICAgFCAgICAUFCAUICAUFCAgICAUFCAUICAUFCAUIBQUICAgFBQUIBQgFCAgICAgIBQUICAgIBQUICAUIBQUIBQgICAgFCAgFCAgFCAUIBQUIBQUIBQUIBQgIBQUIBQgI" +
"CAgFCAgFCAgFCAgIBQUICAgFCAgFBQgFCAgFBQgFBQUICAUICAgFCAgIBQUICAUIBQUICAUIBQUICAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQgFCAgICAUICAgIBQUICAUFBQgICAUFCAgFCAUFCA" +
"UIBQUFBQgFCAUFCAUIBQgICAgFCAUFCAUIBQgICAUIBQgICAgFCAgIBQUICAgIBQgFCAgICAUICAUFCAUFCAgIBQUIBQgIBQgICAgIBQgICAUFBQgFCAgIBQgICAUFBQgICAUFBQgICAUICAgICAUF" +
"BQgICAUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgFCAUICAgFCAgICAgFBQgICAUFCAgICAUFCAgICAUFCAgFBQUFCAUIBQUICAgFCAgICAgFBQUICAUFCAgICAUFBQUIBQgFCAgICAUFCAgICA" +
"UFCAgICAUFCAgIBQUFCAgIBQUICAgIBQUIBQgIBQUICAgIBQgICAgIBQUICAUFBQgIBQUFCAUICAUFBQgIBQgIBQgICAUFCAgIBQUFCAgIBQgICAgFBQUFCAgFBQgICAgFBQgICAgFCAgICAgFBQgI" +
"CAUFBQgICAUFCAgICAgFCAgICAUFCAUICAUFCAgFBQUICAgFBQUIBQgFBQUICAgICAgIB8f4KGhYqFg4F5e32BhIeRkZCNgH58fYaJjI+RkoqHhISCgYOFgYaHh4WKhoN9dHR3en2HiIeEgXdzbm52" +
"e36AfHx6eHRxdnN0dnZ5e32DgX58eXdxcnV9h4mJiH57eXd2f4KFjI+Jh4WChoSCgoaChYuMjI+MiHx8fH6Ag42QkI+Cf3t3d3+BhIaJg4KAeX16d3h6dnl7fYSCgHl2bW1vcnV/goOCeXZwbm53en" +
"6BhH+Afnt/e3p7eHx/goWGjYmHhHl5e4GLjpKSkYeEgX98hIV8f4KGhYqIhYOBeXt9hIeRkZCNg4B+fHmKjZWZm46LiIN+eYN/f4F5fH+CgH2Hgn14cmNkam5yhoeGhIB8amRiY3d8gYqNgH57d3Rx" +
"fX2BhYqGioyMmJSRjImHeXx/iIucnJqWkn96dnJydIiMj5GBfnp1cGtzcnN5fXN4eXh1f3t3cXBiaW1ye4yNjIqHhHBubnKFipSXmouJhYJ+e4eHio6IjI6PjJeSjYiEgXN1fH+CkpCNiYRxbGZlZn" +
"p+goeHeHVxbWlwb3B2e4B6fX59e4aDeX6CiIiHj4uIhYR2eICFiZ2enZeTgHl3d3iIjI+Vl4iDfnlvenh4eXt/eHp7dnN8cGtnZGRWWWRqcImMjoyJhnRxb29zd4uZnqOpqZmVkIuGfYmIi46Si42N" +
"jIiEfn53cWpqXWRobXODgoB9eXReW1pfY2mFi5GWmJmKhIF9eXiIkJWaoKWanJmVkJGLhoB/gHV4e36Cgo2EfnhrWVdWV1pfd3yBhYWDb2toZWRldX+FjJqelJSSj4aQjYuKjI+JjpKWlpSYkouEfn" +
"loZmhrcoSGeX+Gi4+RkZuXk4yKioCEiY6Tlqemo56RfHZta2tsfYCEiYqJdXBqXlpkY2RmanVtc3t8fHeCfnl4en1zeYCNkpanpqKwp56BenZydHl9naKlpKGZe3BlWEM7NUhMU2Zwe4R4foKCfnqE" +
"f3x9gIaPhI+ZrLO3tcW9p5yQhXxgW1teY22Ii42LhXZYT0Y+OTc7QmB4hJGmrJydnZmUiIGRjY6RnqaZoKaqqqSdko+CdWFaVkFCR01cZGqGhoV7dG9TT0xMU1tlk5+sv8XIx6+poY+GfnWBjqGnqq" +
"e2sKihmZONeXuGjJKctLKvqaGWfXBPPTk3PUNhanN7g4yNd29pZFtZb3J5gYujr7q0t7evp52onJOJfnx8bnR4gYSDlY+If2lfVTQyND9JVIGMlp2jpaWJhH91cnKNk5ukrra+x7OwopeLcXtxaWRi" +
"YWlaYGxwcm9/eHFpYlxVVUVVYGyGkbG4vb++tK2Rgn15eX2XnaOqrrOyrYh9cFdMQk1MT1RbZG1pcHV4dnJ9d3NvbnB0b3qGnqewzczIwbmupHpybGdoa3WQlJh1gY6hp6qntrChmZOPjXl7hoySnL" +
"SyqaGWin1wTz05Nz1DYXN7g4yNd3NvaWRbWW95gYujr7qttLe3r6ednJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpaWiiYR/dXJyjZObrra+xMezsKKXi3F7cWRiYWlaYGdscHJvf3hpYlxV" +
"VUVLVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZG1haXB1eHZyfXdzbnB0e296hp6nsM3MyLmupHpybGhnaGt1kJR1gY6hp6qpp7awoZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2" +
"Fze4OMjXdvaWRfW1lveYGLo6+6tLe3tK+nnZyTiX58fG50eIGEg5WPiH9pX1U0MjQ/SVRggYyWo6WliYR/dXJydI2Tm662vsezsKKXi39xe3FkYmFpWmBscHJxb394aWJcVVVFVWBseYaRsb2/vrSt" +
"kYJ9eXl9l52jqq6zsq2IfXBXTEJRTUxPW2RtaXB1eHZybX13c25wdG96hp6nsLXNzMi5rqR6cmxnaGtwdZCUdYGOoaeqp7awqKGZk415e4aMkpy0sqmhlop9cE89OTc9Q2Fze4OIjI13b2lkW1lveY" +
"GLl6OvurS3t6+nnZyTiYN+fHxudHiBhIOPiH90aV9VNDI0P0lUgYyWnaOlpYmEf3Vyco2Tm662vsTHs7Cil4txe3FkYmFlaVpgbHByb394aWJcV1VVRVVgbIaRsb2/vrq0rZGCfXl5fZejqq6zs7Kt" +
"iH1wV0xCTUxPVFtkbWlwdXh2cn13c25wdHtveoaep7DNzMi5rqSZenJsZ2hrdZCUdYGOmKGnqqe2sKGZk415e4CGjJKctLKpoZZ9cE9FPTk3PUNhc3uDjI13c29pZFtZb3mBi6OvurS3t7Svp52ck4" +
"l+fHxudHh+gYSDj4h/aV9VNDI0OD9JVIGMlqOlpYmEf3l1cnKNk5uutr7Hs7CropeLcXtxZGJhaVpgZ2xwcm9/eGliXFVVRVVgbHmGkbG9v760rZGCfXl4eX2Xo6qus7KtiH1wZFdMQk1MT1tkbWlw" +
"dXh4dnJ9d3NucHRveoaSnqewzczIua6kenJsaGdoa3WQlHWBjqGnqqe2sKihmZONeXuGjJKctLKvqaGWfXBPPTk3PUNhanN7g4yNd29pZFtZb3J5gYujr7q0t7evp52onJOJfnx8bnR4gYSDlY+If2" +
"lfVTQyND9JVIGMlp2jpaWJhH91cnKNk5ukrra+x7OwopeLcXtxaWRiYWlaYGxwcm9/eHFpYlxVVUVVYGyGkbG4vb++tK2Rgn15eX2XnaOqrrOyrYh9cFdMQk1MT1RbZG1pcHV4dnJ9d3NvbnB0b3qG" +
"nqewzczIwbmupHpybGdoa3WQlJh1gY6hp6qntrChmZOPjXl7hoySnLSyqaGWin1wTz05Nz1DYXN7g4yNd3NvaWRbWW95gYujr7qttLe3r6ednJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpa" +
"WiiYR/dXJyjZObrra+xMezsKKXi3F7cWRiYWlaYGdscHJvf3hpYlxVVUVLVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZG1haXB1eHZyfXdzbnB0e296hp6nsM3MyLmupHpybGhn" +
"aGt1kJR1gY6hp6qpp7awoZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2Fze4OMjXdvaWRfW1lveYGLo6+6tLe3tK+nnZyTiX58fG50eIGEg5WPiH9pX1U0MjQ/SVRggYyWo6WliYR/dXJydI2Tm662vs" +
"ezsKKXi39xe3FkYmFpWmBscHJxb394aWJcVVVFVWBseYaRsb2/vrStkYJ9eXl9l52jqq6zsq2IfXBXTEJRTUxPW2RtaXB1eHZybX13c25wdG96hp6nsLXNzMi5rqR6cmxnaGtwdZCUdYGOoaeqp7aw" +
"qKGZk415e4aMkpy0sqmhlop9cE89OTc9Q2Fze4OIjI13b2lkW1lveYGLl6OvurS3t6+nnZyTiYN+fHxudHiBhIOPiH90aV9VNDI0P0lUgYyWnaOlpYmEf3Vyco2Tm662vsTHs7Cil4txe3FkYmFlaV" +
"pgbHByb394aWJcV1VVRVVgbIaRsb2/vrq0rZGCfXl5fZejqq6zs7KtiH1wV0xCTUxPVFtkbWlwdXh2cn13c25wdHtveoaep7DNzMi5rqSZenJsZ2hrdZCUdYGOmKGnqqe2sKGZk415e4CGjJKctLKp" +
"oZZ9cE9FPTk3PUNhc3uDjI13c29pZFtZb3mBi6OvurS3t7Svp52elo+Fg4J4e36ChIWFjYeAbmZdQj89PkFGTWtze4eKjH17d3Rxb25/hIqaoqussLO0sq6op56WiIN/cXJ1eXx+gI6KhXdvZklDPz" +
"5ARVpianODiY6DgoB6d3SBgYOGkpmipKqwtLKvt7Cnn42GgGxsbXN2eYmLioh+eG9RS0Q+PkBTWWFqfISLhoiIg4B8h4WFho2SmXmCjJyhpKOvqqWgm5eFhYaOkpegsLCvq6aefXNpWFJNS1teY2ht" +
"c2ttbWdjXlVhX19hZmxweYOWnaOotbOuqaSeh4WEh4qOl6mrrKuoo4Z8cl5WT19eXmFkZ2tgYmRlZGJraGZkY2VaXmNqeH+GoKSoqqmol5WSkIyMm5+hpautoaGgnpqPiY+Be3VtXVtcXV9gZXR1c3" +
"FvWVVST01LTF9jaHZ8hIOHi46OjpqZl5aVlZePkpegpKa2t7a0q6WRg313bmx4eHh5en1+cG1qZlxlYFx5f4eSlpqqqaiioJ2bjIyNkZSXq66vrqyolY+IgXJtZ21raWttYWVmZ2dlY25nY2BaWUxR" +
"VVthaH2EkZWZnI6Oi4mIhoaVl52hpaCkpqmopaKrpZ6Qi4RubGpqbG18fX5+e3h0XFdSSkdUVFVYXGZsY25ydnqIh4WDgYByc3V7gIWgpqu0t7iqqaajmpagmZeVlpeLjY+RkpKeYGCgYGCgoKBgYG" +
"BgYKCgoKCgYKBgYGBgYGCgoGCgYGBgoGBgYGBgYGBgoGBgYGB5f4aRlZenp6WhnpyMi4uLkJOlrLCztbSloZ2XkYWMh357eWtsbm9xcnOAfnpybGdPS0hGRUZWXWJncnZscnNzcnF9fHl5eXB0eYWL" +
"kauvs7S1tbOem5eQjZmZmpyeoaOXmZmXkZmUh4B5dGBcWlhYWmxvcnR1dGRhXlpTT1pYWVpiWmBmbHN4gZKUlJORgH9+fn+BhZuhprC0t6CgYGBgoGCgoGBgYGCgoKCgoGBgYGBgYKCgoGCgYGBgYK" +
"CgoKCgoKCgYGBgYGB5f4aRlZenp6WhnpyMi4uLkJOlrLCztbSloZ2XkYuOiYKAfXV1dnd4eXl/fnx2cmdeWlZTUFZVVlhbWl1gZWdob29ubWtpYWFhZGl0eX2DiI2PkZSXl5ebmpmXlpCRk5WYnqir" +
"sLGxqKain5qWkZCNioeHf4GCgoODiomEgX1taGNbV1RaWVlaXmBbYWJkZWtqaWdlY1lYWFtdYWBgYKBgYKBgYGBgYGCgYGBgYKCgYGCgYGBgoKCgYGBgYGBgYKCgoKCgYGBgYGB8gYaPkZSenp6dm5" +
"qZkI+Qk5WfpairrrCqqqimoqGdmJCNioCAf4CBgomKiomEenZtaGNfYl5bWVlaV1lbYWJra2xramdeXFlYWGJkaGxxdnt+goaLjJSUk5KRkIiIi4yPnaCkrK6xq6yrqqOhn5qXlZKRkJCRkZKTk5OT" +
"kpCMiYaAfHl2c3FvbGxsbW1ub29vbm1samVjYVxaWWBgoGBgYKBgoKCgoGBgYGBgYKBgYGCgoGCgYGBgYGCgoKCgYGBgYKCgoGBgYGCAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZ" +
"OSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbG1tbm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOT" +
"k5OSkIyJhmBgYGCgoGBgYGBgoKBgYKBgoGBgoGBgYGBgoKCgoGBgYGBgYGBgoKCgoKCgoKCAg4aMjpCSk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbG" +
"xsbG1tbm9vb21samVjYV5cWllYWFlcXmFlaGpsbW5vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhmBgoGBgYGBgYGCgYGCgYGCg" +
"oKCgYGBgYGBgoKCgoKBgYGBgYGBgYKCgYGBgYGCAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbG1tbm9vb21samVjYV5cWllYWFlcXm" +
"FlaGpsbW5vb25ubWxsbG1vcXN2eYCDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhmCgoGBgYGBgYKCgoKBgYGBgYGBgoKBgoKCgYGBgoKBgoKBgYKBgYGBg" +
"YKCgoKCAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5yal5WSkZCQkZGTk5OTk5KQjImGgHx5c3FvbWxsbG1tbm9vb21samVjYV5cWllYWFlcXmFlaGpsbW5vb25ubWxsbG1vcXN2eYCDho" +
"yOkJOTk5OTkpGQkJCSk5WanJ+ho6Wmp6emo6GfmpeVk5KRkJCRkZOTk5OSkIyJhqBgoGCgYGCgYKBgoGBgoGBgoKCgYKBgYGBgoGBgYKCgoGCgYGBgoGBgoGBgYGCAg4aJjI6Qk5OTk5KRkJCQkZKT" +
"lZqcn6OlpqenpqWjoZ+al5WSkZCQkZGSk5OTk5KQjImGgHx5c3FvbWxsbG1tbm9vb21samhlY2FcWllYWFlcXmFjZWhqbW5vb25ubWxsbGxtb3N2eYCDhoyOkJKTk5OTkpGQkJCSk5WXmpyfo6Wmp6" +
"emo6GfmpeVk5KRkJCRkZOTk5OSkI6MiaBgYGBgYGCgYGBgYKCgoKBgYGBgYKCgoKBgYGBgYGBgYKCgoKCgoKBgYGBgYGCAg4aJjI6Qk5OTk5KRkJCQkZKTlZqcn6OlpqenpqWjoZ+al5WSkZCQkZGS" +
"k5OTk5KQjImGgHx5c3FvbWxsbG1tbm9vb21samhlY2FcWllYWFlcXmFjZWhqbW5vb25ubWxsbGxtb3N2eYCDhpKUl5mbm5uZl5aTkpKTlJaYm52gpKanpqWim5eSiYSAfHl3dnR1dXd4eHh3dnNwbm" +
"BgoKCgoKCgYGBgYGBgYKCgoGBgYGCgoGBgYKCgoKBgYKCgoGBgYGBgYGBgYGCAhImNkpSXm5ubmZeWk5KSkpOUlpudoKSmp6alop+bl5KJhIB5d3Z0dXV2d3h4eHd2cG5qYl9bWVZVVFVXWmBkaG9y" +
"dXl5enp6eHh3dnd6e3+Hi5CVmZ2hpqenpqSinZqYlZOSkZGSk5aYmZmZl5WSj4uBfXhua2djY2JjZGVnamtsbGxrZ2RiX11bWlpbXWNna3V5foaIi4yNjWCgoKCgYGBgYGCgYGBgoGBgYGBgoGBgoK" +
"BgYGBgYGBgYKCgYGCgYGCgYGBgYGBggISJkpSXm5ubmZeWlJOSkpOUlpudoKSmp6alop+dl5CCfHZsaWZkZWVmaGprbW1saWdkX1xaWVlZW2JmbHqAh5Wan6Klpqakop+al5WTkpOUlZeYm5ycmJaS" +
"h4J7dGxmYFZUUlFTVVxgZGtucXJ0dHRycXFxcXN5fYKIj5SbpquusrKxq6einZiTjoaDgX9/f4CBgYB/fntzb2lfWlZPTU1NT1JXYmduen+Ei4yNjo6NjIuKi42Pkpmdoamrrq6uraqhnJWHgXtvbG" +
"hmZGRkZmhqgIaNmZ6ipKampqKgnZiVlJKTk5WWmJmbnJuWk46CfHVuZ2JcVFJRUlVYX2Nna25wcnR0c3Nyc3V3eoSJkJefpay3ur28urapopmRh393aWRgXFtbXmBiZWZnaGdmZWFgYGBhZGhtc3qL" +
"k5yssre9vr27trKrnZaOgXt2cG9ubm5ub29ubWhlYlpXVFBPUFJXW2JyeoSXn6eytri4t7WxqKOdk4+KhYSDg4KCgoF/fHVwa15ZU05KR0VGSU1aYmt+ho+WnqOnrKyrp6ShmpiWlZSUlICIkqKorr" +
"S0tK+rp6KemZWPjYuKiomKiYiGgn95bWdgU05JQ0JDRUpPVmdveYqRmKGkpqampKOenJqXl5eYmpudnZ2dmJWQg3xzWU5DOjMvLTI3QFhkco2Yo7O3urm4tbGln5mPi4iGhoaHh4iHhIF8b2hfT0lD" +
"Pjw7PUlRXXeEkq24wsnNz8/FvrWflIl1bWZjX15dYWNlamtsamlmY2BeXVxdYWx0fpWgq8DHzNDQzsm4raCDdmhRSUI/PT1ASlFYaG92gIKFhYWEhIODhYqPlICMm6i0vMTLyse7tKqWjoR9dnFtam" +
"trbm9vb21rZ2NfW1NRUFJWXG13hJ6qtb/IztHQzMWwpJZ7b2NaUUxHRkhMVlxibXF1d3l5eXd3d3l7gIuSmqOrsrnCxMS7taqRhXZoUTorGhYXKTRCXG2AkKGtwc/R0cC5r5mPi3lybGlgYGFkZm9z" +
"c3NpZ2NhX2RkZmpweoOPp7jCys/T08O7rpeGc1BBLCEaFhYpM0JldoOntcPM2tzc0si2m45/b2ZeWVZNTlNYXW5ydXpzc3JxcHZ4eX18jqLCzt7l493WwramhXZtVU1GOzxBRk1VZHR7gYOFhoaMi4" +
"qLi42Mj5Wfq6+zs7Cmn5aLcWpbQjgoISIoL0NQYYaYpMXR2+nn4cy+ppWCcV9LQTkzLzNDTFhqdoCKmJaZmZiXmZeUk4yMjZKUnqChoJGMg3pvZF9KQjosLTJEUGZ2iZqtxdHa4ujizL6rk39tWjw4" +
"LygqLztGVHGFkpymrKmsq6imoZyTj4aEhISEjY6Niod6bWZdXFRNSEI7P05YZoybrbvJzdbe3dfJu6l8alZGfI6iws7e5ePdwramloV2bVVNRjs8QU1VZHR7gX+DhYaGjIuLi42Mj5Wan6uvs7Own5" +
"aLcWpbT0I4KCEiKENQYYaYpLXF0dvp5+HMvqaCcV9YS0E5My8zQ0xYdoCKkZiWmZmYl5mXlIyMjZKUnqCgoaCRjINvZF9KQjo2LC0yRFBmiZqtxdHa4OLo4sy+q39tWjw4LyooKi87RlRxhZKmrKms" +
"rKuopqGck4+GhISEhY2OjYqHem1mXVRNSEI7P0VOWGaMm63Jzdbe3dfWybupfGpWfI6iws7e4+Xj3cK2poV2bVVNRkM7PEFNVWR0e4GDhYaGhoyLi4uNjI+Vn6uvsrOzsJ+Wi3FqW0I4KCEiKC9DUG" +
"GGmKTF0dvp5+HZzL6mgnFfS0E5My8zOkNMWHaAipiWmZmYl5uZl5SMjI2SlJ6goaCdkYyDb2RfSkI6LC0yOERQZomarcXR2uLo4sy+q5N/bVo8OC8oKi87RlRicYWSpqyprKuopqGcl5OPhoSEhI2O" +
"jYqHenVtZl1UTUhCOz9OWGZ7jJutyc3W3t3Xybupl3xqVnyOosLO3uXj3cK2ppaFdm1VTUY7PEFNVWRsdHuBg4WGhoyLi4uNiIyPlZ+rr7OzsJ+Wi39xaltCOCghIihDUGFyhpikxdHb6efhzL6mlY" +
"JxX0tBOTMvM0NMWHaAipGYlpmZmJeZl5SMjI2PkpSeoKGgkYyDb2RfVEpCOiwtMkRQZomarbXF0dri6OLMvqt/bVpLPDgvKCovO0ZUcYWSnKasqayrqKahnJOPhoSEhIWNjo2Kh3ptZl1UTUhDQjs/" +
"TlhmjJutyc3W3N7d18m7qXxqVnyOorLCzt7l493CtqaFdm1gVU1GOzxBTVVkdHuBf4OFhoaMi4uLjYyPlZ+rr7Kzs7CflotxaltCOCgjISIoQ1BhhpikxdHb4Onn4cy+poJxX0tBOTUzLzNDTFh2gI" +
"qYlpmZmZiXmZeUjIyNkpSeoKChoJGMg29kX0pCOiwtMjhEUGaJmq3F0dri6OLZzL6rf21aPDgvKCovMDtGVHGFkqasqayrqKSmoZyTj4aEhISNjo2Niod6bWZdVE1IQjs/RU5YZoybrcnN1t7d18m7" +
"qZd8alZ8jqLCzt7l493WwramhXZtVU1GOzxBRk1VZHR7gYOFhoaMi4qLi42Mj5Wfq6+zs7Cmn5aLcWpbQjgoISIoL0NQYYaYpMXR2+nn4cy+ppWCcV9LQTkzLzNDTFhqdoCKmJaZmZiXmZeUk4yMjZ" +
"KUnqChoJGMg3pvZF9KQjosLTJEUGZ2iZqtxdHa4ujizL6rk39tWjw4LygqLztGVHGFkpymrKmsq6imoZyTj4aEhISEjY6Niod6bWZdXFRNSEI7P05YZoybrbvJzdbe3dfJu6l8alZGfI6iws7e5ePd" +
"wramloV2bVVNRjs8QVBYZ3Z6fXl5eHd0eXh9gIeRm6WvuMfMz8zFppeGYFVENikhFhohLFNkdpuqr7nBxMTEvbWimYp9eXd+foCChX59dXBpXlVNRkE3NkBJVHqMnrrJ1OHi5t/TxbWIdWRFOjo0Nj" +
"tDRU9ab3eGj5GRh4WDgoKKjJaco6uxt7q/urOnmothUEElJB8hKCs4S11vnq680dbRysK4rqebkHx1aWVmaHN2d3dua2ZgWlRRTkxTUlt2hZWtvcvX3t/dfI+hw87d4uLf2Lqtn4Bzb15aWFlTV1pk" +
"aHF0cnBjX1xaWmFkcnyHnKm2zNre3uDZzZyKdl1OQTIwJTQ+SlZweYKMjH13c3B9f4SLlZKfuMPL397XvZ+MeGNRTjQuKyUtOFJeeIOLkJOEgH13g4SNlJ2aprK7ytvayr6ueWdTQT80KyguJ0BNW4" +
"SNlZybi4iEgH6LjZOkoKu9xMfU0Mm9nHxpQTMzJSUpLy06SGh1j6CipJGNioaDj5GZoKittbzBzMa7rZ6MVkU0KSQiLDY1RFVldHmLnr/J3t/a0qygk4d9dn57fYB5fX15gnpwZFlOLCUjKkBNcYOX" +
"nbC+yuTk38zApIh9c2x1dHR6fnN2dXJyaV9USjMtJys1YXSJsbTDzNHR28i8sIqCfHl8jpmdnp6Lg3haWEguJiMcJzZHW3yQr7nAs6+op5+al5aZkJ+orcPCvKWVdGFMOiolIiQ3NkVmdICXnJ2dlI" +
"B9eHqOoa25xsTM0c7Gx6KPekY4Lic4PkhTXmlrb3Frc29lY2VbZXCAscHR6Ozez8Kxn5mHdl5YR0xSWHmMoLHAyNvY0MaglYt+fYuPlJqelpWPenppRzktFhMUGjRTZo6drK2vr7Gqo52YlomTm6PB" +
"x8jAt5uLdmNPOS4mJh8pRlVkf4uSmJeFgXd0g4yUoK2tusbU1d/It6NsWktBO0dKWWNraGlmVlpPRj06LT5NX5ervdXay7yypqiemJSXkJiprq+0qZqIZFE+IBolMT1KW2dxd3mGgnRuaVxjbY6uwN" +
"Hf6N/Xzb6pl4l1cGJmbHN5j42IclVFJxwWIycwPmNpfJqitbGro4eCgoWMlq95jaC+xtfOxbqvlo2IiY6ktbzBr6eaiXVvWzkuKR8oNF9seH+EhHNmYFpkaHCOkqW2yNTc6uPXtpaHbmh0dXuBh4SE" +
"gW5gXj4xJxQaJTNHZ3ucqK+hnJaHj46PlJyZtcHL4t/Xt6SBbVpLP0VHTWBbYmlmXmFVST4nKDFRZYixvsjNv7iwm5+ZmJ2msLvEyNXQxJ+LZ0M3MEFJU2ljaGhlXVNLQTs+OEdwhKe5x8/TvbKnkp" +
"mXnaaxrrjAw7m7qoBsSi8rKy9GUl1xdmheVElFPz9FeY2hvsPTx7uxj4mIjJOrtsnQ0bSnlGlkUTo4LDI9SFR0d3ZoXUU0MTJJVmZ6pam6ysjSvbGmnImIi5umvsrMxp2LdmBLSTwyNj9IVF94d3Jq" +
"YFY/NzpCcIOZwcHKz83GvLGkm4aKkKKswcO+s6KBbVcyNi8zPUlWYWhseXRsWlE+QkpYjqK2ydnKyrqtoJ+amqmhrbnAxNa+q5ZXRzw2UltmcHp+ZFpNLjYtLTYxQ1htf6yurJySdW9zfbLE1ePt29" +
"nBsLKRhoFweIKMkpapkoFtdYqduLzPx76zpoSDiaDD0eTm4cGwnYhgaGBgaFxudHVwe25dOy4RFB8uaXyLlpuGgW9mdHV9i5yvwdfa6uDRwrGBe3qFpK+8vbiYh3NeSz01NkA4Ul1ke3dvY0wtKDE+" +
"T4+ktsK1t7Kfk56WmaKot8XP1OfgwKyXXlRPanN9hoyPeGJSQDQpJCwkNVprd5OXk4x5XFdeao+3y9vm2NbPsbWmlZadn6u0ubfDtIp0SzMxNmBtd35/ZVk5KRwoLTpLYHOCioydin93YGh3n8ja5+" +
"3r43WLn7e5ybSnnYCGkaCx1uPt59qfind1c3d/ipWIioJzYEw6KBQcKTlKWX9+d0s/NjM8YHSKoLS3ubSfp52Vm5GgscHO7efatJ93YF5if4qVnZ+Cc0s3OigpMTlKWWVqfndgVEszPEt1oLTDzM60" +
"n5KIlZumxsHO1tjSxbSfjGBeYnWAnaGfl4hLNyUTKTFOX25lamliYFRLSFFLdYufw8zOybSSiICGpsbW49jSxbOfiox1c3d3goiGmIl3ZVUsJiw3bHd9eFJFOC0lJFBgcneCh3KElJ+mpbynnJZ7hJ" +
"Kx2uLk4NXHi393lJ2nur+gmYp6ZmFYVF5OWGhofmZXSD0bHCNAbHyNjYhYTkdFZm9/pLSmr6qhpp2ZmqGRoLvE49bIt3xzbnB2nKa0ta51Y1BRTE5VX2taZWJZWkxAOiMwP1Bhi5WRilpST1mDlbnH" +
"0Lazqp+knZyqt6rAxcLWyLeliWdmdH6jrKidjl9NPCpGTGNveWFbUUNRRj5CTEFkcn2clYyCeVhZbHyqzNXZs6eajoWdn7LAzb+/t7Wkknt5YGhyfINyhJSmpbynnJaUe4SSsdri4NXHi393dZSdp7" +
"q/oIp6ZmFYVFdeTlhoaH5mV0gbHCMwQGx8jY2IWE5HZm9/kaS0pq+qoaadmaGRoLvE4+DWyLd8c252nKa0ta6GdWNQUUxOX2taZWJZaVpMQDojMFBhi5WRioBaUk9Zg5W5x9Czqp+SpJ2cqreqwMXC" +
"yLellolnZnR+o6yonV9NPCpGTFdjb3lhW1FRRj5CTEFSZHJ9nJWMeVhZbHyqvMzV2bOnmoWdn7LAzbu/v7e1pJJ7eWByfIOjcoSUpqW8p5yWe4SSorHa4uDVx4t/d5Sdp7q/oJmKemZhWFReTlhoaH" +
"50ZldIGxwjQGx8jY2IYlhOR2Zvf6S0pq+qobGmnZmhkaC7xOPWyLenfHNudpymtLWudWNQQVFMTl9rWmViWVpMQDojMD9QYYuVkYpaUk9Zg5WnucfQs6qfpJ2cqreqt8DFwsi3pYlnZnR+o6qsqJ1f" +
"TTwqRkxjb3liYVtRUUY+QkxBZHJ9nZyVjHlYWWx8qszV2bOnmo6FnZ+ywM2/v7e1pJKFe3lgcnyDcoSUpqW8sqeclnuEkrHa4uDVx5uLf3eUnae6v6CKemZxYVhUXk5YZ2h7aV1QRScjIzM/YnuDhm" +
"tkW09iZGx4hpafqa7Aua+fmoSIkZun09nb0bGjiH13ioySmqiXmIp9bmNYUE04PkZZYHlzal8yKiUlK0lWc3+IenZvYG9sbXR+d5elr8zJwq6mioqPmbnFz9bWuq+ShHiBgoaOgIiNi4OMbV9SLzA2" +
"P0hScHZ0bUI4LylDS1hodoSBg4GJgXp3e3B9jJup0dPQv6CViYmNq7W/yXWEkqSmuaqimn+Dipajr9Dd3NaqnZB+kZOZoKixoZ6Wj4BxWVVARUxUXX18d2NBNSQiJkNOW2mAcHFoYG1wcHJ3aXJ7j5" +
"extrSxk46LioqNp7S6wbOyr6Kap5eSjo56fYCHiZ2VjoZdVE1HRFlbZGluXl5bUWBaVFBPUEVNVWeEiY2MiXFtamhsho2gqbKpq6uouLOupKKNk5ievsHBwLy1mIV8dYGAgYiLeXp3cmt3bmVWUjtA" +
"RUpscHJzcVhTSUVCWV5leG11fYKFhpaTj4t3enV/iI+VmK6ppaGGhYeRmLS8wsfJsauklI2clZWXmoqOkJGOnYyCeVNOS01Ram9zdnZcV1BCUU5NUVdJUlpibYSEf3x4X2BkaXKQmayzt6SinpSkoa" +
"Cho6ahpquwv721sKmUjYiCfIqKjY+Rg4J+eXNsc2ReWkdISlFVZmpramdWUk1GRFJWWmFhaG91enx9i4iGg3V2foOKoKetoKCgYGBgYGCgYGCgoKCgoGBgYGBgYGCgYGBgoGBgYKCgoGBgYGBgYKBg" +
"YGBgYHl/h46Tlpimo6GcjIyQlJmtsri8wbSyqaSdn5uYlZWWio6Rkp2bloiBa2RdWFRgYWNpbGBgX1tgW1ZRTk1NRElQXXB2fX5+b21qaGd2eYSKkpOZn6Ols7KtqaaTk5SanrG2ur2+raqll5GYjY" +
"qIh3p9foGDkImEfW5ZUk1JR0dYXGBnXF1bWFVbV1RTU0dLV15lgYaKjYx9e3l3YGBgoKCgoGBgoKBgYGBgYKCgYGBgYKBgYKCgoGBgYKCgYGCgYGCgoKCgoGBgYGB5f4eTlpign56ai4qLjI6Ro6aq" +
"sbOnp6ajqqahnZmXlISEhYeWl5eWlJF/e3VrZm9oZmVYWVtdX2FicG9taFZTTkxMTFteYWpuZW5xdISEg4KBgH9yc3V9j5Wfo6ifoKGgnpyoo6GfkJGTl5qdra6vr6ualoyHgoeEgYB/gHN1dneEgn" +
"94dG9cV1RQTFpaXmFkXV9hYmJib2tpoGBgYKBgYGBgYGCgYGBgYGCgYGBgYGCgoKCgYGBgoGBgYGBgoGBgYGBgoKCgoKB5fYOMjpGgoJ+cjIuKiouNoaSor7Kmp6ekop6oo5uYlYSEhIaVlpeXlZOB" +
"fXhtaHFpZ2VXWFpcXmBhcHBuaVhVT01MTFtcX2hsY2xvc3aEhIOCgYB7e3yAgoWLjpKVmJqcn5+fnp2cmZiYl5eXmJqcnqGio6Sjop+cmpeUkY6Jh4WDg4OEhISFhISDf316dHFtZ2VjYWBgYGFiYG" +
"CgoGBgoGBgoKBgYGBgYGBgYGBgYKCgoKCgoKBgYGCgoGCgYGCgYGBgYGBgYGCAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYaDgHx5c3FvbGxsbW1ub29v" +
"bm1samVjYVxaWVhYWVpcXmFlaGptbm9vbm5tbWxsbG1vc3Z5gIOGiYyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRk5OTk5OSkIyJoKBgYKCgoGBgoKBgYGBgYGCgYKBgoKBgoK" +
"CgYGBgYGBgoKCgoKBgYGBgoGBgYGCAg4aMjpCTk5OTkpGRkJCQkpOVmpyfo6Wmp6enpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYaDgHx5c3FvbGxsbW1ubm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9v" +
"bm5tbWxsbG1vc3Z5gIOGiYyOkJOTk5OSkZCQkJGSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRkpOTk5OSkIyJhmBgYKCgoGCgoGBgYGBgYGCgoKCgYGBgYGBgYKBgoKCgoGBgYGBgoKCgYKCgoKCAg4" +
"aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZKRkJCQkZGTk5OTkpCMiYaDgHx5c3FvbGxsbW1ubm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OS" +
"kZCQkJGSk5WanJ+jpaanp6alo6GfmpeVkpGQkJGRkpOTk5OSkIyJhmBgYGBgYKCgoGBgYGBgoGBgoGCgoKBgYGBgYGCgYKCgYGBgYGBgYKCgoKCgoKCAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpq" +
"enpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbW1ubm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeV" +
"kpGQkJGRkpOTk5OSkIyJhqBgYGBgYGBgoKBgoKBgYGCgoGBgYGBgYKCgoKCgYGBgYGBgYGCgoGBgYGBgYGCAg4aMjpCTk5OTk5KRkJCQkpOVmpyfoaOlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjI" +
"mGgHx5c3FvbGxsbG1tbm9vb21samVjYVxaWVhYWFlcXmFlaGptbm9vb25ubWxsbG1vc3Z5fICDhoyOkJOTk5OSkZGQkJCSk5WanJ+jpaanp6emo6GfmpeVkpGQkJCRkZOTk5OSkIyJhmCgYGBgYGCg" +
"YGBgYKCgoKBgYKBgYGBgYKCgoGBgYKBgYKCgoGBgYGBgoKCgoKCAg4aMjpCSk5OTk5KRkJCQkpOVl5qcn6OlpqenpqOhn5qXlZOSkZCQkZGTk5OTkpCOjImGgHx5c3FvbGxsbG1tbm9vb21samVjYV" +
"5cWllYWFlcXmFxc3V2d3d2dHNxb25vcXN1eHt+gYaIiYqJiIaFhIODhIaIi46TlZeampmXlZORj42Mi4yNkJKTlpeXlpWTkIqIhYB+fX1+f2CgYKBgYGBgYKCgoKCgoGBgYGCgoGBgoGBgYGCgYKCg" +
"oKBgYGBgoGBgoKCgoKCAg4aKjI2NjY2LiYeGhoaHi46Qk5WYmZubmpaUko6Mi4qKi4yPkJKUlJSRj4yJhoOAfHp6ent8fn+AgIB/fXl2c21raWdnaGttb3Byc3RzcnBta2lmZmZnaWttc3Z4fH1+fX" +
"x7enh4d3h5e4CDhoyOkJKSkpGPjoyKiYmLjI+Rk5WYm5ubmZeUkI2LiYiIiImKjI+PkI+Ni4aDgKBgYGBgYGCgoKCgoKBgYGCgYKCgoKCgoGBgYKBgYKCgoGBgYGCgYKCgYGBgYGCAg4aIioyNiomH" +
"g4KBgoSGjI+RlJWVlZKQjomIh4mKjI+Rk5WWlpSPjYqFhIODhIaIi42OjYyJg4B9enh4d3l7fYCBgX99e3h0cm9sbGxvcnR3eHh4dnRybWtpaGlqb3J0eXl6eXh2dHBvbm9xc3p9f4KEhISCgH57en" +
"p9f4KFiYuOkZCQjYqJhoWFhoiKjZOVlpeWlI+Ni4mHh4eKjI6Sk5SSkI6Lh4WCf39/gYOFiImIhYOAfHl2dHJyc3Z4enx9fHp4dXNta2lpamxxc3V3eHh3gIKFioqLiYeFg4KBgIOEh42QkpWVlJOR" +
"joyIiIeJiouOj4+Pjo2LiIeGhYaGiImKiomIhoSCgX5+fn+AgYKCgYB+fHp3dnV2d3h6enp6eXh2c3JxcHFydXZ3eHh3d3RzcnFxcnV2eHp7e3x7enl3d3d6e31/gYKDhIOCgYCAgYGDh4iKi4yLi4" +
"mIh4aGh4qLjY6Pj4+NjIuIh4eIiYqLjI2NjIuJhYSDgYKCg4SFhYWFg4B+fHl5eXl6e3x9fXx6eHdzcnJycnN0d3h4d3Z1cnFwgIGDhIWGhoSDg4KCgoWHiYqMjY2Mi4qIh4eIiYqMjY6Pj46NiomH" +
"hoaHiImKi4uLioeFg4ODgoKCgYGAgIB/f39+fn59fX19fHx7e3t7enp6eXl5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXl6enp7e3t7fHx9fX19fn5+f3+AgICBgYGCgoKDg4OEhISFhYWFho" +
"aGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWEhISDg4ODgoKCgYGBgICAf39+fn5+fX19fICAgIGBgYGCgoKDg4OEhISFhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoaF" +
"hYWEhISDg4ODgoKCgYGAgIB/f39+fn59fX18fHt7e3t6enp6enl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXp6ent7e3t8fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWFhoaGhoeHh4" +
"eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWEhISDg4ODgoKCgYGAgIB/f3+AgICBgYGCgoKDg4OEhISEhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoaFhYWFhISEg4ODgoKCgYGA" +
"gICAf39/fn59fX18fHx7e3t7enp6enl5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4eXl5eXl6enp7e3t7fHx9fX19fn5+f39/gICAgYGCgoKDg4ODhISEhYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4" +
"eHh4eHhoaGhoaGhYWFhISEg4ODgoKCgoGBgICAf3+AgICAgYGBgoKCg4ODhISEhYWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhISEhIODg4KCgoGBgICAf39/f35+fX19fHx7" +
"e3t7e3p6enp5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl5d3d3eHl7fX6AgH9+fHt6e3x+gIKDhISDgoB/f4CCg4WHiImIh4WDgoKEhYeJiouLiYiHhIOEhoeJi4uLioiHhYOCgoWGh4mJiI" +
"aFg4F/f3+Bg4SFhIOBgH58gIGDhYSEgYB/f3+AgYWGiImIh4WDgoKDg4WIiouLiomGhISEhIWHiYqLiomHhIOCg4SFh4iJiYeFg4B/f4CBgoOEhYSCgH57e3p8fX6AgICAfXt5d3Z3eXp7fH19fHl3" +
"dnR0dXh5ent8e3p4dnV0dXZ5enx9fXx7eXd3d3h5fX6AgH9+fXx7ent8foKDhICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI" +
"CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICA\"}}}"
const VOIX: any = JSON.parse(VOIX_TXT)

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

/** Un hasard qui se rejoue a l'identique : meme graine, memes tirages. */
let graine = 20261113
const rnd = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0
    return graine / 2147483648 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (Sol diese,
// 104 Hz). Ici on les decode et on les reechantillonne.
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

// "Beat. Survivor." : le nom du jeu, nu, puis en accord
const vTitre = await phrase("SA Beat Survivor", [["beat", 0, 0, 0], ["survivor", 1, 0, 0]], 1, 0.15)
const vTitreAccord = await phrase("SA Beat Survivor en accord", [["beat", 0, 0, 0], ["survivor", 1, 0, 0]], 0.25, 1)
// "Stay alive." : la consigne
const vStay = await phrase("SA Stay alive", [["stay", 0, 0, 0], ["alive", 1, 0, 0]], 1, 0.15)
const vStayAccord = await phrase("SA Stay alive en accord", [["stay", 0, 0, 0], ["alive", 1, 0, 0]], 0.25, 1)
// Le robot chante : "stay" sur la tonique, "alive" une tierce au-dessus ; puis plus haut
const vChante = await phrase("SA Stay alive chante", [["stay", 0, 0, 0], ["alive", 2, 3, 0]], 0.15, 1)
const vChanteHaut = await phrase("SA Stay alive chante haut", [["stay", 0, 5, 0], ["alive", 2, 7, 0]], 0.15, 1)
// "Three, two, one" : un mot par temps, le quatrieme temps reste vide
const vCompte = await phrase("SA Three two one", [["three", 0, 0, 0], ["two", 1, 0, 0], ["one", 2, 0, 0]], 0.9, 0.5)
// "B-b-b-beat survivor" : trois amorces en doubles-croches, le mot tombe sur le temps
const vBegaie = await phrase("SA B-b-b-beat survivor", [
    ["beat", 0, 0, 0.22], ["beat", 0.25, 0, 0.22], ["beat", 0.5, 0, 0.22], ["beat", 0.75, 0, 0.22],
    ["beat", 1, 0, 0], ["survivor", 2, 0, 0]
], 1, 0.3)
// "Alive, alive, alive" : trois fois, en croches pointees
const vAlive = await phrase("SA Alive alive alive", [["alive", 0, 0, 0.7], ["alive", 0.75, 0, 0.7], ["alive", 1.5, 0, 0]], 0.9, 0.4)
// "Beat" de plus en plus vite : l'ecart entre deux repetitions passe de 230 ms a
// 3 ms en quinze temps. A la fin, on n'entend plus un mot mais une note.
const grains: Dit[] = []
{
    const count = 150
    const ratio = Math.pow(0.004 / 0.23, 1 / (count - 1))
    let gap = 0.23, sum = 0
    for (let k = 0; k < count; k++) {sum += gap; gap *= ratio}
    const scale = 15 * beatSec / sum
    let at = 0
    gap = 0.23
    for (let k = 0; k < count; k++) {
        grains.push(["beat", at * scale / beatSec, 0, gap * scale / beatSec * 0.96])
        at += gap
        gap *= ratio
    }
}
const vGrain = await phrase("SA Beat qui devient une note", grains, 1, 0)
// "You survived." : le dernier mot du morceau
const vFin = await phrase("SA You survived", [["you", 0, 0, 0], ["survived", 1, 0, 0]], 1, 0.4)

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Stay Alive")
project.bpm = BPM

const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Roule", start: 16, bars: 16},
    {name: "Acide", start: 32, bars: 16},
    {name: "Creux", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 16},
    {name: "Plus", start: 72, bars: 16},
    {name: "Suspens", start: 88, bars: 8},
    {name: "Final", start: 96, bars: 16},
    {name: "Sommet", start: 112, bars: 16},
    {name: "Sortie", start: 128, bars: 16}
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

// ---------- La carte du morceau ----------
/** Les creux : le pied et la basse se taisent, la voix chante. */
const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 96)
/** Le bloc qui demarre sans sa basse. */
const nu = (bar: number) => bar >= 72 && bar < 76
const kickOn = (bar: number) => bar >= 8 && bar < 140 && !inBreak(bar)
const bassOn = (bar: number) => bar >= 16 && bar < 136 && !inBreak(bar) && !nu(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 96 && bar < 128)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 95
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. */
const finDeBloc = (bar: number) => [31, 47, 71, 87, 111, 127].includes(bar)
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Avant le premier drop, le pied retient un peu ses coups
    const v = bar < 16 || bar >= 136 ? 0.8 : drop(bar) ? 1 : 0.86
    const out = [[0, v], [4, v], [8, v], [12, v]]
    return finDeBloc(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Sol diese 1 = 52 Hz : le pied et la basse.
const SOL1 = 32, SOL2 = 44

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -6.5)
reglages("frappe", kick, {tune: 51.9, start: 380, sweep: 48, decay: 135, punch: 0.6, click: 0.55, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
auto("frappe", kick, "click", [[0, 0.1], [8, 0.1], [16, 0.55], [128, 0.55], [140, 0.2], [144, 0.2]])

// ---------- Roulante : la basse ----------
// Trois notes entre deux coups de pied. La premiere, celle qui suit le pied,
// se joue sans sa fondamentale (velocite 0,35).
const bass = apparat("Roulante", ROULANTE, -3)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.8, cutoff: 100, envmod: 3.4, fdecay: 0.45, pinch: 0.55,
    sub: 0.75, sublen: 0.6, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    const out: Note[] = []
    const note = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16 / 2, pitch, velocity})}
    }
    for (let beat = 0; beat < 4; beat++) {
        const s = beat * 4
        if (bar >= 32) {note(s + 1, SOL1, 0.35)}
        note(s + 2, SOL1, 0.8)
        // Dans le final, la fin de phrase monte au La : le demi-ton de menace
        const menace = bar >= 96 && beat === 3 && rang(bar) === 3
        note(s + 3, menace ? SOL1 + 1 : SOL1, 0.8)
    }
    return finDeBloc(bar) ? out.filter(e => e.position < 12 * S16) : out
})
auto("roulante", bass, "envmod", vague(enDroit([
    [0, 2.6], [32, 3.0], [56, 3.6], [96, 3.8], [112, 4.2], [128, 3.4], [144, 2.4]
], 0, 6), 12, 0.04))

// ---------- Venin : la voix acid ----------
// Le rythme tient sur 16 pas ; les hauteurs tournent sur 7 notes et les
// couleurs sur 5. La velocite ne regle pas le volume : de 0,5 a 0,85 elle
// ferme ou ouvre le filtre de la note, et a partir de 0,9 la note est accentuee.
type Motif = {steps: number[], accents: number[], slides: number[]}
const V0: Motif = {steps: [0, 3, 8, 11, 14], accents: [3, 11], slides: []}
const V1: Motif = {steps: [0, 2, 3, 6, 7, 8, 10, 11, 14], accents: [3, 7, 14], slides: [2, 6, 10]}
const V2: Motif = {steps: [0, 2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 15], accents: [3, 7, 11, 15], slides: [2, 6, 10, 14]}
// Demi-tons au-dessus du Sol diese 2 : 12 = l'octave, 1 = le La, 10 = le Fa diese
const HAUTEURS_SAGES = [0, 0, 12, 0, 0, 0, 12]
const HAUTEURS = [0, 0, 12, 0, 1, 0, 10]
const HAUTEURS_SOMMET = [0, 12, 12, 0, 1, 12, 10]
const COULEURS = [0.25, 0.6, 0.95, 0.4, 0.75]
const couleur = (accent: boolean, c: number) => accent ? 0.9 + 0.1 * c : 0.5 + 0.35 * c

const acid = apparat("Venin", VENIN, -1)
reglages("venin", acid, {
    cutoff: 260, reso: 0.78, envmod: 2.2, decay: 300, accent: 0.7, tint: 1.0, glide: 80,
    shape: 0.25, drive: 0.45, lowcut: 190, tonic: SOL2, just: 0, duck: 0.35
})
essai("saturation venin", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.32, cross: 1, filter: 0.45, wet: -21})

function motifAcid(bar: number): Motif | null {
    if (bar < 40) {return V0}
    if (bar >= 40 && bar < 48) {return V1}
    if (bar >= 52 && bar < 72) {return V1}
    if (bar >= 76 && bar < 88) {return V1}
    if (bar >= 96 && bar < 112) {return V1}
    if (bar >= 112 && bar < 128) {return V2}
    if (bar >= 128 && bar < 136) {return V0}
    return null
}
build(acid.noteTracks[0], "Venin", bar => {
    const out: Note[] = plongeons(bar)
    const motif = motifAcid(bar)
    if (motif === null) {return out}
    const hauteurs = bar < 56 ? HAUTEURS_SAGES : bar >= 112 && bar < 128 ? HAUTEURS_SOMMET : HAUTEURS
    motif.steps.forEach((step, k) => {
        if (step >= limite(bar)) {return}
        const n = bar * motif.steps.length + k
        const slide = motif.slides.includes(step)
        out.push({
            position: step * S16,
            duration: Math.round(S16 * (slide ? 1.3 : 0.55)),
            pitch: SOL2 + hauteurs[n % 7],
            velocity: couleur(motif.accents.includes(step), COULEURS[n % 5])
        })
    })
    return out
})
auto("venin", acid, "cutoff", vague(enLog([
    [0, 150], [8, 170], [32, 220], [48, 300], [52, 160], [55.75, 480], [56, 380], [88, 520],
    [96, 480], [112, 600], [128, 760], [136, 200], [144, 150]
], 60, 4000), 12, 0.03))
auto("venin", acid, "envmod", vague(enDroit([
    [0, 1.6], [32, 1.8], [56, 2.4], [96, 2.8], [128, 3.2], [136, 1.6], [144, 1.4]
], 0, 5), 20, 0.03))
auto("venin", acid, "tint", enDroit([
    [0, 0.5], [32, 0.6], [56, 1.2], [96, 1.6], [112, 2.0], [128, 2.0], [136, 0.8], [144, 0.5]
], 0, 3))
auto("venin", acid, "reso", vague([
    [0, 0.74], [56, 0.78], [96, 0.80], [128, 0.84], [144, 0.74]
], 28, 0.015))

// ---------- Gresil : les tics ----------
const ticks = apparat("Tics", GRESIL, 6)
reglages("tics", ticks, {
    decay: 30, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.5, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
function vitesse(bar: number): number {
    if (!kickOn(bar) || bar < 16) {return 0}
    if (bar < 32) {return 1}                 // un tic a contretemps
    if (bar < 56) {return 2}                 // + le pas d'apres, en sourdine
    if (nu(bar)) {return 1}
    if (bar < 96) {return 3}                 // + le pas d'avant
    if (bar < 112) {return 4}                // toutes les doubles-croches
    if (bar < 128) {return 5}                // + la ride
    if (bar < 136) {return 2}
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

// ---------- Gresil : les tocs ----------
// Une syncope seche. Ils ne roulent pas avant les drops : c'est la voix qui s'en charge.
const TOCS = [63, 56, 68]
const tocs = apparat("Tocs", GRESIL, -11, 0.15)
reglages("tocs", tocs, {
    decay: 70, index: 2.5, snap: 4, body: 0.1, r2: 1.48, r3: 3.7, noise: 0.1, chirp: 7,
    lowcut: 150, drift: 0.5, width: 0.4, duck: 0.2
})
build(tocs.noteTracks[0], "Tocs", bar => {
    const out: Note[] = plongeons(bar)
    const on = bar >= 32 && bar < 136 && !inBreak(bar) && !nu(bar)
    if (!on) {return out}
    const hit = (step: number, k: number, velocity: number) => out.push({position: step * S16, duration: S16 / 2, pitch: TOCS[k], velocity})
    hit(7, 0, 0.8)
    if (rang(bar) === 1 || rang(bar) === 3) {hit(13, 1, 0.6)}
    if (rang(bar) === 2) {hit(10, 2, 0.5)}
    if (finDeBloc(bar)) {hit(12, 1, 0.6); hit(14, 2, 0.7); hit(15, 0, 0.9)}
    return out
})

// ---------- Clap, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const CLAP = 39, RIDE = 51
const kit: [string, number, any][] = [
    ["Clap", CLAP, {volume: -3}],
    ["Ride", RIDE, {volume: -13, panning: -0.15}]
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
    if (!kickOn(bar)) {return out}
    if (drop(bar) && !nu(bar)) {hit(4, CLAP, 0.85); hit(12, CLAP, 0.9)}
    if (vitesse(bar) >= 5) {hit(0, RIDE, 0.45); hit(4, RIDE, 0.35); hit(8, RIDE, 0.45); hit(12, RIDE, 0.35)}
    if (finDeBloc(bar)) {hit(14, CLAP, 0.5); hit(15, CLAP, 0.7)}
    return out
})

// ---------- La voix ----------
// Deux pistes : la voix, presque seche ; et ses lancers, les memes mots
// envoyes de temps en temps dans un long echo. Deux regions ne doivent jamais
// se chevaucher sur une meme piste : openDAW le signale, et le rendu de la
// piste seule reste alors bloque.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -3})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.3, wet: -17})
const lancer: any = project.addInstrumentUnit("Tape", {label: "Voix lancee", volume: -10})
lancer.addAudioEffect("Delay", {delay: 13, feedback: 0.6, cross: 1, filter: 0.3, wet: -2})
const dire = (quoi: string, sample: any, bar: number, step: number, lance: boolean = false) => {
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
    if (lance) {essai("lancer " + quoi, () => lancer.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))}
}
// Le morceau s'ouvre sur le nom du jeu, seul avec la ligne acid ; la consigne tombe juste avant le pied
dire("titre intro", vTitre, 0, 0, true)
dire("consigne avant le pied", vStay, 7, 8, true)
dire("consigne intro", vStayAccord, 15, 8)
dire("consigne avant acide", vStay, 31, 8)
dire("begaie 39", vBegaie, 39, 12)
dire("alive avant creux", vAlive, 47, 4, true)
// Premier creux : le robot chante, annonce le jeu, puis compte
dire("chante 48", vChante, 48, 0)
dire("chante haut 50", vChanteHaut, 50, 0, true)
dire("chante 52", vChante, 52, 0)
dire("titre en accord 54", vTitreAccord, 54, 0)
dire("compte", vCompte, 55, 0)
// Premier drop : "Beat" sur le premier temps, "Survivor" sur le deuxieme
dire("titre drop 1", vTitre, 56, 0, true)
dire("begaie 63", vBegaie, 63, 12)
dire("consigne avant le bloc nu", vStay, 71, 8, true)
dire("begaie 79", vBegaie, 79, 12)
dire("alive avant suspens", vAlive, 87, 4, true)
// Second creux : il chante encore, puis "beat" accelere jusqu'a devenir une note
dire("chante 88", vChante, 88, 0, true)
dire("chante haut 90", vChanteHaut, 90, 0)
dire("beat qui devient une note", vGrain, 92, 0)
// Second drop
dire("titre drop 2", vTitre, 96, 0, true)
dire("begaie 103", vBegaie, 103, 12)
dire("consigne 111", vStay, 111, 8)
dire("consigne en accord 112", vStayAccord, 112, 8, true)
dire("begaie 119", vBegaie, 119, 12)
dire("alive 127", vAlive, 127, 4, true)
dire("consigne sortie", vStayAccord, 135, 8)
// Le morceau s'acheve : le joueur a tenu
dire("fin", vFin, 141, 0, true)

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le premier drop, on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, acid, ticks, tocs, drums, voix, lancer]
// Les deux pistes de voix ne sont pas rendues seules (voir plus haut)
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Venin", acid], ["Tics", ticks],
    ["Tocs", tocs], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 16], ["roule", 16, 32], ["acide", 32, 48], ["creux", 48, 56], ["drop", 56, 72],
        ["nu", 72, 76], ["plus", 76, 88], ["suspens", 88, 96], ["final", 96, 112], ["sommet", 112, 128],
        ["sortie", 128, 144]]
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
        // Les memes mesures que sur les references, sur le premier drop (mesures 56 a 72)
        const from = Math.floor(56 * barSec * rate), to = Math.min(n, Math.floor(72 * barSec * rate))
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
