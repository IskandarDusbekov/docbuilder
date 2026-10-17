import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing, useColors, type ColorName } from '@/theme';

type Props = {
  icon: LucideIcon;
  onPress?: () => void;
  // label berilsa, ikonka ostida yozuv chiqadi (pastki panel uchun).
  label?: string;
  accessibilityLabel?: string;
  color?: ColorName;
  disabled?: boolean;
};

export function IconButton({ icon: Icon, onPress, label, accessibilityLabel, color = 'text', disabled }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        label ? styles.labeled : styles.square,
        { backgroundColor: pressed ? colors.surfacePressed : 'transparent', opacity: disabled ? 0.4 : 1 },
      ]}>
      <Icon size={22} color={colors[color]} />
      {label && (
        <AppText variant="caption" color={color}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  square: {
    width: 40,
    height: 40,
  },
  labeled: {
    flex: 1,
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
});
