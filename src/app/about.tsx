import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import {
  Combine,
  FilePen,
  FileText,
  FolderOpen,
  ImageDown,
  Images,
  ScanLine,
  Search,
  Share2,
  Signature,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { clearLastError, getLastError } from '@/errors';
import { formatDateTime } from '@/files';
import { Radius, Spacing, useColors } from '@/theme';

const AUTHOR = 'Iskandar';
const RELEASE_YEAR = 2026;

const FEATURES: { icon: LucideIcon; text: string }[] = [
  { icon: ScanLine, text: "Hujjatni kamera bilan skanerlash: chegara o'zi topiladi va tekislanadi" },
  { icon: FileText, text: "Skanni PDF yoki galereyaga rasm qilib saqlash, oq-qora va kulrang filtr" },
  { icon: FolderOpen, text: "Word (.docx) va PDF fayllarni ochish, Word'ni PDF'ga o'girish" },
  { icon: Combine, text: "Bir nechta PDF'ni bittaga birlashtirish" },
  { icon: FilePen, text: "Sahifalarni burish, o'chirish, tartibini o'zgartirish va ajratib olish" },
  { icon: Signature, text: "Barmoq bilan imzo chizib, PDF'ga qo'yish" },
  { icon: Images, text: 'Galereyadagi rasmlardan PDF yasash' },
  { icon: ImageDown, text: 'PDF sahifasini rasm qilib ulashish' },
  { icon: Search, text: "Hujjat nomi va ichidagi matn bo'yicha qidirish (OCR)" },
  { icon: Share2, text: "Telegram va boshqa ilovalarga ulashish, \"DocBuilder bilan ochish\"" },
  { icon: WifiOff, text: "Internetsiz ishlaydi: hamma hujjat faqat telefoningizda saqlanadi" },
];

type UpdateState = 'idle' | 'checking' | 'downloading';

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<UpdateState>('idle');
  // Oxirgi kutilmagan xato: muammo bo'lsa ishlab chiquvchiga yuborish uchun.
  const [lastError, setLastError] = useState(getLastError);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  // Updater orqali kelgan versiya bo'lsa uning sanasi, aks holda APK ichidagi asl versiya.
  const updatedAt = !Updates.isEmbeddedLaunch && Updates.createdAt ? formatDateTime(Updates.createdAt.toISOString()) : null;

  const checkForUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert('Yangilanish', "Ishlab chiqish rejimida yangilanish tekshirilmaydi.");
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
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.hero}>
        <Image source={require('@/assets/images/icon.png')} style={styles.icon} />
        <AppText variant="title">DocBuilder</AppText>
        <AppText variant="small" color="textSecondary">
          {`Versiya ${version}`}
          {updatedAt ? ` · yangilangan ${updatedAt}` : ''}
        </AppText>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <AppText variant="bodyMedium">{`${AUTHOR} tomonidan ishlab chiqilgan`}</AppText>
        <AppText variant="small" color="textSecondary">
          {`© ${RELEASE_YEAR} ${AUTHOR}. Barcha huquqlar himoyalangan.`}
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="small" color="textSecondary">
          Ilova nimalar qila oladi
        </AppText>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {FEATURES.map(({ icon: Icon, text }) => (
            <View key={text} style={styles.feature}>
              <Icon size={20} color={colors.primary} />
              <AppText variant="small" style={styles.fill}>
                {text}
              </AppText>
            </View>
          ))}
        </View>
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

      <Button label="Tanishtiruvni qayta ko'rish" variant="secondary" onPress={() => router.push('/welcome')} />
      <Button label={updateLabel} variant="secondary" disabled={state !== 'idle'} onPress={checkForUpdate} />
      <AppText variant="caption" color="textSecondary" style={styles.center}>
        Yangilanishlar ilova ochilganda ham avtomatik tekshiriladi.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xl,
    padding: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  fill: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
});
