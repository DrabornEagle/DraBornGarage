import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  carbonPalette,
  darkPalette,
  electricPalette,
  lightPalette,
  Palette,
  racingPalette,
  sunsetPalette,
} from '../theme';
import { ThemeMode } from '../types';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colors: Palette;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = '@draborngarage/theme';
const VALID_MODES: ThemeMode[] = ['system', 'light', 'dark', 'carbon', 'racing', 'electric', 'sunset'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && VALID_MODES.includes(saved as ThemeMode)) setModeState(saved as ThemeMode);
    });
  }, []);

  const resolvedMode: 'light' | 'dark' = mode === 'system'
    ? (system === 'light' ? 'light' : 'dark')
    : mode === 'light'
      ? 'light'
      : 'dark';

  const colors = useMemo<Palette>(() => {
    if (mode === 'system') return resolvedMode === 'light' ? lightPalette : darkPalette;
    if (mode === 'light') return lightPalette;
    if (mode === 'carbon') return carbonPalette;
    if (mode === 'racing') return racingPalette;
    if (mode === 'electric') return electricPalette;
    if (mode === 'sunset') return sunsetPalette;
    return darkPalette;
  }, [mode, resolvedMode]);

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      colors,
      setMode: async (next: ThemeMode) => {
        setModeState(next);
        await AsyncStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [mode, resolvedMode, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
