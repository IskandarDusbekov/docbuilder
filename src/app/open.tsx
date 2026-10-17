import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FileWarning } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Placeholder } from '@/components/placeholder';
import { importFile } from '@/files';
import { Spacing, useColors } from '@/theme';

// Tashqaridan kelgan faylni kutubxonaga qo'shib, darhol ochadi.
export default function OpenScreen() {
  const { uri, name } = useLocalSearchParams<{ uri: string; name?: string }>();
  const db = useSQLiteContext();
  const colors = useColors();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !uri) return;
    started.current = true;
    importFile(db, uri, name)
      .then((id) => router.replace({ pathname: '/doc/[id]', params: { id } }))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [db, uri, name]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? (
        <>
          <Placeholder icon={FileWarning} title="Faylni ochib bo'lmadi" hint={error} style={styles.fill} />
          <Button label="Bosh sahifa" variant="secondary" onPress={() => router.replace('/')} />
        </>
      ) : (
        <View style={[styles.fill, styles.center]}>
          <ActivityIndicator color={colors.text} />
          <AppText variant="small" color="textSecondary">
            Hujjat tayyorlanmoqda…
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  fill: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
});
