/**
 * Haptic sequences: each step is a preset fired `at` ms after the sequence starts.
 * Higher priority wins: it cancels a lower one that is still playing.
 * @typedef {'light' | 'medium' | 'heavy' | 'error' | 'selection'} HapticPreset
 * @typedef {{ priority: number, steps: { preset: HapticPreset, at: number }[] }} HapticPattern
 */

const step = (preset, at) => ({ preset, at });

/** @type {Record<string, HapticPattern>} */
export const HAPTIC_PATTERNS = Object.freeze({
  gameOver: {
    priority: 9,
    steps: [step('heavy', 0), step('heavy', 100), step('medium', 200), step('light', 300)],
  },
  lifeLost: { priority: 8, steps: [step('heavy', 0), step('medium', 90), step('light', 180)] },
  streakMilestone: {
    priority: 7,
    steps: [
      step('light', 0),
      step('light', 80),
      step('medium', 160),
      step('medium', 240),
      step('heavy', 320),
    ],
  },
  invalidWord: { priority: 6, steps: [step('error', 0)] },
  validWord: { priority: 5, steps: [step('medium', 0), step('heavy', 80)] },
  heartbeat: { priority: 4, steps: [step('medium', 0), step('light', 120)] },
  timerTick: { priority: 3, steps: [step('light', 0)] },
  timerTickStrong: { priority: 3, steps: [step('medium', 0)] },
  submit: { priority: 2, steps: [step('light', 0)] },
  keyTap: { priority: 1, steps: [step('selection', 0)] },
});

/** @typedef {keyof typeof HAPTIC_PATTERNS} HapticPatternName */
