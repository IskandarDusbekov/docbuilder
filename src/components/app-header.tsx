import type { NativeStackHeaderProps } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/icon-button';
import { Spacing, useColors } from '@/theme';

// Tizim header'i o'rniga: native header rejim almashganda ochiq ekranlarda rangini yangilamay qolardi
// (qorong'i rejimda oq fon va oq ikonkalar). Oddiy komponent esa har renderda joriy ranglarni oladi.
export function AppHeader({ navigation, options, route, back }: NativeStackHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const title = typeof options.title === 'string' ? options.title : route.name;

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.row}>
        {back && <IconButton icon={ChevronLeft} accessibilityLabel="Orqaga" onPress={() => navigation.goBack()} />}
        <AppText variant="heading" numberOfLines={1} style={[styles.title, !back && styles.titleStart]}>
          {title}
        </AppText>
        {options.headerRight?.({ tintColor: colors.text, canGoBack: !!back })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 56,
  },
  title: {
    flex: 1,
  },
  titleStart: {
    paddingLeft: Spacing.sm,
  },
});
