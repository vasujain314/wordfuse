import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MILESTONE_BANNER_MS } from '../core/constants';
import { colors } from '../core/theme';

/** "STREAK 10!" banner that pops in and out when `triggerKey` changes. */
export function MilestoneBanner({ streak, triggerKey, reduceMotion }) {
  const visible = useSharedValue(0);

  useEffect(() => {
    if (!triggerKey) return;
    const third = MILESTONE_BANNER_MS / 3;
    visible.value = withSequence(
      withTiming(1, { duration: third }),
      withTiming(1, { duration: third }),
      withTiming(0, { duration: third }),
    );
  }, [triggerKey, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: reduceMotion ? [] : [{ scale: 0.6 + visible.value * 0.4 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.banner, style]}>
      <Text style={styles.text} accessibilityLiveRegion="polite">
        STREAK {streak}!
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.magenta,
    backgroundColor: 'rgba(255, 62, 200, 0.15)',
  },
  text: { color: colors.magenta, fontSize: 32, fontWeight: '900', letterSpacing: 3 },
});
