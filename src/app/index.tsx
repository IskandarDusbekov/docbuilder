import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FileText, Plus, ScanLine, Search, SearchX, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChoiceDialog } from '@/components/dialog';
import { DocCard } from '@/components/doc-card';
import { FolderChip } from '@/components/folder-chip';
import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import { listDocuments, listFolders, type Document, type Folder } from '@/db';
import { appFile, formatDate, importFile, scanDraft } from '@/files';
import { Fonts, Radius, Spacing, useColors } from '@/theme';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type AddAction = 'import' | 'gallery' | 'merge';

const ADD_ACTIONS: { value: AddAction; label: string }[] = [
  { value: 'import', label: "PDF yoki Word faylni qo'shish" },
  { value: 'gallery', label: 'Galereyadagi rasmlardan PDF' },
  { value: 'merge', label: "PDF'larni birlashtirish" },
];

export default function HomeScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [importing, setImporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    const [d, f] = await Promise.all([listDocuments(db, { search: query, folderId }), listFolders(db)]);
    setDocs(d);
    setFolders(f);
    // Tanlangan papka sozlamalarda o'chirilgan bo'lsa, "Hammasi"ga qaytamiz.
    if (folderId && !f.some((x) => x.id === folderId)) setFolderId(null);
  }, [db, query, folderId]);

  // Boshqa ekrandan qaytganda ham ro'yxat yangilanadi.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const importFromPhone = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', DOCX_MIME],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;

    setImporting(true);
    const failed: string[] = [];
    let lastId: string | null = null;
    for (const asset of res.assets) {
      try {
        lastId = await importFile(db, asset.uri, asset.name);
      } catch (e) {
        failed.push(`${asset.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setImporting(false);
    load();
    if (failed.length) Alert.alert("Ba'zi fayllar qo'shilmadi", failed.join('\n'));
    // Bitta fayl tanlansa (ayniqsa Word), natijani darhol ko'rsatamiz.
    else if (res.assets.length === 1 && lastId) router.push({ pathname: '/doc/[id]', params: { id: lastId } });
  };

  const pdfFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      quality: 1,
    });
    if (res.canceled || res.assets.length === 0) return;
    scanDraft.set(
      res.assets.map((a, i) => ({ key: `${Date.now()}-${i}`, uri: a.uri, rotation: 0 })),
      'original'
    );
    router.push({ pathname: '/scan', params: { source: 'gallery' } });
  };

  const runAction = (action: AddAction) => {
    setMenuOpen(false);
    if (action === 'import') importFromPhone();
    else if (action === 'gallery') pdfFromGallery();
    else router.push('/merge');
  };

  const searching = query.trim().length > 0 || folderId !== null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              {importing ? (
                <ActivityIndicator color={colors.text} style={styles.spinner} />
              ) : (
                <IconButton icon={Plus} accessibilityLabel="Qo'shish" onPress={() => setMenuOpen(true)} />
              )}
              <IconButton icon={Settings} accessibilityLabel="Sozlamalar" onPress={() => router.push('/settings')} />
            </View>
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
          <FolderChip label="Hammasi" selected={folderId === null} onPress={() => setFolderId(null)} />
          {folders.map((f) => (
            <FolderChip key={f.id} label={f.name} selected={f.id === folderId} onPress={() => setFolderId(f.id)} />
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
              date={formatDate(item.created_at)}
              pageCount={item.page_count}
              thumbUri={item.thumb_path ? appFile(item.thumb_path).uri : null}
              onPress={() => router.push({ pathname: '/doc/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          searching ? (
            <Placeholder icon={SearchX} title="Hech narsa topilmadi" />
          ) : (
            <Placeholder
              icon={FileText}
              title="Hali hujjat yo'q"
              hint="Pastdagi tugma bilan skanerlang yoki yuqoridagi tugma bilan PDF import qiling"
            />
          )
        }
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button label="Skanerlash" icon={ScanLine} size="lg" onPress={() => router.push('/scan')} />
      </View>

      <ChoiceDialog<AddAction | null>
        visible={menuOpen}
        title="Qo'shish"
        options={ADD_ACTIONS}
        selected={null}
        onSelect={(a) => a && runAction(a)}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  spinner: {
    width: 40,
    height: 40,
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
