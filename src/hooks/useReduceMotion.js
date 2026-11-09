import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Resolves the Reduce Motion setting: 'on'/'off' override the system preference.
 * @param {import('../services/storageService').ReduceMotionSetting} setting
 */
export function useReduceMotion(setting) {
  const [systemReduce, setSystemReduce] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setSystemReduce(Boolean(value));
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) =>
      setSystemReduce(Boolean(value)),
    );
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return systemReduce;
}
