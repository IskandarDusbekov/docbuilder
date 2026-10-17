import { router, Stack } from 'expo-router';
import { FileText, ScanLine, Search, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DocCard } from '@/components/doc-card';
import { FolderChip } from '@/components/folder-chip';
import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import { Fonts, Radius, Spacing, useColors } from '@/theme';

// Vaqtinchalik namuna ma'lumot: 2-bosqichda SQLite'dan o'qiladi.
const FOLDERS = ['Hammasi', 'Ish', 'Shaxsiy'];
const DOCS = [{ id: 'namuna', title: 'Namuna hujjat', date: '17.10.2026', pageCount: 3 }];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState(FOLDERS[0]);

  const docs = DOCS.filter((d) => d.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton icon={Settings} accessibilityLabel="Sozlamalar" onPress={() => router.push('/settings')} />
          ),
        }}
      />

      <View style={styles.top}>
        <View style={[styles.search, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Hujjatlarni qidirish"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FOLDERS.map((f) => (
            <FolderChip key={f} label={f} selected={f === folder} onPress={() => setFolder(f)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.grid, { paddingBottom: 56 + Spacing.xl * 2 + insets.bottom }]}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <DocCard
              title={item.title}
              date={item.date}
              pageCount={item.pageCount}
              onPress={() => router.push({ pathname: '/doc/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          <Placeholder icon={FileText} title="Hujjat topilmadi" hint="Yangi hujjat uchun pastdagi tugmani bosing" />
        }
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button label="Skanerlash" icon={ScanLine} size="lg" onPress={() => router.push('/scan')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  top: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  chips: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
    flexGrow: 1,
  },
  row: {
    gap: Spacing.lg,
  },
  // Toq sonli ro'yxatda oxirgi kartochka butun qatorni egallamasin.
  cell: {
    flex: 1,
    maxWidth: '50%',
  },
  bottom: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: 0,
  },
});
