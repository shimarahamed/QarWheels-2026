/**
 * QarWheel design tokens — the single source of truth for both apps.
 *
 * Plain data, no framework imports: the web app consumes these as generated
 * CSS custom properties (src/app/tokens.generated.css) and the mobile app as
 * a generated TS module (mobile/lib/theme.generated.ts). Mobile has no
 * Tailwind/NativeWind, so a Tailwind-config-based sharing scheme can't reach
 * it — and the two apps are separate git repos with separate package.jsons,
 * so a workspace dependency isn't available either. Generated + committed
 * files are the mechanism instead; run `npm run tokens:build` after editing
 * this file.
 *
 * Values were lifted from mobile/lib/theme.ts, which was the more complete
 * of the two token sets. The web app's previous light-first #C70A0A palette
 * is superseded by mobile's dark-first scarlet/gold identity.
 */

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

export const motion = {
  fast: 160,
  base: 260,
  slow: 520,
  easeSmooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/** Booking status chips — keys match BookingStatus in src/lib/types.ts. */
export const statusColorsDark = {
  Pending: { bg: 'rgba(245, 158, 11, 0.14)', text: palette.amber, dot: palette.amber },
  Confirmed: { bg: 'rgba(34, 197, 94, 0.14)', text: palette.green, dot: palette.green },
  VehicleReceived: { bg: 'rgba(59,130,246,0.14)', text: '#3B82F6', dot: '#3B82F6' },
  InProgress: { bg: 'rgba(227,30,36,0.14)', text: palette.scarlet, dot: palette.scarlet },
  ReadyForPickup: { bg: 'rgba(212, 175, 55, 0.13)', text: palette.gold, dot: palette.gold },
  Completed: { bg: 'rgba(34, 197, 94, 0.14)', text: palette.green, dot: palette.green },
  Declined: { bg: 'rgba(239,68,68,0.14)', text: '#EF4444', dot: '#EF4444' },
  Cancelled: { bg: 'rgba(239,68,68,0.14)', text: '#EF4444', dot: '#EF4444' },
  NoShow: { bg: 'rgba(148,163,184,0.16)', text: '#94A3B8', dot: '#94A3B8' },
} as const;

export const statusColorsLight = {
  Pending: { bg: '#FEF3C7', text: '#B45309', dot: '#B45309' },
  Confirmed: { bg: '#DCFCE7', text: '#15803D', dot: '#15803D' },
  VehicleReceived: { bg: '#DBEAFE', text: '#1D4ED8', dot: '#1D4ED8' },
  InProgress: { bg: '#FEE2E2', text: '#B91C1C', dot: '#B91C1C' },
  ReadyForPickup: { bg: '#FEF3C7', text: '#A16207', dot: '#A16207' },
  Completed: { bg: '#DCFCE7', text: '#15803D', dot: '#15803D' },
  Declined: { bg: '#FEE2E2', text: '#B91C1C', dot: '#B91C1C' },
  Cancelled: { bg: '#FEE2E2', text: '#B91C1C', dot: '#B91C1C' },
  NoShow: { bg: '#F1F5F9', text: '#475569', dot: '#475569' },
} as const;

export const categoryColorsDark = {
  repair: { bg: darkColors.primaryLight, icon: palette.scarlet },
  parts: { bg: 'rgba(59,130,246,0.14)', icon: palette.blue },
  wash: { bg: 'rgba(59,130,246,0.14)', icon: '#38BDF8' },
  battery: { bg: darkColors.warningBg, icon: palette.amber },
  inspection: { bg: darkColors.successBg, icon: palette.green },
  diagnostics: { bg: darkColors.aiBg, icon: palette.gold },
  default: { bg: darkColors.surfaceSoft, icon: palette.scarlet },
} as const;

export const categoryColorsLight = {
  repair: { bg: 'rgba(227,30,36,0.10)', icon: palette.scarlet },
  parts: { bg: 'rgba(59,130,246,0.12)', icon: palette.blue },
  wash: { bg: 'rgba(14,165,233,0.12)', icon: '#0EA5E9' },
  battery: { bg: 'rgba(245,158,11,0.12)', icon: palette.amber },
  inspection: { bg: 'rgba(34,197,94,0.12)', icon: palette.green },
  diagnostics: { bg: 'rgba(212,175,55,0.12)', icon: palette.gold },
  default: { bg: 'rgba(0,0,0,0.06)', icon: palette.scarlet },
} as const;
