import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';

const ASKED_KEY = 'wordfuse:notificationsAsked';

/**
 * Android 13+: asks once for permission to show notifications (used for the "you're in a game
 * room · tap to return" notification while a room is open). Never asks again after the first
 * time, whatever the answer; the player can still turn it on in Settings.
 * @param {{ storage?: { getItem: Function, setItem: Function } }} [deps]
 * @returns {Promise<boolean>} true only when permission was granted just now
 */
export async function askForNotificationsOnce({ storage = AsyncStorage } = {}) {
  if (Platform.OS !== 'android' || Platform.Version < 33) return false;
  try {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(permission)) return false; // already allowed
    if (await storage.getItem(ASKED_KEY)) return false;
    await storage.setItem(ASKED_KEY, '1');
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
