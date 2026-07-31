// Symboles des évolutions (N4 2026-07-31) : reconnaître une carte d'un coup
// d'œil sans lire. SVG inline, trait courant (currentColor) — chaque symbole
// dit le GESTE de l'arme, pas son nom.

import { UpgradeKind } from "./weapons";

const S = (body: string) =>
  `<svg class="card-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" ` +
  `stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const UPGRADE_ICONS: Record<UpgradeKind, string> = {
  // Armes — la cellule (point) et ce qu'elle projette
  blaster: S(`<circle cx="10" cy="24" r="4"/><path d="M18 24h10"/><path d="M32 24h4"/>
    <circle cx="41" cy="24" r="3.2" fill="currentColor" stroke="none"/>`),
  eventail: S(`<circle cx="34" cy="24" r="4"/><path d="M26 24 14 14"/><path d="M26 24H12"/>
    <path d="M26 24 14 34"/>`),
  orbes: S(`<circle cx="24" cy="24" r="4"/><circle cx="24" cy="24" r="14" stroke-dasharray="3 5"/>
    <circle cx="24" cy="10" r="3.4" fill="currentColor" stroke="none"/>
    <circle cx="36" cy="31" r="3.4" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="31" r="3.4" fill="currentColor" stroke="none"/>`),
  onde: S(`<circle cx="24" cy="24" r="3.4" fill="currentColor" stroke="none"/>
    <circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="17" opacity="0.5"/>`),
  tentacule: S(`<circle cx="36" cy="16" r="4"/>
    <path d="M32 19c-6 2-4 8-9 10s-8-2-13 4"/>
    <circle cx="9" cy="35" r="2.2" fill="currentColor" stroke="none"/>`),
  apoptose: S(`<circle cx="24" cy="24" r="6"/><path d="M24 12V5"/><path d="M24 43v-7"/>
    <path d="M12 24H5"/><path d="M43 24h-7"/><path d="m15.5 15.5-5-5"/><path d="m37.5 37.5-5-5"/>
    <path d="m32.5 15.5 5-5"/><path d="m10.5 37.5 5-5"/>`),
  mine: S(`<circle cx="24" cy="26" r="8"/><path d="M24 18v-5"/><path d="M32 26h5"/>
    <path d="M16 26h-5"/><path d="M24 34v5"/><path d="M20 9c2-3 6-3 8 0" opacity="0.6"/>`),
  arc: S(`<circle cx="10" cy="24" r="4"/><path d="M16 24h6"/>
    <path d="m22 24 8-9 -3 8 7-1 -9 10 3-8z" fill="currentColor" stroke="none"/>
    <path d="M38 12a18 18 0 0 1 0 24" opacity="0.45"/>`),
  // Atouts — le corps du pilote
  flagelles: S(`<circle cx="30" cy="24" r="5"/><path d="M25 22c-6-1-8 3-14 1"/>
    <path d="M25 26c-6 1-8 5-14 3"/>`),
  membrane: S(`<circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="13" stroke-dasharray="2 4"/>
    <path d="M24 5a19 19 0 0 1 0 38" opacity="0.55"/>`),
  // Passifs — les propriétés du vivant
  mitose: S(`<circle cx="17" cy="24" r="8"/><circle cx="33" cy="24" r="8" opacity="0.65"/>`),
  enzymes: S(`<path d="M14 34 34 14"/><path d="M28 10h10v10" />
    <path d="M20 30l-6 6"/><circle cx="14" cy="36" r="2.6" fill="currentColor" stroke="none"/>`),
  phagocytose: S(`<circle cx="24" cy="24" r="4.5"/>
    <path d="M13 13a15 15 0 0 0 0 22" /><path d="M35 13a15 15 0 0 1 0 22"/>
    <path d="M38 8 34 12l4 4" opacity="0.6"/><path d="M10 8l4 4-4 4" opacity="0.6"/>`),
};
