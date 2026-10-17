import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, useColors, type ColorName } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: 'title' | 'heading' | 'body' | 'bodyMedium' | 'small' | 'caption';
  color?: ColorName;
};

export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const colors = useColors();
  return <Text style={[styles[variant], { color: colors[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
});
