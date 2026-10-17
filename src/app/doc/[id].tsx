import { Stack, useLocalSearchParams } from 'expo-router';
import { FileText, FolderInput, Pencil, Share2, Trash2 } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { Placeholder } from '@/components/placeholder';
import { Spacing, useColors } from '@/theme';

const soon = () => Alert.alert('Tez orada', "Bu amal 5-bosqichda qo'shiladi.");

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: id === 'namuna' ? 'Namuna hujjat' : 'Hujjat' }} />

      <View style={styles.viewer}>
        <Placeholder icon={FileText} title="PDF shu yerda ko'rinadi" hint="PDF ko'ruvchi 4-bosqichda ulanadi" style={styles.fill} />
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
    padding: Spacing.lg,
  },
  fill: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
