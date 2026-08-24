# PadelMatch — architectuur & beslissingen

Deze app plant padel voor een vriendengroep die in ploegendienst werkt: iedereen
beheert zijn beschikbaarheid (grotendeels automatisch uit het werkrooster), en de
app vindt de momenten waarop minimaal vier spelers samen kunnen.

## Gekozen aanpak (optie B — lichte variant)

| Onderwerp | Keuze | Waarom |
|---|---|---|
| Hosting | **GitHub Pages** (statisch) | Gratis, geen Vercel |
| Frontend | **Vite + React + TypeScript** | Veel schermen; onderhoudbaar |
| Opslag/sync | **Firebase Firestore** (later), fallback localStorage | Gratis, realtime, **geen login** |
| Inloggen | **Geen** — groepscode i.p.v. accounts | Bewust; rollen zijn "zacht" |
| Rekenwerk | **On-demand uit regels** (spec §41) | Geen records per dag/speler vooraf |

De zwaardere spec-eisen die een echte server vragen (Prisma/SQL, server-side
validatie, CSRF, rate limiting, RBAC met echte sessies) vervallen bewust in deze
variant. De functionaliteit voor de gebruiker blijft gelijk.

## Domein-core (`src/core/`) — hart van de app, volledig getest

Pure TypeScript, geen UI/Firebase-afhankelijkheid, draait onder Vitest.

- `dates.ts` — tijdzone-veilig datumrekenen, **positieve modulo**.
- `types.ts` — datamodel (spelers, roosters, beschikbaarheid, beperkingen, locaties).
- `schedules.ts` — **ploegendienst-engine**. Roosters zijn data, geen hardcode.
- `availability.ts` — beschikbaarheid per dag uit de dienst-overgangsregels (§17),
  met handmatige invoer die **altijd voorrang** heeft (§8).
- `restrictions.ts` — combinatiebeperkingen + geldige groepen van vier (§12, §30).
- `slots.ts` — `findPlayableSlots` (§10, §29): gezamenlijke gaten + viertallen.
- `seed.ts` — vaste spelers, reserves, locaties, Vincent–Claudia-regel, NL-instellingen.

### Roosterpatronen (geverifieerd met tests)

- **222** (10 dagen): `OO MM NN VVVV`. Referentie = eerste OD. Ricardo S: ref 2026-08-24.
- **223** (35 dagen): één rotatie van drie fasen —
  Fase B `OOO MM NN VVVVV` → Fase C `OO MMM NN VVVVV` → Fase A `OO MM NNN VVVV`.
  Referentie = eerste dag van een 3×OD-blok (= start Fase B).
  Maurice T: ref 2026-08-23 (dag-voor-dag als test vastgelegd).
  Diensttijden: 222 → OD 06–14 / MD 14–22 / ND 22–06 · 223 → OD 07–15 / MD 15–23 / ND 23–07.

> ⚠️ **Openstaand:** Dwayne C's referentiedatum staat voorlopig op 2026-08-14 (uit de
> oude, inconsistente spec). Te bevestigen met zijn echte "eerste 3×OD-dag".

## Faseplan

1. ✅ **Fase 1** — core-engine + beschikbaarheid + gaten + combinatieregels + tests.
2. **Fase 2** — React-app, Firebase-sync, spelersbeheer, persoonlijke beschikbaarheid, roosterbouwer.
3. **Fase 3** — groepsdashboard, voorstellen, reserveringen, locaties.
4. **Fase 4** — ranking, teammaker, uitslagen, notificaties, export.
5. **Fase 5** — feestdagen/vakanties, import, extra tests, handleiding.

## Testen

```bash
npm install
npm test          # vitest — 60 tests
npm run typecheck
```
