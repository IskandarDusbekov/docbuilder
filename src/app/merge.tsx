import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Combine, FileText } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PromptDialog } from '@/components/dialog';
import { Placeholder } from '@/components/placeholder';
import { listDocuments, type Document } from '@/db';
import { appFile, formatDate, mergeDocuments } from '@/files';
import { Radius, Spacing, useColors } from '@/theme';

// Hujjatlar bosilgan tartibda birlashtiriladi; raqam shu tartibni ko'rsatadi.
export default function MergeScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Document[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [naming, setNaming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listDocuments(db).then(setDocs);
  }, [db]);

  const toggle = (id: string) =>
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const merge = async (title: string) => {
    setNaming(false);
    setBusy(true);
    try {
      const chosen = order.map((id) => docs.find((d) => d.id === id)!).filter(Boolean);
      const id = await mergeDocuments(db, chosen, title);
      router.replace({ pathname: '/doc/[id]', params: { id } });
    } catch (e) {
      setBusy(false);
      Alert.alert('Birlashtirilmadi', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <AppText variant="small" color="textSecondary">
            Hujjatlarni kerakli tartibda bosing. Kamida ikkitasini tanlang.
          </AppText>
        }
        ListEmptyComponent={<Placeholder icon={FileText} title="Hali hujjat yo'q" />}
        renderItem={({ item }) => {
          const n = order.indexOf(item.id) + 1;
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              style={[styles.row, { backgroundColor: n ? colors.surfacePressed : colors.surface }]}>
              <View style={[styles.thumb, { borderColor: colors.border }]}>
                {item.thumb_path ? (
                  <Image source={{ uri: appFile(item.thumb_path).uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <FileText size={20} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.fill}>
                <AppText variant="bodyMedium" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {formatDate(item.created_at)}
                  {item.page_count > 0 ? ` · ${item.page_count} bet` : ''}
                </AppText>
              </View>
              <View style={[styles.badge, n ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 2 }]}>
                {n > 0 && (
                  <AppText variant="caption" style={{ color: colors.onPrimary }}>
                    {n}
                  </AppText>
                )}
              </View>
            </Pressable>
          );
        }}
      />
      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          label={busy ? 'Birlashtirilmoqda…' : `Birlashtirish (${order.length})`}
          icon={Combine}
          size="lg"
          disabled={busy || order.length < 2}
          onPress={() => setNaming(true)}
        />
      </View>
      <PromptDialog
        visible={naming}
        title="Yangi hujjat nomi"
        initialValue={`Birlashtirilgan ${formatDate(new Date().toISOString())}`}
        submitLabel="Birlashtirish"
        onSubmit={merge}
        onClose={() => setNaming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  thumb: {
    width: 40,
    height: 52,
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
