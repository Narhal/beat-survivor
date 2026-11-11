// MOEBIUS - Beat Survivor, mode Survie
// Techno mentale, hypnotique et acide - 133 BPM - Fa phrygien - 200 mesures (~6 min)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// moebius.src.ts (le morceau), de tb303-bass-line.js (la 303) et des
// instruments du dossier apparat/.
//
// Parti pris : des boucles de longueurs differentes qui tournent les unes
// contre les autres. La mesure fait 16 pas ; la seconde 303 en fait 7, le
// bois 5, l'escalier 15 (5 notes, une tous les 3 pas). Elles ne retombent
// toutes ensemble qu'une seule fois dans le morceau : a la mesure 104,
// et c'est la que tombe le drop final. Tout le reste du temps, l'oreille
// cherche le point de rencontre.
//
// L'escalier est un arpege en sons de Shepard : il monte pendant cinq minutes
// sans jamais arriver nulle part, puis il redescend. Le morceau finit comme
// il commence (souffle, pied, bois) : mis en boucle, il n'a pas de couture.
//
// Instruments : Coup (grosse caisse), Sub (basse creusee par le pied), Peaux
// (ici le bois), Escalier et Souffle sont ecrits pour ces morceaux (Apparat =
// instrument scriptable d'openDAW). Les deux 303 sont le script Apparat
// "TB-303 Bass Line" d'Andre Michelle (CC0). Cymbales et clap : TR-909.

const BPM = 133
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 200
const sr = sampleRate
const barSec = 240 / BPM

const TB303: string = "// @label TB-303 Bass Line\n// @param waveform   false\n// @param tuning     0     -12   12     linear  st\n// @param cutoff     80    60    300    exp     Hz\n// @param resonance  1.0   0     1      linear\n// @param envmod     0.0   0     1      linear\n// @param decay      300   200   2000   exp     ms\n// @param accent     1.0   0     1      linear\n// @param volume     0.7   0     1      linear\n\nclass Processor {\n    waveform = 0\n    tuning = 0\n    cutoffHz = 80\n    resonance = 0.8\n    envmod = 0.2\n    decayMs = 300\n    accentAmount = 1.0\n    volume = 0.7\n    phase = 0\n    freqTarget = 220\n    freqSmoothed = 220\n    y1 = 0\n    y2 = 0\n    y3 = 0\n    y4 = 0\n    fbHpState = 0\n    oscHpState = 0\n    postHpState = 0\n    vcaGate = 0\n    vcaDecay = 0\n    megEnv = 0\n    megDecayCoeff = 0.9999\n    vcaDecayCoeff = 0.9999\n    vcaGateCoeff = 0.999\n    accentCap = 0\n    isAccented = false\n    gate = false\n    sliding = false\n    heldNotes = []\n    cutoffSmoothed = 200\n    ampSmoothed = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"waveform\": this.waveform = value; break\n            case \"tuning\": this.tuning = value; break\n            case \"cutoff\": this.cutoffHz = value; break\n            case \"resonance\": this.resonance = value; break\n            case \"envmod\": this.envmod = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"accent\": this.accentAmount = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100 + this.tuning) / 12)\n        const isSlide = this.heldNotes.length > 0\n        this.heldNotes.push({id, pitch, cent})\n        this.freqTarget = freq\n        if (isSlide) {\n            this.sliding = true\n        } else {\n            this.sliding = false\n            this.freqSmoothed = freq\n            this.gate = true\n            this.vcaDecay = 1.0\n            this.megEnv = 1.0\n            this.isAccented = velocity >= 1.0\n            if (this.isAccented) {\n                this.megDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.05 * sampleRate))\n            } else {\n                this.megDecayCoeff = Math.exp(-1 / (this.decayMs * 0.001 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (1.23 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.001 * sampleRate))\n            }\n        }\n    }\n    noteOff(id) {\n        this.heldNotes = this.heldNotes.filter(note => note.id !== id)\n        if (this.heldNotes.length === 0) {\n            this.gate = false\n            this.sliding = false\n        } else {\n            const prev = this.heldNotes[this.heldNotes.length - 1]\n            this.freqTarget = 440 * Math.pow(2, (prev.pitch - 69 + prev.cent / 100 + this.tuning) / 12)\n            this.sliding = true\n        }\n    }\n    reset() {\n        this.gate = false\n        this.sliding = false\n        this.vcaGate = 0\n        this.ampSmoothed = 0\n        this.vcaGateCoeff = Math.exp(-1 / (0.005 * sampleRate))\n        this.heldNotes = []\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const invSr = 1 / sr\n        const sr2 = sr * 2\n        const PI = Math.PI\n        const gateAttack = 1 - Math.exp(-1 / (0.003 * sr))\n        const slideAlpha = 1 - Math.exp(-1 / (0.012 * sr))\n        const accChargeAlpha = 1 - Math.exp(-1 / (0.147 * sr))\n        const accDischargeMul = Math.exp(-1 / (0.1 * sr))\n        const resoSkewed = this.resonance * this.resonance\n        const kFeedback = resoSkewed * 28\n        const gNorm = kFeedback / 17\n        let gComp = (gNorm - 1) * resoSkewed + 1\n        gComp *= (1 + resoSkewed)\n        const fbHpAlpha = 1 - Math.exp(-2 * PI * 150 / sr2)\n        const oscHpAlpha = 1 - Math.exp(-2 * PI * 44 / sr)\n        const postHpAlpha = 1 - Math.exp(-2 * PI * 24 / sr)\n        const cutoffAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const ampAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const envDepth = 1.5 + this.envmod * 4.0\n        const envOffset = this.envmod * 0.33\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.sliding) {\n                this.freqSmoothed += (this.freqTarget - this.freqSmoothed) * slideAlpha\n            } else {\n                this.freqSmoothed = this.freqTarget\n            }\n            const freq = this.freqSmoothed\n            const phaseInc = freq * invSr\n            let osc = 0\n            if (this.waveform === 0) {\n                osc = 2 * this.phase - 1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            } else {\n                const duty = Math.max(0.1, Math.min(0.9, 0.71 - 0.26 * (freq - 65) / 595))\n                osc = this.phase < duty ? 1 : -1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc += t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc += t * t + t + t + 1\n                }\n                let rd = this.phase - duty\n                if (rd < 0) rd += 1\n                if (rd < phaseInc && rd >= 0) {\n                    const t = rd / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (rd > 1 - phaseInc) {\n                    const t = (rd - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            }\n            this.oscHpState += oscHpAlpha * (osc - this.oscHpState)\n            osc -= this.oscHpState\n            this.megEnv *= this.megDecayCoeff\n            if (this.isAccented && this.gate) {\n                this.accentCap += accChargeAlpha * (this.megEnv * this.accentAmount - this.accentCap)\n            } else {\n                this.accentCap *= accDischargeMul\n            }\n            let targetCutoff = this.cutoffHz * Math.pow(2, envDepth * (this.megEnv - envOffset))\n            if (this.isAccented) {\n                targetCutoff *= Math.pow(2, this.accentAmount * this.megEnv * 2.5)\n            }\n            targetCutoff *= Math.pow(2, this.accentCap * 1.0)\n            if (targetCutoff < 60) targetCutoff = 60\n            if (targetCutoff > sr * 0.45) targetCutoff = sr * 0.45\n            this.cutoffSmoothed += (targetCutoff - this.cutoffSmoothed) * cutoffAlpha\n            const gf = Math.tan(PI * this.cutoffSmoothed / sr2)\n            const b0 = gf / (1 + gf)\n            for (let os = 0; os < 2; os++) {\n                const fbRaw = kFeedback * this.y4\n                this.fbHpState += fbHpAlpha * (fbRaw - this.fbHpState)\n                const fbHp = fbRaw - this.fbHpState\n                const y0 = Math.tanh(osc - fbHp)\n                this.y1 += 2 * b0 * (y0 - this.y1 + this.y2)\n                this.y1 = Math.tanh(this.y1)\n                this.y2 += b0 * (this.y1 - 2 * this.y2 + this.y3)\n                this.y2 = Math.tanh(this.y2)\n                this.y3 += b0 * (this.y2 - 2 * this.y3 + this.y4)\n                this.y3 = Math.tanh(this.y3)\n                this.y4 += b0 * (this.y3 - 2 * this.y4)\n                this.y4 = Math.tanh(this.y4)\n            }\n            let filtered = 2.5 * gComp * this.y4\n            this.postHpState += postHpAlpha * (filtered - this.postHpState)\n            filtered -= this.postHpState\n            if (this.gate) {\n                this.vcaGate += (1 - this.vcaGate) * gateAttack\n            } else {\n                this.vcaGate *= this.vcaGateCoeff\n            }\n            this.vcaDecay *= this.vcaDecayCoeff\n            let amp = this.vcaGate * this.vcaDecay\n            if (this.gate) {\n                amp += 0.45 * this.megEnv\n                if (this.isAccented) {\n                    amp += this.accentAmount * 4.0 * this.megEnv\n                }\n            }\n            this.ampSmoothed += (amp - this.ampSmoothed) * ampAlpha\n            const sample = Math.tanh(filtered * this.ampSmoothed) * this.volume\n            outL[s] += sample\n            outR[s] += sample\n            this.phase += phaseInc\n            if (this.phase >= 1) this.phase -= 1\n        }\n    }\n}"
const COUP: string = "// @label Coup\n// @param tune    48    35    80    exp     Hz\n// @param sweep   0.6   0     1     linear\n// @param decay   280   80    700   exp     ms\n// @param click   0.5   0     1     linear\n// @param drive   0.5   0     1     linear\n// @param volume  0.8   0     1     linear\n\n// Grosse caisse de synthese : une sinusoide qui tombe de tres haut en quelques\n// millisecondes (le claquement), puis qui tient sa note grave (le corps).\n// La saturation ecrase le debut et rallonge le corps.\nclass Processor {\n    tune = 48\n    sweep = 0.6\n    decayMs = 280\n    click = 0.5\n    drive = 0.5\n    volume = 0.8\n    phase = 0\n    envAmp = 0\n    envFast = 0\n    envSlow = 0\n    envClick = 0\n    level = 0\n    seed = 12345\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"sweep\": this.sweep = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"click\": this.click = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        this.phase = 0\n        this.envAmp = 1\n        this.envFast = 1\n        this.envSlow = 1\n        this.envClick = 1\n        this.level = velocity\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.envAmp = 0\n        this.envClick = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))\n        const kFast = Math.exp(-1 / (0.010 * sr))\n        const kSlow = Math.exp(-1 / (0.055 * sr))\n        const kClick = Math.exp(-1 / (0.0015 * sr))\n        const gain = 1 + this.drive * 5\n        const norm = 1 / Math.tanh(gain)\n        const out = this.level * this.volume\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.envAmp < 0.0002) {continue}\n            const f = this.tune * (1 + this.sweep * (7 * this.envFast + 1.5 * this.envSlow))\n            this.phase += f / sr\n            if (this.phase >= 1) {this.phase -= 1}\n            const body = Math.sin(twoPi * this.phase) * this.envAmp\n            this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n            const tick = (this.seed / 2147483648 - 1) * this.envClick * this.click * 0.6\n            const y = Math.tanh((body + tick) * gain) * norm * out\n            outL[s] += y\n            outR[s] += y\n            this.envAmp *= kAmp\n            this.envFast *= kFast\n            this.envSlow *= kSlow\n            this.envClick *= kClick\n        }\n    }\n}"
const SUB: string = "// @label Sub\n// @param depth    0.9   0     1     linear\n// @param release  160   40    500   exp     ms\n// @param glide    30    1     300   exp     ms\n// @param drive    0.4   0     1     linear\n// @param volume   0.8   0     1     linear\n\n// Basse : une sinusoide tenue, que la grosse caisse creuse. Le creusement est\n// dans l'instrument lui-meme : toute note plus grave que 24 ne sonne pas,\n// elle declenche le creux (\"depth\" = sa profondeur, \"release\" = le temps que\n// la basse met a revenir). Le morceau lui envoie une de ces notes fantomes a\n// chaque coup de pied : pas de compresseur, pas de branchement a rater.\nclass Processor {\n    depth = 0.9\n    releaseMs = 160\n    glideMs = 30\n    drive = 0.4\n    volume = 0.8\n    held = []\n    phase = 0\n    freq = 55\n    target = 55\n    gate = false\n    level = 0\n    env = 0\n    duck = 0\n    duckSmooth = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"depth\": this.depth = value; break\n            case \"release\": this.releaseMs = value; break\n            case \"glide\": this.glideMs = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {\n            this.duck = 1\n            return\n        }\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n        if (this.held.length === 0) {this.freq = freq}\n        this.held.push({id, freq})\n        this.target = freq\n        this.gate = true\n        this.level = velocity\n    }\n    noteOff(id) {\n        this.held = this.held.filter(note => note.id !== id)\n        if (this.held.length === 0) {\n            this.gate = false\n        } else {\n            this.target = this.held[this.held.length - 1].freq\n        }\n    }\n    reset() {\n        this.held = []\n        this.gate = false\n        this.env = 0\n        this.duck = 0\n        this.duckSmooth = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kGlide = 1 - Math.exp(-1 / (this.glideMs * 0.001 * sr))\n        const kAttack = 1 - Math.exp(-1 / (0.004 * sr))\n        const kRelease = Math.exp(-1 / (0.040 * sr))\n        const kDuck = Math.exp(-1 / (this.releaseMs * 0.001 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.002 * sr))\n        const gain = 1 + this.drive * 3\n        const norm = this.volume / Math.tanh(gain)\n        for (let s = block.s0; s < block.s1; s++) {\n            this.freq += (this.target - this.freq) * kGlide\n            this.phase += this.freq / sr\n            if (this.phase >= 1) {this.phase -= 1}\n            if (this.gate) {\n                this.env += (this.level - this.env) * kAttack\n            } else {\n                this.env *= kRelease\n            }\n            this.duck *= kDuck\n            this.duckSmooth += (this.duck - this.duckSmooth) * kSmooth\n            const a = this.env * (1 - this.depth * this.duckSmooth)\n            const y = Math.tanh(Math.sin(twoPi * this.phase) * a * gain) * norm\n            outL[s] += y\n            outR[s] += y\n        }\n    }\n}"
const PEAUX: string = "// @label Peaux\n// @param decay   220   60    900   exp     ms\n// @param bend    0.5   0     1     linear\n// @param slap    0.4   0     1     linear\n// @param drive   0.4   0     1     linear\n// @param width   0.6   0     1     linear\n// @param volume  0.8   0     1     linear\n\n// Toms et congas de synthese. Chaque note est une peau accordee : une\n// sinusoide dont la hauteur retombe apres la frappe, un partiel inharmonique\n// (rapport 1,593, celui d'une membrane) et un claquement de bruit.\n// Les peaux aigues sonnent plus court et s'ecartent dans la stereo.\nclass Processor {\n    decayMs = 220\n    bend = 0.5\n    slap = 0.4\n    drive = 0.4\n    width = 0.6\n    volume = 0.8\n    voices = []\n    seed = 987654321\n    paramChanged(name, value) {\n        switch (name) {\n            case \"decay\": this.decayMs = value; break\n            case \"bend\": this.bend = value; break\n            case \"slap\": this.slap = value; break\n            case \"drive\": this.drive = value; break\n            case \"width\": this.width = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const f0 = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n        const seconds = this.decayMs * 0.001 * Math.sqrt(110 / f0)\n        // Place stereo deduite de la note : stable d'une frappe a l'autre\n        const side = (((pitch * 5) % 7) / 6 - 0.5) * 2 * this.width * (f0 < 125 ? 0.3 : 1)\n        const angle = (side + 1) * Math.PI / 4\n        if (this.voices.length >= 8) {this.voices.shift()}\n        this.voices.push({\n            f0, phase: 0, phase2: 0, amp: 1, pitchEnv: 1, slapEnv: 1, level: velocity,\n            kAmp: Math.exp(-1 / (seconds * sampleRate)), left: Math.cos(angle), right: Math.sin(angle)\n        })\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.voices = []\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kPitch = Math.exp(-1 / (0.028 * sr))\n        const kSlap = Math.exp(-1 / (0.006 * sr))\n        const gain = 1 + this.drive * 4\n        const norm = 0.7 * this.volume / Math.tanh(gain)\n        for (const v of this.voices) {\n            for (let s = block.s0; s < block.s1; s++) {\n                const f = v.f0 * (1 + this.bend * 1.2 * v.pitchEnv)\n                v.phase += f / sr\n                if (v.phase >= 1) {v.phase -= 1}\n                v.phase2 += f * 1.593 / sr\n                if (v.phase2 >= 1) {v.phase2 -= 1}\n                // Le partiel inharmonique s'eteint deux fois plus vite que le corps\n                const body = (Math.sin(twoPi * v.phase) + 0.35 * Math.sin(twoPi * v.phase2) * v.amp) * v.amp\n                this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n                const hit = (this.seed / 2147483648 - 1) * v.slapEnv * this.slap * 0.8\n                const y = Math.tanh((body + hit) * gain) * norm * v.level\n                outL[s] += y * v.left\n                outR[s] += y * v.right\n                v.amp *= v.kAmp\n                v.pitchEnv *= kPitch\n                v.slapEnv *= kSlap\n            }\n        }\n        this.voices = this.voices.filter(v => v.amp > 0.0003)\n    }\n}"
const ESCALIER: string = "// @label Escalier\n// @param decay   260   40    2000  exp     ms\n// @param center  500   120   3000  exp     Hz\n// @param width   1.2   0.5   2.5   linear\n// @param sweep   1.5   0     4     linear\n// @param fdecay  90    15    900   exp     ms\n// @param grain   0.4   0     1.2   linear\n// @param drive   0.3   0     1     linear\n// @param spread  0.6   0     1     linear\n// @param volume  0.7   0     1     linear\n\n// L'escalier de Penrose. Chaque note est un son de Shepard : la meme note\n// jouee a toutes les octaves a la fois, sous une cloche fixe (\"center\" = son\n// milieu, \"width\" = sa largeur en octaves). L'oreille entend le nom de la\n// note, pas son octave : une suite de notes qui monte peut donc monter sans\n// fin, elle repasse par les memes sons sans jamais redescendre.\n// Seule la classe de hauteur de la note compte (Do, Do diese...), pas l'octave.\n// \"sweep\" : au debut de chaque note la cloche part plus haut (en octaves) et\n// retombe en \"fdecay\" ms, comme un filtre qui se referme.\n// \"grain\" : chaque partiel se module lui-meme, ca donne du mordant.\nclass Processor {\n    decayMs = 260\n    center = 500\n    width = 1.2\n    sweep = 1.5\n    fdecayMs = 90\n    grain = 0.4\n    drive = 0.3\n    spread = 0.6\n    volume = 0.7\n    voices = []\n    count = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"decay\": this.decayMs = value; break\n            case \"center\": this.center = value; break\n            case \"width\": this.width = value; break\n            case \"sweep\": this.sweep = value; break\n            case \"fdecay\": this.fdecayMs = value; break\n            case \"grain\": this.grain = value; break\n            case \"drive\": this.drive = value; break\n            case \"spread\": this.spread = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const pc = ((pitch % 12) + 12) % 12\n        const base = 32.7032 * Math.pow(2, (pc + cent / 100) / 12)\n        if (this.voices.length >= 5) {this.voices.shift()}\n        this.count++\n        // Une note a gauche, la suivante a droite\n        const side = this.count % 2 === 0 ? 1 : -1\n        const angle = (1 + side * 0.7 * this.spread) * Math.PI / 4\n        this.voices.push({\n            base, lb: Math.log2(base),\n            phases: [0, 0, 0, 0, 0, 0, 0, 0, 0],\n            last: [0, 0, 0, 0, 0, 0, 0, 0, 0],\n            weights: [0, 0, 0, 0, 0, 0, 0, 0, 0],\n            amp: 1, fenv: 1, attack: 0, level: velocity, tick: 0,\n            left: Math.cos(angle), right: Math.sin(angle)\n        })\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.voices = []\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))\n        const kFilter = Math.exp(-1 / (this.fdecayMs * 0.001 * sr))\n        const kAttack = 1 - Math.exp(-1 / (0.001 * sr))\n        const logCenter = Math.log2(this.center)\n        const gain = 1 + this.drive * 4\n        const norm = 0.8 * this.volume / Math.tanh(gain)\n        for (const v of this.voices) {\n            const step = v.base / sr\n            for (let s = block.s0; s < block.s1; s++) {\n                if (v.tick === 0) {\n                    // La cloche : recalculee toutes les 32 samples, elle bouge lentement\n                    const lc = logCenter + this.sweep * v.fenv\n                    let sum = 0\n                    for (let k = 0; k < 9; k++) {\n                        const d = (v.lb + k - lc) / this.width\n                        const w = Math.exp(-0.5 * d * d)\n                        v.weights[k] = w\n                        sum += w\n                    }\n                    const inv = 1 / Math.max(sum, 0.5)\n                    for (let k = 0; k < 9; k++) {v.weights[k] *= inv}\n                }\n                v.tick = (v.tick + 1) & 31\n                const fb = this.grain * (0.3 + 0.7 * v.fenv)\n                let x = 0\n                let inc = step\n                for (let k = 0; k < 9; k++) {\n                    let p = v.phases[k] + inc\n                    if (p >= 1) {p -= 1}\n                    v.phases[k] = p\n                    const w = v.weights[k]\n                    if (w > 0.002) {\n                        const y = Math.sin(twoPi * p + fb * v.last[k])\n                        v.last[k] = (y + v.last[k]) * 0.5\n                        x += y * w\n                    }\n                    inc *= 2\n                }\n                v.attack += (1 - v.attack) * kAttack\n                const y = Math.tanh(x * v.amp * v.attack * v.level * gain) * norm\n                outL[s] += y * v.left\n                outR[s] += y * v.right\n                v.amp *= kAmp\n                v.fenv *= kFilter\n            }\n        }\n        this.voices = this.voices.filter(v => v.amp > 0.0003)\n    }\n}"
const SOUFFLE: string = "// @label Souffle\n// @param freq    600   80    8000  exp     Hz\n// @param reso    0.6   0     1     linear\n// @param drift   0.5   0     1     linear\n// @param volume  0.5   0     1     linear\n\n// Le souffle : du bruit dans un filtre passe-bande, un par oreille. \"freq\" est\n// la hauteur du souffle, \"reso\" son etroitesse (0 = vent large, 1 = sifflement).\n// \"drift\" le fait vivre : la hauteur ondule lentement et le son passe d'une\n// oreille a l'autre, sur trois horloges qui ne se rejoignent jamais.\n// Faire monter \"freq\" et \"volume\" ensemble, c'est une montee.\n// Sonne tant qu'une note est tenue (la hauteur de la note est ignoree).\nclass Processor {\n    freq = 600\n    reso = 0.6\n    drift = 0.5\n    volume = 0.5\n    held = 0\n    env = 0\n    smooth = 600\n    seedL = 22222\n    seedR = 77777\n    lowL = 0\n    bandL = 0\n    lowR = 0\n    bandR = 0\n    lfoA = 0\n    lfoB = 0.3\n    lfoC = 0.6\n    paramChanged(name, value) {\n        switch (name) {\n            case \"freq\": this.freq = value; break\n            case \"reso\": this.reso = value; break\n            case \"drift\": this.drift = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        this.held++\n    }\n    noteOff(id) {\n        if (this.held > 0) {this.held--}\n    }\n    reset() {\n        this.held = 0\n        this.env = 0\n        this.lowL = 0\n        this.bandL = 0\n        this.lowR = 0\n        this.bandR = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const target = this.held > 0 ? 1 : 0\n        if (target === 0 && this.env < 0.0002) {\n            this.env = 0\n            return\n        }\n        const kEnv = 1 - Math.exp(-1 / (0.6 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.05 * sr))\n        const n = block.s1 - block.s0\n        // Les trois horloges lentes : une fois par bloc suffit\n        this.lfoA += 0.07 * n / sr\n        if (this.lfoA >= 1) {this.lfoA -= 1}\n        this.lfoB += 0.11 * n / sr\n        if (this.lfoB >= 1) {this.lfoB -= 1}\n        this.lfoC += 0.045 * n / sr\n        if (this.lfoC >= 1) {this.lfoC -= 1}\n        const wander = Math.pow(2, 0.35 * this.drift * Math.sin(twoPi * this.lfoC))\n        const ampL = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoA))\n        const ampR = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoB))\n        const damp = 1.2 - 1.1 * this.reso\n        for (let s = block.s0; s < block.s1; s++) {\n            this.smooth += (this.freq - this.smooth) * kSmooth\n            const fc = Math.min(this.smooth * wander, sr / 7)\n            const f = 2 * Math.sin(Math.PI * fc / sr)\n            // Le bruit filtre sort d'autant plus faible que le filtre est grave\n            // et large : on compense pour que le niveau reste le meme\n            const comp = Math.sqrt(6 * damp / f) * 0.22\n            this.env += (target - this.env) * kEnv\n            this.seedL = (this.seedL * 1664525 + 1013904223) >>> 0\n            this.seedR = (this.seedR * 1664525 + 1013904223) >>> 0\n            const xL = this.seedL / 2147483648 - 1\n            const xR = this.seedR / 2147483648 - 1\n            this.lowL += f * this.bandL\n            this.bandL += f * (xL - this.lowL - damp * this.bandL)\n            this.lowR += f * this.bandR\n            this.bandR += f * (xR - this.lowR - damp * this.bandR)\n            const a = comp * this.env * this.volume\n            outL[s] += Math.tanh(this.bandL * a * ampL)\n            outR[s] += Math.tanh(this.bandR * a * ampR)\n        }\n    }\n}"

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- Impact : un coup sourd qui descend, et un souffle court ----------
let seed = 20261113
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296 * 2 - 1
}
function makeImpact() {
    const n = Math.floor(sr * 1.8)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let phase = 0, lp = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        const freq = 28 + 80 * Math.exp(-t * 6)
        phase += freq / sr
        const boom = Math.sin(phase * 2 * Math.PI) * Math.exp(-t * 3.2)
        lp += (rnd() - lp) * (0.02 + 0.4 * Math.exp(-t * 5))
        const air = lp * Math.exp(-t * 4) * 0.4
        const fade = Math.min(1, (n - i) / (sr * 0.05))
        f[i] = Math.tanh((boom * 0.9 + air) * 1.5) * 0.8 * fade
    }
    return audio
}
const impact = await openDAW.addSample(makeImpact(), "MB Impact")

// ---------- La TR-909 d'openDAW (cymbales, clap, caisse claire) ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Moebius")
project.bpm = BPM

// Une reverb courte, pour le clap seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.4, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Structure. Deux creux (56-64 et 96-104), deux drops (64 et 104), un sommet
// (128-152), puis une longue descente qui ramene au point de depart.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 8},
    {name: "Eveil", start: 8, bars: 16},
    {name: "Groove", start: 24, bars: 32},
    {name: "Break", start: 56, bars: 8},
    {name: "Drop", start: 64, bars: 32},
    {name: "Vide", start: 96, bars: 8},
    {name: "Final", start: 104, bars: 24},
    {name: "Sommet", start: 128, bars: 24},
    {name: "Descente", start: 152, bars: 32},
    {name: "Sortie", start: 184, bars: 16}
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
 * Une pente sur laquelle on pose une vague lente. Chaque reglage a sa vague,
 * de periode differente (12, 20, 28 mesures...) : les reglages ne repassent
 * jamais ensemble par le meme point, le son ne se repete pas.
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

const inBreak = (bar: number) => (bar >= 56 && bar < 64) || (bar >= 96 && bar < 104)
const kickOn = (bar: number) => bar < 192 && !inBreak(bar)
const drop = (bar: number) => (bar >= 64 && bar < 96) || (bar >= 104 && bar < 152)
const sommet = (bar: number) => bar >= 128 && bar < 152
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 63 || bar === 103
const limite = (bar: number) => avantDrop(bar) ? 12 : 16

// Les boucles de longueur impaire comptent leurs pas depuis la mesure 104 :
// c'est la, et seulement la, qu'elles repartent toutes de leur premier pas.
const ORIGINE = 104 * 16
const tour = (bar: number, step: number, period: number) =>
    (((bar * 16 + step - ORIGINE) % period) + period) % period

/** Les coups de pied d'une mesure : [pas, velocite]. Le Sub s'en sert aussi. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Le pied garde de la reserve jusqu aux drops : c est la que le niveau monte
    const v = bar < 8 || bar >= 184 ? 0.8 : drop(bar) ? 1 : 0.9
    const out = [[0, v], [4, v], [8, v], [12, v]]
    if (drop(bar) && bar % 8 === 7) {out.push([14, 0.7])}
    return out
}

// ---------- Coup : la grosse caisse ----------
const kick = apparat("Coup", COUP, -5)
regle("coup", kick, "tune", 44)
regle("coup", kick, "sweep", 0.7)
regle("coup", kick, "decay", 150)
regle("coup", kick, "click", 0.7)
regle("coup", kick, "drive", 0.15)
build(kick.noteTracks[0], "Coup", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))

// ---------- Sub : la basse qui roule derriere le pied ----------
// La note 12 ne sonne pas : elle declenche le creux, a chaque coup de pied.
const sub = apparat("Sub", SUB, -12)
regle("sub", sub, "depth", 0.9)
regle("sub", sub, "release", 120)
regle("sub", sub, "drive", 0.45)
const FA = 29, SOLB = 30, LAB = 32
build(sub.noteTracks[0], "Sub", bar => {
    const out: Note[] = kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))
    if (!kickOn(bar) || bar < 8) {return out}
    const v = bar < 24 || bar >= 184 ? 0.7 : drop(bar) ? 1 : 0.85
    for (let beat = 0; beat < 4; beat++) {
        // Fin de phrase : la basse touche le Sol bemol, la seconde mineure
        let pitch = FA
        if (bar % 4 === 3 && beat === 3) {pitch = SOLB}
        if (bar % 16 === 15 && beat === 2) {pitch = LAB}
        const at = beat * 4
        if (beat % 2 === 1) {out.push({position: (at + 1) * S16, duration: Math.round(S16 * 0.8), pitch, velocity: v * 0.6})}
        out.push({position: (at + 2) * S16, duration: Math.round(S16 * 0.9), pitch, velocity: v})
        out.push({position: (at + 3) * S16, duration: Math.round(S16 * 0.85), pitch, velocity: v * 0.85})
    }
    return out
})

// ---------- Les deux 303 ----------
const N = null
// steps : demi-tons au-dessus de la note de base. 1 = Sol bemol, 3 = La bemol.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// A0 : le squelette. A1 : le motif, qui ne change presque jamais (c'est le
// filtre qui raconte). A2 : sa fin de phrase. A3 : le sommet. A4 : les creux.
const A0: Pattern = {steps: [0, N, 0, N, N, 0, N, 0, N, 0, N, N, 0, N, 1, N], accents: [14], slides: []}
const A1: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 0, 12, N, 0, 3, 0, 1, 12], accents: [2, 9, 12], slides: [6, 14]}
const A2: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 13, 12, N, 0, 8, 7, 1, 0], accents: [8, 12], slides: [8, 12, 14]}
const A3: Pattern = {steps: [0, 12, 0, 13, 12, 0, 1, 0, 15, 12, 0, 12, 3, 0, 13, 12], accents: [3, 8, 14], slides: [3, 8, 14]}
const A4: Pattern = {steps: [0, N, N, N, N, N, 1, N, 0, N, N, N, N, N, 13, 12], accents: [6], slides: [14]}
// La seconde 303 : sept pas, contre les seize de la mesure
const E7: Pattern = {steps: [0, N, 7, N, 1, 0, N], accents: [2], slides: [4]}

function acidNote(pattern: Pattern, index: number, step: number, base: number): Note {
    const slide = pattern.slides.includes(index)
    return {
        position: step * S16,
        // Une note liee deborde sur la suivante : c'est le recouvrement qui
        // declenche le glissando dans la 303
        duration: Math.round(S16 * (slide ? 1.3 : 0.6)),
        pitch: base + (pattern.steps[index] as number),
        // L'accent de cette 303 se declenche a velocite 1.0 pile
        velocity: pattern.accents.includes(index) ? 1.0 : 0.7
    }
}

const acid = apparat("Acide", TB303, -2)
regle("acide", acid, "cutoff", 70)
regle("acide", acid, "resonance", 0.85)
regle("acide", acid, "envmod", 0.3)
regle("acide", acid, "decay", 300)
regle("acide", acid, "accent", 1.0)
essai("saturation acide", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.85} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -18})

build(acid.noteTracks[0], "Acide", bar => {
    let pattern: Pattern | null = null
    if (bar >= 16 && bar < 24) {pattern = A0}
    else if (bar >= 24 && bar < 56) {pattern = bar % 8 === 7 ? A2 : A1}
    else if (bar >= 56 && bar < 62) {pattern = A4}
    else if (bar >= 62 && bar < 64) {pattern = A1}
    else if (bar >= 64 && bar < 96) {pattern = bar % 8 === 7 ? A2 : A1}
    else if (bar >= 100 && bar < 102) {pattern = A4}
    else if (bar >= 102 && bar < 104) {pattern = A1}
    else if (bar >= 104 && bar < 128) {pattern = bar % 8 === 7 ? A2 : A1}
    else if (bar >= 128 && bar < 152) {pattern = bar % 8 === 7 ? A2 : bar % 2 === 1 ? A3 : A1}
    else if (bar >= 152 && bar < 176) {pattern = A1}
    else if (bar >= 176 && bar < 184) {pattern = A0}
    if (pattern === null) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, step, 41))
    }
    return out
})

// Le filtre raconte le morceau. Valeurs 0..1 sur la plage declaree par la
// 303 (coupure 60-300 Hz en exponentiel : c'est l'enveloppe qui fait le reste).
auto("acide", acid, "cutoff", vague([
    [0, 0.05], [16, 0.05], [24, 0.14], [40, 0.32], [56, 0.50],
    [56, 0.12], [60, 0.14], [63.75, 0.80], [64, 0.66], [96, 0.86],
    [96, 0.10], [100, 0.12], [103.75, 0.92], [104, 0.80], [128, 0.90], [152, 0.94],
    [152, 0.75], [176, 0.30], [184, 0.12], [200, 0.05]
], 12, 0.07))
auto("acide", acid, "envmod", vague([
    [0, 0.20], [16, 0.20], [56, 0.50], [56, 0.25], [63.75, 0.60], [64, 0.70], [96, 0.80],
    [96, 0.30], [103.75, 0.70], [104, 0.82], [152, 0.92], [184, 0.25], [200, 0.15]
], 20, 0.07))
auto("acide", acid, "resonance", vague([
    [0, 0.78], [24, 0.80], [56, 0.87], [56, 0.94], [64, 0.88], [96, 0.91], [96, 0.96],
    [104, 0.89], [152, 0.93], [184, 0.80], [200, 0.78]
], 28, 0.025))
auto("acide", acid, "decay", [
    [0, 0.12], [24, 0.18], [56, 0.28], [56, 0.70], [64, 0.30], [96, 0.42], [96, 0.80],
    [104, 0.38], [128, 0.46], [152, 0.50], [184, 0.15], [200, 0.12]
])
// Le niveau de la 303 retombe a l entree des creux : un creux doit etre un vrai
// creux, pour l oreille comme pour la detection de drop du jeu.
auto("acide", acid, "volume", [
    [0, 0.70], [56, 0.70], [56, 0.38], [60, 0.45], [63.75, 0.70], [96, 0.70],
    [96, 0.38], [103.75, 0.70], [200, 0.70]
])

const echo = apparat("Echo", TB303, -8, 0.3)
regle("echo", echo, "waveform", 1)
regle("echo", echo, "cutoff", 150)
regle("echo", echo, "resonance", 0.9)
regle("echo", echo, "envmod", 0.5)
regle("echo", echo, "decay", 300)
regle("echo", echo, "accent", 1.0)
echo.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.5, wet: -10})

build(echo.noteTracks[0], "Echo", bar => {
    const on = (bar >= 80 && bar < 96) || (bar >= 104 && bar < 168)
    if (!on) {return []}
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        const index = tour(bar, step, 7)
        if (E7.steps[index] === null) {continue}
        out.push(acidNote(E7, index, step, 53))
    }
    return out
})
auto("echo", echo, "cutoff", vague([
    [0, 0.30], [80, 0.30], [96, 0.60], [104, 0.50], [152, 0.90], [168, 0.30], [200, 0.30]
], 18, 0.08))

// ---------- Escalier : l'arpege qui monte sans fin ----------
// Cinq notes de Fa phrygien, une tous les trois pas. En sons de Shepard,
// apres le Mi bemol vient le Fa "du dessus", qui est le meme Fa : ca monte
// toujours. Dans la descente, la suite est lue a l'envers.
const MARCHES = [53, 54, 56, 60, 63] // Fa, Sol bemol, La bemol, Do, Mi bemol
const stairs = apparat("Escalier", ESCALIER, -6)
regle("escalier", stairs, "width", 1.2)
regle("escalier", stairs, "sweep", 1.6)
regle("escalier", stairs, "fdecay", 80)
regle("escalier", stairs, "grain", 0.5)
regle("escalier", stairs, "drive", 0.35)
regle("escalier", stairs, "spread", 0.7)
stairs.addAudioEffect("Delay", {delay: 11, feedback: 0.4, cross: 1, filter: 0.3, wet: -12})

build(stairs.noteTracks[0], "Escalier", bar => {
    if (bar < 40 || bar >= 184) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        const index = tour(bar, step, 15)
        if (index % 3 !== 0) {continue}
        const marche = index / 3
        const pitch = MARCHES[bar >= 152 ? (5 - marche) % 5 : marche]
        out.push({position: step * S16, duration: S16, pitch, velocity: marche === 0 ? 1 : 0.7})
    }
    return out
})
// decay 40..2000 ms (150 ms = 0.34, 260 = 0.48, 600 = 0.69) ;
// center 120..3000 Hz (400 Hz = 0.37, 800 = 0.59, 1200 = 0.72).
auto("escalier", stairs, "volume", [
    [0, 0.30], [40, 0.30], [56, 0.50], [56, 0.80], [63.75, 0.85], [64, 0.50], [96, 0.55],
    [96, 0.90], [103.75, 0.95], [104, 0.55], [152, 0.68], [168, 0.55], [184, 0.25], [200, 0.25]
])
auto("escalier", stairs, "decay", [
    [0, 0.40], [56, 0.42], [56, 0.66], [63.75, 0.70], [64, 0.40], [96, 0.44], [96, 0.70],
    [103.75, 0.74], [104, 0.42], [152, 0.46], [184, 0.62], [200, 0.62]
])
auto("escalier", stairs, "center", vague([
    [0, 0.36], [56, 0.42], [63.75, 0.60], [64, 0.48], [96, 0.56], [103.75, 0.70], [104, 0.56],
    [152, 0.70], [184, 0.36], [200, 0.36]
], 9, 0.05))

// ---------- Bois : cinq pas contre seize ----------
const wood = apparat("Bois", PEAUX, -8)
regle("bois", wood, "decay", 90)
regle("bois", wood, "bend", 0.3)
regle("bois", wood, "slap", 0.7)
regle("bois", wood, "drive", 0.3)
regle("bois", wood, "width", 0.8)
const BOIS = [65, N, N, 72, N]
build(wood.noteTracks[0], "Bois", bar => {
    if (bar < 4 || bar >= 196) {return []}
    const gain = inBreak(bar) ? 1 : bar < 24 || bar >= 184 ? 0.7 : 0.85
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        const pitch = BOIS[tour(bar, step, 5)]
        if (pitch === null) {continue}
        out.push({position: step * S16, duration: S16 / 2, pitch, velocity: (pitch === 65 ? 1 : 0.75) * gain})
    }
    return out
})

// ---------- Souffle : l'air de la piece, et les montees ----------
const breath = apparat("Souffle", SOUFFLE, -8)
regle("souffle", breath, "reso", 0.6)
regle("souffle", breath, "drift", 0.6)
build(breath.noteTracks[0], "Souffle", bar => {
    const section = SECTIONS.find(s => s.start === bar)
    if (!section) {return []}
    return [{position: 0, duration: section.bars * BAR - 10, pitch: 60, velocity: 1}]
})
// freq 80..8000 Hz (300 Hz = 0.29, 600 = 0.44, 1500 = 0.64, 4000 = 0.85).
// Avant chaque drop le souffle grimpe et enfle : c'est la montee.
auto("souffle", breath, "freq", [
    [0, 0.30], [24, 0.40], [56, 0.35], [60, 0.45], [63.75, 0.88], [64, 0.45], [96, 0.35], [100, 0.48],
    [103.75, 0.92], [104, 0.50], [152, 0.55], [184, 0.35], [200, 0.30]
])
auto("souffle", breath, "volume", [
    [0, 0.55], [8, 0.50], [24, 0.25], [56, 0.25], [56, 0.45], [63.75, 0.95], [64, 0.20], [96, 0.22],
    [96, 0.50], [103.75, 1.0], [104, 0.22], [152, 0.25], [184, 0.50], [200, 0.55]
])

// ---------- Cymbales, clap, caisse claire : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -2})
const SNARE = 38, CLAP = 39, HAT_C = 42, HAT_O = 46, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Snare", SNARE, {volume: -8}],
    ["Clap", CLAP, {volume: -1}],
    ["Closed Hat", HAT_C, {volume: -6, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -6, panning: 0.1, exclude: true}],
    ["Crash", CRASH, {volume: -15}],
    ["Ride", RIDE, {volume: -11, panning: 0.22}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
essai("saturation 909", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -26})

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: step * S16, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const k = kickOn(bar), d = drop(bar)
    const full = k && bar >= 24 && bar < 176
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        // Clap sur 2 et 4 : il arrive tard, et il se retire avant la fin
        if (k && step % 8 === 4 && ((bar >= 40 && bar < 56) || d || (bar >= 152 && bar < 168))) {
            hit(step, CLAP, d ? 0.95 : 0.8)
            if (d) {hit(step, SNARE, 0.3)}
        }
        if (k && bar >= 8) {
            if (beat === 2) {hit(step, full ? HAT_O : HAT_C, full ? (d ? 0.85 : 0.7) : 0.55)}
            else if (full) {
                // Dans les drops, un accent tous les trois pas : trois contre quatre
                const accent = d && tour(bar, step, 3) === 0 ? 0.2 : 0
                hit(step, HAT_C, (beat === 0 ? 0.4 : beat === 1 ? 0.2 : 0.3) + accent)
            }
        }
        // Dans les creux, les charleys reviennent a pas de loup
        if ((bar >= 60 && bar < 63) || (bar >= 100 && bar < 103)) {
            hit(step, HAT_C, 0.1 + (bar % 4) * 0.09 + step * 0.004 + (beat === 2 ? 0.1 : 0))
        }
        // Ride : en retrait dans la seconde moitie du premier drop, devant au sommet
        if (((bar >= 80 && bar < 96) || sommet(bar)) && step % 2 === 0) {
            hit(step, RIDE, (beat === 2 ? 0.6 : 0.35) * (sommet(bar) ? 1 : 0.7))
        }
    }
    if (bar === 64 || bar === 104) {hit(0, CRASH, 0.8)}
    if (bar === 128) {hit(0, CRASH, 0.5)}
    if (d && bar % 16 === 15) {hit(13, SNARE, 0.4); hit(15, SNARE, 0.55)}
    // Roulement de caisse claire : court, et il s'arrete un temps avant le drop
    if (avantDrop(bar)) {for (let s = 4; s < 12; s++) {hit(s, SNARE, 0.35 + (s - 4) * 0.06)}}
    return out
})

// ---------- Impacts ----------
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -6})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 64 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 104 * BAR, playback: "no-sync"}))

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// STEMS = [] : mix seul. Sinon, la liste des pistes a isoler.
const MESURER = true
const units: any[] = [kick, sub, acid, echo, stairs, wood, breath, drums, fxHit]
const STEMS: [string, any][] = [["Coup", kick], ["Sub", sub], ["Acide", acid], ["Echo", echo],
    ["Escalier", stairs], ["Bois", wood], ["Souffle", breath], ["909", drums]]
if (MESURER) {
    const parts = [["intro", 0, 8], ["eveil", 8, 24], ["groove", 24, 56], ["break", 56, 64],
        ["drop", 64, 96], ["vide", 96, 104], ["final", 104, 128], ["sommet", 128, 152],
        ["descente", 152, 184], ["sortie", 184, 200]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(STEMS)) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const n = L.length
        let peakValue = 0
        for (let i = 0; i < n; i++) {const a = Math.abs(L[i]); if (a > peakValue) {peakValue = a}}
        const cells: string[] = []
        for (const s of parts) {
            const from = Math.max(1, Math.floor((s[1] as number) * barSec * rate))
            const to = Math.min(n, Math.floor((s[2] as number) * barSec * rate))
            let sx = 0, sd = 0
            for (let i = from; i < to; i++) {const d = L[i] - L[i - 1]; sx += L[i] * L[i]; sd += d * d}
            cells.push(s[0] + " " + (sx > 0 ? gainToDb(Math.sqrt(sx / (to - from))).toFixed(1) + "dB " + Math.round(Math.sqrt(sd / sx) * rate / (2 * Math.PI)) + "Hz" : "silence"))
        }
        report.push(stem[0] + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " : " + cells.join(", "))
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
