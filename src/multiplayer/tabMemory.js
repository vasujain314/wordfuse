import { Platform } from 'react-native';

// Web only: remembers which room this browser tab is in (random player id, code, name) so a
// page reload rejoins as the same player. sessionStorage belongs to the tab and is cleared
// when the tab closes; leaving the room clears it too. Native apps don't reload, so this
// is a no-op there.

const KEY = 'wordfuse:room';

function storage() {
  if (Platform.OS !== 'web') return null;
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** @param {{ code: string, pid: string, name: string }} entry */
export function rememberRoom(entry) {
  try {
    storage()?.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Storage blocked (private mode etc.): reloading just goes through the join screen.
  }
}

/** The remembered entry for `code`, or null. */
export function recallRoom(code) {
  try {
    const raw = storage()?.getItem(KEY);
    const entry = raw ? JSON.parse(raw) : null;
    if (entry && entry.code === code && typeof entry.pid === 'string' && entry.name) return entry;
  } catch {
    // Ignore unreadable data.
  }
  return null;
}

export function forgetRoom() {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
