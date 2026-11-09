import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { MILESTONE_BANNER_MS } from '../core/constants';
import { colors, fonts } from '../core/theme';

/** "— streak 10 —" note that fades in and out when `triggerKey` changes. */
export function MilestoneBanner({ streak, triggerKey }) {
  const [visible] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!triggerKey) return;
    const third = MILESTONE_BANNER_MS / 3;
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
        — streak {streak} —
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: '34%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.paper,
  },
  text: { fontFamily: fonts.bold, color: colors.ink, fontSize: 22 },
});
