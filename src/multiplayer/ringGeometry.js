// The countdown ring is two clipped half-discs rotated around the circle's centre.
// `progress` runs 1 → 0 (fraction of the turn left). The filled arc starts at 12 o'clock
// and covers `progress × 360°` clockwise; the right half fills first.

/** Rotation in degrees of the half-disc that fills the right half of the ring. */
export function rightHalfRotation(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return p >= 0.5 ? 180 : p * 360;
}

/** Rotation in degrees of the half-disc that fills the left half of the ring. */
export function leftHalfRotation(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return p <= 0.5 ? 0 : (p - 0.5) * 360;
}

// Same mappings as Animated interpolations (native driver friendly).
export const RIGHT_HALF_INTERPOLATION = {
  inputRange: [0, 0.5, 1],
  outputRange: ['0deg', '180deg', '180deg'],
  extrapolate: 'clamp',
};
export const LEFT_HALF_INTERPOLATION = {
  inputRange: [0, 0.5, 1],
  outputRange: ['0deg', '0deg', '180deg'],
  extrapolate: 'clamp',
};
