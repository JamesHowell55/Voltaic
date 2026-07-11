import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UnitSystem } from './globalUnits';

const STORAGE_KEY = 'ec-unit-system';

function loadUnitSystem(): UnitSystem {
  if (typeof window === 'undefined') return 'SI';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'imperial' ? 'imperial' : 'SI';
  } catch {
    return 'SI';
  }
}

interface UnitSystemContextValue {
  unitSystem: UnitSystem;
  setUnitSystem: (u: UnitSystem) => void;
  toggleUnitSystem: () => void;
}

const UnitSystemContext = createContext<UnitSystemContextValue | null>(null);

export function UnitSystemProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => loadUnitSystem());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, unitSystem);
  }, [unitSystem]);

  const toggleUnitSystem = () => setUnitSystem((u) => (u === 'SI' ? 'imperial' : 'SI'));

  return (
    <UnitSystemContext.Provider value={{ unitSystem, setUnitSystem, toggleUnitSystem }}>
      {children}
    </UnitSystemContext.Provider>
  );
}

export function useUnitSystem(): UnitSystemContextValue {
  const ctx = useContext(UnitSystemContext);
  if (!ctx) throw new Error('useUnitSystem must be used within a UnitSystemProvider');
  return ctx;
}
