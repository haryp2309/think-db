import { useEffect, useState, useCallback } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    return stored ?? 'system';
  });

  // Derive the resolved (actual) theme
  const getResolved = useCallback((pref: ThemePreference): 'light' | 'dark' => {
    if (pref === 'system') return getSystemTheme();
    return pref;
  }, []);

  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    getResolved(localStorage.getItem(STORAGE_KEY) as ThemePreference ?? 'system')
  );

  // Apply theme to DOM whenever resolved changes
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // Listen for OS theme changes (only matters when preference === 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (preference === 'system') {
        const next = getSystemTheme();
        setResolved(next);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const setTheme = useCallback((pref: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, pref);
    setPreferenceState(pref);
    setResolved(pref === 'system' ? getSystemTheme() : pref);
  }, []);

  return { theme: preference, resolved, setTheme };
}
