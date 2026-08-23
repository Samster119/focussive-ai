'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getTimePeriod, TimePeriod } from '@/lib/timePeriod';

/* ============================================================
   ThemeContext — shared state for the time-of-day background.

   'auto'  → follow the user's local clock (default for new users)
   TimePeriod → user has manually pinned a scene

   Persisted in localStorage under 'foccusive-theme-override'.
   ============================================================ */

export type ThemeOverride = 'auto' | TimePeriod;

const STORAGE_KEY = 'foccusive-theme-override';

interface ThemeContextValue {
  /** The override the user has chosen ('auto' or a scene name). */
  override: ThemeOverride;
  /** The resolved period that TimeBackground should actually display. */
  resolved: TimePeriod;
  setOverride: (v: ThemeOverride) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  override: 'auto',
  resolved: 'morning',
  setOverride: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverrideState] = useState<ThemeOverride>('auto');
  const [clockPeriod, setClockPeriod] = useState<TimePeriod>(() => getTimePeriod());

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeOverride | null;
      if (stored && (stored === 'auto' || ['morning', 'afternoon', 'evening', 'night'].includes(stored))) {
        setOverrideState(stored);
      }
    } catch {
      /* localStorage unavailable — stay with default */
    }
  }, []);

  /* Keep the clock period up to date (re-check every minute) */
  useEffect(() => {
    const id = setInterval(() => setClockPeriod(getTimePeriod()), 60_000);
    return () => clearInterval(id);
  }, []);

  const setOverride = useCallback((v: ThemeOverride) => {
    setOverrideState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const resolved: TimePeriod = override === 'auto' ? clockPeriod : override;

  return (
    <ThemeContext.Provider value={{ override, resolved, setOverride }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
