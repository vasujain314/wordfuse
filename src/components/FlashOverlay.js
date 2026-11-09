import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Full-screen colour flash. With Reduce Motion it becomes a soft fade.
 * Call ref.flash(durationMs).
 */
export const FlashOverlay = forwardRef(function FlashOverlay(
  { color, peak = 0.35, reduceMotion },
  ref,
) {
  const opacity = useSharedValue(0);
  useImperativeHandle(
    ref,
    () => ({
      flash(duration) {
        const top = reduceMotion ? peak * 0.4 : peak;
        const rise = reduceMotion ? duration * 0.4 : Math.min(80, duration * 0.2);
        opacity.value = withSequence(
          withTiming(top, { duration: rise }),
          withTiming(0, { duration: duration - rise }),
        );
      },
      dim(to, duration) {
        opacity.value = withTiming(to, { duration });
      },
    }),
    [opacity, peak, reduceMotion],
  );
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}
    />
  );
});
