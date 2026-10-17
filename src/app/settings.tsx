import { useSQLiteContext } from 'expo-sqlite';
import { ChevronRight, Folder as FolderIcon, FolderPlus, HardDrive, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PromptDialog } from '@/components/dialog';
import { Segmented } from '@/components/segmented';
import { createFolder, deleteFolder, listFolders, renameFolder, totalFileSize, type Folder } from '@/db';
import { formatSize } from '@/files';
import {
  Radius,
  setSchemePreference,
  Spacing,
  useColors,
  useSchemePreference,
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
  const colors = useColors();
  const scheme = useSchemePreference();
  const [used, setUsed] = useState<number | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  // null: oyna yopiq; folder yo'q bo'lsa yangi papka, bor bo'lsa nomini o'zgartirish.
  const [prompt, setPrompt] = useState<{ folder?: Folder } | null>(null);

  const loadFolders = useCallback(() => listFolders(db).then(setFolders), [db]);

  useEffect(() => {
    totalFileSize(db).then(setUsed);
    loadFolders();
  }, [db, loadFolders]);

  const changeScheme = (value: SchemePreference) => setSchemePreference(value);

  const submitFolder = async (name: string) => {
    try {
      if (prompt?.folder) await renameFolder(db, prompt.folder.id, name);
      else await createFolder(db, name);
      setPrompt(null);
      loadFolders();
    } catch (e) {
      Alert.alert('Saqlanmadi', e instanceof Error ? e.message : String(e));
    }
  };

  const folderActions = (folder: Folder) =>
    Alert.alert(folder.name, undefined, [
      { text: "Nomini o'zgartirish", onPress: () => setPrompt({ folder }) },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: () =>
          Alert.alert("Papkani o'chirish", "Ichidagi hujjatlar o'chmaydi, papkasiz bo'lib qoladi.", [
            { text: 'Bekor qilish', style: 'cancel' },
            {
              text: "O'chirish",
              style: 'destructive',
              onPress: async () => {
                await deleteFolder(db, folder.id);
                loadFolders();
              },
            },
          ]),
      },
      { text: 'Bekor qilish', style: 'cancel' },
    ]);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Section title="Ko'rinish">
        <Segmented options={SCHEMES} value={scheme} onChange={changeScheme} />
      </Section>

      <Section title="Papkalar">
        {folders.map((f) => (
          <Row key={f.id} icon={FolderIcon} label={f.name} onPress={() => folderActions(f)} />
        ))}
        <Button label="Yangi papka" icon={FolderPlus} variant="secondary" onPress={() => setPrompt({})} />
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

      <PromptDialog
        visible={prompt !== null}
        title={prompt?.folder ? "Papka nomini o'zgartirish" : 'Yangi papka'}
        initialValue={prompt?.folder?.name}
        placeholder="Masalan: Ish"
        submitLabel={prompt?.folder ? 'Saqlash' : 'Yaratish'}
        onSubmit={submitFolder}
        onClose={() => setPrompt(null)}
      />
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
