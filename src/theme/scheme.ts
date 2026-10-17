import { Storage } from 'expo-sqlite/kv-store';
import { Appearance, useColorScheme } from 'react-native';

import { Colors, type Palette } from './colors';

export type SchemePreference = 'system' | 'light' | 'dark';

const KEY = 'theme.scheme';

export function getSchemePreference(): SchemePreference {
  const value = Storage.getItemSync(KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function applySchemePreference(pref: SchemePreference) {
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

export function setSchemePreference(pref: SchemePreference) {
  Storage.setItemSync(KEY, pref);
  applySchemePreference(pref);
}

export function useIsDark() {
  return useColorScheme() === 'dark';
}

export function useColors(): Palette {
  return Colors[useIsDark() ? 'dark' : 'light'];
}
