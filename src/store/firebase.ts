/**
 * Optionele cloud-sync via Firebase Firestore. Geen login: elke groep is één
 * document onder de collectie "groups", met de groepscode als sleutel. Faalt de
 * initialisatie (geen config), dan draait de app in lokale modus.
 */

import type { GroupState } from "../core";
import { firebaseConfig, firebaseConfigured } from "./firebaseConfig";

type Unsub = () => void;

let ready = false;
let firestore: import("firebase/firestore").Firestore | null = null;
let fs: typeof import("firebase/firestore") | null = null;

export function cloudEnabled(): boolean {
  return firebaseConfigured();
}

async function ensureInit(): Promise<boolean> {
  if (!firebaseConfigured()) return false;
  if (ready) return firestore !== null;
  ready = true;
  try {
    const { initializeApp } = await import("firebase/app");
    fs = await import("firebase/firestore");
    const app = initializeApp(firebaseConfig);
    firestore = fs.getFirestore(app);
    return true;
  } catch (e) {
    console.warn("Firebase uit, lokale modus:", e);
    firestore = null;
    return false;
  }
}

/** Abonneer op wijzigingen van een groep. Retourneert een unsubscribe-functie. */
export async function subscribeGroup(
  code: string,
  onChange: (state: GroupState | null) => void,
): Promise<Unsub> {
  const ok = await ensureInit();
  if (!ok || !firestore || !fs) return () => {};
  const ref = fs.doc(firestore, "groups", code);
  return fs.onSnapshot(
    ref,
    (snap) => {
      onChange(snap.exists() ? (snap.data() as { state: GroupState }).state : null);
    },
    (err) => {
      // Bv. database nog niet aangemaakt of regels te streng: val stil terug op lokaal.
      console.warn("Firestore sync-fout (lokale modus blijft werken):", err);
    },
  );
}

/** Sla de volledige groepsstaat op in de cloud (indien beschikbaar). */
export async function saveGroup(code: string, state: GroupState): Promise<void> {
  const ok = await ensureInit();
  if (!ok || !firestore || !fs) return;
  const ref = fs.doc(firestore, "groups", code);
  await fs.setDoc(ref, { state, updatedAt: Date.now() });
}
