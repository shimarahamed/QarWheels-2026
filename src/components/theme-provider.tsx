'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(t: Theme): 'light' | 'dark' {
  return t === 'system' ? getSystemTheme() : t;
}

function applyClass(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = (localStorage.getItem('qw-theme') as Theme | null) ?? defaultTheme;
    const resolved = resolveTheme(stored);
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyClass(resolved);
  }, [defaultTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = mq.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyClass(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    const resolved = resolveTheme(newTheme);
    localStorage.setItem('qw-theme', newTheme);
    setThemeState(newTheme);
    setResolvedTheme(resolved);
    applyClass(resolved);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
