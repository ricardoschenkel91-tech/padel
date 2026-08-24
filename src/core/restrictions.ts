/**
 * Combinatiebeperkingen (spec §12, §30). Generiek systeem: sommige spelersparen
 * mogen niet automatisch samen worden ingepland. De regels zijn data, zodat later
 * meer paren of typen kunnen worden toegevoegd.
 */

import type { DateStr } from "./dates";
import type {
  CombinationOverride,
  CombinationRestriction,
  Interval,
  RestrictionType,
} from "./types";

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/** Actieve beperking tussen twee spelers op een datum, of null. */
export function restrictionBetween(
  a: string,
  b: string,
  date: DateStr,
  restrictions: CombinationRestriction[],
): CombinationRestriction | null {
  const key = pairKey(a, b);
  for (const r of restrictions) {
    if (!r.active) continue;
    if (pairKey(r.playerA, r.playerB) !== key) continue;
    if (r.startDate && date < r.startDate) continue;
    if (r.endDate && date > r.endDate) continue;
    return r;
  }
  return null;
}

/** Is er voor dit paar op deze datum/tijd een handmatige uitzondering? */
export function hasOverride(
  restrictionId: string,
  date: DateStr,
  overrides: CombinationOverride[],
  window?: Interval,
): boolean {
  return overrides.some((o) => {
    if (o.restrictionId !== restrictionId || o.date !== date) return false;
    if (!o.window || !window) return true;
    return o.window.start <= window.start && o.window.end >= window.end;
  });
}

export interface PairIssue {
  a: string;
  b: string;
  type: RestrictionType;
  reason?: string;
  overridden: boolean;
}

/** Alle beperkings-problemen binnen een groep spelers op een datum/venster. */
export function issuesInGroup(
  playerIds: string[],
  date: DateStr,
  restrictions: CombinationRestriction[],
  overrides: CombinationOverride[],
  window?: Interval,
): PairIssue[] {
  const issues: PairIssue[] = [];
  for (let i = 0; i < playerIds.length; i++)
    for (let j = i + 1; j < playerIds.length; j++) {
      const r = restrictionBetween(playerIds[i], playerIds[j], date, restrictions);
      if (!r) continue;
      issues.push({
        a: playerIds[i],
        b: playerIds[j],
        type: r.type,
        reason: r.reason,
        overridden: hasOverride(r.id, date, overrides, window),
      });
    }
  return issues;
}

/**
 * Mag deze groep van vier AUTOMATISCH worden voorgesteld?
 *  - HARDE_BLOKKADE en NIET_AUTO_SAMEN blokkeren automatische selectie
 *    (tenzij er een geldige override is);
 *  - WAARSCHUWING en HANDMATIGE_GOEDKEURING blokkeren niet, maar geven een vlag.
 */
export function isAutoSelectable(
  playerIds: string[],
  date: DateStr,
  restrictions: CombinationRestriction[],
  overrides: CombinationOverride[],
  window?: Interval,
): boolean {
  return !issuesInGroup(playerIds, date, restrictions, overrides, window).some(
    (iss) =>
      !iss.overridden &&
      (iss.type === "HARDE_BLOKKADE" || iss.type === "NIET_AUTO_SAMEN"),
  );
}

/** Alle geldige groepen van `size` uit de beschikbare spelers (auto-selecteerbaar). */
export function validGroups(
  playerIds: string[],
  size: number,
  date: DateStr,
  restrictions: CombinationRestriction[],
  overrides: CombinationOverride[],
  window?: Interval,
): string[][] {
  const out: string[][] = [];
  const combo: string[] = [];
  const rec = (start: number) => {
    if (combo.length === size) {
      if (isAutoSelectable(combo, date, restrictions, overrides, window))
        out.push([...combo]);
      return;
    }
    for (let i = start; i < playerIds.length; i++) {
      combo.push(playerIds[i]);
      rec(i + 1);
      combo.pop();
    }
  };
  rec(0);
  return out;
}
