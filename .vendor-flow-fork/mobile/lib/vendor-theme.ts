import { useQarWheelStore } from './store';
import { getQarColors, type QarColors, type QarThemeMode } from './theme';

export function getVendorColors(mode: QarThemeMode): QarColors & { primaryText: string } {
  const base = getQarColors(mode);
  return mode === 'dark' ? {
    ...base, background: '#101418', backgroundElevated: '#191C20', surface: '#191C20',
    surfaceAlt: '#1D2024', surfaceSoft: '#1D2024', surfaceElevated: '#272A2F',
    surfaceRaised: '#272A2F', text: '#E0E2E8', textSecondary: '#BFC3CA', muted: '#A6ABB4',
    border: '#383B43', borderLight: '#2B2E34', gold: '#E9C349', ai: '#E9C349',
    primaryText: '#FFB4AB',
  } : {
    ...base, background: '#F4F5F7', surface: '#FFFFFF', backgroundElevated: '#FFFFFF',
    surfaceAlt: '#ECEEF1', surfaceSoft: '#ECEEF1', surfaceRaised: '#ECEEF1',
    surfaceElevated: '#FFFFFF', text: '#171717', textSecondary: '#535964', muted: '#626976',
    border: '#DCE0E5', borderLight: '#E6E9EE', gold: '#806100', ai: '#806100',
    primaryText: '#BF171D',
  };
}

export function useVendorColors() {
  return getVendorColors(useQarWheelStore((state) => state.themeMode));
}
