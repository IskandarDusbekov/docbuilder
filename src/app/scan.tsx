import { router } from 'expo-router';
import { Camera, Plus, RotateCw, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import { Segmented } from '@/components/segmented';
import { Radius, Spacing, useColors } from '@/theme';

type Filter = 'original' | 'bw' | 'gray';

const FILTERS = [
  { value: 'original', label: 'Asl' },
  { value: 'bw', label: 'Oq-qora' },
  { value: 'gray', label: 'Kulrang' },
] as const;

type Page = { key: number; rotation: number };

// Skaner (tizim oynasi) 4-bosqichda ulanadi; hozircha "Rasmga olish" namuna sahifalar beradi.
export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<Filter>('original');

  const capture = () => {
    setPages((prev) => [...prev, { key: Date.now(), rotation: 0 }]);
    setSelected(pages.length);
  };

  const rotate = () =>
    setPages((prev) => prev.map((p, i) => (i === selected ? { ...p, rotation: (p.rotation + 90) % 360 } : p)));

  const remove = () => {
    setPages((prev) => prev.filter((_, i) => i !== selected));
    setSelected((s) => Math.max(0, s - 1));
  };

  if (pages.length === 0) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Placeholder
          icon={Camera}
          title="Skaner shu yerda ochiladi"
          hint="Chegara avtomatik topiladi, qirqiladi va tekislanadi"
          style={styles.fill}
        />
        <Button label="Rasmga olish" icon={Camera} size="lg" onPress={capture} />
      </View>
    );
  }

  const page = pages[selected];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={[styles.preview, { backgroundColor: colors.surface }]}>
        <View style={[styles.sheet, { backgroundColor: colors.background, transform: [{ rotate: `${page.rotation}deg` }] }]}>
          <AppText variant="heading">{selected + 1}-bet</AppText>
          <AppText variant="caption" color="textSecondary">
            {FILTERS.find((f) => f.value === filter)?.label}
          </AppText>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
        {pages.map((p, i) => (
          <Pressable
            key={p.key}
            accessibilityLabel={`${i + 1}-bet`}
            onPress={() => setSelected(i)}
            style={[
              styles.thumb,
              { backgroundColor: colors.surface, borderColor: i === selected ? colors.text : colors.border },
            ]}>
            <AppText variant="caption">{i + 1}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      <Segmented options={FILTERS} value={filter} onChange={setFilter} />

      <View style={styles.tools}>
        <IconButton icon={RotateCw} label="Burish" onPress={rotate} />
        <IconButton icon={Plus} label="Qo'shish" onPress={capture} />
        <IconButton icon={Trash2} label="O'chirish" color="danger" onPress={remove} />
      </View>

      <Button label="Tayyor" size="lg" onPress={() => router.push('/save')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  fill: {
    flex: 1,
  },
  preview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  sheet: {
    width: '60%',
    aspectRatio: 3 / 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  thumbs: {
    gap: Spacing.sm,
  },
  thumb: {
    width: 48,
    height: 64,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tools: {
    flexDirection: 'row',
  },
});
