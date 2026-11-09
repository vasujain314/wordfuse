import { Platform } from 'react-native';

import { connectLocal, isLocalAvailable } from './localTransport';
import { connectSupabase, isSupabaseConfigured } from './supabaseTransport';

const useLocal =
  process.env.EXPO_PUBLIC_MP_TRANSPORT === 'local' && Platform.OS === 'web' && isLocalAvailable();

/**
 * The connect function for rooms, or null when online play isn't configured (then the
 * "play with friends" button is hidden).
 * @returns {import('../roomSession').Connect | null}
 */
export function getConnect() {
  if (useLocal) return connectLocal;
  if (isSupabaseConfigured()) return connectSupabase;
  return null;
}

export const isOnlineAvailable = () => getConnect() !== null;
