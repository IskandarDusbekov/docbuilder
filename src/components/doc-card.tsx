import { FileText } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing, useColors } from '@/theme';

type Props = {
  title: string;
  date: string;
  pageCount: number;
  onPress?: () => void;
};

// Kichik rasm 2-bosqichda qo'shiladi; hozircha ikonka.
export function DocCard({ title, date, pageCount, onPress }: Props) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.thumb, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <FileText size={32} color={colors.textSecondary} />
      </View>
      <AppText variant="bodyMedium" numberOfLines={1}>
        {title}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {date} · {pageCount} bet
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: Spacing.xs,
  },
  thumb: {
    aspectRatio: 3 / 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
});
