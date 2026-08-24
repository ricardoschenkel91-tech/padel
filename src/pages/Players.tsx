import { useMemo, useState } from "react";
import { useGroup } from "../store/GroupProvider";
import { addDays, playerShift, todayStr, type Player, type ScheduleType } from "../core";
import { DOW, initials, SHIFT_LABEL } from "../lib/ui";

const COLORS = ["#0FB3A6", "#f2a63c", "#7a6cf0", "#e2683f", "#3f7fe0", "#12a98a", "#d24c8e", "#5b8c1e"];

const TYPES: { key: ScheduleType; label: string; sub: string; cycle: boolean }[] = [
  { key: "222", label: "5-ploegen (222)", sub: "2×O, 2×M, 2×N, 4× vrij", cycle: true },
  { key: "223", label: "5-ploegen (223)", sub: "35-daagse rotatie", cycle: true },
  { key: "dagdienst", label: "Dagdienst", sub: "ma–vr 18–23, weekend vrij", cycle: false },
  { key: "aangepast", label: "Aangepast", sub: "eigen cyclus (later)", cycle: true },
];

const anchorLabel: Record<ScheduleType, string> = {
  "222": "Datum van je eerste ochtenddienst",
  "223": "Datum van je eerste dag van een 3×OD-blok",
  dagdienst: "",
  aangepast: "Startdatum van dag 1 van je cyclus",
};

export function Players() {
  const g = useGroup();
  const { state, upsertPlayer, removePlayer, code, setCode, currentPlayer, isAdmin, setRevealPins } = g;
  const [editing, setEditing] = useState<Player | null>(null);
  const [open, setOpen] = useState(false);

  const list = useMemo(
    () => Object.values(state.players).sort((a, b) => a.createdAt - b.createdAt),
    [state.players],
  );
  const core = list.filter((p) => !p.reserve);
  const reserves = list.filter((p) => p.reserve);
  const protectedOn = !!state.settings.pinProtected;

  const share = async () => {
    const url = location.href.split("#")[0] + "#g=" + code;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link gekopieerd:\n" + url);
    } catch {
      prompt("Kopieer deze link:", url);
    }
  };
  const changeGroup = () => {
    const gg = prompt("Groepscode (iedereen met dezelfde code deelt één rooster):", code);
    if (gg && gg.trim()) setCode(gg);
  };
  const enablePins = async () => {
    if (!confirm("PIN-beveiliging inschakelen? Iedereen krijgt een eigen pincode; je krijgt nu de lijst om uit te delen.")) return;
    const result = await g.enablePinProtection();
    setRevealPins(result);
  };
  const resetPin = async (p: Player) => {
    if (!confirm(`Nieuwe pincode voor ${p.fullName}?`)) return;
    const pin = await g.resetPin(p.id);
    setRevealPins([{ id: p.id, name: p.fullName, pin }]);
  };

  const canEdit = (p: Player) => isAdmin || p.id === currentPlayer?.id;

  const onSave = async (p: Player) => {
    const isNew = !state.players[p.id];
    upsertPlayer(p);
    setOpen(false);
    if (isNew && protectedOn) {
      const pin = await g.assignPin(p.id);
      setRevealPins([{ id: p.id, name: p.fullName, pin }]);
    }
  };

  return (
    <>
      <div className="section-title">Spelers ({core.filter((p) => p.active).length} actief)</div>
      {core.map((p) => (
        <PersonRow
          key={p.id}
          p={p}
          me={p.id === currentPlayer?.id}
          canEdit={canEdit(p)}
          canDelete={isAdmin}
          canResetPin={isAdmin && protectedOn}
          onEdit={() => { setEditing(p); setOpen(true); }}
          onDelete={() => removePlayer(p.id)}
          onResetPin={() => resetPin(p)}
        />
      ))}
      {isAdmin && (
        <button className="addbtn" onClick={() => { setEditing(null); setOpen(true); }}>
          ＋ Speler toevoegen
        </button>
      )}

      <div className="section-title">Reserves ({reserves.filter((p) => p.active).length} actief)</div>
      {reserves.map((p) => (
        <PersonRow
          key={p.id}
          p={p}
          me={p.id === currentPlayer?.id}
          canEdit={canEdit(p)}
          canDelete={isAdmin}
          canResetPin={isAdmin && protectedOn}
          onEdit={() => { setEditing(p); setOpen(true); }}
          onDelete={() => removePlayer(p.id)}
          onResetPin={() => resetPin(p)}
        />
      ))}

      {/* PIN-beveiliging (alleen beheerder) */}
      {isAdmin && (
        <>
          <div className="section-title">Beveiliging</div>
          {protectedOn ? (
            <p className="hint" style={{ margin: "0 2px" }}>
              🔒 PIN-beveiliging staat <b>aan</b>. Iedereen logt in met een eigen pincode en kan alleen zijn
              eigen gegevens aanpassen. Gebruik het sleutel-icoon bij een speler om een nieuwe pincode te maken.
            </p>
          ) : (
            <>
              <button className="btn primary" style={{ maxWidth: 320 }} onClick={enablePins}>
                🔒 PIN-beveiliging inschakelen
              </button>
              <p className="hint" style={{ margin: "8px 2px 0" }}>
                Iedere speler krijgt een eigen pincode om in te loggen. Werkt gedeeld pas echt met cloud-sync aan.
              </p>
            </>
          )}
        </>
      )}

      <div className="section-title">Groep</div>
      <div className="settings-line" style={{ borderTop: "none" }}>
        <span className="k">Groepscode</span>
        <span className="muted mono">{code}</span>
        <button className="linkbtn" onClick={changeGroup}>wijzig</button>
      </div>
      <div className="settings-line">
        <span className="k">Deel de app</span>
        <button className="linkbtn" onClick={share}>link kopiëren</button>
      </div>

      {open && (
        <PlayerForm
          existing={editing}
          usedColors={list.map((p) => p.color)}
          lockReserve={!isAdmin}
          onClose={() => setOpen(false)}
          onSave={onSave}
        />
      )}
    </>
  );
}

function PersonRow({
  p, me, canEdit, canDelete, canResetPin, onEdit, onDelete, onResetPin,
}: {
  p: Player; me: boolean; canEdit: boolean; canDelete: boolean; canResetPin: boolean;
  onEdit: () => void; onDelete: () => void; onResetPin: () => void;
}) {
  return (
    <div className={"person" + (p.active ? "" : " inactive")}>
      <span className="av" style={{ background: p.color, width: 40, height: 40, fontSize: 15, borderWidth: 0, marginLeft: 0 }}>
        {initials(p.displayName)}
      </span>
      <div className="meta">
        <b>{p.fullName}{me ? " (jij)" : ""}</b>
        <small>
          {TYPES.find((t) => t.key === p.scheduleType)?.label ?? p.scheduleType}
          {!p.active ? " · inactief" : ""}
        </small>
      </div>
      <div className="acts">
        {canResetPin && (
          <button className="iconbtn" onClick={onResetPin} aria-label="nieuwe pincode" title="Nieuwe pincode">🔑</button>
        )}
        {canEdit && (
          <button className="iconbtn" onClick={onEdit} aria-label="bewerk">✎</button>
        )}
        {canDelete && (
          <button
            className="iconbtn danger"
            aria-label="verwijder"
            onClick={() => { if (confirm(`"${p.fullName}" verwijderen?`)) onDelete(); }}
          >🗑</button>
        )}
      </div>
    </div>
  );
}

function PlayerForm({
  existing, usedColors, lockReserve, onClose, onSave,
}: {
  existing: Player | null;
  usedColors: string[];
  lockReserve: boolean;
  onClose: () => void;
  onSave: (p: Player) => void;
}) {
  const [draft, setDraft] = useState<Player>(
    existing ?? {
      id: "p" + Date.now().toString(36),
      fullName: "",
      displayName: "",
      active: true,
      reserve: false,
      role: "SPELER",
      scheduleType: "222",
      referenceDate: todayStr(),
      color: COLORS.find((c) => !usedColors.includes(c)) ?? COLORS[0],
      createdAt: Date.now(),
    },
  );
  const patch = (p: Partial<Player>) => setDraft((d) => ({ ...d, ...p }));
  const typeDef = TYPES.find((t) => t.key === draft.scheduleType)!;

  const preview = useMemo(() => {
    const tmp: Player = { ...draft, displayName: draft.displayName || "?" };
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(todayStr(), i);
      return { date, sh: playerShift(tmp, date) };
    });
  }, [draft]);

  const save = () => {
    const fullName = draft.fullName.trim();
    if (!fullName) return;
    onSave({ ...draft, fullName, displayName: draft.displayName.trim() || fullName.split(" ")[0] });
  };

  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal>
        <div className="grab" />
        <h2>{existing ? "Speler bewerken" : "Speler toevoegen"}</h2>

        <div className="field">
          <label>Volledige naam</label>
          <input type="text" value={draft.fullName} placeholder="bv. Ricardo Schenkel" onChange={(e) => patch({ fullName: e.target.value })} />
        </div>
        <div className="field">
          <label>Weergavenaam</label>
          <input type="text" value={draft.displayName} placeholder="bv. Ricardo" onChange={(e) => patch({ displayName: e.target.value })} />
        </div>

        <div className="field">
          <label>Kleur</label>
          <div className="swatchrow">
            {COLORS.map((c) => (
              <button key={c} className="swatch" style={{ background: c }} aria-pressed={draft.color === c} onClick={() => patch({ color: c })} />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Roostertype</label>
          <div className="typegrid">
            {TYPES.map((t) => (
              <button key={t.key} aria-pressed={draft.scheduleType === t.key} onClick={() => patch({ scheduleType: t.key })}>
                {t.label}<small>{t.sub}</small>
              </button>
            ))}
          </div>
        </div>

        {typeDef.cycle && (
          <div className="field">
            <label>{anchorLabel[draft.scheduleType]}</label>
            <input type="date" value={draft.referenceDate ?? todayStr()} onChange={(e) => patch({ referenceDate: e.target.value })} />
            <div className="hint">Vanaf deze datum rekent de app je hele rooster automatisch door.</div>
          </div>
        )}

        <div className="switchrow">
          <input type="checkbox" id="active" checked={draft.active} onChange={(e) => patch({ active: e.target.checked })} />
          <label htmlFor="active">Actief (telt mee in de planning)</label>
        </div>
        {!lockReserve && (
          <div className="switchrow">
            <input type="checkbox" id="reserve" checked={draft.reserve} onChange={(e) => patch({ reserve: e.target.checked })} />
            <label htmlFor="reserve">Reservespeler</label>
          </div>
        )}

        <div className="field">
          <label>Voorbeeld — komende 14 dagen</label>
          <div className="preview">
            <div className="pv-row">
              {preview.map(({ date, sh }) => (
                <div className="pv-day" key={date}>
                  <div className="pv-s" style={{ background: `var(--sh-${sh}-bg)`, color: `var(--sh-${sh})` }} title={SHIFT_LABEL[sh]}>
                    {sh === "V" ? "·" : sh[0]}
                  </div>
                  {DOW[new Date(date + "T00:00:00Z").getUTCDay()]}<br />{+date.split("-")[2]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="btnrow">
          <button className="btn primary" onClick={save}>{existing ? "Opslaan" : "Toevoegen"}</button>
          <button className="btn ghost" onClick={onClose}>Annuleer</button>
        </div>
      </div>
    </div>
  );
}
