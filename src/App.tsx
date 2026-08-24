import { useEffect, useState } from "react";
import { useGroup } from "./store/GroupProvider";
import { Dashboard } from "./pages/Dashboard";
import { AvailabilityPage } from "./pages/Availability";
import { Players } from "./pages/Players";
import { Roster } from "./pages/Roster";

type Tab = "kansen" | "beschikbaar" | "rooster" | "spelers";

export function App() {
  const { state, sync, code, setCode } = useGroup();
  const [tab, setTab] = useState<Tab>("kansen");

  // Groepscode uit de deel-link (#g=code) overnemen bij openen.
  useEffect(() => {
    const m = location.hash.match(/g=([\w-]+)/);
    if (m && m[1].toLowerCase() !== code) setCode(m[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playerCount = Object.values(state.players).filter((p) => p.active && !p.reserve).length;

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="logo" aria-hidden />
          <div>
            <h1>PadelMatch</h1>
            <div className="tag">Wanneer kunnen we met z'n vieren?</div>
          </div>
          <span className={"sync " + (sync === "cloud" ? "cloud" : "")}>
            <span className="dot" />
            {sync === "cloud" ? "Live sync" : "Lokaal"}
          </span>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "kansen"} onClick={() => setTab("kansen")}>
            🎾 Kansen
          </button>
          <button role="tab" aria-selected={tab === "beschikbaar"} onClick={() => setTab("beschikbaar")}>
            🗓 Mijn beschikbaarheid
          </button>
          <button role="tab" aria-selected={tab === "rooster"} onClick={() => setTab("rooster")}>
            📅 Rooster
          </button>
          <button role="tab" aria-selected={tab === "spelers"} onClick={() => setTab("spelers")}>
            👥 <span className="n">{playerCount}</span>
          </button>
        </div>
      </header>
      <main>
        {tab === "kansen" && <Dashboard />}
        {tab === "beschikbaar" && <AvailabilityPage />}
        {tab === "rooster" && <Roster />}
        {tab === "spelers" && <Players />}
      </main>
    </div>
  );
}
