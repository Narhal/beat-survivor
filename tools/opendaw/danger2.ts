// DANGER DANGER v2 - Beat Survivor, mode Survie
// Acid techno sombre - 132 BPM - La phrygien - 140 mesures (4 min 15)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// danger2.src.ts (le morceau), tb303-bass-line.js (la 303), voix-sam.json
// (la voix) et des instruments du dossier apparat/.
// La premiere version reste telle quelle : danger.src.ts, projet "Danger Danger".
//
// Meme morceau, refait avec ce qui a ete appris depuis (chaine d'Underdog,
// retours de N4, deux references mesurees : Dusty Kid - Kore et Randomer -
// Bring). L'idee ne change pas : un La, son demi-ton de menace, une 303 dont
// le filtre raconte, et une voix de micro-ordinateur. Ce qui change :
// - Le grave. Une grosse caisse en couches (corps, coup dans la poitrine,
//   claquement, saturation en parallele), et derriere elle un grondement :
//   une masse de bruit grave qui s'efface a chaque coup, enfle, pousse sur
//   le contretemps et se referme avant le coup suivant. Il remplace la basse
//   roulante de la v1 : un seul acteur dans le grave a la fois.
// - La voix. Les mots de SAM passent aussi dans un vocodeur calcule ici : ils
//   chantent un accord (La, Mi, La), et le second "danger" monte au Si bemol.
//   La voix nue reste pour les mots qu'on doit comprendre.
// - Avant chaque drop, une aspiration : le mot "danger" noye dans une longue
//   reverb puis retourne. Elle s'arrete un temps avant le drop.
// - L'accord dub : trois dents de scie desaccordees par note, un filtre qui se
//   referme, un echo en croche pointee. Un coup par mesure, sur un temps faible.
// - Des charleys de synthese qui vivent (longueur et clarte bougent lentement).
// - L'arrangement : blocs de 16 mesures, les aigus changent de vitesse a
//   chaque bloc, un bloc demarre sans ses graves (72), un passage nu (108),
//   un creux en trois temps (chute, montee, suspension).
// - Le mix est regle contre les deux references : meme part de grave, meme
//   part d'aigu, meme ecart entre les cretes et le niveau moyen.
//
// Instruments : Frappe (grosse caisse), Grondement, Accord, Cymbale et Souffle
// sont ecrits pour ces morceaux (Apparat = instrument scriptable d'openDAW).
// Les deux 303 sont le script Apparat "TB-303 Bass Line" d'Andre Michelle
// (CC0). Clap, caisse claire, rimshot, toms, ride, crash : TR-909.

const BPM = 132
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 140
const sr = sampleRate
const barSec = 240 / BPM
const beatSec = 60 / BPM

const TB303: string = "// @label TB-303 Bass Line\n// @param waveform   false\n// @param tuning     0     -12   12     linear  st\n// @param cutoff     80    60    300    exp     Hz\n// @param resonance  1.0   0     1      linear\n// @param envmod     0.0   0     1      linear\n// @param decay      300   200   2000   exp     ms\n// @param accent     1.0   0     1      linear\n// @param volume     0.7   0     1      linear\n\nclass Processor {\n    waveform = 0\n    tuning = 0\n    cutoffHz = 80\n    resonance = 0.8\n    envmod = 0.2\n    decayMs = 300\n    accentAmount = 1.0\n    volume = 0.7\n    phase = 0\n    freqTarget = 220\n    freqSmoothed = 220\n    y1 = 0\n    y2 = 0\n    y3 = 0\n    y4 = 0\n    fbHpState = 0\n    oscHpState = 0\n    postHpState = 0\n    vcaGate = 0\n    vcaDecay = 0\n    megEnv = 0\n    megDecayCoeff = 0.9999\n    vcaDecayCoeff = 0.9999\n    vcaGateCoeff = 0.999\n    accentCap = 0\n    isAccented = false\n    gate = false\n    sliding = false\n    heldNotes = []\n    cutoffSmoothed = 200\n    ampSmoothed = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"waveform\": this.waveform = value; break\n            case \"tuning\": this.tuning = value; break\n            case \"cutoff\": this.cutoffHz = value; break\n            case \"resonance\": this.resonance = value; break\n            case \"envmod\": this.envmod = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"accent\": this.accentAmount = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const freq = 440 * Math.pow(2, (pitch - 69 + cent / 100 + this.tuning) / 12)\n        const isSlide = this.heldNotes.length > 0\n        this.heldNotes.push({id, pitch, cent})\n        this.freqTarget = freq\n        if (isSlide) {\n            this.sliding = true\n        } else {\n            this.sliding = false\n            this.freqSmoothed = freq\n            this.gate = true\n            this.vcaDecay = 1.0\n            this.megEnv = 1.0\n            this.isAccented = velocity >= 1.0\n            if (this.isAccented) {\n                this.megDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (0.2 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.05 * sampleRate))\n            } else {\n                this.megDecayCoeff = Math.exp(-1 / (this.decayMs * 0.001 * sampleRate))\n                this.vcaDecayCoeff = Math.exp(-1 / (1.23 * sampleRate))\n                this.vcaGateCoeff = Math.exp(-1 / (0.001 * sampleRate))\n            }\n        }\n    }\n    noteOff(id) {\n        this.heldNotes = this.heldNotes.filter(note => note.id !== id)\n        if (this.heldNotes.length === 0) {\n            this.gate = false\n            this.sliding = false\n        } else {\n            const prev = this.heldNotes[this.heldNotes.length - 1]\n            this.freqTarget = 440 * Math.pow(2, (prev.pitch - 69 + prev.cent / 100 + this.tuning) / 12)\n            this.sliding = true\n        }\n    }\n    reset() {\n        this.gate = false\n        this.sliding = false\n        this.vcaGate = 0\n        this.ampSmoothed = 0\n        this.vcaGateCoeff = Math.exp(-1 / (0.005 * sampleRate))\n        this.heldNotes = []\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const invSr = 1 / sr\n        const sr2 = sr * 2\n        const PI = Math.PI\n        const gateAttack = 1 - Math.exp(-1 / (0.003 * sr))\n        const slideAlpha = 1 - Math.exp(-1 / (0.012 * sr))\n        const accChargeAlpha = 1 - Math.exp(-1 / (0.147 * sr))\n        const accDischargeMul = Math.exp(-1 / (0.1 * sr))\n        const resoSkewed = this.resonance * this.resonance\n        const kFeedback = resoSkewed * 28\n        const gNorm = kFeedback / 17\n        let gComp = (gNorm - 1) * resoSkewed + 1\n        gComp *= (1 + resoSkewed)\n        const fbHpAlpha = 1 - Math.exp(-2 * PI * 150 / sr2)\n        const oscHpAlpha = 1 - Math.exp(-2 * PI * 44 / sr)\n        const postHpAlpha = 1 - Math.exp(-2 * PI * 24 / sr)\n        const cutoffAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const ampAlpha = 1 - Math.exp(-1 / (0.0005 * sr))\n        const envDepth = 1.5 + this.envmod * 4.0\n        const envOffset = this.envmod * 0.33\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.sliding) {\n                this.freqSmoothed += (this.freqTarget - this.freqSmoothed) * slideAlpha\n            } else {\n                this.freqSmoothed = this.freqTarget\n            }\n            const freq = this.freqSmoothed\n            const phaseInc = freq * invSr\n            let osc = 0\n            if (this.waveform === 0) {\n                osc = 2 * this.phase - 1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            } else {\n                const duty = Math.max(0.1, Math.min(0.9, 0.71 - 0.26 * (freq - 65) / 595))\n                osc = this.phase < duty ? 1 : -1\n                if (this.phase < phaseInc) {\n                    const t = this.phase / phaseInc\n                    osc += t + t - t * t - 1\n                } else if (this.phase > 1 - phaseInc) {\n                    const t = (this.phase - 1) / phaseInc\n                    osc += t * t + t + t + 1\n                }\n                let rd = this.phase - duty\n                if (rd < 0) rd += 1\n                if (rd < phaseInc && rd >= 0) {\n                    const t = rd / phaseInc\n                    osc -= t + t - t * t - 1\n                } else if (rd > 1 - phaseInc) {\n                    const t = (rd - 1) / phaseInc\n                    osc -= t * t + t + t + 1\n                }\n            }\n            this.oscHpState += oscHpAlpha * (osc - this.oscHpState)\n            osc -= this.oscHpState\n            this.megEnv *= this.megDecayCoeff\n            if (this.isAccented && this.gate) {\n                this.accentCap += accChargeAlpha * (this.megEnv * this.accentAmount - this.accentCap)\n            } else {\n                this.accentCap *= accDischargeMul\n            }\n            let targetCutoff = this.cutoffHz * Math.pow(2, envDepth * (this.megEnv - envOffset))\n            if (this.isAccented) {\n                targetCutoff *= Math.pow(2, this.accentAmount * this.megEnv * 2.5)\n            }\n            targetCutoff *= Math.pow(2, this.accentCap * 1.0)\n            if (targetCutoff < 60) targetCutoff = 60\n            if (targetCutoff > sr * 0.45) targetCutoff = sr * 0.45\n            this.cutoffSmoothed += (targetCutoff - this.cutoffSmoothed) * cutoffAlpha\n            const gf = Math.tan(PI * this.cutoffSmoothed / sr2)\n            const b0 = gf / (1 + gf)\n            for (let os = 0; os < 2; os++) {\n                const fbRaw = kFeedback * this.y4\n                this.fbHpState += fbHpAlpha * (fbRaw - this.fbHpState)\n                const fbHp = fbRaw - this.fbHpState\n                const y0 = Math.tanh(osc - fbHp)\n                this.y1 += 2 * b0 * (y0 - this.y1 + this.y2)\n                this.y1 = Math.tanh(this.y1)\n                this.y2 += b0 * (this.y1 - 2 * this.y2 + this.y3)\n                this.y2 = Math.tanh(this.y2)\n                this.y3 += b0 * (this.y2 - 2 * this.y3 + this.y4)\n                this.y3 = Math.tanh(this.y3)\n                this.y4 += b0 * (this.y3 - 2 * this.y4)\n                this.y4 = Math.tanh(this.y4)\n            }\n            let filtered = 2.5 * gComp * this.y4\n            this.postHpState += postHpAlpha * (filtered - this.postHpState)\n            filtered -= this.postHpState\n            if (this.gate) {\n                this.vcaGate += (1 - this.vcaGate) * gateAttack\n            } else {\n                this.vcaGate *= this.vcaGateCoeff\n            }\n            this.vcaDecay *= this.vcaDecayCoeff\n            let amp = this.vcaGate * this.vcaDecay\n            if (this.gate) {\n                amp += 0.45 * this.megEnv\n                if (this.isAccented) {\n                    amp += this.accentAmount * 4.0 * this.megEnv\n                }\n            }\n            this.ampSmoothed += (amp - this.ampSmoothed) * ampAlpha\n            const sample = Math.tanh(filtered * this.ampSmoothed) * this.volume\n            outL[s] += sample\n            outR[s] += sample\n            this.phase += phaseInc\n            if (this.phase >= 1) this.phase -= 1\n        }\n    }\n}"
const VOIX: any = {rate: 22050, cible: 110, mots: {
"danger": {f0: 109.73, n: 13677, b64:
"AAAAgICAgYGBgoKCg4ODhISEhIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhYSEhIODg4KCgoGBgYCAgH9/f35+fX19fXx8e3t7e3p6enp5eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5" +
"eXl5enp6e3t7e3x8fX19fX5+fn9/f4CAgIGBgoKCgoODg4SEhIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhoWFhYSEhIODg4KCgICAgYGBgoKCg4ODhISEhIWFhYaGhoaGh4eHh4eHh4eHh4eH" +
"h4eHh4eHh4eHh4aGhoaGhYWFhYSEhIODg4KCgoGBgICAgH9/f35+fX19fHx8e3t7e3p6enp5eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl5enp6e3t7e3x8fX19fn5+fn9/f4CAgIGBgoKCg4ODg4SEhIWF" +
"hYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhoWFhYSEhIODg4KCgICAgYGBgoKCg4ODhISEhYWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhYSEhIODg4KCgoGBgICAgH9/f35+" +
"fX19fHx8e3t7e3p6enp5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl6enp6e3t7e3x8fX19fn5+fn9/f4CAgIGBgoKCg4ODg4SEhIWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhYSE" +
"hIODg4KAgICAgYGBgoKCg4ODhISEhYWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhISEhIODg4KCgoGBgICAf39/f35+fX19fHx7e3t7e3p6enp5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4" +
"eHl5eXl6enp6e3t7e3x8fX19fn5+f39/gICAgIGBgoKCg4ODhISEhIWFhYaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhYSEhIODg4KAgICAgYGBgoKCg4ODhISEhYWFhYaGhoaGh4eHh4eHh4eH" +
"h4eHh4eHh4eHh4eHh4aGhoaGhYWFhISEhIODg4KCgoGBgICAf39/f35+fX19fHx7e3t7e3p6enp5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl6enp7e3t7e3x8fX19fn5+f39/gICAgIGBgoKCg4ODhISE" +
"hIWFhYaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhISEhIODg4KAgICBgYGBgoKCg4ODhISEhYWFhYaGhoaGh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4aGhoaGhYWFhISEg4ODg4KCgoGBgICAf39/" +
"fn5+fX19fHx7e3t7enp6enp5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5eXl6enp7e3t7e3x8fX19fn5+f39/gICAgYGBgoKCg4ODhISEhYWFhYaGhoaEhYeKi4uLiYiHhIOEhoeJi4uLioiHhYOCgoWGh4mJ" +
"iIaFg4F/f3+AgYOFhISDgYB/f4CBhYaIiYiHhYOCgoODhYiKi4uKiYaEhISEhYeJiouKiYeEg4KCg4SFiImJh4WDgH9/f4CBgoSFhIKAfnt7ent8fX6AgIB9e3l3dnd4eXp7fX18eXd2dHR1eHl6e3x7enh2dXR1" +
"dnl6fH19fHt5d3d3eHl9foCAgH9+fHt6e3x+goOEhYSDgoB/f4CCg4eIiYmIh4WDgoKEhYeKi4uLiYiHhIOEhoeJi4uLiIeFhIOCgoWGh4mJiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGUloeFg4qIhnp8f4KSlJWSgX13g4KEh3x+gIGOiYaDb25ugIOFiHt7eYF+" +
"e3dpa3CBhIaHhnZwbXl4eXx1eHqJiYiGc3BvfoCEi4CBgY2KiIWEdXh7jJOVh4WCf4qIh4d9f4OVlpWCf3x5d4WFin6BhIOPiYV0cnFxcoWIin18eYB9enlrbG50hYaGdnNtand3eHpwdnh6hoSBbmxsfoGEiH1/" +
"f3yIhYFyc3l8jZB5fH+CkI6JeHZ2d4iLj5KGh4WDi4iHenx/gpOVloaDgHqGhYZ7fYCCg5GNinhycXGChId8fX18hIF+a1xeaW+Ch4VzbWdhXGptc3R6fn+KhX96d2hvdouZnZ+LhoB7hYWHkYqQmJijlpCKd3Z3" +
"epOYnI2JgnN7dnV2eXB7fn+GgHleW1pcb3V8hXl4bmhxa2xwcHd+gpKRjoRxbW+BiJedk5SSjomLh4Z+hIqVpaWinJWAdXOCio+Ui4mFf4V9d3BkZ3J3iYiEfml5gIeNmpaMh3V2eoCVnaKllZCKfYeGioGHkZKf" +
"m5WOhm1ra4KHjJCAfHZuZ29qa2Juc3eFgnx2Yl1bX3J5h4yAfXhzfHh3eHV8hJ2fnpWBfHh3eIqXnaOYlZCYjoeEhXV8i5Cmm5GFWlRSWXd/houMc2JZT1xdZGRueH2AfYx9d3NkbXilrbGxrZGIeHV2l6CqoaGd" +
"lYmTiHt7aniAhZmTiX1xU0xMUnCCiIptZVxUY2Bjc352h4mIkIiBaW11gIuqs7ezlYJ6dXWAi5KVk6OTjId1fIavtrm4s5WKdnBuipKaj4+LgneAdGZmVWNsc4uGfnVrTUhLUnKIkJV9dm5ndnR2h5KJm52cpJuS" +
"dXd8hY6ss7SvpXlwaHuAh4+WhYV5b3hkX19UXWdvdIqHeG9STVBYhI+YnouIgXJsfoWOmZqgo6HjzriTi2qFl6fUzLighEcxIio5gI6ThE44FA0zQFZwi46TkHRjeXeEmbKpv87N4cygkYt3iJmpsdTJnIFDJCMr" +
"cIKPlI+CSyITDUJZc26JobC2ssmllY51hpzF0PPq17+kVk5OZ5upsaeUPiYUDDA8T3uLcWhXRkxIUGB5cIyxtrG1o5WPd4mftcfz6NW7ZlZNWWmcq7KxpVU8JAsyPmh9jXFwZlYzS0lje3SlsravxbOijY94orfI" +
"8ubSnmRUTlBbaquzr2xTOBELMkBUan9yb2VCMUpTZX93kqazr8Oxko2RjqS5yfTx5LWcYU1RXKCtsq+halAfEAtCV2yPcm9jUj9TSlRoepSptq3BnpGNbnyQpsv08G6JobayybellY51hpzF0PPXv6RpVk5OZ5up" +
"saeUPiYUDDA8T3uLcWhXRkxIUGB5cIyxtrG1o5WPd4mftcfz6NW7ZlZNWWmcsrGlklU8JAsyPmh9jXBmVkMzS0lje3SlsrbFs6KTjY94orfI8ubSnmRUTlBbaquzr2xTOBELMkBUan9yb2VCMUpTZX93kqazr8Ox" +
"ko2RjqS59PHk0LWcYU1RXKCtsqFqUDYfEAtCV2yPcm9SP1NKSlRoepSptq3BnpGNbnyQpsv08G6JobayybellY51hpzF0PPXv6RpVk5OZ5upsaeUPiYUMDxPZXuLcWhXRkxIUHlwjKKxtrG1o5WPd4m1x/Pz6NW7" +
"ZlZNWWmcsrGlklU8JAsyPmh9jXBmVkMzS0lje3SlsrbFs6KTjY94orfI8ubSnmRUUFtqnquzr2xTOBELMlRqf45yb2VCMUpTZX+SprO2r8Oxko2RjqS59PHk0LWcYU1RXKCtsqFqUDYfEAtCV2yPcm9SP1NKSlRo" +
"epSptq3BnpGNfJCmvMv08G6JobayyaWVjo51hpzF0PPXv6RWTk5YZ5upsaeUPiYUMDxPZXuLcWhXRkxIUHlwjKKxtrG1o5WPd4m1x/Pz6NW7ZlZNWWmcsrGlVTwkEwsyPmh9jXBmVjNLSVFje3SlsrbFs6KNj3iL" +
"orfI8ubSnmRUUFtqnquzr2xTOBELMlRqf45yb2VCMUpTZX+SprO2r8Oxko2RjqS59PHktZxhU01RXKCtsqFqUB8QCzRCV2yPcm9SP1NKVGiBepSptq3BnpGNfJCmvMv08G6JobayyaWVjo51hpzF0PPXv6RWTk5Y" +
"Z5upsaeUPiYUMDxPe4txcGhXRkxIUHlwjLG2sce1o5WPd4m1x/Po1buhZlZNWWmcsrGlVTwkEwsyPmh9jXBmVjNLSVFje3SlsrbFs6KNj3iLorfI8ubSnmRUUFtqq7OvpGxTOBELMlRqf3JvZVNCMUpTZX+SprOv" +
"w7Gfko2RjqS59PHktZxhU01RXKCtsqFqUB8QCzRCV2yPcm9SP1NKVGiBepSptq3BnpGNfJCmy/Tw426JobayyaWVjnWGnLLF0PPXv6RWTk5nm6mysaeUPiYUMDxPe4txcGhXRkxIUHlwjLG2sce1o5WPd4m1x/Po" +
"1buhZlZNWWmcsrGlVTwkCzI+Umh9jXBmVjNLSWN7dI+lsrbFs6KNj3iit8j08ubSnmRUUFtqq7OvpGxTOBELMlRqf3JvZVNCMUpTZX+SprOvw7Gfko2RjqS59PHktZxhTVFcbaCtsqFqUB8QC0JXbIGPcm9SP1NK" +
"VGh6lKmztq3BnpGNfJCmy/Tw426JobayyaWVjnWGnLLF0PPXv6RWTk5nm6mysaeUPiYUMDxPe4txaFdGNExIUHlwjLG2sbWjlY2Pd4m1x/Po1btmVk1QWWmcsrGlVTwkCzI+Umh9jXBmVjNLSWN7dI+lsrbFs6KN" +
"j3iit8j08ubSnmRUUFtqq7OvbFM4IhELMlRqf3JvZUIxSklTZX+SprOvw7GSjZF6jqS59PHktZxhTVFcbaCtsqFqUB8QC0JXbIGPcm9SP1NKVGh6lKmztq3BnpGNfJCmy/TwbomhsLayyaWVjnWGnMXQ8+rXv6RW" +
"Tk5nm6mxp5RZPiYUMDxPe4txaFdGNExIUHlwjLG2sbWjlY2Pd4m1x/Po1btmVk1QWWmcsrGlVTwkCzI+aH2NcXBmVjNLSWN7dKWytq/Fs6KNj3iit8jy5tK4nmRUUFtqq7OvbFM4IhELMlRqf3JvZUIxSklTZX+S" +
"prOvw7GSjZF6jqS59PHktZxhTVFcoK2yr6FqUB8QC0JXbI9yb2NSP1NKVGh6lKm2rcGvnpGNfJCmy/TwbomhsLayyaWVjnWGnMXQ8+rXv6RWTk5nm6mxp5RZPiYUMDxPe4txaFdGTEhQYHlwjLG2sbWjlY93iZ+1" +
"x/Po1btmVk1ZaZyrsrGlVTwkCzI+aH2NcXBmVjNLSWN7dKWytq/Fs6KNj3iit8jy5tK4nmRUUFtqq7OvbFM4EQsyQFRqf3JvZUIxSlNlf3eSprOvw7GSjZGOpLnJ9PHktZxhTVFcoK2yr6FqUB8QC0JXbI9yb2NS" +
"P1NJUmR1jqOzrcKwn5KLdoifx/T1boiftrLJt6aXjXKCl8LO9d/JsXVhVVNnmqq6tKZSOSMUMjdFboBqal5LSkA+RllNaJikqLioloRkcIScsun38N+Nd2dgaZytvMXHiXJXJz47UWN3bW5lVEBQPzZAMGR8j721" +
"ppWGfFZuhJzr9fbaoot3amdsrb3Mr6SQW0JSSEdPX2BscmBOWzYvMRouR2CHsa6ThHVMVmmCv9bo8Oawhndtmai82766rJV7YVpTVW9dbXdwgmxVQDEMGS5fcqGfkoFNQTxAZaG7boiftrLJt6aXjXKCl8LO9d/J" +
"sXVhVVNnmqq6tINSOSMUMjdFboBqal5LSkA+WU1ogpikqLiolmFkcJyy6fX38N+Nd2dgjJy8xceciXJXSj47UWNUbW5lVGNQPzYdMGR8j721ppVjWVZuhL/r9fa3oot3aoqPrb3Mr6SQW2VSR088TmBscoNxWzYM" +
"Di5HYJqqsa6TYVJMVoy/1ujxzcOwhneQmai8uL66rJWehFpTMkxdbZqTgmxVQA4MGS6ClaGfb15NQTxAiKG7boiftrLJppeNjHKCl8Lx9d/JsWFVU1pnmqq6tINSOSMyN0VZboBqal5LSkA+WFFofpGdvrGklmpr" +
"dZis2+fs6d6dinpvj5u2wMWlmohyYVJJUFxPaG1qbFpIOzMXIUVbb6KinGdbUlFYZpbC1ODDuKeHmJWZo7LCvsC6tJ6HZ2JIUV9rd5iPf1YoGRYgMF9ygYuJYlQ7NlVxhp6zqLKzoK6gkJOdpLXFzuLSv6mVamFn" +
"c6iwsp+LWEIvIx5JV2iCamZMPEk/O0FOcoicsK7BpZmQj3qGmb3l693Nt3RoY2Vvl6W2tI9oUjw+PERQYHBiaWJUUEI6QzZMeImvsqyilGJfZIGWyObq5r6tm4l2kpq2w82vo494fWlbVVxOaXFye2pWRDYTFS9D" +
"WJOYlmRYTEVGT3unvc+/uq6OnpaWnaq7vsfHzbmjfHFSYW57haShlG08KRcaJGJzgYiHY1Y5L0dXaoGQn6enn6+hi4qQk6a50Ovi07+sfWpsdau3vrandV9INipIUmJ+ampWRlBBNzU7coicsK7BpZmQeoaZq73l" +
"693Nt3RoY2+XpbC2tI9oUjw+PERgcGJpaWJUUEI6QzZMeImvsqyilGJfZIGWyObq5r6tm4l2kpq2w82vo494fWlbVVxOaXFye2pWNhMVHy9DWJOYlmRYTEZPe5Cnvc+/ua+Pnpabp7esvMfL1cSvhntZY3B9pKur" +
"o4BPOh0cPVlqeIJqZls8Lj9BTWBxg5GYl6qehX1hdYec3ufq16qYiHt2eKu6x9S0p31ocGFaW2JfbXVyg3JKOzETcoear63BppiQd4KTprnj6+LUwX5xaY2ZprK7v519Z1FKRUZcT11nbGlfWUg7GCAwWm2YopyR" +
"aFtRT2CNo83axbusnIyclpetvbHFxbuynYh4bVBVbHqfn5WEPSseFxk+TXF+hmVYSi9ERU1ecm2UnqGvoZSEanOCl6q97OnfoI5/cnecucXLrqWWglRgVFRfbGpxcWp3ZVI1LxYxRVmSlpSLflRJQ0l0oLXIu7et" +
"n4+ClZmltrzIzL7KtaCMf11mc4CvsKmGVT8tcoear63BppiQd4KTuePr6+LUwX5xaY2Zpru/nZB9Z1FKRUZcT11saV9sWUg7GCAwWm2YopyRaFtRT2CNo83axbusnIyclpetvbHFxbuynYh4bVBVbHqfn5WEPSse" +
"GT5NXnF+hmVYSi9ERV5ybYKUnqGvoZSEanOXqr3m7OnfoI5/cnecucXLrqWWglRgVFRfbGpxcWp3ZVI1LxYxRVmSlpSLflRJQ0l0oLXIu7etkoecm5+otrbBxbzMu5qOa2pud4CtsKyTZlJyhJSfpqW8p5yWe4SS" +
"sdri5ODVx4t/d5Sdp7q/oJmKemZhWFReTlhoaH50ZldIGxwjQGx8jY2IWE5HRWZvf6S0pq+qoaadmZqhkaC7xOPWyLd8c25wdpymtLWudWNQUUxOVV9rWmViWVpMQDojMD9QYYuVkYpaUk9Zg5WnucfQs6qfpJ2c" +
"qreqwMXC1si3pYlnZnR+o6yonY5fTTwqRkxjb3lhW1FDUUY+QkxBZHJ9nJWMgnlYWWx8qszV2bOnmo6FnZ+ywM2/v7dyhJSfpqW8p5yWe4SSsdri4NXHm4t/d5Sdp7q/oIp6ZnFhWFReTlhoaH5mV0g9GxwjQGx8" +
"jY2IWE5HRWZvf6S0pq+qoaadmZqhkaC7xOPWyLd8c25wdpymtLWudWNQUUxOX2taYmViWVpMQDojMFBhi5KVkYpaUk9Zg5W5x9C2s6qfpJ2cqreqwMXC1si3pYlnZnR+o6yonY5fTTwqRkxjb3lhW1FDUUY+QkxB" +
"ZHJ9nJWMeVhZX2x8qszV2bOnmoWdn6eywM2/v7dyhJSmpbyyp5yWe4SSsdri4NXHm4t/d5Sdp7q/oIp6ZnFhWFReTlhoaH5mV0g9GxwjQGx8jY2IWE5HZm9/kaS0pq+qoaadmaGRoK67xOPWyLd8c252nKawtLWu" +
"dWNQUUxOX2taYmViWVpMQDojMFBhi5KVkYpaUk9Zg5W5x9C2s6qfpJ2cqreqwMXCyLellolnZnR+o6yonV9NPDAqRkxjb3lhW1FRRj49QkxBZHJ9nJWMeVhZX2x8qszV2bOnmoWdn6eywM2/v7dyhJSmpbyyp5yW" +
"e4SSsdri4NXHi393dZSdp7q/oIp6ZmFYVFdeTlhoaH5mV0gbHCMwQGx8jY2IWE5HZm9/kaS0pq+qoaadmaGRoK67xOPWyLd8c252nKawtLWudWNQUUxOX2taZWJZaVpMQDojMFBhi5WRioBaUk9Zg5W5x9Czqp+S" +
"pJ2cqreqwMXCyLellolnZnR+o6yonV9NPDAqRkxjb3lhW1FRRj49QkxBZHJ9nJWMeVhZbHyqvMzV2bOnmoWdn7LAzbu/v7dyhJSmpbynnJaUe4SSsdri4NXHi393dZSdp7q/oIp6ZmFYVFdeTlhoaH5mV0gbHCMw" +
"QGx8jY2IWE5HZm9/pLSmra+qoaadmaGRoLvE4+DWyLd8c252nKa0ta6GdWNQUUxOX2taZWJZaWJWSysuNE1wfIyNdW5lXVVkaXJ4h5Wnvru0qqCDe36Fsb7JwL+4oamdk46Ne4yVnbi0q3prXVJLXmFxem50cWlm" +
"WExEKysxR2l0goJpWE5GVVRYYWh3hZetq5uTdXBvc3t1hJGhorOimZF3d3uEsr/L1b63oJOdkZKXipSdpb65r5JuYVFRaXF6gop5dGtmWE1BLTQ+SVZ1gH95UUc+T1Rdanp0gZGRopKJgmpveYWpt8PQurSglJ+W" +
"mJ6Snaiwy8e9on5xYmF6ipOaiYiDeXJjV0k0Ok1Ydnx+fHVKPzZESFFrZXF7gIGSgXt0YGFlg42XoJqdnqagmYx7eoKJoKmyuK6tqKGel5F/gYeOo6qwtKSejJGHeXdqc3mAlJeZl3xzaWVfW1BVXGR5gouXpqSa" +
"k352dYaLlJ2mqKyuta+miYOBgYSXn66mqqijqpaNhnJwcXSOlZuRkIuHfnRsZVNTW2F3goV3bWZdWVRQUEVKUnF4foBuaFphW1hZXFRncXqUlpR8dm9pdXR3d4CKnK+yraiTi4WAjJCWnqKorb25sqqTioN8i4+c" +
"lJuhoKqjmZCGaGRjeH6FgoSEiIB3bWNPSkpOY3J5b3BsZmxkXFVCRElpcHaAg4OBfXhzZ2NhY2ZseoCHi46OjYR/eXBubnR5gIeAho2WlpaOiYN5dnZ2en+Gk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KL" +
"kZegoqKblo+IgXx4dnh8h42Rl5aUj4mCe25raWtvdICEiIqJh4J1bmdeXV1kanB2e3+Bfnp0Z2FcWFlcZ210en6AgXt2cGRgXV5iZ251e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8eHZ2eIGHj5ufoqCcl5GLhoJ+" +
"gISPlZylp6akoJqUh4J/gIOHk5meo6KempONhnp3dnl+g4CGjZKWlpaOiYN5dnZ6f4aMk5meo6Gek42HgH5/goeNlKCkpqWhnI+JhIB+f4KLkZegoqKblo+IgXx4dnh8h42Rl5aUiYJ7dG5raWtvdICEiImHgnx1" +
"bmdeXV1kanB7f4GAfnp0Z2FcWFlcZ210en6AgXt2cGRgXV5iZ251e4KJiYiAenRraWlqbnR7iY+Ul5WRh4F8dnZ4e4GHj5ufoqCcl4uGgn9+gISPlZylp6agmpSNh4J/gIOHk5meo6KempONhnp3dnl+g4CGjZKW" +
"lpaOiYN5dnZ6f4aMk5meo6Gek42HgH5/h42UmqCkpqWhnI+JhH5/goaLkZegoqKblo+BfHh2dnh8h42Rl5aUiYJ7dG5raWtvdICEiImHgnx1bmdeXV1kanB7f4GAfnp0Z2FcWFlcZ210foCBf3t2cGRgXV5iZ3V7" +
"goaJiYiAenRraWludHuBiY+Ul5WRh4F8dnZ4e4GHj5ufoqCcl4uGgn9+gISPlZylp6agmpSNh4J/gIOHk5meo6Kek42GgHp3dnl+g4CGjZaWlpOOiYN5dnZ6f4aTmZ6ho6Gek42HgH5/h42UmqCkpqWhnI+JhH5/" +
"goaLkZegoqKblo+BfHh2dnh8h42Rl5aUiYJ7bmtpaWtvdICEiImHgnVuZ2JeXV1kanB7f4F+enRuZ2FcWFlcZ210foCBf3t2cGRgXV5iZ3V7goaJiYiAenRraWludHuBiY+Ul5WRh4F8dnZ4gYePlZufoqCcl4uG" +
"gn6AhImPlZylp6agmpSHgn9+gIOHk5meo6Kek42GgHp3dnl+g4CGjZaWlpOOiYN5dnZ6f4aTmZ6ho6Gek42HgH5/h42UoKSmp6WhnI+JhH5/gouRl5ygoqKblo+BfHh2eHyBh42Rl5aUiYJ7bmtpaWtvdICEiImH" +
"gnVuZ2JeXV1kanB7f4F+enRuZ2FcWFlcZ210foCBe3ZwamRgXV5iZ3V7gomJiISAenRraWludHuJj5SWl5WRh4F8dnZ4gYePlZufoqCcl4uGgn6AhImPlZylp6agmpSHgn9+gIOHk5meo6Kek42Gend2dnl+g4CG" +
"jZaWlo6Jg355dnZ6f4aTmZ6joZ6Zk42HgH5/h42UoKSmp6WhnI+JhH5/gouRl5ygoqKblo+BfHh2eHyBh42Rl5aUiYJ7bmtpa290eoCEiImHgnVuZ15dXWBkanB7f4F+enRnYVxZWFlcZ210foCBe3ZwamRgXV5i" +
"Z3V7gomJiIR+enZycXN5foOKjI2LiYWBe3l4fICFjpGTko+MiISBf3+BhY2SlZeWk4+Lh4OAgIKJjZGWlpWSjomFfn19gYWJkJGRkI2JhICEiI2NjIWBfnt5eXuChouSk5SPi4eEgH9+goaKk5WXlZKOhoKAf4CD" +
"ho6SlZaUkYiEgH18fX6FiY2RkY6Hgn56d3Z2e36CiIqJhIB7d3NwbnBzd3+Bg4F+enZxbWtpa252en6Afnx4dG9saGhqcnZ7gIGAenZyb2xrbHF2eoOFhoOAfHh1c3J1eHyGiYyNi4iEgHx6eXt/iIyQlJORjoqG" +
"g4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4OCgoKCgoKBgYGBgYCAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgYGAgICAgIB/f39/f35+fn5+" +
"fn19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fH19fX19fX1+fn5+fn5/f39/f3+AgICAgIGBgYGBgYGCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4OCgoKCgoKBgYGB" +
"gYCAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgYGAgICAgIB/f39/f35+fn5+fn19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8" +
"fX19fX19fX1+fn5+fn9/f39/f3+AgICAgIGBgYGBgYGCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4OCgoKCgoKBgYGBgICAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4OD" +
"g4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgYGAgICAgIB/f39/f35+fn5+fX19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fX19fX19fX1+fn5+fn9/f39/f3+AgICAgIGBgYGBgYGCgoKCgoKD" +
"g4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgICAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgYGAgICAgH9/f39/f35+" +
"fn5+fX19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fX19fX19fX1+fn5+fn9/f39/f4CAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKB" +
"gYGBgICAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgYGAgICAgH9/f39/f35+fn5+fX19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8" +
"fHx8fX19fX19fX1+fn5+fn9/f39/f4CAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgICAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4OD" +
"g4ODg4ODg4ODg4ODg4ODg4KCgoKCgoGBgYGBgYGAgICAgH9/f39/f35+fn5+fX19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fX19fX19fX5+fn5+fn9/f39/f4CAgICAgIGBgYGBgYKCgoKC" +
"goKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoKBgYGBgICAgICAgYGBgYGBgYKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoGBgYGBgYGAgICAgH9/f39/" +
"f35+fn5+fX19fX19fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fX19fX19fX5+fn5+fn9/f39/f4CAgICAgIGBgYGBgYKCgoKCgoKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKC" +
"goGBgYGBgICAgICAgYGBgYGBgYKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgoGBgYGBgYCAgICAgH9/f39/fn5+fn5+fX19fX19fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8" +
"fHx8fHx8fX19fX19fX5+fn5+fn9/f39/f4CAgICAgYGBgYGBgYKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoGBgYGBgICAgICAgYGBgYGBgoKCgoKCgoODg4ODg4ODg4ODg4OD" +
"g4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgoGBgYGBgYCAgICAgH9/f39/fn5+fn5+fX19fX19fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fX19fX19fX5+fn5+fn9/f39/f4CAgICAgYGBgYGBgYKC" +
"goKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4KCgoKCgoGBgYGBgICAgICAgYGBgYGBgoKCgoKCgpSRkJCVm6Grq6mfk5CQlKGsrq6kn5qUlpicpqOmop2elJKUl5Wanp6inJCMg4eMkZucm5eD" +
"fnl4goePkIiEfXdxcnN3eXx9d3hybGhmYWlucXh0bltXV1hcaG1ycWZaVVJaX2RqbmhnXllbWFtfZGhqbmljX11WWWVqdnh1cGBeX2BgYGBgoKCgoKBgYGBgYGCgoKCgoGBgYGBgoKCgoGBgYGBgYGBgfIKHi4iL" +
"g4CAgoiOnp6blpKHhIiMmqWnp5mUj4yUlpunpKainZ+Xl5mXnKKmraqkmY+OlZqmqqqppZKMiYqVmqKimZWOiIOFh4uNkJCJioN+enl0fIGEiIR9amdmbHd8f399cWRfXGRpbW5ubGhiY15bXVtlaGlqZF5aWFFU" +
"X2RubmplVFNTV2Rpb3RsaF5aYGZrcWBgoKCgoGBgYGBgYGBgoKCgoGBgYGBgoKCgoGBgoGBgYGBgYGB8goeKi4iLg4CAgoiOnp6blpKHhIiMmqWnp5mUj4yUlpunpKainZ+Xl5mXnKKmraqkmY+OlZqmqqmlmJKM" +
"iYqVmqKimY6Ig4aFh4uNkJCJioN6eXR4fIGEiIR9amdmbHd8f399cWRfXGRpbW5ubGhiY15bXVtlaGlqZF5aWFFUX2RubmplVFNTZGlvc3RsaF5aYGZrcWBgoKCgoGBgYGCgoKCgoGBgYGBgYKCgoKCgoKBgYGCg" +
"oKCgoKB8goeKi4iLg4CAgoiOnp6blpKHhIiMmqWnp5mUj5SWm6GnpKainZ+Xl5mcoqanraqkmY+OlZqmqqmlmJKMiYqVmqKimY6Ig4aFh4uNkJCJioN6eXR4fIGEiIR9amdmbHd8f399cWRfXGRpbW5ubGJjXltb" +
"XVtlaGlqZF5YUVRZX2RubmplVFNTZGlvc3RsaF5aYGZrcaCgYGBgYGBgoKBgYGBgYGBgoKCgoGBgYGBgYKCgoKCgYGBgYGB8goeLiIuGg4CAgoiOnp6bkoeEhIiMmqWnp5mUj5SWm6GnpKainZ+Xl5mcoqanraqk" +
"mY+OlZqmqqmlmJKMiYqVmqKimY6Ig4WHi5CNkJCJioN6eXR8gYSLiIR9amdmbHd8f31xa2RfXGRpbW5ubGJjXltbXVtlaGlqZF5cTU9TWF5jdXVyXFhWWF1wd32ChHVybml3eYSKg4uMi4iSj4yNg4iVmp2rp6Of" +
"m4uLkpeqsbKwmZOOi4qYm6OnqZmUj5CLiYiKjYOIiIZ5f4WKipWSjouKgIWLl6mrp6OfjYuKjKOprrKxoJWQjJmbn6OnnJ2XkouOi4qAhIeKiomTh4B6Z2dqcYKDgn96ZlpWVGZqbnR1ZWFcVlJbXGBqYWVmZG5q" +
"ZmNiWl9mcYKDf3t4Z2dobHmNk5iYh4B9fI6TmaClm52ZlZGZmJqVm6CjpKOuo56ai42RmaqrqaWgmYB9fI6SlZiXhX95cmpta2txdmxwb2tlX2ZgWFhaVlxja3p4dXFsaFZYXGpyiJOVlIF8eXd3eIp5gIeRkZCX" +
"ko+NjYKHlZuhtbSxppKNiYeHiqGmqquplYZ/d3F8fH2EiH19enVmbWZgXl5gW2FlaXZyZ2JdTExOUmBnfISEg25qZ2ZpfYSNlJuXl5WOiYWRk5iepZ2jqKejpZ+ZkoWHi4+Ul6ajno6HcWhoaWx+goWGg3BhWlRM" +
"W15iaG1yaWhlW2NfXV9kXWVsc3x8iYJ+e2xvdYWMoaeqqqiSjYmGiIymrLG1tqailY+Ij4+RmI+Sk5KPioqBd2llY1leYmdrbnx5gYqWmZqinZmUkZCQipCWo6e3tbCpoZiCenFwcISJjJCPi3FpYFhQS1ZXXGFv" +
"Z2xvbmtnYmtoZmhtbneAkJWZp6ainpWRgoSJj5ywtbe4tbGUi4N1cm+AhIiMjpCBeXJqWV9aVVdbYFlgZm5vb3ZxbGZlaGVsdn+Ij6OopqOah4SChIiOoqmvt7i2nZWMfHaAfn6Ag4uBgn56c2JoYFtXVVdSWF9q" +
"bm96dnJtaWZXXWNsfpSdpqeno5KMiIKChJuhqLO3qqSelo55gYqWmZqinZmRkJCFipCWo6e3x8K5opZ0aV5XUU9SVnd9goiHhGpjW1NFQD5XXWd/i5mPmaGmp6OepZ2Xjo6Pk4OKkJygobCpn4h7bkQ+OTk7QEZX" +
"dX6Ji4uFamVfW1dXXXiCmaWxxLS3trOspJCGkYOAfoOIeH2BhYaAe4dyZ1xMSDI0OUFLYm14naGjn5qVenZycHR5gKewucbJyaqhlol9cGVpZWNobXNqb3JzcW5obWZeVFNUTFVhbnuHk6O8vbexqpuAe3l1gY6h" +
"p6qntrChmZOPjXl7hoySnLSyqaGWin1wTz05Nz1DYXN7g4yNd3NvaWRbWW95gYujr7qttLe3r6ednJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpaWiiYR/dXJyjZObrra+xMezsKKXi3F7cWRiYWlaYGds" +
"cHJvf3hpYlxVVUVLVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZG1haXB1eHZyfXdzbnB0e296hp6nsM3MyLmupHWBjpihp6qntrChmZONeXuAhoySnLSyqaGWfXBPRT05Nz1DYXN7g4yNd3Nv" +
"aWRbWW95gYujr7qttLe3r6ednJOJfnx8am50eIGEg4+If2lfVTQyNDg/SVSBjJajpaWJhH95dXJyjZObrra+x7Owq6KXi3F7cWRiYWlaYGdscHJvf3hpYlxVVUVLVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrYh9" +
"cGRXTEJNTE9bZG1pcHV4eHZyfXdzbnB0b3qGkp6nsM3MyLmupHWBjpihp6qntrChmZONeXuAhoySnLSyqaGWfXBPRT05Nz1DYXN7g4yNd29pZF9bWW95gYujr7q0t7e0r6ednJOJfnx8bnR4foGEg4+If2lfVTQy" +
"NDg/SVSBjJajpaWJhH95dXJyjZObrra+x7Owq6KXi3F7cWRiYWlaYGxwcnFvf3hpYlxVVUVVYGx5hpGxvb++tK2Rgn15eHl9l6OqrrOyrYh9cGRXTEJNTE9bZG1pcHV4eHZyfXdzbnB0b3qGkp6nsM3MyLmupHWB" +
"jqGnqqmntrChmZONeXuGjJKYnLSyqaGWfXBPPTk3OD1DYXN7g4yNd29pZF9bWW95gYujr7q0t7e0r6ednJOJfnx8bnR4foGEg4+If2lfVTQyND9JVGCBjJajpaWJhH91cnJ0jZObrra+x7OwopeLf3F7cWRiYWla" +
"YGxwcnFvf3hpYlxVVUVVYGx5hpGxvb++tK2Rgn15eHl9l6OqrrOyrYh9cFdMQlFNTE9bZG1pcHV4dnJtfXdzbnB0b3qGnqewtc3MyLmupHWBjqGnqqmntrChmZONeXuGjJKYnLSyqaGWfXBPPTk3OD1DYXN7g4yN" +
"d29pZFtZb3J5gYujr7q0t7evp52onJOJfnx8bnR4gYSDlY+If2lfVTQyND9JVGCBjJajpaWJhH91cnJ0jZObrra+x7OwopeLf3F7cWRiYWlaYGxwcm9/eHFpYlxVVUVVYGyGkbG4vb++tK2Rgn15eX2XnaOqrrOy" +
"rYh9cFdMQlFNTE9bZG1pcHV4dnJtfXdzbnB0b3qGnqewtc3MyLmupHWBjqGnqqe2sKihmZONeXuGjJKctLKvqaGWfXBPPTk3PUNhanN7g4yNd29pZFtZb3J5gYujr7q0t7evp52onJOJfnx8bnR4gYSDlY+If2lf" +
"VTQyND9JVIGMlp2jpaWJhH91cnKNk5ukrra+x7OwopeLcXtxaWRiYWlaYGxwcm9/eHFpYlxVVUVVYGyGkbG4vb++tK2Rgn15eX2XnaOqrrOyrYh9cFdMQk1MT1RbZG1pcHV4dnJ9d3NvbnB0b3qGnqewzczIwbmu" +
"pHWBjqGnqqe2sKihmZONeXuGjJKctLKvqaGWfXBPPTk3PUNhanN7g4yNd29pZFtZb3mBi5ejr7q0t7evp52ck4mDfnx8bnR4gYSDj4h/dGlfVTQyND9JVIGMlp2jpaWJhH91cnKNk5ukrra+x7OwopeLcXtxaWRi" +
"YWlaYGxwcm9/eGliXFdVVUVVYGyGkbG9v766tK2Rgn15eX2Xo6qus7OyrYh9cFdMQk1MT1RbZG1pcHV4dnJ9d3NvbnB0b3qGnqewzczIwbmupHWBjqGnqqe2sKGZk4+NeXuGjJKctLKpoZaKfXBPPTk3PUNhc3uD" +
"iIyNd29pZFtZb3mBi5ejr7q0t7evp52ck4mDfnx8bnR4gYSDj4h/dGlfVTQyND9JVIGMlqOlpaKJhH91cnKNk5uutr7Ex7OwopeLcXtxZGJhZWlaYGxwcm9/eGliXFdVVUVVYGyGkbG9v766tK2Rgn15eX2Xo6qu" +
"s7OyrYh9cFdMQk1MT1tkbWFpcHV4dnJ9d3NucHR7b3qGnqewzczIua6kmXWBjqGnqqe2sKGZk4+NeXuGjJKctLKpoZaKfXBPPTk3PUNhc3uDiIyNd29pZFtZb3mBi6Ovuq20t7evp52ck4l+fHxqbnR4gYSD"},
"letsgo": {f0: 109.74, n: 14218, b64:
"AAAAfIKJlaGmrrGsrq60s7GvrJ+cmZqYlouKiIiHjYyKioF+fH95dXFlYV1YVlNQRENDRU5RVFleXWlufYmOlJaZnZ+oqaqjoqGepKKfn5eWlpWcnZ2dlZWTl5WSg396dW9xa2BbT0dFSUdISURHSk9gZWtvdHqD" +
"jpKUl5GTlZWdnZyclpaXnp+hop6goaOqqqignZqWkpSJhH1pY11ZVVFPRURDRE1QVlNYYWVxeXx/e35/gYqLjIeHiIuTlpealpmfoqyxs7SurqyxfIKJlaGmrrGsrq60s7GvrJ+cmZqYlouKiIiHjYyKioF+fH95" +
"dXFlYV1YVlNQRENDRU5RWV5dYmlufYmOlJaZnaipqqqjoqGepKKfn5eWlZydnZ2dlZWTl5WSg396dW9xa2BbT0dFSUdISURHSk9gZWtvdHqDjpKUl5GTlZWdnZyclpaXn6GipJ6goaOqqqignZaSlI+JhH1pY11Z" +
"VVFFRENDRE1QVlNYYWVxeXx/e35/gYqLjIeHiIuTlpealpmfoqyxs7SurqyxfIKJlaGmrrGsrq60sa+sop+cmZqYlouKiIeNjIuKioF+fH95dXFhXVhUVlNQRENDRU5RWV5dYmlufYmOlJaZnaipqqqjoqGepKKf" +
"n5eWlZydnZ2dlZWTl5WSg396b3FrZmBbT0dFSUdISUdKT1NgZWtvdHqDjpKXkZOUlZWdnZyclpaXn6GipJ6goaOqqqignZaSlI+JhH1pY11ZVVFFRENDRE1QVlNYYWVxeXx/fn+BiYqLjIeHiIuTlpqWmZyfoqyx" +
"s7Surqx8gomOlaGmrrGsrq60sa+sop+cmZqYlouKiIeNjIuKioF+fH95dXFhXVhUVlNQRENDRU5RWV5daW59gomOlJaZnaipqqOioaCepKKfn5eWlZydnZ2WlZWTl5WSg396b3FrZmBbT0dFSUdISUdKT1NgZWtv" +
"dHqDjpKXkZOUlZWdnZyclpaXn6GinqChoqOqqqignZaSlImEfXBpY11ZVVFFRENETVBTVlNYYWVxeXx/fn+BiYqLjIeHiIuTlpqWmZyfoqyxs7Surqx8gomOlaGmrrGsrq60sa+sn5yZlpqYlouKiIeNjIqKgYB+" +
"fH95dXFhXVhWU1BNRENDRU5RWV5daW59gomOlJaZnaipqqOioaCepKKfn5eWlZydnZ2WlZWTl5WSg396b3FrYFtPS0dFSUdISUdKT2Bla3BvdHqDjpKXkZOVlZ2cnZyclpaXn6GinqChoqOqqqignZaSlImEfXBp" +
"Y11ZVVFFRENETVBTVlNYYWVxeXx/fn+BiouMjIeHiIuTlpqWmZ+irK6xs7Surqx8gomVoaaqrrGsrq60sa+sn5yZlpqYlouKiIeNjIqKgYB+fH95dXFhXVhWU1BNRENDRU5RWV5daW59iY6UkZaZnaipqqOioZ6k" +
"oqGfn5eWlZydnZ2VlZOSl5WSg396b3FrYFtPS0dFSUdISUdKT2Bla3BvdHqDjpKXkZOVlZ2cnZyclpaXn6GinqCho6qqqqignZaSlImEfWljXV9ZVVFFRENAUlZgZVxhZml7f39/cG9vfHx+gIN5foqQpbK4r7a3" +
"uMXCv7qgm5R5gIiXqq+ytbappqOhqKWikI+PnqChpKWZmZmYo5uWkHNrY1xiXFdBPz5BUVVeY1peY2Zpenp7a2pqd3Z4en1zeISKoK60urS2uMXDwb2kn5mMlI+HhXR0c3R0hIWEdXNwdnFsYE1HQz88SUpMQk1T" +
"Wnd+hYuDh4uPnZ6cmoyKiZiZm56hm5+jubu9va2qpqCaoJCJc2RfWmFgXl9SVFZba21vYWBcWmZjYV5dTk9RaG1zgnyElKius7e5rayqp66qpoyKioqMnaB5goydorS3taWhnZiUnJqakJSYoLK0tbSyoJGJf3lw" +
"ZktIRkZHWV1ma2BlZWRsaGRgUE1MUGJpeoSAlJyjuru7uaijnpWfnJqbj5Wana6vsK+Yk4t3fHFfWUZCQUJFW2BmYWRmZnFva2hkU1JTV3F4goiRm6OqvL+/u6mfmZSamJiYjI+SmKmrqKWSgnpwaWFZREA+PlBV" +
"WmZeYmhpdnRybmxZV1hscHiKhY+Zoqm9w8PBqqSfoJyYlpWIiY6RoqSlooqEe3F1bGN5goydorS3taWhnZiUnJqakJSYoLK0tLKgmo6CdG5jWlM/Q1BXdHp9fn1dVk5UUE5VR1JfbXqIsbe6opyWiJiVlJabjJ6m" +
"rsvLx6CVh3lrYGxiYmRaYGaCg4B7dFZNOjRFSE5XW2d1i6aqq6mlin96eJCVnZymr7e809HDuax9cmhycXN3fGxyeHiKe3JnPDQuKkBES2FtZXqAhZqWkYtxbWtviZKptKq7v8DSzMS5oYJ4bWuBio+Vh4aDfYl/" +
"clk6MissRlhibXh1gpCkqcC7tq+LhoKBl5uhsaSrsbDBrqKUhmRYT0ZbXmpwYmpraXlya2I8NzQ4VF13hJKJkpmcr6ulknh3gImWxM3U1r62qoyRg3FucWhweH2Ukox1UkQtJyZIU2FvaXV8gH2Ke3VxYmt3hqu6" +
"x9bWvaicj5CLi46Uh5CcnrGdkH9JPTUxMUtUanVobmtkZ15WUkJLWGl5nrnAwqaek4KSkZSapJqvtrrHva+NaVxSTExQc3uDdXJsVV5RR0A9QD1LW46ZoKKdgHh1hZSqrcG0q6F+fH6Djay4ys65qp6NgXRpYU5U" +
"XWRtiIiDektANCk/RU9dbGeCio2el4+BaWpueISSxM/WwrywlZyQh4GAhHyEjKWimn9wSz0yKylJU2BjbHJpX25iWFVYV2uDrNPZzsGzfnp7gqu6yd3eu5mEbGZfXWNsXGh1c2lkUkEwFiAvRFeHoKKebmJaWH2O" +
"obfK3M3JvpynmY+TgI2ZpKm9r5ptWi8nLTljcn6Ff1lKLSQ8TV51hJSfop+Wp5CKjIOUp3KHnKqzs8mxpJl5f4ys1+Hl4dfEfWpYS2tzi5R8fHNlUkg5MDZCOF9ueZiWjoNtS0xidajQ3uTjv7Kig3qToK26srSu" +
"j5Z/alhPSzxJV4aIg2lZLCEaHCVleZCul5aEeG6Dg4iVnrDB0c3duqeViWdnboSrsq6jkEk1JRw2PEhpeGdqY1dYT0tNWExjj6Guzsa6oHt3g5G+zdvj5LSjjGJxaG13g3J6fXlfaFQ2LxQsPlJkj5aYi39XS05Y" +
"ma7E1eHIxaycqJWUmXKHnKqzs8mxpJl5f4ys1+Hl4dfEfWpYS2tzi5R8c2VSP0g5MDZCOF9ueZaOg3dtS0xidajQ3uS/sqKRg3qToK26srSuj5Z/alhPSzxJV4aIg2lZLCEaHCVleZCul5aEeG6Dg4iVnrDB0c3d" +
"uqeVZ2dueISrsq6jkEk1JTY8SFhpeGdqY1dYT0tYTGN4j6Guzsa6oHt3g5G+zdvj5LSjjGJxaG13g3J6fXlfaFQ2LxQsPlJkj5aYi39XS05Yma7E4cjFu6ycqJWUmXKHnLOzyb6xpJl5f4ys1+Hh18SUfWpYS2tz" +
"i5R8c2VSP0g5MDZCOF9ueZaOg3dtS0xidajQ3uS/sqKRg3qToK26srSuj5Z/WE9LMzxJV4aIg2lZLBocJU9leZCul5aEeG6DiJWlnrDB0c3duqeVZ2dueISrsq6jkEk1JTY8SFhpeGdqY1dYT0tYTGN4j6Guzsa6" +
"oHt3g5G+2+Pk37SjjGJxaG13g3p9eW9faFQ2LxQsPlKPlpiUi39XS05YkJunoqSjnpejm5KSl3WAi5iYqqSdlpB6foaut77App2TiH52hIeMhImMhZKHb2VKR0hNVHl/gn5iWUpFWVxjbHh6gYaZk42CgG1ze4aR" +
"ur6/oZiOf5CRlJqhqZycmJmNgW9XV1pgZ4OJiIJaUUc+VFlhbHZrd3ZzfHVxXGFqgo2ss7Wzr4uDfpOXn7GjqKmln6mSiYFoa3F9l5iVj4ZlT0dCWmBpemtubWhib2JeYFljcJuhpKSghX50c3aapK+qrKumname" +
"jox3gYiPqaehjGtfVk9OZXWAi5iYqp2WkHl6foaut77App2Be4SCgoSJhYmLl5KLfWlkY2RneoSIfHhybG1pZ2hdYml1h4mFgG1jYXBzeH+HhYmKk46JgXJ0foWan6SlpI6IgYeGiIOIjpKToZ2RinRsbG6Fio6R" +
"g4B8fHVval1hbHGEhoaEf2ZgXGpuc4J6f4GBjIh+emptcnmWm5+gkY2IfYeGio+Hk5amoJuUf3l1dIaKkJiMi4J7gXp1cnFpbnOJiohwamNeWmdpcnlxent5fnl0cGFiZnmAho2amI6Jd3V1eH2YnqOYlZCEjIeF" +
"hnp/io6fnJiRdG5qeHt/hIl/gHt2fW9rW15iaXyEhod2c3B5eHh7cHR3eomJh4Rzb299goaJfoGCgYyJhnV1d4qOkZOVh4aBfomHh3qAg4aVlpWTf3x5hIWHfoGDg5CNioZ1cnBxgoeJfXx6d4F+e3lrbXCDhYd3" +
"dXJvbHh3eW1xd3mIhoSBcG5tbX6BhX1/gIuJhoOCc3R4io2TlIWCf4qIhoaHfoGElpaVgn97hoaHiXl8f4KQjomHdnZ3h4uOkZSHhoSMiYd5e32AkZSVlYWCe4eFhYd7foGCkY+MiXRycH+BhId7fH2HhIF7a2pt" +
"cIGDhod4dXJveHd3bnF0h4iIhnZzcICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgFCAgFBQgICAgFBQUICAUFBQgICAUFBQgICAUFBQgIBQUFCAgFCAUICAgIBQgICAgIBQUICAgFBQgICAgFBQUIBQUIBQgICAgFBQgICAgFBQgICAgFBQgIBQUFBQgIBQUFCAgIBQUFCAUIBQUFCA" +
"gIBQgICAgIBQUFCAgFBQgICAUFCAUFCAgFBQgICAUIBQgICAgFCAgICAUFCAgICAUICAgIBQUFCAgIBQUICAgFBQUICAgFBQgICAgFBQUICAUFBQUICAUFBQgICAgFBQgICAUFBQgFCAUFBQgIBQUICAgIBQUICA" +
"UIBQUICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgFCA" +
"gICAUFCAgFBQUICAgFBQUFCAgFBQUICAgFBQUICAgFBQgICAUFBQgICAgFBQgICAUFBQgICAgFBQgIBQUICAgICAUICAgIBQUICAgIBQUICAgIBQgICAgFBQgICAgFBQgICAgFBQgICAgFBQgFCAgFCAgICAgFBQ" +
"gIBQUFCAgFCAgFCAgIBQUFCAgIBQUICAgIBQUFCAgFBQgICAgFBQgICAgFCAgICAgFCAgICAUICAgICAgIBQgICAUICAgIBQUIBQgICAUICAgIBQgIBQgIBQUICAgICAUICAgIBQUICAgIBQgICAUFCAUICAUFBQ" +
"gICAUFCAgIBQUFBQgICAUFCAgICAUFCAgICAUFCAgFCAUFCAgIBQgICAgFCAgIBQgIBQgICAUFCAUFCAUIBQUICAUFCAUICAUIBQgFBQgFCAgICAUIBQgFBQUICAgFBQgIBQgICAUIBQgFBQgICAUICAgFBQgICA" +
"UIBQUICAUIBQgFBQgFCAUICAgFCAUICAgIBQgICAgFCAgFBQgIBQUICAUFCAUFBQgIBQgICAUIBQgICAgIBQgICAgFCAgICAgFCAUICAUIBQgFBQgFCAgFBQUIBQgICAUICAgFBQgIBQgFBQUICAUICAUFCAUFCA" +
"gFCAUICAgIBQgFCAgICAgFCAgFCAgFCAgFCAUICAgIBQUICAgIBQgICAgIBQgICAgIBQgICAgFCAgICAgFCAUIBQUFCAUIBQUFCAgIBQUFCAgIBQUFCAgIBQUICAgFBQUICAgFBQUICAgFCAgICAgFBQUICAUFBQ" +
"gICAUFCAUFCAUFCAgICAUFCAgICAUICAgIBQUICAgIBQUFCAgICAUICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFBQgIBQUICAUIBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgICAUFBQgICAUFCAgFBQUFCA" +
"gFBQUICAgFBQUIBQUICAgFCAUFCAgFCAUIBQUICAUFBQUIBQgFCAgICAUIBQUICAUFCAgIBQgFCAgICAUFCAgICAUICAgICAUICAUFCAUICAgIBQgICAgICAUIBQgICAUIBQgIBQgIBQgIBQUFCAUFBQUICAgIBQ" +
"UICAUFBQgICAgIBQgIBQUFBQgIBQUFCAgIBQgIBQgIBQUICAgICAUICAgFBQUICAgFCAUICAgIBQgFBQgFBQgICAgFBQgICAUFBQgICAgFBQgICAUFBQgICAUFCAgIBQUFCAgIBQUICAgIBQUFCAgFBQUICAUIBQ" +
"UFCAgFCAgIBQgFBQUICAgFCAgFCAgFBQUICAgFBQUICAgFCAgICAgFCAgICAUFCAgIBQUFCAUFCAUICAgICAUFCAgIBQgFCAUFBQUICAgIBQUICAgICAUIBQgIBQgFCAUFBQgIBQgIBQgFCAUFBQgIBQUFCAgICA" +
"UFCAUIBQUFCAgIBQUFCAgIBQgICAgFBQgICAgIBQgICAgFBQgICAgFBQgICAgFBQgICAgFCAgICAgFCAgFBQgFCAgICAUFCAgICAUIBQgFBQUICAgFBQUICAgFBQUICAUICAgICAgFBQgICAUICAUICAgFBQgIBQ" +
"gFBQUICAgFBQUICAUFBQUICAUFCAgICAUFCAgFCAUFCAgFCAUFCAgFCAUIBQUICAUFCAgICAUFCAgICAUICAgIBQgFCAgIBQUIBQUICAUIBQUIBQgIBQUIBQgFCAgFBQgFCAgFBQgIBQUFBQgIBQUFCAgIBQUFCA" +
"gIBQUFCAgIBQgICAgFCAUFCAgFBQgIBQgFBQgICAgFBQUFCAgIBQgICAUFBQgICAgFCAgFBQgFBQUICAUFCAUICAgFCAgICAgFBQgICAUFCAgFBQgFCAgICAUFCAgICAUIBQgFBQUFCAgFBQUICAUFBQUICAgFBQ" +
"UFCAgFCAgFCAgFBQUICAUFCAgICAUFCAgICAUFCAgIBQUICAgFCAUFCAgICAUICAgIBQUICAgIBQUICAUFBQgICAgIBQgICAgICAUICAUFBQgICAgIBQgICAUFCAUICAUFBQgIBQgIBQgIBQgIBQgFCAUFBQgIBQ" +
"UFCAgFCAUFCAgIBQgICAgFCAUFCAgIBQgICAUIBQUFCAUFBQgFBQgFCAUICAUFCAgICAUFCAgFBQUICAgFBQUICAgFBQUICAgFBQgICAUFBQgFCAgFBQUICAgFBQgICAUFBQgICAUICAgICAUFBQgIBQUICAgICA" +
"UFCAgIBQUICAgIBQUICAgIBQUICAgIBQUICAgIBQgICAgIBQgICAgFBQgFCAgFBQgICAgFBQgFCAgFBQgFCAgFCAgIBQUFCAUIBQgICAgICAUFCAgICAUFCAgFCAUFCAUICAgIBQgIBQgIBQgFCAUFCAUFCAUFCA" +
"UICAUFCAUICAgIBQgIBQgIBQgICAUFCAgIBQgIBQUIBQgIBQUIBQUFCAgFCAgIBQgICAUFCAgFCAUFCAgFCAUFCAgFBQgICAgFBQgICAUFBQgICAUFCAgICAUIBQgICAgFCAgICAUFCAgFBQUICAgFBQgIBQgFBQ" +
"gFCAUFBQUIBQgFBQgFCAUICAgIBQgFBQgFCAUICAgFCAUICAgIBQgICAUFCAgICAUIBQgICAgFCAgFBQgFBQgICAUFCAUICAUICAgICAUICAgFBQUIBQgICAUICAgFBQUICAgFBQUICAgFBQgICAgFBQUICAgFCA" +
"gICAUFCAgICAUFCAgICAUFCAgICAUICAgIBQgFCAgIBQgICAgIBQUICAgFBQgICAgFBQgICAgFBQgIBQUFBQgFCAgFCAgIBQUICAgIBQUFCAgFBQgICAgFBQUFCAUIBQgICAgFBQgICAgFBQgICAgFBQgICAUFBQ" +
"gICAUFCAgICAUFCAUICAUFCAgICAUICAgICAUFCAgFBQUICAUFBQgFCAgFBQUICAUICAUICAgFBQgICAUFBQgICAUICAgIBQUFBQgIBQUICAgIBQUICAgIBQgICAgIBQUICAgFBQUICAgFBQgICAgIBQgICAgFBQ" +
"gFCAgFBQgIBQUFCAgIBQUFCAUIBQUFCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAf39/f39/fn5+fn59fX19fX19fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx9fX19fX19fX5+fn5+f39/f39/gICAgICAgYGBgYGBgoKCgoKCgoODg4ODg4ODg4OD" +
"g4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgoGBgYGAgICAgICAgYGBgYGBgoKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgoGBgYGBgYCAgICAf39/f39/fn5+fn59fX19fX19" +
"fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx9fX19fX19fX5+fn5+f39/f39/gICAgICAgYGBgYGBgoKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgoGBgYGAgICAgICA" +
"gYGBgYGBgoKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgYGBgYGBgYCAgICAf39/f39/fn5+fn59fX19fX19fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx9fX19fX19" +
"fX5+fn5+f39/f39/gICAgICAgYGBgYGBgoKCgoKCgoODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgoGBgYGAgICAgICAgYGBgYGBgoKCgoKCg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4OD" +
"g4ODg4ODgoKCgoKCgYGBgYGBgYCAgICAf39/f39/fn5+fn59fX19fX19fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx9fX19fX19fn5+fn5+f39/f39/gICAgICAgYGBgYGBgoKCgoKCgoODg4ODg4OD" +
"g4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgYGBgYGAgICAgICBgYGBgYGBgoKCgoKCg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoKCgYGBgYGBgICAgICAf39/f39+fn5+fn59fX19" +
"fX19fXx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx9fX19fX19fn5+fn5+f39/f39/gICAgICBgYGBgYGBgoKCgoKCg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODgoKCgoCAgIKDhYaAgoOE" +
"g4F+fn+Ag4WHiIeFgoGBhYeJiomIhoSDg4aIiouKiYWEg4SGiImLioiEg4KEhoiJiYiHgoGAgYOEhoaEgoB+fX1/gYOCgX17eXl6e31/f356eHZ3eHp8fX18eHZ1dXZ4e3x7eHZ0dHR2eHt8fHl3dXV3eXt9fn57" +
"eXh4eXt/gYGAf318e3x+goSEg4F/fn5/gYWHiIaEg4GCg4aIiYqJh4WDg4WJiouLioiGhISFiIqLioiGgoKDhYaIiYiGhICAgIOFhoaAgoOEg4F+fn+DhYeIiIeFgoGBhYeJiomIhoCAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB/gIB8eXVycHBxdnl9gIB+eHVzcnN1eH+ChIOBfnl4" +
"eHl8gIOJioqFg4B9foCDh4qNj42KhIGAgYOHjY6PjYuHhH59foKFiIqJh4SAfHl3eHuBg4SCf3x4dXNydXd7f4B/endzcXBwcnh8f4B/fYCDhoiJiIaAfnx+gIOLjY6OjImGgH+AhYiLj4+Nh4SBf35/gYeKi4qI" +
"hH16eXl7fYCFhoWAfHhzc3R2eXx/gX99dnNxcXN2eXx/gH57eHJxcnd6foGDhIN+e3h3eHuDhoiKiYiFf319gIOGjY6OioeEgYCAgYeKjY+Oi46JhIF+fHyAg4aKi4qEgHt2cW1qaWtudHh6fHp4dXFtaWVmZ290" +
"eIGEhYWEgX55d3d6fYKMkZSXmJeVj4uIhISFio6Sl5iYlpKOiX97eYCFiZCRkY+MiYaBgYGHi4+XmpubmZaSiYWCf4CBh4qMjo6NioJ9eG9tbG5xdHd6fH16d3RraGVlZ2puc3h8gYKBfXp3c3N1e4CFio+SlZST" +
"kImGhIOFiIyQlJeamZePioV+e3t7fYCDiImJhYF8cm1qaGhpa3J2eHx7eXNvbGlnZmducneBhIaGhIJ/fHp4en2Bi5CUmJmXkY2Kh5CNi4qLjZOWmZycmpeSjYV1bmZaVlNTVVldYWdrc3V2dXNwa2hmZWZna3Z8" +
"hICHj5ygo6Wlo6GalpKNi4uPkpWZnaCjo6Kfk42FdW5mXFpYWVpdYWltcHR0c25qZ2NhXl1gY2h2fYWVm6GlqKioo5+bk4+Mi4yOkZSYmp+gn5mVjn93b2dhXFhVVlhgZGlwc3R1dHJvaWZjYWJkbnN7i5Oaoaap" +
"q6qnpJuWkouKioqMj5KXmpyamJSIgXlxaWNcVFJTV1tfaW5xdHZ2dnJubGdlZWptc3mBiJGgpaquraykn5uVkY2Kh4iKjY6NjY6NioeDgHp1boCLmbG6xNHU19fW083AubCdlYp5c2xnYmBdXFxcX2FjZmdoaGhm" +
"ZWJgXlxbXF5hZWlwdn6QmaO2vcbR1dfX1dPNvrWpkIV3XlNHNjAsKSgpKzU8RFVeaHuCi5GXm5+jo6SioJ6bmZiYl5eYm5yeoqOko6KfnJeSi3tzaFVNRDUwKykoKCw2PUdeaXeQnKmzvsbN1dfX0czGtq2jkIh+" +
"eHBqZV5dXFxdXmJjZWZoaGhmZWNfXlxcXF1fYmZseYGKnaWwwMfN0tbX14CLmbG6xNHU19fW083AubCdlYp5c2xnYmBdXFxcX2FjZmdoaGZlZGJgXlxbXF5hZXB2foeQmaO2vcbR1dfV083HvrWpkIV3XlNHNjAs" +
"KSgpKzU8RFVeaHuCi5GXm5+jo6SioJ6bmZiYl5eYm5yeoqOko6Kfl5KLhHtzaFVNRDUwKygoLC82PUdeaXeQnKm+xs3S1dfX0czGtq2jkIh+eHBqZV5dXFxdXmJjZWZoaGhmZWNfXlxcXF1fYmZseYGKnaWwwMfN" +
"1tfX1YCLmbG6xNHU19bTzcjAubCdlYp5c2xiYF1cXFxcX2FjZmdoaGZlZGJgXlxbXF5hZXB2foeQmaO2vcbR1dfV083HvrWpkIV3XlNHNjAsKCkrLzU8RFVeaHuCi5ebn6Gjo6SioJ6bmZiXl5iZm5yeoqOko6Kf" +
"l5KLhHtzaFVNRDUwKygoLC82PUdeaXeQnKm+xs3S1dfX0czGtq2jkIh+cGplYV5dXFxdXmJjZWhoaGdmZWNfXlxcXF1iZmxxeYGKnaWwwMfN1tfX1YCLmbG6xNHU19bTzcjAubCdlYp5c2xiYF1cXFxcX2FjZmdo" +
"aGZlYmBeXVxbXF5hZXB2fpCZo6y2vcbR1dfV082+tamekIV3XlNHNjAsKCkrLzU8RFVeaHuCi5ebn6Gjo6SioJ6bmZiXl5iZm5yeoqOko6Kfl5KLe3NoYFVNRDUwKygoLDY9R1FeaXeQnKm+xs3V19fV0czGtq2j" +
"kIh+cGplYV5dXFxdXmJjZWhoaGdmZWNfXlxcXF1iZmxxeYGKnaWwwMfN1tfXgIuZpLG6xNHU19bTzcC5sKedlYp5c2xiYF1cXFxeX2FjZmdoaGZlYmBeXVxbXF5hZXB2fpCZo6y2vcbR1dfV082+tamekIV3XlNH" +
"NjAsKCkrNTxETFVeaHuCi5ebn6OjpKKioJ6bmZiXl5ibnJ6goqOko6Kfl5KLe3NoYFVNRDUwKygoLDY9R1FeaXeQnKm+xs3V19fV0czGtq2jkIh+cGplXl1cXFxdXmJjZWhoaGZlY2JfXlxcXF1iZmx5gYqSnaWw" +
"wMfN1tfXgIuZpLG6xNHU19bTzcC5sKedlYp5c2xiYF1cXFxeX2FjZmdoaGZlYmBeXFtcXF5hZXB2fpCZo7a9xsvR1dfV082+tamQhXdsXlNHNjAsKCkrNTxETFVeaHuCi5ebn6OjpKKioJ6bmZiXl5ibnJ6goqOk" +
"o6Kfl5KLe3NoVU1EPDUwKygoLDY9R15pd4OQnKm+xs3V19fRzMa+tq2jkIh+cGplXl1cXFxdXmJjZWhoaGZlY2JfXlxcXF1iZmx5gYqSnaWwwMfN1tfXgIuZsbrEytHU19bTzcC5sJ2VioJ5c2xiYF1cXFxfYWNl" +
"ZmdoaGZlYmBeXFtcXF5hZXB2fpCZo7a9xsvR1dfV082+tamQhXdsXlNHNjAsKCkrNTxEVV5ocXuCi5ebn6OjpKKgnp2bmZiXl5ibnJ6io6Sko6Kfl5KLe3NoVU1EPDUwKygoLDY9R15pd4OQnKm+xs3V19fRzMa+" +
"tq2jkIh+cGplXl1cXF1eYGJjZWhoaGZlY19eXFxcXF1iZmx5gYqdpbC4wMfN1tfXgIuZsbrEytHU19bTzcC5sJ2VioJ5c2xiYF1cXFxfYWNlZmdoaGZlYmBeXFtcXmFlaXB2fpCZo7a9xtHV19fV082+tamQhXde" +
"U0c/NjAsKCkrNTxEVV5ocXuCi5ebn6OjpKKgnp2bmZiXl5ibnJ6io6Sko6Kfl5KLe3NoVU1ENTArKSgoLDY9R15pd5CcqbO+xs3V19fRzMa2raObkIh+cGplXl1cXF1eYGJjZWhoaGZlY19eXFxcXF1iZmx5gYqd" +
"pbC4wMfN1tfXgIuZsbrE0dTX19bTzcC5sJ2VinlzbGdiYF1cXFxfYWNmZ2hoaGZlYmBeXFtcXmFlaXB2fpCZo7a9xtHV19fV082+tamQhXdeU0c/NjAsKCkrNTxEVV5oe4KLkZebn6OjpKKgnpuZmJiXl5ibnJ6i" +
"o6Sjop+cl5KLe3NoVU1ENTArKSgoLDY9R15pd5CcqbO+xs3V19fRzMa2raObkIh+cGplXl1cXF1eYmNlZmhoaGZlY19eXFxcXV9iZmx5gYqdpbDAx83S1tfXgIuZsbrE0dTX19bTzcC5sJ2VinlzbGdiYF1cXFxf" +
"YWNmZ2hoaGZlYmBeXFtcXmFlcHZ+h5CZo7a9xtHV19XTzce+tamQhXdeU0c2MCwpKCkrNTxEVV5oe4KLkZebn6OjpKKgnpuZmJiXl5ibnJ6io6Sjop+cl5KLe3NoVU1ENTArKCgsLzY9R15pd5Ccqb7GzdLV19fR" +
"zMa2raOQiH54cGplXl1cXF1eYmNlZmhoaGZlY19eXFxcXV9iZmx5gYqdpbDAx83S1tfXgIuZsbrE0dTX1tPNyMC5sJ2VinlzbGJgXVxcXFxfYWNmZ2hoZmVkYmBeXFtcXmFlcHZ+h5CZo7a9xtHV19XTzce+tamQ" +
"hXdeU0c2MCwpLC0vNjxDUlpjc3qAjJCTlpiZmZqZmJiXl5mbnaCipaitr7GxsK6moJuTioF3YllOPTUvJyYlJyswNkhRXHN+iZ6mrrS6vsHCwb64s66kn5qWkY6LhoaFg4ODgoB/eXVxbWdhW09KRDw6ODk8P0RM" +
"VF1yfYigqrXHzdPWgIqWrba+y8/R0c/Lx8G6s6OblIR+eXBta2poaGhoaWlpaGdjYV5bWFVSTk1LTlBTX2VsgImUnqmyu8vR1tra187HwLesoZZ/dGpYUUtBPz8/QEJGTlNYYWZqcXN1dnh5eHp6en1/gYmOk5mf" +
"pay4vcHJysvHxL64sKedh3xxWlBHODIuKistMDY7QlFZYXF4f4qOkZSVlpaWlpWUlZWXmZyfoqaqsbS3urq5s66popqRh3JoXUlAOCwoJSUmKC05QUpdZnGEjJSbgIqWq7S9yc3P0M7Kwbu0rqagmIuGgXp3dXRz" +
"dHN0c3NycG5nZF9VUUxIREE/PT9BSlBXaXN+iZWfqr3FzNbY2NXRzMa+tq2akoh4cWtiX15cXFxcX2BiZGRlY2JgW1lXVVNSUFJUV2BmbX+IkpymsLnJz9Ta2tnRzMS8sqmeiX50YltVS0hHRkdIS1BUWGBiZGdn" +
"aGlpaGlpaGlra250eH2CiY6Uoqivur7Cx8jIw8C7ta6on46GfWxmX1NQTEpISElLTlBXW16Ah5CZoaivuby/wcG/ubayraijnpSQi4SCgHx8e3p6enl3dnRvbGlhXVlVUE1KRUNDRkhLVlxjdHuEjZaeprS5vsXG" +
"xsPAvLizraiblpCFgX12dHNxcHFwb29ubWxqZmNhXlpXVE9MS0tLTFNXXGNqcHiKkpqrsbjCxcfJycfFvbmzpqCYioV/dHFtamhoZmVmZWZnZ2ZmZGNiX11ZV1VTUlJVV1tfZGlwf4aPoKeuu8DEyMrKysbCvrGr" +
"pJSNhn53cm1kYl9cXFyAh5CZoaivuby/wcG/ubayqKOemJSQi4SCgHx8e3p6eXh3dnRvbGlhXVlQTUpHRUNDRkhLVlxjdHuEjZaeprS5vsXGxsPAvLizraiblpCFgX12dHNxcHFwb29ubWxqZmNhWldUUk9MS0tL" +
"TFNXXGpweIGKkpqrsbjCxcfJx8XCvbmzpqCYioV/dHFtamhoZmVmZWZnZ2ZmZGNiX11ZV1VTUlJVV1tfZGlwf4aPoKeuu8DEysrKycbCvrGrpJSNhndybWhkYl9cXFyAh5ChqK+0tLe7vb28uLWyqqein5qXlI6M" +
"ioeGhYODgYB+fXp0cWxjX1pRTUlGQkA/P0BCSk5UYmlxgYePlp2iqbGztbe2trKwraqnpKGbmZeTk5GQkI6OjYyKhoSAeHNuY15YU01JRT48Ozw+QUlOVFpiaXGAh46an6Srra+wsLCvrKqoo6GgnZybmpqZmpmZ" +
"mJaVko2JhXp1b2liXFZKRkE7OTk6PUBESU5VYmlxf4WMl5ufoqWmqKioqKWko6Gfn5+fn5+hoaGAho+dpKqvtLe6vLy8uLWyqqejm5iUko+Ni4iHhoSEgoB+e3h1cm1lYFxSTklCQD08PD0+RUlNWmFnd36Ei5KX" +
"nKWpq66urqyrqaelpKKfn56enp+goKGhoaGgnJqXjomEd3BqXFZQS0VBPjk5OTxAQ01SV11kaW96foKKjI6RkZGSk5OTlJWWmpyepKeqrbCztbi5uba0saeinJWNhn9waWJVUUxGREREREVHTVBTW15hZ2lrb29w" +
"cHFycnN0dXp8f4iMkZadoqeAho2coqiytbe5urq6trSxq6ilnpyZl5WUk5GRkY+Pj4yKiIWBfXluaWNXUk1DQD07Ojk6PkFFUFZcanB3hYqPk5ibnqKio52dnJubm5qampucnp+io6Smp6enp6akn5uYj4qEeXNt" +
"aGJdWVFOTEpJSkxOUVNWWV1jZmlucXN1dnd4eHl5ent8f4GDiYyQmJygpKisr7W3ubm5uLOwrKijnpmOiYN5dXFraGZkY2JiYmJjZGRlZWVkZGNhYF1cW1lYWFhZW11gZGeAhYuWm6Cnqqyur6+vrqyrpqShnZuZ" +
"lpWUlJOTk5KSkpGQjouIhYF+eXVrZmFYVFBKR0ZFREVGSk1QWF1ha3B1eX6BhYuNjpGRkpKSk5OTlJSWmJmdn6Gmqausrq+vr66sp6SglpGLgHp0bmlkX1hVU1BQUFFTVFZZW15iZGZpamtsbGxtbW1tb29xdXd6" +
"gYaKj5SZnqerr7W4ubu6ubi1sq+nop6Uj4qBfnp3dXJxb25tbW1sbGtraWdmZGJgXllWVFFQUFBRU1WAhYuWm6Cnqqyvr6+vrqyrpqShnZuZlpWUlJOTk5KSkpGQjouIhYF+eXVrZmFYVFBKR0ZFREVGSk1QWF1h" +
"a3B1foGFiIuNjpGRkpKSk5OUlJWWmJmdn6Gmqauur6+vr66sp6SglpGLgHp0bmlkX1hVU1BQUFFTVFZZW15iZGZpamtsbGxtbW1tb29xdXd6gYaKlJmeoqerr7W4ubu6ubWyr6unop6Uj4qBfnp1cnFvb25tbW1s" +
"bGtraWdmZGJgXllWVFFQUFBRU1WAhYuWm6Cnqqyvr6+vrqyrpqShnZuZlpWUk5OTkpKSkpGQjouIhX55dXBrZmFYVFBKR0ZERUZHSk1QWF1ha3B1foGFiIuNjpGRkpKSk5OUlJWWmJmdn6Gmqauur6+vr66sp6Sg" +
"lpGLgHp0aWRfW1hVU1BQUFFTVFlbXmBiZGZpamtsbGxtbW1ub29xdXd6gYaKlJmeoqerr7W4ubu6ubWyr6unop6Uj4qBfnp1cnFvb25tbW1sbGtraWdmYmBeW1lWVFFQUFBRU4CFi5GWm6Cnqqyvr6+urKuppqSh" +
"nZuZlpWUk5OTkpKSkpGQjouIhX55dXBrZmFYVFBKR0ZERUZHSk1QWF1ha3B1foGFi42OkJGRkpKSk5OUlJaYmZudn6Gmqauur6+vrqyqp6SglpGLgHp0aWRfW1hVU1BQUFFTVFlbXmBiZGZpamtsbGxtbW1ub29x" +
"dXd6gYaKlJmep6uvsrW4ubu6ubWyr6einpmUj4qBfnp1cnFvbm1tbW1sbGtraWdmYmBeW1lWVFFQUA=="},
"faster": {f0: 109.77, n: 10380, b64:
"AAAAcHBwcHBQUHBwcHBQUFBwcHBQUFBwcHBwcHBwcHBwUFBQcHBwcHBwUFBwcHBQcHBwcHBQcHBwUFBwcHBwcHBwcFBQUHBwUHBwcFBwcFBQUFBwcHBwcFBwcFBQUFBQUHBwcHBwcHBwUHBwcFBQcHBQUFBQcHBw" +
"cHBwcFBwcHBwcHBQUFBwcHBQUHBwcHBwcFBwcHBwcFBwcHBQUFBwcHBQUHBwcFBwcFBQUFBQcFBwcHBQcHBwcHBwcFBwcHBwcFBwcHBwcHBQUFBQUHBwUFBwcHBwcHBQcHBwcHBQUHBQUFBwcFBwcHBQUHBwcHBw" +
"cHBwcHBwcFBQUFBQUFBwcHBwUFBwUHBwcFBwcHBwcFBwcFBQUFBwcFBQUHBwcHBwcFBwUHBwUFBwUFBQcHBwcHBwcFBQUFBQUHBwcFBQcHBwcFBQUFBwUFBwcHBwcHBwcFBQUFBwcHBwcHBwcFBwUFBQUFBwcHBw" +
"cFBQUHBQcHBwcHBwcHBQUFBwcHBwcFBwcHBQcFBQUFBwcHBwcHBQcFBQcHBwcHBwcHBQUFBQUFBwcHBwcHBwcFBwUFBQcHBwUFBQcHBwcHBwUFBQUFBQcHBwcHBwcHBQUHBwcHBwcFBQcHBwcHBwUHBwcFBQUFBQ" +
"cHBwUHBwcHBwUFBQcHBwcFBwcFBQUHBwcHBwcFBQcFBwcFBwcHBwcFBQUFBQUFBwcHBwcFBwcFBwcHBwcFBwcFBQUHBwcHBwUHBwUFBQUHBwcHBwcFBQUFBQUFBwcHBwUHBQUFBQUFBwcHBwUHBwUFBQcHBwcFBQ" +
"cFBQcHBwUFBwcFBQcHBQcHBwcHBQUHBwUFBwcHBwcHBQUFBQcFBQcHBwcHBQcFBQUHBQcFBQUHBwcHBwcFBwUFBQUHBwUHBwcFBQUHBQUHBwcHBwcHBwcFBQUHBQcHBQUFBQcHBwcHBwcHBQUFBQUHBQcHBwcHBw" +
"UFBwcFBQcHBwUHBwcHBQUFBwUFBwcHBwcHBQUFBwcHBQUFBQUHBwUHBwcHBwcFBwUHBwcHBQUFBQUHBQUFBQcHBwcHBwcFBQcHBwcHBwUFBQUHBQcHBwcFBwcHBwcHBwUFBQcHBQcFBQcHBwcFBQcHBwcFBQUFBw" +
"cFBwcHBQUFBwcFBwcHBwcHBwcFBQUFBQUHBwcFBwcFBwcHBwcFBwcFBwcHBwcFBQUFBQUFBwcHBwcHBQUHBQUFBQUFBwcHBwUHBwcHBwUHBwUFBwcHBQcHBwcHBQcHBwcHBQUFBQcHBwcHBwcFBwcHBwcFBwUFBw" +
"cHBQUHBwUHBwcHBwUFBQcHBwUHBQcHBwcHBwUFBQUHBwcFBQUHBQUFBQcHBwUFBQcHBwUFBQUHBwcFBwcHBwUFBQUHBwcHBwcHBQUFBwcFBQcHBwcHBQcFBQUFBwcHBwcHBwUHBwcFBQcHBwcHBQcFBwcFBQcHBw" +
"cHBQcHBQUFBwcFBwcHBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQUFBQcHBQcHBQUHBwcHBwcFBwUFBQcHBQUFBQUHBwcHBwcHBwUFBQcHBQcFBQcHBQcHBwcHBwcFBQUHBwcHBwcFBwUHBwcFBQcFBQcHBwUFBQcHBQ" +
"UHBwcHBwUFBQUHBwcHBwcHBQcHBQUHBwcHBwcHBwUFBwcHBwcHBwcFBwcFBQUHBwcHBQUFBQUHBwcHBwUFBQUHBwcHBQUFBQcHBwUFBQcFBwcHBQUHBwcHBwcHBwUFBQcFBQcHBwcHBwcHBQcHBQUFBwcFBwcHBw" +
"cHBwUFBQUFBwUFBwcHBwcHBwUHBQUFBQUHBwcHBwUFBwUHBwcHBwUHBwcHBwUFBQUFBQUHBwcHBwUHBwUHBwUFBQcHBQcHBwcFBwcFBQUHBwUFBwcHBwcHBwcFBwcHBwcHBwUFBwcHBQcHBQUFBQcHBQUHBQUHBw" +
"cHBwcHBwcFBQUFBwcFBQcHBwcHBwUHBwcHBQcHBQUHBQcHBwcHBQcHBwcHBwcFBQUFBQUHBQcHBwcHBwcHBQcHBwcHBQUHBQcHBwUFBQcHBwcHBwcHBQUFBwcHBwcHBQcHBwUFBwcHBQcHBwUFBQcHBwcHBwUFBQ" +
"cFBQcHBwcHBwUFBQcFBQUHBQcHBwUHBwcHBwcHBQUHBwcHBQcFBQUHBQUHBwcFBwcHBwcHBwcHBwUHBwcHBwUHBwcFBQUFBQUHBQUHBwcFBQUHBwcFBQUHBQcHBQUFBwUHBwcHBwcFBwcFBQcHBwcFBQcFBwcHBw" +
"cHBwcHBQUFBQUFBwcHBwcHBwUFBQcHBQUHBwcHBwcHBQUFBwcHBwcHBwUHBQUFBQcHBQUFBQUHBwcHBQUFBQcFBQcFBQUFBQcHBwUHBwUFBwcHBwcHBQUHBwcHBQcFBQUFBwcHBwUHBQUHBwcFBQcHBwcHBwcHBw" +
"cHBQUFBQUFBwcHBwcHBQUFBQUFBQcHBwcHBwUHBwUFBQUFBQUFBwcHBwcHBwUFBwcHBwUFBQcHBQcHBwcHBQcHBQUFBQUHBwcFBQcFBwUHBwcHBwcHBwcHBQUFBQcHBwUFBQUHBwcHBwUHBwcFBQUFBwUHBwcHBQ" +
"cHBwUFBwcHBwcHBwUFBQcFBQcHBwcHBwcHBwcHBQUFBQUFBwcHBwcHBQcFBwcHBwcFBQUFBQUHBwcFBQcHBwcHBQcHBwcHBwcFBwcFBwUFBQcHBwcHB5en2AgoOSkpKRkIGAfXx6h4aGh3p7fX6AgZKTlJWVhoOC" +
"gH6KiIaCgXFwcHFygYKEhYaHenp6eYaEgX99bmxramlpeHp7fXN1d3h6e4qLi4t7enl3dnWCgoKDhHd5fX6AkpSVloiIh4aFg46MioeGd3d3d3iHiIqMjYCBgYB+i4mHhYOBb25sa3h4ent8cHJzdXd4hoeGhnV0" +
"c3Fwb3x7e3twcXN3eXuNj5CRkoSEg4KBjIuJh3l4eHl5eouMjpGShYeHhoaTkY95en2AgoOSkpKRkIGAfXx6h4aGh3p7fX6AgZKTlJWVhoqFgHqCfnp0c2ZpbG+ChYeHhnZzb2tnb2xrbG5kbnN5foOVmJuamYaD" +
"gHuHhoaIio2Gio2SoqGdmpWCfHdyaXRycXN1bXF0dniHh4OAfWdkYV5fbnF1eX98gYaNjp2bmJWBfXt5eHmIjZCUjZCRkZCbl5KNh25qZmFhcHR4e35zdnh4d3V9eXZwYGBhY2VqgoeNl4yPkZCOmZaSj4l5eXp8" +
"f5SXmpyekI95foOMj5CenJqTgn58enl5ioyQloyOkJCOmZWQi39saGFgX3Bzdnp9c3Z5eXeBfnp0ZGJiY2Rof4SKlZmPk5KSj6uln5SSfIGGiqirq6iknX9pXlVbWVlgUllnbHCGhYN/dl1cXmJpk52nsbioqqWg" +
"mJ2WkIl1dnp+goWcmpWFZ1xKRD9TVVlgcWVteXt8jIiFgX9qbHh/ibG4vsGppJ2TioCFgH19bG93eXmIg3tzak1GPz9DZ3B6eoGHiouJm5OPjHh7gI+Ws7h1f4qanbSwqqWEgH19foKbpquul5OMeW54bmVfXEhM" +
"UmBmgISEgX1jXltYWnODjZiYn6WopbWvp5+YeXd3fIGan6CemX11a1ZNW1RVWVJaYmpxdo2MiYZpZmZtc5CapK224N3Rp6yTcmtrVV9pc3uRhmFOOgkLFCU9c4+7yLGonZCXlJetvLC9xsjBuqCEUUAaHik5SXaB" +
"iIJcUDo2OG6DnrjSytfYzbuum4yBaHB6hY2sn494LhoLBQ88UmuDmpibloN5jIuTopdyjKbGyuLJuql5d3yRncTLy8S1ak81EAkmPlJnX295fXOGem1ud3+Wr8TV+vzl0LhsW09NcHuFj5R3YlE9NSomOU1LZYGX" +
"qdLNw6meen6HlsHQ2+HVqJBaQCoxMjtbUF9pbm1lal9YPkpdkKnd7vj58bOeiGlifo2WoaeMhnpRO0AiICUqQlx0ibO5s6qecW9zjbvP3+zx77WdgU1WSUdPQE5bZWp9cWJHQSQ6T2q80+Tt7ea9mol7jpOcs5+k" +
"oZiIcVpCLyEKF3KMprnGyuLJuql5d3yRncTLy8S1ak81EAkmPlJnX295fXOGem1ud3+Wr8TV+vzl0LhsW09NcHuPlHdwYlE9NSomOU1LgZeps9LNw6meen6HltDb4d/VqJBaQCoxMjtbUF9pbm1lal9YPkpdkKnd" +
"7vj58bOeiGlifo2WoaeMhnpRO0AiICUqQlyJs7m6s6qecW9zjbvP7PHvyLWdgU1WSUdPQFtlamh9cWJHQSQ6T2q80+Tt7ea9mol7jpOcs5+koZiIcVpCLyEKF3KMprnGyuLJuql5d3yRncTLxLWgak81EAkmPlJn" +
"b3l9e3OGem1ud3+Wr9X6/PXl0LhsW09NcHuPlHdwYlE9NSomOU1LgZeps9LNw6meen6HltDb4d/VqJBaQCoxMjtbUF9ubWV3al9YPkpdkKnd+Pnx47OeiGlifo2WoYyGemhRO0AiICUqQlyJs7m6s6qecW9zjbvP" +
"7PHvyLWdgU1WSUdPQFtlamh9cWJHQSQ6T2q80+Tt5r2smol7jpOcs5+kmIhxdGxeUko5QnWFlKWnuLGonpV5e4KWoL3Auq+MfGxdS15hcXqCc29oXmdcVE9USmh4hq2vrKaegHl1eYGuucPJr6aJeYB0bmxvaHB2" +
"eXSAZ1tQSjM3QFyAjqChn3x0bmtshpCruK64ta2omYyBe3lndX2DmZOIbEk9NTI0PGl3hH5/fG5mdXN0e4aOnaq3tcStoJRxcHR6g5+lpqCUYVJES0xRW2ZzaXV1cXZuaGdZZHKDkqDFxcCtjIJ3eJKao6yzn5iN" +
"bl5lVFNXSlRfaHGFf3WFlKWnuLGonpV5e4KWoL3Auq98bF1SS15hfoN5e3hzdG5pZ2hdY3F3e4uJhG1paGltcoiXnKCQjIZ8h4aIjJKKlJaWmpSMgG9ucHR5fpGRjnNsZVxba3B2e4F5eHVqc29tcHZ3foSIl5WS" +
"iIRzdXqAnaKlpqSRi356hYeLkIuOjYqFjIR2cnFnbHGHiYeDfndjWllbdXuCjH9+enZxenh6f3+GjZOhnZiSjYl5fIGan6OhnYh5c297e36DjIGCfHZ9b2toaV9kanmAh46NmY+KhoR3eoCNoKSloZt/eXRzgYSJ" +
"kpaJgn11dG9tbW9ma3Z4h4B6dF1bXGBne4OPkpJ9eHNQUICAgFBQUICAUFCAgICAUFBQgICAUFCAgICAUFCAgICAUICAgIBQUICAgICAUICAgIBQUICAgICAUICAUFBQgICAgIBQgICAUFBQgICAUFBQgICAUFCA" +
"gIBQUICAgIBQUICAgIBQUICAgIBQUICAUIBQgICAgIBQUICAgFBQgICAUIBQgICAgFBQgICAgFCAgICAgFBQgICAUFCAgICAUFCAgICAUICAgICAUICAgFBQgICAgICAgFCAgFBQgICAUFCAgFCAgFCAgICAUICA" +
"gFCAUFCAgICAgFCAgICAUFCAgICAUICAgIBQgFCAgIBQUICAgIBQgICAgFBQUICAgIBQgICAgIBQgICAgIBQgIBQUIBQgICAgFCAgIBQUICAUICAgFCAgFBQUIBQgFCAgFBQgFBQUIBQgFCAgFCAUIBQUICAgFCA" +
"gFCAUFCAgICAUICAgFCAgFCAgFCAUICAgIBQgIBQUFCAgFCAUFBQgFCAUFCAUIBQgIBQgIBQgIBQgICAUFCAgIBQgICAUICAUFBQgFBQgIBQUICAUFCAgFCAUFCAgICAUFCAgIBQgICAgIBQgIBQgFCAUFCAUIBQ" +
"gICAUFCAUFCAgFCAgICAUICAUFCAUFCAgIBQgFBQgIBQUIBQgIBQgICAUFCAUICAgICAUIBQgICAUIBQgIBQgICAUFBQgICAUFCAgICAUFCAgICAUFCAgIBQgICAgIBQgIBQgFBQgFBQgFBQgICAgFBQgICAgFBQ" +
"gICAgFCAgICAUFCAgICAUFCAgICAUICAgICAUFCAgFBQUFCAgFBQUIBQgFBQUICAgFBQUICAgFCAgICAUFCAgICAUFBQUICAgFCAgICAUFCAgIBQUICAgIBQUICAgIBQUICAgIBQUICAgFBQgFCAUFCAgICAUFBQ" +
"gIBQUFCAgIBQUFCAgIBQUFCAgFBQUFCAgFBQgICAUFBQgICAUFCAgICAUFCAUFBQgIBQgFBQUIBQgFBQgFCAgFBQUFCAUICAUICAgFBQgFCAgFBQUICAUICAUICAgFBQUICAgFBQgICAgFBQgIBQgFBQgICAUICA" +
"gICAgFBQgFCAgFBQgFCAUICAgFCAUFBQUIBQUFCAgICAUFCAgIBQUICAgICAUICAgFBQUICAgFBQgICAgFCAUICAgFBQgICAgIBQgIBQUFBQgIBQUIBQgICAgFCAUIBQUFCAgIBQUFCAgFBQUFCAgIBQUFCAgFBQ" +
"UFCAgFBQgICAgFBQgICAgFCAgICAgFBQgICAUFCAgFBQgFBQgICAUICAUICAUFCAgICAUIBQgICAUFCAgICAUFCAgICAUICAgICAUICAgFBQUICAUFBQUIBQgFBQgICAgFBQUICAUICAUIBQUFCAgICAUFCAgICA" +
"gFCAgFCAUIBQUIBQUICAgFCAUIBQUIBQUICAgFBQgICAgIBQgFCAgFBQgICAgFBQgICAgFCAgIBQUFCAgICAgFCAgIBQUFCAgIBQUFCAgIBQUFCAgIBQgICAgIBQgICAUIBQgICAgFBQgICAgFCAUFCAUFCAgICA" +
"UFCAgICAUFCAgIBQgICAgICAUICAgIBQgFCAgICAUICAUFCAUFCAgICAUFCAgIBQUFCAgIBQUICAgIBQUIBQgFBQUIBQgFBQUIBQgFBQgFCAgFBQUICAgFBQUICAgFBQgICAUICAUICAUFBQgFCAgFBQgFCAUICA" +
"gFCAUICAUIBQUICAUIBQUICAgFBQUICAgFBQgICAgFBQgICAgFBQgICAgFCAgIBQUIBQgIBQUFCAUIBQUFCAgIBQUFBQgICAgFCAgFBQUFCAgIBQUICAUIBQUFBQgFBQgIBQgIBQgICAgIBQUFCAgFBQgICAUIBQ" +
"gICAgFBQgICAgFCAUFCAUFBQgICAUFCAgIBQUFCAgICAUFBQgICAUIBQgICAUFCAgFBQUICAgFBQUICAgFBQUICAUFBQgIBQgFBQUICAgFBQgICAUFBQgICAUFBQgIBQUICAgICAUICAgICAgFCAgIBQUICAgICA" +
"UICAgIBQgFCAgIBQUICAgFCAUICAgFCAUIBQUIBQUICAgFBQgIBQUIBQgICAgFCAgIBQUIBQgICAgFCAgFCAgFBQgFBQUFCAUIBQUIBQgFBQUICAgFBQUICAUFCAgICAUFCAgICAUFCAgICAUICAgIBQUIBQgICA" +
"UFCAgICAUICAgIBQUICAgIBQgICAgIBQUICAUFBQgICAgIBQUICAUFBQgICAUFBQgICAUFBQgICAUFBQgICAUICAgICAUICAgIBQUICAUIBQUICAgIBQUICAUIBQUICAUIBQgICAgFBQgFBQgFCAgICAgIBQgICA" +
"gIBQgICAUIBQgFBQgICAUICAgFCAUICAUIBQgFBQUIBQgFBQgIBQgFBQgICAUICAgFCAUICAgIBQgICAgFCAUFBQgFCAUFCAgFBQgIBQUICAUICAgIBQgIBQUIBQgIBQUIBQgIBQUFCAgIBQUFCAgFBQUFCAgFBQ" +
"UICAgFCAgFCAgIBQUICAgFBQUICAUFCAgICAUICAgFCAUIBQUIBQUFCAUFCAUIBQgIBQgICAUFCAUIBQgIBQgIBQgIBQgICAUFCAgFBQgICAgFCAUFCAgIBQgICAUIBQUFCAgFBQgIBQgFCAgICAgFCAgICAUFCA" +
"UFCAgFCAgICAUFCAgICAUFCAgICAUICAgICAUFCAgICAUICAgIBQUICAgIBQUICAgIBQUICAgFBQgICAUICAUICAUICAgICAUFBQgIBQUICAgIBQUICAgIBQUICAgFBQUICAUIBQgICAgFCAgICAgFBQgICAUFCA" +
"gICAUFBQgFCAgFCAgIBQUFCAgIBQUFCAgIBQUFCAgFBQUFCAgFBQUICAgFBQUIBQgFBQUICAgFCAgICAgFBQUICAUFCAgIBQUIBQgICAUFCAgIBQgFCAgICAUICAgIBQUICAgIBQgICAUFBQUICAUFBQgICAUFBQ" +
"gICAUFCAgICAUFBQgIBQUFBQgIBQUICAgICAUICAgIBQUICAUIBQUICAgFBQgICAgFBQgFBQgFBQgICAgICAgHyAg4aMioiFgnl5e36Mj5GKiIWChoSDhYCEiYuSj4yCfHp6goSHioeHhoCEgHx0dXd6fYaIh4V3" +
"c3F1dnl8d3p8fIF+d3VsbnBzfoGDhHt4dnd2dnt3e36BgomFgnl1dXeEiIuOiIiHgoaDgnx+hYiRkpGOhIF+fISGiIeJioiMiYWCgHh6fIaLjIt/fHh1eXl5fXl8foWEfXpwbm1tb3x/gnx7eHl2dXR1cHN6fYWF" +
"g4B0cnJ6fH+DgoSFgoeEgH95foKMj5GRkHyAg4aMioWCeXl5e36Mj5GKiIWGhIODhYCEiYuSj4yCf35+hYaIiYSEg4eFg3p5eXp7g4SFfn15d317enR1d3h5gIB+dHJxd3h5dXd4eHh+fXpycXJzfICBe3t7enl9" +
"fX14enyGh4iIgH9+fIODhoGDhYaNjIuJgYCAgIqMjYiIh4WLiYh/gICDi4yMhIOBf32DgoN9f4CAhoWDeHd2dX1+f3p7e3l+fHlxcXFydHx/f3h2dHp4d3hydHV3gIGAd3Z1e3t9foB7fXx+gIGIiIV9fHx9fYaK" +
"i4aGhoWJiIeAgIGDjY6Ph4aEgYeGh4GChIWFjIqIf3x7eoOEhX+AgH+DgX91dXV3f4CBenp6eXl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXp6enp7e3t7fHx8fX19fn5/f3+AgICAgYGCgoODg4SEhISF" +
"hYWFhoaGhoaHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhoaGhoWFhYWFhISEg4ODgoKBgYGBgICAf39/fn59fX18fHx7e4CAgIGBgYKCgoODg4SEhISFhYWGhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWF" +
"hYWEhISDg4OCgoKBgYGAgIB/f39+fn19fXx8fHt7e3t6enp6eXl5eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5eXp6ent7e3t8fH19fX1+fn5/f3+AgICBgYKCgoKDg4OEhISFhYWGhoaGhoeHh4eHh4eHh4eH" +
"h4eHh4eHh4eHh4eGhoaGhoaFhYWEhISDg4OCgoCAgIGBgYKCgoODg4SEhISFhYWGhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWFhYWEhISDg4OCgoKBgYCAgIB/f39+fn19fXx8fHt7e3t6enp6eXl5" +
"eXl4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5enp6ent7e3t8fH19fX5+fn5/f3+AgICBgYKCgoODg4OEhISFhYWGhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoaFhYWEhISDg4OCgICAgIGBgYKCgoOD" +
"g4SEhIWFhYWGhoaGhoeHh4eHh4eHh4eHh4eHh4eHh4eHh4eGhoaGhoWFhYWEhISDg4OCgoKBgYCAgIB/f39+fn19fXx8e3t7e3t6enp6eXl5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXl5enp6ent7e3t8fH19" +
"fX5+fn5/f3+AgICBgYKCgoODg4OEhISFhYWGhoaGhIWHiYqLi4mIh4SDhIaHiYqLi4uIh4WDgoKFhoeIiYmIhYOBf39/gIGDhIWEhIGAf3+AgYWGiIiJiIeFg4KDg4WIiouLi4qJhoSEhIWHiYqLiomHhoSDgoOE" +
"hYiJiYeFg4KAf3+AgYKEhYSCgH59e3t6fH1+gICAfXt5eHd2d3l6e319fHl3dnV0dHV4eXp8e3p4dnV0dHV2eXp8fXx7eXd3d3h5e31+gIB/fnx7ent8foCCg4SEg4KAf3+AgoOFh4iJiIeFg4KChIWHiYqLi4mI" +
"h4SDhIaHiYqLi4uIh4WDgoKFhoeIiYmIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
"gICAgICAgICAgICAgICAgICNkJKMioiFiYeEg3x+g4aPkJCGgH16f35+f3x/gYOKiIJ4dXJwcHd7foF9fXx/fHl2dGxtcHp9goN8end0eXd2dnJ1eYaIiYd+fHl3dnx/goWEh4iPjYqIfnx7fIWIjpGLi4qHiIWD" +
"gnx9f4uNj5CHhX57f359fX98f4GJiIZ5dnNxb3Z3fH56fX17fXp3bm1sbXl8f4N9fXl2e3h3dnd0d3uIiYqAfnt5d319gYSAfH+Cho2Lh4V7enl5e4iLjouLio2Kh4WDfH2BhI2RkpGGg4B9gYCAe36AhIyMiIV7" +
"eHVzcnp8f31+f3mEgHx3c2JhY2V8gIOIiHl3dHBtd3Z3fnR5goWVlZOQjXt5d3eHipOXmpCQjouHkYyFhHZ5fH+TlZWUkX97cW1qdXZ4cXR3eXp5hX56dmJhYmd5foKGiYt8end+fHp7fnR5foKGmZmYkoF9eXiH" +
"jJCUmI2Pj4yJkomFgnN0dnl8jZCRkH92cW10cnJ0dmxveX2CiIiWkY6LiHd2d3yOkpqdno6LiIONiYaDhHh+goSUlJGOiXZxamdneHt+d3l6d3R+enZzcGJjZ2+ChouLfHp3dHF7enyChn2GiYuamZeTjHt5eXqL" +
"k5eanJqZl42HgIJ+e3l7cHN2eXuJh4N5c25XVVVXWl9yfoOHfX17dXJve3t+goiOhpOXmqiloZeSjn17enuBhZabnJqFgHlzbGZhampsc3duc3V0cn15dW1qaV9jaHZ8kJWZmpuJhYJ8enqMkJWan5aZeX+Fj5GR" +
"nJiVjYt8fH6BhZ2hpKaloYiCe3VvbHd3en11eHp5dnJ7dXBrZGNWXWJog4eLjY6MinZzcG9xgo2TmZ+WmZuZlpGUkIyHh3p9gISHmZmXjomCZmFdWlxscHR5fXR1dG5qZm1sa21xZ217gYecnZ2YlJB/fHt7f4WN" +
"srm+wr+5nJGFeF9UTFhZW2dudWdscHFtaGJqY2BeYWhwZ3OAmaOqxsTBsqqhfXh1dXZ6f4qkqKiln4tqXlJHPjc0S1FibHeJen5/dYGOoaeqp7awoZmTj415e4aMkpy0sqmhlop9cE89OTc9Q2Fze4OIjI13b2lk" +
"W1lveYGLo6+6rbS3t6+nnZyTiX58fGpudHiBhIOPiH9pX1VONDI0P0lUgYyWo6WloomEf3Vyco2Tm662vsTHs7Cil4txe3FkYmFlaVpgbHByb394aWJcVVVFS1VgbIaRsb2/vrStkYmCfXl5fZejqq6zsq2SiH1w" +
"V0xCTUxPW2RtYWlwdXh2cn13c25wdHtveoaep7DNzMi5rqSZdYGOoaeqp7awoZmTjXl7gIaMkpy0sqmhln1wT0U9OTc9Q2Fze4OMjXdzb2lkW1lveYGLo6+6rbS3t6+nnZyTiX58fGpudHiBhIOPiH9pX1VONDI0" +
"P0lUgYyWo6WliYR/eXVyco2Tm662vsezsKuil4txe3FkYmFpWmBnbHByb394aWJcVVVFS1VgbIaRsb2/vrStkYmCfXl5fZejqq6zsq2SiH1wV0xCTUxPW2RtaXB1eHh2cn13c25wdG96hpKep7DNzMi5rqR1gY6Y" +
"oaeqp7awoZmTjXl7gIaMkpy0sqmhln1wT0U9OTc9Q2Fze4OMjXdzb2lkW1lveYGLo6+6tLe3tK+nnZyTiX58fG50eH6BhIOPiH9pX1U0MjQ4P0lUgYyWo6WliYR/eXVyco2Tm662vsezsKuil4txe3FkYmFpWmBn" +
"bHByb394aWJcVVVFVWBseYaRsb2/vrStkYJ9eXh5fZejqq6zsq2IfXBkV0xCTUxPW2RtaXB1eHh2cn13c25wdG96hpKep7DNzMi5rqR1gY6Yoaeqp7awoZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2Fze4OMjXdv" +
"aWRfW1lveYGLo6+6tLe3tK+nnZyTiX58fG50eH6BhIOPiH9pX1U0MjQ4P0lUgYyWo6WliYR/dXJydI2Tm662vsezsKKXi39xe3FkYmFpWmBscHJxb394aWJcVVVFVWBseYaRsb2/vrStkYJ9eXh5fZejqq6zsq2I" +
"fXBkV0xCTUxPW2RtaXB1eHZybX13c25wdG96hp6nsLXNzMi5rqR1gY6hp6qpp7awoZmTjXl7hoySmJy0sqmhln1wTz05Nzg9Q2Fze4OMjXdvaWRfW1lveYGLo6+6tLe3r6edqJyTiX58fG50eIGEg5WPiH9pX1U0" +
"MjQ/SVRggYyWo6WliYR/dXJydI2Tm662vsezsKKXi39xe3FkYmFpWmBscHJxb394aWJcVVVFVWBshpGxuL2/vrStkYJ9eXl9l52jqq6zsq2IfXBXTEJRTUxPW2RtaXB1eHZybX13c25wdG96hp6nsLXNzMi5rqR1" +
"gY6hp6qpp7awoZmTjXl7hoySnLSyr6mhln1wTz05Nz1DYWpze4OMjXdvaWRbWW9yeYGLo6+6tLe3r6edqJyTiX58fG50eIGEg5WPiH9pX1U0MjQ/SVRggYyWo6WliYR/dXJyjZObpK62vsezsKKXi3F7cWlkYmFp" +
"WmBscHJvf3hxaWJcVVVFVWBshpGxuL2/vrStkYJ9eXl9l52jqq6zsq2IfXBXTEJRTUxPW2RtaXB1eHZyfXdzb25wdG96hp6nsM3MyMG5rqR1gY6hp6qntrCooZmTjXl7hoySnLSyr6mhln1wTz05Nz1DYWpze4OM" +
"jXdvaWRbWW9yeYGLo6+6tLe3r6ednJOJg358fG50eIGEg4+If3RpX1U0MjQ/SVSBjJado6WliYR/dXJyjZObpK62vsezsKKXi3F7cWlkYmFpWmBscHJvf3hxaWJcVVVFVWBshpGxvb++urStkYJ9eXl9l6OqrrOz" +
"sq2IfXBXTEJNTE9UW2RtaXB1eHZyfXdzb25wdG96hp6nsM3MyMG5rqR1gY6hp6qntrCooZmTjXl7hoySnLSyqaGWin1wTz05Nz1DYXN7g4iMjXdvaWRbWW95gYuXo6+6tLe3r6ednJOJg358fG50eIGEg4+If3Rp" +
"X1U0MjQ/SVSBjJado6WliYR/dXJyjZObrra+xMezsKKXi3F7cWRiYWVpWmBscHJvf3hpYlxXVVVFVWBshpGxvb++urStkYJ9eXl9l6OqrrOzsq2IfXBXTEJNTE9UW2RtaXB1eHZyfXdzbnB0e296hp6nsM3MyLmu" +
"pJl1gY6hp6qntrChmZOPjXl7hoySnLSyqaGWin1wTz05Nz1DYXN7g4iMjXdvaWRbWW95gYuXo6+6tLe3r6ednJOJfnx8am50eIGEg4+If2lfVU40MjQ/SVSBjJajpaWiiYR/dXJyjZObrra+xMezsKKXi3F7cWRi" +
"YWVpWmBscHJvf3hpYlxXVVVFVWBshpGxvb++tK2RiYJ9eXl9l6OqrrOyrZKIfXBXTEJNTE9bZG1haXB1"}
}}
const FRAPPE: string = "// @label Frappe\n// @param tune    50    38    70    exp     Hz\n// @param start   420   120   2000  exp     Hz\n// @param sweep   55    15    160   exp     ms\n// @param decay   180   60    600   exp     ms\n// @param punch   0.5   0     1     linear\n// @param click   0.5   0     1     linear\n// @param drive   0.35  0     1     linear\n// @param volume  0.8   0     1     linear\n\n// La grosse caisse, en couches separees, chacune avec son role :\n// - le corps : une sinusoide qui tombe de \"start\" a \"tune\" en \"sweep\" ms puis\n//   tient sa note (\"decay\" = sa longueur). C'est le sub ;\n// - le coup dans la poitrine (\"punch\") : une chute de hauteur tres rapide\n//   (8 ms) ajoutee par-dessus, qui traverse les 100-200 Hz ;\n// - le claquement (\"click\") : 3 ms de bruit filtre vers 2 a 5 kHz, une couche\n//   a part, qui ne depend pas de la saturation ;\n// - la saturation (\"drive\"), en parallele : le corps propre et sa copie\n//   ecrasee sont additionnes, le grave reste net et les mediums gagnent de\n//   quoi exister sur de petites enceintes.\n// La sortie est ecretee en douceur : la pointe de l'attaque ne depasse pas\n// le corps de plus de quelques dB, pour que le limiteur final n'ait presque\n// rien a faire.\nclass Processor {\n    tune = 50\n    start = 420\n    sweepMs = 55\n    decayMs = 180\n    punch = 0.5\n    click = 0.5\n    drive = 0.35\n    volume = 0.8\n    phase = 0\n    amp = 0\n    envSweep = 0\n    envPunch = 0\n    envClick = 0\n    level = 0\n    seed = 24680\n    bandLow = 0\n    bandBand = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tune\": this.tune = value; break\n            case \"start\": this.start = value; break\n            case \"sweep\": this.sweepMs = value; break\n            case \"decay\": this.decayMs = value; break\n            case \"punch\": this.punch = value; break\n            case \"click\": this.click = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        // La phase repart toujours du meme point : chaque coup est identique\n        this.phase = 0\n        this.amp = 1\n        this.envSweep = 1\n        this.envPunch = 1\n        this.envClick = 1\n        this.level = velocity\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.amp = 0\n        this.envClick = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))\n        const kSweep = Math.exp(-1 / (this.sweepMs * 0.001 * 0.35 * sr))\n        const kPunch = Math.exp(-1 / (0.008 * sr))\n        const kClick = Math.exp(-1 / (0.003 * sr))\n        const gain = 1 + this.drive * 7\n        const wet = this.drive\n        const fClick = 2 * Math.sin(Math.PI * 3200 / sr)\n        const out = this.level * this.volume\n        const ratio = this.start / this.tune - 1\n        for (let s = block.s0; s < block.s1; s++) {\n            if (this.amp < 0.0002 && this.envClick < 0.0002) {continue}\n            const f = this.tune * (1 + ratio * this.envSweep) * (1 + 1.2 * this.punch * this.envPunch)\n            this.phase += f / sr\n            if (this.phase >= 1) {this.phase -= 1}\n            const body = Math.sin(twoPi * this.phase) * this.amp\n            // Saturation en parallele : corps propre + copie ecrasee\n            const sat = Math.tanh(body * gain) / Math.tanh(gain)\n            const low = body * (1 - 0.5 * wet) + sat * wet * 0.8\n            // Le claquement : bruit dans un passe-bande\n            this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n            const noise = (this.seed / 2147483648 - 1) * this.envClick\n            this.bandLow += fClick * this.bandBand\n            this.bandBand += fClick * (noise - this.bandLow - 0.9 * this.bandBand)\n            const tick = this.bandBand * this.click * 1.4\n            // Ecretage doux de la pointe\n            const x = (low + tick) * 1.15\n            const y = (x > 0.9 ? 0.9 + Math.tanh((x - 0.9) * 3) / 3 : x < -0.9 ? -0.9 + Math.tanh((x + 0.9) * 3) / 3 : x) * out\n            outL[s] += y\n            outR[s] += y\n            this.amp *= kAmp\n            this.envSweep *= kSweep\n            this.envPunch *= kPunch\n            this.envClick *= kClick\n        }\n    }\n}"
const GRONDEMENT: string = "// @label Grondement\n// @param tone    120   60    400   exp     Hz\n// @param body    46    35    90    exp     Hz\n// @param weight  0.6   0     1     linear\n// @param duck    0.95  0     1     linear\n// @param swell   120   20    400   exp     ms\n// @param hold    330   80    900   exp     ms\n// @param grit    0.25  0     1     linear\n// @param drive   0.5   0     1     linear\n// @param volume  0.7   0     1     linear\n\n// Le grondement : la masse de bruit grave qui roule entre deux coups de pied\n// dans la techno d'aujourd'hui. Ce n'est pas une note, c'est du bruit :\n// - un bruit passe au filtre passe-bas (\"tone\"), au centre, en mono ;\n// - une bosse resonante tout en bas (\"body\" = sa frequence, \"weight\" = sa\n//   force), qui lui donne du poids ;\n// - une couche de mediums ecrases vers 900 Hz (\"grit\"), tout bas, pour qu'il\n//   existe aussi sur de petites enceintes.\n// Il respire avec le pied. Le morceau lui envoie trois notes muettes :\n// - la note 12 a chaque coup de pied : le grondement s'efface (\"duck\"), puis\n//   enfle en \"swell\" ms, et se referme \"hold\" ms plus tard, avant le coup\n//   suivant, pour que le haut-parleur revienne au repos ;\n// - la note 13 sur le contretemps : une poussee en plus a cet endroit ;\n// - la note 14 : il reste ouvert jusqu'au prochain coup de pied (pour une fin\n//   de phrase ou l'entree d'un creux).\nclass Processor {\n    tone = 120\n    body = 46\n    weight = 0.6\n    duck = 0.95\n    swellMs = 120\n    holdMs = 330\n    grit = 0.25\n    drive = 0.5\n    volume = 0.7\n    seed = 13579\n    low = 0\n    band = 0\n    low2 = 0\n    band2 = 0\n    bLow = 0\n    bBand = 0\n    gLow = 0\n    gBand = 0\n    gate = 0\n    gateTarget = 0\n    left = 0\n    dip = 0\n    bump = 0\n    level = 1\n    paramChanged(name, value) {\n        switch (name) {\n            case \"tone\": this.tone = value; break\n            case \"body\": this.body = value; break\n            case \"weight\": this.weight = value; break\n            case \"duck\": this.duck = value; break\n            case \"swell\": this.swellMs = value; break\n            case \"hold\": this.holdMs = value; break\n            case \"grit\": this.grit = value; break\n            case \"drive\": this.drive = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch === 13) {\n            this.bump = 1\n            return\n        }\n        if (pitch === 14) {\n            this.gateTarget = 1\n            this.left = Math.round(4 * sampleRate)\n            return\n        }\n        this.dip = 1\n        this.gateTarget = 1\n        this.left = Math.round(this.holdMs * 0.001 * sampleRate)\n        this.level = velocity\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.gate = 0\n        this.gateTarget = 0\n        this.left = 0\n        this.dip = 0\n        this.bump = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        if (this.gateTarget === 0 && this.gate < 0.0003) {\n            this.gate = 0\n            return\n        }\n        const fTone = 2 * Math.sin(Math.PI * this.tone / sr)\n        const fBody = 2 * Math.sin(Math.PI * this.body / sr)\n        const fGrit = 2 * Math.sin(Math.PI * 900 / sr)\n        // Le bruit filtre sort d'autant plus faible que le filtre est grave : on compense\n        const compTone = Math.sqrt(1.5 / fTone)\n        const compBody = Math.sqrt(0.25 / fBody) * 0.5\n        const kDip = Math.exp(-1 / (this.swellMs * 0.001 * sr))\n        const kBump = Math.exp(-1 / (0.090 * sr))\n        const kOpen = 1 - Math.exp(-1 / (0.012 * sr))\n        const kClose = 1 - Math.exp(-1 / (0.030 * sr))\n        const gain = 1 + this.drive * 5\n        const norm = this.volume / Math.tanh(gain)\n        for (let s = block.s0; s < block.s1; s++) {\n            this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n            const x = this.seed / 2147483648 - 1\n            // Passe-bas a quatre poles (deux etages) : presque rien ne passe au-dessus\n            this.low += fTone * this.band\n            this.band += fTone * (x - this.low - 1.1 * this.band)\n            this.low2 += fTone * this.band2\n            this.band2 += fTone * (this.low - this.low2 - 1.1 * this.band2)\n            // La bosse du bas : un passe-bande etroit\n            this.bLow += fBody * this.bBand\n            this.bBand += fBody * (x - this.bLow - 0.25 * this.bBand)\n            // Les mediums : un passe-bande vers 900 Hz\n            this.gLow += fGrit * this.gBand\n            this.gBand += fGrit * (x - this.gLow - 0.6 * this.gBand)\n            // La respiration\n            if (this.left > 0) {\n                this.left--\n                if (this.left === 0) {this.gateTarget = 0}\n            }\n            this.gate += (this.gateTarget - this.gate) * (this.gateTarget > this.gate ? kOpen : kClose)\n            this.dip *= kDip\n            this.bump *= kBump\n            const env = this.gate * (1 - this.duck * this.dip) * (1 + 0.6 * this.bump) * this.level\n            const mass = this.low2 * compTone * 1.3 + this.bBand * compBody * this.weight * 2\n            const y = Math.tanh(mass * env * gain * 0.5) * norm +\n                Math.tanh(this.gBand * 3 * env) * this.grit * this.volume * 0.25\n            outL[s] += y\n            outR[s] += y\n        }\n    }\n}"
const ACCORD: string = "// @label Accord\n// @param decay   180   40    1500  exp     ms\n// @param cutoff  500   100   6000  exp     Hz\n// @param envmod  2.5   0     5     linear\n// @param fdecay  90    20    800   exp     ms\n// @param reso    0.35  0     0.95  linear\n// @param detune  12    0     40    linear  ct\n// @param width   0.7   0     1     linear\n// @param duck    0.5   0     1     linear\n// @param volume  0.6   0     1     linear\n\n// L'accord dub : un coup sec que l'echo prolonge. Chaque note de l'accord est\n// faite de trois dents de scie a peine desaccordees (\"detune\", en cents),\n// une a gauche, une au centre, une a droite (\"width\") : leur battement donne\n// un son large et vivant sans rien automatiser. Tout l'accord passe dans un\n// meme filtre passe-bas qui part ouvert et se referme (\"cutoff\" = ou il\n// retombe, \"envmod\" = de combien d'octaves il part au-dessus, \"fdecay\" = en\n// combien de temps) : brillant a l'attaque, sombre ensuite.\n// Le son s'eteint tout seul en \"decay\" ms, quelle que soit la duree ecrite.\n// Une note plus forte ouvre davantage le filtre.\n// \"duck\" : toute note plus grave que 24 ne sonne pas, elle fait plonger le\n// son (le morceau en envoie une a chaque coup de pied).\nclass Processor {\n    decayMs = 180\n    cutoff = 500\n    envmod = 2.5\n    fdecayMs = 90\n    reso = 0.35\n    detune = 12\n    width = 0.7\n    duck = 0.5\n    volume = 0.6\n    voices = []\n    amp = 0\n    attack = 0\n    envFilter = 0\n    level = 1\n    since = 100000\n    lowL = 0\n    bandL = 0\n    lowR = 0\n    bandR = 0\n    dip = 0\n    dipSmooth = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"decay\": this.decayMs = value; break\n            case \"cutoff\": this.cutoff = value; break\n            case \"envmod\": this.envmod = value; break\n            case \"fdecay\": this.fdecayMs = value; break\n            case \"reso\": this.reso = value; break\n            case \"detune\": this.detune = value; break\n            case \"width\": this.width = value; break\n            case \"duck\": this.duck = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        if (pitch < 24) {\n            this.dip = 1\n            return\n        }\n        // Des notes qui arrivent ensemble forment un accord ; sinon c'est un nouveau coup\n        if (this.since > 0.02 * sampleRate) {this.voices = []}\n        this.since = 0\n        const f0 = 440 * Math.pow(2, (pitch - 69 + cent / 100) / 12)\n        const d = Math.pow(2, this.detune / 1200)\n        if (this.voices.length >= 6) {this.voices.shift()}\n        this.voices.push({freqs: [f0 / d, f0, f0 * d], phases: [0.13, 0.5, 0.81]})\n        this.amp = 1\n        this.attack = 0\n        this.envFilter = 1\n        this.level = velocity\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.voices = []\n        this.amp = 0\n        this.dip = 0\n        this.dipSmooth = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        this.since += block.s1 - block.s0\n        if (this.voices.length === 0) {return}\n        const kAmp = Math.exp(-1 / (this.decayMs * 0.001 * sr))\n        const kFilter = Math.exp(-1 / (this.fdecayMs * 0.001 * sr))\n        const kDip = Math.exp(-1 / (0.110 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.003 * sr))\n        const attackStep = 1 / (0.002 * sr)\n        const damp = 1.6 - 1.5 * this.reso\n        const open = this.envmod * (0.6 + 0.4 * this.level)\n        const side = 0.5 + 0.5 * this.width\n        const norm = 0.5 * this.volume / Math.sqrt(this.voices.length)\n        for (let s = block.s0; s < block.s1; s++) {\n            let left = 0, mid = 0, right = 0\n            for (const v of this.voices) {\n                for (let k = 0; k < 3; k++) {\n                    const dt = v.freqs[k] / sr\n                    let p = v.phases[k] + dt\n                    if (p >= 1) {p -= 1}\n                    v.phases[k] = p\n                    // Dent de scie dont on arrondit la marche (pas de repliement dans l'aigu)\n                    let y = 2 * p - 1\n                    if (p < dt) {const t = p / dt; y -= t + t - t * t - 1}\n                    else if (p > 1 - dt) {const t = (p - 1) / dt; y -= t * t + t + t + 1}\n                    if (k === 0) {left += y} else if (k === 1) {mid += y} else {right += y}\n                }\n            }\n            const inL = mid * 0.7 + left * side + right * (1 - side)\n            const inR = mid * 0.7 + right * side + left * (1 - side)\n            const fc = Math.min(this.cutoff * Math.pow(2, open * this.envFilter), sr / 6.5)\n            const g = 2 * Math.sin(Math.PI * fc / sr)\n            this.lowL += g * this.bandL\n            this.bandL += g * (inL - this.lowL - damp * this.bandL)\n            this.lowR += g * this.bandR\n            this.bandR += g * (inR - this.lowR - damp * this.bandR)\n            if (this.attack < 1) {this.attack = Math.min(1, this.attack + attackStep)}\n            this.dip *= kDip\n            this.dipSmooth += (this.dip - this.dipSmooth) * kSmooth\n            const a = this.amp * this.attack * this.level * norm * (1 - this.duck * this.dipSmooth)\n            outL[s] += Math.tanh(this.lowL * 0.8) * a\n            outR[s] += Math.tanh(this.lowR * 0.8) * a\n            this.amp *= kAmp\n            this.envFilter *= kFilter\n        }\n        if (this.amp < 0.0003) {this.voices = []}\n    }\n}"
const CYMBALE: string = "// @label Cymbale\n// @param decay   45    10    300   exp     ms\n// @param open    6     2     14    linear\n// @param tone    7000  3000  12000 exp     Hz\n// @param metal   0.5   0     1     linear\n// @param drift   0.5   0     1     linear\n// @param width   0.5   0     1     linear\n// @param volume  0.6   0     1     linear\n\n// Les charleys de synthese. Un charley, c'est du bruit et du metal : ici six\n// ondes carrees a des rapports qui ne tombent pas juste (le principe des\n// boites a rythmes), melangees a du bruit blanc (\"metal\" = la part de metal),\n// puis passees dans un filtre passe-haut (\"tone\") qui n'en garde que le haut.\n// Les notes 46 et au-dessus sont des charleys ouverts : \"open\" fois plus longs.\n// Un coup coupe le precedent, comme une vraie pedale.\n// Comme sur un instrument, un coup plus fort est plus long et plus clair.\n// \"drift\" le fait vivre : une horloge lente allonge et raccourcit les coups\n// sur quelques mesures, un coup sur deux est un rien plus sombre, et chaque\n// coup sort a un endroit legerement different (\"width\").\nclass Processor {\n    decayMs = 45\n    open = 6\n    tone = 7000\n    metal = 0.5\n    drift = 0.5\n    width = 0.5\n    volume = 0.6\n    amp = 0\n    kAmp = 0.99\n    attack = 0\n    level = 0\n    bright = 1\n    left = 0.7\n    right = 0.7\n    count = 0\n    seed = 97531\n    lfo = 0\n    phases = [0, 0, 0, 0, 0, 0]\n    x1 = 0\n    x2 = 0\n    y1 = 0\n    y2 = 0\n    u1 = 0\n    u2 = 0\n    v1 = 0\n    v2 = 0\n    soft = 0\n    paramChanged(name, value) {\n        switch (name) {\n            case \"decay\": this.decayMs = value; break\n            case \"open\": this.open = value; break\n            case \"tone\": this.tone = value; break\n            case \"metal\": this.metal = value; break\n            case \"drift\": this.drift = value; break\n            case \"width\": this.width = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        const sr = sampleRate\n        this.count++\n        const sway = Math.sin(2 * Math.PI * this.lfo)\n        const long = pitch >= 46 ? this.open : 1\n        const ms = this.decayMs * long * (0.6 + 0.6 * velocity) * (1 + 0.3 * this.drift * sway)\n        this.kAmp = Math.exp(-1 / (ms * 0.001 * sr))\n        this.amp = 1\n        this.attack = 0\n        this.level = velocity\n        // Un coup sur deux un rien plus sombre ; un coup fort plus clair\n        this.bright = (0.8 + 0.4 * velocity) * (1 - 0.12 * this.drift * (this.count % 2))\n        const place = (((this.count * 0.6180339887) % 1) * 2 - 1) * this.width\n        const angle = (1 + place * 0.5) * Math.PI / 4\n        this.left = Math.cos(angle)\n        this.right = Math.sin(angle)\n    }\n    noteOff(id) {\n    }\n    reset() {\n        this.amp = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        this.lfo += 0.07 * (block.s1 - block.s0) / sr\n        if (this.lfo >= 1) {this.lfo -= 1}\n        if (this.amp < 0.0003) {return}\n        // Les six carres : les rapports d'une vieille boite a rythmes, montes de deux octaves\n        const base = 4 / sr\n        const steps = [205.3 * base, 304.4 * base, 369.6 * base, 522.7 * base, 540 * base, 800 * base]\n        // Passe-haut du second ordre, deux etages : stable jusqu en haut du spectre\n        const fc = Math.min(this.tone * this.bright, sr * 0.42)\n        const w = 2 * Math.PI * fc / sr\n        const alpha = Math.sin(w) / 1.414\n        const cw = Math.cos(w)\n        const a0 = 1 + alpha\n        const b0 = (1 + cw) / 2 / a0\n        const b1 = -(1 + cw) / a0\n        const a1 = -2 * cw / a0\n        const a2 = (1 - alpha) / a0\n        // Un passe-bas doux vers 13 kHz : une vraie cymbale ne monte pas jusqu au bout\n        const kSoft = 1 - Math.exp(-2 * Math.PI * 13000 / sr)\n        const attackStep = 1 / (0.0006 * sr)\n        const norm = this.volume * 0.9\n        for (let s = block.s0; s < block.s1; s++) {\n            let sq = 0\n            for (let k = 0; k < 6; k++) {\n                let p = this.phases[k] + steps[k]\n                if (p >= 1) {p -= 1}\n                this.phases[k] = p\n                sq += p < 0.5 ? 1 : -1\n            }\n            this.seed = (this.seed * 1664525 + 1013904223) >>> 0\n            const noise = this.seed / 2147483648 - 1\n            const x = sq / 6 * this.metal * 1.6 + noise * (1 - this.metal)\n            const h = b0 * x + b1 * this.x1 + b0 * this.x2 - a1 * this.y1 - a2 * this.y2\n            this.x2 = this.x1\n            this.x1 = x\n            this.y2 = this.y1\n            this.y1 = h\n            const h2 = b0 * h + b1 * this.u1 + b0 * this.u2 - a1 * this.v1 - a2 * this.v2\n            this.u2 = this.u1\n            this.u1 = h\n            this.v2 = this.v1\n            this.v1 = h2\n            this.soft += (h2 - this.soft) * kSoft\n            if (this.attack < 1) {this.attack = Math.min(1, this.attack + attackStep)}\n            const y = this.soft * this.amp * this.attack * this.level * norm\n            outL[s] += y * this.left\n            outR[s] += y * this.right\n            this.amp *= this.kAmp\n        }\n    }\n}"
const SOUFFLE: string = "// @label Souffle\n// @param freq    600   80    8000  exp     Hz\n// @param reso    0.6   0     1     linear\n// @param drift   0.5   0     1     linear\n// @param volume  0.5   0     1     linear\n\n// Le souffle : du bruit dans un filtre passe-bande, un par oreille. \"freq\" est\n// la hauteur du souffle, \"reso\" son etroitesse (0 = vent large, 1 = sifflement).\n// \"drift\" le fait vivre : la hauteur ondule lentement et le son passe d'une\n// oreille a l'autre, sur trois horloges qui ne se rejoignent jamais.\n// Faire monter \"freq\" et \"volume\" ensemble, c'est une montee.\n// Sonne tant qu'une note est tenue (la hauteur de la note est ignoree).\nclass Processor {\n    freq = 600\n    reso = 0.6\n    drift = 0.5\n    volume = 0.5\n    held = 0\n    env = 0\n    smooth = 600\n    seedL = 22222\n    seedR = 77777\n    lowL = 0\n    bandL = 0\n    lowR = 0\n    bandR = 0\n    lfoA = 0\n    lfoB = 0.3\n    lfoC = 0.6\n    paramChanged(name, value) {\n        switch (name) {\n            case \"freq\": this.freq = value; break\n            case \"reso\": this.reso = value; break\n            case \"drift\": this.drift = value; break\n            case \"volume\": this.volume = value; break\n        }\n    }\n    noteOn(pitch, velocity, cent, id) {\n        this.held++\n    }\n    noteOff(id) {\n        if (this.held > 0) {this.held--}\n    }\n    reset() {\n        this.held = 0\n        this.env = 0\n        this.lowL = 0\n        this.bandL = 0\n        this.lowR = 0\n        this.bandR = 0\n    }\n    process(output, block) {\n        const [outL, outR] = output\n        const sr = sampleRate\n        const twoPi = 2 * Math.PI\n        const target = this.held > 0 ? 1 : 0\n        if (target === 0 && this.env < 0.0002) {\n            this.env = 0\n            return\n        }\n        const kEnv = 1 - Math.exp(-1 / (0.6 * sr))\n        const kSmooth = 1 - Math.exp(-1 / (0.05 * sr))\n        const n = block.s1 - block.s0\n        // Les trois horloges lentes : une fois par bloc suffit\n        this.lfoA += 0.07 * n / sr\n        if (this.lfoA >= 1) {this.lfoA -= 1}\n        this.lfoB += 0.11 * n / sr\n        if (this.lfoB >= 1) {this.lfoB -= 1}\n        this.lfoC += 0.045 * n / sr\n        if (this.lfoC >= 1) {this.lfoC -= 1}\n        const wander = Math.pow(2, 0.35 * this.drift * Math.sin(twoPi * this.lfoC))\n        const ampL = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoA))\n        const ampR = 1 - 0.45 * this.drift * (1 + Math.sin(twoPi * this.lfoB))\n        const damp = 1.2 - 1.1 * this.reso\n        for (let s = block.s0; s < block.s1; s++) {\n            this.smooth += (this.freq - this.smooth) * kSmooth\n            const fc = Math.min(this.smooth * wander, sr / 7)\n            const f = 2 * Math.sin(Math.PI * fc / sr)\n            // Le bruit filtre sort d'autant plus faible que le filtre est grave\n            // et large : on compense pour que le niveau reste le meme\n            const comp = Math.sqrt(6 * damp / f) * 0.22\n            this.env += (target - this.env) * kEnv\n            this.seedL = (this.seedL * 1664525 + 1013904223) >>> 0\n            this.seedR = (this.seedR * 1664525 + 1013904223) >>> 0\n            const xL = this.seedL / 2147483648 - 1\n            const xR = this.seedR / 2147483648 - 1\n            this.lowL += f * this.bandL\n            this.bandL += f * (xL - this.lowL - damp * this.bandL)\n            this.lowR += f * this.bandR\n            this.bandR += f * (xR - this.lowR - damp * this.bandR)\n            const a = comp * this.env * this.volume\n            outL[s] += Math.tanh(this.bandL * a * ampL)\n            outR[s] += Math.tanh(this.bandR * a * ampR)\n        }\n    }\n}"

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

let seed = 20261115
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296 * 2 - 1
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (La, 110 Hz).
// Ici on les decode, on les reechantillonne (et on les transpose au besoin).
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
 * commande la meme bande d'un accord en dents de scie (La, Mi, La, et un Mi
 * plus haut). Le mot garde ses voyelles et ses consonnes, mais il chante
 * l'accord. Du bruit dans les quatre bandes du haut rend les sifflantes.
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

/** Une reverb longue, pour l'aspiration : six peignes amortis et deux passe-tout. */
function reverbe(x: Float32Array, tail: number, rt: number): Float32Array {
    const n = x.length + Math.floor(tail * sr)
    const out = new Float32Array(n)
    for (const d of [0.0353, 0.0367, 0.0338, 0.0322, 0.0297, 0.0411]) {
        const len = Math.floor(d * sr)
        const buf = new Float32Array(len)
        const g = Math.pow(10, -3 * d / rt)
        let idx = 0, lp = 0
        for (let i = 0; i < n; i++) {
            const y = buf[idx]
            lp += (y - lp) * 0.45
            buf[idx] = (i < x.length ? x[i] : 0) + lp * g
            idx++
            if (idx >= len) {idx = 0}
            out[i] += y
        }
    }
    for (const d of [0.0051, 0.0017]) {
        const len = Math.floor(d * sr)
        const buf = new Float32Array(len)
        let idx = 0
        for (let i = 0; i < n; i++) {
            const b = buf[idx]
            const v = out[i] + b * 0.5
            buf[idx] = v
            out[i] = b - v * 0.5
            idx++
            if (idx >= len) {idx = 0}
        }
    }
    return out
}

// [mot, position en temps, demi-tons, duree max en temps (0 = mot entier)]
type Dit = [string, number, number, number]
/** nue = 1 : la voix de SAM ; voc = 1 : le vocodeur ; les deux se melangent. */
async function phrase(label: string, dits: Dit[], nue: number, voc: number) {
    let total = 0
    const parts = dits.map(d => {
        const raw = norme(mot(d[0], d[2]), 1)
        const buf = new Float32Array(raw.length)
        const v = voc > 0 ? vocode(raw, 110 * Math.pow(2, d[2] / 12)) : null
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
        for (let i = 0; i < p.len; i++) {
            f[p.start + i] += p.buf[i] * Math.min(1, i / 48, (p.len - i) / fade)
        }
    }
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}

// "Danger." : la voix nue, puis la meme en accord
const vUn = await phrase("D2 Danger", [["danger", 0, 0, 0]], 1, 0)
const vUnAccord = await phrase("D2 Danger en accord", [["danger", 0, 0, 0]], 0.25, 1)
// "Danger, danger." - le second un demi-ton au-dessus : la seconde mineure
const vDeux = await phrase("D2 Danger danger", [["danger", 0, 0, 0], ["danger", 2, 1, 0]], 1, 0)
const vDeuxAccord = await phrase("D2 Danger danger en accord", [["danger", 0, 0, 0], ["danger", 2, 1, 0]], 0.25, 1)
// "Let's go faster." : les deux voix ensemble
const vGo = await phrase("D2 Lets go faster", [["letsgo", 0, 0, 0], ["faster", 2, 0, 0]], 0.7, 0.7)
// "D-d-d-d-DANGER" : quatre amorces en doubles-croches, le mot tombe sur le temps
const vBegaie = await phrase("D2 D-d-d-danger", [
    ["danger", 0, 0, 0.22], ["danger", 0.25, 0, 0.22], ["danger", 0.5, 0, 0.22], ["danger", 0.75, 0, 0.22],
    ["danger", 1, 0, 0]
], 1, 0.35)
// "Faster" qui accelere pour de bon : l'ecart entre deux mots passe de 300 ms
// a 36 ms en trois temps, et la voix grimpe d'un demi-ton tous les deux mots
const accelere: Dit[] = []
{
    const count = 13
    const ratio = Math.pow(0.036 / 0.30, 1 / (count - 1))
    let gap = 0.30, sum = 0
    for (let k = 0; k < count; k++) {sum += gap; gap *= ratio}
    const scale = 2.95 * beatSec / sum
    let at = 0
    gap = 0.30
    for (let k = 0; k < count; k++) {
        accelere.push(["faster", at * scale / beatSec, Math.floor(k / 2), gap * scale / beatSec * 0.96])
        at += gap
        gap *= ratio
    }
}
const vVite = await phrase("D2 Faster qui accelere", accelere, 0.8, 0.5)

/** L'aspiration : "danger" en accord, noye dans la reverb, puis retourne. */
async function aspiration(label: string, seconds: number) {
    const dry = vocode(norme(mot("danger", 0), 1), 110)
    const wet = reverbe(dry, seconds + 0.6, 4)
    const n = Math.floor(seconds * sr)
    const skip = Math.floor(0.09 * sr)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    for (let i = 0; i < n; i++) {
        const t = i / n
        // On lit la queue a l'envers : elle enfle au lieu de s'eteindre
        f[i] = wet[skip + n - 1 - i] * t * Math.min(1, (n - i) / (sr * 0.006))
    }
    norme(f, 0.9)
    return await openDAW.addSample(audio, label)
}
const aspireLong = await aspiration("D2 Aspiration longue", barSec * 2)
const aspireCourt = await aspiration("D2 Aspiration courte", barSec)

/** Impact : un coup sourd qui descend, et un souffle court. */
function makeImpact() {
    const n = Math.floor(sr * 1.8)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let phase = 0, lp = 0
    for (let i = 0; i < n; i++) {
        const t = i / sr
        const freq = 30 + 80 * Math.exp(-t * 6)
        phase += freq / sr
        const boom = Math.sin(phase * 2 * Math.PI) * Math.exp(-t * 3.2)
        lp += (rnd() - lp) * (0.02 + 0.4 * Math.exp(-t * 5))
        const air = lp * Math.exp(-t * 4) * 0.4
        const fade = Math.min(1, (n - i) / (sr * 0.05))
        f[i] = Math.tanh((boom * 0.9 + air) * 1.5) * 0.8 * fade
    }
    return audio
}
const impact = await openDAW.addSample(makeImpact(), "D2 Impact")

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Danger Danger v2")
project.bpm = BPM

// Une reverb courte, pour le clap et la caisse claire seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.4, damping: 0.5, preDelay: 8, wet: 0, dry: -60} as any)

// Des blocs de 16 mesures (29 secondes), un creux de 8 et un trou de 4.
const SECTIONS = [
    {name: "Intro", start: 0, bars: 16},
    {name: "Montee", start: 16, bars: 16},
    {name: "Groove", start: 32, bars: 16},
    {name: "Break", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 16},
    {name: "Plus", start: 72, bars: 16},
    {name: "Trou", start: 88, bars: 4},
    {name: "Final", start: 92, bars: 16},
    {name: "Sommet", start: 108, bars: 16},
    {name: "Sortie", start: 124, bars: 16}
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
    for (let bar = 0; bar <= TOTAL; bar += 1) {
        while (next < trend.length && trend[next][0] <= bar) {
            out.push([trend[next][0], clamp(trend[next][1] + wave(trend[next][0]))])
            next++
        }
        if (!trend.some(p => p[0] === bar)) {out.push([bar, clamp(at(bar) + wave(bar))])}
    }
    return out
}

// ---------- La carte du morceau ----------
/** Les creux : le pied se tait. */
const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 92)
/** Le bloc qui demarre sans ses graves, une mesure, pour surprendre. */
const sansGraves = (bar: number) => bar === 72
/** Le passage nu : le pied, le grondement et la 303 seulement. */
const nu = (bar: number) => bar >= 108 && bar < 112
const tourne = (bar: number) => bar < 136 && !inBreak(bar)
const kickOn = (bar: number) => tourne(bar) && !sansGraves(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 92 && bar < 124)
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 91
const limite = (bar: number) => avantDrop(bar) ? 12 : 16
/** Derniere mesure d'un bloc : une relance. */
const finDeBloc = (bar: number) => [15, 31, 47, 71, 87, 107, 123].includes(bar)
/** Place dans la phrase de quatre mesures. */
const rang = (bar: number) => bar % 4

/** Les coups de pied d'une mesure : [pas, velocite]. */
function kicks(bar: number): number[][] {
    if (!kickOn(bar)) {return []}
    // Le pied garde de la reserve jusqu aux drops
    const v = bar < 16 || bar >= 124 ? 0.82 : drop(bar) ? 1 : 0.9
    const out = [[0, v], [4, v], [8, v], [12, v]]
    // Avant le groove, le pied lache son dernier temps : le bloc suivant tombe plus fort
    return bar === 31 ? out.filter(k => k[0] < 12) : out
}
/** La note 12 ne sonne pas : elle fait plonger l'instrument a chaque coup de pied. */
const plongeons = (bar: number): Note[] =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: 1}))

// ---------- Frappe : la grosse caisse ----------
const kick = apparat("Frappe", FRAPPE, -5)
reglages("frappe", kick, {tune: 52, start: 380, sweep: 50, decay: 150, punch: 0.6, click: 0.7, drive: 0.4})
build(kick.noteTracks[0], "Frappe", bar =>
    kicks(bar).map(k => ({position: k[0] * S16, duration: S16, pitch: 36, velocity: k[1]})))
// Le pied arrive sourd et gagne son claquement en huit mesures ; il se durcit au final
auto("frappe", kick, "click", [[0, 0.15], [8, 0.7], [92, 0.7], [108, 0.85], [124, 0.7], [136, 0.3], [140, 0.3]])
auto("frappe", kick, "drive", [[0, 0.3], [56, 0.4], [92, 0.5], [124, 0.45], [140, 0.3]])

// ---------- Grondement : la masse grave qui roule entre les coups ----------
const rumble = apparat("Grondement", GRONDEMENT, -13)
reglages("grondement", rumble, {
    tone: 115, body: 46, weight: 0.6, duck: 0.95, swell: 110, hold: 330, grit: 0.3, drive: 0.5
})
build(rumble.noteTracks[0], "Grondement", bar => {
    const out: Note[] = []
    for (const k of kicks(bar)) {
        // La note 12 a chaque coup de pied, la note 13 sur le contretemps qui suit
        out.push({position: k[0] * S16, duration: S16 / 2, pitch: 12, velocity: bar < 8 ? 0.6 : k[1]})
        if (bar >= 16) {out.push({position: (k[0] + 2) * S16, duration: S16 / 2, pitch: 13, velocity: 1})}
    }
    // A l'entree d'un creux, il reste ouvert : la chute
    if (bar === 48 || bar === 88) {out.push({position: 0, duration: S16, pitch: 14, velocity: 0.8})}
    return out
})
// tone 60..400 Hz (90 Hz = 0.21, 115 = 0.34, 150 = 0.48) : il s'eclaircit au fil du morceau
auto("grondement", rumble, "tone", vague([
    [0, 0.21], [16, 0.30], [56, 0.34], [92, 0.42], [124, 0.36], [140, 0.21]
], 24, 0.04))
auto("grondement", rumble, "grit", [[0, 0.15], [56, 0.3], [92, 0.45], [124, 0.3], [140, 0.15]])

// ---------- Les deux 303 ----------
const N = null
// steps : demi-tons au-dessus de la note de base. 1 = Si bemol, 6 = Mi bemol.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// P0 : le squelette, trois contre quatre. P1 : le motif. P2 : sa fin de phrase.
// P3 : le sommet, une octave plus haut. P4 : le creux, de longues notes liees.
const P0: Pattern = {steps: [0, N, N, 0, N, N, 0, N, N, 0, N, N, 0, N, 1, N], accents: [12], slides: []}
const P1: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 12, 0, N, 3, 0, 13, 12, -12], accents: [2, 8, 13], slides: [6, 13]}
const P2: Pattern = {steps: [0, 12, 0, 0, 6, 0, 12, N, 0, 0, 15, 12, 13, 12, 3, 1], accents: [4, 10, 12], slides: [10, 12, 14]}
const P3: Pattern = {steps: [12, 0, 12, 13, N, 12, 0, 12, 15, 12, N, 18, 12, 13, 0, 24], accents: [3, 8, 11, 15], slides: [3, 8, 11]}
const P4: Pattern = {steps: [0, N, N, N, 12, N, N, 1, N, N, 0, N, N, N, 13, 12], accents: [4, 14], slides: [14]}
// Seconde 303 : motif de 12 pas qui tourne contre la mesure de 16 (le seul polymetre)
const PD: Pattern = {steps: [0, N, 0, 1, N, 0, N, 12, 0, N, 3, N], accents: [7], slides: [3]}

function acidNote(pattern: Pattern, index: number, step: number, base: number): Note {
    const slide = pattern.slides.includes(index)
    return {
        position: step * S16,
        // Une note liee deborde sur la suivante : c'est le recouvrement qui
        // declenche le glissando dans la 303
        duration: Math.round(S16 * (slide ? 1.3 : 0.6)),
        pitch: base + (pattern.steps[index] as number),
        // L'accent de cette 303 se declenche a velocite 1.0 pile ; les autres
        // notes sont plus douces, pour que l'accent ressorte
        velocity: pattern.accents.includes(index) ? 1.0 : 0.62
    }
}

const acid = apparat("Acide", TB303, -3)
reglages("acide", acid, {cutoff: 70, resonance: 0.85, envmod: 0.3, decay: 300, accent: 1.0})
// Saturation en parallele : le son propre reste, sa copie ecrasee s'ajoute
essai("saturation acide", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.7} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -19})

build(acid.noteTracks[0], "Acide", bar => {
    let pattern: Pattern | null = null
    if (bar >= 8 && bar < 16) {pattern = P0}
    else if (bar >= 16 && bar < 48) {pattern = rang(bar) === 3 ? P2 : P1}
    else if (bar >= 48 && bar < 52) {pattern = null}
    else if (bar >= 52 && bar < 56) {pattern = P4}
    else if (bar >= 56 && bar < 88) {pattern = rang(bar) === 3 ? P2 : P1}
    else if (bar >= 90 && bar < 92) {pattern = P4}
    else if (bar >= 92 && bar < 124) {pattern = rang(bar) === 3 ? P2 : bar >= 112 && rang(bar) === 1 ? P3 : bar < 108 && rang(bar) === 1 ? P3 : P1}
    else if (bar >= 124 && bar < 132) {pattern = P1}
    else if (bar >= 132 && bar < 136) {pattern = P0}
    if (pattern === null) {return []}
    const out: Note[] = []
    for (let step = 0; step < limite(bar); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, step, 45))
    }
    return out
})

// Le filtre raconte le morceau : une pente lente qui ne revient jamais a
// zero hors des creux. Valeurs 0..1 sur la plage declaree par la 303.
auto("acide", acid, "cutoff", vague([
    [0, 0.05], [8, 0.05], [16, 0.12], [32, 0.32], [48, 0.52],
    [48, 0.10], [52, 0.10], [55.75, 0.90], [56, 0.78], [72, 0.86], [88, 0.94],
    [88, 0.15], [91.75, 0.95], [92, 0.90], [108, 0.97], [124, 1.0], [132, 0.35], [140, 0.05]
], 12, 0.05))
auto("acide", acid, "envmod", vague([
    [0, 0.10], [16, 0.22], [32, 0.42], [48, 0.55], [48, 0.25], [55.75, 0.62], [56, 0.75],
    [88, 0.86], [88, 0.30], [92, 0.90], [124, 0.95], [132, 0.30], [140, 0.15]
], 20, 0.05))
auto("acide", acid, "resonance", vague([
    [0, 0.75], [32, 0.82], [48, 0.88], [52, 0.95], [56, 0.88], [88, 0.92], [90, 0.97], [92, 0.90],
    [124, 0.92], [140, 0.75]
], 28, 0.02))
// La longueur des notes ondule sur deux mesures, a peine : dense, puis claire
auto("acide", acid, "decay", vague([
    [0, 0.10], [32, 0.20], [48, 0.25], [48, 0.70], [56, 0.30], [72, 0.40], [88, 0.50],
    [88, 0.80], [92, 0.45], [124, 0.50], [132, 0.20], [140, 0.10]
], 2, 0.04))
// Le niveau de la 303 retombe a l entree des creux : un creux doit etre un vrai creux
auto("acide", acid, "volume", [
    [0, 0.62], [48, 0.66], [48, 0.35], [52, 0.45], [55.75, 0.70], [88, 0.70],
    [88, 0.40], [91.75, 0.70], [124, 0.70], [136, 0.5], [140, 0.5]
])

const acid2 = apparat("Acide carree", TB303, -8, 0.25)
reglages("acide carree", acid2, {waveform: 1, cutoff: 150, resonance: 0.9, envmod: 0.5, decay: 300, accent: 1.0})
acid2.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.5, wet: -10})
build(acid2.noteTracks[0], "Acide carree", bar => {
    const on = (bar >= 73 && bar < 88) || (bar >= 112 && bar < 124)
    if (!on) {return []}
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        const index = ((bar - 72) * 16 + step) % 12
        if (PD.steps[index] === null) {continue}
        out.push(acidNote(PD, index, step, 57))
    }
    return out
})
auto("acide carree", acid2, "cutoff", vague([
    [0, 0.30], [72, 0.30], [88, 0.70], [108, 0.50], [124, 0.92], [140, 0.40]
], 10, 0.06))

// ---------- Accord dub : un coup sec, l'echo fait le reste ----------
// La mineur septieme ; en fin de phrase, Si bemol : la menace.
const AM7 = [57, 60, 64, 67]
const BB = [58, 62, 65, 69]
const stab = apparat("Accord", ACCORD, -2, -0.1)
reglages("accord", stab, {
    decay: 160, cutoff: 420, envmod: 2.6, fdecay: 80, reso: 0.35, detune: 12, width: 0.7, duck: 0.5
})
// Un echo en croche pointee, qui se repete longtemps
stab.addAudioEffect("Delay", {delay: 13, feedback: 0.55, cross: 1, filter: 0.3, wet: -7})
build(stab.noteTracks[0], "Accord", bar => {
    const out = plongeons(bar)
    const hit = (step: number, notes: number[], velocity: number) => {
        if (step >= limite(bar)) {return}
        for (const pitch of notes) {out.push({position: step * S16, duration: S16, pitch, velocity})}
    }
    const chord = rang(bar) === 3 ? BB : AM7
    // Le marqueur : l'accord plein, sur le premier temps des drops et au retour des graves
    if (bar === 56 || bar === 92 || bar === 73 || bar === 112) {hit(0, AM7, 1)}
    if (nu(bar) || bar >= 132) {return out}
    if (bar >= 24 && bar < 48) {hit(6, chord, 0.8)}
    else if (bar >= 48 && bar < 54 && bar % 2 === 0) {hit(6, chord, 0.9)}
    else if (drop(bar)) {
        // Un coup par mesure sur un temps faible ; un second en reponse, une mesure sur quatre
        hit(6, chord, 0.85)
        if (rang(bar) === 1) {hit(13, chord, 0.6)}
    } else if (bar >= 124) {hit(6, chord, 0.7)}
    return out
})
// cutoff 100..6000 Hz (300 Hz = 0.27, 420 = 0.35, 800 = 0.51) : il ondule sur huit mesures
auto("accord", stab, "cutoff", vague([
    [0, 0.30], [24, 0.30], [48, 0.38], [48, 0.27], [56, 0.27], [56, 0.36], [88, 0.46], [92, 0.42],
    [124, 0.52], [140, 0.30]
], 8, 0.06))
// decay 40..1500 ms (160 ms = 0.38, 500 ms = 0.70) : l'accord s'allonge dans le creux
auto("accord", stab, "decay", [
    [0, 0.38], [48, 0.38], [48, 0.70], [56, 0.70], [56, 0.38], [124, 0.42], [140, 0.55]
])

// ---------- Cymbale : les charleys ----------
const hats = apparat("Cymbale", CYMBALE, -8)
reglages("cymbale", hats, {decay: 40, open: 7, tone: 7000, metal: 0.5, drift: 0.6, width: 0.5})
const FERME = 42, OUVERT = 46
/** La vitesse des aigus : elle change a chaque bloc. */
function vitesse(bar: number): number {
    if (!tourne(bar) || nu(bar) || bar < 8) {return 0}
    if (bar < 16) {return 1}    // charley ferme a contretemps
    if (bar < 32) {return 2}    // charley ouvert a contretemps, un ferme juste avant le temps
    if (bar < 72) {return 3}    // doubles-croches : faible, moyen, fort (ouvert), moyen
    if (bar < 112) {return 4}   // + un coup double par mesure
    if (bar < 124) {return 5}   // + la ride
    if (bar < 132) {return 2}
    return 1
}
build(hats.noteTracks[0], "Cymbale", bar => {
    const out: Note[] = []
    const hit = (ticks: number, pitch: number, velocity: number) =>
        out.push({position: Math.round(ticks), duration: 30, pitch, velocity: Math.min(1, velocity)})
    // Dans les creux, ils reviennent a pas de loup
    if ((bar >= 52 && bar < 55) || bar === 90) {
        const base = bar === 90 ? 0.3 : 0.12 + (bar - 52) * 0.1
        for (let step = 0; step < 16; step++) {hit(step * S16, FERME, base + step * 0.006 + (step % 4 === 2 ? 0.12 : 0))}
        return out
    }
    const v = vitesse(bar)
    if (v === 0) {return out}
    const gain = drop(bar) ? 1 : 0.85
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (v === 1) {if (beat === 2) {hit(step * S16, FERME, 0.6)}}
        else if (v === 2) {
            if (beat === 2) {hit(step * S16, OUVERT, 0.65)}
            if (beat === 3) {hit(step * S16, FERME, 0.5)}
        } else {
            // Le contour d'un shaker : faible sur le temps, moyen, fort a contretemps, moyen
            if (beat === 0) {hit(step * S16, FERME, 0.3 * gain)}
            else if (beat === 1) {hit(step * S16, FERME, 0.52 * gain)}
            else if (beat === 2) {hit(step * S16, OUVERT, 0.78 * gain)}
            else {hit(step * S16, FERME, 0.6 * gain)}
        }
    }
    // Le coup double : une triple-croche glissee, pas au meme endroit d'une mesure a l'autre
    if (v >= 4) {hit((rang(bar) % 2 === 0 ? 14 : 6) * S16 + S16 / 2, FERME, 0.45)}
    return out
})
// decay 10..300 ms (40 ms = 0.41, 60 ms = 0.53) : les charleys s'allongent quand ca monte
auto("cymbale", hats, "decay", vague([
    [0, 0.36], [32, 0.41], [56, 0.43], [88, 0.50], [92, 0.46], [124, 0.54], [140, 0.36]
], 3, 0.03))
auto("cymbale", hats, "width", [
    [0, 0.5], [48, 0.5], [52, 0.9], [56, 0.9], [56, 0.25], [64, 0.55], [88, 0.6], [91, 0.95], [92, 0.25],
    [100, 0.6], [140, 0.7]
])

// ---------- Clap, caisse claire, rimshot, toms, ride, crash : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -4})
const RIM = 37, SNARE = 38, CLAP = 39, TOM_L = 45, TOM_M = 47, TOM_H = 50, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Rimshot", RIM, {volume: -9, panning: -0.3}],
    ["Snare", SNARE, {volume: -8}],
    ["Clap", CLAP, {volume: -2}],
    ["Low Tom", TOM_L, {volume: -6, panning: -0.25}],
    ["Mid Tom", TOM_M, {volume: -7, panning: 0}],
    ["High Tom", TOM_H, {volume: -7, panning: 0.25}],
    ["Crash", CRASH, {volume: -12}],
    ["Ride", RIDE, {volume: -13, panning: 0.2}]
]
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    drums.instrument.addSample(smp, {note, ...props} as any)
}
// Un peu de saturation sur toute la batterie : ca soude et ca durcit
essai("saturation batterie", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -26})

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number) =>
        out.push({position: Math.round(step * S16), duration: S16, pitch, velocity: Math.min(1, velocity)})
    // Avant les drops : un rimshot qui accelere pour de bon (de 300 a 36 ms), puis un temps de silence
    if (avantDrop(bar)) {
        const count = 13
        const ratio = Math.pow(0.036 / 0.30, 1 / (count - 1))
        let gap = 0.30, sum = 0
        for (let k = 0; k < count; k++) {sum += gap; gap *= ratio}
        const scale = 2.95 * beatSec / sum
        let at = 0
        gap = 0.30
        for (let k = 0; k < count; k++) {
            hit(at * scale / beatSec * 4, RIM, 0.35 + 0.6 * k / (count - 1))
            at += gap
            gap *= ratio
        }
        return out
    }
    if (!tourne(bar) || nu(bar)) {return out}
    const d = drop(bar)
    for (let step = 0; step < 16; step++) {
        // Clap sur 2 et 4, des la mesure 24 ; dans les drops, une caisse claire dessous
        if (bar >= 24 && bar < 132 && step % 8 === 4) {
            hit(step, CLAP, d ? 0.95 : 0.8)
            if (d) {hit(step, SNARE, 0.3)}
        }
    }
    // Le rimshot : deux coups sur des pas faibles, toujours les memes
    if (bar >= 32) {hit(3, RIM, 0.5); hit(9, RIM, 0.4)}
    // Le tom grave : le roulis, dans la seconde moitie des drops
    if ((bar >= 73 && bar < 88) || (bar >= 112 && bar < 124)) {hit(7, TOM_L, 0.55); hit(13, TOM_L, 0.45)}
    // La ride, au sommet seulement
    if (vitesse(bar) >= 5) {for (let step = 0; step < 16; step += 2) {hit(step, RIDE, step % 4 === 2 ? 0.55 : 0.35)}}
    if (bar === 56 || bar === 92) {hit(0, CRASH, 0.8)}
    if (bar === 112) {hit(0, CRASH, 0.55)}
    // Fin de bloc : les toms descendent et le clap bafouille
    if (finDeBloc(bar) && bar >= 31) {
        hit(12, TOM_H, 0.5); hit(13, TOM_M, 0.58); hit(14, TOM_M, 0.66); hit(15, TOM_L, 0.75)
        hit(15, CLAP, 0.6)
    }
    return out
})

// ---------- Souffle : l'air de la piece, et les montees ----------
const breath = apparat("Souffle", SOUFFLE, -14)
reglages("souffle", breath, {reso: 0.6, drift: 0.6})
build(breath.noteTracks[0], "Souffle", bar => {
    const section = SECTIONS.find(s => s.start === bar)
    if (!section) {return []}
    return [{position: 0, duration: section.bars * BAR - 10, pitch: 60, velocity: 1}]
})
// freq 80..8000 Hz (300 Hz = 0.29, 600 = 0.44, 2000 = 0.70, 5000 = 0.90)
auto("souffle", breath, "freq", [
    [0, 0.30], [48, 0.36], [52, 0.48], [55.75, 0.92], [56, 0.45], [88, 0.45], [91.75, 0.92], [92, 0.50],
    [124, 0.42], [140, 0.30]
])
auto("souffle", breath, "volume", [
    [0, 0.50], [16, 0.25], [48, 0.25], [48, 0.50], [55.75, 1.0], [56, 0.20], [88, 0.22], [88, 0.55],
    [91.75, 1.0], [92, 0.22], [124, 0.30], [140, 0.55]
])

// ---------- La voix ----------
// Deux pistes : la voix, presque seche ; et ses lancers, les memes mots
// envoyes de temps en temps dans un long echo.
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -3})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.3, wet: -17})
const lancer: any = project.addInstrumentUnit("Tape", {label: "Voix lancee", volume: -11})
lancer.addAudioEffect("Delay", {delay: 13, feedback: 0.62, cross: 1, filter: 0.3, wet: -2})
const dire = (quoi: string, sample: any, bar: number, step: number, lance: boolean = false) => {
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
    if (lance) {essai("lancer " + quoi, () => lancer.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))}
}
dire("intro", vUn, 7, 8, true)
dire("fin intro", vUnAccord, 15, 8)
dire("avant groove", vDeuxAccord, 31, 0)
dire("avant creux", vBegaie, 47, 12)
dire("creux 1", vDeux, 50, 0)
dire("creux 2", vDeuxAccord, 52, 0, true)
dire("creux go", vGo, 54, 0)
dire("creux vite", vVite, 55, 0)
dire("drop 63", vBegaie, 63, 12)
dire("avant le bloc sans graves", vUnAccord, 71, 8, true)
dire("drop 79", vBegaie, 79, 12)
dire("trou 1", vDeuxAccord, 88, 0, true)
dire("trou go", vGo, 90, 0)
dire("trou vite", vVite, 91, 0)
dire("final 99", vBegaie, 99, 12)
dire("avant le passage nu", vUn, 107, 8, true)
dire("sommet 115", vBegaie, 115, 12)
dire("sommet 123", vDeuxAccord, 123, 0, true)
dire("fin", vUn, 138, 0, true)

// ---------- Aspirations et impacts ----------
// L'aspiration s'arrete un temps avant le drop : ce temps-la reste vide
const fxRise: any = project.addInstrumentUnit("Tape", {label: "Aspirations", volume: -8})
essai("aspiration longue", () => fxRise.audioTracks[0].addRegion(aspireLong, {position: Math.round(53.75 * BAR), playback: "no-sync"}))
essai("aspiration courte", () => fxRise.audioTracks[0].addRegion(aspireCourt, {position: Math.round(90.75 * BAR), playback: "no-sync"}))
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -6})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 56 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 92 * BAR, playback: "no-sync"}))

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// ISOLER = true : chaque piste est aussi rendue seule (une passe de plus par piste).
// "mono" : ce que le son perd quand les deux oreilles sont additionnees.
// "zone" : la part de l'energie entre 2 et 6 kHz, la ou l'oreille fatigue.
// Pour le mix, on mesure sur le premier drop ce qu'on a mesure sur les deux
// references : l'energie par bande d'octave, la part du grave et de l'aigu,
// l'ecart entre la crete et le niveau moyen, et la force des attaques sur
// chacun des 16 pas de la mesure (0 a 9) dans le grave, le medium et l'aigu.
const MESURER = true
const ISOLER = true
const units: any[] = [kick, rumble, acid, acid2, stab, hats, drums, breath, voix, lancer, fxRise, fxHit]
const STEMS: [string, any][] = [["Frappe", kick], ["Grondement", rumble], ["Acide", acid], ["Acide carree", acid2],
    ["Accord", stab], ["Cymbale", hats], ["909", drums], ["Voix", voix], ["Voix lancee", lancer], ["Aspirations", fxRise]]
if (MESURER) {
    const parts = [["intro", 0, 16], ["montee", 16, 32], ["groove", 32, 48], ["break", 48, 56], ["drop", 56, 72],
        ["plus", 72, 88], ["trou", 88, 92], ["final", 92, 108], ["nu", 108, 112], ["sommet", 112, 124],
        ["sortie", 124, 140]]
    const report: string[] = []
    for (const stem of ([["MIX", null]] as [string, any][]).concat(ISOLER ? STEMS : [])) {
        units.forEach(u => u.mute = stem[1] !== null && u !== stem[1])
        const audio: any = await project.mixdown()
        const rate = audio.sampleRate ?? 48000
        const L = audio.frames[0]
        const R = audio.frames.length > 1 ? audio.frames[1] : L
        const n = L.length
        /** Filtre du second ordre : 0 = passe-haut, 1 = passe-bas, 2 = passe-bande. */
        const filtre = (kind: number, fc: number, q: number) => {
            const w = 2 * Math.PI * fc / rate, alpha = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + alpha
            const b0 = kind === 0 ? (1 + c) / 2 : kind === 1 ? (1 - c) / 2 : alpha
            const b1 = kind === 0 ? -(1 + c) : kind === 1 ? 1 - c : 0
            const b2 = kind === 2 ? -alpha : b0
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0
            return (x: number) => {
                const y = (b0 * x + b1 * x1 + b2 * x2 + 2 * c * y1 - (1 - alpha) * y2) / a0
                x2 = x1; x1 = x; y2 = y1; y1 = y
                return y
            }
        }
        const f1 = filtre(0, 2000, 0.707), f2 = filtre(0, 2000, 0.707), f3 = filtre(1, 6000, 0.707), f4 = filtre(1, 6000, 0.707)
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
            // Les memes mesures que sur les references, sur le premier drop (mesures 56 a 72)
            const from = Math.floor(56 * barSec * rate), to = Math.min(n, Math.floor(72 * barSec * rate))
            const hop = 512
            const kLow = 1 - Math.exp(-2 * Math.PI * 120 / rate), kHigh = 1 - Math.exp(-2 * Math.PI * 6000 / rate)
            const kA = 1 - Math.exp(-2 * Math.PI * 300 / rate), kB = 1 - Math.exp(-2 * Math.PI * 3000 / rate)
            const centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
            const bancs = centres.map(c => filtre(2, Math.min(c, rate * 0.45), 1.414))
            const energies: number[] = centres.map(() => 0)
            let lp = 0, lp2 = 0, hl = 0, ma = 0, mb = 0, sLow = 0, sHigh = 0, sTot = 0, top = 0
            const eL: number[] = [], eM: number[] = [], eH: number[] = []
            for (let i = from; i < to; i += hop) {
                let l = 0, m = 0, h = 0
                for (let j = i; j < i + hop && j < to; j++) {
                    const x = (L[j] + R[j]) / 2
                    const ax = Math.abs(x)
                    if (ax > top) {top = ax}
                    lp += (x - lp) * kLow; lp2 += (lp - lp2) * kLow
                    hl += (x - hl) * kHigh
                    ma += (x - ma) * kA; mb += (x - mb) * kB
                    const hh = x - hl, mm = mb - ma
                    l += lp2 * lp2; m += mm * mm; h += hh * hh; sTot += x * x
                    for (let b = 0; b < bancs.length; b++) {const y = bancs[b](x); energies[b] += y * y}
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
            let somme = 0
            for (const e of energies) {somme += e}
            const rmsDrop = Math.sqrt(sTot / (to - from))
            line += " || drop : bandes " + centres.map((c, b) => (c >= 1000 ? c / 1000 + "k" : String(c)) + ":" + (10 * Math.log10(energies[b] / somme)).toFixed(0)).join(" ") +
                " | grave " + pas(eL) + " medium " + pas(eM) + " aigu " + pas(eH) +
                " | partGrave " + (10 * Math.log10(sLow / sTot)).toFixed(1) + " partAigu " + (10 * Math.log10(sHigh / sTot)).toFixed(1) +
                " | crete-moyenne " + (20 * Math.log10(top / rmsDrop)).toFixed(1) + "dB"
        }
        report.push(line)
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
