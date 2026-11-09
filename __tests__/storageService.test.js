import AsyncStorage from '@react-native-async-storage/async-storage';

import { createStorageService, DEFAULT_SETTINGS } from '../src/services/storageService';

describe('storageService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns default settings when nothing is stored', async () => {
    expect(await createStorageService().loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and loads settings, clamping bad values', async () => {
    const storage = createStorageService();
    await storage.saveSettings({
      lives: 9,
      secondsPerWord: 20,
      hapticsEnabled: false,
      reduceMotion: 'on',
    });
    expect(await storage.loadSettings()).toEqual({
      lives: 5,
      secondsPerWord: 20,
      hapticsEnabled: false,
      reduceMotion: 'on',
    });
  });

  it('falls back to defaults for corrupt data', async () => {
    await AsyncStorage.setItem('wordfuse:settings', '{not json');
    expect(await createStorageService().loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('records the best score per config key', async () => {
    const storage = createStorageService();
    expect(await storage.getBest('L2_T10')).toEqual({ bestScore: 0 });
    expect(await storage.recordRun('L2_T10', 7)).toEqual({ bestScore: 7, isNewBest: true });
    expect(await storage.recordRun('L2_T10', 5)).toEqual({ bestScore: 7, isNewBest: false });
    expect(await storage.getBest('L3_T10')).toEqual({ bestScore: 0 });
  });

  it('reads older records that also stored a best streak', async () => {
    await AsyncStorage.setItem(
      'wordfuse:best:L2_T10',
      JSON.stringify({ bestScore: 4, bestStreak: 3 }),
    );
    expect(await createStorageService().getBest('L2_T10')).toEqual({ bestScore: 4 });
  });
});
