import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FolderChip } from '@/components/folder-chip';
import { listFolders, type Folder } from '@/db';
import { createScanDocument, formatDate, scanDraft } from '@/files';
import { Fonts, Radius, Spacing, useColors } from '@/theme';

function defaultTitle() {
  return `Hujjat ${formatDate(new Date().toISOString())}`;
}

export default function SaveScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(defaultTitle);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pageCount = scanDraft.get().pages.length;

  useEffect(() => {
    listFolders(db).then(setFolders);
  }, [db]);

  const save = async () => {
    const { pages, filter } = scanDraft.get();
    setSaving(true);
    try {
      const id = await createScanDocument(db, { title: title.trim(), folderId, pages, filter });
      scanDraft.clear();
      router.dismissTo('/');
      router.push({ pathname: '/doc/[id]', params: { id } });
    } catch (e) {
      setSaving(false);
      Alert.alert('PDF yaratilmadi', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={styles.field}>
        <AppText variant="small" color="textSecondary">
          Nomi
        </AppText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          selectTextOnFocus
          editable={!saving}
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        />
      </View>

      <View style={styles.field}>
        <AppText variant="small" color="textSecondary">
          Papka
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FolderChip label="Papkasiz" selected={folderId === null} onPress={() => setFolderId(null)} />
          {folders.map((f) => (
            <FolderChip key={f.id} label={f.name} selected={f.id === folderId} onPress={() => setFolderId(f.id)} />
          ))}
        </ScrollView>
      </View>

      <AppText variant="small" color="textSecondary">
        {`${pageCount} sahifa bitta PDF bo'lib saqlanadi`}
      </AppText>

      <View style={styles.fill}>{saving && <ActivityIndicator color={colors.text} style={styles.fill} />}</View>
      <Button
        label={saving ? 'PDF yaratilmoqda…' : 'Saqlash'}
        icon={Save}
        size="lg"
        disabled={saving || !title.trim() || pageCount === 0}
        onPress={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.xl,
    padding: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  input: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  chips: {
    gap: Spacing.sm,
  },
  fill: {
    flex: 1,
  },
});
