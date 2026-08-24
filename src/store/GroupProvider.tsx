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
import { hashPin } from "./auth";

export interface PinAssignment {
  id: string;
  name: string;
  pin: string;
}

interface GroupContextValue {
  state: GroupState;
  code: string;
  sync: "local" | "cloud";
  currentPlayer: Player | null;
  isAdmin: boolean;
  setCode: (code: string) => void;
  upsertPlayer: (p: Player) => void;
  removePlayer: (id: string) => void;
  setAvailability: (entry: AvailabilityEntry) => void;
  clearAvailability: (playerId: string, date: string) => void;
  updateSettings: (patch: Partial<GroupSettings>) => void;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  assignPin: (playerId: string) => Promise<string>;
  resetPin: (playerId: string) => Promise<string>;
  enablePinProtection: () => Promise<PinAssignment[]>;
  revealPins: PinAssignment[] | null;
  setRevealPins: (p: PinAssignment[] | null) => void;
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
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    () => localStorage.getItem("pm_session_" + initialGroup()),
  );
  const [revealPins, setRevealPins] = useState<PinAssignment[] | null>(null);
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
    setCurrentPlayerId(localStorage.getItem("pm_session_" + code));
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

  const currentPlayer = currentPlayerId ? state.players[currentPlayerId] ?? null : null;
  const isAdmin = !state.settings.pinProtected || currentPlayer?.role === "BEHEERDER";

  // Genereer een pincode waarvan de hash nog niet bestaat (unieke login).
  const freshPin = async (taken: Set<string>): Promise<{ pin: string; hash: string }> => {
    let pin = "";
    let hash = "";
    do {
      pin = String(Math.floor(1000 + Math.random() * 9000));
      hash = await hashPin(pin, code);
    } while (taken.has(hash));
    taken.add(hash);
    return { pin, hash };
  };

  const value = useMemo<GroupContextValue>(
    () => ({
      state,
      code,
      sync,
      currentPlayer,
      isAdmin,
      setCode: (c) => {
        setCurrentPlayerId(null);
        setCodeState(c.trim().toLowerCase() || "schenkel");
      },
      login: async (pin: string) => {
        const hash = await hashPin(pin, code);
        const p = Object.values(state.players).find((pl) => pl.pinHash === hash);
        if (!p) return false;
        localStorage.setItem("pm_session_" + code, p.id);
        setCurrentPlayerId(p.id);
        return true;
      },
      logout: () => {
        localStorage.removeItem("pm_session_" + code);
        setCurrentPlayerId(null);
      },
      assignPin: async (playerId) => {
        const taken = new Set(
          Object.values(state.players)
            .map((p) => p.pinHash)
            .filter((h): h is string => !!h),
        );
        const { pin, hash } = await freshPin(taken);
        update((s) => ({ ...s, players: { ...s.players, [playerId]: { ...s.players[playerId], pinHash: hash } } }));
        return pin;
      },
      resetPin: async (playerId) => {
        const taken = new Set(
          Object.values(state.players)
            .filter((p) => p.id !== playerId)
            .map((p) => p.pinHash)
            .filter((h): h is string => !!h),
        );
        const { pin, hash } = await freshPin(taken);
        update((s) => ({ ...s, players: { ...s.players, [playerId]: { ...s.players[playerId], pinHash: hash } } }));
        return pin;
      },
      enablePinProtection: async () => {
        const players = { ...state.players };
        const taken = new Set(
          Object.values(players)
            .map((p) => p.pinHash)
            .filter((h): h is string => !!h),
        );
        const out: PinAssignment[] = [];
        for (const p of Object.values(players)) {
          if (p.reserve && !p.active) continue; // inactieve reserves: geen pincode
          if (p.pinHash) continue; // bestaande pincode behouden
          const { pin, hash } = await freshPin(taken);
          players[p.id] = { ...p, pinHash: hash };
          out.push({ id: p.id, name: p.fullName, pin });
        }
        update((s) => ({ ...s, players, settings: { ...s.settings, pinProtected: true } }));
        return out;
      },
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
      revealPins,
      setRevealPins,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, code, sync, currentPlayer, isAdmin, update, revealPins],
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
