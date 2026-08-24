# 🎾 PadelMatch

Een kleine web-app voor een vriendengroep die in ploegendienst werkt: iedereen vult
zijn werkrooster in, en de app laat in één oogopslag zien **wanneer minimaal 4 vrienden
tegelijk vrij zijn om te padellen**.

- **Geen server, geen Vercel, gratis** — draait volledig als statische site op GitHub Pages.
- **Werkt op elke telefoon** via de browser (voelt als een app).
- **Optionele live-sync** tussen alle telefoons via Firebase (gratis Spark-plan).
- Zonder Firebase werkt de app ook — dan blijft je invoer op dat ene apparaat.

## Roosterlogica

| Dienst | Tijd | | |
|---|---|---|---|
| **O** Ochtend | 06:00–14:00 | **N** Nacht | 22:00–06:00 |
| **M** Middag | 14:00–22:00 | **D** Dagdienst | 09:00–18:00 |

- Na een **nachtdienst** telt de ochtend erna als bezet (uitslapen tot 14:00).
- Roostertypes: **Dagdienst** (ma–vr), **5-ploegen** (2×O, 2×M, 2×N, 4× vrij),
  **3-ploegen**, **2-ploegen** en **Aangepast** (eigen cyclus).
- Je kiest je type + je **eerste werkdag**; de app rekent alle volgende dagen automatisch door.

## Live zetten op GitHub Pages (eenmalig, ~1 min)

1. Push deze repo naar GitHub (main branch).
2. Repo → **Settings → Pages**.
3. Bij *Source*: **Deploy from a branch** → branch **main**, map **/ (root)** → **Save**.
4. Na ~1 minuut staat de app op `https://<jouw-username>.github.io/<repo-naam>/`.
   Deel die link met je vrienden.

## Cloud-sync aanzetten (Firebase, gratis — ~5 min)

Zonder deze stap werkt de app al, maar dan lokaal per telefoon. Voor gedeelde roosters:

1. Ga naar <https://console.firebase.google.com> → **Add project** (Google-account, gratis).
2. Sla Google Analytics gerust over.
3. Links in het menu: **Build → Realtime Database → Create Database**
   - Kies een locatie (bv. *europe-west1*).
   - Start in **test mode** (voor een vriendengroep prima; wil je het dichttimmeren, zie onder).
4. Klik op het tandwiel → **Project settings** → onder *Your apps* op **`</>` (Web)** → geef 'm een naam → **Register app**.
5. Je krijgt een `firebaseConfig`-blokje. Kopieer daaruit `apiKey`, `databaseURL` en `projectId`.
6. Open **`index.html`**, zoek bovenin het script naar `FIREBASE_CONFIG` en vul je waarden in:

   ```js
   const FIREBASE_CONFIG = {
     apiKey: "AIza....",
     databaseURL: "https://jouw-project-default-rtdb.europe-west1.firebasedatabase.app",
     projectId: "jouw-project-id"
   };
   ```

7. Commit + push. GitHub Pages werkt zichzelf bij; de app toont dan **“Live sync”** rechtsboven.

> De `apiKey` mag gewoon publiek in de code staan — dat is bij Firebase by design.

### (Optioneel) Database-regels wat strakker

Test-mode staat lezen/schrijven open voor iedereen. Voor een privé vriendengroep kun je in
**Realtime Database → Rules** dit gebruiken (alles onder één gedeelde groep, geen login nodig):

```json
{ "rules": { "groups": { ".read": true, ".write": true } } }
```

Wil je echt afschermen, dan is anonymous auth de volgende stap — vraag gerust.

## Groepen

Iedereen met dezelfde **groepscode** (in de app onder *Spelers*) deelt hetzelfde rooster.
Standaard is dat `padel`. Meerdere vriendengroepen kunnen zo dezelfde deploy gebruiken zonder
elkaar te storen. De deel-link bevat de groepscode (`...#g=padel`).

## Lokaal bekijken

Gewoon `index.html` in je browser openen. Geen build-stap, geen dependencies.
