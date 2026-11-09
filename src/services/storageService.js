import AsyncStorage from '@react-native-async-storage/async-storage';

import { LIVES_DEFAULT, SECONDS_DEFAULT } from '../core/constants';
import { createConfig } from '../game/gameConfig';

const SETTINGS_KEY = 'wordfuse:settings';
const BEST_PREFIX = 'wordfuse:best:';

/**
 * @typedef {'system' | 'on' | 'off'} ReduceMotionSetting
 * @typedef {{ lives: number, secondsPerWord: number, hapticsEnabled: boolean,
 *   reduceMotion: ReduceMotionSetting }} Settings
 * @typedef {{ bestScore: number, bestStreak: number }} BestRecord
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = Object.freeze({
  lives: LIVES_DEFAULT,
  secondsPerWord: SECONDS_DEFAULT,
  hapticsEnabled: true,
  reduceMotion: 'system',
});

const REDUCE_MOTION_VALUES = ['system', 'on', 'off'];

/** @returns {Settings} */
export function sanitizeSettings(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const config = createConfig(value);
  return {
    lives: config.lives,
    secondsPerWord: config.secondsPerWord,
    hapticsEnabled:
      typeof value.hapticsEnabled === 'boolean'
        ? value.hapticsEnabled
        : DEFAULT_SETTINGS.hapticsEnabled,
    reduceMotion: REDUCE_MOTION_VALUES.includes(value.reduceMotion)
      ? value.reduceMotion
      : DEFAULT_SETTINGS.reduceMotion,
  };
}

async function readJson(storage, key) {
  try {
    const text = await storage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * Persists settings and best scores per config key.
 * @param {{ getItem: (k: string) => Promise<string | null>,
 *   setItem: (k: string, v: string) => Promise<void> }} [storage]
 */
export function createStorageService(storage = AsyncStorage) {
  return {
    /** @returns {Promise<Settings>} */
    async loadSettings() {
      return sanitizeSettings(await readJson(storage, SETTINGS_KEY));
    },

    /** @param {Settings} settings */
    async saveSettings(settings) {
      const clean = sanitizeSettings(settings);
      await storage.setItem(SETTINGS_KEY, JSON.stringify(clean));
      return clean;
    },

    /** @returns {Promise<BestRecord>} */
    async getBest(key) {
      const raw = await readJson(storage, BEST_PREFIX + key);
      return {
        bestScore: Number.isFinite(raw?.bestScore) ? raw.bestScore : 0,
        bestStreak: Number.isFinite(raw?.bestStreak) ? raw.bestStreak : 0,
      };
    },

    /**
     * Records a finished run and returns the updated best plus whether the score is a new best.
     * @returns {Promise<BestRecord & { isNewBest: boolean }>}
     */
    async recordRun(key, score, bestStreak) {
      const previous = await this.getBest(key);
      const next = {
        bestScore: Math.max(previous.bestScore, score),
        bestStreak: Math.max(previous.bestStreak, bestStreak),
      };
      await storage.setItem(BEST_PREFIX + key, JSON.stringify(next));
      return { ...next, isNewBest: score > previous.bestScore };
    },
  };
}
