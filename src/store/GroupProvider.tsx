/**
 * Gedeelde groepsstaat voor de hele app. Bewaart lokaal (localStorage) en
 * synchroniseert optioneel via Firebase. Geen login: de groepscode bepaalt
 * welke groep je ziet.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  seedGroupState,
  type AvailabilityEntry,
  type GroupSettings,
  type GroupState,
  type Player,
} from "../core";
import { cloudEnabled, saveGroup, subscribeGroup } from "./firebase";

interface GroupContextValue {
  state: GroupState;
  code: string;
  sync: "local" | "cloud";
  setCode: (code: string) => void;
  upsertPlayer: (p: Player) => void;
  removePlayer: (id: string) => void;
  setAvailability: (entry: AvailabilityEntry) => void;
  clearAvailability: (playerId: string, date: string) => void;
  updateSettings: (patch: Partial<GroupSettings>) => void;
}

const Ctx = createContext<GroupContextValue | null>(null);

const initialGroup = (): string => localStorage.getItem("pm_group") || "schenkel";
const lsKey = (code: string) => "pm_state_" + code;

function loadLocal(code: string): GroupState {
  try {
    const raw = localStorage.getItem(lsKey(code));
    if (raw) return JSON.parse(raw) as GroupState;
  } catch {
    /* val terug op seed */
  }
  return seedGroupState();
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState(initialGroup);
  const [state, setState] = useState<GroupState>(() => loadLocal(initialGroup()));
  const [sync, setSync] = useState<"local" | "cloud">("local");
  const applyingRemote = useRef(false);

  // Persisteer lokaal + optioneel cloud, tenzij de wijziging net van de cloud kwam.
  const persist = useCallback(
    (next: GroupState) => {
      localStorage.setItem(lsKey(code), JSON.stringify(next));
      if (cloudEnabled() && !applyingRemote.current) void saveGroup(code, next);
    },
    [code],
  );

  const update = useCallback(
    (fn: (s: GroupState) => GroupState) => {
      setState((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // Wissel van groep: lokale staat laden.
  useEffect(() => {
    localStorage.setItem("pm_group", code);
    setState(loadLocal(code));
  }, [code]);

  // Cloud-abonnement (indien geconfigureerd).
  useEffect(() => {
    if (!cloudEnabled()) {
      setSync("local");
      return;
    }
    setSync("cloud");
    let unsub = () => {};
    let active = true;
    void subscribeGroup(code, (remote) => {
      if (!active) return;
      if (remote) {
        applyingRemote.current = true;
        setState(remote);
        localStorage.setItem(lsKey(code), JSON.stringify(remote));
        applyingRemote.current = false;
      } else {
        // Groep bestaat nog niet in de cloud: push huidige lokale staat omhoog.
        void saveGroup(code, loadLocal(code));
      }
    }).then((u) => {
      unsub = u;
    });
    return () => {
      active = false;
      unsub();
    };
  }, [code]);

  const value = useMemo<GroupContextValue>(
    () => ({
      state,
      code,
      sync,
      setCode: (c) => setCodeState(c.trim().toLowerCase() || "schenkel"),
      upsertPlayer: (p) =>
        update((s) => ({ ...s, players: { ...s.players, [p.id]: p } })),
      removePlayer: (id) =>
        update((s) => {
          const players = { ...s.players };
          delete players[id];
          return { ...s, players };
        }),
      setAvailability: (entry) =>
        update((s) => ({
          ...s,
          availability: { ...s.availability, [entry.playerId + "|" + entry.date]: entry },
        })),
      clearAvailability: (playerId, date) =>
        update((s) => {
          const availability = { ...s.availability };
          delete availability[playerId + "|" + date];
          return { ...s, availability };
        }),
      updateSettings: (patch) =>
        update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    }),
    [state, code, sync, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGroup(): GroupContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGroup buiten GroupProvider");
  return ctx;
}

/** Handmatige beschikbaarheids-entries als lijst (voor findPlayableSlots). */
export function availabilityList(state: GroupState): AvailabilityEntry[] {
  return Object.values(state.availability);
}
