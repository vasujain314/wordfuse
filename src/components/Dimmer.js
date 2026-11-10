import { forwardRef, useImperativeHandle, useState } from 'react';
import { Animated } from 'react-native';

import { fill } from '../core/theme';

/** Full-screen fade used at game over. Call ref.dim(toOpacity, durationMs). */
export const Dimmer = forwardRef(function Dimmer({ color }, ref) {
  const [opacity] = useState(() => new Animated.Value(0));
  useImperativeHandle(
    ref,
    () => ({
      dim(to, duration) {
        Animated.timing(opacity, { toValue: to, duration, useNativeDriver: true }).start();
      },
    }),
    [opacity],
  );
  return <Animated.View pointerEvents="none" style={[fill, { backgroundColor: color, opacity }]} />;
});
