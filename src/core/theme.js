// Typewriter-on-paper theme: one ink colour, one danger colour, one typeface.

export const colors = Object.freeze({
  paper: '#F4F1EA',
  key: '#E8E3D7',
  success: '#2F7D32',
  ink: '#1D1C1A',
  inkSoft: '#57534B',
  faded: '#9A958A',
  rule: '#D6D0C2',
  danger: '#B3261E',
  overlay: 'rgba(244, 241, 234, 0.96)',
});

export const fonts = Object.freeze({
  regular: 'CourierPrime_400Regular',
  bold: 'CourierPrime_700Bold',
});

export const spacing = Object.freeze({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32 });

export const MIN_TOUCH = 48;

/**
 * Covers the parent completely. Used instead of StyleSheet.absoluteFill: on Android
 * (RN 0.88) views stretched with right/bottom insets collapsed in some layouts (the
 * ring track, overlays), while an explicit 100% size lays out the same everywhere.
 * The parent must not have padding (100% is the content box).
 */
export const fill = Object.freeze({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
});
