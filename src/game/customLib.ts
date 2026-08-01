// Bibliothèque custom persistante (idée N4 2026-07-31) : les morceaux
// déposés en drag & drop sont conservés pour être rejoués sans re-glisser
// le fichier — on revient battre son propre score. MVP : les N derniers.
// Stockage IndexedDB (les fichiers pèsent plusieurs Mo : localStorage,
// limité à ~5 Mo de texte, est hors-jeu).

import { Difficulty } from "../audio/analysis";

export interface CustomEntry {
  id: string; // nom de fichier + taille : deux dépôts du même morceau se recouvrent
  title: string;
  difficulty: Difficulty;
  addedAt: number;
  blob: Blob;
}

const DB_NAME = "beat-survivor";
const STORE = "customTracks";
export const CUSTOM_MAX = 3; // MVP : les 3 derniers morceaux (N4)

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

/** Les morceaux gardés, du plus récent au plus ancien. */
export async function listCustom(): Promise<CustomEntry[]> {
  try {
    const all = (await tx<CustomEntry[]>("readonly", (s) => s.getAll())) ?? [];
    return all.sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    return []; // navigateur sans IndexedDB (mode privé strict) : on dégrade
  }
}

/** Ajoute un morceau et fait tomber les plus vieux au-delà de CUSTOM_MAX. */
export async function rememberCustom(file: File, title: string, difficulty: Difficulty) {
  try {
    const entry: CustomEntry = {
      id: `${file.name}:${file.size}`,
      title,
      difficulty,
      addedAt: Date.now(),
      blob: file,
    };
    await tx("readwrite", (s) => s.put(entry));
    const all = await listCustom();
    for (const old of all.slice(CUSTOM_MAX)) {
      await tx("readwrite", (s) => s.delete(old.id));
    }
  } catch {
    // pas de persistance disponible : le morceau reste jouable, simplement
    // il ne sera pas mémorisé
  }
}

export async function forgetCustom(id: string) {
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {}
}
