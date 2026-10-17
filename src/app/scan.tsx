import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Camera, ChevronLeft, ChevronRight, Plus, RotateCw, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DocumentScanner, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import { Segmented } from '@/components/segmented';
import { FILTER_CSS, scanDraft, type ScanFilter, type ScanPage } from '@/files';
import { Radius, Spacing, useColors } from '@/theme';

const FILTERS = [
  { value: 'original', label: 'Asl' },
  { value: 'bw', label: 'Oq-qora' },
  { value: 'gray', label: 'Kulrang' },
] as const;

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<ScanFilter>('original');
  const [scanning, setScanning] = useState(false);
  const started = useRef(false);

  // Tizim skaneri: chegarani topadi, qirqadi va tekislaydi. Bir ochilishda bir nechta sahifa olish mumkin.
  const scan = async () => {
    setScanning(true);
    try {
      const res = await DocumentScanner.scanDocument({ croppedImageQuality: 90 });
      const images = res.status === ScanDocumentResponseStatus.Success ? (res.scannedImages ?? []) : [];
      if (images.length === 0) return false;
      // Android ba'zan sxemasiz yo'l qaytaradi; rasm va manipulator uchun file:// kerak.
      const added = images.map((path, i) => ({
        key: `${Date.now()}-${i}`,
        uri: path.startsWith('/') ? `file://${path}` : path,
        rotation: 0,
      }));
      setSelected(pages.length);
      setPages((prev) => [...prev, ...added]);
      return true;
    } catch (e) {
      Alert.alert('Skaner ochilmadi', e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setScanning(false);
    }
  };

  // Ekran ochilishi bilan skaner ishga tushadi; birinchi skandan voz kechilsa, orqaga qaytamiz.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    scan().then((ok) => {
      if (!ok) router.back();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = () =>
    setPages((prev) => prev.map((p, i) => (i === selected ? { ...p, rotation: (p.rotation + 90) % 360 } : p)));

  const move = (delta: -1 | 1) => {
    const target = selected + delta;
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      [next[selected], next[target]] = [next[target], next[selected]];
      return next;
    });
    setSelected(target);
  };

  const remove = () => {
    setPages((prev) => prev.filter((_, i) => i !== selected));
    setSelected((s) => Math.max(0, Math.min(s, pages.length - 2)));
  };

  const done = () => {
    scanDraft.set(pages, filter);
    router.push('/save');
  };

  if (pages.length === 0) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {scanning ? (
          <ActivityIndicator color={colors.text} style={styles.fill} />
        ) : (
          <>
            <Placeholder icon={Camera} title="Sahifa yo'q" hint="Hujjatni qaytadan skanerlang" style={styles.fill} />
            <Button label="Skanerlash" icon={Camera} size="lg" onPress={scan} />
          </>
        )}
      </View>
    );
  }

  const page = pages[selected];
  const filterStyle = { filter: FILTER_CSS[filter] };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={[styles.preview, { backgroundColor: colors.surface }]}>
        <View style={[styles.fill, filterStyle]}>
          <Image
            source={{ uri: page.uri }}
            style={[styles.fill, { transform: [{ rotate: `${page.rotation}deg` }] }]}
            contentFit="contain"
          />
        </View>
        <AppText variant="caption" color="textSecondary" style={styles.counter}>
          {selected + 1} / {pages.length}
        </AppText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
        {pages.map((p, i) => (
          <Pressable
            key={p.key}
            accessibilityLabel={`${i + 1}-bet`}
            onPress={() => setSelected(i)}
            style={[styles.thumb, { borderColor: i === selected ? colors.text : colors.border }]}>
            <Image
              source={{ uri: p.uri }}
              style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${p.rotation}deg` }] }]}
              contentFit="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      <Segmented options={FILTERS} value={filter} onChange={setFilter} />

      <View style={styles.tools}>
        <IconButton
          icon={ChevronLeft}
          label="Chapga"
          accessibilityLabel="Sahifani bir o'rin oldinga surish"
          disabled={selected === 0}
          onPress={() => move(-1)}
        />
        <IconButton
          icon={ChevronRight}
          label="O'ngga"
          accessibilityLabel="Sahifani bir o'rin keyinga surish"
          disabled={selected === pages.length - 1}
          onPress={() => move(1)}
        />
        <IconButton icon={RotateCw} label="Burish" onPress={rotate} />
        <IconButton icon={Plus} label="Qo'shish" disabled={scanning} onPress={scan} />
        <IconButton icon={Trash2} label="O'chirish" color="danger" onPress={remove} />
      </View>

      <Button label="Tayyor" size="lg" onPress={done} />
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
    padding: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  counter: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.sm,
  },
  thumbs: {
    gap: Spacing.sm,
  },
  thumb: {
    width: 48,
    height: 64,
    borderRadius: Radius.sm,
    borderWidth: 2,
    overflow: 'hidden',
  },
  tools: {
    flexDirection: 'row',
  },
});
