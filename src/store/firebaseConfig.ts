/**
 * Firebase-config. Vul deze in met je eigen (gratis) Firebase-project om
 * live-sync tussen telefoons aan te zetten — zie README. Zolang hier de
 * PLAK_HIER-placeholders staan, werkt de app gewoon lokaal (per apparaat).
 *
 * De apiKey mag publiek in de code staan; dat is bij Firebase by design.
 */
export const firebaseConfig = {
  apiKey: "PLAK_HIER_JE_API_KEY",
  authDomain: "PLAK_HIER.firebaseapp.com",
  projectId: "PLAK_HIER_JE_PROJECT_ID",
  appId: "PLAK_HIER_JE_APP_ID",
};

export function firebaseConfigured(): boolean {
  return !Object.values(firebaseConfig).some((v) => v.includes("PLAK_HIER"));
}
