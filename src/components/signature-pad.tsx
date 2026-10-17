import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Radius, useColors } from '@/theme';

export const SIGNATURE_STROKE = 3;

// Chizilgan imzo: chetidagi bo'sh joy kesilgan, koordinatalar (0,0) dan boshlanadi.
export type Signature = { d: string; width: number; height: number };

type Point = [number, number];

const toPath = (stroke: Point[]) =>
  stroke.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

// Imzo atrofidagi bo'sh joyni kesib, yo'lni chap yuqori burchakka suradi.
function normalize(strokes: Point[][]): Signature | null {
  const all = strokes.flat();
  if (all.length < 2) return null;
  const margin = SIGNATURE_STROKE;
  const minX = Math.min(...all.map((p) => p[0])) - margin;
  const minY = Math.min(...all.map((p) => p[1])) - margin;
  const maxX = Math.max(...all.map((p) => p[0])) + margin;
  const maxY = Math.max(...all.map((p) => p[1])) + margin;
  const d = strokes.map((s) => toPath(s.map(([x, y]) => [x - minX, y - minY] as Point))).join(' ');
  return { d, width: maxX - minX, height: maxY - minY };
}

type Props = {
  color: string;
  // Har chiziqdan keyin chaqiriladi; hali hech narsa chizilmagan bo'lsa null.
  onChange: (signature: Signature | null) => void;
};

// Tozalash uchun ota komponent `key` ni o'zgartiradi.
export function SignaturePad({ color, onChange }: Props) {
  const colors = useColors();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [strokes, setStrokes] = useState<Point[][]>([]);
  // Barmoq harakati juda tez keladi: chiziqlar ref'da yig'iladi, holat esa faqat chizish uchun.
  const strokesRef = useRef<Point[][]>([]);

  const begin = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    strokesRef.current = [...strokesRef.current, [[locationX, locationY]]];
    setStrokes(strokesRef.current);
  };

  const extend = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const all = strokesRef.current;
    const last = all[all.length - 1] ?? [];
    strokesRef.current = [...all.slice(0, -1), [...last, [locationX, locationY]]];
    setStrokes(strokesRef.current);
  };

  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);

  return (
    <View
      onLayout={onLayout}
      style={[styles.pad, { borderColor: colors.border }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Ota ScrollView yoki navigatsiya imo-ishorasi chizishni to'xtatib qo'ymasin.
      onResponderTerminationRequest={() => false}
      onResponderGrant={begin}
      onResponderMove={extend}
      onResponderRelease={() => onChange(normalize(strokesRef.current))}>
      {/* Bolalar teginishni o'ziga olmasin: aks holda locationX ularga nisbatan hisoblanadi. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {strokes.length === 0 && (
          <View style={styles.hintBox}>
            <AppText variant="small" style={styles.hint}>
              Shu yerga barmoq bilan imzo chizing
            </AppText>
          </View>
        )}
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          {strokes.map((s, i) => (
            <Path
              key={i}
              d={toPath(s)}
              stroke={color}
              strokeWidth={SIGNATURE_STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Qog'ozdagidek oq fon: qorong'i rejimda ham imzo qanday chiqishi aniq ko'rinadi.
  pad: {
    height: 220,
    borderWidth: 1,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  hintBox: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: '#A1A1AA',
  },
});
