import {
  LIVES_DEFAULT,
  LIVES_MAX,
  LIVES_MIN,
  SECONDS_DEFAULT,
  SECONDS_MAX,
  SECONDS_MIN,
} from '../core/constants';

/**
 * @typedef {{ lives: number, secondsPerWord: number }} GameConfig
 */

function clampInt(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Builds a config with every value clamped to its allowed range.
 * @param {Partial<GameConfig>} [partial]
 * @returns {GameConfig}
 */
export function createConfig(partial = {}) {
  return Object.freeze({
    lives: clampInt(partial.lives, LIVES_MIN, LIVES_MAX, LIVES_DEFAULT),
    secondsPerWord: clampInt(partial.secondsPerWord, SECONDS_MIN, SECONDS_MAX, SECONDS_DEFAULT),
  });
}

/**
 * Storage key for best scores, e.g. "L2_T10".
 * @param {GameConfig} config
 */
export function configKey(config) {
  return `L${config.lives}_T${config.secondsPerWord}`;
}
