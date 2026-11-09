import * as Haptics from 'expo-haptics';

import { HAPTIC_THROTTLE_MS } from '../core/constants';
import { HAPTIC_PATTERNS } from './hapticPatterns';

/**
 * @typedef {{ play: (name: import('./hapticPatterns').HapticPatternName) => void,
 *   stop: () => void }} HapticsService
 * @typedef {(preset: import('./hapticPatterns').HapticPreset) => unknown} HapticDriver
 */

/** Fires an expo-haptics preset. Errors (e.g. unsupported devices) are swallowed. */
export const expoHapticDriver = (preset) => {
  switch (preset) {
    case 'light':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'medium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'heavy':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    case 'selection':
      return Haptics.selectionAsync();
    default:
      return undefined;
  }
};

/** @type {HapticsService} */
export const noopHapticsService = Object.freeze({ play: () => {}, stop: () => {} });

/**
 * Plays haptic patterns with priority and throttling rules:
 * - a higher-priority sequence cancels a lower one that is still playing;
 * - a lower-priority request while a sequence plays is dropped (e.g. keyTap);
 * - no new sequence within HAPTIC_THROTTLE_MS unless it is higher priority.
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

  let current = null; // { priority, startedAt, endsAt, timers }

  const fire = (preset) => {
    try {
      const result = driver(preset);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      // Haptics are best-effort; unsupported devices fail silently.
    }
  };

  const stop = () => {
    if (current) current.timers.forEach((t) => clearTimer(t));
    current = null;
  };

  const play = (name) => {
    const pattern = HAPTIC_PATTERNS[name];
    if (!pattern) return;
    const t = now();
    if (current) {
      const higher = pattern.priority > current.priority;
      const stillPlaying = t < current.endsAt;
      const throttled = t - current.startedAt < HAPTIC_THROTTLE_MS;
      if (!higher && (stillPlaying || throttled)) return;
      stop();
    }
    const last = pattern.steps[pattern.steps.length - 1].at;
    const timers = [];
    current = { priority: pattern.priority, startedAt: t, endsAt: t + last, timers };
    for (const { preset, at } of pattern.steps) {
      if (at === 0) fire(preset);
      else timers.push(setTimer(() => fire(preset), at));
    }
  };

  return { play, stop };
}
