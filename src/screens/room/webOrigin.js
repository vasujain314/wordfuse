import { Platform } from 'react-native';

const DEFAULT_ORIGIN = 'https://wordfuse.expo.app';

/** Base URL for share links: the configured web deployment, or this page's origin on web. */
export function webOrigin() {
  const configured = process.env.EXPO_PUBLIC_WEB_ORIGIN;
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return DEFAULT_ORIGIN;
}
