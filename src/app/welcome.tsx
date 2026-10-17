import { router } from 'expo-router';
import { FilePen, FolderOpen, ScanLine, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { onboardingPref, Radius, Spacing, useColors } from '@/theme';

type Slide = { icon: LucideIcon; title: string; text: string };

const SLIDES: Slide[] = [
  {
    icon: ScanLine,
    title: 'Skanerlang',
    text: "Pastdagi ko'k tugmani bosing. Kamera hujjat chegarasini o'zi topadi, qirqadi va tekislaydi.",
  },
  {
    icon: FilePen,
    title: 'Tahrirlang',
    text: "Sahifalarni buring, tartibini o'zgartiring, oq-qora filtr bering va barmoq bilan imzo qo'ying.",
  },
  {
    icon: FolderOpen,
    title: 'Hammasi bir joyda',
    text: "PDF va Word fayllarni qo'shing, birlashtiring, papkalarga ajrating. Hujjat ichidagi matn bo'yicha ham qidiring.",
  },
  {
    icon: ShieldCheck,
    title: 'Internetsiz va xavfsiz',
    text: "Hujjatlar faqat telefoningizda saqlanadi. Telegram'ga bir bosishda ulashing.",
  },
];

// Faol slayddagi ikonka: paydo bo'ladi va sekin "nafas oladi".
function SlideIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  const colors = useColors();
  const [appear] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) return;
    appear.setValue(0);
    Animated.spring(appear, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, appear, pulse]);

  const scale = Animated.multiply(
    appear.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
    pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })
  );

  return (
    <Animated.View style={[styles.iconWrap, { backgroundColor: colors.surface, opacity: appear, transform: [{ scale }] }]}>
      <View style={[styles.iconInner, { backgroundColor: colors.primary }]}>
        <Icon size={56} color={colors.onPrimary} />
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = () => {
    onboardingPref.set('done');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const next = () => {
    if (last) return finish();
    list.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.lg },
      ]}>
      <View style={styles.skipRow}>
        {!last && (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button">
            <AppText variant="bodyMedium" color="textSecondary">
              {"O'tkazib yuborish"}
            </AppText>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            <SlideIcon icon={item.icon} active={i === index} />
            <AppText variant="title" style={styles.center}>
              {item.title}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.center}>
              {item.text}
            </AppText>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View
            key={s.title}
            style={[
              styles.dot,
              { backgroundColor: i === index ? colors.primary : colors.border, width: i === index ? 24 : 8 },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label={last ? 'Boshlash' : 'Keyingi'} size="lg" onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipRow: {
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: Radius.lg * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
  },
});
