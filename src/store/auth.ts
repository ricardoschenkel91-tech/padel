/**
 * PIN-hulpfuncties. Pincodes worden nooit als platte tekst opgeslagen: we bewaren
 * alleen een SHA-256 hash (met de groepscode als salt). Dit is een vriendengroep-
 * slot, geen sterke beveiliging — de app is statisch en client-side.
 */

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + ":" + pin.trim());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Genereer een uniek 4-cijferig pincodenummer dat nog niet in `taken` voorkomt. */
export function generatePin(taken: Set<string>): string {
  let pin = "";
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (taken.has(pin));
  taken.add(pin);
  return pin;
}
