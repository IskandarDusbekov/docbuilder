import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ellipsis, FileWarning, FolderInput, Pencil, Share2, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { appFile, deleteDocument, shareDocument, sharePageAsImage } from '@/files';
import { Spacing, useColors } from '@/theme';

type MoreAction = 'edit' | 'sign' | 'image';

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

  const reload = useCallback(() => getDocument(db, id).then(setDoc), [db, id]);

  // Tahrirlash ekranidan qaytganda fayl yangilangan bo'lishi mumkin.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const runMore = async (action: MoreAction) => {
    setDialog(null);
    if (!doc) return;
    if (action === 'edit') router.push({ pathname: '/edit/[id]', params: { id: doc.id } });
    else if (action === 'sign') router.push({ pathname: '/sign/[id]', params: { id: doc.id } });
    else {
      try {
        await sharePageAsImage(doc, currentPage - 1);
      } catch (e) {
        Alert.alert("Rasm yaratilmadi", errorText(e));
      }
    }
  };

  const onLoaded = (pages: number) => {
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
    <View style={styles.container}>
      <Stack.Screen options={{ title: doc?.title ?? 'Hujjat' }} />

      <View style={[styles.viewer, { backgroundColor: colors.surface }]}>
        {doc === undefined ? (
          <ActivityIndicator color={colors.text} style={styles.fill} />
        ) : ready && pdf && !failed ? (
          <Pdf
            // Fayl tahrirlanganda manzil o'zgarmaydi, shuning uchun ko'ruvchini qayta yaratamiz.
            key={doc.updated_at}
            source={{ uri: pdf.uri }}
            style={styles.fill}
            onLoadComplete={onLoaded}
            onPageChanged={(page) => setCurrentPage(page)}
            onError={() => setFailed(true)}
          />
        ) : (
          <Placeholder icon={FileWarning} title="Hujjatni ochib bo'lmadi" hint="Fayl o'chirilgan yoki buzilgan" style={styles.fill} />
        )}
      </View>

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
        <IconButton icon={Ellipsis} label="Ko'proq" disabled={!ready} onPress={() => setDialog('more')} />
      </View>

      <ChoiceDialog<MoreAction | null>
        visible={dialog === 'more'}
        title="Amallar"
        options={[
          { value: 'edit', label: 'Sahifalarni tahrirlash' },
          { value: 'sign', label: "Imzo qo'yish" },
          { value: 'image', label: `${currentPage}-sahifani rasm qilib ulashish` },
        ]}
        selected={null}
        onSelect={(a) => a && runMore(a)}
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
