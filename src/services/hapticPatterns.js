/**
 * Haptic sequences: each step is a preset fired `at` ms after the sequence starts.
 * The game only buzzes when a submitted word is rejected.
 * @typedef {'error'} HapticPreset
 * @typedef {{ steps: { preset: HapticPreset, at: number }[] }} HapticPattern
 */

/** @type {Record<string, HapticPattern>} */
export const HAPTIC_PATTERNS = Object.freeze({
  invalidWord: { steps: [{ preset: 'error', at: 0 }] },
});

/** @typedef {keyof typeof HAPTIC_PATTERNS} HapticPatternName */
