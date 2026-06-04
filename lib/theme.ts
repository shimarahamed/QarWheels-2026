import { Platform } from 'react-native';

export type QarThemeMode = 'dark' | 'light';

export const palette = {
  crimson: '#8B0D1A',
  scarlet: '#E31E24',
  red: '#FF3B30',
  redDark: '#B00020',
  redSoft: 'rgba(227, 30, 36, 0.12)',
  redBorder: 'rgba(227, 30, 36, 0.35)',
  gold: '#D4AF37',
  green: '#22C55E',
  amber: '#F59E0B',
  blue: '#3B82F6',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#A8B0BA',
  slate500: '#6F7A86',
  slate700: '#334155',
  slate900: '#0B0F14',
  slate950: '#070A0E',
} as const;

export const darkColors = {
  background: '#070A0E',
  backgroundDark: '#070A0E',
  backgroundElevated: '#0B0F14',
  surface: '#11161D',
  surfaceAlt: '#161B22',
  surfaceElevated: '#1C232D',
  surfaceRaised: '#1C232D',
  surfaceSoft: '#161B22',
  text: '#F5F7FA',
  textSecondary: '#A8B0BA',
  muted: '#6F7A86',
  primary: palette.scarlet,
  primaryDark: palette.redDark,
  primaryLight: palette.redSoft,
  primaryMid: palette.redBorder,
  success: palette.green,
  successBg: 'rgba(34, 197, 94, 0.14)',
  warning: palette.amber,
  warningBg: 'rgba(245, 158, 11, 0.14)',
  danger: palette.red,
  dangerBg: 'rgba(255, 59, 48, 0.14)',
  ai: palette.gold,
  aiBg: 'rgba(212, 175, 55, 0.13)',
  gold: palette.gold,
  dark: '#070A0E',
  white: '#FFFFFF',
  black: '#000000',
  border: 'rgba(255,255,255,0.09)',
  borderLight: 'rgba(255,255,255,0.06)',
  borderFocus: palette.redBorder,
} as const;

export const lightColors = {
  background: '#F7F3F1',
  backgroundDark: '#070A0E',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1E8E6',
  surfaceElevated: '#FFFDFC',
  surfaceRaised: '#F8EFED',
  surfaceSoft: '#F1E8E6',
  text: '#141014',
  textSecondary: '#4B3D40',
  muted: '#786C70',
  primary: palette.scarlet,
  primaryDark: palette.redDark,
  primaryLight: 'rgba(227, 30, 36, 0.10)',
  primaryMid: 'rgba(227, 30, 36, 0.24)',
  success: '#15803D',
  successBg: '#DCFCE7',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  danger: palette.redDark,
  dangerBg: '#FEE2E2',
  ai: '#A16207',
  aiBg: '#FEF3C7',
  gold: '#A16207',
  dark: '#11161D',
  white: '#FFFFFF',
  black: '#000000',
  border: 'rgba(20,16,20,0.10)',
  borderLight: 'rgba(20,16,20,0.06)',
  borderFocus: palette.redBorder,
} as const;

export type QarColors = Record<keyof typeof darkColors, string>;

export const colors: QarColors = darkColors;

export function getQarColors(mode: QarThemeMode): QarColors {
  return mode === 'light' ? lightColors : darkColors;
}

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

export const spacing = {
  page: 20,
  cardPad: 20,
  section: 26,
  gap: 14,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

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
  caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  label: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.8, lineHeight: 14 },
  overline: { fontSize: 10, fontWeight: '900' as const, letterSpacing: 1.2, lineHeight: 13, textTransform: 'uppercase' as const },
} as const;

export const categoryColors: Record<string, { bg: string; icon: string; text: string }> = {
  repair: { bg: darkColors.primaryLight, icon: palette.scarlet, text: darkColors.text },
  parts: { bg: 'rgba(59,130,246,0.14)', icon: palette.blue, text: darkColors.text },
  wash: { bg: 'rgba(59,130,246,0.14)', icon: '#38BDF8', text: darkColors.text },
  battery: { bg: darkColors.warningBg, icon: palette.amber, text: darkColors.text },
  inspection: { bg: darkColors.successBg, icon: palette.green, text: darkColors.text },
  diagnostics: { bg: darkColors.aiBg, icon: palette.gold, text: darkColors.text },
  default: { bg: darkColors.surfaceSoft, icon: palette.scarlet, text: darkColors.text },
};

export function getThemedCategoryColors(mode: QarThemeMode): typeof categoryColors {
  if (mode === 'light') {
    return {
      repair:      { bg: 'rgba(227,30,36,0.10)',   icon: palette.scarlet, text: lightColors.text },
      parts:       { bg: 'rgba(59,130,246,0.12)',   icon: palette.blue,   text: lightColors.text },
      wash:        { bg: 'rgba(14,165,233,0.12)',   icon: '#0EA5E9',      text: lightColors.text },
      battery:     { bg: 'rgba(245,158,11,0.12)',   icon: palette.amber,  text: lightColors.text },
      inspection:  { bg: 'rgba(34,197,94,0.12)',    icon: palette.green,  text: lightColors.text },
      diagnostics: { bg: 'rgba(212,175,55,0.12)',   icon: palette.gold,   text: lightColors.text },
      default:     { bg: 'rgba(0,0,0,0.06)',         icon: palette.scarlet, text: lightColors.text },
    };
  }
  return categoryColors;
}

export const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Confirmed: { bg: darkColors.successBg, text: darkColors.success, dot: darkColors.success },
  Pending: { bg: darkColors.warningBg, text: darkColors.warning, dot: darkColors.warning },
  VehicleReceived: { bg: 'rgba(59,130,246,0.14)', text: '#3B82F6', dot: '#3B82F6' },
  InProgress: { bg: 'rgba(227,30,36,0.14)', text: darkColors.primary, dot: darkColors.primary },
  ReadyForPickup: { bg: darkColors.aiBg, text: darkColors.gold, dot: darkColors.gold },
  Completed: { bg: darkColors.aiBg, text: darkColors.gold, dot: darkColors.gold },
  Approved: { bg: darkColors.successBg, text: darkColors.success, dot: darkColors.success },
  Cancelled: { bg: 'rgba(239,68,68,0.14)', text: '#EF4444', dot: '#EF4444' },
} as const;

export function getThemedStatusColors(mode: QarThemeMode): typeof statusColors {
  if (mode === 'light') {
    return {
      Confirmed: { bg: '#DCFCE7', text: '#15803D', dot: '#15803D' },
      Pending:   { bg: '#FEF3C7', text: '#B45309', dot: '#B45309' },
      VehicleReceived: { bg: '#DBEAFE', text: '#1D4ED8', dot: '#1D4ED8' },
      InProgress: { bg: '#FEE2E2', text: '#B91C1C', dot: '#B91C1C' },
      ReadyForPickup: { bg: '#FEF3C7', text: '#A16207', dot: '#A16207' },
      Completed: { bg: '#FEF3C7', text: '#A16207', dot: '#A16207' },
      Approved:  { bg: '#DCFCE7', text: '#15803D', dot: '#15803D' },
      Cancelled: { bg: '#FEE2E2', text: '#B91C1C', dot: '#B91C1C' },
    };
  }
  return statusColors;
}
