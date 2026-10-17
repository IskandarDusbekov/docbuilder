import { useSQLiteContext } from 'expo-sqlite';
import { ChevronRight, Folder, HardDrive, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { totalFileSize } from '@/db';
import { formatSize } from '@/files';
import {
  getSchemePreference,
  Radius,
  setSchemePreference,
  Spacing,
  useColors,
  type SchemePreference,
} from '@/theme';

const SCHEMES = [
  { value: 'system', label: 'Tizim' },
  { value: 'light', label: "Yorug'" },
  { value: 'dark', label: "Qorong'i" },
] as const;

const soon = (stage: number) => () => Alert.alert('Tez orada', `Bu amal ${stage}-bosqichda qo'shiladi.`);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="small" color="textSecondary">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Row({ icon: Icon, label, value, onPress }: { icon: LucideIcon; label: string; value?: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfacePressed : colors.surface }]}>
      <Icon size={20} color={colors.text} />
      <AppText variant="bodyMedium" style={styles.fill}>
        {label}
      </AppText>
      {value && (
        <AppText variant="small" color="textSecondary">
          {value}
        </AppText>
      )}
      {onPress && <ChevronRight size={20} color={colors.textSecondary} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [scheme, setScheme] = useState<SchemePreference>(getSchemePreference);
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    totalFileSize(db).then(setUsed);
  }, [db]);

  const changeScheme = (value: SchemePreference) => {
    setScheme(value);
    setSchemePreference(value);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Ko'rinish">
        <Segmented options={SCHEMES} value={scheme} onChange={changeScheme} />
      </Section>

      <Section title="Papkalar">
        <Row icon={Folder} label="Papkalarni boshqarish" onPress={soon(5)} />
      </Section>

      <Section title="Zaxira nusxa">
        <AppText variant="small" color="textSecondary">
          {"Barcha hujjatlar bitta ZIP faylga yig'iladi. Uni Google Drive yoki Telegram'ga saqlang."}
        </AppText>
        <Button label="Zaxira nusxa yaratish" onPress={soon(6)} />
        <Button label="Zaxiradan tiklash" variant="secondary" onPress={soon(6)} />
      </Section>

      <Section title="Xotira">
        <Row icon={HardDrive} label="Egallangan joy" value={used === null ? '…' : formatSize(used)} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xl,
    padding: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    height: 56,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  fill: {
    flex: 1,
  },
});
