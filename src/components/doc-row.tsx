import { Image } from 'expo-image';
import { FileText } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing, useColors } from '@/theme';

type Props = {
  title: string;
  subtitle: string;
  thumbUri?: string | null;
  onPress?: () => void;
  onLongPress?: () => void;
};

// Ro'yxat ko'rinishidagi ixcham qator: bir ekranga to'rdagidan ancha ko'p hujjat sig'adi.
export function DocRow({ title, subtitle, thumbUri, onPress, onLongPress }: Props) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfacePressed : colors.surface }]}>
      <View style={[styles.thumb, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
        ) : (
          <FileText size={20} color={colors.textSecondary} />
        )}
      </View>
      <View style={styles.text}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  thumb: {
    width: 44,
    height: 58,
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
