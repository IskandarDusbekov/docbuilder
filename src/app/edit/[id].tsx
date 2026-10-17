import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft, ChevronRight, FileOutput, RotateCw, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PromptDialog } from '@/components/dialog';
import { IconButton } from '@/components/icon-button';
import { getDocument, type Document } from '@/db';
import { extractPages, renderPages, rewriteDocument } from '@/files';
import { Radius, Spacing, useColors } from '@/theme';

type EditPage = { index: number; rotation: number; uri: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function EditPagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<Document | null>(null);
  const [pages, setPages] = useState<EditPage[] | null>(null);
  // Tanlangan sahifalar asl tartib raqami bo'yicha saqlanadi, shuning uchun surilganda ham tanlov yo'qolmaydi.
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await getDocument(db, id);
      if (!d) return router.back();
      setDoc(d);
      try {
        const images = await renderPages(d, 320);
        setPages(images.map((img, index) => ({ index, rotation: 0, uri: img.uri })));
      } catch (e) {
        Alert.alert("Sahifalarni ochib bo'lmadi", errorText(e));
        router.back();
      }
    })();
  }, [db, id]);

  if (!doc || !pages) {
    return <ActivityIndicator color={colors.text} style={[styles.fill, { backgroundColor: colors.background }]} />;
  }

  const toggle = (index: number) =>
    setSelected((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));

  const rotate = () =>
    setPages(pages.map((p) => (selected.includes(p.index) ? { ...p, rotation: (p.rotation + 90) % 360 } : p)));

  const move = (delta: -1 | 1) => {
    const from = pages.findIndex((p) => p.index === selected[0]);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= pages.length) return;
    const next = [...pages];
    [next[from], next[to]] = [next[to], next[from]];
    setPages(next);
  };

  const remove = () => {
    setPages(pages.filter((p) => !selected.includes(p.index)));
    setSelected([]);
  };

  const save = async () => {
    setBusy(true);
    try {
      await rewriteDocument(db, doc, pages);
      router.back();
    } catch (e) {
      setBusy(false);
      Alert.alert('Saqlanmadi', errorText(e));
    }
  };

  const extract = async (title: string) => {
    setNaming(false);
    setBusy(true);
    try {
      const chosen = pages.filter((p) => selected.includes(p.index));
      const newId = await extractPages(db, doc, chosen, title);
      router.replace({ pathname: '/doc/[id]', params: { id: newId } });
    } catch (e) {
      setBusy(false);
      Alert.alert('Ajratilmadi', errorText(e));
    }
  };

  const single = selected.length === 1;
  const position = single ? pages.findIndex((p) => p.index === selected[0]) : -1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={pages}
        keyExtractor={(p) => String(p.index)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={
          <AppText variant="small" color="textSecondary">
            Sahifalarni bosib tanlang, keyin pastdagi amalni bajaring.
          </AppText>
        }
        renderItem={({ item, index }) => {
          const isSelected = selected.includes(item.index);
          return (
            <Pressable
              onPress={() => toggle(item.index)}
              style={[styles.cell, { borderColor: isSelected ? colors.primary : colors.border }]}>
              <Image
                source={{ uri: item.uri }}
                style={[styles.image, { transform: [{ rotate: `${item.rotation}deg` }] }]}
                contentFit="contain"
              />
              <AppText variant="caption" color={isSelected ? 'text' : 'textSecondary'} style={styles.number}>
                {index + 1}
              </AppText>
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.tools}>
          <IconButton icon={ChevronLeft} label="Chapga" disabled={!single || position <= 0} onPress={() => move(-1)} />
          <IconButton
            icon={ChevronRight}
            label="O'ngga"
            disabled={!single || position >= pages.length - 1}
            onPress={() => move(1)}
          />
          <IconButton icon={RotateCw} label="Burish" disabled={!selected.length} onPress={rotate} />
          <IconButton
            icon={FileOutput}
            label="Ajratish"
            accessibilityLabel="Tanlangan sahifalardan yangi PDF"
            disabled={!selected.length || busy}
            onPress={() => setNaming(true)}
          />
          <IconButton
            icon={Trash2}
            label="O'chirish"
            color="danger"
            disabled={!selected.length || selected.length === pages.length}
            onPress={remove}
          />
        </View>
        <Button label={busy ? 'Saqlanmoqda…' : 'Saqlash'} size="lg" disabled={busy} onPress={save} />
      </View>

      <PromptDialog
        visible={naming}
        title="Yangi hujjat nomi"
        initialValue={`${doc.title} (qism)`}
        submitLabel="Ajratish"
        onSubmit={extract}
        onClose={() => setNaming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  grid: {
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  row: {
    gap: Spacing.md,
  },
  cell: {
    flex: 1,
    maxWidth: '33.33%',
    aspectRatio: 3 / 4,
    borderWidth: 2,
    borderRadius: Radius.md,
    overflow: 'hidden',
    padding: Spacing.xs,
  },
  image: {
    flex: 1,
  },
  number: {
    position: 'absolute',
    left: Spacing.sm,
    bottom: Spacing.xs,
  },
  footer: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tools: {
    flexDirection: 'row',
  },
});
