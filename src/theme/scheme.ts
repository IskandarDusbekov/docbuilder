import { Storage } from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type Palette } from './colors';

export type SchemePreference = 'system' | 'light' | 'dark';

const KEY = 'theme.scheme';

function read(): SchemePreference {
  try {
    const value = Storage.getItemSync(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

// Tanlov ilovaning o'zida saqlanadi va shu yerdan tarqatiladi. Android'ga rejimni majburlash
// (Appearance.setColorScheme) ishonchsiz chiqdi: ba'zi qurilmalarda ekran yangilanmay qolardi.
let preference = read();
const listeners = new Set<() => void>();

export function getSchemePreference() {
  return preference;
}

export function setSchemePreference(pref: SchemePreference) {
  preference = pref;
  // Avval ekranlar yangilanadi: xotiraga yozish xato bersa ham rejim almashadi.
  listeners.forEach((l) => l());
  try {
    Storage.setItemSync(KEY, pref);
  } catch (e) {
    console.warn("Rejim tanlovi saqlanmadi", e);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSchemePreference() {
  return useSyncExternalStore(subscribe, getSchemePreference);
}

export function useIsDark() {
  const system = useColorScheme();
  const pref = useSchemePreference();
  return pref === 'system' ? system === 'dark' : pref === 'dark';
}

export function useColors(): Palette {
  return Colors[useIsDark() ? 'dark' : 'light'];
}
