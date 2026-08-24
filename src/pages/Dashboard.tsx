import { useMemo, useState } from "react";
import { useGroup } from "../store/GroupProvider";
import {
  addDays,
  playableSlotsForDate,
  playerShift,
  todayStr,
  type PlayableSlot,
} from "../core";
import { DOW, fmtDuration, fmtWindow, initials, niceDate, SHIFT_LABEL } from "../lib/ui";

function level(n: number): "green" | "yellow" | "orange" {
  return n >= 4 ? "green" : n === 3 ? "yellow" : "orange";
}

export function Dashboard() {
  const { state } = useGroup();
  const [min, setMin] = useState(state.settings.minPlayers);
  const [horizon, setHorizon] = useState(14);

  const players = useMemo(
    () => Object.values(state.players).filter((p) => p.active && !p.reserve),
    [state.players],
  );

  const days = useMemo(() => {
    const start = todayStr();
    return Array.from({ length: horizon }, (_, i) => {
      const date = addDays(start, i);
      const slots = playableSlotsForDate(state, date, state.availability, { minPlayers: min });
      return { date, slots, isToday: i === 0 };
    });
  }, [state, horizon, min]);

  if (players.length < 4) {
    return (
      <div className="empty">
        <div className="big">🎾</div>
        Voeg minstens <b>4 spelers</b> toe met hun rooster.
        <br />
        Dan zie je hier wanneer jullie samen kunnen padellen.
      </div>
    );
  }

  return (
    <>
      <div className="ctrls">
        <span className="chip">
          <label>Min. spelers</label>
          <span className="step">
            <button onClick={() => setMin((m) => Math.max(2, m - 1))} aria-label="minder">–</button>
            <b className="mono">{min}</b>
            <button onClick={() => setMin((m) => Math.min(8, m + 1))} aria-label="meer">+</button>
          </span>
        </span>
        <span className="chip">
          <label>Periode</label>
          <select value={horizon} onChange={(e) => setHorizon(+e.target.value)}>
            <option value={7}>7 dagen</option>
            <option value={14}>2 weken</option>
            <option value={28}>4 weken</option>
          </select>
        </span>
      </div>

      {days.map(({ date, slots, isToday }) => (
        <DayCard key={date} date={date} slots={slots} isToday={isToday} players={state.players} min={min} />
      ))}
    </>
  );
}

function DayCard({
  date,
  slots,
  isToday,
  players,
  min,
}: {
  date: string;
  slots: PlayableSlot[];
  isToday: boolean;
  players: ReturnType<typeof useGroup>["state"]["players"];
  min: number;
}) {
  const best = slots.reduce((mx, s) => Math.max(mx, s.availablePlayers.length), 0);
  const lv = best >= 4 ? "green" : best === 3 ? "yellow" : best === 2 ? "orange" : "none";
  const active = Object.values(players).filter((p) => p.active && !p.reserve);

  return (
    <div className={"daycard lv-" + lv}>
      <div className="dc-head">
        <span className="dc-dow">{DOW[new Date(date + "T00:00:00Z").getUTCDay()]}</span>
        <span className="dc-date mono">{niceDate(date)}</span>
        {isToday && <span className="badge today">Vandaag</span>}
      </div>

      {slots.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
          — geen moment met {min}+ spelers
        </div>
      ) : (
        <div className="slots">
          {slots.map((s, i) => {
            const who = s.availablePlayers.map((id) => players[id]).filter(Boolean);
            const lvl = level(who.length);
            const warn = s.warnings.find((w) => !w.overridden && w.type !== "WAARSCHUWING");
            return (
              <div key={i}>
                <div className={"slot " + lvl}>
                  <div>
                    <div className="time mono">{fmtWindow(s.window)}</div>
                    <div className="sub">
                      {who.length} vrij · advies {fmtDuration(s.recommendedDurationMin)}
                    </div>
                  </div>
                  <div className="who">
                    <div className="avstack">
                      {who.slice(0, 6).map((p) => (
                        <span key={p.id} className="av" style={{ background: p.color }} title={p.fullName}>
                          {initials(p.displayName)}
                        </span>
                      ))}
                    </div>
                    <span className={"cnt " + lvl}>{who.length >= 4 ? "kan!" : who.length}</span>
                  </div>
                </div>
                {warn && (
                  <div className="warnrow">
                    ⚠️ {players[warn.a]?.displayName} & {players[warn.b]?.displayName} niet auto-samen
                    {warn.reason ? ` (${warn.reason})` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="roster-mini">
        {active.map((p) => {
          const sh = playerShift(p, date);
          return (
            <span className="pill" key={p.id}>
              <span className="pd" style={{ background: `var(--sh-${sh})` }} title={SHIFT_LABEL[sh]}>
                {sh === "V" ? "" : sh[0]}
              </span>
              {p.displayName}
            </span>
          );
        })}
      </div>
    </div>
  );
}
