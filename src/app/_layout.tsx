import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DB_NAME, migrate } from '@/db';
import {
  applySchemePreference,
  FontAssets,
  Fonts,
  getSchemePreference,
  useColors,
  useIsDark,
} from '@/theme';

// Saqlangan rejimni birinchi kadrdan oldin qo'llaymiz, aks holda ekran bir lahza boshqa rangda chiqadi.
applySchemePreference(getSchemePreference());
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FontAssets);
  const isDark = useIsDark();
  const colors = useColors();

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={migrate}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: Fonts.semibold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="index" options={{ title: 'DocBuilder' }} />
          <Stack.Screen name="scan" options={{ title: 'Skanerlash' }} />
          <Stack.Screen name="save" options={{ title: 'Saqlash' }} />
          <Stack.Screen name="doc/[id]" options={{ title: 'Hujjat' }} />
          <Stack.Screen name="settings" options={{ title: 'Sozlamalar' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
