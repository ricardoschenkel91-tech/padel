import { useMemo, useState } from "react";
import { useGroup } from "../store/GroupProvider";
import { addDays, playableSlotsForDate, todayStr, type Location, type PlayableSlot } from "../core";
import { DOW, fmtDuration, fmtWindow, initials, niceDate, PERIOD_OPTIONS } from "../lib/ui";

function level(n: number): "green" | "yellow" | "orange" {
  return n >= 4 ? "green" : n === 3 ? "yellow" : "orange";
}

export function Dashboard() {
  const { state, currentPlayer } = useGroup();
  const [min, setMin] = useState(state.settings.minPlayers);
  const [horizon, setHorizon] = useState(14);
  const [scope, setScope] = useState<"self" | "group">("self");

  const players = useMemo(
    () => Object.values(state.players).filter((p) => p.active && !p.reserve),
    [state.players],
  );

  const meId = currentPlayer?.id;
  const filterMe = scope === "self" && meId ? meId : undefined;

  const days = useMemo(() => {
    const start = todayStr();
    return Array.from({ length: horizon }, (_, i) => {
      const date = addDays(start, i);
      const slots = playableSlotsForDate(state, date, state.availability, {
        minPlayers: min,
        playerId: filterMe,
      });
      return { date, slots, isToday: i === 0 };
    }).filter((d) => d.slots.length > 0);
  }, [state, horizon, min, filterMe]);

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
        <div className="seg">
          <button aria-pressed={scope === "self"} onClick={() => setScope("self")}>Ik kan ook</button>
          <button aria-pressed={scope === "group"} onClick={() => setScope("group")}>Hele groep</button>
        </div>
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
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </span>
      </div>

      {days.length === 0 ? (
        <div className="empty">
          <div className="big">🗓️</div>
          {scope === "self" ? "Geen momenten waarop jij én genoeg anderen kunnen" : `Geen momenten met ${min}+ spelers`} in deze periode.
        </div>
      ) : (
        days.map(({ date, slots, isToday }) => (
          <DayCard key={date} date={date} slots={slots} isToday={isToday} players={state.players} meId={meId} />
        ))
      )}
    </>
  );
}

function DayCard({
  date,
  slots,
  isToday,
  players,
  meId,
}: {
  date: string;
  slots: PlayableSlot[];
  isToday: boolean;
  players: ReturnType<typeof useGroup>["state"]["players"];
  meId?: string;
}) {
  const { state } = useGroup();
  const locations = Object.values(state.locations).filter((l) => l.active);
  const [open, setOpen] = useState<number | null>(null);
  const best = slots.reduce((mx, s) => Math.max(mx, s.availablePlayers.length), 0);
  const lv = best >= 4 ? "green" : best === 3 ? "yellow" : "orange";

  return (
    <div className={"daycard lv-" + lv}>
      <div className="dc-head">
        <span className="dc-dow">{DOW[new Date(date + "T00:00:00Z").getUTCDay()]}</span>
        <span className="dc-date mono">{niceDate(date)}</span>
        {isToday && <span className="badge today">Vandaag</span>}
      </div>

      <div className="slots">
        {slots.map((s, i) => {
          const who = s.availablePlayers.map((id) => players[id]).filter(Boolean);
          const lvl = level(who.length);
          // Combinatie-waarschuwing alleen tonen aan de betrokken speler zelf.
          const myWarn = s.warnings.find(
            (w) => !w.overridden && w.type !== "WAARSCHUWING" && meId && (w.a === meId || w.b === meId),
          );
          const otherId = myWarn ? (myWarn.a === meId ? myWarn.b : myWarn.a) : null;
          const canPlay = who.length >= 4;
          const isOpen = open === i;
          return (
            <div key={i}>
              <div
                className={"slot " + lvl + (canPlay ? " clickable" : "")}
                role={canPlay ? "button" : undefined}
                tabIndex={canPlay ? 0 : undefined}
                aria-expanded={canPlay ? isOpen : undefined}
                onClick={canPlay ? () => setOpen(isOpen ? null : i) : undefined}
                onKeyDown={canPlay ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(isOpen ? null : i); } } : undefined}
              >
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
                  <span className={"cnt " + lvl}>{canPlay ? "kan!" : who.length}</span>
                  {canPlay && <span className="chev">{isOpen ? "▲" : "▼"}</span>}
                </div>
              </div>
              {myWarn && otherId && (
                <div className="warnrow">
                  ⚠️ Jij & {players[otherId]?.displayName} worden niet automatisch samen ingedeeld
                  {myWarn.reason ? ` — ${myWarn.reason}` : ""}
                </div>
              )}
              {canPlay && isOpen && <LocationsPanel locations={locations} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LocationsPanel({ locations }: { locations: Location[] }) {
  if (!locations.length) {
    return <div className="locpanel"><div className="lhead">Nog geen locaties toegevoegd</div></div>;
  }
  return (
    <div className="locpanel">
      <div className="lhead">Beschikbare banen — kies waar je speelt</div>
      {locations.map((l) => (
        <div className="locrow" key={l.id}>
          <span className="licon">🎾</span>
          <div className="lmeta">
            <b>{l.name}</b>
            <small>{l.city} · {l.address}{l.indoor ? " · indoor" : ""}</small>
          </div>
          {l.bookingUrl ? (
            <a className="book" href={l.bookingUrl} target="_blank" rel="noreferrer">Reserveren →</a>
          ) : l.website ? (
            <a className="book" href={l.website} target="_blank" rel="noreferrer">Website →</a>
          ) : (
            <a
              className="book"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.name + " " + l.city)}`}
              target="_blank"
              rel="noreferrer"
            >
              Route →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
