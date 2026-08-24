import type { PinAssignment } from "../store/GroupProvider";

/** Toont zojuist gegenereerde pincodes één keer, om uit te delen. */
export function PinModal({ pins, onClose }: { pins: PinAssignment[]; onClose: () => void }) {
  const copy = async () => {
    const text = pins.map((x) => `${x.name}: ${x.pin}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Gekopieerd");
    } catch {
      prompt("Kopieer:", text);
    }
  };
  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal>
        <div className="grab" />
        <h2>{pins.length > 1 ? "Pincodes" : "Nieuwe pincode"}</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Geef iedereen zijn pincode door. <b>Deze codes zie je nu één keer</b> — ze worden versleuteld
          opgeslagen. Kwijt? Maak een nieuwe aan met het sleutel-icoon bij de speler.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
          {pins.map((x) => (
            <div
              key={x.id}
              className="settings-line"
              style={{ borderTop: "none", padding: "8px 12px", background: "var(--surface-2)", borderRadius: 10 }}
            >
              <span className="k">{x.name}</span>
              <span
                className="mono"
                style={{ marginLeft: "auto", fontSize: 22, fontWeight: 800, letterSpacing: 3, fontFamily: "var(--font-display)" }}
              >
                {x.pin}
              </span>
            </div>
          ))}
        </div>
        <div className="btnrow">
          <button className="btn primary" onClick={copy}>Kopieer lijst</button>
          <button className="btn ghost" onClick={onClose}>Klaar</button>
        </div>
      </div>
    </div>
  );
}
