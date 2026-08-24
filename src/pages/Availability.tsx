import { useMemo, useState } from "react";
import { useGroup } from "../store/GroupProvider";
import {
  addDays,
  resolveAvailability,
  todayStr,
  type AvailabilityStatus,
  type ShiftCode,
} from "../core";
import { DOW, fmtWindow, niceDate, PERIOD_OPTIONS, SHIFT_LABEL } from "../lib/ui";

const OPTIONS: { status: AvailabilityStatus; label: string; cls: string }[] = [
  { status: "AUTO", label: "Idle", cls: "b-idle" },
  { status: "BESCHIKBAAR", label: "Ik kan", cls: "b-ok" },
  { status: "NIET_BESCHIKBAAR", label: "Ik kan niet", cls: "b-no" },
];

export function AvailabilityPage() {
  const { state, setAvailability, clearAvailability, currentPlayer, isAdmin } = useGroup();
  const players = useMemo(
    () => Object.values(state.players).filter((p) => p.active).sort((a, b) => a.createdAt - b.createdAt),
    [state.players],
  );
  const [sel, setSel] = useState(currentPlayer?.id ?? players[0]?.id ?? "");
  // Niet-admins kunnen alleen hun eigen beschikbaarheid beheren.
  const playerId = isAdmin ? sel : currentPlayer?.id ?? sel;
  const [horizon, setHorizon] = useState(14);

  const player = state.players[playerId];
  const dates = useMemo(
    () => Array.from({ length: horizon }, (_, i) => addDays(todayStr(), i)),
    [horizon],
  );

  if (!players.length) return <div className="empty">Voeg eerst spelers toe.</div>;

  const setStatus = (date: string, status: AvailabilityStatus) => {
    if (status === "AUTO") clearAvailability(playerId, date);
    else setAvailability({ id: playerId + "|" + date, playerId, date, status });
  };

  return (
    <>
      <div className="ctrls">
        <span className="chip">
          <label>Speler</label>
          {isAdmin ? (
            <select value={sel} onChange={(e) => setSel(e.target.value)}>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          ) : (
            <b style={{ color: "var(--ink)" }}>{currentPlayer?.displayName ?? "—"}</b>
          )}
        </span>
        <span className="chip">
          <label>Periode</label>
          <select value={horizon} onChange={(e) => setHorizon(+e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </span>
      </div>

      {player &&
        dates.map((date) => {
          const manual = state.availability[playerId + "|" + date];
          const res = resolveAvailability(player, date, manual);
          const current: AvailabilityStatus = manual?.status ?? "AUTO";
          const sh = (res.shift ?? "V") as ShiftCode;
          return (
            <div className="avday" key={date}>
              <div className="avday-head">
                <b style={{ fontFamily: "var(--font-display)", textTransform: "capitalize" }}>
                  {DOW[new Date(date + "T00:00:00Z").getUTCDay()]}
                </b>
                <span className="mono muted" style={{ fontSize: 12, fontWeight: 600 }}>{niceDate(date)}</span>
                <span className="shift" style={{ background: `var(--sh-${sh}-bg)`, color: `var(--sh-${sh})` }}>
                  {SHIFT_LABEL[sh]}
                </span>
              </div>
              <div className="statusrow">
                {OPTIONS.map((o) => (
                  <button
                    key={o.status}
                    className={o.cls}
                    aria-pressed={current === o.status}
                    onClick={() => setStatus(date, o.status)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="reason">
                {current === "AUTO" && (
                  <b style={{ color: "var(--ink-3)" }}>Idle — nog te bevestigen · </b>
                )}
                {res.intervals.length
                  ? `rooster: ${res.intervals.map(fmtWindow).join(", ")} (${res.reason})`
                  : `rooster: niet beschikbaar (${res.reason})`}
              </div>
            </div>
          );
        })}
    </>
  );
}
