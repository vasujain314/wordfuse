import { Platform } from 'react-native';

export const colors = Object.freeze({
  background: '#0B1026',
  surface: '#141B3A',
  surfaceRaised: '#1D2550',
  border: '#2A3366',
  text: '#E8ECFF',
  textMuted: '#8C95C7',
  cyan: '#22E4FF',
  amber: '#FFB020',
  red: '#FF3B5C',
  magenta: '#FF3EC8',
  green: '#3DFF8A',
  white: '#FFFFFF',
  fireCore: '#FFE27A',
  fireOuter: '#FF6A1A',
  overlay: 'rgba(5, 8, 20, 0.85)',
});

export const timerColors = Object.freeze({
  calm: colors.cyan,
  warning: colors.amber,
  critical: colors.red,
});

export const fonts = Object.freeze({
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
});

export const spacing = Object.freeze({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32 });

export const MIN_TOUCH = 48;
