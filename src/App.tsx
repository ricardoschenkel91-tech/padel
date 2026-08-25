import { useEffect, useState } from "react";
import { useGroup } from "./store/GroupProvider";
import { PinLock } from "./components/PinLock";
import { PinModal } from "./components/PinModal";
import { Dashboard } from "./pages/Dashboard";
import { Reserved } from "./pages/Reserved";
import { AvailabilityPage } from "./pages/Availability";
import { Players } from "./pages/Players";
import { Roster } from "./pages/Roster";
import { initials } from "./lib/ui";
import { todayStr } from "./core";

type Tab = "kansen" | "gereserveerd" | "beschikbaar" | "rooster" | "spelers";

export function App() {
  const { state, sync, code, setCode, currentPlayer, logout, revealPins, setRevealPins } = useGroup();
  const [tab, setTab] = useState<Tab>("kansen");
  const [menuOpen, setMenuOpen] = useState(false);

  // Groepscode uit de deel-link (#g=code) overnemen bij openen.
  useEffect(() => {
    const m = location.hash.match(/g=([\w-]+)/);
    if (m && m[1].toLowerCase() !== code) setCode(m[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pincode-onthulling staat altijd bovenop (ook boven het slot).
  const pinReveal = revealPins && <PinModal pins={revealPins} onClose={() => setRevealPins(null)} />;

  if (state.settings.pinProtected && !currentPlayer)
    return (
      <>
        <PinLock />
        {pinReveal}
      </>
    );

  const playerCount = Object.values(state.players).filter((p) => p.active && !p.reserve).length;
  const today = todayStr();
  const bookingCount = Object.values(state.bookings).filter((b) => b.date >= today).length;

  return (
    <div className="app">
      <header>
        <div className="brand">
          <button className="brandbtn" onClick={() => setTab("kansen")} aria-label="Naar Kansen">
            <div className="logo" aria-hidden />
            <h1>PadelMatch</h1>
          </button>
          <div className="hdr-right">
            <button
              className={currentPlayer ? "profile" : "menubtn"}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {currentPlayer ? (
                <>
                  <span className="av" style={{ background: currentPlayer.color }}>{initials(currentPlayer.displayName)}</span>
                  <span className="pname">{currentPlayer.displayName}</span>
                  <span className="caret">▾</span>
                </>
              ) : (
                <>☰ Menu</>
              )}
            </button>
            {menuOpen && (
              <>
                <div className="menu-scrim" onClick={() => setMenuOpen(false)} />
                <div className="menu" role="menu">
                  <div className="menu-status">
                    <span className={"dot " + (sync === "cloud" ? "on" : "")} />
                    {sync === "cloud" ? "Live sync" : "Lokaal"}
                  </div>
                  <button role="menuitem" onClick={() => { setTab("rooster"); setMenuOpen(false); }}>📋 Rooster</button>
                  <button role="menuitem" onClick={() => { setTab("spelers"); setMenuOpen(false); }}>
                    👥 Spelers <span className="mn">{playerCount}</span>
                  </button>
                  {currentPlayer && (
                    <>
                      <div className="menu-sep" />
                      <button role="menuitem" onClick={() => { setMenuOpen(false); if (confirm(`Uitloggen als ${currentPlayer.displayName}?`)) logout(); }}>
                        ↩︎ Uitloggen
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "kansen"} onClick={() => setTab("kansen")}>
            🎾 Kansen
          </button>
          <button role="tab" aria-selected={tab === "gereserveerd"} onClick={() => setTab("gereserveerd")}>
            📅 Gepland{bookingCount ? <span className="n">{bookingCount}</span> : null}
          </button>
          <button role="tab" aria-selected={tab === "beschikbaar"} onClick={() => setTab("beschikbaar")}>
            🗓 Beschikbaar
          </button>
        </div>
      </header>
      <main>
        {tab === "kansen" && <Dashboard />}
        {tab === "gereserveerd" && <Reserved />}
        {tab === "beschikbaar" && <AvailabilityPage />}
        {tab === "rooster" && <Roster />}
        {tab === "spelers" && <Players />}
      </main>
      {pinReveal}
    </div>
  );
}
