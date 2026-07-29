// Couche de luminescence des objets gameplay (décision N4 2026-07-28) :
// un halo radial additif sous chaque entité pour la détacher du fond —
// le fond appartient à l'ambiance, la lueur appartient au gameplay.

import * as THREE from "three";

let glowTex: THREE.Texture | null = null;

/** Dégradé radial doux généré une fois (blanc → transparent). */
export function glowTexture(): THREE.Texture {
  if (!glowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.4)");
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
