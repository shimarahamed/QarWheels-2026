import { Platform } from 'react-native';

// Colour/scale tokens come from the shared source in packages/tokens (see
// scripts/build-tokens.mjs). This file keeps the React-Native-specific
// pieces — Platform.select shadows, typography, and the themed accessor
// helpers — and re-exports the generated values so every screen's existing
// `import { colors, radius, spacing } from '@/lib/theme'` keeps working.
import {
  palette,
  darkColors,
  lightColors,
  radius,
  spacing,
  statusColorsDark,
  statusColorsLight,
  categoryColorsDark,
  categoryColorsLight,
} from './theme.generated';

export { palette, darkColors, lightColors, radius, spacing };

export type QarThemeMode = 'dark' | 'light';

export type QarColors = Record<keyof typeof darkColors, string>;

export const colors: QarColors = darkColors;

/**
 * Apply an alpha to a hex colour, returning `rgba(...)`.
 * Useful for tinting a surface with the brand colour without hardcoding a
 * second constant that drifts out of step with the palette.
 */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return hex;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getQarColors(mode: QarThemeMode): QarColors {
  return mode === 'light' ? lightColors : darkColors;
}

export const shadow = {
  none: {} as const,
  xs: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 6 },
    android: { elevation: 2 },
    default: {},
  })!,
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 14 },
    android: { elevation: 5 },
    default: {},
  })!,
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 18 },
    android: { elevation: 8 },
    default: {},
  })!,
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 28 },
    android: { elevation: 12 },
    default: {},
  })!,
  xl: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.36, shadowRadius: 40 },
    android: { elevation: 18 },
    default: {},
  })!,
  primary: Platform.select({
    ios: { shadowColor: palette.scarlet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 18 },
    android: { elevation: 10 },
    default: {},
  })!,
  tab: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.32, shadowRadius: 36 },
    android: { elevation: 18 },
    default: {},
  })!,
} as const;

export const typography = {
  display: { fontSize: 36, fontWeight: '900' as const, letterSpacing: -0.8, lineHeight: 42 },
  h1: { fontSize: 30, fontWeight: '900' as const, letterSpacing: -0.4, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3, lineHeight: 30 },
  h3: { fontSize: 19, fontWeight: '800' as const, letterSpacing: 0, lineHeight: 25 },
  h4: { fontSize: 16, fontWeight: '800' as const, letterSpacing: 0, lineHeight: 22 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  // 12px is the floor for anything a user has to read. Below that, text is
  // unreliable in bright daylight and for anyone with mild long-sightedness —
  // which in a car-service app is a large share of the audience. Uppercase
  // label/overline styles keep their letter-spacing to stay distinct at the
  // same size.
  caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '800' as const, letterSpacing: 0.8, lineHeight: 15 },
  overline: { fontSize: 12, fontWeight: '900' as const, letterSpacing: 1.2, lineHeight: 15, textTransform: 'uppercase' as const },
} as const;

// Category/status palettes come from the shared tokens; the `text` field
// (the label colour used on top of the chip) stays theme-derived here since
// it's the same foreground colour the rest of the screen uses.
function withTextColor(
  source: Record<string, { bg: string; icon: string }>,
  text: string,
): Record<string, { bg: string; icon: string; text: string }> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, { ...value, text }]),
  );
}

export const categoryColors = withTextColor(categoryColorsDark, darkColors.text);

export function getThemedCategoryColors(mode: QarThemeMode): typeof categoryColors {
  return mode === 'light'
    ? withTextColor(categoryColorsLight, lightColors.text)
    : categoryColors;
}

export const statusColors: Record<string, { bg: string; text: string; dot: string }> = statusColorsDark;

export function getThemedStatusColors(mode: QarThemeMode): typeof statusColors {
  return mode === 'light' ? statusColorsLight : statusColorsDark;
}
