import { useState, useEffect, useMemo } from 'react';

export type InfoTheme = 'light' | 'dark' | 'warm';

export interface InfoThemeColors {
  bg: string;
  headerBg: string;
  text: string;
  textMuted: string;
  border: string;
  card: string;
  cardHover: string;
  accent: string;
  accentMuted: string;
}

const themeColorMap: Record<InfoTheme, InfoThemeColors> = {
  dark: {
    bg: '#09090b',
    headerBg: 'rgba(24,24,27,0.8)',
    text: '#fafafa',
    textMuted: '#71717a',
    border: '#27272a',
    card: 'rgba(24,24,27,0.6)',
    cardHover: 'rgba(39,39,42,0.7)',
    accent: '#a78bfa',
    accentMuted: 'rgba(139,92,246,0.15)',
  },
  light: {
    bg: '#f8f8f8',
    headerBg: 'rgba(255,255,255,0.9)',
    text: '#1a1a1a',
    textMuted: '#737373',
    border: '#e5e5e5',
    card: '#ffffff',
    cardHover: '#f0f0f0',
    accent: '#7c3aed',
    accentMuted: 'rgba(124,58,237,0.1)',
  },
  warm: {
    bg: '#FFF8F0',
    headerBg: 'rgba(255,248,240,0.9)',
    text: '#2C2016',
    textMuted: '#8B7355',
    border: '#E8C9A8',
    card: '#FFF3E6',
    cardHover: '#FFECD6',
    accent: '#B8860B',
    accentMuted: 'rgba(184,134,11,0.12)',
  },
};

const STORAGE_KEY = 'info-theme';

export function useInfoTheme() {
  const [theme, setThemeState] = useState<InfoTheme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'warm') return stored;
    } catch {}
    return 'dark';
  });

  const setTheme = (t: InfoTheme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  };

  const colors = useMemo(() => themeColorMap[theme], [theme]);

  return { theme, setTheme, colors };
}
