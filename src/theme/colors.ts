// Oq, qora va kulrang; ko'k faqat asosiy tugma uchun.
export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F4F5',
    surfacePressed: '#E4E4E7',
    border: '#E4E4E7',
    text: '#09090B',
    textSecondary: '#71717A',
    primary: '#1D4ED8',
    primaryPressed: '#1E40AF',
    onPrimary: '#FFFFFF',
    danger: '#DC2626',
  },
  dark: {
    background: '#09090B',
    surface: '#18181B',
    surfacePressed: '#27272A',
    border: '#27272A',
    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    primary: '#1D4ED8',
    primaryPressed: '#1E40AF',
    onPrimary: '#FFFFFF',
    danger: '#F87171',
  },
} as const;

export type ColorName = keyof typeof Colors.light;
export type Palette = Record<ColorName, string>;
