import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ArrowUpDown,
  Combine,
  FileText,
  FileUp,
  FolderInput,
  Images,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  ScanLine,
  Search,
  SearchX,
  Settings,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { AppText } from '@/components/app-text';
import { ChoiceDialog, PromptDialog } from '@/components/dialog';
import { DocCard } from '@/components/doc-card';
import { DocRow } from '@/components/doc-row';
import { FolderChip } from '@/components/folder-chip';
import { Onboarding } from '@/components/onboarding';
import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import { countDocuments, listDocuments, listFolders, moveDocument, renameDocument, type Document, type Folder } from '@/db';
import { appFile, deleteDocument, formatDate, formatSize, importFile, scanDraft, shareDocument } from '@/files';
import { docSortPref, docViewPref, Fonts, onboardingPref, Radius, Spacing, useColors, type DocSort } from '@/theme';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type AddAction = 'import' | 'gallery' | 'merge';

const SORTS: { value: DocSort; label: string }[] = [
  { value: 'new', label: 'Avval yangilari' },
  { value: 'old', label: 'Avval eskilari' },
  { value: 'name', label: "Nomi bo'yicha (A–Z)" },
  { value: 'size', label: "Hajmi bo'yicha (kattasi avval)" },
];

type DocAction = 'share' | 'rename' | 'move' | 'delete';

const DOC_ACTIONS = [
  { value: 'share' as const, label: 'Ulashish', icon: Share2 },
  { value: 'rename' as const, label: "Nomini o'zgartirish", icon: Pencil },
  { value: 'move' as const, label: "Papkaga ko'chirish", icon: FolderInput },
  { value: 'delete' as const, label: "O'chirish", icon: Trash2 },
];

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Hujjatlar shu miqdorda yuklanadi; ro'yxat oxiriga yaqinlashganda keyingisi qo'shiladi.
const PAGE_SIZE = 60;

const ADD_ACTIONS = [
  { value: 'import' as const, label: "PDF yoki Word faylni qo'shish", icon: FileUp },
  { value: 'gallery' as const, label: 'Galereyadagi rasmlardan PDF', icon: Images },
  { value: 'merge' as const, label: "PDF'larni birlashtirish", icon: Combine },
];

export default function HomeScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [importing, setImporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sort = docSortPref.useValue();
  const view = docViewPref.useValue();
  const [sortOpen, setSortOpen] = useState(false);
  // Uzoq bosilgan hujjat va u uchun ochilgan oyna.
  const [target, setTarget] = useState<Document | null>(null);
  const [dialog, setDialog] = useState<'actions' | 'rename' | 'move' | null>(null);

  const load = useCallback(async () => {
    const filter = { search: query, folderId, sort };
    const [d, n, f] = await Promise.all([
      listDocuments(db, { ...filter, limit }),
      countDocuments(db, filter),
      listFolders(db),
    ]);
    setDocs(d);
    setTotal(n);
    setFolders(f);
    // Tanlangan papka sozlamalarda o'chirilgan bo'lsa, "Hammasi"ga qaytamiz.
    if (folderId && !f.some((x) => x.id === folderId)) setFolderId(null);
  }, [db, query, folderId, sort, limit]);

  // Birinchi ochilishda qisqa tanishtiruv: navigatsiyasiz, oddiy oyna sifatida.
  const onboarding = onboardingPref.useValue();

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

  const selectFolder = (id: string | null) => {
    setFolderId(id);
    setLimit(PAGE_SIZE);
  };

  const openActions = (doc: Document) => {
    setTarget(doc);
    setDialog('actions');
  };

  const closeDialog = () => {
    setDialog(null);
    setTarget(null);
  };

  const runDocAction = (action: DocAction) => {
    const doc = target;
    if (!doc) return;
    if (action === 'rename' || action === 'move') {
      setDialog(action);
      return;
    }
    closeDialog();
    if (action === 'share') {
      shareDocument(doc).catch((e) => Alert.alert("Ulashib bo'lmadi", errorText(e)));
      return;
    }
    Alert.alert("Hujjatni o'chirish", `"${doc.title}" butunlay o'chiriladi. Qaytarib bo'lmaydi.`, [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: () => deleteDocument(db, doc).then(load, (e) => Alert.alert("O'chirib bo'lmadi", errorText(e))),
      },
    ]);
  };

  const rename = async (title: string) => {
    if (target) await renameDocument(db, target.id, title);
    closeDialog();
    load();
  };

  const move = async (id: string | null) => {
    if (target) await moveDocument(db, target.id, id);
    closeDialog();
    load();
  };

  const open = (doc: Document) => router.push({ pathname: '/doc/[id]', params: { id: doc.id } });
  const thumbOf = (doc: Document) => (doc.thumb_path ? appFile(doc.thumb_path).uri : null);
  const searching = query.trim().length > 0 || folderId !== null;
  const isGrid = view === 'grid';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            onChangeText={(t) => {
              setQuery(t);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Hujjatlarni qidirish"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FolderChip label="Hammasi" selected={folderId === null} onPress={() => selectFolder(null)} />
          {folders.map((f) => (
            <FolderChip key={f.id} label={f.name} selected={f.id === folderId} onPress={() => selectFolder(f.id)} />
          ))}
        </ScrollView>
        <View style={styles.toolbar}>
          <AppText variant="caption" color="textSecondary" style={styles.fill}>
            {`${total} ta hujjat · uzoq bosing: amallar`}
          </AppText>
          <IconButton icon={ArrowUpDown} accessibilityLabel="Saralash" onPress={() => setSortOpen(true)} />
          <IconButton
            icon={isGrid ? List : LayoutGrid}
            accessibilityLabel={isGrid ? "Ro'yxat ko'rinishi" : "To'r ko'rinishi"}
            onPress={() => docViewPref.set(isGrid ? 'list' : 'grid')}
          />
        </View>
      </View>

      <FlatList
        // Ustunlar soni o'zgarganda FlatList qayta yaratilishi kerak.
        key={view}
        data={docs}
        keyExtractor={(d) => d.id}
        numColumns={isGrid ? 2 : 1}
        onEndReached={() => {
          if (docs.length < total) setLimit((l) => l + PAGE_SIZE);
        }}
        onEndReachedThreshold={0.6}
        initialNumToRender={isGrid ? 8 : 14}
        windowSize={7}
        removeClippedSubviews
        columnWrapperStyle={isGrid ? styles.row : undefined}
        contentContainerStyle={[
          isGrid ? styles.grid : styles.list,
          { paddingBottom: 56 + Spacing.xl * 2 + insets.bottom },
        ]}
        renderItem={({ item }) =>
          isGrid ? (
            <View style={styles.cell}>
              <DocCard
                title={item.title}
                date={formatDate(item.created_at)}
                pageCount={item.page_count}
                thumbUri={thumbOf(item)}
                onPress={() => open(item)}
                onLongPress={() => openActions(item)}
              />
            </View>
          ) : (
            <DocRow
              title={item.title}
              subtitle={[
                formatDate(item.created_at),
                item.page_count > 0 ? `${item.page_count} bet` : null,
                formatSize(item.file_size),
              ]
                .filter(Boolean)
                .join(' · ')}
              thumbUri={thumbOf(item)}
              onPress={() => open(item)}
              onLongPress={() => openActions(item)}
            />
          )
        }
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

      <Modal visible={onboarding === 'pending'} animationType="fade" statusBarTranslucent onRequestClose={() => onboardingPref.set('done')}>
        <Onboarding onDone={() => onboardingPref.set('done')} />
      </Modal>
      <ChoiceDialog<AddAction>
        visible={menuOpen}
        title="Qo'shish"
        options={ADD_ACTIONS}
        onSelect={runAction}
        onClose={() => setMenuOpen(false)}
      />
      <ChoiceDialog<DocSort>
        visible={sortOpen}
        title="Saralash"
        options={SORTS}
        selected={sort}
        onSelect={(s) => {
          docSortPref.set(s);
          setLimit(PAGE_SIZE);
          setSortOpen(false);
        }}
        onClose={() => setSortOpen(false)}
      />
      <ChoiceDialog<DocAction>
        visible={dialog === 'actions'}
        title={target?.title ?? ''}
        options={DOC_ACTIONS}
        onSelect={runDocAction}
        onClose={closeDialog}
      />
      <PromptDialog
        visible={dialog === 'rename'}
        title="Nomini o'zgartirish"
        initialValue={target?.title}
        onSubmit={rename}
        onClose={closeDialog}
      />
      <ChoiceDialog<string | null>
        visible={dialog === 'move'}
        title="Papkaga ko'chirish"
        options={[{ value: null, label: 'Papkasiz' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
        selected={target?.folder_id ?? null}
        onSelect={move}
        onClose={closeDialog}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    marginBottom: -Spacing.sm,
  },
  fill: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
    flexGrow: 1,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
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
