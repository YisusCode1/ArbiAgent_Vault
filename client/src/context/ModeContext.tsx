import React, { createContext, useCallback, useContext, useState } from 'react';
import { RiskMode } from '../types';

const MODES: string[] = ['conservador', 'moderado', 'agresivo'];
const STORAGE_KEY = 'arbiagent_risk_mode';

interface ModeContextValue {
  mode: RiskMode;
  setMode: (mode: RiskMode) => void;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

// El modo elegido es global: Vault, AI Strategy y Activity apuntan al mismo vault.
export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<RiskMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && MODES.includes(saved)) return saved as RiskMode;
    } catch {
      // Sin acceso a localStorage: se usa el modo por defecto
    }
    return 'moderado';
  });

  const setMode = useCallback((next: RiskMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin acceso a localStorage: el modo solo dura la sesion
    }
  }, []);

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
};

export const useMode = (): ModeContextValue => {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within a ModeProvider');
  return ctx;
};
