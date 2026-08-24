import { useGroup } from "../store/GroupProvider";
import { isoWeek, todayStr } from "../core";
import { DOW, fmtWindow, initials, niceDate } from "../lib/ui";
import { downloadICS } from "../lib/ics";

export function Reserved() {
  const { state, isAdmin, currentPlayer, removeBooking } = useGroup();
  const today = todayStr();
  const bookings = Object.values(state.bookings)
    .filter((b) => b.date >= today)
    .sort((a, b) => (a.date + String(a.start).padStart(5, "0")).localeCompare(b.date + String(b.start).padStart(5, "0")));

  if (!bookings.length) {
    return (
      <div className="empty">
        <div className="big">📅</div>
        Nog geen bevestigde reserveringen.
        <br />
        Bevestig er één via een groene tegel bij <b>Kansen</b> → tik op een baan.
      </div>
    );
  }

  return (
    <>
      {bookings.map((b) => {
        const loc = state.locations[b.locationId];
        const players = b.playerIds.map((id) => state.players[id]).filter(Boolean);
        const canCancel = isAdmin || b.bookedBy === currentPlayer?.id;
        return (
          <div className="daycard confirmed" key={b.id}>
            <div className="dc-head">
              <span className="dc-dow">{DOW[new Date(b.date + "T00:00:00Z").getUTCDay()]}</span>
              <span className="dc-date mono">{niceDate(b.date)}</span>
              <span className="dc-wk mono">wk {isoWeek(b.date)}</span>
              <span className="badge conf">Gereserveerd</span>
            </div>
            <div className="resline"><span className="rk">Tijd</span><b className="mono">{fmtWindow({ start: b.start, end: b.end })}</b></div>
            <div className="resline"><span className="rk">Baan</span><b>{loc?.name ?? "—"}{b.court ? ` · baan ${b.court}` : ""}</b></div>
            {loc && <div className="resline"><span className="rk">Plek</span><span className="muted">{loc.city} · {loc.address}</span></div>}
            <div className="avstack" style={{ margin: "10px 4px 6px", flexDirection: "row" }}>
              {players.map((p) => (
                <span key={p.id} className="av" style={{ background: p.color }} title={p.fullName}>{initials(p.displayName)}</span>
              ))}
            </div>
            <div className="btnrow" style={{ marginTop: 6 }}>
              <button className="btn primary" onClick={() => downloadICS(b, state)}>📅 Aan agenda</button>
              {loc && (
                <a
                  className="btn ghost"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + " " + loc.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
                >
                  Route
                </a>
              )}
              {canCancel && (
                <button className="btn ghost" onClick={() => { if (confirm("Reservering annuleren?")) removeBooking(b.id); }}>
                  Annuleer
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
