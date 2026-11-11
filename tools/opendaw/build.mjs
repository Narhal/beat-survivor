// Assemble les scripts openDAW des morceaux : chaque source (*.src.ts)
// + le code de la 303 Apparat (tb303-bass-line.js, CC0, André Michelle)
// + la voix robot (voix-sam.json, rendue par voix.mjs)
// → un seul fichier .ts par morceau, à coller dans le Script Editor d'openDAW.
//
// L'éditeur de scripts d'openDAW n'a pas d'import : tout doit tenir dans un
// fichier. Le code de la 303 y entre comme une chaîne, la voix comme un objet.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");

const inserts = {
  __TB303__: () => JSON.stringify(read("tb303-bass-line.js").replace(/\n$/, "")),
  __VOIX__: () => read("voix-sam.json").trim(),
};

for (const file of readdirSync(dir).filter((f) => f.endsWith(".src.ts"))) {
  let out = read(file);
  for (const [marker, value] of Object.entries(inserts)) {
    // Le marqueur n'est remplacé que là où il sert de valeur (après « = »)
    const at = out.indexOf("= " + marker);
    if (at >= 0) out = out.slice(0, at + 2) + value() + out.slice(at + 2 + marker.length);
  }
  const target = file.replace(".src.ts", ".ts");
  writeFileSync(path.join(dir, target), out);
  console.log(`${target} : ${out.split("\n").length} lignes, ${out.length} caractères`);
}
