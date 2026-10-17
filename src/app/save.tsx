import { router } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FolderChip } from '@/components/folder-chip';
import { Fonts, Radius, Spacing, useColors } from '@/theme';

// Vaqtinchalik: papkalar 5-bosqichda bazadan olinadi.
const FOLDERS = ['Papkasiz', 'Ish', 'Shaxsiy'];

function defaultTitle() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Hujjat ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export default function SaveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(defaultTitle);
  const [folder, setFolder] = useState(FOLDERS[0]);

  // PDF yaratish 4-bosqichda; hozircha bosh sahifaga qaytadi.
  const save = () => router.dismissTo('/');

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
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        />
      </View>

      <View style={styles.field}>
        <AppText variant="small" color="textSecondary">
          Papka
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FOLDERS.map((f) => (
            <FolderChip key={f} label={f} selected={f === folder} onPress={() => setFolder(f)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.fill} />
      <Button label="Saqlash" icon={Save} size="lg" disabled={!title.trim()} onPress={save} />
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
