import { PermissionsAndroid, Platform } from 'react-native';

import { askForNotificationsOnce } from '../src/services/notificationPermission';

function memoryStorage() {
  const data = {};
  return {
    data,
    getItem: async (k) => data[k] ?? null,
    setItem: async (k, v) => {
      data[k] = v;
    },
  };
}

describe('askForNotificationsOnce', () => {
  const original = { OS: Platform.OS, Version: Platform.Version };
  beforeEach(() => {
    Platform.OS = 'android';
    Object.defineProperty(Platform, 'Version', { value: 34, configurable: true });
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  });
  afterEach(() => {
    Platform.OS = original.OS;
    Object.defineProperty(Platform, 'Version', { value: original.Version, configurable: true });
    jest.restoreAllMocks();
  });

  it('asks once on Android 13+ and reports a grant', async () => {
    const storage = memoryStorage();
    await expect(askForNotificationsOnce({ storage })).resolves.toBe(true);
    await expect(askForNotificationsOnce({ storage })).resolves.toBe(false);
    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
  });

  it('never asks again after a refusal', async () => {
    PermissionsAndroid.request.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    const storage = memoryStorage();
    await expect(askForNotificationsOnce({ storage })).resolves.toBe(false);
    await askForNotificationsOnce({ storage });
    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
  });

  it('does not ask when already allowed, or on older Android, iOS and web', async () => {
    PermissionsAndroid.check.mockResolvedValue(true);
    await askForNotificationsOnce({ storage: memoryStorage() });
    PermissionsAndroid.check.mockResolvedValue(false);
    Object.defineProperty(Platform, 'Version', { value: 32, configurable: true });
    await askForNotificationsOnce({ storage: memoryStorage() });
    Platform.OS = 'ios';
    await askForNotificationsOnce({ storage: memoryStorage() });
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  });
});
