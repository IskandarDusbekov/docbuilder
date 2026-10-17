import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing, useColors } from '@/theme';

type Props = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

// Keyingi bosqichlarda to'ldiriladigan joy yoki bo'sh holat.
export function Placeholder({ icon: Icon, title, hint, style }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.box, { backgroundColor: colors.surface }, style]}>
      <Icon size={40} color={colors.textSecondary} />
      <AppText variant="bodyMedium" style={styles.center}>
        {title}
      </AppText>
      {hint && (
        <AppText variant="small" color="textSecondary" style={styles.center}>
          {hint}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
  },
  center: {
    textAlign: 'center',
  },
});
