import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing, useColors } from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
}: Props) {
  const colors = useColors();
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        {
          backgroundColor: isPrimary
            ? pressed
              ? colors.primaryPressed
              : colors.primary
            : pressed
              ? colors.surfacePressed
              : colors.surface,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      {Icon && <Icon size={size === 'lg' ? 22 : 18} color={fg} />}
      <AppText variant="bodyMedium" style={{ color: fg }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
  },
  lg: {
    height: 56,
    borderRadius: Radius.lg,
  },
});
