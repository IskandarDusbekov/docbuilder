import { router, Stack, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Ellipsis,
  FilePen,
  FileWarning,
  FolderInput,
  ImageDown,
  Info,
  Pencil,
  Share2,
  Signature,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { ChoiceDialog, PromptDialog } from '@/components/dialog';
import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import {
  getDocument,
  listFolders,
  moveDocument,
  renameDocument,
  setPageCount,
  type Document,
  type Folder,
} from '@/db';
import { appFile, deleteDocument, formatDateTime, formatSize, shareDocument, sharePageAsImage } from '@/files';
import { Radius, Spacing, useColors } from '@/theme';

type MoreAction = 'edit' | 'sign' | 'image' | 'info';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // undefined: yuklanmoqda, null: topilmadi.
  const [doc, setDoc] = useState<Document | null | undefined>(undefined);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [failed, setFailed] = useState(false);
  const [dialog, setDialog] = useState<'rename' | 'move' | 'more' | null>(null);
  const [sharing, setSharing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  // Ko'ruvchi faqat ekran ko'rinib turganda yashaydi: tahrirlash ekrani faylni almashtirganda
  // orqada qolgan ko'ruvchi eski faylni o'qishga urinib qulamaydi.
  const focused = useIsFocused();
  // Yuklanish tugamasdan boshqa ekranga o'tilsa ham ko'ruvchi quladi, shuning uchun "Ko'proq" kutib turadi.
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => getDocument(db, id).then(setDoc), [db, id]);

  // Tahrirlash ekranidan qaytganda fayl yangilangan bo'lishi mumkin.
  useFocusEffect(
    useCallback(() => {
      reload();
      // Qaytganda ko'ruvchi qaytadan yuklanadi.
      return () => setLoaded(false);
    }, [reload])
  );

  const runMore = async (action: MoreAction) => {
    setDialog(null);
    if (!doc) return;
    if (action === 'edit') router.push({ pathname: '/edit/[id]', params: { id: doc.id } });
    else if (action === 'sign') router.push({ pathname: '/sign/[id]', params: { id: doc.id } });
    else if (action === 'info') showInfo(doc);
    else {
      try {
        await sharePageAsImage(doc, currentPage - 1);
      } catch (e) {
        Alert.alert("Rasm yaratilmadi", errorText(e));
      }
    }
  };

  const showInfo = async (d: Document) => {
    const folder = d.folder_id ? (await listFolders(db)).find((f) => f.id === d.folder_id)?.name : null;
    Alert.alert(
      "Hujjat haqida",
      [
        `Nomi: ${d.title}`,
        `Yaratilgan: ${formatDateTime(d.created_at)}`,
        `O'zgartirilgan: ${formatDateTime(d.updated_at)}`,
        `Sahifalar: ${totalPages || d.page_count || '—'}`,
        `Hajmi: ${formatSize(d.file_size)}`,
        `Papka: ${folder ?? 'Papkasiz'}`,
        `Matn tanilgan: ${d.ocr_text ? 'ha' : d.ocr_text === '' ? "matn topilmadi" : 'hali yo\'q'}`,
      ].join('\n')
    );
  };

  const onLoaded = (pages: number) => {
    setLoaded(true);
    setTotalPages(pages);
    // Import paytidagi taxminiy son noto'g'ri bo'lsa, ko'ruvchi bergan aniq son bilan almashtiramiz.
    if (doc && pages > 0 && pages !== doc.page_count) setPageCount(db, doc.id, pages);
  };

  const share = async () => {
    if (!doc) return;
    setSharing(true);
    try {
      await shareDocument(doc);
    } catch (e) {
      Alert.alert("Ulashib bo'lmadi", errorText(e));
    } finally {
      setSharing(false);
    }
  };

  const rename = async (title: string) => {
    if (!doc) return;
    setDialog(null);
    await renameDocument(db, doc.id, title);
    reload();
  };

  const openMove = async () => {
    setFolders(await listFolders(db));
    setDialog('move');
  };

  const move = async (folderId: string | null) => {
    if (!doc) return;
    setDialog(null);
    await moveDocument(db, doc.id, folderId);
    reload();
  };

  const confirmDelete = () => {
    if (!doc) return;
    Alert.alert("Hujjatni o'chirish", `"${doc.title}" butunlay o'chiriladi. Qaytarib bo'lmaydi.`, [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(db, doc);
            router.back();
          } catch (e) {
            Alert.alert("O'chirib bo'lmadi", errorText(e));
          }
        },
      },
    ]);
  };

  const pdf = doc ? appFile(doc.file_path) : null;
  const ready = !!doc && !!pdf?.exists;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: doc?.title ?? 'Hujjat' }} />

      <View style={[styles.viewer, { backgroundColor: colors.canvas }]}>
        {doc === undefined ? (
          <ActivityIndicator color={colors.text} style={styles.fill} />
        ) : !focused ? null : ready && pdf && !failed ? (
          <Pdf
            // Tahrirlangan PDF yangi fayl nomi bilan saqlanadi; ko'ruvchi shu nom o'zgarganda qayta yaratiladi.
            key={doc.file_path}
            source={{ uri: pdf.uri }}
            style={styles.fill}
            // Sahifalar orasidagi bo'shliq: ostidagi kulrang fon ko'rinib, sahifalar aniq ajraladi.
            spacing={14}
            onLoadComplete={onLoaded}
            onPageChanged={(page) => setCurrentPage(page)}
            onError={() => setFailed(true)}
          />
        ) : (
          <Placeholder icon={FileWarning} title="Hujjatni ochib bo'lmadi" hint="Fayl o'chirilgan yoki buzilgan" style={styles.fill} />
        )}
      </View>

      {focused && loaded && totalPages > 1 && (
        <View pointerEvents="none" style={[styles.pageBadge, { backgroundColor: colors.text, bottom: insets.bottom + 84 }]}>
          <AppText variant="caption" style={{ color: colors.background }}>
            {`${currentPage} / ${totalPages}`}
          </AppText>
        </View>
      )}

      <View style={[styles.bar, { borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.sm }]}>
        <IconButton icon={Share2} label="Ulashish" disabled={!ready || sharing} onPress={share} />
        <IconButton
          icon={Pencil}
          label="Nomi"
          accessibilityLabel="Nomini o'zgartirish"
          disabled={!doc}
          onPress={() => setDialog('rename')}
        />
        <IconButton
          icon={FolderInput}
          label="Ko'chirish"
          accessibilityLabel="Papkaga ko'chirish"
          disabled={!doc}
          onPress={openMove}
        />
        <IconButton icon={Trash2} label="O'chirish" color="danger" disabled={!doc} onPress={confirmDelete} />
        <IconButton icon={Ellipsis} label="Ko'proq" disabled={!ready || !loaded} onPress={() => setDialog('more')} />
      </View>

      <ChoiceDialog<MoreAction>
        visible={dialog === 'more'}
        title="Amallar"
        options={[
          { value: 'edit', label: 'Sahifalarni tahrirlash', icon: FilePen },
          { value: 'sign', label: "Imzo qo'yish", icon: Signature },
          { value: 'image', label: `${currentPage}-sahifani rasm qilib ulashish`, icon: ImageDown },
          { value: 'info', label: 'Hujjat haqida', icon: Info },
        ]}
        onSelect={runMore}
        onClose={() => setDialog(null)}
      />

      <PromptDialog
        visible={dialog === 'rename'}
        title="Nomini o'zgartirish"
        initialValue={doc?.title}
        onSubmit={rename}
        onClose={() => setDialog(null)}
      />
      <ChoiceDialog
        visible={dialog === 'move'}
        title="Papkaga ko'chirish"
        options={[{ value: null, label: 'Papkasiz' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
        selected={doc?.folder_id ?? null}
        onSelect={move}
        onClose={() => setDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Ko'ruvchi ustida, pastki panel tepasida.
  pageBadge: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    opacity: 0.85,
  },
  viewer: {
    flex: 1,
  },
  fill: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
