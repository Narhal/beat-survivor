// PHOSPHORE - Beat Survivor, mode Survie
// Techno hypnotique - 124 BPM - Sol, gamme des harmoniques naturels - 144 mesures (4 min 39)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// phosphore.src.ts (le morceau) et des instruments du dossier apparat/.
//
// L'idee : une seule note grave, le Sol, tenue par le pied et la basse, et
// au-dessus d'elle ses propres harmoniques. Les voix aigues ne jouent pas les
// notes du clavier : elles sont accordees sur les harmoniques naturels du Sol
// (la quinte, la tierce, la septieme, et la onzieme, cette note entre deux
// touches qui n'existe sur aucun piano). Tout ce qui brille dans le morceau
// sort du grave, comme une lueur : d'ou le titre. Les notes etranges
// n'arrivent qu'une a une, bloc apres bloc.
//
// Premier morceau ecrit apres la lecture de la chaine Dash Glitch (vault,
// Concepts/Musique, "Dash Glitch - la boite a sons"). Ce qui en vient :
// - trois instruments neufs. Lueur : une percussion qui chante, un coup bref
//   dans des resonateurs accordes, sans oscillateur. Venin : une voix acid
//   dont l'accent frappe ensemble filtre, resonance et saturation. Roulante :
//   une basse en deux chemins, fondamentale propre d'un cote, harmoniques
//   satures de l'autre ;
// - chaque note repart du meme point et retombe a zero avant la suivante ;
//   les durees de la basse se comptent en pas, pas en millisecondes ;
// - la note de basse qui suit le pied se joue sans sa fondamentale ;
// - des motifs immobiles dont le timbre change a chaque pas : la velocite
//   ecrite dans les notes porte la couleur, pas le volume ;
// - des boucles de longueurs inegales (3 pas, 5 et 7 notes) contre les 16 pas
//   de la mesure : le motif complet ne revient qu'apres de longues minutes ;
// - un squelette regulier (pied, basse, clap) sous des voix qui tournent.
// Et d'Underdog : blocs de 16 mesures, arrangement par soustraction, un bloc
// qui demarre sans sa basse, les aigus qui changent de vitesse a chaque bloc.
//
// Pour le jeu : avant chaque drop, le dernier temps est vide et rien n'enfle.
// Le jeu repere un drop a la montee du niveau ; elle doit tomber sur le drop.
//
// Instruments : Frappe (grosse caisse), Roulante (basse), Venin (acid), Lueur
// (treillis, bois, halo) et Cymbale (charleys) sont ecrits pour ces
// morceaux (Apparat = instrument scriptable d'openDAW). Clap, rim, ride : TR-909.

const BPM = 124
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
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
const CYMBALE: string = "// @label Cymbale\n// @param decay   45    10    300   exp     ms\n// @param open    6     2     14    linear\n// @param tone    7000  3000  12" +
"000 exp     Hz\n// @param metal   0.5   0     1     linear\n// @param drift   0.5   0     1     linear\n// @param width   0.5   0     1     lin" +
"ear\n// @param volume  0.6   0     1     linear\n\n// Les charleys de synthese. Un charley, c'est du bruit et du metal : ici six\n// ondes carre" +
"es a des rapports qui ne tombent pas juste (le principe des\n// boites a rythmes), melangees a du bruit blanc (\"metal\" = la part de metal),\n/" +
"/ puis passees dans un filtre passe-haut (\"tone\") qui n'en garde que le haut.\n// Les notes 46 et au-dessus sont des charleys ouverts : \"open" +
"\" fois plus longs.\n// Un coup coupe le precedent, comme une vraie pedale.\n// Comme sur un instrument, un coup plus fort est plus long et plu" +
"s clair.\n// \"drift\" le fait vivre : une horloge lente allonge et raccourcit les coups\n// sur quelques mesures, un coup sur deux est un rien " +
"plus sombre, et chaque\n// coup sort a un endroit legerement different (\"width\").\nclass Processor {\n    decayMs = 45\n    open = 6\n    tone = " +
"7000\n    metal = 0.5\n    drift = 0.5\n    width = 0.5\n    volume = 0.6\n    amp = 0\n    kAmp = 0.99\n    attack = 0\n    level = 0\n    bright = " +
"1\n    left = 0.7\n    right = 0.7\n    count = 0\n    seed = 97531\n    lfo = 0\n    phases = [0, 0, 0, 0, 0, 0]\n    x1 = 0\n    x2 = 0\n    y1 = 0" +
"\n    y2 = 0\n    u1 = 0\n    u2 = 0\n    v1 = 0\n    v2 = 0\n    soft = 0\n    paramChanged(name, value) {\n        switch (name) {\n            cas" +
"e \"decay\": this.decayMs = value; break\n            case \"open\": this.open = value; break\n            case \"tone\": this.tone = value; break\n " +
"           case \"metal\": this.metal = value; break\n            case \"drift\": this.drift = value; break\n            case \"width\": this.width " +
"= value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const s" +
"r = sampleRate\n        this.count++\n        const sway = Math.sin(2 * Math.PI * this.lfo)\n        const long = pitch >= 46 ? this.open : 1\n " +
"       const ms = this.decayMs * long * (0.6 + 0.6 * velocity) * (1 + 0.3 * this.drift * sway)\n        this.kAmp = Math.exp(-1 / (ms * 0.001" +
" * sr))\n        this.amp = 1\n        this.attack = 0\n        this.level = velocity\n        // Un coup sur deux un rien plus sombre ; un coup" +
" fort plus clair\n        this.bright = (0.8 + 0.4 * velocity) * (1 - 0.12 * this.drift * (this.count % 2))\n        const place = (((this.cou" +
"nt * 0.6180339887) % 1) * 2 - 1) * this.width\n        const angle = (1 + place * 0.5) * Math.PI / 4\n        this.left = Math.cos(angle)\n    " +
"    this.right = Math.sin(angle)\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.amp = 0\n    }\n    process(output, block) {\n       " +
" const [outL, outR] = output\n        const sr = sampleRate\n        this.lfo += 0.07 * (block.s1 - block.s0) / sr\n        if (this.lfo >= 1) " +
"{this.lfo -= 1}\n        if (this.amp < 0.0003) {return}\n        // Les six carres : les rapports d'une vieille boite a rythmes, montes de de" +
"ux octaves\n        const base = 4 / sr\n        const steps = [205.3 * base, 304.4 * base, 369.6 * base, 522.7 * base, 540 * base, 800 * base" +
"]\n        // Passe-haut du second ordre, deux etages : stable jusqu en haut du spectre\n        const fc = Math.min(this.tone * this.bright, " +
"sr * 0.42)\n        const w = 2 * Math.PI * fc / sr\n        const alpha = Math.sin(w) / 1.414\n        const cw = Math.cos(w)\n        const a0" +
" = 1 + alpha\n        const b0 = (1 + cw) / 2 / a0\n        const b1 = -(1 + cw) / a0\n        const a1 = -2 * cw / a0\n        const a2 = (1 - " +
"alpha) / a0\n        // Un passe-bas doux vers 13 kHz : une vraie cymbale ne monte pas jusqu au bout\n        const kSoft = 1 - Math.exp(-2 * " +
"Math.PI * 13000 / sr)\n        const attackStep = 1 / (0.0006 * sr)\n        const norm = this.volume * 0.9\n        for (let s = block.s0; s <" +
" block.s1; s++) {\n            let sq = 0\n            for (let k = 0; k < 6; k++) {\n                let p = this.phases[k] + steps[k]\n       " +
"         if (p >= 1) {p -= 1}\n                this.phases[k] = p\n                sq += p < 0.5 ? 1 : -1\n            }\n            this.seed " +
"= (this.seed * 1664525 + 1013904223) >>> 0\n            const noise = this.seed / 2147483648 - 1\n            const x = sq / 6 * this.metal * " +
"1.6 + noise * (1 - this.metal)\n            const h = b0 * x + b1 * this.x1 + b0 * this.x2 - a1 * this.y1 - a2 * this.y2\n            this.x2 " +
"= this.x1\n            this.x1 = x\n            this.y2 = this.y1\n            this.y1 = h\n            const h2 = b0 * h + b1 * this.u1 + b0 * " +
"this.u2 - a1 * this.v1 - a2 * this.v2\n            this.u2 = this.u1\n            this.u1 = h\n            this.v2 = this.v1\n            this.v" +
"1 = h2\n            this.soft += (h2 - this.soft) * kSoft\n            if (this.attack < 1) {this.attack = Math.min(1, this.attack + attackSte" +
"p)}\n            const y = this.soft * this.amp * this.attack * this.level * norm\n            outL[s] += y * this.left\n            outR[s] +=" +
" y * this.right\n            this.amp *= this.kAmp\n        }\n    }\n}"

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
const project = openDAW.newProject("Phosphore")
project.bpm = BPM

// Une reverb, pour le halo et le clap seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.45, preDelay: 12, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Eveil", start: 0, bars: 16},
    {name: "Roule", start: 16, bars: 16},
    {name: "Venin", start: 32, bars: 16},
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
/** Une valeur reelle ramenee entre 0 et 1, pour un bouton a echelle droite ou logarithmique. */
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)

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
const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 96)
/** Le bloc qui demarre sans sa basse : quatre mesures de pied, de treillis et de charleys. */
const nu = (bar: number) => bar >= 72 && bar < 76
const kickOn = (bar: number) => bar >= 8 && bar < 140 && !inBreak(bar)
const bassOn = (bar: number) => bar >= 16 && bar < 136 && !inBreak(bar) && !nu(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 96 && bar < 128)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 95
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. */
const finDeBloc = (bar: number) => [31, 47, 71, 87, 111, 127].includes(bar)
/** Place dans la phrase de quatre mesures. */
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    const v = bar < 16 || bar >= 136 ? 0.8 : drop(bar) ? 1 : 0.92
    const out = [[0, v], [4, v], [8, v], [12, v]]
    // En fin de bloc, le pied lache son dernier temps : un trou avant la relance
    return finDeBloc(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Le Sol et ses harmoniques. Sol 1 = 49 Hz : le pied et la basse.
const SOL1 = 31, SOL2 = 43, SOL3 = 55, SOL4 = 67

// ---------- Frappe : la grosse caisse ----------
// Accordee sur le Sol (49 Hz), courte : elle doit avoir fini avant la deuxieme
// note de basse.
const kick = apparat("Frappe", FRAPPE, -6.5)
reglages("frappe", kick, {tune: 49, start: 360, sweep: 48, decay: 140, punch: 0.6, click: 0.55, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
// Le pied arrive etouffe et gagne son claquement en huit mesures
auto("frappe", kick, "click", [[0, 0.1], [8, 0.1], [16, 0.55], [128, 0.55], [140, 0.2], [144, 0.2]])

// ---------- Roulante : la basse ----------
// Trois notes entre deux coups de pied : "BOUM-ta-ta-ta". La premiere, celle
// qui suit le pied, se joue sans sa fondamentale (velocite 0,35) : la queue du
// pied et le grave de la basse ne s'additionnent jamais.
const bass = apparat("Roulante", ROULANTE, -3)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.8, cutoff: 95, envmod: 3.4, fdecay: 0.45, pinch: 0.55,
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
        // Le premier bloc roule a deux notes ("BOUM - ta-ta"), puis a trois
        if (bar >= 32) {note(s + 1, SOL1, 0.35)}
        note(s + 2, SOL1, 0.8)
        // Dans le final, la fin de phrase saute a l'octave
        const saut = bar >= 96 && beat === 3 && (rang(bar) === 1 || rang(bar) === 3)
        note(s + 3, saut ? SOL2 : SOL1, saut ? 0.6 : 0.8)
    }
    // En fin de bloc, la basse se tait avec le pied
    return finDeBloc(bar) ? out.filter(e => e.position < 12 * S16) : out
})
// La basse s'ouvre un peu a chaque bloc, et respire sur une vague de 12 mesures
auto("roulante", bass, "envmod", vague([
    [0, droit(2.6, 0, 6)], [32, droit(3.0, 0, 6)], [56, droit(3.6, 0, 6)], [96, droit(3.8, 0, 6)],
    [112, droit(4.2, 0, 6)], [128, droit(3.4, 0, 6)], [144, droit(2.4, 0, 6)]
], 12, 0.04))
auto("roulante", bass, "long", [
    [0, droit(0.72, 0.2, 1.5)], [56, droit(0.8, 0.2, 1.5)], [112, droit(0.88, 0.2, 1.5)], [128, droit(0.78, 0.2, 1.5)], [144, droit(0.7, 0.2, 1.5)]
])

// ---------- Venin : la voix acid ----------
// Le rythme tient sur 16 pas et ne bouge pas ; les hauteurs tournent sur 7
// notes et les couleurs sur 5. La velocite ne regle pas le volume : de 0,5 a
// 0,85 elle ferme ou ouvre le filtre de la note, et a partir de 0,9 la note
// est accentuee.
type Motif = {steps: number[], accents: number[], slides: number[]}
// V0 : le squelette. V1 : la boucle. V2 : le sommet.
const V0: Motif = {steps: [0, 3, 8, 11, 14], accents: [3, 11], slides: []}
const V1: Motif = {steps: [0, 2, 3, 5, 7, 8, 10, 11, 14], accents: [3, 7, 14], slides: [2, 10]}
const V2: Motif = {steps: [0, 2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 15], accents: [3, 7, 11, 15], slides: [2, 6, 10, 14]}
// Demi-tons au-dessus du Sol 2 : 12 = l'octave, -2 = le Fa (la septieme), 6 = le Do diese (la onzieme)
const HAUTEURS_SAGES = [0, 0, 12, 0, 0, 0, 12]
const HAUTEURS = [0, 0, 12, 0, -2, 0, 6]
const HAUTEURS_SOMMET = [0, 12, 12, 0, -2, 12, 6]
const COULEURS = [0.2, 0.55, 0.95, 0.35, 0.75]
const couleur = (accent: boolean, c: number) => accent ? 0.9 + 0.1 * c : 0.5 + 0.35 * c

const acid = apparat("Venin", VENIN, -1)
reglages("venin", acid, {
    cutoff: 260, reso: 0.78, envmod: 2.2, decay: 300, accent: 0.7, tint: 1.0, glide: 80,
    shape: 0, drive: 0.45, lowcut: 190, tonic: SOL2, just: 1, duck: 0.35
})
// Les accents sortaient en pointes (20 dB au-dessus du niveau moyen) : une saturation les rabote avant l'echo
essai("saturation venin", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 12, outputGain: -8, mix: 0.8} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.32, cross: 1, filter: 0.45, wet: -21})

function motifAcid(bar: number): Motif | null {
    if (bar >= 32 && bar < 40) {return V0}
    if (bar >= 40 && bar < 48) {return V1}
    if (bar >= 48 && bar < 52) {return V0}
    if (bar >= 52 && bar < 72) {return V1}
    if (bar >= 76 && bar < 88) {return V1}
    if (bar >= 92 && bar < 112) {return V1}
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
        // Le rang de la note depuis le debut du morceau : les deux boucles tournent sans se soucier des mesures
        const n = bar * motif.steps.length + k
        const slide = motif.slides.includes(step)
        out.push({
            position: step * S16,
            // Une note liee deborde sur la suivante : c'est le chevauchement qui fait glisser
            duration: Math.round(S16 * (slide ? 1.3 : 0.55)),
            pitch: SOL2 + hauteurs[n % 7],
            velocity: couleur(motif.accents.includes(step), COULEURS[n % 5])
        })
    })
    return out
})
// Le filtre monte lentement tout le morceau ; dans les creux il se referme puis s'ouvre
auto("venin", acid, "cutoff", vague([
    [0, loga(170, 60, 4000)], [32, loga(170, 60, 4000)], [48, loga(300, 60, 4000)], [48, loga(150, 60, 4000)],
    [55.75, loga(520, 60, 4000)], [56, loga(380, 60, 4000)], [88, loga(520, 60, 4000)], [88, loga(200, 60, 4000)],
    [95.75, loga(700, 60, 4000)], [96, loga(480, 60, 4000)], [112, loga(600, 60, 4000)], [128, loga(760, 60, 4000)],
    [136, loga(200, 60, 4000)], [144, loga(150, 60, 4000)]
], 12, 0.03))
auto("venin", acid, "envmod", vague([
    [0, droit(1.6, 0, 5)], [32, droit(1.6, 0, 5)], [56, droit(2.4, 0, 5)], [96, droit(2.8, 0, 5)],
    [128, droit(3.2, 0, 5)], [136, droit(1.6, 0, 5)], [144, droit(1.4, 0, 5)]
], 20, 0.03))
// L'ecart de couleur entre deux notes grandit bloc apres bloc
auto("venin", acid, "tint", [
    [0, droit(0.5, 0, 3)], [32, droit(0.5, 0, 3)], [56, droit(1.2, 0, 3)], [96, droit(1.6, 0, 3)],
    [112, droit(2.0, 0, 3)], [128, droit(2.0, 0, 3)], [136, droit(0.8, 0, 3)], [144, droit(0.5, 0, 3)]
])
auto("venin", acid, "reso", vague([
    [0, 0.74], [48, 0.78], [48, 0.88], [56, 0.78], [88, 0.82], [88, 0.90], [96, 0.80], [128, 0.84], [144, 0.74]
], 28, 0.015))
auto("venin", acid, "decay", [
    [0, loga(240, 60, 2000)], [48, loga(280, 60, 2000)], [48, loga(600, 60, 2000)], [56, loga(300, 60, 2000)],
    [88, loga(340, 60, 2000)], [88, loga(700, 60, 2000)], [96, loga(320, 60, 2000)], [128, loga(380, 60, 2000)],
    [136, loga(220, 60, 2000)], [144, loga(200, 60, 2000)]
])

// ---------- Le treillis : la lueur ----------
// Un coup tous les trois pas, sans jamais s'arreter : trois contre seize, il
// ne retombe sur le premier temps que toutes les trois mesures. Ses notes
// tournent sur 7, ses forces sur 5. Les pas sont comptes depuis le premier
// drop (mesure 56) : c'est la que toutes les boucles repartent ensemble.
const ORIGINE = 56 * 16
/** Le rang du coup de treillis qui tombe sur ce pas (negatif avant le drop), ou null s'il n'y en a pas. */
const coup = (bar: number, step: number): number | null => {
    const t = bar * 16 + step - ORIGINE
    return ((t % 3) + 3) % 3 === 0 ? t / 3 : null
}
// Les harmoniques du Sol, une octave sous la zone ou l'oreille fatigue :
// 67 = Sol, 74 = Re (3/2), 79 = Sol, 77 = Fa (7/4), 71 = Si (5/4), 73 = Do diese (11/8)
const TREILLIS = [
    {jusqua: 32, notes: [67, 74, 67, 74, 67, 79, 74]},
    {jusqua: 56, notes: [67, 74, 67, 77, 67, 79, 74]},
    {jusqua: 96, notes: [67, 74, 71, 77, 67, 73, 74]},
    {jusqua: 128, notes: [67, 73, 71, 77, 79, 73, 74]},
    {jusqua: 999, notes: [67, 74, 67, 74, 67, 79, 74]}
]
const FORCES = [1, 0.5, 0.72, 0.42, 0.85]
const tirageTreillis = hasard(20261112)
const lattice = apparat("Treillis", LUEUR, -2.5)
reglages("treillis", lattice, {
    decay: 190, matter: 0.2, strike: 0.5, damp: 0.5, chirp: 0, grain: 0.3, tonic: SOL2, just: 1,
    drift: 0.5, duck: 0.35, width: 0.7, drive: 0.15
})
lattice.addAudioEffect("Delay", {delay: 13, feedback: 0.42, cross: 1, filter: 0.35, wet: -15})
build(lattice.noteTracks[0], "Treillis", bar => {
    const out: Note[] = plongeons(bar)
    const notes = (TREILLIS.find(t => bar < t.jusqua) as {notes: number[]}).notes
    // Un coup sur deux au reveil et a la sortie, un sur quatre tout a la fin
    const pas = bar < 8 || (bar >= 136 && bar < 142) ? 2 : bar >= 142 ? 4 : 1
    for (let step = 0; step < limite(bar); step++) {
        const n = coup(bar, step)
        if (n === null) {continue}
        const i = ((n % 35) + 35) % 35
        const jitter = (tirageTreillis() - 0.5) * 0.1
        if (((n % pas) + pas) % pas !== 0) {continue}
        out.push({position: step * S16, duration: S16 / 2, pitch: notes[i % 7], velocity: Math.max(0.3, Math.min(1, FORCES[i % 5] + jitter))})
    }
    return out
})
// La matiere passe lentement du verre au metal ; les notes sonnent plus longtemps quand le pied se tait
auto("treillis", lattice, "matter", vague([
    [0, 0.12], [56, 0.22], [96, 0.40], [128, 0.55], [144, 0.15]
], 16, 0.04))
auto("treillis", lattice, "decay", [
    [0, loga(420, 30, 4000)], [8, loga(420, 30, 4000)], [16, loga(190, 30, 4000)], [48, loga(190, 30, 4000)],
    [48, loga(480, 30, 4000)], [56, loga(480, 30, 4000)], [56, loga(200, 30, 4000)], [88, loga(220, 30, 4000)],
    [88, loga(520, 30, 4000)], [96, loga(520, 30, 4000)], [96, loga(210, 30, 4000)], [136, loga(240, 30, 4000)],
    [140, loga(600, 30, 4000)], [144, loga(900, 30, 4000)]
])
auto("treillis", lattice, "strike", vague([
    [0, 0.35], [56, 0.5], [112, 0.62], [128, 0.5], [144, 0.3]
], 10, 0.05))

// ---------- Le bois : la reponse ----------
// Une octave plus bas, une matiere de lame, une petite chute de hauteur a
// l'attaque. Il ne joue que la ou le treillis et le pied se taisent : les deux
// voix ne tombent jamais ensemble. Trois notes : Sol, Re, Fa.
const BOIS = [SOL3, 62, 53]
const tirageBois = hasard(4711)
const wood = apparat("Bois", LUEUR, -3, -0.15)
reglages("bois", wood, {
    decay: 130, matter: 0.8, strike: 0.45, damp: 0.6, chirp: 5, grain: 0.5, tonic: SOL2, just: 1,
    drift: 0.6, duck: 0.3, width: 0.4, drive: 0.25
})
wood.addSend(reverb, {amount: -22})
/** Un roulement de bois qui enfle : la relance avant un drop. */
function roulement(from: number, to: number, base: number, gain: number): Note[] {
    const out: Note[] = []
    for (let step = from; step < to; step++) {
        const k = step - from
        out.push({
            position: step * S16, duration: S16 / 2, pitch: BOIS[k % 3 === 0 ? 1 : k % 2 === 0 ? 0 : 2],
            velocity: Math.min(1, (k % 3 === 0 ? 0.8 : 0.5) * (base + gain * k / (to - from)))
        })
    }
    return out
}
build(wood.noteTracks[0], "Bois", bar => {
    if (bar === 55 || bar === 95) {return roulement(0, 12, 0.6, 0.6)}
    const on = (bar >= 32 && bar < 48) || (bar >= 56 && bar < 72) || (bar >= 76 && bar < 88) || (bar >= 96 && bar < 136)
    const out: Note[] = plongeons(bar)
    if (!on) {return out}
    // Les pas possibles : hors des temps. On garde ceux que le treillis laisse libres.
    const candidats = [3, 6, 10, 14]
    candidats.forEach((step, k) => {
        const garde = tirageBois() < 0.82
        if (coup(bar, step) !== null || !garde) {return}
        out.push({position: step * S16, duration: S16 / 2, pitch: BOIS[(bar + k) % 3], velocity: k % 2 === 0 ? 0.9 : 0.6})
    })
    // En fin de bloc, trois coups qui montent
    if (finDeBloc(bar)) {
        out.push({position: 12 * S16, duration: S16 / 2, pitch: BOIS[2], velocity: 0.6})
        out.push({position: 13 * S16, duration: S16 / 2, pitch: BOIS[0], velocity: 0.75})
        out.push({position: 15 * S16, duration: S16 / 2, pitch: BOIS[1], velocity: 0.95})
    }
    return out
})

// ---------- Le halo : les marqueurs ----------
// La meme percussion, tres longue, noyee dans son echo. Elle ouvre les blocs,
// et dans le second creux elle deplie un a un les harmoniques du Sol :
// Sol, Si, Re, Fa, La, Do diese (4, 5, 6, 7, 9, 11 fois la note grave).
const HALOS: {[bar: number]: number[]} = {
    0: [SOL4, 74], 16: [SOL4], 32: [SOL4, 77], 48: [77, 73], 56: [SOL4, 74, 79], 76: [SOL4],
    88: [SOL3, SOL4], 89: [71], 90: [74], 91: [77], 92: [81], 93: [85], 94: [73, 77],
    96: [SOL4, 74, 79], 112: [SOL4, 73], 128: [SOL4, 74], 140: [SOL4, 74, 79]
}
const halo = apparat("Halo", LUEUR, -11)
reglages("halo", halo, {
    decay: 2600, matter: 0.45, strike: 0.55, damp: 0.35, chirp: 0, grain: 0.4, tonic: SOL2, just: 1,
    drift: 0.3, duck: 0, width: 0.8, drive: 0.1
})
halo.addAudioEffect("Delay", {delay: 13, feedback: 0.58, cross: 1, filter: 0.3, wet: -10})
halo.addSend(reverb, {amount: -10})
build(halo.noteTracks[0], "Halo", bar => {
    const notes = HALOS[bar]
    if (!notes) {return []}
    return notes.map((pitch, k) => ({position: k * 3 * S16, duration: S16, pitch, velocity: k === 0 ? 1 : 0.7}))
})

// ---------- Cymbale : les charleys ----------
// Leur vitesse change a chaque bloc. Note 42 = ferme, 46 = ouvert.
const hats = apparat("Cymbale", CYMBALE, 5.5)
reglages("cymbale", hats, {decay: 38, open: 5, tone: 5800, metal: 0.5, drift: 0.6, width: 0.5})
function vitesse(bar: number): number {
    if (!kickOn(bar) || bar < 16) {return 0}
    if (bar < 32) {return 1}                 // un charley a contretemps
    if (bar < 56) {return 2}                 // + les doubles-croches en sourdine
    if (bar < 72) {return 3}                 // le contretemps s'ouvre
    if (bar < 76) {return 1}                 // le bloc nu
    if (bar < 96) {return 3}
    if (bar < 112) {return 4}                // toutes les doubles-croches, accent a contretemps
    if (bar < 128) {return 5}                // + la ride
    if (bar < 136) {return 2}
    return 1
}
build(hats.noteTracks[0], "Cymbale", bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        if (beat === 2) {
            out.push({position: step * S16, duration: S16 / 2, pitch: v >= 3 ? 46 : 42, velocity: v >= 3 ? 0.8 : 0.7})
        } else if (v >= 4 || (v >= 2 && beat === 3) || (v >= 3 && beat === 1)) {
            // Un pas sur deux un rien plus faible : la main qui retombe
            out.push({position: step * S16, duration: S16 / 2, pitch: 42, velocity: beat === 0 ? 0.3 : beat === 3 ? 0.5 : 0.38})
        }
    }
    return out
})
auto("cymbale", hats, "decay", vague([
    [0, loga(30, 10, 300)], [56, loga(38, 10, 300)], [112, loga(48, 10, 300)], [128, loga(34, 10, 300)], [144, loga(28, 10, 300)]
], 6, 0.04))

// ---------- Clap, rim, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const RIM = 37, CLAP = 39, RIDE = 51
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -9, panning: 0.2}],
    ["Clap", CLAP, {volume: -3}],
    ["Ride", RIDE, {volume: -13, panning: -0.15}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -20})
build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})}
    }
    if (!kickOn(bar)) {return out}
    // Le clap n'arrive qu'au premier drop : deuxieme et quatrieme temps
    if (drop(bar) && !nu(bar)) {hit(4, CLAP, 0.85); hit(12, CLAP, 0.9)}
    // Le rim : une syncope, deux mesures sur quatre
    if (bar >= 32 && bar < 136 && !nu(bar) && (rang(bar) === 1 || rang(bar) === 3)) {hit(7, RIM, 0.6); hit(13, RIM, 0.45)}
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
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, acid, lattice, wood, halo, hats, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Venin", acid], ["Treillis", lattice],
    ["Bois", wood], ["Halo", halo], ["Cymbale", hats], ["909", drums]]
if (MESURER) {
    const parts = [["eveil", 0, 16], ["roule", 16, 32], ["venin", 32, 48], ["creux", 48, 56], ["drop", 56, 72],
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
            for (let i = from; i < to; i++) {sx += L[i] * L[i]}
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
