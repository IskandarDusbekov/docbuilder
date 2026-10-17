import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Minus, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FolderChip } from '@/components/folder-chip';
import { IconButton } from '@/components/icon-button';
import { SIGNATURE_STROKE, SignaturePad, type Signature } from '@/components/signature-pad';
import { getDocument, type Document } from '@/db';
import { getPageSizes, renderPage, SIGNATURE_COLOR, signDocument } from '@/files';
import { Radius, Spacing, useColors } from '@/theme';

const INK = `rgb(${SIGNATURE_COLOR.r * 255}, ${SIGNATURE_COLOR.g * 255}, ${SIGNATURE_COLOR.b * 255})`;
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type PageSize = { width: number; height: number; rotation: number };

export default function SignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<Document | null>(null);
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [step, setStep] = useState<'draw' | 'place'>('draw');
  const [pageIndex, setPageIndex] = useState(0);
  const [rendered, setRendered] = useState<{ index: number; uri: string } | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // Imzo joyi va kengligi sahifaga nisbatan ulushlarda (0..1).
  const [pos, setPos] = useState({ x: 0.55, y: 0.8 });
  const [width, setWidth] = useState(0.3);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await getDocument(db, id);
      if (!d) return router.back();
      setDoc(d);
      try {
        const s = await getPageSizes(d);
        setSizes(s);
        setPageIndex(s.length - 1); // Imzo odatda oxirgi sahifaga qo'yiladi.
      } catch (e) {
        Alert.alert("Hujjatni ochib bo'lmadi", errorText(e));
        router.back();
      }
    })();
  }, [db, id]);

  useEffect(() => {
    if (!doc || step !== 'place') return;
    renderPage(doc, pageIndex, 1200)
      .then((r) => setRendered({ index: pageIndex, uri: r.uri }))
      .catch((e) => Alert.alert("Sahifani ochib bo'lmadi", errorText(e)));
  }, [doc, pageIndex, step]);
  // Boshqa sahifa tanlanganda yangi rasm kelguncha eski sahifa ko'rsatilmaydi.
  const pageUri = rendered?.index === pageIndex ? rendered.uri : null;

  // Sahifa ko'rinishining ekrandagi o'lchami (mavjud joyga sig'diriladi).
  const page = sizes[pageIndex];
  const aspect = page ? page.width / page.height : 3 / 4;
  const view =
    area.width && area.height
      ? area.width / area.height > aspect
        ? { width: area.height * aspect, height: area.height }
        : { width: area.width, height: area.width / aspect }
      : { width: 0, height: 0 };
  const sigHeightRatio = signature ? ((width * view.width * signature.height) / signature.width) / view.height : 0;

  // Sudrash boshlangandagi barmoq va imzo joyi.
  const dragStart = useRef({ pageX: 0, pageY: 0, x: 0, y: 0 });

  const startDrag = (e: GestureResponderEvent) => {
    dragStart.current = { pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY, ...pos };
  };

  const moveDrag = (e: GestureResponderEvent) => {
    if (!view.width) return;
    const s = dragStart.current;
    setPos({
      x: clamp(s.x + (e.nativeEvent.pageX - s.pageX) / view.width, 0, 1 - width),
      y: clamp(s.y + (e.nativeEvent.pageY - s.pageY) / view.height, 0, 1 - sigHeightRatio),
    });
  };

  if (!doc || sizes.length === 0) {
    return <ActivityIndicator color={colors.text} style={styles.fill} />;
  }

  const resize = (delta: number) => {
    const next = clamp(width + delta, 0.1, 0.8);
    setWidth(next);
    setPos((p) => ({ x: Math.min(p.x, 1 - next), y: p.y }));
  };

  const save = async () => {
    if (!signature) return;
    setBusy(true);
    try {
      const newId = await signDocument(db, doc, {
        pageIndex,
        path: signature.d,
        padWidth: signature.width,
        strokeWidth: SIGNATURE_STROKE,
        x: pos.x,
        y: pos.y,
        width,
      });
      router.replace({ pathname: '/doc/[id]', params: { id: newId } });
    } catch (e) {
      setBusy(false);
      Alert.alert("Imzo qo'yilmadi", errorText(e));
    }
  };

  const onArea = (e: LayoutChangeEvent) => setArea(e.nativeEvent.layout);

  if (step === 'draw') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <SignaturePad key={padKey} color={INK} onChange={setSignature} />
        <View style={styles.actions}>
          <Button
            label="Tozalash"
            variant="secondary"
            style={styles.fill}
            onPress={() => {
              setSignature(null);
              setPadKey((k) => k + 1);
            }}
          />
          <Button label="Davom etish" style={styles.fill} disabled={!signature} onPress={() => setStep('place')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
      {sizes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsBar}>
          {sizes.map((_, i) => (
            <FolderChip key={i} label={`${i + 1}-bet`} selected={i === pageIndex} onPress={() => setPageIndex(i)} />
          ))}
        </ScrollView>
      )}

      <View style={styles.area} onLayout={onArea}>
        <View style={[{ width: view.width, height: view.height, borderColor: colors.border }, styles.page]}>
          {pageUri ? (
            <Image source={{ uri: pageUri }} style={StyleSheet.absoluteFill} contentFit="fill" />
          ) : (
            <ActivityIndicator style={styles.fill} />
          )}
          {signature && view.width > 0 && (
            <View
              onStartShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={startDrag}
              onResponderMove={moveDrag}
              style={[
                styles.signature,
                {
                  left: pos.x * view.width,
                  top: pos.y * view.height,
                  width: width * view.width,
                  height: sigHeightRatio * view.height,
                  borderColor: colors.primary,
                },
              ]}>
              <Svg width="100%" height="100%" viewBox={`0 0 ${signature.width} ${signature.height}`}>
                <Path
                  d={signature.d}
                  stroke={INK}
                  strokeWidth={SIGNATURE_STROKE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
          )}
        </View>
      </View>

      <AppText variant="small" color="textSecondary">
        {page?.rotation
          ? 'Bu sahifa burilgan: imzo joyi biroz siljishi mumkin.'
          : 'Imzoni barmoq bilan kerakli joyga suring.'}
      </AppText>

      <View style={styles.actions}>
        <IconButton icon={Minus} label="Kichraytirish" onPress={() => resize(-0.05)} />
        <IconButton icon={Plus} label="Kattalashtirish" onPress={() => resize(0.05)} />
        <Button label="Qayta chizish" variant="secondary" onPress={() => setStep('draw')} />
      </View>
      <Button label={busy ? 'Saqlanmoqda…' : 'Saqlash'} size="lg" disabled={busy || !pageUri} onPress={save} />
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chipsBar: {
    flexGrow: 0,
  },
  chips: {
    gap: Spacing.sm,
  },
  area: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  signature: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
