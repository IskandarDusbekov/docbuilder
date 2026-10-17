import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FileWarning, FolderInput, Pencil, Share2, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import { getDocument, setPageCount, type Document } from '@/db';
import { appFile } from '@/files';
import { Spacing, useColors } from '@/theme';

const soon = () => Alert.alert('Tez orada', "Bu amal 5-bosqichda qo'shiladi.");

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // undefined: yuklanmoqda, null: topilmadi.
  const [doc, setDoc] = useState<Document | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getDocument(db, id).then(setDoc);
  }, [db, id]);

  const onLoaded = (pages: number) => {
    // Import paytidagi taxminiy son noto'g'ri bo'lsa, ko'ruvchi bergan aniq son bilan almashtiramiz.
    if (doc && pages > 0 && pages !== doc.page_count) setPageCount(db, doc.id, pages);
  };

  const pdf = doc ? appFile(doc.file_path) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: doc?.title ?? 'Hujjat' }} />

      <View style={[styles.viewer, { backgroundColor: colors.surface }]}>
        {doc === undefined ? (
          <ActivityIndicator color={colors.text} style={styles.fill} />
        ) : !pdf || !pdf.exists || failed ? (
          <Placeholder icon={FileWarning} title="Hujjatni ochib bo'lmadi" hint="Fayl o'chirilgan yoki buzilgan" style={styles.fill} />
        ) : (
          <Pdf
            source={{ uri: pdf.uri }}
            style={styles.fill}
            onLoadComplete={onLoaded}
            onError={() => setFailed(true)}
          />
        )}
      </View>

      <View style={[styles.bar, { borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.sm }]}>
        <IconButton icon={Share2} label="Ulashish" onPress={soon} />
        <IconButton icon={Pencil} label="Nomi" accessibilityLabel="Nomini o'zgartirish" onPress={soon} />
        <IconButton icon={FolderInput} label="Ko'chirish" accessibilityLabel="Papkaga ko'chirish" onPress={soon} />
        <IconButton icon={Trash2} label="O'chirish" color="danger" onPress={soon} />
      </View>
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
