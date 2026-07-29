// Couche de luminescence des objets gameplay (décision N4 2026-07-28) :
// un halo radial additif sous chaque entité pour la détacher du fond —
// le fond appartient à l'ambiance, la lueur appartient au gameplay.

import * as THREE from "three";

let glowTex: THREE.Texture | null = null;

/**
 * Dégradé radial SERRÉ généré une fois : cœur intense, chute rapide.
 * (Verdict N4 : un large dégradé doux fait une tache laiteuse — le halo
 * doit être ajusté et intense, un liseré d'énergie, pas une nappe.)
 */
export function glowTexture(): THREE.Texture {
  if (!glowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.95)");
    g.addColorStop(0.45, "rgba(255,255,255,0.3)");
    g.addColorStop(0.62, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c);
  }
  return glowTex;
}

export function glowMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: glowTexture(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
