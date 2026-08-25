import { useMemo, useState } from "react";
import { useGroup } from "../store/GroupProvider";
import {
  addDays,
  holidayFor,
  isoWeek,
  playableSlotsForDate,
  schoolVacationFor,
  todayStr,
  type Location,
  type PlayableSlot,
} from "../core";
import { DOW, fmtDuration, fmtHour, fmtWindow, initials, niceDate, PERIOD_OPTIONS, timeToHour } from "../lib/ui";

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
    }).filter((d) => d.slots.length > 0 || Object.values(state.bookings).some((b) => b.date === d.date));
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
  const booking = Object.values(state.bookings).find((b) => b.date === date);
  const holiday = holidayFor(date);
  const vacation = schoolVacationFor(date);
  const best = slots.reduce((mx, s) => Math.max(mx, s.availablePlayers.length), 0);
  const lv = best >= 4 ? "green" : best === 3 ? "yellow" : "orange";

  return (
    <div className={"daycard lv-" + lv + (booking ? " confirmed" : "") + (holiday ? " festive" : "")}>
      {holiday && <FestiveOverlay name={holiday.name} emoji={holiday.emoji} />}
      <div className="dc-head">
        <span className="dc-dow">{DOW[new Date(date + "T00:00:00Z").getUTCDay()]}</span>
        <span className="dc-date mono">{niceDate(date)}</span>
        <span className="dc-wk mono">wk {isoWeek(date)}</span>
        {holiday && <span className="hol" title={holiday.name}>{holiday.emoji} {holiday.name}</span>}
        {vacation && <span className="vac" title="Schoolvakantie Noord">🏖️ {vacation.name}</span>}
        {booking ? (
          <span className="badge conf">Gereserveerd</span>
        ) : isToday ? (
          <span className="badge today">Vandaag</span>
        ) : null}
      </div>

      <div className="slots">
        {slots.length === 0 && booking ? (
          <div className="slot reserved">
            <div>
              <div className="time mono">{fmtWindow({ start: booking.start, end: booking.end })}</div>
              <div className="sub">
                {state.locations[booking.locationId]?.name ?? "gereserveerd"}
                {booking.court ? ` · baan ${booking.court}` : ""}
              </div>
            </div>
            <span className="cnt purple">geboekt</span>
          </div>
        ) : (
          slots.map((s, i) => {
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
                className={"slot " + (booking ? "reserved" : lvl) + (canPlay ? " clickable" : "")}
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
                    {who.slice(0, 6).map((p) => {
                      const confirmed = state.availability[p.id + "|" + date]?.status === "BESCHIKBAAR";
                      return (
                        <span
                          key={p.id}
                          className={"av" + (confirmed ? "" : " idle")}
                          style={{ background: confirmed ? p.color : "var(--sh-V)" }}
                          title={p.fullName + (confirmed ? " — kan!" : " — nog geen keuze")}
                        >
                          {initials(p.displayName)}
                        </span>
                      );
                    })}
                  </div>
                  <span className={"cnt " + (booking ? "purple" : lvl)}>{booking ? "geboekt" : canPlay ? "kan!" : who.length}</span>
                  {canPlay && <span className="chev">{isOpen ? "▲" : "▼"}</span>}
                </div>
              </div>
              {myWarn && otherId && (
                <div className="warnrow">
                  ⚠️ Jij & {players[otherId]?.displayName} worden niet automatisch samen ingedeeld
                  {myWarn.reason ? ` — ${myWarn.reason}` : ""}
                </div>
              )}
              {canPlay && isOpen && <LocationsPanel locations={locations} date={date} slot={s} />}
            </div>
          );
          })
        )}
      </div>
    </div>
  );
}

function LocationsPanel({ locations, date, slot }: { locations: Location[]; date: string; slot: PlayableSlot }) {
  const { state, upsertBooking, currentPlayer } = useGroup();
  const [openLoc, setOpenLoc] = useState<string | null>(null);
  const [start, setStart] = useState(fmtHour(slot.window.start));
  const [dur, setDur] = useState(slot.recommendedDurationMin || 90);
  const [court, setCourt] = useState("");
  const [done, setDone] = useState(false);

  if (!locations.length) {
    return <div className="locpanel"><div className="lhead">Nog geen locaties toegevoegd</div></div>;
  }
  if (done) {
    return (
      <div className="locpanel">
        <div className="lhead" style={{ color: "var(--purple)" }}>✓ Gereserveerd — zie het tabblad “Gereserveerd”.</div>
      </div>
    );
  }

  const confirmBooking = (locId: string) => {
    const s = timeToHour(start);
    const e = s + dur / 60;
    const confirmed = slot.availablePlayers.filter(
      (id) => state.availability[id + "|" + date]?.status === "BESCHIKBAAR",
    );
    const playerIds = confirmed.length ? confirmed : slot.availablePlayers;
    upsertBooking({
      id: "bk" + Date.now().toString(36),
      date,
      start: s,
      end: e,
      locationId: locId,
      court: court.trim() || undefined,
      playerIds,
      bookedBy: currentPlayer?.id,
      createdAt: Date.now(),
    });
    setOpenLoc(null);
    setDone(true);
  };

  return (
    <div className="locpanel">
      <div className="lhead">Beschikbare banen — kies waar je speelt</div>
      {locations.map((l) => (
        <div key={l.id}>
          <div className="locrow">
            <span className="licon">🎾</span>
            <div className="lmeta">
              <b>{l.name}</b>
              <small>{l.city} · {l.address}{l.indoor ? " · indoor" : ""}</small>
            </div>
            <div className="locacts">
              <a
                className="book"
                href={l.bookingUrl || l.website || `https://www.google.com/search?q=${encodeURIComponent(l.name + " padel reserveren")}`}
                target="_blank"
                rel="noreferrer"
              >
                Boek online →
              </a>
              <button className="book bookbtn" onClick={() => setOpenLoc(openLoc === l.id ? null : l.id)}>
                Reserveren
              </button>
            </div>
          </div>
          {openLoc === l.id && (
            <div className="bookform">
              <div className="bfrow">
                <span>Tijd</span>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="bfrow">
                <span>Duur</span>
                <select value={dur} onChange={(e) => setDur(+e.target.value)}>
                  {state.settings.durationsMin.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
              <div className="bfrow">
                <span>Baan</span>
                <input type="text" placeholder="bv. 3" value={court} onChange={(e) => setCourt(e.target.value)} />
              </div>
              <button className="btn primary" onClick={() => confirmBooking(l.id)}>Bevestig reservering</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type Motion = "fall" | "rise" | "drift";
const FESTIVE: Record<string, { emojis: string[]; motion: Motion; count: number }> = {
  "Nieuwjaarsdag": { emojis: ["🎉", "🎊", "✨", "🥂"], motion: "rise", count: 10 },
  "Valentijnsdag": { emojis: ["💗", "💘", "💖", "❤️"], motion: "rise", count: 9 },
  "Koningsdag": { emojis: ["👑", "🧡", "🎉", "🦁"], motion: "drift", count: 9 },
  "Bevrijdingsdag": { emojis: ["🇳🇱", "🎈", "🧡", "🕊️"], motion: "drift", count: 8 },
  "Goede Vrijdag": { emojis: ["✝️", "🕯️"], motion: "drift", count: 4 },
  "Eerste Paasdag": { emojis: ["🐣", "🥚", "🐰", "🌷"], motion: "drift", count: 9 },
  "Tweede Paasdag": { emojis: ["🐣", "🥚", "🐰", "🌷"], motion: "drift", count: 9 },
  "Hemelvaartsdag": { emojis: ["☁️", "🕊️", "✨"], motion: "drift", count: 7 },
  "Eerste Pinksterdag": { emojis: ["🕊️", "☁️", "🔥"], motion: "drift", count: 7 },
  "Tweede Pinksterdag": { emojis: ["🕊️", "☁️", "🔥"], motion: "drift", count: 7 },
  "Halloween": { emojis: ["🦇", "👻", "🎃", "🕸️", "🕷️"], motion: "drift", count: 10 },
  "Sinterklaas": { emojis: ["🎁", "⭐", "🍪", "🎉"], motion: "fall", count: 9 },
  "Eerste Kerstdag": { emojis: ["❄️", "❄️", "🎄", "⛄", "🎁"], motion: "fall", count: 11 },
  "Tweede Kerstdag": { emojis: ["❄️", "❄️", "🎄", "⛄", "🎁"], motion: "fall", count: 11 },
  "Oudjaarsdag": { emojis: ["🎆", "🎇", "✨", "🥂"], motion: "rise", count: 10 },
};

function FestiveOverlay({ name, emoji }: { name: string; emoji: string }) {
  const cfg = FESTIVE[name] ?? { emojis: [emoji], motion: "drift" as Motion, count: 6 };
  const items = useMemo(
    () =>
      Array.from({ length: cfg.count }, (_, i) => ({
        em: cfg.emojis[i % cfg.emojis.length],
        pos: Math.round((i * 97 + 13) % 100), // pseudo-willekeurige spreiding
        dur: 5 + ((i * 7) % 6), // 5–10s
        delay: -(((i * 13) % 60) / 10), // negatief = meteen verspreid in beeld
        size: 13 + ((i * 5) % 12), // 13–24px
      })),
    [name], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <div className={"festive-ov " + cfg.motion} aria-hidden>
      {items.map((it, i) => {
        const s: Record<string, string> =
          cfg.motion === "drift"
            ? { top: it.pos + "%", left: "-12px" }
            : { left: it.pos + "%" };
        s.animationDuration = it.dur + "s";
        s.animationDelay = it.delay + "s";
        s.fontSize = it.size + "px";
        return (
          <span key={i} className="fx" style={s}>{it.em}</span>
        );
      })}
    </div>
  );
}
