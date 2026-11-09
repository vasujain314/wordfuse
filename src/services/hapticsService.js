import * as Haptics from 'expo-haptics';

import { HAPTIC_THROTTLE_MS } from '../core/constants';
import { HAPTIC_PATTERNS } from './hapticPatterns';

/**
 * @typedef {{ play: (name: import('./hapticPatterns').HapticPatternName) => void,
 *   stop: () => void }} HapticsService
 * @typedef {(preset: import('./hapticPatterns').HapticPreset) => unknown} HapticDriver
 */

/** Fires an expo-haptics preset. Only the error buzz is used by the game. */
export const expoHapticDriver = (preset) =>
  preset === 'error'
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    : undefined;

/** @type {HapticsService} */
export const noopHapticsService = Object.freeze({ play: () => {}, stop: () => {} });

/**
 * Plays haptic patterns, at most one every HAPTIC_THROTTLE_MS. Failures (e.g. devices
 * without a vibration motor) are swallowed.
 * @param {{ enabled: boolean, driver?: HapticDriver, now?: () => number,
 *   setTimer?: (fn: () => void, ms: number) => unknown,
 *   clearTimer?: (handle: unknown) => void }} options
 * @returns {HapticsService}
 */
export function createHapticsService({
  enabled,
  driver = expoHapticDriver,
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (handle) => clearTimeout(handle),
}) {
  if (!enabled) return noopHapticsService;

  let lastStartedAt = -Infinity;
  let timers = [];

  const fire = (preset) => {
    try {
      const result = driver(preset);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      // Haptics are best-effort.
    }
  };

  const stop = () => {
    timers.forEach((t) => clearTimer(t));
    timers = [];
  };

  const play = (name) => {
    const pattern = HAPTIC_PATTERNS[name];
    if (!pattern) return;
    const t = now();
    if (t - lastStartedAt < HAPTIC_THROTTLE_MS) return;
    stop();
    lastStartedAt = t;
    for (const { preset, at } of pattern.steps) {
      if (at === 0) fire(preset);
      else timers.push(setTimer(() => fire(preset), at));
    }
  };

  return { play, stop };
}
