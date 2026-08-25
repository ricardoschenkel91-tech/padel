import { useMemo, useState } from "react";
import { useGroup } from "../store/GroupProvider";
import { addDays, holidayFor, playerShift, todayStr } from "../core";
import { DOW, initials, PERIOD_OPTIONS } from "../lib/ui";

export function Roster() {
  const { state } = useGroup();
  const [horizon, setHorizon] = useState(14);

  const players = useMemo(
    () => Object.values(state.players).filter((p) => p.active).sort((a, b) => a.createdAt - b.createdAt),
    [state.players],
  );
  const today = todayStr();
  const dates = useMemo(
    () => Array.from({ length: horizon }, (_, i) => addDays(today, i)),
    [horizon, today],
  );

  if (!players.length) return <div className="empty">Nog geen spelers.</div>;

  return (
    <>
      <div className="ctrls">
        <span className="chip">
          <label>Periode</label>
          <select value={horizon} onChange={(e) => setHorizon(+e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </span>
      </div>

      <div className="gridscroll">
        <table className="roster">
          <thead>
            <tr>
              <th className="namecol">Speler</th>
              {dates.map((d) => {
                const wd = new Date(d + "T00:00:00Z").getUTCDay();
                const h = holidayFor(d);
                const isToday = d === today;
                return (
                  <th key={d} className={(wd === 0 || wd === 6 ? "wknd" : "") + (isToday ? " today" : "")}>
                    {DOW[wd]}
                    <br />
                    <span className={"mono daynum" + (isToday ? " ring" : "")} style={{ fontWeight: 800 }}>{+d.split("-")[2]}</span>
                    {h && <span title={h.name} style={{ display: "block", fontSize: 11, lineHeight: 1 }}>{h.emoji}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td className="name">
                  <span
                    className="av"
                    style={{ background: p.color, width: 22, height: 22, fontSize: 10, borderWidth: 0, marginLeft: 0 }}
                  >
                    {initials(p.displayName)}
                  </span>{" "}
                  {p.displayName}
                </td>
                {dates.map((d) => {
                  const sh = playerShift(p, d);
                  return (
                    <td key={d} className={d === today ? "today" : ""}>
                      <div className={"cell " + sh}>{sh === "V" ? "·" : sh[0]}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <span><i className="cell OD" style={{ background: "var(--sh-OD-bg)", color: "var(--sh-OD)" }}>O</i> Ochtend</span>
        <span><i className="cell MD" style={{ background: "var(--sh-MD-bg)", color: "var(--sh-MD)" }}>M</i> Middag</span>
        <span><i className="cell ND" style={{ background: "var(--sh-ND-bg)", color: "var(--sh-ND)" }}>N</i> Nacht</span>
        <span><i className="cell D" style={{ background: "var(--sh-D-bg)", color: "var(--sh-D)" }}>D</i> Dagdienst</span>
        <span><i className="cell V">·</i> Vrij</span>
      </div>
      <p className="hint" style={{ margin: "12px 2px" }}>
        Na een <b>nachtdienst</b> geldt de ochtend erna als bezet (uitslapen tot 14:00) — dat rekent de app automatisch mee.
      </p>
    </>
  );
}
