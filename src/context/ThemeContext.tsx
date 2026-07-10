import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, Palette } from '../theme';
import { ThemeMode } from '../types';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colors: Palette;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = '@draborngarage/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'system' || saved === 'light' || saved === 'dark') setModeState(saved);
    });
  }, []);

  const resolvedMode = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const colors = resolvedMode === 'dark' ? darkPalette : lightPalette;

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
