import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import {
  ChevronRight,
  Combine,
  FilePen,
  FileText,
  FolderOpen,
  ImageDown,
  Images,
  PlayCircle,
  RefreshCw,
  ScanLine,
  Search,
  Share2,
  ShieldCheck,
  Signature,
  Sparkles,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { clearLastError, getLastError } from '@/errors';
import { formatDateTime } from '@/files';
import { Radius, Spacing, useColors } from '@/theme';

const AUTHOR = 'Iskandar';
const RELEASE_YEAR = 2026;

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ScanLine, title: 'Skaner', text: "Chegara o'zi topiladi va tekislanadi" },
  { icon: FileText, title: 'PDF yoki rasm', text: 'Oq-qora va kulrang filtr' },
  { icon: FolderOpen, title: 'Word va PDF', text: "Word'ni PDF'ga o'girish" },
  { icon: Combine, title: 'Birlashtirish', text: "Bir nechta PDF'dan bitta" },
  { icon: FilePen, title: 'Sahifalar', text: "Burish, o'chirish, tartib" },
  { icon: Signature, title: 'Imzo', text: "Barmoq bilan chizib qo'yish" },
  { icon: Images, title: 'Galereyadan', text: 'Rasmlardan PDF yasash' },
  { icon: ImageDown, title: 'Sahifa → rasm', text: 'JPEG qilib ulashish' },
  { icon: Search, title: 'Aqlli qidiruv', text: "Hujjat ichidagi matn bo'yicha" },
  { icon: Share2, title: 'Ulashish', text: 'Telegram va boshqa ilovalar' },
];

const HIGHLIGHTS: { icon: LucideIcon; label: string }[] = [
  { icon: WifiOff, label: 'Internetsiz' },
  { icon: ShieldCheck, label: 'Telefoningizda' },
  { icon: Sparkles, label: 'Reklamasiz' },
];

type UpdateState = 'idle' | 'checking' | 'downloading';

function ActionRow({
  icon: Icon,
  label,
  onPress,
  busy,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.surfacePressed }]}>
      <Icon size={20} color={colors.primary} />
      <AppText variant="bodyMedium" style={styles.fill}>
        {label}
      </AppText>
      {busy ? <ActivityIndicator color={colors.textSecondary} /> : <ChevronRight size={20} color={colors.textSecondary} />}
    </Pressable>
  );
}

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<UpdateState>('idle');
  // Oxirgi kutilmagan xato: muammo bo'lsa ishlab chiquvchiga yuborish uchun.
  const [lastError, setLastError] = useState(getLastError);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  // Updater orqali kelgan versiya bo'lsa uning sanasi, aks holda APK ichidagi asl versiya.
  const updatedAt = !Updates.isEmbeddedLaunch && Updates.createdAt ? formatDateTime(Updates.createdAt.toISOString()) : null;
  // Asosiy rangning shaffof varianti: ikonka fonlari uchun.
  const tint = `${colors.primary}1A`;

  const checkForUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert('Yangilanish', 'Ishlab chiqish rejimida yangilanish tekshirilmaydi.');
      return;
    }
    try {
      setState('checking');
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        setState('idle');
        Alert.alert('Yangilanish', "Sizda eng so'nggi versiya o'rnatilgan.");
        return;
      }
      setState('downloading');
      await Updates.fetchUpdateAsync();
      setState('idle');
      Alert.alert('Yangilanish tayyor', 'Yangi versiyani hozir ishga tushiraymi?', [
        { text: 'Keyinroq', style: 'cancel' },
        { text: 'Qayta ishga tushirish', onPress: () => Updates.reloadAsync() },
      ]);
    } catch (e) {
      setState('idle');
      Alert.alert('Yangilanish', `Tekshirib bo'lmadi. Internetni tekshiring.\n\n${e instanceof Error ? e.message : ''}`);
    }
  };

  const updateLabel =
    state === 'checking' ? 'Tekshirilmoqda…' : state === 'downloading' ? 'Yuklanmoqda…' : 'Yangilanishni tekshirish';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}>
      {/* Bosh qism: ko'k banner, ikonka, nom va versiya */}
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.iconTile}>
          <Image source={require('@/assets/images/icon.png')} style={styles.icon} />
        </View>
        <AppText variant="title" style={styles.heroTitle}>
          DocBuilder
        </AppText>
        <AppText variant="small" style={styles.heroSubtitle}>
          {"Hujjatlar uchun cho'ntak skaneri"}
        </AppText>
        <View style={styles.versionPill}>
          <AppText variant="caption" style={styles.heroTitle}>
            {`Versiya ${version}`}
            {updatedAt ? ` · yangilangan ${updatedAt}` : ''}
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.highlights}>
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <View key={label} style={[styles.highlight, { backgroundColor: colors.surface }]}>
              <Icon size={22} color={colors.primary} />
              <AppText variant="caption">{label}</AppText>
            </View>
          ))}
        </View>

        {/* Muallif */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <AppText variant="heading" style={{ color: colors.onPrimary }}>
                {AUTHOR[0]}
              </AppText>
            </View>
            <View style={styles.fill}>
              <AppText variant="bodyMedium">{AUTHOR}</AppText>
              <AppText variant="caption" color="textSecondary">
                Ishlab chiquvchi
              </AppText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <AppText variant="small" color="textSecondary">
            {`${AUTHOR} tomonidan ishlab chiqilgan. © ${RELEASE_YEAR} ${AUTHOR}. Barcha huquqlar himoyalangan.`}
          </AppText>
        </View>

        {/* Imkoniyatlar */}
        <View style={styles.section}>
          <AppText variant="heading">Ilova nimalar qila oladi</AppText>
          <View style={styles.grid}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <View key={title} style={[styles.tile, { backgroundColor: colors.surface }]}>
                <View style={[styles.tileIcon, { backgroundColor: tint }]}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <AppText variant="bodyMedium" numberOfLines={1}>
                  {title}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                  {text}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Amallar */}
        <View style={[styles.card, styles.actions, { backgroundColor: colors.surface }]}>
          <ActionRow icon={RefreshCw} label={updateLabel} busy={state !== 'idle'} onPress={checkForUpdate} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ActionRow icon={PlayCircle} label="Tanishtiruvni qayta ko'rish" onPress={() => router.push('/welcome')} />
        </View>

        {lastError && (
          <View style={styles.section}>
            <AppText variant="small" color="textSecondary">
              Oxirgi xato (ishlab chiquvchiga yuborish uchun)
            </AppText>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <AppText variant="caption" selectable numberOfLines={12}>
                {lastError}
              </AppText>
            </View>
            <Button
              label="Xatoni tozalash"
              variant="secondary"
              onPress={() => {
                clearLastError();
                setLastError(null);
              }}
            />
          </View>
        )}

        <AppText variant="caption" color="textSecondary" style={styles.center}>
          Yangilanishlar ilova ochilganda avtomatik tekshiriladi.
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  iconTile: {
    padding: Spacing.sm,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.sm,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 22,
  },
  heroTitle: {
    color: '#FFFFFF',
  },
  heroSubtitle: {
    color: '#DBEAFE',
  },
  versionPill: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  body: {
    gap: Spacing.xl,
    padding: Spacing.lg,
    // Ko'rsatkichlar bannerga biroz chiqib turadi.
    marginTop: -Spacing.xxl,
  },
  highlights: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  highlight: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  section: {
    gap: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  // Ikki ustun: oradagi bo'shliqni hisobga olib yarmidan biroz kam.
  tile: {
    width: '48.5%',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actions: {
    gap: 0,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  fill: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
});
