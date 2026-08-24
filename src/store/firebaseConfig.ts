/**
 * Firebase-config voor live-sync. Deze waarden mogen publiek in de code staan;
 * bij Firebase is dat by design (de beveiliging zit in de Firestore-regels).
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDGveXcM6vS79XrCoZUwCiJxZcxtbLnDBM",
  authDomain: "padelmatch-b5cb1.firebaseapp.com",
  projectId: "padelmatch-b5cb1",
  appId: "1:178244907899:web:7571dc09080f20e13bc3de",
};

export function firebaseConfigured(): boolean {
  return !Object.values(firebaseConfig).some((v) => v.includes("PLAK_HIER"));
}
