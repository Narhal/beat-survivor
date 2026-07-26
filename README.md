# Beat Survivor

**Geometry Survivor × Beat Hazard, dans une soupe cellulaire.** Ta musique génère
l'assaut : la basse fait naître les globules, les médiums les méduses, les aigus
les dards. Toi, tu conduis — stick gauche, jamais à l'arrêt — et ton build tire
tout seul : à chaque jauge remplie, choisis une arme parmi trois.

Ambiance de référence : *Nucleus* (PS3, 2007) — micro-organique, fluide,
bioluminescent.

## Lancer

```bash
npm install
npm run dev
```

Puis glisser un fichier audio (mp3, wav, ogg…) sur l'écran titre, ou cliquer
« Piste démo intégrée » (piste techno synthétisée, aucun fichier requis).

## Contrôles

- **Manette (recommandé)** : stick gauche = conduite, ✕ = confirmer.
- **Clavier** : ZQSD / WASD / flèches, Entrée = confirmer.

## Architecture

- `src/audio/analysis.ts` — le contrat **FluxMusical** : enveloppes par bande
  (basse/médiums/aigus) + onsets datés. Aujourd'hui produit par pré-analyse
  hors-ligne d'un fichier ; demain aussi par capture temps réel (mode antenne).
- `src/audio/demo.ts` — piste démo synthétisée hors-ligne (64 s, 120 BPM).
- `src/game/world.ts` — rendu top-down orthographique, fond organique shader,
  bloom ; le décor respire avec la basse et l'énergie.
- `src/game/ship.ts` — la conduite : cap au stick, inertie fluide, vitesse plancher.
- `src/game/enemies.ts` — le bestiaire par bande de fréquence.
- `src/game/weapons.ts` — armes auto, jauge, tirage de 3 cartes.

Conception consignée dans le vault Obsidian (`Documents/GameDesign`),
note projet « Beat Survivor ».
