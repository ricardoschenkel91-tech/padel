import { useMemo, useState } from "react";
import { useGroup } from "../store/GroupProvider";
import {
  addDays,
  DEFAULT_WORKWEEK,
  playerShift,
  todayStr,
  TIMES_222,
  TIMES_223,
  type Absence,
  type DayBlock,
  type Location,
  type Player,
  type RecurringRule,
  type ScheduleType,
  type ShiftTimes,
} from "../core";

const WD_CHIPS: [string, number][] = [
  ["ma", 1], ["di", 2], ["wo", 3], ["do", 4], ["vr", 5], ["za", 6], ["zo", 0],
];
import { DOW, initials, SHIFT_LABEL } from "../lib/ui";

const h2str = (h: number) =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, "0")}`;
const str2h = (s: string) => {
  const [H, M] = s.split(":").map(Number);
  return H + (M || 0) / 60;
};

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
  const { state, upsertPlayer, removePlayer, code, setCode, currentPlayer, isAdmin, setRevealPins, removeLocation } = g;
  const [editing, setEditing] = useState<Player | null>(null);
  const [open, setOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<Location | null>(null);

  const otherBeheerders = (id: string) =>
    Object.values(state.players).filter((x) => x.id !== id && x.active && x.role === "BEHEERDER").length;
  const doDelete = (p: Player) => {
    if (p.role === "BEHEERDER" && otherBeheerders(p.id) < 1) {
      alert("Er moet altijd minstens één beheerder blijven.");
      return;
    }
    removePlayer(p.id);
  };

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
    const existing = state.players[p.id];
    if (existing?.role === "BEHEERDER" && p.role !== "BEHEERDER" && otherBeheerders(p.id) < 1) {
      alert("Er moet altijd minstens één beheerder blijven.");
      return;
    }
    const isNew = !existing;
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
          onDelete={() => doDelete(p)}
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
          onDelete={() => doDelete(p)}
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

      {isAdmin && (
        <>
          <div className="section-title">Locaties</div>
          {Object.values(state.locations).map((l) => (
            <div className={"person" + (l.active ? "" : " inactive")} key={l.id}>
              <span className="av" style={{ background: "var(--accent)", width: 38, height: 38, fontSize: 16, borderWidth: 0, marginLeft: 0 }}>🎾</span>
              <div className="meta"><b>{l.name}</b><small>{l.city}{l.active ? "" : " · inactief"}</small></div>
              <div className="acts">
                <button className="iconbtn" onClick={() => { setEditLoc(l); setLocOpen(true); }} aria-label="bewerk">✎</button>
                <button className="iconbtn danger" onClick={() => { if (confirm(`"${l.name}" verwijderen?`)) removeLocation(l.id); }} aria-label="verwijder">🗑</button>
              </div>
            </div>
          ))}
          <button className="addbtn" onClick={() => { setEditLoc(null); setLocOpen(true); }}>＋ Locatie toevoegen</button>
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
      {locOpen && (
        <LocationForm
          existing={editLoc}
          onClose={() => setLocOpen(false)}
          onSave={(l) => { g.upsertLocation(l); setLocOpen(false); }}
        />
      )}
    </>
  );
}

function LocationForm({ existing, onClose, onSave }: { existing: Location | null; onClose: () => void; onSave: (l: Location) => void }) {
  const [d, setD] = useState<Location>(
    existing ?? { id: "loc" + Date.now().toString(36), name: "", address: "", postcode: "", city: "", indoor: true, active: true },
  );
  const p = (x: Partial<Location>) => setD((s) => ({ ...s, ...x }));
  const save = () => { if (!d.name.trim()) return; onSave({ ...d, name: d.name.trim() }); };
  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal>
        <div className="grab" />
        <h2>{existing ? "Locatie bewerken" : "Locatie toevoegen"}</h2>
        <div className="field"><label>Naam</label><input type="text" value={d.name} onChange={(e) => p({ name: e.target.value })} placeholder="bv. Peakz Padel Assen" /></div>
        <div className="field"><label>Plaats</label><input type="text" value={d.city} onChange={(e) => p({ city: e.target.value })} /></div>
        <div className="field"><label>Adres</label><input type="text" value={d.address} onChange={(e) => p({ address: e.target.value })} /></div>
        <div className="field"><label>Postcode</label><input type="text" value={d.postcode} onChange={(e) => p({ postcode: e.target.value })} /></div>
        <div className="field"><label>Boekingslink (optioneel)</label><input type="text" value={d.bookingUrl ?? ""} onChange={(e) => p({ bookingUrl: e.target.value || undefined })} placeholder="https://..." /></div>
        <div className="switchrow"><input type="checkbox" id="indoor" checked={d.indoor} onChange={(e) => p({ indoor: e.target.checked })} /><label htmlFor="indoor">Indoor</label></div>
        <div className="switchrow"><input type="checkbox" id="lactive" checked={d.active} onChange={(e) => p({ active: e.target.checked })} /><label htmlFor="lactive">Actief</label></div>
        <div className="btnrow"><button className="btn primary" onClick={save}>{existing ? "Opslaan" : "Toevoegen"}</button><button className="btn ghost" onClick={onClose}>Annuleer</button></div>
      </div>
    </div>
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
          {p.role === "BEHEERDER" ? " · beheerder" : ""}
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
  const gg = useGroup();
  const patch = (p: Partial<Player>) => setDraft((d) => ({ ...d, ...p }));
  const updateAbs = (i: number, pa: Partial<Absence>) =>
    setDraft((d) => {
      const abs = [...(d.absences ?? [])];
      abs[i] = { ...abs[i], ...pa };
      return { ...d, absences: abs };
    });
  const removeAbs = (i: number) =>
    setDraft((d) => ({ ...d, absences: (d.absences ?? []).filter((_, j) => j !== i) }));
  const updateRec = (i: number, pr: Partial<RecurringRule>) =>
    setDraft((d) => {
      const a = [...(d.recurringRules ?? [])];
      a[i] = { ...a[i], ...pr };
      return { ...d, recurringRules: a };
    });
  const removeRec = (i: number) =>
    setDraft((d) => ({ ...d, recurringRules: (d.recurringRules ?? []).filter((_, j) => j !== i) }));
  const toggleWd = (i: number, wd: number) =>
    setDraft((d) => {
      const a = [...(d.recurringRules ?? [])];
      const r = a[i];
      const has = r.weekdays.includes(wd);
      a[i] = { ...r, weekdays: has ? r.weekdays.filter((x) => x !== wd) : [...r.weekdays, wd] };
      return { ...d, recurringRules: a };
    });
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

        {draft.scheduleType === "dagdienst" && (
          <div className="field">
            <label>Werkweek</label>
            {WD_CHIPS.map(([lbl, wd]) => {
              const ww = draft.workWeek ?? DEFAULT_WORKWEEK;
              const job = ww[wd];
              const setJob = (v: [number, number] | null) => patch({ workWeek: { ...ww, [wd]: v } });
              return (
                <div key={lbl} className="workrow">
                  <button className={"wc" + (job ? " on" : "")} style={{ width: 46 }} onClick={() => setJob(job ? null : [9, 18])}>
                    {lbl}
                  </button>
                  {job ? (
                    <>
                      <input type="time" value={h2str(job[0])} onChange={(e) => setJob([str2h(e.target.value), job[1]])} />
                      <span>–</span>
                      <input type="time" value={h2str(job[1])} onChange={(e) => setJob([job[0], str2h(e.target.value)])} />
                    </>
                  ) : (
                    <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>vrij</span>
                  )}
                </div>
              );
            })}
            <div className="hint">Tik een dag aan/uit (werk/vrij) en zet de werktijden. Buiten werktijd ben je automatisch beschikbaar.</div>
          </div>
        )}

        {(draft.scheduleType === "222" || draft.scheduleType === "223") && (
          <div className="field">
            <label>Diensttijden</label>
            {(() => {
              const times = draft.shiftTimes ?? (draft.scheduleType === "223" ? TIMES_223 : TIMES_222);
              const setT = (k: keyof ShiftTimes, idx: 0 | 1, v: string) =>
                patch({
                  shiftTimes: {
                    ...times,
                    [k]: idx === 0 ? [str2h(v), times[k][1]] : [times[k][0], str2h(v)],
                  },
                });
              const rows: [keyof ShiftTimes, string][] = [["OD", "Ochtend"], ["MD", "Middag"], ["ND", "Nacht"]];
              return rows.map(([k, label]) => (
                <div key={k} className="timerow">
                  <span className="tl">{label}</span>
                  <input type="time" value={h2str(times[k][0])} onChange={(e) => setT(k, 0, e.target.value)} />
                  <span>–</span>
                  <input type="time" value={h2str(times[k][1])} onChange={(e) => setT(k, 1, e.target.value)} />
                </div>
              ));
            })()}
            <div className="hint">Standaard ingevuld; pas aan als jouw diensttijden afwijken.</div>
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
        {gg.isAdmin && (
          <div className="switchrow">
            <input
              type="checkbox"
              id="beheerder"
              checked={draft.role === "BEHEERDER"}
              onChange={(e) => patch({ role: e.target.checked ? "BEHEERDER" : "SPELER" })}
            />
            <label htmlFor="beheerder">Beheerder (mag alles beheren)</label>
          </div>
        )}

        <div className="field">
          <label>Afwezigheid (vakantie / weg)</label>
          {(draft.absences ?? []).map((a, i) => (
            <div key={i} className="abrow">
              <input type="date" value={a.from} onChange={(e) => updateAbs(i, { from: e.target.value })} />
              <span>t/m</span>
              {a.to === undefined ? (
                <span className="muted" style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>onbepaald</span>
              ) : (
                <input type="date" value={a.to} onChange={(e) => updateAbs(i, { to: e.target.value })} />
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={a.to === undefined}
                  onChange={(e) => updateAbs(i, { to: e.target.checked ? undefined : a.from })}
                  style={{ width: "auto" }}
                />
                onbep.
              </label>
              <button className="iconbtn danger" onClick={() => removeAbs(i)} aria-label="verwijder" style={{ width: 30, height: 30 }}>🗑</button>
            </div>
          ))}
          <button
            className="linkbtn"
            style={{ marginLeft: 0 }}
            onClick={() => patch({ absences: [...(draft.absences ?? []), { from: todayStr() }] })}
          >
            ＋ periode toevoegen
          </button>
          <div className="hint">Tijdens een afwezigheidsperiode tel je niet mee in de planning.</div>
        </div>

        <div className="field">
          <label>Vaste weekregels</label>
          {(draft.recurringRules ?? []).map((r, i) => (
            <div key={r.id} className="recrow">
              <div className="wdchips">
                {WD_CHIPS.map(([lbl, wd]) => (
                  <button
                    key={lbl}
                    className={"wc" + (r.weekdays.includes(wd) ? " on" : "")}
                    onClick={() => toggleWd(i, wd)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="recrow2">
                <select value={r.block} onChange={(e) => updateRec(i, { block: e.target.value as DayBlock })}>
                  <option value="ochtend">ochtend</option>
                  <option value="middag">middag</option>
                  <option value="avond">avond</option>
                  <option value="hele dag">hele dag</option>
                </select>
                <select
                  value={r.status}
                  onChange={(e) => updateRec(i, { status: e.target.value as RecurringRule["status"] })}
                >
                  <option value="NIET_BESCHIKBAAR">niet</option>
                  <option value="BESCHIKBAAR">wel</option>
                </select>
                <button className="iconbtn danger" onClick={() => removeRec(i)} aria-label="verwijder" style={{ width: 30, height: 30 }}>🗑</button>
              </div>
            </div>
          ))}
          <button
            className="linkbtn"
            style={{ marginLeft: 0 }}
            onClick={() =>
              patch({
                recurringRules: [
                  ...(draft.recurringRules ?? []),
                  { id: "r" + Date.now().toString(36), weekdays: [5], block: "avond", status: "NIET_BESCHIKBAAR" },
                ],
              })
            }
          >
            ＋ weekregel toevoegen
          </button>
          <div className="hint">Bijv. elke vrijdagavond niet, of elke zaterdag wel beschikbaar.</div>
        </div>

        <div className="field">
          <label>Niet automatisch samen met</label>
          {Object.values(gg.state.restrictions)
            .filter((r) => r.playerA === draft.id || r.playerB === draft.id)
            .map((r) => {
              const otherId = r.playerA === draft.id ? r.playerB : r.playerA;
              return (
                <div key={r.id} className="abrow">
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{gg.state.players[otherId]?.displayName ?? otherId}</span>
                  <span className="muted" style={{ fontSize: 11, flex: 1 }}>{r.reason || "geen reden"}</span>
                  <button className="iconbtn danger" onClick={() => gg.removeRestriction(r.id)} aria-label="verwijder" style={{ width: 30, height: 30 }}>🗑</button>
                </div>
              );
            })}
          <ComboAdd draftId={draft.id} />
          <div className="hint">De app plant jullie niet automatisch samen in een viertal (bv. kinderoppas). Beschikbaarheid blijft gewoon bestaan. Wordt direct toegepast.</div>
        </div>

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

function ComboAdd({ draftId }: { draftId: string }) {
  const g = useGroup();
  const others = Object.values(g.state.players).filter((p) => p.id !== draftId && !p.reserve);
  const [other, setOther] = useState(others[0]?.id ?? "");
  const [reason, setReason] = useState("");
  if (!others.length) return null;
  const add = () => {
    if (!other) return;
    const id = "cr-" + [draftId, other].sort().join("-");
    g.upsertRestriction({
      id,
      groupId: g.state.settings.id,
      playerA: draftId,
      playerB: other,
      active: true,
      type: "NIET_AUTO_SAMEN",
      reason: reason.trim() || undefined,
    });
    setReason("");
  };
  return (
    <div className="abrow" style={{ marginTop: 6 }}>
      <select value={other} onChange={(e) => setOther(e.target.value)} style={{ flex: 1 }}>
        {others.map((p) => (
          <option key={p.id} value={p.id}>{p.displayName}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="reden"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ flex: 1, minWidth: 90 }}
      />
      <button className="linkbtn" style={{ marginLeft: 0 }} onClick={add}>toevoegen</button>
    </div>
  );
}
