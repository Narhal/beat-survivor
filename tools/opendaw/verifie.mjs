// Vérifie les types d'un script de morceau, comme le fait openDAW avant de le
// lancer. Chez openDAW, une erreur de type bloque le lancement sans rien
// afficher ; autant la voir ici.
//
//   node tools/opendaw/verifie.mjs tools/opendaw/danger2.ts
//
// Limite : openDAW a ses propres définitions (par exemple Math.SQRT2 n'y
// existe pas) ; cette vérification utilise les définitions standard.

import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const file = process.argv[2];
if (!file) throw new Error("usage : node verifie.mjs <morceau.ts>");
const dir = mkdtempSync(path.join(os.tmpdir(), "opendaw-types-"));
mkdirSync(path.join(dir, "none"));
const globals = "declare const PPQN: any; declare const openDAW: any; declare const AudioData: any; declare const sampleRate: number; declare const Interpolation: any; declare const ClassicWaveform: any; declare const VoicingMode: any; declare function gainToDb(x: number): number;\n";
const source = readFileSync(file, "utf8");
// Ce qu'openDAW ne connaît pas, à notre connaissance
const interdits = ["Math.SQRT2", "Math.SQRT1_2"].filter((w) => source.includes(w));
const check = path.join(dir, "check.ts");
writeFileSync(check, globals + "async function __main() {\n" + source + "\n}\n");
let out = "";
try {
  execSync(`npx tsc --noEmit --strict --target es2020 --lib es2020 --typeRoots "${path.join(dir, "none")}" "${check}"`, { encoding: "utf8", stdio: "pipe" });
} catch (e) {
  out = String(e.stdout || "") + String(e.stderr || "");
}
const errors = out.split("\n").filter((l) => l.includes("check.ts"));
if (interdits.length) console.log("absent des définitions d'openDAW : " + interdits.join(", "));
console.log(errors.length ? errors.slice(0, 20).join("\n") : "types : rien à signaler");
process.exitCode = errors.length || interdits.length ? 1 : 0;
