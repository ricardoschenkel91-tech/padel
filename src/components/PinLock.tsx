import { useState } from "react";
import { useGroup } from "../store/GroupProvider";

/** Volledig-scherm PIN-slot. Verschijnt als de groep PIN-beveiligd is en je nog
 *  niet bent ingelogd. Je pincode bepaalt als welke speler je binnenkomt. */
export function PinLock() {
  const { login, state, code, setCode } = useGroup();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const press = (d: string) => {
    setError("");
    setPin((p) => (p + d).slice(0, 6));
  };
  const submit = async () => {
    if (pin.length < 4 || busy) return;
    setBusy(true);
    const ok = await login(pin);
    setBusy(false);
    if (!ok) {
      setError("Onbekende pincode");
      setPin("");
    }
  };

  return (
    <div className="lock">
      <div className="lock-inner">
        <div className="logo" aria-hidden />
        <h1>PadelMatch</h1>
        <p className="muted">Groep “{state.settings.name}” · voer je pincode in</p>

        <div className="pindots">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={"pindot" + (i < pin.length ? " on" : "") + (i >= 4 ? " opt" : "")} />
          ))}
        </div>
        {error && <div className="lock-err">{error}</div>}

        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} onClick={() => press(d)}>{d}</button>
          ))}
          <button className="k-ghost" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="wis">⌫</button>
          <button onClick={() => press("0")}>0</button>
          <button className="k-ok" onClick={submit} disabled={pin.length < 4 || busy} aria-label="ok">→</button>
        </div>

        <button className="linkbtn" style={{ margin: "18px auto 0", display: "block" }} onClick={() => {
          const g = prompt("Andere groepscode:", code);
          if (g && g.trim()) setCode(g);
        }}>
          Andere groep
        </button>
      </div>
    </div>
  );
}
