# 🎾 PadelMatch

Web-app voor een vriendengroep die in ploegendienst werkt: iedereen beheert zijn
beschikbaarheid (grotendeels automatisch uit het werkrooster) en de app laat in één
oogopslag zien **wanneer minimaal 4 vrienden tegelijk kunnen padellen**.

- **Gratis, geen server, geen Vercel** — statische app op GitHub Pages.
- **Geen login** — je opent de app en kiest een groepscode.
- **Optionele live-sync** tussen telefoons via Firebase (gratis).
- Roosters worden als **regels** opgeslagen en on-demand berekend (geen records per dag).

Architectuur en beslissingen: zie [ARCHITECTURE.md](ARCHITECTURE.md).

## Roosterlogica

| 222 (10 dagen) | 223 (35 dagen) |
|---|---|
| OD 06–14 · MD 14–22 · ND 22–06 | OD 07–15 · MD 15–23 · ND 23–07 |
| `OO MM NN VVVV` | Fase B `OOO MM NN VVVVV` → C `OO MMM NN VVVVV` → A `OO MM NNN VVVV` |
| ref = eerste ochtenddienst | ref = eerste dag van een 3×OD-blok |

Plus **Dagdienst** (ma–vr 18–23, weekend 09–23) en **Aangepast**. Na een nachtdienst
geldt de ochtend erna als bezet (uitslapen). Handmatige invoer wint altijd van het rooster.

## Ontwikkelen

```bash
npm install
npm run dev        # lokale dev-server
npm test           # 60 vitest-tests (engine)
npm run typecheck
npm run build      # productie-build naar dist/
```

## Live zetten op GitHub Pages (eenmalig)

De repo bevat een workflow (`.github/workflows/deploy.yml`) die bij elke push naar
`main` test, bouwt en publiceert.

1. Repo → **Settings → Pages** → *Source*: **GitHub Actions**.
2. Push naar `main` (of draai de workflow handmatig). Na ~1 min staat de app op
   `https://ricardoschenkel91-tech.github.io/padel/`.

> De Vite-`base` staat op `/padel/`. Heet de repo anders, pas dan `base` in
> `vite.config.ts` aan.

## Cloud-sync aanzetten (Firebase, gratis)

Zonder deze stap werkt de app lokaal (per telefoon). Voor gedeelde roosters:

1. <https://console.firebase.google.com> → **Add project** (gratis).
2. **Build → Firestore Database → Create database** → start in **test mode**,
   locatie *europe-west*.
3. Tandwiel → **Project settings** → onder *Your apps* op **`</>` (Web)** →
   registreer → kopieer `apiKey`, `authDomain`, `projectId`, `appId`.
4. Plak die in **`src/store/firebaseConfig.ts`** (de `PLAK_HIER`-waarden vervangen).
5. Commit + push. De app toont dan **“Live sync”** rechtsboven.

> De `apiKey` mag publiek in de code staan (Firebase by design). Voor een privé
> vriendengroep volstaat test-mode; strengere regels kunnen later.

## Groepen

Iedereen met dezelfde **groepscode** (onder *Spelers*) deelt hetzelfde rooster.
De deel-link bevat de code (`…/padel/#g=schenkel`).

## Status

- ✅ **Fase 1** — ploegendienst-engine, beschikbaarheid, gaten-zoeker, combinatieregels, tests.
- ✅ **Fase 2** — React-app: Kansen-dashboard, persoonlijke beschikbaarheid, spelersbeheer, rooster, Firebase-seam, Pages-deploy.
- ⏭ **Fase 3+** — voorstellen, reserveringen, locaties, ranking, teammaker, notificaties, export, feestdagen/vakanties.
