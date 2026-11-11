// CHAMP LIBRE - Beat Survivor, mode Survie
// Tekno de free party, acid et tribale - 180 BPM - Do diese phrygien - 202 mesures (4 min 29)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// champ-libre.src.ts (le morceau), de tb303-bass-line.js (la 303) et des
// instruments du dossier apparat/.
//
// Une interpretation des Boucles Etranges (duo francais de free party,
// publie sur Network 23, le label des Spiral Tribe). La reference a ete
// mesuree, pas seulement lue : une dizaine d'extraits de deux lives (Toulouse
// 2000, Cracovie) analyses dans le navigateur. Ce qui en sort :
// - 180 a 187 BPM, tres stable ;
// - un pied sur tous les temps, fondamental vers 53 Hz, qui porte presque
//   toute l'energie ; des mediums creux ; un niveau constant, sans pause ;
// - la signature : basse, toms et charleys appuient sur la double-croche
//   juste avant le temps. Ca donne un galop : "ta-BOUM, ta-BOUM" ;
// - des boucles qui tournent longtemps pendant que des mains tournent les
//   boutons, et des passages ou le pied part en breakbeat.
//
// Parti pris : le galop. Tout ce qui n'est pas le pied s'appuie sur le meme
// pas, celui qui precede le temps. Une ligne acid de seize pas ne change
// presque jamais ; c'est son filtre qui raconte, sur une pente lente qui
// court tout le morceau. Un bloc entier passe en breakbeat pendant que la
// boucle acid continue comme si de rien n'etait.
//
// Applique des notes Underdog (vault, Concepts/Musique) : une seule idee ;
// blocs de 16 mesures ou les aigus changent de vitesse ; arrangement par
// soustraction ; accents partages par toutes les voix ; un seul polymetre
// (la cloche, 5 pas) ; le grave court, un seul acteur dans le sub a la fois ;
// deux mesures glissees avant le final ; un passage nu ; rien de sature dans
// les mediums aigus.
//
// Instruments : Coup (grosse caisse), Sub (basse), Peaux (toms), Blip (la
// cloche et les marqueurs) et Souffle sont ecrits pour ces morceaux (Apparat
// = instrument scriptable d'openDAW). La 303 est le script Apparat "TB-303
// Bass Line" d'Andre Michelle (CC0). Charleys, caisse claire, clap, ride : TR-909.

const BPM = 180
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 202
const barSec = 240 / BPM

const TB303: string = "// @label TB-303 Bass Line\n// @param waveform   false\n// @param tuning     0     -12   12     linear  st\n// @param cutoff     80    60    300    exp     Hz\n// @param resonance  1.0   0     1      linear\n// @param envmod     0.0   0     1      linear\n// @param decay      300   200   2000   exp     ms\n// @param accent     1.0   0     1      linear\n// @param volume     0.7   0     1      linear\n\nclass Processor {\n    waveform = 0\n    tuning = 0\n    cutoffHz = 80\n    resonance = 0.8\n    envmod = 0.2\n    decayMs = 300\n    accentAmount = 1.0\n    volume = 0.7\n    phase = 0\n    freqTarget = 220\n    freqSmoothed = 220\n    y1 = 0\n    y2 = 0\n    y3 = 0\n    y4 = 0\n    fbHpState = 0\n    oscHpState = 0\n    postHpState = 0\n    vcaGate = 0\n    vcaDecay = 0\n    megEnv = 0\n    megDecayCoeff = 0.9999\n    vcaDecayCoeff = 0.9999\n    vcaGateCoeff = 0.999\n    accentCap = 0\n    isAccented = false\n    gate = false\n    sliding = false\n    heldNotes = []\n    cutoffSmoothed = 200\n    ampSmoothed = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"waveform\": this.waveform = value; break\n            case \"tuning\": this.tuning = value; break\n            case \"cutoff\": this.cutoffHz = value; break\n            case \"resonance\": this.resonance = value; break\n            case \"envmod\": this.envmod = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"accent\": this.accentAmount = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100 + this.tuning) / 12)\n        const isSlide = this.heldNotes.length > 0\n        this.heldNotes.push({id, pitch, cent})\n        this.freqTarget = freq\n        if (isSlide) {\n            this.sliding = true\n        } else {\n            this.sliding = false\n            this.freqSmoothed = freq\n            this.gate = true\n            this.vcaDecay = 1.0\n            this.megEnv = 1.0\n            this.isAccented = velocity >= 1.0\n            if (this.isAccented) {\n                this.megDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.05 * sampleRate))\n            } else {\n                this.megDecayCoeff = Math.exp(-1 / (this.decayMs * 0.001 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (1.23 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.001 * sampleRate))\n            }\n        }\n    }\n    noteOff(id) {\n        this.heldNotes = this.heldNotes.filter(note => note.id !== id)\n        if (this.heldNotes.length === 0) {\n            this.gate = false\n            this.sliding = false\n        } else {\n            const prev = this.heldNotes[this.heldNotes.length - 1]\n            this.freqTarget = 440 * Math.pow(2, (prev.pitch - 69 + prev.cent / 100 + this.tuning) / 12)\n            this.sliding = true\n        }\n    }\n    reset() {\n        this.gate = false\n        this.sliding = false\n        this.vcaGate = 0\n        this.ampSmoothed = 0\n        this.vcaGateCoeff = Math.exp(-1 / (0.005 * sampleRate))\n        this.heldNotes = []\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const invSr = 1 / sr\n        const sr2 = sr * 2\n        const PI = Math.PI\n        const gateAttack = 1 - Math.exp(-1 / (0.003 * sr))\n        const slideAlpha = 1 - Math.exp(-1 / (0.012 * sr))\n        const accChargeAlpha = 1 - Math.exp(-1 / (0.147 * sr))\n        const accDischargeMul = Math.exp(-1 / (0.1 * sr))\n        const resoSkewed = this.resonance * this.resonance\n        const kFeedback = resoSkewed * 28\n        const gNorm = kFeedback / 17\n        let gComp = (gNorm - 1) * resoSkewed + 1\n        gComp *= (1 + resoSkewed)\n        const fbHpAlpha = 1 - Math.exp(-2 * PI * 150 / sr2)\n        const oscHpAlpha = 1 - Math.exp(-2 * PI * 44 / sr)\n        const postHpAlpha = 1 - Math.exp(-2 * PI * 24 / sr)\n        const cutoffAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const ampAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const envDepth = 1.5 + this.envmod * 4.0\n        const envOffset = this.envmod * 0.33\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.sliding) {\n                this.freqSmoothed += (this.freqTarget - this.freqSmoothed) * slideAlpha\n            } else {\n                this.freqSmoothed = this.freqTarget\n            }\n            const freq = this.freqSmoothed\n            const phaseInc = freq * invSr\n            let osc = 0\n            if (this.waveform === 0) {\n                osc = 2 * this.phase - 1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            } else {\n                const duty = Math.max(0.1, Math.min(0.9, 0.71 - 0.26 * (freq - 65) / 595))\n                osc = this.phase < duty ? 1 : -1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc += t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc += t * t + t + t + 1\n                }\n                let rd = this.phase - duty\n                if (rd < 0) rd += 1\n                if (rd < phaseInc && rd >= 0) {\n                    const t = rd / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (rd > 1 - phaseInc) {\n                    const t = (rd - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            }\n            this.oscHpState += oscHpAlpha * (osc - this.oscHpState)\n            osc -= this.oscHpState\n            this.megEnv *= this.megDecayCoeff\n            if (this.isAccented && this.gate) {\n                this.accentCap += accChargeAlpha * (this.megEnv * this.accentAmount - this.accentCap)\n            } else {\n                this.accentCap *= accDischargeMul\n            }\n            let targetCutoff = this.cutoffHz * Math.pow(2, envDepth * (this.megEnv - envOffset))\n            if (this.isAccented) {\n                targetCutoff *= Math.pow(2, this.accentAmount * this.megEnv * 2.5)\n            }\n            targetCutoff *= Math.pow(2, this.accentCap * 1.0)\n            if (targetCutoff < 60) targetCutoff = 60\n            if (targetCutoff > sr * 0.45) targetCutoff = sr * 0.45\n            this.cutoffSmoothed += (targetCutoff - this.cutoffSmoothed) * cutoffAlpha\n            const gf = Math.tan(PI * this.cutoffSmoothed / sr2)\n            const b0 = gf / (1 + gf)\n            for (let os = 0; os < 2; os++) {\n                const fbRaw = kFeedback * this.y4\n                this.fbHpState += fbHpAlpha * (fbRaw - this.fbHpState)\n                const fbHp = fbRaw - this.fbHpState\n                const y0 = Math.tanh(osc - fbHp)\n                this.y1 += 2 * b0 * (y0 - this.y1 + this.y2)\n                this.y1 = Math.tanh(this.y1)\n                this.y2 += b0 * (this.y1 - 2 * this.y2 + this.y3)\n                this.y2 = Math.tanh(this.y2)\n                this.y3 += b0 * (this.y2 - 2 * this.y3 + this.y4)\n                this.y3 = Math.tanh(this.y3)\n                this.y4 += b0 * (this.y3 - 2 * this.y4)\n                this.y4 = Math.tanh(this.y4)\n            }\n            let filtered = 2.5 * gComp * this.y4\n            this.postHpState += postHpAlpha * (filtered - this.postHpState)\n            filtered -= this.postHpState\n            if (this.gate) {\n                this.vcaGate += (1 - this.vcaGate) * gateAttack\n            } else {\n                this.vcaGate *= this.vcaGateCoeff\n            }\n            this.vcaDecay *= this.vcaDecayCoeff\n            let amp = this.vcaGate * this.vcaDecay\n            if (this.gate) {\n                amp += 0.45 * this.megEnv\n                if (this.isAccented) {\n                    amp += this.accentAmount * 4.0 * this.megEnv\n                }\n            }\n            this.ampSmoothed += (amp - this.ampSmoothed) * ampAlpha\n            const sample = Math.tanh(filtered * this.ampSmoothed) * this.volume\n            outL[s] += sample\n            outR[s] += sample\n            this.phase += phaseInc\n            if (this.phase >= 1) this.phase -= 1\n        }\n    }\n}"
const COUP: string = "// @label Coup\n// @param tune    48    35    80    exp     Hz\n// @param sweep   0.6   0     1     linear\n// @param decay   280   80    700   exp     ms\n// @param click   0.5   0     1     linear\n// @param drive   0.5   0     1     linear\n// @param volume  0.8   0     1     linear\n\n// Grosse caisse de synthese : une sinusoide qui tombe de tres haut en quelques\n// millisecondes (le claquement), puis qui tient sa note grave (le corps).\n// La saturation ecrase le debut et rallonge le corps.\nclass Processor {\n    tune = 48\n    sweep = 0.6\n    decayMs = 280\n    click = 0.5\n    drive = 0.5\n    volume = 0.8\n    phase = 0\n    envAmp = 0\n    envFast = 0\n    envSlow = 0\n    envClick = 0\n    level = 0\n    seed = 12345\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"sweep\": this.sweep = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"click\": this.click = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        this.phase = 0\n        this.envAmp = 1\n        this.envFast = 1\n        this.envSlow = 1\n        this.envClick = 1\n        this.level = velocity\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.envAmp = 0\n        this.envClick = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))\n        const kFast = Math.exp(-1 / (0.010 * sr))\n        const kSlow = Math.exp(-1 / (0.055 * sr))\n        const kClick = Math.exp(-1 / (0.0015 * sr))\n        const gain = 1 + this.drive * 5\n        const norm = 1 / Math.tanh(gain)\n        const out = this.level * this.volume\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.envAmp < 0.0002) {continue}\n            const f = this.tune * (1 + this.sweep * (7 * this.envFast + 1.5 * this.envSlow))\n            this.phase += f / sr\n            if (this.phase >= 1) {this.phase -= 1}\n            const body = Math.sin(twoPi * this.phase) * this.envAmp\n            this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n            const tick = (this.seed / 2147483648 - 1) * this.envClick * this.click * 0.6\n            const y = Math.tanh((body + tick) * gain) * norm * out\n            outL[s] += y\n            outR[s] += y\n            this.envAmp *= kAmp\n            this.envFast *= kFast\n            this.envSlow *= kSlow\n            this.envClick *= kClick\n        }\n    }\n}"
const SUB: string = "// @label Sub\n// @param depth    0.9   0     1     linear\n// @param release  160   40    500   exp     ms\n// @param glide    30    1     300   exp     ms\n// @param drive    0.4   0     1     linear\n// @param volume   0.8   0     1     linear\n\n// Basse : une sinusoide tenue, que la grosse caisse creuse. Le creusement est\n// dans l'instrument lui-meme : toute note plus grave que 24 ne sonne pas,\n// elle declenche le creux (\"depth\" = sa profondeur, \"release\" = le temps que\n// la basse met a revenir). Le morceau lui envoie une de ces notes fantomes a\n// chaque coup de pied : pas de compresseur, pas de branchement a rater.\nclass Processor {\n    depth = 0.9\n    releaseMs = 160\n    glideMs = 30\n    drive = 0.4\n    volume = 0.8\n    held = []\n    phase = 0\n    freq = 55\n    target = 55\n    gate = false\n    level = 0\n    env = 0\n    duck = 0\n    duckSmooth = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"depth\": this.depth = value; break\n            case \"release\": this.releaseMs = value; break\n            case \"glide\": this.glideMs = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {\n            this.duck = 1\n            return\n        }\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n        if (this.held.length === 0) {this.freq = freq}\n        this.held.push({id, freq})\n        this.target = freq\n        this.gate = true\n        this.level = velocity\n    }\n    noteOff(id) {\n        this.held = this.held.filter(note => note.id !== id)\n        if (this.held.length === 0) {\n            this.gate = false\n        } else {\n            this.target = this.held[this.held.length - 1].freq\n        }\n    }\n    reset() {\n        this.held = []\n        this.gate = false\n        this.env = 0\n        this.duck = 0\n        this.duckSmooth = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * sr))\n        const kAttack = 1 - Math.exp(-1 / (0.004 * sr))\n        const kRelease = Math.exp(-1 / (0.040 * sr))\n        const kDuck = Math.exp(-1 / (this.releaseMs * 0.001 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.002 * sr))\n        const gain = 1 + this.drive * 3\n        const norm = this.volume / Math.tanh(gain)\n        for (let s = block.s0; s < block.s1; s++) {\n            this.freq += (this.target - this.freq) * kGlide\n            this.phase += this.freq / sr\n            if (this.phase >= 1) {this.phase -= 1}\n            if (this.gate) {\n                this.env += (this.level - this.env) * kAttack\n            } else {\n                this.env *= kRelease\n            }\n            this.duck *= kDuck\n            this.duckSmooth += (this.duck - this.duckSmooth) * kSmooth\n            const a = this.env * (1 - this.depth * this.duckSmooth)\n            const y = Math.tanh(Math.sin(twoPi * this.phase) * a * gain) * norm\n            outL[s] += y\n            outR[s] += y\n        }\n    }\n}"
const PEAUX: string = "// @label Peaux\n// @param decay   220   60    900   exp     ms\n// @param bend    0.5   0     1     linear\n// @param slap    0.4   0     1     linear\n// @param drive   0.4   0     1     linear\n// @param width   0.6   0     1     linear\n// @param volume  0.8   0     1     linear\n\n// Toms et congas de synthese. Chaque note est une peau accordee : une\n// sinusoide dont la hauteur retombe apres la frappe, un partiel inharmonique\n// (rapport 1,593, celui d'une membrane) et un claquement de bruit.\n// Les peaux aigues sonnent plus court et s'ecartent dans la stereo.\nclass Processor {\n    decayMs = 220\n    bend = 0.5\n    slap = 0.4\n    drive = 0.4\n    width = 0.6\n    volume = 0.8\n    voices = []\n    seed = 987654321\n    paramChanged(name, value) {\n        switch (name) {\n            case \"decay\": this.decayMs = value; break\n            case \"bend\": this.bend = value; break\n            case \"slap\": this.slap = value; break\n            case \"drive\": this.drive = value; break\n            case \"width\": this.width = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const f0 = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n        const seconds = this.decayMs * 0.001 * Math.sqrt(110 / f0)\n        // Place stereo deduite de la note : stable d'une frappe a l'autre\n        const side = (((pitch * 5) % 7) / 6 - 0.5) * 2 * this.width * (f0 < 125 ? 0.3 : 1)\n        const angle = (side + 1) * Math.PI / 4\n        if (this.voices.length >= 8) {this.voices.shift()}\n        this.voices.push({\n            f0, phase: 0, phase2: 0, amp: 1, pitchEnv: 1, slapEnv: 1, level: velocity,\n            kAmp: Math.exp(-1 / (seconds * sampleRate)), left: Math.cos(angle), right: Math.sin(angle)\n        })\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.voices = []\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kPitch = Math.exp(-1 / (0.028 * sr))\n        const kSlap = Math.exp(-1 / (0.006 * sr))\n        const gain = 1 + this.drive * 4\n        const norm = 0.7 * this.volume / Math.tanh(gain)\n        for (const v of this.voices) {\n            for (let s = block.s0; s < block.s1; s++) {\n                const f = v.f0 * (1 + this.bend * 1.2 * v.pitchEnv)\n                v.phase += f / sr\n                if (v.phase >= 1) {v.phase -= 1}\n                v.phase2 += f * 1.593 / sr\n                if (v.phase2 >= 1) {v.phase2 -= 1}\n                // Le partiel inharmonique s'eteint deux fois plus vite que le corps\n                const body = (Math.sin(twoPi * v.phase) + 0.35 * Math.sin(twoPi * v.phase2) * v.amp) * v.amp\n                this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n                const hit = (this.seed / 2147483648 - 1) * v.slapEnv * this.slap * 0.8\n                const y = Math.tanh((body + hit) * gain) * norm * v.level\n                outL[s] += y * v.left\n                outR[s] += y * v.right\n                v.amp *= v.kAmp\n                v.pitchEnv *= kPitch\n                v.slapEnv *= kSlap\n            }\n        }\n        this.voices = this.voices.filter(v => v.amp > 0.0003)\n    }\n}"
const BLIP: string = "// @label Blip\n// @param long    90    15    1500  exp     ms\n// @param tone    0.4   0     1     linear\n// @param bite    0.8   0     4     linear\n// @param ratio   2     0.5   7     linear\n// @param snap    0.3   0     1     linear\n// @param sub     0.2   0     1     linear\n// @param chirp   0     -12   12    linear  st\n// @param drift   0.4   0     1     linear\n// @param duck    0.3   0     1     linear\n// @param width   0.3   0     1     linear\n// @param haas    0     0     20    linear  ms\n// @param volume  0.6   0     1     linear\n\n// Le blip : la voix des petits sons. Il remplace le bip (une sinusoide nue,\n// tenue, ecrasee, jouee entre 1 et 2,6 kHz : penible a l'oreille). Ici chaque\n// note est construite comme un vrai son, en trois temps :\n// - l'attaque : un souffle de 2 ms (\"snap\") et un eclat de brillance. L'eclat\n//   vient de deux cotes : une modulation de frequence (\"bite\" = sa force,\n//   \"ratio\" = sa couleur ; entier = propre et creux, a virgule = metal) qui\n//   s'eteint en quelques dizaines de ms, et un filtre passe-bas qui part\n//   ouvert et se referme sur la note ;\n// - le corps : presque une sinusoide, ronde, sans rien de sature, doublee une\n//   octave plus bas (\"sub\") ;\n// - la fin : elle s'eteint toute seule en \"long\" ms.\n// Deux reglages suffisent a tout explorer : \"long\" (court / long) et \"tone\"\n// (sombre / clair). Comme sur un instrument acoustique, une note jouee plus\n// fort est plus claire et plus longue.\n// \"chirp\" fait partir la note d'a cote (en demi-tons) et la ramene en 10 ms :\n// positif, elle tombe sur sa note (bloup) ; negatif, elle y monte (goutte).\n// \"drift\" empeche deux notes de suite d'etre identiques, sans que ca\n// s'entende : une note sur deux est un rien plus haute, l'autre un rien plus\n// basse, et une horloge lente fait varier l'eclat et la longueur.\n// \"duck\" : toute note plus grave que 24 ne sonne pas, elle fait plonger le\n// son (le morceau en envoie une a chaque coup de pied).\n//\n// La place entre les deux oreilles change a chaque note (suite du nombre\n// d'or) : \"width\" = l'ecart, par le volume, jamais tout d'un cote ; \"haas\" =\n// un petit retard dans l'oreille opposee (a laisser a 0 pour la voix\n// principale, qui doit rester solide en mono).\nclass Processor {\n    longMs = 90\n    tone = 0.4\n    bite = 0.8\n    ratio = 2\n    snap = 0.3\n    sub = 0.2\n    chirp = 0\n    drift = 0.4\n    duck = 0.3\n    width = 0.3\n    haasMs = 0\n    volume = 0.6\n    voices = []\n    count = 0\n    seed = 9871\n    lfo = 0\n    dip = 0\n    dipSmooth = 0\n    futL = new Float32Array(8192)\n    futR = new Float32Array(8192)\n    pos = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"long\": this.longMs = value; break\n            case \"tone\": this.tone = value; break\n            case \"bite\": this.bite = value; break\n            case \"ratio\": this.ratio = value; break\n            case \"snap\": this.snap = value; break\n            case \"sub\": this.sub = value; break\n            case \"chirp\": this.chirp = value; break\n            case \"drift\": this.drift = value; break\n            case \"duck\": this.duck = value; break\n            case \"width\": this.width = value; break\n            case \"haas\": this.haasMs = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {\n            this.dip = 1\n            return\n        }\n        const sr = sampleRate\n        this.count++\n        // Une note sur deux un rien plus haute, l'autre un rien plus basse\n        const tick = (this.count % 2 === 0 ? 1 : -1) * this.drift * 12\n        const f0 = 440 * Math.pow(2, (pitch - 69 + (cent + tick) / 100) / 12)\n        if (this.voices.length >= 8) {this.voices.shift()}\n        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width\n        const angle = (1 + place * 0.6) * Math.PI / 4\n        const late = Math.min(4000, Math.round(Math.abs(place) * this.haasMs * 0.001 * sr))\n        // L'horloge lente : deux notes de suite ne sont jamais identiques\n        const sway = Math.sin(2 * Math.PI * this.lfo)\n        const tau = this.longMs * 0.001 * (0.55 + 0.6 * velocity) * (1 + 0.2 * this.drift * sway)\n        this.voices.push({\n            f0, carrier: 0, modulator: 0, under: 0, attack: 0, amp: 1, level: velocity,\n            hold: Math.round(0.006 * sr),\n            kAmp: Math.exp(-1 / (tau * sr)),\n            // L'eclat : modulation de frequence qui s'eteint vite\n            index: this.bite * (0.5 + 0.7 * velocity) * (1 - 0.3 * this.drift * sway),\n            envIndex: 1, kIndex: Math.exp(-1 / ((0.012 + tau * 0.12) * sr)),\n            // Le filtre : ouvert au depart, il se referme juste au-dessus de la note\n            open: 12 * this.tone * (0.6 + 0.4 * velocity),\n            envFilter: 1, kFilter: Math.exp(-1 / ((0.008 + tau * 0.35) * sr)),\n            low: 0, band: 0,\n            bend: Math.pow(2, this.chirp / 12) - 1, envBend: 1, kBend: Math.exp(-1 / (0.010 * sr)),\n            breath: 1, kBreath: Math.exp(-1 / (0.002 * sr)),\n            left: Math.cos(angle), right: Math.sin(angle),\n            lateL: place > 0 ? late : 0, lateR: place > 0 ? 0 : late\n        })\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.voices = []\n        this.dip = 0\n        this.dipSmooth = 0\n        this.futL.fill(0)\n        this.futR.fill(0)\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const mask = 8191\n        const norm = 0.55 * this.volume\n        const air = this.snap * 0.5\n        const attackStep = 1 / (0.0012 * sr)\n        const fcMax = sr / 6.5\n        this.lfo += 0.13 * (block.s1 - block.s0) / sr\n        if (this.lfo >= 1) {this.lfo -= 1}\n        for (const v of this.voices) {\n            let at = this.pos\n            for (let s = block.s0; s < block.s1; s++) {\n                const f = v.f0 * (1 + v.bend * v.envBend)\n                v.carrier += f / sr\n                if (v.carrier >= 1) {v.carrier -= 1}\n                v.modulator += f * this.ratio / sr\n                if (v.modulator >= 1) {v.modulator -= 1}\n                v.under += f * 0.5 / sr\n                if (v.under >= 1) {v.under -= 1}\n                this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n                const noise = (this.seed / 2147483648 - 1) * v.breath * air\n                const x = Math.sin(twoPi * v.carrier + Math.sin(twoPi * v.modulator) * v.index * v.envIndex) + noise\n                // Passe-bas a deux poles, un peu resonant, qui suit la note\n                const fc = Math.min(v.f0 * (1.4 + v.open * v.envFilter), fcMax)\n                const g = 2 * Math.sin(Math.PI * fc / sr)\n                v.low += g * v.band\n                v.band += g * (x - v.low - 0.7 * v.band)\n                if (v.attack < 1) {v.attack = Math.min(1, v.attack + attackStep)}\n                const y = (v.low + Math.sin(twoPi * v.under) * this.sub) * v.amp * v.attack * v.level * norm\n                this.futL[(at + v.lateL) & mask] += y * v.left\n                this.futR[(at + v.lateR) & mask] += y * v.right\n                at++\n                if (v.hold > 0) {v.hold--} else {v.amp *= v.kAmp}\n                v.envIndex *= v.kIndex\n                v.envFilter *= v.kFilter\n                v.envBend *= v.kBend\n                v.breath *= v.kBreath\n            }\n        }\n        // Le plongeon sous le pied, applique a la sortie\n        const kDip = Math.exp(-1 / (0.110 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))\n        let at = this.pos\n        for (let s = block.s0; s < block.s1; s++) {\n            const i = at & mask\n            this.dip *= kDip\n            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth\n            const gain = 1 - this.duck * this.dipSmooth\n            outL[s] += this.futL[i] * gain\n            outR[s] += this.futR[i] * gain\n            this.futL[i] = 0\n            this.futR[i] = 0\n            at++\n        }\n        this.pos = at & mask\n        this.voices = this.voices.filter(v => v.amp > 0.0003)\n    }\n}"
const SOUFFLE: string = "// @label Souffle\n// @param freq    600   80    8000  exp     Hz\n// @param reso    0.6   0     1     linear\n// @param drift   0.5   0     1     linear\n// @param volume  0.5   0     1     linear\n\n// Le souffle : du bruit dans un filtre passe-bande, un par oreille. \"freq\" est\n// la hauteur du souffle, \"reso\" son etroitesse (0 = vent large, 1 = sifflement).\n// \"drift\" le fait vivre : la hauteur ondule lentement et le son passe d'une\n// oreille a l'autre, sur trois horloges qui ne se rejoignent jamais.\n// Faire monter \"freq\" et \"volume\" ensemble, c'est une montee.\n// Sonne tant qu'une note est tenue (la hauteur de la note est ignoree).\nclass Processor {\n    freq = 600\n    reso = 0.6\n    drift = 0.5\n    volume = 0.5\n    held = 0\n    env = 0\n    smooth = 600\n    seedL = 22222\n    seedR = 77777\n    lowL = 0\n    bandL = 0\n    lowR = 0\n    bandR = 0\n    lfoA = 0\n    lfoB = 0.3\n    lfoC = 0.6\n    paramChanged(name, value) {\n        switch (name) {\n            case \"freq\": this.freq = value; break\n            case \"reso\": this.reso = value; break\n            case \"drift\": this.drift = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        this.held++\n    }\n    noteOff(id) {\n        if (this.held > 0) {this.held--}\n    }\n    reset() {\n        this.held = 0\n        this.env = 0\n        this.lowL = 0\n        this.bandL = 0\n        this.lowR = 0\n        this.bandR = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const target = this.held > 0 ? 1 : 0\n        if (target === 0 && this.env < 0.0002) {\n            this.env = 0\n            return\n        }\n        const kEnv = 1 - Math.exp(-1 / (0.6 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.05 * sr))\n        const n = block.s1 - block.s0\n        // Les trois horloges lentes : une fois par bloc suffit\n        this.lfoA += 0.07 * n / sr\n        if (this.lfoA >= 1) {this.lfoA -= 1}\n        this.lfoB += 0.11 * n / sr\n        if (this.lfoB >= 1) {this.lfoB -= 1}\n        this.lfoC += 0.045 * n / sr\n        if (this.lfoC >= 1) {this.lfoC -= 1}\n        const wander = Math.pow(2, 0.35 * this.drift * Math.sin(twoPi * this.lfoC))\n        const ampL = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoA))\n        const ampR = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoB))\n        const damp = 1.2 - 1.1 * this.reso\n        for (let s = block.s0; s < block.s1; s++) {\n            this.smooth += (this.freq - this.smooth) * kSmooth\n            const fc = Math.min(this.smooth * wander, sr / 7)\n            const f = 2 * Math.sin(Math.PI * fc / sr)\n            // Le bruit filtre sort d'autant plus faible que le filtre est grave\n            // et large : on compense pour que le niveau reste le meme\n            const comp = Math.sqrt(6 * damp / f) * 0.22\n            this.env += (target - this.env) * kEnv\n            this.seedL = (this.seedL * 1664525 + 1013904223) >>> 0\n            this.seedR = (this.seedR * 1664525 + 1013904223) >>> 0\n            const xL = this.seedL / 2147483648 - 1\n            const xR = this.seedR / 2147483648 - 1\n            this.lowL += f * this.bandL\n            this.bandL += f * (xL - this.lowL - damp * this.bandL)\n            this.lowR += f * this.bandR\n            this.bandR += f * (xR - this.lowR - damp * this.bandR)\n            const a = comp * this.env * this.volume\n            outL[s] += Math.tanh(this.bandL * a * ampL)\n            outR[s] += Math.tanh(this.bandR * a * ampR)\n        }\n    }\n}"

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
const project = openDAW.newProject("Champ libre")
project.bpm = BPM

// Une reverb courte, pour la caisse claire et les marqueurs seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.35, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Des blocs de 16 mesures (21 secondes a ce tempo). Un creux de 8 mesures et
// deux mesures glissees avant le final.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Galop", start: 16, bars: 16},
    {name: "Acide", start: 32, bars: 16},
    {name: "Ouverture", start: 48, bars: 16},
    {name: "Plein", start: 64, bars: 16},
    {name: "Casse", start: 80, bars: 16},
    {name: "Creux", start: 96, bars: 8},
    {name: "Drop", start: 104, bars: 16},
    {name: "Plus", start: 120, bars: 18},
    {name: "Final", start: 138, bars: 16},
    {name: "Sommet", start: 154, bars: 16},
    {name: "Descente", start: 170, bars: 16},
    {name: "Sortie", start: 186, bars: 16}
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
            position: Math.round(p[0] * BAR), value: p[1], interpolation: Interpolation.Linear
        })))
    })
}

/**
 * Une pente sur laquelle on pose une vague lente : la main qui tourne le
 * bouton sans jamais le lacher. Chaque reglage a sa vague, de periode
 * differente : ils ne repassent jamais ensemble par le meme point.
 */
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
    const clamp = (v: number) => Math.max(0, Math.min(1, v))
    const out: number[][] = []
    let next = 0
    for (let bar = 0; bar <= TOTAL; bar += 2) {
        while (next < trend.length && trend[next][0] <= bar) {
            out.push([trend[next][0], clamp(trend[next][1] + wave(trend[next][0]))])
            next++
        }
        if (!trend.some(p => p[0] === bar)) {out.push([bar, clamp(at(bar) + wave(bar))])}
    }
    return out
}

// ---------- La carte du morceau ----------
/** Le bloc en breakbeat : le pied quitte les temps, la boucle acid continue. */
const casse = (bar: number) => bar >= 80 && bar < 96
/** Les creux : le pied se tait. Le second, ce sont les deux mesures glissees. */
const inBreak = (bar: number) => (bar >= 96 && bar < 104) || (bar >= 136 && bar < 138)
/** Le passage nu : le pied et l'acid seulement, avant que tout revienne. */
const nu = (bar: number) => bar >= 154 && bar < 158
const kickOn = (bar: number) => bar < 198 && !inBreak(bar)
const drop = (bar: number) => (bar >= 104 && bar < 136) || (bar >= 138 && bar < 170)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 103 || bar === 137
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une petite relance. Faible : c'est une musique de transe. */
const finDeBloc = (bar: number) => [31, 47, 63, 79, 119, 153, 169, 185].includes(bar)
/** Les relances ou le pied lache son dernier temps. */
const relanceForte = (bar: number) => bar === 79 || bar === 119 || bar === 153
/** Les deux mesures glissees decalent tout : on compte comme si elles n'existaient pas. */
const rel = (bar: number) => bar < 138 ? bar : bar - 2
/** Place dans la phrase de quatre mesures : 0 = A, 1 = B, 2 = A, 3 = C. */
const rang = (bar: number) => rel(bar) % 4

/** Les coups de pied d'une mesure : [pas, velocite]. Le Sub s'en sert aussi. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    if (casse(bar)) {
        // Le breakbeat : le pied sur 1, puis deux coups a contretemps
        const out = [[0, 1], [6, 0.85], [10, 0.9]]
        if (bar % 2 === 1) {out.push([13, 0.7])}
        return out
    }
    const v = bar < 16 || bar >= 186 ? 0.8 : drop(bar) ? 1 : 0.9
    const out = [[0, v], [4, v], [8, v], [12, v]]
    return relanceForte(bar) ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// ---------- Coup : la grosse caisse ----------
// Court (le temps ne dure que 333 ms), accorde a 52 Hz comme la reference, dur.
const kick = apparat("Coup", COUP, -7)
reglages("coup", kick, {tune: 52, sweep: 0.8, decay: 105, click: 0.55, drive: 0.3})
build(kick.noteTracks[0], "Coup", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
// Le pied arrive etouffe et gagne son claquement en huit mesures
auto("coup", kick, "click", [[0, 0.15], [8, 0.55], [170, 0.55], [198, 0.25], [202, 0.25]])

// ---------- Sub : la basse du galop ----------
// Une note courte sur le pas qui precede chaque temps : "ta-BOUM". Elle se
// tait avant que le pied retombe : un seul acteur dans le grave a la fois.
// Do diese 2 (69 Hz), a la quarte au-dessus du pied : ils ne battent pas.
const DO = 37, RE = 38
const sub = apparat("Sub", SUB, -16)
reglages("sub", sub, {depth: 0.9, release: 90, glide: 20, drive: 0.5})
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = plongeons(bar)
    if (bar < 16 || bar >= 186 || inBreak(bar) || nu(bar)) {return out}
    const v = drop(bar) ? 1 : 0.85
    // Deux formes : la note seule sur le dernier pas, ou une note plus longue
    // qui part du contretemps ("boum-baaa")
    const longue = (bar >= 120 && bar < 136) || (bar >= 138 && bar < 170)
    const beats = casse(bar) ? [0, 3] : [0, 1, 2, 3]
    for (const beat of beats) {
        const step = beat * 4 + (longue ? 2 : 3)
        if (step >= limite(bar)) {continue}
        // Fin de phrase : le Re, le demi-ton au-dessus de la tonique
        const pitch = rang(bar) === 3 && beat === 3 ? RE : DO
        out.push({position: step * S16, duration: Math.round(S16 * (longue ? 1.8 : 0.85)), pitch, velocity: v})
    }
    return out
})

// ---------- Peaux : les toms du galop ----------
// Le meme pas que la basse. Le troisieme coup tombe cinq demi-tons plus bas.
// Ils jouent dans le medium (200 a 400 Hz) : le grave reste au pied et a la basse,
// et c est la que la reference appuie le plus fort sur le pas du galop.
const TOM = 61, TOM_BAS = 56, TOM_HAUT = 68
const toms = apparat("Peaux", PEAUX, -8)
reglages("peaux", toms, {decay: 120, bend: 0.5, slap: 0.7, drive: 0.5, width: 0.3})
/** Un roulement : doubles-croches, un accent tous les trois pas, de plus en plus fort. */
function roulement(from: number, to: number, base: number, gain: number): Note[] {
    const out: Note[] = []
    for (let step = from; step < to; step++) {
        const k = step - from
        const accent = k % 3 === 0
        out.push({
            position: step * S16, duration: S16 / 2,
            pitch: accent ? TOM_HAUT : k % 2 === 0 ? TOM : TOM_BAS,
            velocity: Math.min(1, (accent ? 0.75 : 0.45) * (base + gain * k / (to - from)))
        })
    }
    return out
}
build(toms.noteTracks[0], "Peaux", bar => {
    if (bar < 8 || bar >= 198 || nu(bar)) {return []}
    // Les deux mesures glissees : les toms seuls, qui roulent et enflent
    if (bar === 136) {return roulement(0, 16, 0.7, 0.3)}
    if (bar === 137) {return roulement(0, 12, 1.0, 0.4)}
    // Dans le creux, ils tiennent le galop puis roulent
    if (bar === 102) {return roulement(0, 16, 0.6, 0.3)}
    if (bar === 103) {return roulement(0, 12, 0.9, 0.4)}
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) => {
        if (step < limite(bar)) {out.push({position: step * S16, duration: S16 / 2, pitch, velocity})}
    }
    if (casse(bar)) {hit(7, TOM, 0.9); hit(15, TOM_BAS, 1); return out}
    const r = rang(bar)
    hit(3, TOM, 1); hit(7, TOM, 0.85); hit(11, TOM_BAS, 1); hit(15, TOM, 0.85)
    if (r === 1 && bar >= 16) {hit(6, TOM_HAUT, 0.55)}
    if ((r === 3 || finDeBloc(bar)) && bar >= 16) {hit(12, TOM_BAS, 0.5); hit(13, TOM_BAS, 0.6); hit(14, TOM, 0.75)}
    return out
})
// decay 60..900 ms (120 ms = 0.26, 200 ms = 0.44) : les peaux resonnent plus quand le pied se tait
auto("peaux", toms, "decay", [
    [0, 0.26], [96, 0.26], [96, 0.44], [104, 0.44], [104, 0.26], [136, 0.26], [136, 0.40],
    [138, 0.40], [138, 0.26], [202, 0.26]
])

// ---------- La 303 : la boucle ----------
const N = null
// steps : demi-tons au-dessus du Do diese 3. 1 = Re, 12 = l'octave, 13 = Re aigu.
// Les accents tombent sur le dernier pas de chaque temps : le galop.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// A0 : le squelette. A1 : la boucle. A2 : sa fin de phrase. A4 : le creux.
const A0: Pattern = {steps: [0, N, N, 12, N, N, N, 12, 0, N, N, 12, N, N, 1, 12], accents: [3, 7, 11, 15], slides: []}
const A1: Pattern = {steps: [0, N, 0, 12, 0, N, 1, 12, 0, N, 0, 12, 0, 1, N, 13], accents: [3, 7, 11, 15], slides: [2, 6, 10]}
const A2: Pattern = {steps: [0, N, 0, 12, 0, N, 1, 12, 3, N, 1, 12, 0, 12, 1, 13], accents: [3, 7, 11, 13, 15], slides: [2, 6, 10, 14]}
const A4: Pattern = {steps: [0, N, N, N, N, N, N, 12, N, N, N, N, N, N, 1, N], accents: [7], slides: []}

function acidNote(pattern: Pattern, step: number, base: number): Note {
    const slide = pattern.slides.includes(step)
    return {
        position: step * S16,
        // Une note liee deborde sur la suivante : c'est le recouvrement qui
        // declenche le glissando dans la 303
        duration: Math.round(S16 * (slide ? 1.3 : 0.6)),
        pitch: base + (pattern.steps[step] as number),
        // L'accent de cette 303 se declenche a velocite 1.0 pile
        velocity: pattern.accents.includes(step) ? 1.0 : 0.65
    }
}

const acid = apparat("Acide", TB303, -4.5)
reglages("acide", acid, {cutoff: 70, resonance: 0.85, envmod: 0.3, decay: 300, accent: 1.0})
essai("saturation acide", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.85} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -22})

build(acid.noteTracks[0], "Acide", bar => {
    let pattern: Pattern | null = null
    if (bar >= 32 && bar < 40) {pattern = A0}
    else if (bar >= 40 && bar < 96) {pattern = rang(bar) === 3 ? A2 : A1}
    else if (bar >= 96 && bar < 100) {pattern = A4}
    else if (bar >= 100 && bar < 104) {pattern = A1}
    else if (bar >= 104 && bar < 136) {pattern = rang(bar) === 3 ? A2 : A1}
    else if (bar >= 138 && bar < 178) {pattern = rang(bar) === 3 ? A2 : A1}
    else if (bar >= 178 && bar < 186) {pattern = A0}
    if (pattern === null) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, 49))
    }
    return out
})

// Le filtre raconte le morceau : une pente lente qui ne revient jamais a zero,
// sauf dans le creux. Valeurs 0..1 sur la plage declaree par la 303.
auto("acide", acid, "cutoff", vague([
    [0, 0.05], [32, 0.05], [48, 0.25], [64, 0.45], [80, 0.55], [96, 0.62],
    [96, 0.12], [100, 0.15], [103.75, 0.85], [104, 0.70], [136, 0.88], [138, 0.85], [154, 0.94],
    [170, 1.0], [186, 0.20], [202, 0.05]
], 12, 0.06))
auto("acide", acid, "envmod", vague([
    [0, 0.20], [32, 0.20], [64, 0.45], [96, 0.60], [96, 0.30], [103.75, 0.65], [104, 0.72],
    [170, 0.95], [186, 0.30], [202, 0.20]
], 20, 0.06))
auto("acide", acid, "resonance", vague([
    [0, 0.80], [64, 0.85], [96, 0.90], [96, 0.96], [104, 0.88], [170, 0.93], [202, 0.80]
], 28, 0.02))
auto("acide", acid, "decay", [
    [0, 0.12], [64, 0.22], [96, 0.30], [96, 0.75], [104, 0.30], [170, 0.50], [186, 0.15], [202, 0.12]
])
auto("acide", acid, "volume", [
    [0, 0.62], [96, 0.66], [96, 0.40], [103.75, 0.68], [104, 0.70], [170, 0.70], [186, 0.45], [202, 0.45]
])

// ---------- La cloche : le seul polymetre ----------
// Cinq pas contre seize : elle ne retombe sur ses pieds que toutes les cinq
// mesures. Ses pas sont comptes depuis le drop (mesure 104). Un timbre de
// metal (rapport a virgule), tres court, sur les cotes.
const ORIGINE = 104 * 16
const tour = (bar: number, step: number, period: number) =>
    (((bar * 16 + step - ORIGINE) % period) + period) % period
const bell = apparat("Cloche", BLIP, -12)
reglages("cloche", bell, {
    long: 40, tone: 0.4, bite: 1.5, ratio: 3.5, snap: 0.5, sub: 0, chirp: 3,
    drift: 0.5, duck: 0.4, width: 0.7, haas: 8
})
bell.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 1, filter: 0.3, wet: -14})
build(bell.noteTracks[0], "Cloche", bar => {
    const out = plongeons(bar)
    const on = (bar >= 56 && bar < 80) || (bar >= 104 && bar < 136) || (bar >= 138 && bar < 170)
    if (!on || nu(bar)) {return out}
    for (let step = 0; step < limite(bar); step++) {
        const t = tour(bar, step, 5)
        if (t === 0) {out.push({position: step * S16, duration: S16 / 2, pitch: 61, velocity: 1})}
        if (t === 3) {out.push({position: step * S16, duration: S16 / 2, pitch: 56, velocity: 0.6})}
    }
    return out
})
auto("cloche", bell, "tone", [[0, 0.30], [56, 0.30], [80, 0.42], [104, 0.38], [170, 0.52], [202, 0.35]])

// ---------- Les marqueurs ----------
// La meme voix, longue, noyee dans son echo, sur le premier temps de trois blocs seulement
const MARQUES = [[104, 61, 73], [138, 68, 73], [158, 61, 73]]
const mark = apparat("Marque", BLIP, -13)
reglages("marque", mark, {
    long: 500, tone: 0.5, bite: 1.6, ratio: 3.5, snap: 0.3, sub: 0.3, chirp: 12,
    drift: 0, duck: 0, width: 0, haas: 0
})
mark.addAudioEffect("Delay", {delay: 13, feedback: 0.6, cross: 1, filter: 0.3, wet: -8})
mark.addSend(reverb, {amount: -16})
build(mark.noteTracks[0], "Marque", bar => {
    const m = MARQUES.find(x => x[0] === bar)
    if (!m) {return []}
    return [
        {position: 0, duration: S16, pitch: m[1], velocity: 1},
        {position: S16, duration: S16, pitch: m[2], velocity: 0.7},
        {position: 7 * S16, duration: S16, pitch: m[1] - 12, velocity: 0.6}
    ]
})

// ---------- Souffle : l'air du hangar, et les montees ----------
const breath = apparat("Souffle", SOUFFLE, -15)
reglages("souffle", breath, {reso: 0.6, drift: 0.6})
build(breath.noteTracks[0], "Souffle", bar => {
    const section = SECTIONS.find(s => s.start === bar)
    if (!section) {return []}
    return [{position: 0, duration: section.bars * BAR - 10, pitch: 60, velocity: 1}]
})
// freq 80..8000 Hz (300 Hz = 0.29, 600 = 0.44, 2000 = 0.70, 5000 = 0.90)
auto("souffle", breath, "freq", [
    [0, 0.30], [96, 0.38], [100, 0.50], [103.75, 0.92], [104, 0.45], [134, 0.45], [137.75, 0.92],
    [138, 0.50], [186, 0.40], [202, 0.30]
])
auto("souffle", breath, "volume", [
    [0, 0.50], [16, 0.25], [96, 0.25], [96, 0.50], [103.75, 1.0], [104, 0.20], [134, 0.22],
    [137.75, 0.95], [138, 0.22], [186, 0.30], [202, 0.55]
])

// ---------- Charleys, caisse claire, clap, ride : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -3})
const SNARE = 38, CLAP = 39, HAT_C = 42, HAT_O = 46, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Snare", SNARE, {volume: -4}],
    ["Clap", CLAP, {volume: -3}],
    ["Closed Hat", HAT_C, {volume: -6, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -8, panning: 0.1, exclude: true}],
    ["Crash", CRASH, {volume: -15}],
    ["Ride", RIDE, {volume: -12, panning: -0.15}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -24})

/** La vitesse des aigus : elle change a chaque bloc. */
function vitesse(bar: number): number {
    if (!kickOn(bar) || nu(bar) || bar < 8) {return 0}
    if (bar < 32) {return 1}                 // charley ouvert a contretemps
    if (bar < 64) {return 2}                 // + un charley ferme sur le pas du galop
    if (bar < 80) {return 3}                 // + un autre juste apres le temps
    if (bar < 96) {return 9}                 // le breakbeat
    if (bar < 120) {return 2}
    if (bar < 158) {return 3}
    if (bar < 170) {return 4}                // + la ride
    if (bar < 178) {return 2}
    return 1
}

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const v = vitesse(bar)
    // Dans le creux, les charleys reviennent a pas de loup
    if (bar >= 100 && bar < 103) {
        for (let step = 0; step < 16; step++) {hit(step, HAT_C, 0.1 + (bar - 100) * 0.1 + (step % 4 === 3 ? 0.15 : 0))}
    }
    if (v === 0) {return out}
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (v === 9) {
            // Breakbeat : caisse claire sur 2 et 4, une note fantome a la fin, charleys en croches
            if (step === 4 || step === 12) {hit(step, SNARE, 0.9)}
            if (step === 15) {hit(step, SNARE, 0.4)}
            if (step % 2 === 0) {hit(step, HAT_C, beat === 2 ? 0.6 : 0.4)}
            continue
        }
        if (beat === 2) {hit(step, HAT_O, drop(bar) ? 0.7 : 0.6)}
        if (v >= 2 && beat === 3) {hit(step, HAT_C, 0.8)}
        if (v >= 3 && beat === 1) {hit(step, HAT_C, 0.55)}
        if (v >= 4 && beat === 0) {hit(step, RIDE, 0.4)}
    }
    if (bar === 104 || bar === 138) {hit(0, CRASH, 0.6)}
    // Fin de bloc : le clap bafouille sur les deux derniers pas faibles
    if (finDeBloc(bar)) {hit(13, CLAP, 0.5); hit(15, CLAP, 0.7)}
    return out
})

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Pour le mix, on mesure aussi ce qu'on a mesure sur la reference : la part du
// grave et de l'aigu, et la force des attaques sur chacun des 16 pas de la
// mesure (0 a 9), dans le grave, le medium et l'aigu.
const MESURER = true
const ISOLER = false
const units: any[] = [kick, sub, toms, acid, bell, mark, breath, drums]
const STEMS: [string, any][] = [["Coup", kick], ["Sub", sub], ["Peaux", toms], ["Acide", acid],
    ["Cloche", bell], ["Marque", mark], ["Souffle", breath], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 16], ["galop", 16, 32], ["acide", 32, 64], ["plein", 64, 80], ["casse", 80, 96],
        ["creux", 96, 104], ["drop", 104, 136], ["final", 138, 154], ["sommet", 154, 170],
        ["descente", 170, 186], ["sortie", 186, 202]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const R = audio.frames.length > 1 ? audio.frames[1] : L
        const n = L.length
        // Deux passe-haut a 2 kHz puis deux passe-bas a 6 kHz, du second ordre
        const filtre = (haut: boolean, fc: number) => {
            const w = 2 * Math.PI * fc / rate, alpha = Math.sin(w) / Math.sqrt(2), c = Math.cos(w), a0 = 1 + alpha
            const b0 = haut ? (1 + c) / 2 : (1 - c) / 2, b1 = haut ? -(1 + c) : 1 - c
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0
            return (x: number) => {
                const y = (b0 * x + b1 * x1 + b0 * x2 + 2 * c * y1 - (1 - alpha) * y2) / a0
                x2 = x1; x1 = x; y2 = y1; y1 = y
                return y
            }
        }
        const f1 = filtre(true, 2000), f2 = filtre(true, 2000), f3 = filtre(false, 6000), f4 = filtre(false, 6000)
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
            let sx = 0, sd = 0
            for (let i = from; i < to; i++) {const d = L[i] - L[i - 1]; sx += L[i] * L[i]; sd += d * d}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / plein)).toFixed(1) + "dB " + Math.round(Math.sqrt(sd / sx) * rate / (2 * Math.PI)) + "Hz" : "silence"))
        }
        let line = stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " mono " + mono + "dB zone " + zone + "% : " + cells.join(", ")
        if (stem[1] === null) {
            // La meme mesure que sur la reference, sur le drop (mesures 104 a 136)
            const from = Math.floor(104 * barSec * rate), to = Math.min(n, Math.floor(136 * barSec * rate))
            // Meme pas d analyse que pour la reference (512 echantillons)
            const hop = 512
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            const kA = 1 - Math.exp(-2 * Math.PI * 300 / rate), kB = 1 - Math.exp(-2 * Math.PI * 3000 / rate)
            let lp = 0, lp2 = 0, hl = 0, ma = 0, mb = 0, sLow = 0, sHigh = 0, sTot = 0
            const eL: number[] = [], eM: number[] = [], eH: number[] = []
            for (let i = from; i < to; i += hop) {
                let l = 0, m = 0, h = 0
                for (let j = i; j < i + hop && j < to; j++) {
                    const x = (L[j] + R[j]) / 2
                    lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                    hl += (x - hl) * kHigh
                    ma += (x - ma) * kA; mb += (x - mb) * kB
                    const hh = x - hl, mm = mb - ma
                    l += lp2 * lp2; m += mm * mm; h += hh * hh; sTot += x * x
                }
                eL.push(Math.sqrt(l)); eM.push(Math.sqrt(m)); eH.push(Math.sqrt(h))
                sLow += l; sHigh += h
            }
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
            line += " || drop : grave " + pas(eL) + " medium " + pas(eM) + " aigu " + pas(eH) +
                " partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1)
        }
        report.push(line)
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
