// GLAS - Beat Survivor, mode Survie
// Dubstep lourde et lugubre - 140 BPM - Sol phrygien - 144 mesures (4 min 07)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de glas.src.ts
// (le morceau) et des instruments du dossier apparat/.
//
// Le glas, c'est la cloche des morts. Ici : une cloche grave qui sonne deux
// notes a un demi-ton l'une de l'autre, Sol et La bemol, et qui revient
// seule entre les blocs. Dessous, la dubstep : un tempo de 140 joue a
// demi-vitesse (le pied sur le premier temps, la caisse claire sur le
// troisieme), un sub tres bas qui porte tout le poids, et au-dessus de lui
// une basse qui gronde et qui parle.
//
// Deux references ont ete mesurees avant d'ecrire (Kryptic Minds - Six
// Degrees, Distance - Night Vision) : sub vers 49-50 Hz dans les deux, donc
// le morceau est en Sol ; grave plus lourd et aigu bien plus sombre que dans
// nos morceaux techno. Ce sont les cibles du mix.
//
// Ce qui vient des notes du vault (Dash Glitch, Underdog) :
// - deux instruments neufs. Gouffre : le sub, une sinusoide dont chaque note
//   detachee repart de la meme phase. Gueule : la basse qui gronde, trois
//   dents de scie desaccordees et un grognement d'harmoniques ecrases, dans
//   un filtre que fait bouger une horloge ;
// - la vitesse de cette horloge est ecrite dans chaque note, par la velocite :
//   noire, croche, triolet, double-croche. Le timbre change a chaque note,
//   sans automation ;
// - le grave est a un seul instrument (le sub), la basse qui gronde est
//   coupee en dessous de 90 Hz et saturee sans lui ;
// - arrangement par soustraction, un bloc qui demarre sans sa basse.
// Aucun souffle, aucune nappe : le lugubre vient de la cloche, du silence et
// du demi-ton. Pour le jeu : avant chaque drop, une demi-mesure de silence.
//
// Instruments : Frappe (grosse caisse), Gouffre (sub), Gueule (basse et
// bourdon), Lueur (le glas, les os) et Gresil (tics, tocs) sont ecrits pour
// ces morceaux (Apparat = instrument scriptable d'openDAW). Caisse claire et
// clap : TR-909.

const BPM = 140
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 144
const barSec = 240 / BPM
/** La duree d'une double-croche, en ms : l'horloge de la basse compte en pas. */
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
const GOUFFRE: string = "// @label Gouffre\n// @param attack   12    2     120   exp     ms\n// @param release  60    10    600   exp     ms\n// @param glide    50    1" +
"     600   exp     ms\n// @param harm     0.25  0     1     linear\n// @param depth    0.9   0     1     linear\n// @param dipms    140   40   " +
" 500   exp     ms\n// @param volume   0.8   0     1     linear\n\n// Le sub de la dubstep : une sinusoide longue, tout en bas, qui porte le poi" +
"ds\n// du morceau. Une seule voix.\n// - Une note detachee repart toujours de la phase zero : chaque attaque est\n//   la meme, et la somme ave" +
"c le pied ne change pas d'un coup a l'autre.\n// - Deux notes qui se chevauchent sont liees : la hauteur glisse (\"glide\")\n//   sans rupture, " +
"la phase continue.\n// - \"harm\" ajoute un peu de deuxieme et de troisieme harmonique par une\n//   saturation douce : de quoi entendre la note" +
" sur de petites enceintes,\n//   sans salir le grave.\n// - Toute note plus grave que 24 ne sonne pas : elle creuse le sub (\"depth\" =\n//   la " +
"profondeur du creux, \"dipms\" = le temps qu'il met a revenir). Le\n//   morceau en envoie une a chaque coup de pied.\nclass Processor {\n    att" +
"ackMs = 12\n    releaseMs = 60\n    glideMs = 50\n    harm = 0.25\n    depth = 0.9\n    dipMs = 140\n    volume = 0.8\n    held = []\n    phase = 0\n" +
"    freq = 49\n    target = 49\n    gate = false\n    env = 0\n    dip = 0\n    dipSmooth = 0\n    paramChanged(name, value) {\n        switch (nam" +
"e) {\n            case \"attack\": this.attackMs = value; break\n            case \"release\": this.releaseMs = value; break\n            case \"gli" +
"de\": this.glideMs = value; break\n            case \"harm\": this.harm = value; break\n            case \"depth\": this.depth = value; break\n     " +
"       case \"dipms\": this.dipMs = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, veloc" +
"ity, cent, id) {\n        if (pitch < 24) {\n            this.dip = 1\n            return\n        }\n        const freq = 440 * Math.pow(2, (pit" +
"ch - 69 + cent / 100) / 12)\n        if (this.held.length === 0) {\n            this.freq = freq\n            // Si la note precedente sonne en" +
"core, on ne casse pas l'onde ; sinon elle repart de zero\n            if (this.env < 0.02) {this.phase = 0}\n        }\n        this.held.push(" +
"{id, freq})\n        this.target = freq\n        this.gate = true\n    }\n    noteOff(id) {\n        this.held = this.held.filter(note => note.id" +
" !== id)\n        if (this.held.length === 0) {\n            this.gate = false\n        } else {\n            this.target = this.held[this.held." +
"length - 1].freq\n        }\n    }\n    reset() {\n        this.held = []\n        this.gate = false\n        this.env = 0\n        this.dip = 0\n  " +
"      this.dipSmooth = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const " +
"twoPi = 2 * Math.PI\n        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * 0.35 * sr))\n        const kAttack = 1 - Math.exp(-1 / (" +
"this.attackMs * 0.001 * 0.35 * sr))\n        const kRelease = Math.exp(-1 / (this.releaseMs * 0.001 * 0.35 * sr))\n        const kDip = Math.e" +
"xp(-1 / (this.dipMs * 0.001 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))\n        const push = 1 + this.harm * 3\n        //" +
" Un decalage avant la saturation fait naitre l'harmonique pair\n        const bias = 0.25 * this.harm\n        const norm = this.volume / Math" +
".tanh(push)\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.gate) {\n                this.env += (1 - this.env) * kA" +
"ttack\n            } else {\n                this.env *= kRelease\n                if (this.env < 0.0002) {\n                    this.dip *= kDi" +
"p\n                    continue\n                }\n            }\n            this.freq += (this.target - this.freq) * kGlide\n            this." +
"phase += this.freq / sr\n            if (this.phase >= 1) {this.phase -= 1}\n            this.dip *= kDip\n            this.dipSmooth += (this." +
"dip - this.dipSmooth) * kSmooth\n            const a = this.env * (1 - this.depth * this.dipSmooth)\n            const y = (Math.tanh((Math.si" +
"n(twoPi * this.phase) + bias) * a * push) - Math.tanh(bias * a * push)) * norm\n            outL[s] += y\n            outR[s] += y\n        }\n " +
"   }\n}"
const GUEULE: string = "// @label Gueule\n// @param pas      107   60    300   exp     ms\n// @param detune   14    0     50    linear  ct\n// @param growl    0.4   0 " +
"    1     linear\n// @param rank     11    2     16    linear\n// @param cutoff   110   50    800   exp     Hz\n// @param depth    3.2   0     " +
"6     linear\n// @param reso     0.45  0     0.95  linear\n// @param vowel    0.3   0     1     linear\n// @param shape    0.3   0     1     li" +
"near\n// @param drive    0.6   0     1     linear\n// @param tone     2800  600   8000  exp     Hz\n// @param lowcut   90    40    400   exp   " +
"  Hz\n// @param width    0.6   0     1     linear\n// @param glide    60    1     400   exp     ms\n// @param volume   0.6   0     1     linear" +
"\n\n// La basse qui gronde. Une seule voix, dans le medium : le grave est a un\n// autre instrument.\n// La source : trois dents de scie, une au" +
" centre et deux desaccordees\n// (\"detune\", en cents), une a gauche et une a droite : elles battent entre\n// elles. Par-dessus, un grognement" +
" (\"growl\") : une sinusoide et l'un de ses\n// harmoniques eleves (\"rank\" = son rang), ecrases ensemble.\n// Le mouvement : une horloge fait mo" +
"nter et descendre le filtre de \"depth\"\n// octaves au-dessus de \"cutoff\". Sa vitesse est ecrite dans chaque note, par\n// la velocite, en vale" +
"urs de temps (\"pas\" = la duree d'une double-croche) :\n//   0,3 = pas d'horloge : le filtre part ouvert et retombe (un \"ouaaa\") ;\n//   0,4 = " +
"une blanche ; 0,5 = une noire ; 0,6 = un triolet de noires ;\n//   0,7 = une croche ; 0,8 = un triolet de croches ; 0,9 = une double-croche ;" +
"\n//   1,0 = un triolet de doubles-croches.\n// L'horloge repart de zero a chaque note : le meme mouvement a chaque fois.\n// La velocite ne re" +
"gle donc pas le volume.\n// - \"shape\" : a 0 l'horloge est ronde (le filtre s'ouvre puis se referme :\n//   \"woub\"), a 1 elle tombe en dent de " +
"scie (il part ouvert : \"yoi\") ;\n// - \"vowel\" : a 0 un simple passe-bas ; a 1 deux pics qui bougent comme les\n//   resonances d'une bouche, e" +
"t la basse parle ;\n// - puis une saturation (\"drive\"), un passe-bas qui adoucit le haut (\"tone\")\n//   et un coupe-bas (\"lowcut\").\n// Deux no" +
"tes qui se chevauchent sont liees : la hauteur glisse (\"glide\").\nclass Processor {\n    pasMs = 107\n    detune = 14\n    growl = 0.4\n    rank " +
"= 11\n    cutoff = 110\n    depth = 3.2\n    reso = 0.45\n    vowel = 0.3\n    shape = 0.3\n    drive = 0.6\n    tone = 2800\n    lowcut = 90\n    wi" +
"dth = 0.6\n    glideMs = 60\n    volume = 0.6\n    held = []\n    freq = 98\n    target = 98\n    pc = 0\n    pu = 0.33\n    pd = 0.71\n    pg = 0\n  " +
"  gate = false\n    amp = 0\n    period = 0\n    age = 0\n    tick = 0\n    g = 0.1\n    g1 = 0.1\n    g2 = 0.2\n    lfo = 0\n    f = [0, 0, 0, 0, 0," +
" 0, 0, 0, 0, 0, 0, 0]\n    t = [0, 0, 0, 0]\n    h = [0, 0, 0, 0]\n    paramChanged(name, value) {\n        switch (name) {\n            case \"pa" +
"s\": this.pasMs = value; break\n            case \"detune\": this.detune = value; break\n            case \"growl\": this.growl = value; break\n    " +
"        case \"rank\": this.rank = value; break\n            case \"cutoff\": this.cutoff = value; break\n            case \"depth\": this.depth = v" +
"alue; break\n            case \"reso\": this.reso = value; break\n            case \"vowel\": this.vowel = value; break\n            case \"shape\": " +
"this.shape = value; break\n            case \"drive\": this.drive = value; break\n            case \"tone\": this.tone = value; break\n            " +
"case \"lowcut\": this.lowcut = value; break\n            case \"width\": this.width = value; break\n            case \"glide\": this.glideMs = value" +
"; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24" +
") {return}\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n        const legato = this.held.length > 0\n        this.h" +
"eld.push({id, freq})\n        this.target = freq\n        if (!legato) {\n            // Une note detachee repart d'un etat connu\n            t" +
"his.freq = freq\n            this.pc = 0\n            this.pu = 0.33\n            this.pd = 0.71\n            this.pg = 0\n        }\n        // L" +
"a vitesse de l'horloge, en doubles-croches : ecrite dans la velocite\n        const PERIODES = [0, 8, 4, 8 / 3, 2, 4 / 3, 1, 2 / 3]\n        c" +
"onst k = Math.max(0, Math.min(7, Math.round((velocity - 0.3) / 0.1)))\n        this.period = PERIODES[k]\n        this.age = 0\n        this.ga" +
"te = true\n    }\n    noteOff(id) {\n        this.held = this.held.filter(n => n.id !== id)\n        if (this.held.length === 0) {\n            t" +
"his.gate = false\n        } else {\n            this.target = this.held[this.held.length - 1].freq\n        }\n    }\n    reset() {\n        this." +
"held = []\n        this.gate = false\n        this.amp = 0\n        for (let i = 0; i < 12; i++) {this.f[i] = 0}\n    }\n    process(output, bloc" +
"k) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kGlide = 1 - Math.exp" +
"(-1 / (this.glideMs * 0.001 * 0.35 * sr))\n        const kUp = 1 - Math.exp(-1 / (0.003 * sr))\n        const kDown = 1 - Math.exp(-1 / (0.020" +
" * sr))\n        const kTone = 1 - Math.exp(-twoPi * this.tone / sr)\n        const kHp = 1 - Math.exp(-twoPi * this.lowcut / sr)\n        cons" +
"t pas = this.pasMs * 0.001 * sr\n        const ratio = Math.pow(2, this.detune / 1200)\n        const rank = Math.round(this.rank)\n        con" +
"st push = 1 + 8 * this.drive\n        const norm = this.volume / Math.sqrt(push)\n        const side = 0.5 + 0.5 * this.width\n        const da" +
"mp = 1.5 - 1.3 * this.reso\n        const vowel = this.vowel\n        const growl = this.growl\n        const mix = 1 - 0.5 * growl\n        con" +
"st f = this.f\n        const t = this.t\n        const h = this.h\n        for (let s = block.s0; s < block.s1; s++) {\n            this.amp += " +
"((this.gate ? 1 : 0) - this.amp) * (this.gate ? kUp : kDown)\n            if (this.amp < 0.0002 && !this.gate) {continue}\n            this.fr" +
"eq += (this.target - this.freq) * kGlide\n            const dt = this.freq / sr\n            // L'horloge du filtre, recalculee toutes les 8 n" +
"otes d'horloge\n            if ((this.tick++ & 7) === 0) {\n                let lfo\n                if (this.period === 0) {\n                 " +
"   lfo = Math.exp(-this.age / (3 * pas))\n                } else {\n                    const ph = (this.age / (this.period * pas)) % 1\n      " +
"              const rond = 0.5 - 0.5 * Math.cos(twoPi * ph)\n                    lfo = rond * (1 - this.shape) + Math.pow(1 - ph, 1.5) * this" +
".shape\n                }\n                this.lfo = lfo\n                const fc = Math.min(this.cutoff * Math.pow(2, this.depth * lfo), 600" +
"0)\n                this.g = 2 * Math.sin(Math.PI * fc / sr)\n                // Les deux pics de la bouche : ils montent avec l'horloge, pas " +
"a la meme vitesse\n                this.g1 = 2 * Math.sin(Math.PI * Math.min(280 * Math.pow(2, 1.6 * lfo), 6000) / sr)\n                this.g" +
"2 = 2 * Math.sin(Math.PI * Math.min(900 * Math.pow(2, 1.3 * lfo), 6000) / sr)\n            }\n            this.age++\n            // Les trois " +
"dents de scie, la marche arrondie (pas de repliement)\n            let dq = dt\n            let p = this.pc + dq\n            if (p >= 1) {p -=" +
" 1}\n            this.pc = p\n            let c = 2 * p - 1\n            if (p < dq) {const u = p / dq; c -= u + u - u * u - 1}\n            els" +
"e if (p > 1 - dq) {const u = (p - 1) / dq; c -= u * u + u + u + 1}\n            dq = dt * ratio\n            p = this.pu + dq\n            if (" +
"p >= 1) {p -= 1}\n            this.pu = p\n            let up = 2 * p - 1\n            if (p < dq) {const u = p / dq; up -= u + u - u * u - 1}\n" +
"            else if (p > 1 - dq) {const u = (p - 1) / dq; up -= u * u + u + u + 1}\n            dq = dt / ratio\n            p = this.pd + dq\n" +
"            if (p >= 1) {p -= 1}\n            this.pd = p\n            let down = 2 * p - 1\n            if (p < dq) {const u = p / dq; down -=" +
" u + u - u * u - 1}\n            else if (p > 1 - dq) {const u = (p - 1) / dq; down -= u * u + u + u + 1}\n            // Le grognement : une " +
"sinusoide et un harmonique eleve, dont le niveau suit l'horloge\n            this.pg += dt\n            if (this.pg >= 1) {this.pg -= 1}\n     " +
"       const gr = Math.tanh((Math.sin(twoPi * this.pg) + 0.7 * this.lfo * Math.sin(twoPi * rank * this.pg)) * 2.5) * growl\n            const" +
" a = this.amp * norm\n            for (let ch = 0; ch < 2; ch++) {\n                const x = ch === 0\n                    ? (c * 0.6 + up * s" +
"ide + down * (1 - side)) * 0.5 * mix + gr\n                    : (c * 0.6 + down * side + up * (1 - side)) * 0.5 * mix + gr\n                c" +
"onst o = ch * 6\n                // Le passe-bas\n                f[o] += this.g * f[o + 1]\n                f[o + 1] += this.g * (x - f[o] - d" +
"amp * f[o + 1])\n                // Les deux pics\n                f[o + 2] += this.g1 * f[o + 3]\n                f[o + 3] += this.g1 * (x - f" +
"[o + 2] - 0.22 * f[o + 3])\n                f[o + 4] += this.g2 * f[o + 5]\n                f[o + 5] += this.g2 * (x - f[o + 4] - 0.22 * f[o +" +
" 5])\n                const v = f[o] * (1 - vowel) + (f[o + 3] * 0.5 + f[o + 5] * 0.4) * vowel\n                let y = Math.tanh(v * push)\n  " +
"              // Passe-bas a deux etages, puis coupe-bas a deux etages\n                const k = ch * 2\n                t[k] += (y - t[k]) *" +
" kTone\n                t[k + 1] += (t[k] - t[k + 1]) * kTone\n                y = t[k + 1]\n                h[k] += (y - h[k]) * kHp\n         " +
"       y -= h[k]\n                h[k + 1] += (y - h[k + 1]) * kHp\n                y -= h[k + 1]\n                if (ch === 0) {outL[s] += y " +
"* a} else {outR[s] += y * a}\n            }\n        }\n    }\n}"
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
const project = openDAW.newProject("Glas")
project.bpm = BPM

// Une reverb : la caisse claire, le glas et les os. Rien d'autre.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.7, damping: 0.55, preDelay: 18, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seul", start: 0, bars: 8},
    {name: "Approche", start: 8, bars: 16},
    {name: "Drop 1a", start: 24, bars: 16},
    {name: "Drop 1b", start: 40, bars: 16},
    {name: "Creux", start: 56, bars: 16},
    {name: "Drop 2a", start: 72, bars: 16},
    {name: "Drop 2b", start: 88, bars: 16},
    {name: "Drop 2c", start: 104, bars: 16},
    {name: "Sortie", start: 120, bars: 24}
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

// ---------- La carte du morceau ----------
/** Les drops : la batterie entiere, le sub et la basse qui gronde. */
const drop = (bar: number) => (bar >= 24 && bar < 56) || (bar >= 72 && bar < 120)
/** Le bloc qui demarre sans sa basse : quatre mesures de batterie et de sub. */
const nu = (bar: number) => bar >= 88 && bar < 92
/** La mesure qui precede un drop : la seconde moitie reste vide. */
const avantDrop = (bar: number) => bar === 23 || bar === 71
const limite = (bar: number) => avantDrop(bar) ? 8 : 16
/** Derniere mesure d'un bloc de seize : une relance. */
const finDeBloc = (bar: number) => [39, 55, 87, 103, 119].includes(bar)
const rang = (bar: number) => bar % 4
/** Le pied et la caisse claire : absents au debut, legers a l'approche et dans la sortie. */
const batterie = (bar: number): number =>
    drop(bar) ? 1 : (bar >= 16 && bar < 24) || (bar >= 64 && bar < 72) || (bar >= 120 && bar < 132) ? 0.8 : 0

/** Les coups de pied d'une mesure : [pas, velocite]. Demi-vitesse : le pied tombe sur le premier temps. */
function kicks(bar: number): number[][] {
    const b = batterie(bar)
    if (b === 0) {return bar >= 8 && bar < 16 ? [[0, 0.6]] : []}
    const out: number[][] = [[0, b]]
    if (b === 1) {
        // Un second coup, deplace d'une mesure a l'autre ; trois en fin de phrase
        if (rang(bar) === 1) {out.push([11, 0.85])} else {out.push([10, 0.9])}
        if (rang(bar) === 3) {out.push([6, 0.75])}
    }
    return out.filter(k => k[0] < limite(bar))
}
/** La note 12 ne sonne pas : elle creuse le sub a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// Sol 1 = 49 Hz : le sub. La basse qui gronde joue une octave au-dessus.
const SOL1 = 31, SOL2 = 43

// ---------- Les phrases de basse ----------
// Chaque note : [pas, longueur en pas, demi-tons au-dessus du Sol, vitesse de l'horloge].
// La vitesse est la velocite que lit la Gueule : 0,3 = le filtre retombe
// ("ouaaa") ; 0,4 = blanche ; 0,5 = noire ; 0,6 = triolet de noires ; 0,7 =
// croche ; 0,8 = triolet de croches ; 0,9 = double-croche ; 1,0 = triolet de
// doubles-croches. Les longueurs tombent juste : trois battements de triolet
// dans une blanche, deux croches dans une noire.
// 1 = La bemol (le demi-ton), 3 = Si bemol, -2 = Fa.
type Phrase = number[][][]
const P1: Phrase = [
    [[0, 8, 0, 0.6], [8, 4, 0, 0.7], [12, 4, 1, 0.3]],
    [[0, 8, 0, 0.5], [8, 4, 3, 0.8], [12, 2, 0, 0.9]],
    [[0, 8, 0, 0.6], [8, 4, 0, 0.7], [12, 4, 1, 0.3]],
    [[0, 8, 0, 0.6], [8, 8, -2, 0.4]]
]
const P2: Phrase = [
    [[0, 4, 0, 0.8], [4, 4, 0, 0.7], [8, 8, 1, 0.6]],
    [[0, 6, 0, 0.7], [8, 4, 3, 0.8], [12, 4, 1, 0.3]],
    [[0, 4, 0, 0.8], [4, 4, 0, 0.7], [8, 8, 1, 0.6]],
    [[0, 8, -2, 0.5], [8, 4, 0, 0.9], [12, 4, 1, 0.3]]
]
const P3: Phrase = [
    [[0, 2, 0, 0.9], [2, 6, 0, 0.7], [8, 4, 0, 1.0], [12, 4, 1, 0.5]],
    [[0, 8, 0, 0.6], [8, 2, 3, 0.9], [10, 2, 1, 0.9], [12, 4, 0, 0.3]],
    [[0, 2, 0, 0.9], [2, 6, 0, 0.7], [8, 4, 0, 1.0], [12, 4, 1, 0.5]],
    [[0, 8, 0, 0.5], [8, 8, -2, 0.6]]
]
/** La phrase d'un bloc. */
function phraseDe(bar: number): Phrase | null {
    if (!drop(bar) || nu(bar)) {return null}
    if (bar < 40) {return P1}
    if (bar < 56) {return P2}
    if (bar < 88) {return P3}
    if (bar < 104) {return P1}
    return rang(Math.floor(bar / 4)) % 2 === 0 ? P3 : P2
}
/** Les notes de la mesure, coupees avant un drop. */
const notesDe = (bar: number): number[][] => {
    const p = phraseDe(bar)
    return p === null ? [] : p[rang(bar)].filter(n => n[0] < limite(bar))
}

// ---------- Frappe : la grosse caisse ----------
// Courte, accordee au-dessus du sub (58 Hz) : elle claque, et laisse le
// grave au sub.
const kick = apparat("Frappe", FRAPPE, -6)
reglages("frappe", kick, {tune: 58, start: 420, sweep: 40, decay: 95, punch: 0.7, click: 0.6, drive: 0.5})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))

// ---------- Gouffre : le sub ----------
// Il suit la basse qui gronde, une octave en dessous. Dans une mesure, ses
// notes se chevauchent : la hauteur glisse de l'une a l'autre. Il s'arrete
// avant la mesure suivante : chaque mesure repart de la meme phase, sous le
// meme coup de pied.
const sub = apparat("Gouffre", GOUFFRE, -12)
reglages("gouffre", sub, {attack: 14, release: 70, glide: 70, harm: 0.25, depth: 0.85, dipms: 130})
build(sub.noteTracks[0], "Gouffre", bar => {
    const out: Note[] = plongeons(bar)
    let notes = notesDe(bar)
    // Le bloc nu et la sortie : une seule note longue, le Sol. Avant un drop, pas de sub :
    // c'est le drop qui l'apporte.
    if (nu(bar) || (bar >= 120 && bar < 132)) {
        notes = [[0, Math.min(14, limite(bar)), rang(bar) === 3 && !avantDrop(bar) ? 1 : 0, 0]]
    }
    notes.forEach((n, k) => {
        const suivante = notes[k + 1]
        const liee = suivante !== undefined && suivante[0] === n[0] + n[1]
        const fin = Math.min(n[0] + n[1], 15.5)
        out.push({
            position: n[0] * S16,
            duration: Math.round((fin - n[0]) * S16 + (liee ? 40 : -30)),
            pitch: SOL1 + n[2], velocity: 1
        })
    })
    return out
})

// ---------- Gueule : la basse qui gronde ----------
const growl = apparat("Gueule", GUEULE, 2)
reglages("gueule", growl, {
    pas: PAS_MS, detune: 16, growl: 0.5, rank: 11, cutoff: 170, depth: 4, reso: 0.45, vowel: 0.45,
    shape: 0.3, drive: 0.65, tone: 4600, lowcut: 95, width: 0.6, glide: 60
})
build(growl.noteTracks[0], "Gueule", bar =>
    notesDe(bar).map(n => ({
        position: n[0] * S16, duration: Math.round(n[1] * S16 - 24), pitch: SOL2 + n[2], velocity: n[3]
    })))
// Elle parle de plus en plus : la bouche s'ouvre d'un bloc a l'autre
auto("gueule", growl, "vowel", [
    [0, 0.3], [24, 0.3], [40, 0.45], [56, 0.5], [72, 0.6], [88, 0.4], [104, 0.7], [120, 0.7], [144, 0.3]
])
auto("gueule", growl, "depth", enDroit([
    [0, 3.4], [24, 3.4], [56, 4.0], [72, 4.2], [104, 4.6], [120, 4.6], [144, 3.4]
], 0, 6))
auto("gueule", growl, "growl", [
    [0, 0.35], [24, 0.35], [56, 0.5], [72, 0.6], [88, 0.45], [104, 0.7], [144, 0.35]
])
// "shape" : ronde dans le premier drop ("woub"), plus tranchante dans le second ("yoi")
auto("gueule", growl, "shape", [[0, 0.2], [56, 0.3], [72, 0.5], [104, 0.6], [144, 0.2]])

// ---------- Le bourdon ----------
// La meme basse, fermee et lente, hors des drops : une note tenue qui
// respire une fois par blanche. Elle tient les passages vides sans les remplir.
const drone = apparat("Bourdon", GUEULE, -5)
reglages("bourdon", drone, {
    pas: PAS_MS, detune: 9, growl: 0.2, rank: 7, cutoff: 80, depth: 2.2, reso: 0.3, vowel: 0.55,
    shape: 0, drive: 0.4, tone: 1400, lowcut: 80, width: 0.8, glide: 300
})
build(drone.noteTracks[0], "Bourdon", bar => {
    const on = bar < 24 || (bar >= 56 && bar < 72) || bar >= 120
    if (!on || avantDrop(bar) || bar >= 142) {return []}
    // Une note par mesure, liee a la suivante : Sol, et le La bemol une mesure sur quatre
    const pitch = rang(bar) === 3 ? SOL2 + 1 : SOL2
    const suite = !avantDrop(bar + 1) && bar + 1 !== 24 && bar + 1 !== 72 && bar + 1 < 142
    return [{position: 0, duration: BAR + (suite ? 40 : -200), pitch, velocity: 0.4}]
})
auto("bourdon", drone, "volume", [
    [0, 0.35], [8, 0.5], [22, 0.6], [24, 0.6], [56, 0.5], [70, 0.62], [72, 0.6], [120, 0.5], [136, 0.5], [142, 0.3], [144, 0.3]
])

// ---------- Le glas ----------
// Une cloche grave, tres longue, qui sonne deux notes a un demi-ton : Sol et
// La bemol. Elle ouvre le morceau seule, marque les blocs, et le referme.
const GLAS: {[bar: number]: number[]} = {
    0: [55, 56], 4: [55], 8: [55, 56], 16: [55], 24: [43, 55], 40: [55, 56], 56: [55, 56], 60: [55],
    64: [55, 56], 72: [43, 55], 104: [55, 56], 120: [55, 56], 128: [55], 136: [55, 56], 140: [43]
}
const bell = apparat("Glas", LUEUR, -4)
reglages("glas", bell, {
    decay: 3800, matter: 0.6, strike: 0.5, damp: 0.3, chirp: 0, grain: 0.5, tonic: SOL2, just: 0,
    drift: 0.2, duck: 0, width: 0.6, drive: 0.15
})
bell.addAudioEffect("Delay", {delay: 13, feedback: 0.45, cross: 1, filter: 0.3, wet: -14})
bell.addSend(reverb, {amount: -8})
build(bell.noteTracks[0], "Glas", bar => {
    const notes = GLAS[bar]
    if (!notes) {return []}
    // La seconde note tombe un temps apres la premiere : les deux battent l'une contre l'autre
    return notes.map((pitch, k) => ({position: k * 4 * S16, duration: S16, pitch, velocity: k === 0 ? 1 : 0.75}))
})

// ---------- Les os ----------
// La meme percussion, tres courte, haute, en matiere de lame : un cliquetis
// rare, pris dans un echo.
const OS = [86, 89, 91]
const bones = apparat("Os", LUEUR, -2, 0.2)
reglages("os", bones, {
    decay: 55, matter: 0.95, strike: 0.75, damp: 0.7, chirp: 0, grain: 0.6, tonic: SOL2, just: 0,
    drift: 0.6, duck: 0, width: 0.8, drive: 0.1
})
bones.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.35, wet: -9})
bones.addSend(reverb, {amount: -16})
build(bones.noteTracks[0], "Os", bar => {
    const out: Note[] = []
    const on = (bar >= 8 && bar < 24) || (bar >= 40 && bar < 72) || (bar >= 104 && bar < 136)
    if (!on || avantDrop(bar)) {return out}
    const hit = (pos: number, k: number, velocity: number) => out.push({position: Math.round(pos * S16), duration: S16 / 2, pitch: OS[k], velocity})
    if (rang(bar) === 0) {hit(6, 0, 0.8)}
    if (rang(bar) === 1) {hit(3, 1, 0.6); hit(14, 0, 0.7)}
    // Une mesure sur quatre : trois coups en triolet
    if (rang(bar) === 3) {hit(4, 2, 0.8); hit(4 + 4 / 3, 1, 0.6); hit(4 + 8 / 3, 0, 0.7)}
    return out
})

// ---------- Gresil : les tics ----------
// Peu d'aigus : la dubstep sombre en a tres peu. Des croches a contretemps,
// et un triolet en fin de phrase.
const ticks = apparat("Tics", GRESIL, 6)
reglages("tics", ticks, {
    decay: 26, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7000, drift: 0.5, width: 0.5, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    if (b === 0 && !(bar >= 8 && bar < 16)) {return out}
    const hit = (pos: number, velocity: number) => {
        if (pos < limite(bar)) {out.push({position: Math.round(pos * S16), duration: S16 / 2, pitch: TIC, velocity})}
    }
    hit(2, 0.7); hit(6, 0.5); hit(10, 0.7); hit(14, 0.5)
    if (b === 1 && bar >= 40) {hit(13, 0.3); hit(15, 0.35)}
    if (b === 1 && rang(bar) === 3) {hit(12, 0.6); hit(12 + 4 / 3, 0.45); hit(12 + 8 / 3, 0.55)}
    return out
})

// ---------- Gresil : les tocs ----------
// Un coup sourd, grave, rare : la reponse au pied.
const tocs = apparat("Tocs", GRESIL, -9, -0.15)
reglages("tocs", tocs, {
    decay: 110, index: 2.2, snap: 5, body: 0.1, r2: 1.48, r3: 3.7, noise: 0.1, chirp: 9,
    lowcut: 110, drift: 0.5, width: 0.4, duck: 0
})
tocs.addAudioEffect("Delay", {delay: 13, feedback: 0.35, cross: 1, filter: 0.3, wet: -15})
build(tocs.noteTracks[0], "Tocs", bar => {
    const out: Note[] = []
    if (avantDrop(bar) || bar >= 136) {return out}
    const hit = (step: number, pitch: number, velocity: number) => out.push({position: step * S16, duration: S16 / 2, pitch, velocity})
    // Au debut et dans le creux, il est presque seul
    if (bar < 24 || (bar >= 56 && bar < 72) || bar >= 120) {
        if (rang(bar) === 1) {hit(4, 50, 0.8); hit(7, 46, 0.6)}
        if (rang(bar) === 3) {hit(10, 50, 0.7); hit(14, 53, 0.8)}
        return out
    }
    if (nu(bar)) {return out}
    if (rang(bar) === 1) {hit(14, 50, 0.7)}
    if (rang(bar) === 3) {hit(3, 46, 0.7)}
    if (finDeBloc(bar)) {hit(12, 53, 0.7); hit(13, 50, 0.8); hit(14, 46, 0.9)}
    return out
})

// ---------- Caisse claire et clap : TR-909 ----------
// La caisse claire tombe sur le troisieme temps, le clap la double. Un peu
// de reverb : c'est le seul son du morceau qui a droit a une salle.
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: 0})
const SNARE = 38, CLAP = 39
const kit: [string, number, any][] = [
    ["Snare", SNARE, {volume: -2}],
    ["Clap", CLAP, {volume: -7}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 6, outputGain: -4, mix: 0.6} as any))
drums.addSend(reverb, {amount: -13})
build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const b = batterie(bar)
    if (b === 0) {return out}
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})}
    }
    hit(8, SNARE, b); hit(8, CLAP, b * 0.8)
    if (b === 1 && (rang(bar) === 1 || rang(bar) === 3)) {hit(15, SNARE, 0.35)}
    // En fin de bloc, la caisse claire roule
    if (finDeBloc(bar)) {hit(12, SNARE, 0.5); hit(13, SNARE, 0.6); hit(14, SNARE, 0.75); hit(15, SNARE, 0.9)}
    return out
})

// Limiteur de sortie. Un cran de moins que dans les morceaux techno : les references de
// dubstep gardent plus d'ecart entre la crete et le niveau moyen.
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -2} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le premier drop, on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, sub, growl, drone, bell, bones, ticks, tocs, drums]
const STEMS: [string, any][] = [["Frappe", kick], ["Gouffre", sub], ["Gueule", growl], ["Bourdon", drone],
    ["Glas", bell], ["Os", bones], ["Tics", ticks], ["Tocs", tocs], ["909", drums]]
if (MESURER) {
    const parts = [["seul", 0, 8], ["approche", 8, 24], ["drop1a", 24, 40], ["drop1b", 40, 56], ["creux", 56, 72],
        ["drop2a", 72, 88], ["nu", 88, 92], ["drop2b", 92, 104], ["drop2c", 104, 120], ["sortie", 120, 144]]
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
        // Les memes mesures que sur les references, sur le premier drop (mesures 24 a 40)
        const from = Math.floor(24 * barSec * rate), to = Math.min(n, Math.floor(40 * barSec * rate))
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
                line += " || drop : partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
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
