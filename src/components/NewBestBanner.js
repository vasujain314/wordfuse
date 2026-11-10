import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { NEW_BEST_BANNER_MS } from '../core/constants';
import { colors, fonts } from '../core/theme';

/** "new best" stamp that fades in and out when `triggerKey` changes. */
export function NewBestBanner({ triggerKey }) {
  const [visible] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!triggerKey) return;
    const third = NEW_BEST_BANNER_MS / 3;
    Animated.sequence([
      Animated.timing(visible, { toValue: 1, duration: third, useNativeDriver: true }),
      Animated.delay(third),
      Animated.timing(visible, { toValue: 0, duration: third, useNativeDriver: true }),
    ]).start();
  }, [triggerKey, visible]);

  const style = { opacity: visible };

  return (
    <Animated.View pointerEvents="none" style={[styles.banner, style]}>
      <Text style={styles.text} accessibilityLiveRegion="polite">
        new best
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: '34%',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.danger,
    transform: [{ rotate: '-4deg' }],
  },
  text: { fontFamily: fonts.bold, color: colors.danger, fontSize: 20, letterSpacing: 2 },
});
