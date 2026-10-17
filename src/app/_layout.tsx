import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DB_NAME, migrate } from '@/db';
import { startOcr } from '@/files';
import { AppHeader } from '@/components/app-header';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { describeError, installErrorRecorder, saveLastError } from '@/errors';
import { FontAssets, Spacing, useColors, useIsDark } from '@/theme';

installErrorRecorder();
SplashScreen.preventAutoHideAsync();

// Ekran chizishda xato bo'lsa, ilova yopilib ketmaydi: xato saqlanadi va qayta urinish taklif qilinadi.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useColors();
  useEffect(() => {
    saveLastError(error);
  }, [error]);
  return (
    <View style={[styles.errorScreen, { backgroundColor: colors.background }]}>
      <AppText variant="heading">Kutilmagan xato</AppText>
      <AppText variant="small" color="textSecondary">
        {"Hujjatlaringiz joyida. Qayta urinib ko'ring; xato takrorlansa, quyidagi matnni ishlab chiquvchiga yuboring."}
      </AppText>
      <ScrollView style={[styles.errorBox, { backgroundColor: colors.surface }]}>
        <AppText variant="caption" selectable>
          {describeError(error)}
        </AppText>
      </ScrollView>
      <Button label="Qayta urinish" onPress={retry} />
    </View>
  );
}

// Bazani yangilab, hali matni tanilmagan hujjatlar uchun OCR navbatini fonda boshlaydi.
async function initDatabase(db: SQLiteDatabase) {
  await migrate(db);
  startOcr(db);
}

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
    <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            header: (props) => <AppHeader {...props} />,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="index" options={{ title: 'DocBuilder' }} />
          <Stack.Screen name="scan" options={{ title: 'Skanerlash' }} />
          <Stack.Screen name="save" options={{ title: 'Saqlash' }} />
          <Stack.Screen name="doc/[id]" options={{ title: 'Hujjat' }} />
          <Stack.Screen name="settings" options={{ title: 'Sozlamalar' }} />
          <Stack.Screen name="open" options={{ title: 'Ochilmoqda' }} />
          <Stack.Screen name="merge" options={{ title: "PDF'larni birlashtirish" }} />
          <Stack.Screen name="edit/[id]" options={{ title: 'Sahifalarni tahrirlash' }} />
          <Stack.Screen name="sign/[id]" options={{ title: "Imzo qo'yish" }} />
          <Stack.Screen name="about" options={{ title: 'Ilova haqida' }} />
          <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    gap: Spacing.lg,
    padding: Spacing.xl,
    paddingTop: 64,
  },
  errorBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
  },
});
