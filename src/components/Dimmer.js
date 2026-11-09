import { forwardRef, useImperativeHandle, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

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
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity }]}
    />
  );
});
