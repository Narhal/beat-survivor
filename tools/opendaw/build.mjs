// Assemble le script openDAW du morceau : le source (acid-reverie.src.ts)
// + le code de la 303 Apparat (tb303-bass-line.js, CC0, André Michelle)
// → acid-reverie.ts, un seul fichier à coller dans le Script Editor d'openDAW.
//
// L'éditeur de scripts d'openDAW n'a pas d'import : tout doit tenir dans un
// fichier. Le code de la 303 y entre comme une chaîne.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");

const tb303 = read("tb303-bass-line.js").replace(/\n$/, "");
const src = read("acid-reverie.src.ts");
if (!src.includes("__TB303__")) throw new Error("marqueur __TB303__ absent du source");

const out = src.replace("__TB303__", () => JSON.stringify(tb303));
writeFileSync(path.join(dir, "acid-reverie.ts"), out);
console.log(`acid-reverie.ts : ${out.split("\n").length} lignes, ${out.length} caractères`);
