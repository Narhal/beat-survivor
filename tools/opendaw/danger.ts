// DANGER DANGER - Beat Survivor, mode Survie
// Acid techno sombre - 132 BPM - La phrygien - 128 mesures (~3 min 53)
//
// Script de creation openDAW : menu openDAW > Script Editor, coller, Run.
// Ce fichier est GENERE par tools/opendaw/build.mjs a partir de
// danger.src.ts (le morceau), tb303-bass-line.js (la 303) et voix-sam.json
// (la voix robot).
//
// Parti pris : sec, sombre, hypnotique. Pas de nappe, pas de theme chante,
// presque pas de reverb. Une seule fondamentale (La) et sa seconde mineure
// (Si bemol) pour la menace. C'est le filtre de la 303 qui raconte.
//
// Palette : TR-909 (samples d'openDAW), deux TB-303 (script Apparat
// "TB-303 Bass Line" d'Andre Michelle, CC0), basse roulante, accord dub,
// bourdon, et la voix de SAM (synthese vocale 8 bits de 1982).

const BPM = 132
const BAR = PPQN.Bar
const S16 = PPQN.SemiQuaver
const TOTAL = 128
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
"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" +
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

const W: any = ClassicWaveform
const SAW = W.Saw ?? W.saw ?? 2
const SQUARE = W.Square ?? W.square ?? 3
const TRI = W.Triangle ?? W.triangle ?? 1
const SINE = W.Sine ?? W.sine ?? 0
const V: any = VoicingMode
const MONO = V.Monophonic ?? V.monophonic
const POLY = V.Polyphonic ?? V.polyphonic

/** Tout ce qui n'a pas pu se brancher comme prevu : affiche en fin de script. */
const soucis: string[] = []
function essai(quoi: string, fn: () => void) {
    try {fn()} catch (e: any) {soucis.push(quoi + " : " + String(e && e.message ? e.message : e).slice(0, 110))}
}

// ---------- La voix robot ----------
// Les mots sortent de SAM en 8 bits / 22 kHz, sur une seule note (La, 110 Hz).
// Ici on les decode, on les reechantillonne (et on les transpose au besoin),
// puis on les pose sur la grille du morceau.
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

/** Un mot, a la frequence du projet. semis : transposition en demi-tons. */
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

// [mot, position en temps, demi-tons, duree max en temps (0 = mot entier)]
type Dit = [string, number, number, number]
async function phrase(label: string, dits: Dit[]) {
    let total = 0
    const parts = dits.map(d => {
        const buf = mot(d[0], d[2])
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
    let top = 0
    for (let i = 0; i < total; i++) {const a = Math.abs(f[i]); if (a > top) {top = a}}
    const k = top > 0 ? 0.9 / top : 1
    for (let i = 0; i < total; i++) {f[i] *= k}
    return await openDAW.addSample(audio, label)
}

// "Danger."
const vUn = await phrase("DD Danger", [["danger", 0, 0, 0]])
// "Danger, danger." - le second un demi-ton au-dessus : la seconde mineure
const vDeux = await phrase("DD Danger danger", [["danger", 0, 0, 0], ["danger", 2, 1, 0]])
// "Let's go faster."
const vGo = await phrase("DD Lets go faster", [["letsgo", 0, 0, 0], ["faster", 2, 0, 0]])
// "D-d-d-d-DANGER" : quatre amorces en doubles-croches, le mot tombe sur le temps
const vBegaie = await phrase("DD D-d-d-danger", [
    ["danger", 0, 0, 0.22], ["danger", 0.25, 0, 0.22], ["danger", 0.5, 0, 0.22], ["danger", 0.75, 0, 0.22],
    ["danger", 1, 0, 0]
])
// "Faster, faster, fasterfasterfaster" : le mot se resserre et grimpe
const vVite = await phrase("DD Faster qui accelere", [
    ["faster", 0, 0, 0.98], ["faster", 1, 1, 0.98], ["faster", 2, 2, 0.48], ["faster", 2.5, 3, 0.48],
    ["faster", 3, 4, 0.24], ["faster", 3.25, 5, 0.24], ["faster", 3.5, 6, 0.24], ["faster", 3.75, 7, 0.24]
])

// ---------- Effets synthetises : montees de bruit et impacts ----------
let seed = 20261111
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296 * 2 - 1
}

/** Montee : bruit blanc dans un passe-bande qui grimpe, volume qui enfle. */
function makeRiser(seconds: number) {
    const n = Math.floor(sr * seconds)
    const audio = AudioData.create(sr, n, 1)
    const f = audio.frames[0]
    let low = 0, band = 0
    for (let i = 0; i < n; i++) {
        const t = i / n
        const fc = 180 * Math.pow(38, t)
        const k = 2 * Math.sin(Math.PI * Math.min(fc, sr / 7) / sr)
        const x = rnd()
        low += k * band
        const high = x - low - 0.35 * band
        band += k * high
        const fade = Math.min(1, (n - i) / (sr * 0.02))
        f[i] = Math.tanh(band * 0.9) * t * t * 0.7 * fade
    }
    return audio
}

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

// La montee s'arrete un temps avant le drop : ce temps-la est pour la voix seule
const riserLong = await openDAW.addSample(makeRiser(barSec * 3.75), "DD Montee longue")
const riserShort = await openDAW.addSample(makeRiser(barSec * 1.75), "DD Montee courte")
const impact = await openDAW.addSample(makeImpact(), "DD Impact")

// ---------- La TR-909 d'openDAW ----------
const library = await openDAW.listSamples()
const sample909 = (name: string) => {
    const hit = library.find((s: any) => String(s.name) === "909 " + name)
    if (!hit) {soucis.push("sample 909 introuvable : " + name)}
    return hit
}

// ---------- Projet ----------
const project = openDAW.newProject("Danger Danger")
project.bpm = BPM

// Une reverb courte, pour le clap et le bourdon seulement
const reverb = project.addAuxUnit({label: "Reverb"})
reverb.addAudioEffect("DattorroReverb", {decay: 0.45, damping: 0.5, preDelay: 10, wet: 0, dry: -60} as any)

// Structure. Kick des la premiere mesure, un break qui creuse (48-56),
// le drop (56), un second trou (88-92) et le final (92).
const SECTIONS = [
    {name: "Intro", start: 0, bars: 8},
    {name: "Montee", start: 8, bars: 16},
    {name: "Groove", start: 24, bars: 24},
    {name: "Break", start: 48, bars: 8},
    {name: "Drop", start: 56, bars: 32},
    {name: "Trou", start: 88, bars: 4},
    {name: "Final", start: 92, bars: 24},
    {name: "Sortie", start: 116, bars: 12}
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

/** Automation : points [mesure, valeur 0..1], interpolation lineaire. */
function automate(quoi: string, unit: any, target: any, path: string, points: number[][]) {
    essai("automation " + quoi, () => {
        const lane = unit.addValueTrack(target, path)
        const region = lane.addRegion({position: 0, duration: TOTAL * BAR})
        region.addEvents(points.map(p => ({
            position: Math.round(p[0] * BAR), value: p[1], interpolation: Interpolation.Linear
        })))
    })
}

const inBreak = (bar: number) => (bar >= 48 && bar < 56) || (bar >= 88 && bar < 92)
const kickOn = (bar: number) => bar < 124 && !inBreak(bar)
const drop = (bar: number) => (bar >= 56 && bar < 88) || (bar >= 92 && bar < 116)
const groove = (bar: number) => (bar >= 16 && bar < 48) || drop(bar)
const final = (bar: number) => bar >= 92 && bar < 116
/** La mesure qui precede un drop : le dernier temps reste vide. */
const avantDrop = (bar: number) => bar === 55 || bar === 91

// ---------- Batterie : TR-909 ----------
const drums = project.addInstrumentUnit("Playfield", {label: "TR-909", volume: -5})
const KICK = 36, RIM = 37, SNARE = 38, CLAP = 39, TOM_L = 45, TOM_M = 47, TOM_H = 50
const HAT_C = 42, HAT_O = 46, CRASH = 49, RIDE = 51
const kit: [string, number, any][] = [
    ["Bassdrum", KICK, {volume: 0}],
    ["Rimshot", RIM, {volume: -10, panning: -0.3}],
    ["Snare", SNARE, {volume: -8}],
    ["Clap", CLAP, {volume: -3}],
    ["Low Tom", TOM_L, {volume: -6, panning: -0.3}],
    ["Mid Tom", TOM_M, {volume: -7, panning: 0}],
    ["High Tom", TOM_H, {volume: -7, panning: 0.3}],
    ["Closed Hat", HAT_C, {volume: -8.5, panning: 0.1, exclude: true}],
    ["Open Hat", HAT_O, {volume: -8, panning: 0.1, exclude: true}],
    ["Crash", CRASH, {volume: -11}],
    ["Ride", RIDE, {volume: -13, panning: 0.22}]
]
let kickSlot: any = null
for (const [name, note, props] of kit) {
    const smp = sample909(name)
    if (!smp) {continue}
    const slot = drums.instrument.addSample(smp, {note, ...props} as any)
    if (note === KICK) {kickSlot = slot}
}
// Un peu de saturation sur toute la batterie : ca soude et ca durcit
essai("saturation batterie", () => drums.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 5, outputGain: -3, mix: 0.6} as any))
drums.addSend(reverb, {amount: -28})

// Les doubles-croches impaires trainent un peu : le balancement
const SWING = Math.round(S16 * 0.13)

build(drums.noteTracks[0], "909", bar => {
    const out: Note[] = []
    const hit = (step: number, pitch: number, velocity: number, late: number = 0) =>
        out.push({position: step * S16 + late, duration: S16, pitch, velocity: Math.min(1, velocity)})
    const sw = (step: number) => step % 2 === 1 ? SWING : 0
    const k = kickOn(bar), g = groove(bar), d = drop(bar), f = final(bar)
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (k && beat === 0) {hit(step, KICK, bar < 8 ? 0.9 : 1.0)}
        // Le pied double en fin de phrase
        if (d && bar % 8 === 7 && step === 14) {hit(step, KICK, 0.75)}
        if (g && bar < 120 && step % 8 === 4) {
            hit(step, CLAP, 0.95)
            if (d) {hit(step, SNARE, 0.35)}
        }
        // Charleys : contretemps seul, puis doubles-croches accentuees
        if (k && bar >= 4) {
            if (beat === 2) {hit(step, g ? HAT_O : HAT_C, g ? (d ? 0.85 : 0.7) : 0.6)}
            else if (bar >= 8) {hit(step, HAT_C, beat === 0 ? 0.42 : beat === 1 ? 0.2 : 0.32, sw(step))}
        }
        // Dans le break, les charleys reviennent a pas de loup
        if (bar >= 52 && bar < 55) {hit(step, HAT_C, 0.1 + (bar - 52) * 0.08 + (beat === 2 ? 0.12 : 0), sw(step))}
        if (bar === 90) {hit(step, HAT_C, 0.2 + (beat === 2 ? 0.12 : 0), sw(step))}
        // Ride : en retrait dans la seconde moitie du drop, devant au final
        if (((bar >= 72 && bar < 88) || f) && step % 2 === 0) {hit(step, RIDE, (beat === 2 ? 0.6 : 0.35) * (f ? 1 : 0.7))}
        // Rimshot : la syncope
        if (((bar >= 24 && bar < 48) || d) && (step === 3 || step === 10 || (bar % 2 === 1 && step === 14))) {
            hit(step, RIM, 0.5, sw(step))
        }
        // Tom grave : le roulis tribal
        if (((bar >= 40 && bar < 48) || (bar >= 72 && bar < 88) || f) && (step === 7 || step === 13)) {
            hit(step, TOM_L, step === 7 ? 0.55 : 0.45, sw(step))
        }
    }
    if (bar === 56 || bar === 92) {hit(0, CRASH, 0.8)}
    // Roulements de toms avant le groove et avant le break
    if (bar === 23) {[TOM_M, TOM_M, TOM_L, TOM_L].forEach((tom, i) => hit(12 + i, tom, 0.5 + i * 0.06))}
    if (bar === 47) {[TOM_H, TOM_H, TOM_M, TOM_H, TOM_M, TOM_M, TOM_L, TOM_L].forEach((tom, i) => hit(8 + i, tom, 0.55 + i * 0.05))}
    if (bar === 87) {for (let s = 12; s < 16; s++) {hit(s, SNARE, 0.5 + (s - 12) * 0.12)}}
    // Roulement de caisse claire : il s'arrete un temps avant le drop
    if (bar === 54) {for (let s = 0; s < 16; s += 2) {hit(s, SNARE, 0.3 + s * 0.015)}}
    if (avantDrop(bar)) {for (let s = 0; s < 12; s++) {hit(s, SNARE, 0.5 + s * 0.04)}}
    return out
})

// ---------- Les deux 303 ----------
function make303(label: string, volume: number, panning: number) {
    const unit: any = project.addInstrumentUnit("Apparat", {label, volume, panning} as any)
    unit.instrument.code = TB303
    return unit
}
const set303 = (unit: any, name: string, value: number) =>
    essai("303 " + name, () => {unit.instrument.parameter(name).value = value})

const N = null
// steps : demi-tons au-dessus de la note de base. 1 = Si bemol, 6 = Mi bemol.
type Pattern = {steps: (number | null)[], accents: number[], slides: number[]}
// P0 : le squelette, trois contre quatre. P1 : le motif. P2 : sa fin de phrase.
// P3 : le sommet, une octave plus haut. P4 : le break, de longues notes liees.
const P0: Pattern = {steps: [0, N, N, 0, N, N, 0, N, N, 0, N, N, 0, N, 1, N], accents: [12], slides: []}
const P1: Pattern = {steps: [0, 0, 12, 0, N, 0, 1, 0, 12, 0, N, 3, 0, 13, 12, -12], accents: [2, 8, 13], slides: [6, 13]}
const P2: Pattern = {steps: [0, 12, 0, 0, 6, 0, 12, N, 0, 0, 15, 12, 13, 12, 3, 1], accents: [4, 10, 12], slides: [10, 12, 14]}
const P3: Pattern = {steps: [12, 0, 12, 13, N, 12, 0, 12, 15, 12, N, 18, 12, 13, 0, 24], accents: [3, 8, 11, 15], slides: [3, 8, 11]}
const P4: Pattern = {steps: [0, N, N, N, 12, N, N, 1, N, N, 0, N, N, N, 13, 12], accents: [4, 14], slides: [14]}
// Seconde 303 : motif de 12 pas qui tourne contre la mesure de 16
const PD: Pattern = {steps: [0, N, 0, 1, N, 0, N, 12, 0, N, 3, N], accents: [7], slides: [3]}

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

const acid = make303("303", -2, 0)
set303(acid, "cutoff", 70)
set303(acid, "resonance", 0.85)
set303(acid, "envmod", 0.3)
set303(acid, "decay", 300)
set303(acid, "accent", 1.0)
essai("saturation 303", () => acid.addAudioEffect("Waveshaper", {equation: "tanh", inputGain: 19, outputGain: -11, mix: 0.85} as any))
acid.addAudioEffect("Delay", {delay: 13, feedback: 0.3, cross: 1, filter: 0.4, wet: -18})

build(acid.noteTracks[0], "303", bar => {
    if (bar < 8 || bar >= 126) {return []}
    let pattern = P1
    if (bar < 16 || bar >= 116) {pattern = P0}
    else if (bar < 24) {pattern = bar % 8 === 7 ? P2 : P1}
    else if (bar < 48) {pattern = bar % 4 === 3 ? P2 : P1}
    else if (bar < 52) {pattern = P4}
    else if (bar < 56) {pattern = P1}
    else if (bar < 72) {pattern = bar % 4 === 3 ? P2 : P1}
    else if (bar < 88) {pattern = bar % 4 === 2 ? P3 : bar % 4 === 3 ? P2 : P1}
    else if (bar < 90) {pattern = P4}
    else if (bar < 92) {pattern = P1}
    else {pattern = bar % 8 === 7 ? P2 : bar % 2 === 0 ? P3 : P1}
    const out: Note[] = []
    for (let step = 0; step < (avantDrop(bar) ? 12 : 16); step++) {
        if (pattern.steps[step] === null) {continue}
        out.push(acidNote(pattern, step, step, 45))
    }
    return out
})

// Le filtre raconte le morceau. Valeurs 0..1 sur la plage declaree par la
// 303 (coupure 60-300 Hz en exponentiel : c'est l'enveloppe qui fait le reste).
automate("303 cutoff", acid, acid.instrument.parameter("cutoff"), "value", [
    [0, 0.05], [8, 0.05], [16, 0.12], [24, 0.30], [40, 0.45], [48, 0.55],
    [48, 0.10], [52, 0.10], [55.75, 0.90], [56, 0.80], [72, 0.88], [88, 0.95],
    [88, 0.15], [91.75, 0.95], [92, 0.92], [108, 1.0], [116, 0.60], [124, 0.10], [128, 0.05]
])
automate("303 envmod", acid, acid.instrument.parameter("envmod"), "value", [
    [0, 0.10], [16, 0.20], [24, 0.40], [48, 0.55], [48, 0.25], [55.75, 0.60], [56, 0.75],
    [88, 0.85], [88, 0.30], [92, 0.90], [116, 0.60], [124, 0.15], [128, 0.15]
])
automate("303 resonance", acid, acid.instrument.parameter("resonance"), "value", [
    [0, 0.75], [24, 0.82], [48, 0.88], [52, 0.95], [56, 0.88], [88, 0.92], [90, 0.97], [92, 0.90],
    [116, 0.85], [128, 0.75]
])
automate("303 decay", acid, acid.instrument.parameter("decay"), "value", [
    [0, 0.10], [24, 0.20], [48, 0.25], [48, 0.70], [56, 0.30], [72, 0.40], [88, 0.50],
    [88, 0.80], [92, 0.45], [116, 0.25], [128, 0.10]
])
// Le niveau de la 303 retombe a l entree des breaks : le trou doit etre un vrai
// trou, pour l oreille comme pour la detection de drop du jeu.
automate("303 volume", acid, acid.instrument.parameter("volume"), "value", [
    [0, 0.70], [48, 0.70], [48, 0.35], [52, 0.45], [55.75, 0.70], [88, 0.70],
    [88, 0.40], [91.75, 0.70], [128, 0.70]
])

const acid2 = make303("303 Carree", -7, 0.25)
set303(acid2, "waveform", 1)
set303(acid2, "cutoff", 150)
set303(acid2, "resonance", 0.9)
set303(acid2, "envmod", 0.5)
set303(acid2, "decay", 300)
set303(acid2, "accent", 1.0)
acid2.addAudioEffect("Delay", {delay: 13, feedback: 0.5, cross: 1, filter: 0.5, wet: -10})

build(acid2.noteTracks[0], "303 carree", bar => {
    const on = (bar >= 72 && bar < 88) || (bar >= 96 && bar < 116)
    if (!on) {return []}
    const out: Note[] = []
    for (let step = 0; step < 16; step++) {
        const index = ((bar - 72) * 16 + step) % 12
        if (PD.steps[index] === null) {continue}
        out.push(acidNote(PD, index, step, 57))
    }
    return out
})
automate("303 carree cutoff", acid2, acid2.instrument.parameter("cutoff"), "value", [
    [0, 0.30], [72, 0.30], [88, 0.70], [96, 0.50], [112, 0.90], [116, 0.40], [128, 0.40]
])

// ---------- Basse roulante : trois doubles-croches derriere chaque pied ----------
const rumble = project.addInstrumentUnit("Vaporisateur", {label: "Roulis", volume: -6}, {
    cutoff: 400, resonance: 1, filterOrder: 1, filterEnvelope: 0,
    attack: 0.004, decay: 0.15, sustain: 0.7, release: 0.06,
    voicingMode: MONO,
    oscillators: [{waveform: SINE, volume: -3}, {waveform: TRI, volume: -12}]
} as any)

build(rumble.noteTracks[0], "Roulis", bar => {
    if (!kickOn(bar)) {return []}
    const out: Note[] = []
    const soft = bar < 8 || bar >= 116 ? 0.7 : 1
    for (let step = 0; step < 16; step++) {
        const beat = step % 4
        if (beat === 0) {continue}
        // Fin de phrase : le dernier temps monte au Si bemol
        const pitch = bar % 4 === 3 && step >= 13 ? 34 : 33
        out.push({position: step * S16, duration: Math.round(S16 * 0.75), pitch,
            velocity: (beat === 1 ? 0.55 : beat === 2 ? 0.9 : 0.7) * soft})
    }
    return out
})

// ---------- Accord dub : un coup sec, l'echo fait le reste ----------
const stab = project.addInstrumentUnit("Vaporisateur", {label: "Accord", volume: -12, panning: -0.2}, {
    cutoff: 1100, resonance: 2, filterOrder: 2, filterEnvelope: 0.4,
    attack: 0.002, decay: 0.18, sustain: 0.0, release: 0.12,
    voicingMode: POLY,
    oscillators: [{waveform: SAW, volume: -8}, {waveform: SQUARE, volume: -12, tune: 7}]
} as any)
stab.addAudioEffect("Delay", {delay: 13, feedback: 0.55, cross: 1, filter: 0.3, wet: -8})
stab.addSend(reverb, {amount: -14})

const AM7 = [57, 60, 64, 67]
const BB = [58, 62, 65, 69]
build(stab.noteTracks[0], "Accord", bar => {
    const on = (bar >= 32 && bar < 48) || (bar >= 64 && bar < 88) || final(bar)
    if (!on) {return []}
    const chord = bar % 8 === 7 ? BB : AM7
    const steps = bar % 2 === 0 ? [3] : [3, 10]
    const out: Note[] = []
    for (const step of steps) {
        for (const pitch of chord) {out.push({position: step * S16, duration: S16, pitch, velocity: 0.8})}
    }
    return out
})

// ---------- Bourdon : le sol sous les pieds quand le kick se tait ----------
const drone = project.addInstrumentUnit("Vaporisateur", {label: "Bourdon", volume: -19}, {
    cutoff: 300, resonance: 1.0, filterOrder: 2, filterEnvelope: 0,
    attack: 1.5, decay: 1.0, sustain: 1.0, release: 2.0,
    voicingMode: POLY, unisonCount: 3, unisonDetune: 20, unisonStereo: 1,
    oscillators: [{waveform: SAW, volume: -8}, {waveform: SAW, volume: -12, octave: 1, tune: 5}]
} as any)
drone.addSend(reverb, {amount: -8})
const DRONE = [33, 45, 52, 58]
build(drone.noteTracks[0], "Bourdon", bar => {
    const hold = (bars: number) => DRONE.map(pitch => ({position: 0, duration: bars * BAR - S16, pitch, velocity: 0.6}))
    if (bar === 0) {return hold(8)}
    if (bar === 48) {return hold(8)}
    if (bar === 88) {return hold(4)}
    if (bar === 120) {return hold(8)}
    return []
})
automate("bourdon cutoff", drone, drone.instrument, "cutoff", [
    [0, 0.38], [8, 0.34], [48, 0.34], [55.75, 0.58], [56, 0.34], [88, 0.36], [91.75, 0.58], [92, 0.34],
    [120, 0.42], [128, 0.30]
])

// ---------- La voix ----------
const voix: any = project.addInstrumentUnit("Tape", {label: "Voix", volume: -2.5})
voix.addAudioEffect("Delay", {delay: 13, feedback: 0.4, cross: 1, filter: 0.3, wet: -12})
const dire = (quoi: string, sample: any, bar: number, step: number) =>
    essai("voix " + quoi, () => voix.audioTracks[0].addRegion(sample, {position: bar * BAR + step * S16, playback: "no-sync"}))
dire("intro", vUn, 7, 8)
dire("avant groove", vDeux, 23, 0)
dire("groove", vDeux, 39, 0)
dire("break 1", vDeux, 50, 0)
dire("break 2", vDeux, 52, 0)
dire("break go", vGo, 54, 0)
dire("break vite", vVite, 55, 0)
dire("drop 63", vBegaie, 63, 12)
dire("drop 71", vBegaie, 71, 12)
dire("drop 79", vBegaie, 79, 12)
dire("trou 1", vDeux, 88, 0)
dire("trou go", vGo, 90, 0)
dire("trou vite", vVite, 91, 0)
dire("final 99", vBegaie, 99, 12)
dire("final 107", vBegaie, 107, 12)
dire("final 115", vDeux, 115, 0)
dire("fin", vDeux, 126, 0)

// ---------- Effets : montees et impacts ----------
const fxRise: any = project.addInstrumentUnit("Tape", {label: "Montees", volume: -14})
essai("montee longue", () => fxRise.audioTracks[0].addRegion(riserLong, {position: 52 * BAR, playback: "no-sync"}))
essai("montee courte", () => fxRise.audioTracks[0].addRegion(riserShort, {position: 90 * BAR, playback: "no-sync"}))
const fxHit: any = project.addInstrumentUnit("Tape", {label: "Impacts", volume: -6})
essai("impact 1", () => fxHit.audioTracks[0].addRegion(impact, {position: 56 * BAR, playback: "no-sync"}))
essai("impact 2", () => fxHit.audioTracks[0].addRegion(impact, {position: 92 * BAR, playback: "no-sync"}))

// ---------- Pompe : le pied creuse la basse et l'accord ----------
function pump(quoi: string, unit: any, threshold: number, ratio: number) {
    essai("pompe " + quoi, () => {
        const comp: any = unit.addAudioEffect("Compressor", {
            threshold, ratio, attack: 1, release: 140, knee: 6, automakeup: false, makeup: 0
        } as any)
        if (kickSlot) {comp.sideChain = kickSlot}
    })
}
pump("roulis", rumble, -20, 6)
pump("accord", stab, -18, 4)

// Limiteur de sortie
essai("limiteur", () => project.output.addAudioEffect("Maximizer", {threshold: -3} as any))

// ---------- Mesure du rendu (pour regler sans entendre) ----------
// STEMS = [] : mix seul. Sinon, la liste des pistes a isoler.
const MESURER = false
const units: any[] = [drums, acid, acid2, rumble, stab, drone, voix, fxRise, fxHit]
const STEMS: any[] = [drums, acid, acid2, rumble, stab, voix]
if (MESURER) {
    const parts = [["intro", 0, 8], ["montee", 8, 24], ["groove", 24, 48], ["break", 48, 56],
        ["drop1", 56, 72], ["drop2", 72, 88], ["trou", 88, 92], ["final", 92, 116], ["sortie", 116, 128]]
    const report: string[] = []
    for (const solo of [null].concat(STEMS) as any[]) {
        units.forEach(u => u.mute = solo !== null && u !== solo)
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
        report.push((solo === null ? "MIX" : solo.label) + " " + (n / rate).toFixed(0) + "s crete " + peakValue.toFixed(2) + " : " + cells.join(", "))
    }
    units.forEach(u => u.mute = false)
    await openDAW.showInfo("Mesures", (soucis.length ? "SOUCIS " + soucis.join(" // ") + " ;; " : "") + report.join(" ;; "))
} else if (soucis.length) {
    await openDAW.showInfo("Soucis", soucis.join(" ;; "))
}

project.openInStudio()
