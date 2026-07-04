import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type ThemeState, type ThemeMode, DEFAULT_ACCENT, loadTheme, saveTheme, applyTheme, isValidHex } from './theme';

interface ThemeContextValue extends ThemeState {
  setMode: (mode: ThemeMode) => void;
  setAccentHex: (hex: string) => void;
  resetAccent: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(() => loadTheme());

  useEffect(() => {
    applyTheme(state);
    saveTheme(state);
  }, [state]);

  const setMode = (mode: ThemeMode) => setState(s => ({ ...s, mode }));
  const setAccentHex = (hex: string) => {
    if (!isValidHex(hex)) return;
    setState(s => ({ ...s, accentHex: hex }));
  };
  const resetAccent = () => setState(s => ({ ...s, accentHex: DEFAULT_ACCENT }));

  return (
    <ThemeContext.Provider value={{ ...state, setMode, setAccentHex, resetAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
