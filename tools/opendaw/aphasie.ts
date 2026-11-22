// APHASIE - Beat Survivor, mode Survie
// Techno minimale, un peu industrielle - 127 BPM - La phrygien - 160 mesures (5 min 02)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de aphasie.src.ts
// (le morceau) et des instruments du dossier apparat/.
//
// Le second morceau de la paire commencee avec "Friche" : memes annees (Berlin,
// 2009), memes reperes mesures ("Pick a Chick" de Harry Axt, "Subzero" de Ben
// Klock), memes cibles de mix : tout au centre, presque pas d aigu, le poids
// vers 55 Hz, tres peu d ecart entre les cretes et le niveau moyen.
//
// Retour de N4 sur "Friche" : la ligne de metal (Rivet) est tres bien mais
// "un peu naive, voire attendue dans le domaine" ; il cherche "une sonorite
// plus originale", "quelque chose de novateur" a cette place.
//
// L idee, en une phrase : une machine qui essaie de parler et n y arrive pas.
// - A la place du bleep, une BOUCHE (l instrument Glotte) : elle fabrique des
//   syllabes sans mots ("wa", "ao", "di", "bo", "oi"...), par les resonances
//   d une voix de synthese. Aucun echantillon, aucun bruit. Les voix hachees
//   sont une signature de la techno minimale de ces annees-la ; ici la voix
//   est construite de toutes pieces, et elle ne dit rien.
// - Ce qu elle dit vient de trois registres de longueurs inegales, lus en
//   meme temps : onze cases pour savoir si elle parle, sept pour la note, cinq
//   pour la syllabe. Un seuil decide combien de cases laissent passer une
//   syllabe : il baisse au fil du morceau, elle parle de plus en plus, puis de
//   moins en moins. Trois fois, on rouvre un registre pour y changer une case.
// - Une syllabe dure jusqu a la suivante : celles qui sont suivies d un
//   silence sont longues, comme les syllabes accentuees d une phrase.
// - En fin de phrase, la derniere syllabe part dans un echo : le seul.
// - Avant chaque retour de la machine, la bouche begaie.
//
// Ce qui change par rapport a "Friche", cote machine :
// - la basse joue tous les trois pas, sauf sous le pied et juste apres lui :
//   son dessin ne se repete que toutes les trois mesures ;
// - sur les temps 2 et 4, un coup de tole etouffe, a la place du rim ;
// - les tics : un contretemps qui ne bouge pas, et autour de lui des tics
//   faibles choisis par une fenetre qui tourne de plus en plus vite ;
// - La au lieu de Si bemol (55 Hz), 127 BPM, 160 mesures.
//
// Les recettes employees :
// - Dash Glitch : deux ou trois resonances qui bougent separement (un lead a
//   voyelles) ; chaque note repart du meme point (les trois ondes de la voix
//   repartent de zero a chaque battement) ; le registre a longueurs inegales
//   et son seuil ; le charley a fenetre ; la batterie booleenne (la basse est
//   "tous les trois pas ET PAS le pied").
// - Underdog : les quatre regles du minimalisme ; une courbe protagoniste ; un
//   effet qui vaut par sa rarete ; la tension par le retrait ; un seul acteur
//   dans le grave a la fois.
//
// Instruments (Apparat = instrument scriptable d openDAW) : Glotte est ecrite
// pour ce morceau ; Tole vient de "Friche" ; Frappe (grosse caisse), Roulante
// (basse) et Gresil (tics) des morceaux precedents. Aucun echantillon.

const BPM = 127
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
const GLOTTE: string = "// @label Glotte\n// @param tune    0     -100  100   linear  ct\n// @param size    1     0.6   1.5   linear\n// @param open    0.5   0     1  " +
"   linear\n// @param glide   1     0.3   4     linear\n// @param tight   90    30    400   exp     Hz\n// @param tone    0.5   0     1     line" +
"ar\n// @param drop    2     0     12    linear  st\n// @param attack  4     1     40    exp     ms\n// @param release 30    5     300   exp    " +
" ms\n// @param drive   0.2   0     1     linear\n// @param lowcut  110   40    400   exp     Hz\n// @param volume  0.5   0     1     linear\n\n//" +
" Une bouche. Elle ne dit pas de mots : elle fabrique des syllabes (\"wa\",\n// \"yo\", \"di\", \"ao\"...), sans echantillon et sans bruit.\n// Comment" +
" : a chaque battement de la voix (la note jouee donne leur nombre par\n// seconde), trois petites ondes repartent de zero et s'eteignent auss" +
"itot.\n// Leurs hauteurs sont celles des trois resonances d'une bouche (les\n// \"formants\") : ce sont elles qui font qu'on entend un \"a\" ou un" +
" \"i\". Une\n// syllabe, c'est le passage d'une forme de bouche a une autre.\n// - La VELOCITE de la note ne regle pas le volume : elle choisit " +
"la syllabe.\n//   0,30 = \"wa\" ; 0,35 = \"yo\" ; 0,40 = \"ba\" ; 0,45 = \"di\" ; 0,50 = \"ou\" ;\n//   0,55 = \"ai\" ; 0,60 = \"oi\" ; 0,65 = \"eu\" ; 0,70 =" +
" \"ao\" ; 0,75 = \"we\" ;\n//   0,80 = \"ya\" ; 0,85 = \"bo\" ; 0,90 = \"de\" ; 0,95 = \"mou\".\n// - La bouche est une seule : une syllabe part de la ou " +
"la precedente s'est\n//   arretee, comme quand on parle.\n// - \"size\" : la taille de la bouche. Plus petit que 1 = une grande bouche,\n//   une" +
" voix plus sombre ; plus grand = une petite bouche ;\n// - \"open\" : l'ouverture de la machoire (0 = presque fermee, 1 = grande ouverte) ;\n// " +
"- \"glide\" : multiplie le temps que met la bouche a changer de forme ;\n// - \"tight\" : la largeur des resonances. Etroit = une voix de machine" +
", qui\n//   sonne ; large = une voix sourde ;\n// - \"tone\" : la force des deux resonances du haut (la clarte) ;\n// - \"drop\" : la voix descend " +
"pendant la syllabe, en demi-tons ;\n// - \"drive\" : une saturation ajoutee a cote du son propre ;\n// - \"lowcut\" : coupe le bas, pour laisser l" +
"e grave au pied et a la basse.\n// Une seule voix, en mono, au centre.\nclass Processor {\n    tune = 0\n    size = 1\n    open = 0.5\n    glide =" +
" 1\n    tight = 90\n    tone = 0.5\n    drop = 2\n    attackMs = 4\n    releaseMs = 30\n    drive = 0.2\n    lowcut = 110\n    volume = 0.5\n    // L" +
"es formes de bouche : les trois resonances, en Hz\n    // 0 a, 1 e, 2 i, 3 o, 4 ou, 5 eu, 6 e ouvert, 7 levres fermees, 8 langue au palais\n  " +
"  VOY = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240],\n        [500, 1500, 2500], [660, 1720," +
" 2410], [180, 800, 2200], [200, 1700, 2600]]\n    // Les syllabes : forme de depart, forme d'arrivee, duree du passage en ms\n    SYL = [[4, 0" +
", 45], [2, 3, 45], [7, 0, 22], [8, 2, 25], [4, 4, 1], [0, 2, 130], [3, 2, 130], [5, 5, 1],\n        [0, 4, 120], [4, 1, 45], [2, 0, 45], [7, " +
"3, 22], [8, 6, 25], [7, 4, 30]]\n    id = -1\n    gate = false\n    env = 0\n    freq = 110\n    t = 0\n    ph = 0\n    tau = 0\n    // La forme de " +
"bouche en cours, celle d'ou part la syllabe, celle ou elle va\n    cur = [500, 1500, 2500]\n    from = [500, 1500, 2500]\n    to = [500, 1500, " +
"2500]\n    move = 1\n    fp = [0, 0, 0]\n    fe = [0, 0, 0]\n    w = [0, 0, 0]\n    tilt = [1, 1, 1]\n    hp = [0, 0]\n    paramChanged(name, value" +
") {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"size\": this.size = value; break\n            " +
"case \"open\": this.open = value; break\n            case \"glide\": this.glide = value; break\n            case \"tight\": this.tight = value; brea" +
"k\n            case \"tone\": this.tone = value; break\n            case \"drop\": this.drop = value; break\n            case \"attack\": this.attack" +
"Ms = value; break\n            case \"release\": this.releaseMs = value; break\n            case \"drive\": this.drive = value; break\n            " +
"case \"lowcut\": this.lowcut = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, " +
"cent, id) {\n        if (pitch < 24) {return}\n        const k = Math.max(0, Math.min(13, Math.round((velocity - 0.3) / 0.05)))\n        const " +
"syl = this.SYL[k]\n        const a = this.VOY[syl[0]], b = this.VOY[syl[1]]\n        // La bouche part de la ou elle est : si elle se tait, el" +
"le prend la forme de depart\n        const parle = this.env > 0.05\n        for (let i = 0; i < 3; i++) {\n            this.from[i] = parle ? t" +
"his.cur[i] * 0.4 + a[i] * 0.6 : a[i]\n            this.to[i] = b[i]\n        }\n        this.move = Math.max(1, syl[2] * this.glide) * 0.001 * " +
"sampleRate\n        this.freq = 440 * Math.pow(2, (pitch - 69 + (cent + this.tune) / 100) / 12)\n        this.id = id\n        this.t = 0\n     " +
"   this.gate = true\n        if (!parle) {this.ph = 1}\n    }\n    noteOff(id) {\n        if (id === this.id) {this.gate = false}\n    }\n    rese" +
"t() {\n        this.gate = false\n        this.env = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr" +
" = sampleRate\n        const twoPi = 2 * Math.PI\n        const kUp = 1 - Math.exp(-1 / (this.attackMs * 0.001 * 0.4 * sr))\n        const kDow" +
"n = Math.exp(-1 / (this.releaseMs * 0.001 * 0.3 * sr))\n        const kBw = Math.exp(-Math.PI * this.tight / sr)\n        const kHp = 1 - Math" +
".exp(-twoPi * this.lowcut / sr)\n        const dropTau = 0.15 * sr\n        const amp = [1, 0.6 * this.tone + 0.1, 0.3 * this.tone]\n        co" +
"nst jaw = 0.65 + 0.7 * this.open\n        const rise = 0.0005 * sr\n        const dry = 1 - 0.6 * this.drive\n        const fp = this.fp, fe = " +
"this.fe, w = this.w, hp = this.hp\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.gate) {\n                this.env " +
"+= (1 - this.env) * kUp\n            } else {\n                this.env *= kDown\n                if (this.env < 0.0002) {this.env = 0; continu" +
"e}\n            }\n            // La forme de la bouche : recalculee toutes les 16 notes d'horloge\n            if ((this.t & 15) === 0) {\n    " +
"            const u = Math.min(1, this.t / this.move)\n                const g = u * u * (3 - 2 * u)\n                for (let i = 0; i < 3; i" +
"++) {\n                    this.cur[i] = this.from[i] + (this.to[i] - this.from[i]) * g\n                    const f = this.cur[i] * this.size" +
" * (i === 0 ? jaw : 1)\n                    w[i] = twoPi * Math.min(f, sr * 0.4) / sr\n                    // Plus une resonance est haute, mo" +
"ins elle est forte : sans cela les \"i\"\n                    // percent entre 2 et 6 kHz, la ou l'oreille fatigue\n                    this.til" +
"t[i] = i === 0 ? 1 : Math.min(1, Math.pow(1200 / f, 1.1))\n                }\n            }\n            // Le battement de la voix : a chaque " +
"tour, les trois ondes repartent de zero\n            const f0 = this.freq * Math.pow(2, -this.drop / 12 * (1 - Math.exp(-this.t / dropTau)))\n" +
"            this.ph += f0 / sr\n            if (this.ph >= 1) {\n                this.ph -= 1\n                this.tau = 0\n                for" +
" (let i = 0; i < 3; i++) {fp[i] = 0; fe[i] = 1}\n            }\n            let x = 0\n            for (let i = 0; i < 3; i++) {\n              " +
"  x += Math.sin(fp[i]) * fe[i] * amp[i] * this.tilt[i]\n                fp[i] += w[i]\n                fe[i] *= kBw\n            }\n            " +
"// Chaque onde nait en un demi-millieme de seconde : pas de clic\n            if (this.tau < rise) {x *= this.tau / rise}\n            this.ta" +
"u++\n            this.t++\n            x *= 0.5\n            let y = x * dry + Math.tanh(x * 4) * 0.35 * this.drive\n            // Coupe-bas a " +
"deux etages\n            hp[0] += (y - hp[0]) * kHp\n            y -= hp[0]\n            hp[1] += (y - hp[1]) * kHp\n            y -= hp[1]\n    " +
"        y *= this.env * this.volume\n            outL[s] += y\n            outR[s] += y\n        }\n    }\n}"
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

// ---------- Projet ----------
const project = openDAW.newProject("Aphasie")
project.bpm = BPM

// Une petite salle, pour le gong et l echo de la voix seulement. Le genre est sec.
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.55, damping: 0.6, preDelay: 10, wet: 0, dry: -60} as any)

const SECTIONS = [
    {name: "Seuil", start: 0, bars: 16},
    {name: "Machine", start: 16, bars: 16},
    {name: "Tole", start: 32, bars: 16},
    {name: "Parole", start: 48, bars: 16},
    {name: "Glissement", start: 64, bars: 16},
    {name: "Mutisme", start: 80, bars: 16},
    {name: "Retour", start: 96, bars: 16},
    {name: "Logorrhee", start: 112, bars: 16},
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
/** Le mutisme : la machine s arrete (mesures 80 a 96). */
const mutisme = (bar: number) => bar >= 80 && bar < 96
/** Le bloc qui demarre sans son grave : quatre mesures sans pied ni basse. */
const nu = (bar: number) => bar >= 128 && bar < 132
const kickOn = (bar: number) => !mutisme(bar) && !nu(bar) && bar < 156
/** La basse : elle entre au deuxieme bloc, revient avant le pied dans le mutisme, sort avant la fin. */
const bassOn = (bar: number) => bar >= 16 && bar < 152 && !(bar >= 80 && bar < 88) && !nu(bar)
/** La mesure qui precede un retour : la bouche begaie, puis le dernier temps reste vide. */
const avantRetour = (bar: number) => bar === 95 || bar === 131
const limite = (bar: number) => avantRetour(bar) ? 12 : 16
const rang = (bar: number) => bar % 4

/**
 * La courbe protagoniste : la parole, de 0 a 1, sur tout le morceau. Elle
 * monte par paliers, retombe dans le mutisme, culmine a la mesure 120 et se
 * tait. Le seuil du registre, l ouverture de la bouche, sa clarte, sa
 * saturation et la vitesse des tics en sortent.
 */
const PAROLE = [[0, 0.1], [16, 0.2], [32, 0.35], [48, 0.55], [64, 0.7], [80, 0.45], [88, 0.6], [96, 0.75],
    [112, 0.9], [120, 1], [128, 0.7], [144, 0.4], [160, 0.05]]
/** La valeur de la courbe a une mesure donnee. */
function parole(bar: number): number {
    for (let k = 1; k < PAROLE.length; k++) {
        if (bar < PAROLE[k][0]) {
            const a = PAROLE[k - 1], b = PAROLE[k]
            return a[1] + (b[1] - a[1]) * (bar - a[0]) / (b[0] - a[0])
        }
    }
    return PAROLE[PAROLE.length - 1][1]
}
/** Un parametre qui suit la parole, de `muet` a `bavard` ; `echelle` le ramene entre 0 et 1. */
const suit = (muet: number, bavard: number, echelle: (v: number) => number) =>
    PAROLE.map(p => [p[0], echelle(muet + (bavard - muet) * p[1])])

// ---------- Frappe : la grosse caisse ----------
// Un La (55 Hz). Elle garde de la reserve jusqu au bloc "Parole".
const kick = apparat("Frappe", FRAPPE, -7)
reglages("frappe", kick, {tune: 55, start: 360, sweep: 46, decay: 165, punch: 0.6, click: 0.45, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar => {
    if (!kickOn(bar)) {return []}
    const force = bar < 48 || bar >= 144 ? 0.85 : 1
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step += 4) {out.push({position: step * S16, duration: S16, pitch: 36, velocity: force})}
    return out
})
auto("frappe", kick, "click", [[0, 0.15], [16, 0.45], [144, 0.45], [160, 0.15]])

// ---------- Roulante : la basse ----------
// Tous les trois pas, depuis la premiere mesure, SAUF sous le pied et juste
// apres lui : un seul acteur dans le grave a la fois. Trois ne divise pas
// seize : le dessin ne se repete que toutes les trois mesures.
// Une mesure sur quatre, sa derniere note monte d un demi-ton : la menace.
const LA1 = 33
const bass = apparat("Roulante", ROULANTE, -2)
reglages("roulante", bass, {
    pas: PAS_MS, long: 0.9, cutoff: 85, envmod: 3.0, fdecay: 0.35, pinch: 0.5,
    sub: 0.8, sublen: 0.7, disperse: 0.3, drive: 0.45
})
build(bass.noteTracks[0], "Roulante", bar => {
    if (!bassOn(bar)) {return []}
    const pas: number[] = []
    for (let step = 0; step < limite(bar); step++) {
        if ((bar * 16 + step) % 3 === 0 && step % 4 >= 2) {pas.push(step)}
    }
    return pas.map((step, k) => ({
        position: step * S16, duration: S16, pitch: rang(bar) === 3 && k === pas.length - 1 ? LA1 + 1 : LA1,
        velocity: step % 4 === 3 ? 0.7 : 0.8
    }))
})
auto("roulante", bass, "envmod", suit(2.6, 3.8, v => droit(v, 0, 6)))

// ---------- Glotte : la bouche ----------
// Trois registres, lus en meme temps a chaque double-croche depuis la premiere
// mesure. Aucun n a la longueur de la mesure.
/** Onze cases : la bouche parle si la case depasse le seuil du moment. */
const PORTE = [0.95, 0.2, 0.6, 0.4, 0.85, 0.1, 0.7, 0.3, 0.5, 0.9, 0.45]
/** Sept cases : la note, en demi-tons au-dessus du La. 1 = le Si bemol (la menace), 7 = le Mi, -2 = le Sol. */
const NOTES0 = [0, 0, 1, 0, 7, 0, -2]
/** Cinq cases : la syllabe. 0 wa, 1 yo, 2 ba, 3 di, 4 ou, 5 ai, 6 oi, 7 eu, 8 ao, 9 we, 10 ya, 11 bo, 12 de, 13 mou. */
const SYLLABES0 = [0, 8, 3, 11, 6]
/**
 * Les registres d un bloc. Trois fois, on en rouvre un pour y changer une case
 * (mesures 64, 96 et 112) ; a la mesure 128 ils reviennent a ce qu ils etaient.
 */
function registres(bar: number): {notes: number[], syllabes: number[]} {
    const notes = NOTES0.slice(), syllabes = SYLLABES0.slice()
    if (bar >= 64 && bar < 128) {syllabes[1] = 9}       // "ao" devient "we"
    if (bar >= 96 && bar < 128) {syllabes[3] = 13; notes[5] = 12}   // "bo" devient "mou" ; un La saute d une octave
    if (bar >= 112 && bar < 128) {syllabes[0] = 10}     // "wa" devient "ya"
    return {notes, syllabes}
}
/** Le seuil : il baisse quand la parole monte. A 0,8 trois cases sur onze passent ; a 0,35, huit. */
const seuil = (bar: number) => mutisme(bar) && bar < 88 ? 0.8 : 0.85 - 0.5 * parole(bar)
const parle = (t: number) => PORTE[t % 11] > seuil(Math.floor(t / 16))
const LA2 = 45
/** La velocite ne regle pas le volume : elle choisit la syllabe. */
const syllabe = (k: number) => 0.3 + 0.05 * k

type Dit = Note & {echo: boolean}
/** Ce que la bouche dit dans une mesure. */
function dits(bar: number): Dit[] {
    const out: Dit[] = []
    if (bar >= 156) {return out}
    // Avant un retour, elle begaie : la meme syllabe a chaque pas, puis un temps de vide
    if (avantRetour(bar)) {
        const k = bar === 95 ? 2 : 3    // "ba ba ba", puis "di di di"
        for (let step = 0; step < 12; step++) {
            out.push({position: step * S16, duration: S16 - 60, pitch: LA2 + (step >= 8 ? 1 : 0), velocity: syllabe(k), echo: false})
        }
        return out
    }
    const r = registres(bar)
    // Dans le mutisme elle parle lentement : ses syllabes peuvent durer six pas
    const longueur = mutisme(bar) && bar < 88 ? 6 : 3
    for (let step = 0; step < 16; step++) {
        const t = bar * 16 + step
        if (!parle(t)) {continue}
        // Une syllabe dure jusqu a la suivante : suivie d un silence, elle est longue (accentuee)
        let len = 1
        while (len < longueur && !parle(t + len)) {len++}
        out.push({
            position: step * S16, duration: len * S16 - (len === 1 ? 50 : 30), pitch: LA2 + r.notes[t % 7],
            velocity: syllabe(r.syllabes[t % 5]), echo: false
        })
    }
    // En fin de phrase de huit mesures, la derniere syllabe part dans l echo
    if (bar % 8 === 7 && out.length > 0 && bar >= 32) {out[out.length - 1].echo = true}
    return out
}
const BOUCHE = {
    tune: 0, size: 0.9, open: 0.4, glide: 1, tight: 90, tone: 0.4, drop: 2, attack: 4, release: 30, drive: 0.2, lowcut: 120
}
const voix = apparat("Glotte", GLOTTE, -2)
reglages("glotte", voix, BOUCHE)
build(voix.noteTracks[0], "Glotte", bar =>
    dits(bar).filter(d => !d.echo).map(d => ({position: d.position, duration: d.duration, pitch: d.pitch, velocity: d.velocity})))
// La meme bouche, pour les syllabes qui partent dans l echo
const lance = apparat("Glotte echo", GLOTTE, -5)
reglages("glotte echo", lance, BOUCHE)
essai("echo glotte", () => lance.addAudioEffect("Delay", {delay: 13, feedback: 0.55, cross: 0, filter: 0.35, wet: -5}))
lance.addSend(reverb, {amount: -12})
build(lance.noteTracks[0], "Glotte echo", bar =>
    dits(bar).filter(d => d.echo).map(d => ({position: d.position, duration: d.duration, pitch: d.pitch, velocity: d.velocity})))
// Le voyage : la machoire s ouvre, la voix s eclaircit, se sature ; dans le
// mutisme la bouche grandit (une voix plus sombre) et change de forme lentement
for (const [nom, unit] of [["glotte", voix], ["glotte echo", lance]] as [string, any][]) {
    auto(nom, unit, "open", suit(0.2, 0.8, v => v))
    auto(nom, unit, "tone", suit(0.25, 0.6, v => v))
    auto(nom, unit, "drive", suit(0.08, 0.45, v => v))
    auto(nom, unit, "size", [[0, 0.9], [79.99, 0.9], [80, 0.76], [88, 0.82], [96, 0.9], [160, 0.9]].map(p => [p[0], droit(p[1], 0.6, 1.5)]))
    auto(nom, unit, "glide", [[0, 1], [79.99, 1], [80, 2.6], [88, 1.6], [96, 1], [160, 1]].map(p => [p[0], droit(p[1], 0.3, 4)]))
}

// ---------- Tole : le coup sur les temps 2 et 4 ----------
// Une plaque etouffee des qu elle est frappee : un coup sec de metal, a la
// place d un rim. C est un Mi (la quinte) ; une fois toutes les huit mesures
// le dernier coup monte au Fa.
const MI3 = 52
const clang = apparat("Tole", TOLE, -3)
reglages("tole", clang, {tune: 0, decay: 350, damp: 0.8, metal: 0.8, strike: 0.5, drive: 0.5, gate: 1})
build(clang.noteTracks[0], "Tole", bar => {
    const out: Note[] = []
    if (!kickOn(bar) || bar < 32 || bar >= 144) {return out}
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: Math.round(S16 * 0.7), pitch, velocity})}
    }
    hit(4, MI3, 0.8)
    hit(12, bar % 8 === 7 ? MI3 + 1 : MI3, 0.85)
    // Dans les blocs les plus pleins, un coup fantome avant le premier temps
    if (bar >= 96 && bar < 128 && bar % 2 === 1) {hit(15, MI3, 0.4)}
    return out
})
auto("tole", clang, "damp", suit(0.9, 0.7, v => v))

// ---------- Tole : le gong ----------
// La meme plaque, grave, qu on laisse sonner : en tete de bloc seulement, et
// deux fois dans le mutisme. Elle a droit a la salle et a un echo.
const gong = apparat("Gong", TOLE, -2)
reglages("gong", gong, {tune: 0, decay: 2600, damp: 0.93, metal: 0.7, strike: 0.2, drive: 0.6, gate: 0})
essai("echo gong", () => gong.addAudioEffect("Delay", {delay: 13, feedback: 0.45, cross: 0, filter: 0.3, wet: -14}))
gong.addSend(reverb, {amount: -10})
build(gong.noteTracks[0], "Gong", bar => {
    const tete = bar >= 32 && bar % 16 === 0 && bar < 160
    if (tete || bar === 84) {return [{position: 0, duration: S16, pitch: LA1 + 12, velocity: bar === 84 ? 0.6 : 0.95}]}
    return []
})

// ---------- Gresil : les tics ----------
// Un tic a contretemps, qui ne bouge pas. Autour de lui, des tics faibles
// choisis par une fenetre qui s ouvre plusieurs fois par mesure : plus la
// machine parle, plus la fenetre tourne vite, et le dessin change a chaque
// phrase de huit mesures. Aucun charley ouvert.
const ticks = apparat("Tics", GRESIL, -3)
reglages("tics", ticks, {
    decay: 28, index: 8, snap: 2, body: 0.5, r2: 2.41, r3: 5.63, noise: 0.5, chirp: 0,
    lowcut: 7500, drift: 0.5, width: 0.15, duck: 0
})
essai("saturation tics", () => ticks.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 8, outputGain: -6, mix: 1} as any))
const TIC = 84
build(ticks.noteTracks[0], "Tics", bar => {
    const out: Note[] = []
    if (bar < 8 || bar >= 152 || nu(bar) || (bar >= 80 && bar < 88)) {return out}
    const fantomes = bar < 16 || mutisme(bar)
    // La vitesse de la fenetre : fixe pendant huit mesures, en demi-tours par mesure
    const tours = Math.round((1.5 + 5 * parole(Math.floor(bar / 8) * 8)) * 2) / 2
    for (let step = 0; step < limite(bar); step++) {
        const contretemps = step % 4 === 2
        const fenetre = ((step / 16) * tours + 0.13) % 1 < 0.22
        let force = 0
        if (contretemps) {force = fantomes ? 0.4 : 0.85}
        else if (fenetre && bar >= 32) {force = step % 2 === 1 ? 0.4 : 0.3}
        if (force > 0) {out.push({position: step * S16, duration: S16 / 2, pitch: TIC, velocity: force})}
    }
    return out
})
auto("tics", ticks, "decay", suit(22, 38, v => loga(v, 5, 600)))

// Limiteur de sortie : les deux references sont tres tenues (10 dB entre les cretes et le niveau moyen)
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -4} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Sur le bloc du retour (mesures 96 a 112), on mesure aussi ce qu'on a mesure sur les references.
const MESURER = false
const ISOLER = false
const units: any[] = [kick, bass, voix, lance, clang, gong, ticks]
const STEMS: [string, any][] = [["Frappe", kick], ["Roulante", bass], ["Glotte", voix], ["Echo", lance],
    ["Tole", clang], ["Gong", gong], ["Tics", ticks]]
if (MESURER) {
    const parts = [["seuil", 0, 16], ["machine", 16, 32], ["tole", 32, 48], ["parole", 48, 64], ["glissement", 64, 80],
        ["mutisme", 80, 88], ["attente", 88, 96], ["retour", 96, 112], ["logorrhee", 112, 128], ["nu", 128, 132],
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
