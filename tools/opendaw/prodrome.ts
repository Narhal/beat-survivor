// PRODROME - Beat Survivor, mode Survie
// Techno minimale, un peu industrielle - 126 BPM - La - 160 mesures (5 min 05)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// prodrome.src.ts (le morceau) et des instruments du dossier apparat/.
//
// Le morceau qui fait la paire avec "Friche" : memes annees (Berlin, 2009),
// memes reperes mesures ("Pick a Chick" de Harry Axt, "Subzero" de Ben
// Klock), memes cibles de mix. Sa ligne principale est le Revers, choisi par
// N4 sur le banc d ecoute ("revers est top ! on garde").
//
// Un prodrome, c est le symptome qui annonce une maladie avant qu elle se
// declare.
// L idee, en une phrase : chaque note de metal a l envers annonce un coup.
// - Le Revers : une note qui sort du silence, enfle, s eclaircit et s arrete
//   net. On l ecrit avant l instant vise ; elle finit dessus.
// - D abord elle n annonce rien : elle s arrete sur du vide. Puis les coups
//   arrivent : au bout de certaines notes, la meme note frappee a l endroit
//   (une tole qu on laisse sonner). A l envers puis a l endroit : la note
//   devient un palindrome. Au sommet, chaque mesure a le sien.
// - Dans le creux, la machine s arrete et les notes s allongent (sept pas
//   au lieu de trois) : de longues inspirations, chacune suivie de son coup.
//
// Le dosage suit la regle tiree des deux references (voir le vault) : la
// ligne est absente pendant 24 mesures ; elle arrive une note toutes les
// quatre mesures, puis toutes les deux, puis par phrases ; elle n est chargee
// que pendant deux mesures (126 et 127), a la fin du sommet.
//
// Les notes : quatre seulement (Fa, Do, Re, Sol) sur un La. Ni la tonique, ni
// sa quinte, ni le demi-ton au-dessus d elle. Des phrases de trois mesures
// dans des blocs de seize : elles ne retombent pas sur leurs pieds. Apres le
// creux, la phrase est jouee dans l autre sens.
//
// Instruments (Apparat = instrument scriptable d openDAW) : Revers (choisi sur
// le banc), Tole (les coups a l endroit, le gong), Frappe (grosse caisse),
// Roulante (basse), Gresil (tics). Rim et clap : TR-909.

const BPM = 126
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 160
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : la basse et le Revers comptent en pas. */
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
const TOLE: string = "// @label Tole\n// @param tune    0     -100  100   linear  ct\n// @param decay   500   20    8000  exp     ms\n// @param damp    0.45  0     1" +
"     linear\n// @param metal   0.5   0     1     linear\n// @param strike  0.5   0     1     linear\n// @param drive   0.3   0     1     linear" +
"\n// @param gate    1     0     1     linear\n// @param volume  0.5   0     1     linear\n\n// Une tole qu'on frappe. Un retard tres court rebou" +
"cle sur lui-meme : c'est\n// un resonateur accorde (recette du \"retard court = resonateur\"). Ce qui le\n// frappe ne donne que le grain ; la n" +
"ote vient de la longueur du retard.\n// - \"decay\" : le temps que la tole met a se taire ;\n// - \"damp\" : ce que chaque tour de boucle perd en " +
"aigus (une tole epaisse) ;\n// - \"metal\" : a 0 les partiels sont justes (une corde) ; a 1 ils sont\n//   deplaces les uns par rapport aux autr" +
"es (une plaque) ;\n// - \"strike\" : la durete du coup. Le coup n'est pas du bruit : c'est une seule\n//   ondulation, large pour un maillet mou" +
" (son sourd), etroite pour un maillet\n//   dur (son clair). Elle dure moins d'un tour de boucle : quelques millisecondes ;\n// - \"drive\" : la" +
" saturation dans la boucle ; elle grossit le son et le tient ;\n// - \"gate\" : a 1 la fin de la note ecrite etouffe la tole (on peut la hacher" +
") ;\n//   a 0 elle sonne jusqu'au bout.\n// La velocite regle la force et la clarte du coup. Trois voix, en mono.\nclass Processor {\n    tune =" +
" 0\n    decayMs = 500\n    damp = 0.45\n    metal = 0.5\n    strike = 0.5\n    drive = 0.3\n    gate = 1\n    volume = 0.5\n    voices = [0, 1, 2].m" +
"ap(() => ({\n        on: false, id: -1, buf: new Float32Array(4096), w: 0, len: 400, g: 0.99, choke: 1, exc: 0, amp: 0, excLen: 1,\n        ap" +
": [0, 0, 0, 0, 0, 0, 0, 0], lp: 0, quiet: 0, order: 0\n    }))\n    count = 0\n    paramChanged(name, value) {\n        switch (name) {\n        " +
"    case \"tune\": this.tune = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"damp\": this.damp = value; " +
"break\n            case \"metal\": this.metal = value; break\n            case \"strike\": this.strike = value; break\n            case \"drive\": th" +
"is.drive = value; break\n            case \"gate\": this.gate = value; break\n            case \"volume\": this.volume = value; break\n        }\n  " +
"  }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {return}\n        let v = null\n        for (const w of this.voices) {\n   " +
"         if (!w.on) {v = w; break}\n            if (v === null || w.order < v.order) {v = w}\n        }\n        const sr = sampleRate\n        " +
"const f = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)\n        const period = sr / f\n        // Ce que les filtres de la " +
"boucle ajoutent au retard, a retirer pour rester juste\n        const a = 0.75 * this.metal\n        const k = 1 - 0.85 * this.damp\n        v." +
"len = Math.max(4, Math.min(4000, period - 4 * (1 - a) / (1 + a) - (1 - k) / k - 1))\n        v.g = Math.pow(10, -3 * period / (this.decayMs *" +
" 0.001 * sr))\n        v.choke = 1\n        v.on = true\n        v.id = id\n        v.order = ++this.count\n        v.quiet = 0\n        v.buf.fil" +
"l(0)\n        v.w = 0\n        v.lp = 0\n        for (let i = 0; i < 8; i++) {v.ap[i] = 0}\n        // Le coup : une ondulation, d'autant plus e" +
"troite que le maillet est dur et le coup fort\n        v.excLen = Math.max(4, Math.round(period * (0.62 - 0.57 * this.strike * (0.4 + 0.6 * v" +
"elocity))))\n        v.exc = v.excLen\n        v.amp = 0.3 + 0.7 * velocity\n    }\n    noteOff(id) {\n        if (this.gate < 0.5) {return}\n    " +
"    for (const v of this.voices) {\n            if (v.id === id && v.on) {v.choke = Math.pow(10, -3 * (v.len + 6) / (0.03 * sampleRate))}\n   " +
"     }\n    }\n    reset() {\n        for (const v of this.voices) {v.on = false}\n    }\n    process(output, block) {\n        const [outL, outR]" +
" = output\n        const a = 0.75 * this.metal\n        const k = 1 - 0.85 * this.damp\n        const push = 1 + 3 * this.drive\n        const v" +
"ol = this.volume\n        for (const v of this.voices) {\n            if (!v.on) {continue}\n            const buf = v.buf, ap = v.ap\n         " +
"   const g = v.g * v.choke\n            for (let s = block.s0; s < block.s1; s++) {\n                // On lit le retard, entre deux cases\n   " +
"             let pos = v.w - v.len\n                if (pos < 0) {pos += 4096}\n                const i0 = Math.floor(pos), fr = pos - i0\n    " +
"            let x = buf[i0] * (1 - fr) + buf[(i0 + 1) & 4095] * fr\n                // Quatre passe-tout : ils retardent les partiels inegale" +
"ment (le metal)\n                for (let j = 0; j < 4; j++) {\n                    const y = a * x + ap[j * 2] - a * ap[j * 2 + 1]\n          " +
"          ap[j * 2] = x\n                    ap[j * 2 + 1] = y\n                    x = y\n                }\n                // La perte d'aigu" +
"s a chaque tour\n                v.lp += (x - v.lp) * k\n                let y = Math.tanh(v.lp * push) / push\n                // Le coup : un" +
"e seule ondulation\n                let e = 0\n                if (v.exc > 0) {\n                    e = Math.sin(6.2832 * (v.excLen - v.exc) /" +
" v.excLen) * v.amp\n                    v.exc--\n                }\n                buf[v.w] = e + y * g\n                v.w = (v.w + 1) & 4095" +
"\n                const out = y * vol * 2\n                outL[s] += out\n                outR[s] += out\n                if (Math.abs(y) < 0.0" +
"0005 && v.exc === 0) {v.quiet++} else {v.quiet = 0}\n            }\n            if (v.quiet > 4096) {v.on = false}\n        }\n    }\n}"
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
const project = openDAW.newProject("Prodrome")
project.bpm = BPM

// Une petite salle, pour les coups de tole seulement. Le genre est sec.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.6, preDelay: 10, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seuil", start: 0, bars: 16},
    {name: "Machine", start: 16, bars: 16},
    {name: "Signes", start: 32, bars: 16},
    {name: "Annonce", start: 48, bars: 16},
    {name: "Incubation", start: 64, bars: 16},
    {name: "Creux", start: 80, bars: 16},
    {name: "Retour", start: 96, bars: 16},
    {name: "Declaration", start: 112, bars: 16},
    {name: "Usure", start: 128, bars: 16},
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
const droit = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo)
const loga = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo)

// ---------- La carte du morceau ----------
/** Le creux : la machine s arrete (mesures 80 a 96). */
const creux = (bar: number) => bar >= 80 && bar < 96
/** Le bloc qui demarre sans son grave : quatre mesures sans pied ni basse. */
const nu = (bar: number) => bar >= 128 && bar < 132
const kickOn = (bar: number) => !creux(bar) && !nu(bar) && bar < 156
/** La basse : elle entre au deuxieme bloc, revient avant le pied dans le creux, sort avant la fin. */
const bassOn = (bar: number) => bar >= 16 && bar < 152 && !(bar >= 80 && bar < 88) && !nu(bar)
/** La mesure qui precede un retour : le dernier temps reste vide. */
const avantRetour = (bar: number) => bar === 95 || bar === 131
const limite = (bar: number) => avantRetour(bar) ? 12 : 16

/**
 * La courbe protagoniste : la declaration, de 0 a 1, sur tout le morceau. Le
 * metal s eclaircit et se tend avec elle ; les tics s allongent.
 */
const DECLARATION = [[0, 0.1], [24, 0.15], [48, 0.4], [64, 0.55], [80, 0.45], [96, 0.7], [112, 0.9], [120, 1],
    [128, 0.7], [144, 0.4], [160, 0.1]]
const suit = (bas: number, haut: number, echelle: (v: number) => number) =>
    DECLARATION.map(p => [p[0], echelle(bas + (haut - bas) * p[1])])

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 55, start: 360, sweep: 46, decay: 165, punch: 0.6, click: 0.45, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar => {
    if (!kickOn(bar)) {return []}
    const force = bar < 48 || bar >= 144 ? 0.85 : 0.97
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step += 4) {out.push({position: step * S16, duration: S16, pitch: 36, velocity: force})}
    return out
})
auto("frappe", kick, "click", [[0, 0.15], [16, 0.45], [144, 0.45], [160, 0.15]])

// ---------- Roulante : la basse ----------
// Le meme La que le pied, jamais en meme temps que lui.
const LA1 = 33
const bass = apparat("Roulante", ROULANTE, -2)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    return (bar % 2 === 0 ? [3, 6, 11, 14] : [3, 6, 10, 14]).filter(step => step < limite(bar))
        .map((step, k) => ({position: step * S16, duration: S16, pitch: LA1, velocity: k === 0 ? 0.65 : 0.8}))
})
auto("roulante", bass, "envmod", suit(2.6, 3.6, v => droit(v, 0, 6)))

// ---------- Le metal a l envers ----------
// Une note finit "long" pas apres son debut : on l ecrit AVANT l instant vise.
// Chaque annonce : [pas ou elle FINIT (16 = le premier temps de la mesure
// suivante), note, 1 si un coup a l endroit la suit].
// Quatre notes sur un La : Fa, Do, Re, Sol. Au sommet, deux d entre elles
// sautent d une octave.
const FA3 = 53, DO4 = 60, RE3 = 50, SOL3 = 55, DO3 = 48, FA4 = 65
/** Le Revers court : la note dure trois pas. */
const LONG = 3
/** Le Revers long, pour le creux : sept pas. */
const LONG2 = 7
type Annonces = number[][]
/** Les premiers signes : une note toutes les quatre mesures, puis toutes les deux. Aucun coup ne suit. */
const SIGNES: {[bar: number]: Annonces} = {
    24: [[12, FA3, 0]], 28: [[6, DO4, 0]],
    32: [[12, FA3, 0]], 34: [[6, DO4, 0]], 37: [[12, RE3, 0]], 39: [[16, SOL3, 0]],
    40: [[12, FA3, 0]], 42: [[6, DO4, 0]], 43: [[14, FA3, 0]], 45: [[12, RE3, 0]], 47: [[16, SOL3, 1]]
}
/** La phrase : trois mesures. Le coup tombe au bout de sa derniere note. */
const PHRASE: Annonces[] = [
    [[4, FA3, 0], [14, DO4, 0]],
    [[8, RE3, 0], [12, FA3, 0]],
    [[6, SOL3, 1]]
]
/** La meme, avec une note de plus par mesure pleine. */
const PHRASE_PLUS: Annonces[] = [
    [[4, FA3, 0], [10, RE3, 0], [14, DO4, 0]],
    [[8, RE3, 0], [12, FA3, 1]],
    [[6, SOL3, 0], [16, DO4, 1]]
]
/** La phrase dans l autre sens : les memes instants, les notes prises par la fin. */
const ENVERS: Annonces[] = [
    [[4, SOL3, 0], [14, FA3, 0]],
    [[8, RE3, 0], [12, DO4, 0]],
    [[6, FA3, 1]]
]
/** Le sommet : quatre mesures qui tournent, un coup par mesure, deux sauts d octave. */
const SOMMET: Annonces[] = [
    [[4, FA3, 1], [10, DO4, 0], [14, RE3, 0]],
    [[6, SOL3, 0], [12, FA4, 1]],
    [[4, DO4, 1], [8, DO3, 0], [14, SOL3, 0]],
    [[4, FA3, 0], [8, DO4, 0], [12, RE3, 1], [15, FA3, 0]]
]
/** Les annonces courtes d une mesure. */
function annonces(bar: number): Annonces {
    if (bar < 48) {return SIGNES[bar] ?? []}
    if (bar < 64) {return PHRASE[(bar - 48) % 3]}
    if (bar < 80) {return PHRASE_PLUS[(bar - 64) % 3]}
    // Avant le retour de la machine : trois annonces qui montent, une par temps, puis un temps de vide
    if (bar === 95) {return [[4, FA3, 0], [8, SOL3, 0], [12, DO4, 0]]}
    if (bar < 96) {return []}
    if (bar < 112) {return ENVERS[(bar - 96) % 3]}
    // Les deux dernieres mesures du sommet : les seules vraiment chargees. Une annonce tous les deux pas.
    if (bar === 126) {return [[4, FA3, 1], [6, DO4, 0], [8, RE3, 0], [10, SOL3, 0], [12, FA4, 1], [14, DO4, 0], [16, RE3, 0]]}
    if (bar === 127) {return [[3, DO3, 0], [5, RE3, 0], [7, FA3, 0], [9, SOL3, 0], [11, DO4, 0], [13, FA4, 0], [16, FA3, 1]]}
    if (bar < 128) {return SOMMET[(bar - 112) % 4]}
    // Le bloc sans grave : la phrase seule, puis elle se defait
    if (bar === 131) {return [[4, FA3, 0], [8, SOL3, 0], [12, DO4, 0]]}
    if (bar < 144) {return PHRASE[(bar - 128) % 3]}
    // La sortie : une note toutes les deux mesures, puis toutes les quatre ; la derniere a son coup
    const SORTIE: {[bar: number]: Annonces} = {144: [[12, FA3, 0]], 146: [[6, DO4, 0]], 148: [[12, RE3, 0]], 152: [[12, FA3, 0]], 155: [[16, SOL3, 1]]}
    return SORTIE[bar] ?? []
}
/** Les annonces longues du creux : une inspiration de sept pas, et son coup. */
const LONGUES: {[bar: number]: Annonces} = {
    80: [[16, RE3, 1]], 82: [[16, FA3, 1]], 84: [[16, DO3, 1]], 86: [[16, FA3, 1]],
    88: [[8, RE3, 0], [16, SOL3, 1]], 90: [[16, FA3, 1]], 92: [[8, DO3, 0], [16, RE3, 1]], 94: [[16, FA3, 1]]
}

const revers = apparat("Revers", REVERS, 0)
reglages("revers", revers, {
    tune: 0, pas: PAS_MS, long: LONG, curve: 0.3, metal: 0.6, bright: 0.6, bend: 2, tail: 6, drive: 0.25, lowcut: 120
})
build(revers.noteTracks[0], "Revers", bar =>
    annonces(bar).map(a => ({position: (a[0] - LONG) * S16, duration: S16, pitch: a[1], velocity: 0.8})))
// Le voyage : le metal s eclaircit, et sa hauteur se tend davantage avant l arret
auto("revers", revers, "bright", suit(0.4, 0.85, v => v))
auto("revers", revers, "bend", suit(1.5, 4.5, v => droit(v, 0, 12)))

const reversLong = apparat("Revers long", REVERS, 1)
reglages("revers long", reversLong, {
    tune: 0, pas: PAS_MS, long: LONG2, curve: 0.4, metal: 0.7, bright: 0.5, bend: 3, tail: 8, drive: 0.25, lowcut: 110
})
build(reversLong.noteTracks[0], "Revers long", bar =>
    (LONGUES[bar] ?? []).map(a => ({position: (a[0] - LONG2) * S16, duration: S16, pitch: a[1], velocity: 0.85})))

// ---------- Tole : les coups a l endroit ----------
// Au bout de certaines annonces, la meme note frappee sur une tole qu on
// laisse sonner. Un peu d echo et de salle : c est le seul son qui y a droit.
const coups = apparat("Tole", TOLE, -1)
reglages("tole", coups, {tune: 0, decay: 800, damp: 0.9, metal: 0.7, strike: 0.3, drive: 0.5, gate: 0})
essai("echo tole", () => coups.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 0, filter: 0.3, wet: -16}))
coups.addSend(reverb, {amount: -14})
/** Les coups qui tombent dans une mesure : ceux qu annoncent les notes de cette mesure ou de la precedente. */
function coupsDe(bar: number): Note[] {
    const out: Note[] = []
    for (const b of [bar - 1, bar]) {
        if (b < 0) {continue}
        for (const a of annonces(b).concat(LONGUES[b] ?? [])) {
            if (a[2] !== 1) {continue}
            const abs = b * 16 + a[0]
            if (Math.floor(abs / 16) !== bar) {continue}
            out.push({position: (abs % 16) * S16, duration: S16, pitch: a[1], velocity: creux(b) ? 0.95 : 0.8})
        }
    }
    return out
}
build(coups.noteTracks[0], "Tole", coupsDe)
auto("tole", coups, "damp", suit(0.94, 0.78, v => v))
auto("tole", coups, "decay", [[0, 800], [79.9, 800], [80, 2200], [96, 800], [160, 800]].map(p => [p[0], loga(p[1], 20, 8000)]))

// ---------- Gresil : les tics ----------
// Un tic a contretemps, qui ne bouge pas ; autour de lui, des tics plus
// faibles dont le nombre change a chaque bloc. Aucun charley ouvert.
const ticks = apparat("Tics", GRESIL, -4.5)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
/** 0 = rien ; 1 = le contretemps ; 2 = + le pas d apres ; 3 = + le pas d avant ; 4 = toutes les doubles-croches ; 5 = des fantomes seuls. */
function vitesse(bar: number): number {
    if (bar < 8 || bar >= 152) {return 0}
    if (bar < 16) {return 5}
    if (bar < 48) {return 1}
    if (bar < 64) {return 2}
    if (bar < 80) {return 3}
    if (bar < 88) {return 0}
    if (bar < 96) {return 5}
    if (bar < 112) {return 3}
    if (bar < 128) {return 4}
    if (nu(bar)) {return 5}
    return bar < 144 ? 2 : 1
}
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const v = vitesse(bar)
    if (v === 0) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const beat = step % 4
        let force = 0
        if (v === 5) {force = beat === 2 ? 0.4 : 0}
        else {force = beat === 2 ? 0.85 : beat === 3 && v >= 2 ? 0.48 : beat === 1 && v >= 3 ? 0.36 : beat === 0 && v >= 4 ? 0.26 : 0}
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force})}
    }
    return out
})
auto("tics", ticks, "decay", suit(22, 36, v => loga(v, 5, 600)))

// ---------- Rim et clap : TR-909 ----------
// Le rim sur les temps 2 et 4, a partir des premiers signes. Le clap ne le
// double que pendant le sommet.
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -6.5})
const RIM = 37, CLAP = 39
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -6}],
    ["Clap", CLAP, {volume: -6}]
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
    if (bar >= 32 && bar < 144) {hit(4, RIM, 0.7); hit(12, RIM, 0.75)}
    if (bar >= 112 && bar < 128) {hit(4, CLAP, 0.7); hit(12, CLAP, 0.75)}
    return out
})

// Limiteur de sortie : les deux references sont tres tenues (10 dB entre les cretes et le niveau moyen)
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le bloc du retour (mesures 96 a 112), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, revers, reversLong, coups, ticks, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Revers", revers], ["Revers long", reversLong],
    ["Tole", coups], ["Tics", ticks], ["909", drums]]
if (MESURER) {
    const parts = [["seuil", 0, 16], ["machine", 16, 32], ["signes", 32, 48], ["annonce", 48, 64], ["incubation", 64, 80],
        ["creux", 80, 88], ["attente", 88, 96], ["retour", 96, 112], ["declaration", 112, 128], ["nu", 128, 132],
        ["usure", 132, 144], ["sortie", 144, 160]]
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
        // Les memes mesures que sur les references, sur le bloc du retour (mesures 96 a 112)
        const from = Math.floor(96 * barSec * rate), to = Math.min(n, Math.floor(112 * barSec * rate))
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
                line += " || retour : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
