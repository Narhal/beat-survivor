# Backlog Beat Survivor

## Chantier bestiaire (v1 livrée — détails remis à la phase de polish)

- [x] Comportements spécifiques par espèce (kyste = dériveur qui ne chasse
      pas ; moucherons en escouade ; colosse qui se scinde)
- [x] La progression débloque les TYPES : kyste > 25 %, moucherons > 45 %,
      colosse > 60 % (note N4 appliquée)
- [x] Silhouettes organiques vectorielles à la place des placeholders
- [ ] Polish (plus tard, N4) : proportions des espèces, seuils, animations
      fines, espèces supplémentaires (patrouilleurs, embusqués…), boss ?

## En attente de verdict N4 (feeling)

- [ ] Conduite : l'inertie « on nage dans la soupe » est-elle bonne ? (BASE_SPEED,
      MAX_SPEED, TURN_RATE, SMOOTH dans `src/game/ship.ts`)
- [ ] Densité des spawns par bande (ratios 1/1 basse, 1/3 médiums, 1/2 aigus)
- [ ] Rythme de la jauge (seuils ×1,4) et intérêt des 4 armes de départ
- [ ] Stratégie musique à 3 voies (fichier local / mode antenne / bibliothèque
      du collectif) — voir vault, « La musique du joueur (streaming vs fichiers) »

## Prochaines étapes techniques

- [ ] Mode antenne : capture audio système (`getDisplayMedia({audio})`) +
      producteur FluxMusical temps réel (onsets par bande sans anticipation)
- [ ] Aimants XP : les kills lâchent des fragments à ramasser en conduisant
      (renforce le verbe conduite) plutôt que jauge automatique
- [ ] Boss sur les transitions de section (détection de structure : chute
      d'énergie prolongée → drop)
- [ ] Vagues liées à l'intensité : accalmie musicale = accalmie de spawn déjà
      naturelle, à amplifier (multiplicateur par énergie moyenne glissante)
- [ ] Rumble musical : basse → gâchette forte en continu (à doser)
- [ ] Écran titre vivant + polish DA en variantes (skins de fond commutables)
- [ ] Déploiement GitHub Pages (reprendre l'outillage lofi-rider)
