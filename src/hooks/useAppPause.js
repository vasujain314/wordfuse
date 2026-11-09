import { useEffect } from 'react';
import { AppState } from 'react-native';

/** Calls onPause when the app leaves the foreground. */
export function useAppPause(onPause) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') onPause();
    });
    return () => subscription.remove();
  }, [onPause]);
}
